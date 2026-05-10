const nodemailer = require('nodemailer');

const DEFAULT_TO = 'radheradhe742@proton.me';

function smtpConfigured() {
  return Boolean(
    String(process.env.FEEDBACK_SMTP_HOST || '').trim() &&
      String(process.env.FEEDBACK_SMTP_USER || '').trim() &&
      String(process.env.FEEDBACK_SMTP_PASS || '').trim()
  );
}

function getRecipient() {
  const to = String(process.env.FEEDBACK_NOTIFY_EMAIL || DEFAULT_TO).trim();
  return to || DEFAULT_TO;
}

function getTransporter() {
  const host = String(process.env.FEEDBACK_SMTP_HOST || '').trim();
  const port = Number(process.env.FEEDBACK_SMTP_PORT || 587);
  const user = String(process.env.FEEDBACK_SMTP_USER || '').trim();
  const pass = String(process.env.FEEDBACK_SMTP_PASS || '').trim();
  const secure = String(process.env.FEEDBACK_SMTP_SECURE || 'false').toLowerCase() === 'true';

  return nodemailer.createTransport({
    host,
    port,
    secure,
    auth: { user, pass }
  });
}

async function sendFeedbackEmail(payload = {}) {
  if (!smtpConfigured()) {
    return { sent: false, skipped: true, reason: 'smtp_not_configured' };
  }

  const to = getRecipient();
  const from =
    String(process.env.FEEDBACK_FROM_EMAIL || process.env.FEEDBACK_SMTP_USER || '').trim() || undefined;
  const subjectPrefix = String(process.env.FEEDBACK_SUBJECT_PREFIX || '[GrahaPath Feedback]').trim();
  const subject = `${subjectPrefix} Score ${payload.score || '-'} · ${payload.section || 'other'}`;

  const chartContext = payload.chartContext || {};
  const text = [
    'New GrahaPath feedback received',
    '',
    `Score: ${payload.score}`,
    `Helpful: ${payload.helpful}`,
    `Section: ${payload.section || 'other'}`,
    `Session ID: ${payload.sessionId || '-'}`,
    '',
    `Note: ${payload.note || '-'}`,
    '',
    'Chart Context',
    `Ascendant: ${chartContext.ascendant || '-'}`,
    `Moon Sign: ${chartContext.moonSign || '-'}`,
    `Sun Sign: ${chartContext.sunSign || '-'}`,
    `Current Dasha: ${chartContext.currentDasha || '-'}`,
    `Analysis Mode: ${chartContext.analysisMode || '-'}`,
    `Confidence: ${chartContext.confidenceLevel || '-'}`
  ].join('\n');

  const transporter = getTransporter();
  await transporter.sendMail({
    from,
    to,
    subject,
    text
  });

  return { sent: true, to };
}

module.exports = {
  sendFeedbackEmail
};
