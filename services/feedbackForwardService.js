function getFormspreeEndpoint() {
  return String(process.env.FEEDBACK_FORMSPREE_ENDPOINT || '').trim();
}

async function forwardFeedbackToFormspree(payload = {}) {
  const endpoint = getFormspreeEndpoint();
  if (!endpoint) {
    return { sent: false, skipped: true, reason: 'formspree_not_configured' };
  }

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json'
    },
    body: JSON.stringify({
      source: 'GrahaPath Resonance Feedback',
      section: payload.section || 'other',
      score: payload.score,
      helpful: payload.helpful,
      note: payload.note || '',
      sessionId: payload.sessionId || '',
      chartContext: payload.chartContext || {},
      submittedAt: new Date().toISOString()
    })
  });

  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new Error(`Formspree forward failed (${response.status}): ${text || 'unknown_error'}`);
  }

  return { sent: true };
}

module.exports = {
  forwardFeedbackToFormspree
};
