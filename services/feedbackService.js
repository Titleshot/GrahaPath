const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const DATA_DIR = path.join(__dirname, '..', 'data');
const FEEDBACK_DIR = path.join(DATA_DIR, 'feedback');
const RESONANCE_FILE = path.join(FEEDBACK_DIR, 'resonance-feedback.jsonl');

const VALID_SECTIONS = new Set([
  'futureLifeDirection',
  'earningsCareerPotential',
  'relationshipEmotionalPattern',
  'healthEnergyTendencies',
  'personalizedRemedies',
  'personality',
  'emotional',
  'career',
  'lifeDirection',
  'timingNow',
  'lifePhases',
  'validation',
  'other'
]);

function normalizeSection(section) {
  const value = String(section || '').trim();
  return VALID_SECTIONS.has(value) ? value : 'other';
}

function hashChartContext(chartContext) {
  const serialized = JSON.stringify(chartContext || {});
  return crypto.createHash('sha256').update(serialized).digest('hex').slice(0, 20);
}

function sanitizeNote(value) {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed.slice(0, 800) : null;
}

function validateResonancePayload(body) {
  const errors = [];
  if (!body || typeof body !== 'object') {
    return ['Request body must be a JSON object.'];
  }

  if (!body.section || typeof body.section !== 'string') {
    errors.push('section is required and must be a string.');
  }

  if (!Number.isFinite(body.score) || body.score < 1 || body.score > 5) {
    errors.push('score is required and must be a number between 1 and 5.');
  }

  if (typeof body.helpful !== 'boolean') {
    errors.push('helpful is required and must be a boolean.');
  }

  if (body.note !== undefined && typeof body.note !== 'string') {
    errors.push('note must be a string when provided.');
  }

  if (body.chartContext !== undefined && (body.chartContext === null || typeof body.chartContext !== 'object')) {
    errors.push('chartContext must be an object when provided.');
  }

  if (body.sessionId !== undefined && typeof body.sessionId !== 'string') {
    errors.push('sessionId must be a string when provided.');
  }

  return errors;
}

function ensureFeedbackDirectory() {
  fs.mkdirSync(FEEDBACK_DIR, { recursive: true });
}

function appendResonanceFeedback(body) {
  ensureFeedbackDirectory();

  const createdAt = new Date().toISOString();
  const record = {
    version: 1,
    createdAt,
    section: normalizeSection(body.section),
    score: Number(body.score),
    helpful: body.helpful === true,
    note: sanitizeNote(body.note),
    sessionId: typeof body.sessionId === 'string' ? body.sessionId.trim().slice(0, 120) : null,
    chartFingerprint: hashChartContext(body.chartContext || {}),
    chartContext: {
      ascendant: body?.chartContext?.ascendant || null,
      moonSign: body?.chartContext?.moonSign || null,
      sunSign: body?.chartContext?.sunSign || null,
      currentDasha: body?.chartContext?.currentDasha || null,
      analysisMode: body?.chartContext?.analysisMode || null,
      confidenceLevel: body?.chartContext?.confidenceLevel || null
    }
  };

  fs.appendFileSync(RESONANCE_FILE, `${JSON.stringify(record)}\n`, 'utf8');

  return {
    saved: true,
    recordId: `${record.createdAt}:${record.chartFingerprint}`,
    file: RESONANCE_FILE
  };
}

module.exports = {
  RESONANCE_FILE,
  validateResonancePayload,
  appendResonanceFeedback
};

