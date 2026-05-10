const { validateResonancePayload, appendResonanceFeedback } = require('../services/feedbackService');
const { sendFeedbackEmail } = require('../services/feedbackMailerService');
const { forwardFeedbackToFormspree } = require('../services/feedbackForwardService');

async function submitResonanceFeedback(req, res) {
  const errors = validateResonancePayload(req.body);
  if (errors.length > 0) {
    return res.status(400).json({
      error: 'Invalid resonance feedback payload.',
      details: errors
    });
  }

  const saved = appendResonanceFeedback(req.body);
  try {
    await sendFeedbackEmail(req.body);
  } catch (error) {
    // Non-blocking: feedback is already persisted locally.
    console.warn('[GrahaPath] Feedback email send failed:', String(error?.message || error));
  }
  try {
    await forwardFeedbackToFormspree(req.body);
  } catch (error) {
    // Non-blocking: feedback is already persisted locally.
    console.warn('[GrahaPath] Formspree forward failed:', String(error?.message || error));
  }
  return res.status(201).json({
    ok: true,
    ...saved
  });
}

module.exports = {
  submitResonanceFeedback
};

