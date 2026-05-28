const TERMS_VERSION = '2026-05-28';
const PRIVACY_VERSION = '2026-05-28';
const DISCLAIMER_VERSION = '2026-05-28';

function validateLegalAcceptance(body = {}) {
  if (body.legalAccepted !== true && body.legalAccepted !== 'true') return false;
  const terms = String(body.termsVersion || '').trim();
  const privacy = String(body.privacyVersion || '').trim();
  const disclaimer = String(body.disclaimerVersion || '').trim();
  if (terms && terms !== TERMS_VERSION) return false;
  if (privacy && privacy !== PRIVACY_VERSION) return false;
  if (disclaimer && disclaimer !== DISCLAIMER_VERSION) return false;
  return true;
}

module.exports = {
  TERMS_VERSION,
  PRIVACY_VERSION,
  DISCLAIMER_VERSION,
  validateLegalAcceptance
};
