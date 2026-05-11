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

function insightsForPlan(plan) {
  return String(plan || '').toLowerCase() === 'quick' ? 12 : 50;
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
  restorePremium
};
