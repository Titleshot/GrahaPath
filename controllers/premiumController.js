const {
  upsertPremiumAccess,
  findPremiumByEmail,
  findLatestChartByEmail,
  recordPaymentForEmail,
  saveChartForEmail
} = require('../services/premiumAccessService');
const {
  createGumroadCheckoutUrl,
  verifyGumroadSignature,
  resolvePlanFromWebhook
} = require('../services/gumroadService');

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
      gumroadOrderId: body.gumroadOrderId,
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
    const checkoutUrl = createGumroadCheckoutUrl({ email, plan });
    return res.json({ ok: true, checkoutUrl });
  } catch (error) {
    if (error.code === 'GUMROAD_NOT_CONFIGURED') {
      return res.status(503).json({ error: 'GumroadNotConfigured', message: error.message });
    }
    return res.status(500).json({
      error: 'GumroadCheckoutFailed',
      message: error.message || 'Could not start checkout.'
    });
  }
}

async function gumroadWebhook(req, res) {
  try {
    const signature = req.headers['x-gumroad-signature'];
    const rawBody = req.rawBody;
    if (!verifyGumroadSignature(rawBody, signature)) {
      return res.status(401).json({ error: 'InvalidSignature', message: 'Invalid webhook signature.' });
    }

    const email = String(req.body?.email || req.body?.purchase_email || '')
      .trim()
      .toLowerCase();
    if (!email) {
      return res.status(400).json({ error: 'WebhookMissingEmail', message: 'Email missing in Gumroad payload.' });
    }

    const plan = resolvePlanFromWebhook(req.body);
    const amountUsd = Number(req.body?.price || req.body?.sale_price || req.body?.amount || 0);

    const premium = await upsertPremiumAccess({
      email,
      chartId: req.body?.order_number || req.body?.sale_id || null,
      chartFingerprint: null,
      plan,
      remainingInsights: insightsForPlan(plan)
    });

    await recordPaymentForEmail({
      email,
      gumroadOrderId: String(req.body?.sale_id || req.body?.order_number || '').trim() || null,
      amount: Number.isFinite(amountUsd) ? amountUsd : null,
      plan,
      status: 'paid'
    });

    return res.json({ ok: true, premium });
  } catch (error) {
    return res.status(500).json({
      error: 'GumroadWebhookFailed',
      message: error.message || 'Could not process webhook.'
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

  // Optional fingerprint guard:
  // - if client provides a fingerprint and stored record has one, enforce match
  // - if client does not provide one, allow restore by email
  const storedFingerprint = record.chart_fingerprint || record.chartFingerprint || null;
  if (chartFingerprint && storedFingerprint && storedFingerprint !== chartFingerprint) {
    return res.status(403).json({
      error: 'ChartMismatch',
      message: 'This premium access is linked to a different chart profile.'
    });
  }

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
  gumroadWebhook,
  restorePremium
};
