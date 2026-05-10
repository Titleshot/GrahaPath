import { useCallback, useState } from 'react';

const LOGO_CANDIDATES = ['/Logo.png', '/Logo.svg', '/Logo.webp', '/Logo.jpg', '/Logo.jpeg', '/Logo'];

/**
 * Logo files live in repo root `folder/` (see `vite.config.js` publicDir).
 * They are served from the site root, e.g. `/Logo.png`.
 */
export default function BrandLogo({ className = '' }) {
  const [index, setIndex] = useState(0);

  const onError = useCallback(() => {
    setIndex((i) => i + 1);
  }, []);

  if (index >= LOGO_CANDIDATES.length) {
    return null;
  }

  return (
    <img
      key={LOGO_CANDIDATES[index]}
      src={LOGO_CANDIDATES[index]}
      alt="GrahaPath"
      width={220}
      height={220}
      decoding="async"
      className={`h-20 w-auto max-w-[220px] shrink-0 object-contain object-left sm:h-24 ${className}`}
      onError={onError}
    />
  );
}
