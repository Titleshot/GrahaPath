const {
  upsertPremiumAccess,
  findPremiumByEmail,
  findLatestChartByEmail,
  recordPaymentForEmail,
  saveChartForEmail
} = require('../services/premiumAccessService');
const {
  kofiCheckoutUrlForPlan,
  isKofiCheckoutFullyConfigured,
  parseKofiFormBody,
  verifyKofiPayload,
  resolvePlanFromKofiPayload,
  getKofiConfig
} = require('../services/kofiService');
const {
  isFonepayConfigured,
  generateFonepayIntentQr,
  getFonepayPaymentStatus
} = require('../services/fonepayService');
const {
  createFonepayIntent,
  getFonepayIntent,
  markFonepayIntentRedeemed
} = require('../services/fonepayIntentService');
const crypto = require('crypto');

function insightsForPlan(plan) {
  return String(plan || '').toLowerCase() === 'quick' ? 12 : 50;
}

/** NPR price per plan -- set via env so a real number is a deliberate choice,
 * never a guessed default silently charging the wrong amount. */
function fonepayAmountForPlan(plan) {
  const key = String(plan || '').toLowerCase() === 'quick'
    ? 'FONEPAY_PRICE_QUICK'
    : 'FONEPAY_PRICE_FULL';
  const amount = Number.parseFloat(String(process.env[key] || '').trim());
  if (!Number.isFinite(amount) || amount <= 0) {
    const error = new Error(`${key} is not configured with a valid NPR amount`);
    error.code = 'PRICE_NOT_CONFIGURED';
    throw error;
  }
  return amount;
}

async function activatePremium(req, res) {
  try {
    const body = req.body || {};
    const record = await upsertPremiumAccess({
      email: body.email,
      chartId: body.chartId,
      chartFingerprint: body.chartFingerprint,
      plan: body.plan,
      remainingInsights: body.remainingInsights
    });
    await recordPaymentForEmail({
      email: body.email,
      orderId: body.orderId || body.gumroadOrderId,
      amount: body.amount,
      plan: body.plan,
      status: body.status || 'paid'
    });
    if (body.chart && typeof body.chart === 'object') {
      await saveChartForEmail({
        email: body.email,
        chart: body.chart
      });
    }
    return res.json({
      success: true,
      premium: record
    });
  } catch (error) {
    if (error.code === 'INVALID_EMAIL') {
      return res.status(400).json({
        error: 'InvalidEmail',
        message: error.message
      });
    }
    return res.status(500).json({
      error: 'PremiumActivationFailed',
      message: 'Could not activate premium access.'
    });
  }
}

async function createCheckoutSession(req, res) {
  try {
    const body = req.body || {};
    const email = String(body.email || '').trim().toLowerCase();
    const plan = String(body.plan || 'full').toLowerCase() === 'quick' ? 'quick' : 'full';
    if (!email) {
      return res.status(400).json({ error: 'InvalidRequest', message: 'Email is required.' });
    }

    if (!isKofiCheckoutFullyConfigured()) {
      return res.status(503).json({
        error: 'PaymentsNotConfigured',
        message: 'Ko-fi checkout URLs missing. Set KOFI_CHECKOUT_URL_QUICK and KOFI_CHECKOUT_URL_FULL.'
      });
    }

    const checkoutUrl = kofiCheckoutUrlForPlan(plan);
    if (!checkoutUrl) {
      return res.status(503).json({
        error: 'KofiNotConfigured',
        message: 'Ko-fi checkout URL missing for the selected plan.'
      });
    }

    return res.json({ ok: true, checkoutUrl, provider: 'kofi' });
  } catch (error) {
    return res.status(500).json({
      error: 'CheckoutSessionFailed',
      message: error.message || 'Could not start checkout.'
    });
  }
}

async function kofiWebhook(req, res) {
  try {
    const payload = parseKofiFormBody(req.body || {});
    const cfg = getKofiConfig();

    if (!payload) {
      return res.status(400).json({
        error: 'BadPayload',
        message: 'Expected urlencoded body with data= (Ko-fi webhook format).'
      });
    }

    if (!verifyKofiPayload(payload, cfg.verificationToken)) {
      return res.status(401).json({ error: 'InvalidVerification', message: 'Ko-fi verification_token mismatch.' });
    }

    const email = String(payload.email || '')
      .trim()
      .toLowerCase();
    if (!email) {
      return res.status(400).json({ error: 'WebhookMissingEmail', message: 'Email missing in Ko-fi payload.' });
    }

    const plan = resolvePlanFromKofiPayload(payload, cfg);
    const amountStr = payload.amount != null ? String(payload.amount).replace(/,/g, '') : '';
    const amountUsd = Number.parseFloat(amountStr);

    const premium = await upsertPremiumAccess({
      email,
      chartId: String(payload.kofi_transaction_id || payload.message_id || '').trim() || null,
      chartFingerprint: null,
      plan,
      remainingInsights: insightsForPlan(plan)
    });

    await recordPaymentForEmail({
      email,
      orderId: String(payload.kofi_transaction_id || payload.message_id || '').trim() || null,
      amount: Number.isFinite(amountUsd) ? amountUsd : null,
      plan,
      status: 'paid'
    });

    return res.status(200).json({ ok: true, premium });
  } catch (error) {
    return res.status(500).json({
      error: 'KofiWebhookFailed',
      message: error.message || 'Could not process Ko-fi webhook.'
    });
  }
}

/** GET /premium/payment-options -- lets the UI show Fonepay only when it can really work. */
function getPaymentOptions(_req, res) {
  let fonepay = { enabled: false };
  if (isFonepayConfigured()) {
    try {
      fonepay = {
        enabled: true,
        currency: 'NPR',
        prices: { quick: fonepayAmountForPlan('quick'), full: fonepayAmountForPlan('full') }
      };
    } catch {
      // price env missing/invalid: keep Fonepay hidden rather than show a wrong amount
    }
  }
  return res.json({ fonepay });
}

async function createFonepayCheckout(req, res) {
  try {
    if (!isFonepayConfigured()) {
      return res.status(503).json({ error: 'PaymentsNotConfigured', message: 'Fonepay is not configured.' });
    }

    const body = req.body || {};
    const email = String(body.email || '').trim().toLowerCase();
    const plan = String(body.plan || 'full').toLowerCase() === 'quick' ? 'quick' : 'full';
    if (!email) {
      return res.status(400).json({ error: 'InvalidRequest', message: 'Email is required.' });
    }

    let amount;
    try {
      amount = fonepayAmountForPlan(plan);
    } catch (error) {
      return res.status(503).json({ error: 'PriceNotConfigured', message: error.message });
    }

    const referenceLabel = `GRAHAPATH${Date.now()}${crypto.randomBytes(3).toString('hex')}`;
    await createFonepayIntent({ referenceLabel, email, plan, amount });

    const qr = await generateFonepayIntentQr({ amount, billId: referenceLabel, referenceLabel });

    return res.json({
      ok: true,
      provider: 'fonepay',
      qrString: qr.qrString,
      referenceLabel,
      amount,
      plan
    });
  } catch (error) {
    return res.status(502).json({
      error: 'FonepayCheckoutFailed',
      message: error.message || 'Could not start Fonepay checkout.'
    });
  }
}

/** referenceLabels currently being redeemed in this process, so two overlapping status polls
 * can't both pass the "not redeemed yet" check and record the same payment twice. */
const fonepayRedeeming = new Set();

async function checkFonepayStatus(req, res) {
  let lockedReference = '';
  try {
    const body = req.body || {};
    const email = String(body.email || '').trim().toLowerCase();
    const referenceLabel = String(body.referenceLabel || '').trim();
    if (!email || !referenceLabel) {
      return res.status(400).json({ error: 'InvalidRequest', message: 'email and referenceLabel are required.' });
    }

    // A referenceLabel only proves *a* payment succeeded -- Fonepay has no idea
    // which of our emails it belongs to. Without this check, anyone who learns
    // any valid referenceLabel could submit a different email here and get that
    // other account marked premium for free.
    const intent = await getFonepayIntent(referenceLabel);
    if (!intent || intent.email !== email) {
      return res.json({ status: 'invalid', message: 'Unknown payment reference.' });
    }
    if (intent.redeemedAt) {
      return res.json({ status: 'success', message: 'Already confirmed.' });
    }

    if (fonepayRedeeming.has(referenceLabel)) {
      return res.json({ status: 'pending', message: 'Payment is being confirmed.' });
    }

    fonepayRedeeming.add(referenceLabel);
    lockedReference = referenceLabel;
    const result = await getFonepayPaymentStatus(referenceLabel);

    if (result.paymentStatus === 'success') {
      const requestedAmount = Number.parseFloat(result.requestedAmount);
      const paidAmount = Number.parseFloat(result.totalTransactionAmount);

      // Defense in depth: never grant access for less than requested, even if
      // Fonepay reports "success" -- the amount is meant to be locked in the QR,
      // but the money path never trusts that blindly.
      const requiredAmount = Math.max(
        Number.isFinite(requestedAmount) ? requestedAmount : 0,
        Number.isFinite(intent.amount) ? intent.amount : 0
      );
      if (!Number.isFinite(paidAmount) || requiredAmount <= 0 || paidAmount < requiredAmount) {
        return res.json({ status: 'underpaid', message: 'Paid amount did not match the requested amount.' });
      }

      const premium = await upsertPremiumAccess({
        email,
        chartId: null,
        chartFingerprint: null,
        plan: intent.plan,
        remainingInsights: insightsForPlan(intent.plan)
      });
      await recordPaymentForEmail({
        email,
        orderId: referenceLabel,
        amount: paidAmount,
        plan: intent.plan,
        status: 'paid'
      });
      await markFonepayIntentRedeemed(referenceLabel);

      return res.json({ status: 'success', message: result.paymentMessage, premium });
    }

    return res.json({ status: result.paymentStatus, message: result.paymentMessage });
  } catch (error) {
    return res.status(502).json({
      error: 'FonepayStatusFailed',
      message: error.message || 'Could not check payment status.'
    });
  } finally {
    if (lockedReference) fonepayRedeeming.delete(lockedReference);
  }
}

async function restorePremium(req, res) {
  const email = req.body?.email;
  const chartFingerprint = typeof req.body?.chartFingerprint === 'string' ? req.body.chartFingerprint.trim() : '';
  
  if (!email) {
    return res.status(400).json({
      error: 'InvalidRequest',
      message: 'Email is required.'
    });
  }

  const record = await findPremiumByEmail(email);
  if (!record) {
    return res.status(404).json({
      error: 'PremiumNotFound',
      message: 'No active premium access found for this email.'
    });
  }

  // Fingerprint guard removed: premium is tied to the email, not a specific chart.
  // Users should be able to restore access on any device or with different birth details.

  const restoredChart = await findLatestChartByEmail(email);

  return res.json({
    success: true,
    premium: record,
    chart: restoredChart
  });
}

module.exports = {
  activatePremium,
  createCheckoutSession,
  kofiWebhook,
  createFonepayCheckout,
  checkFonepayStatus,
  getPaymentOptions,
  restorePremium
};
