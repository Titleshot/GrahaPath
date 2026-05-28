/** Bump when legal copy changes; must match backend services/legalVersions.js */
export const LEGAL_LAST_UPDATED = 'May 28, 2026';

export const LEGAL_VERSIONS = {
  terms: '2026-05-28',
  privacy: '2026-05-28',
  disclaimer: '2026-05-28'
};

export function buildLegalAcceptancePayload() {
  return {
    legalAccepted: true,
    termsVersion: LEGAL_VERSIONS.terms,
    privacyVersion: LEGAL_VERSIONS.privacy,
    disclaimerVersion: LEGAL_VERSIONS.disclaimer
  };
}
