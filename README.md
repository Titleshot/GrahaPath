# GrahaPath

Backend core for premium Vedic astrology chart generation using Swiss Ephemeris.

## API

### `POST /generate-chart`

Request:

```json
{
  "name": "string",
  "date": "YYYY-MM-DD",
  "time": "HH:MM",
  "place": "City, Country"
}
```

Response includes:

- Lahiri sidereal ascendant, Sun sign, and Moon sign
- Sun, Moon, Mars, Mercury, Jupiter, Venus, Saturn, Rahu, and Ketu
- Planet degree within sign, absolute 0-360 degree, rashi, whole-sign house, and nakshatra
- Whole-sign house cusps for kundali rendering
- Geocoded coordinates, timezone, local time, UTC time, Julian day, and ayanamsa degree

## Accuracy notes

- Planetary positions are calculated with the `swisseph` npm package.
- Lahiri ayanamsa is set through `SE_SIDM_LAHIRI` and sidereal flags.
- Whole-sign houses are used for planet-to-house mapping because that is the standard Jyotish/Kundali approach. Swiss Ephemeris Placidus house calculation is used only to obtain the astronomical Ascendant angle.
- For Astro.com-level precision with `SEFLG_SWIEPH`, provide Swiss Ephemeris data files in production and configure the ephemeris path if your deployment does not bundle them. Without data files, the native library may return an ephemeris error or require using a lower-precision fallback.

## Run

```bash
npm install
npm start
```

Optional syntax check:

```bash
npm run check
```
