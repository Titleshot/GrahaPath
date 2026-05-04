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
- `calculationNotes` documenting Swiss Ephemeris, sidereal Lahiri zodiac,
  whole-sign houses, and True Node Rahu/Ketu handling

### `POST /debug-chart`

Accepts the same body as `/generate-chart` and returns the normal chart plus
`debugPlanets`. Each debug row includes tropical longitude, Lahiri ayanamsa,
sidereal longitude, sign, and nakshatra so results can be compared against
Astro.com, Drik Panchang, or another trusted ephemeris.

## Accuracy notes

- Planetary positions are calculated with the `swisseph` npm package.
- Lahiri ayanamsa is set through `SE_SIDM_LAHIRI` and sidereal flags.
- Whole-sign houses are used for planet-to-house mapping because that is the standard Jyotish/Kundali approach. Swiss Ephemeris Placidus house calculation is used only to obtain the astronomical Ascendant angle.
- Rahu uses Swiss Ephemeris True Node (`SE_TRUE_NODE`); Ketu is exactly 180 degrees opposite Rahu.
- For Astro.com-level precision with `SEFLG_SWIEPH`, provide Swiss Ephemeris data files in production and configure the ephemeris path if your deployment does not bundle them. Without data files, the native library may return an ephemeris error or require using a lower-precision fallback.

## Accuracy validation checklist

Use `/debug-chart` and compare each planet against a trusted reference:

1. Confirm input date, local birth time, place, latitude/longitude, timezone,
   and UTC conversion match the reference source.
2. Confirm calculation settings: Swiss Ephemeris, sidereal zodiac, Lahiri
   ayanamsa, Whole Sign houses, and True Node Rahu.
3. Compare Lahiri ayanamsa degree for the Julian day.
4. Compare tropical longitude before ayanamsa subtraction.
5. Compare sidereal longitude, rashi, and nakshatra for each planet.
6. Confirm Ketu is exactly 180 degrees from Rahu.
7. Confirm whole-sign house mapping from the sidereal Ascendant sign.

## Run

```bash
npm install
npm start
```

Set `SWISSEPH_EPHE_PATH=/path/to/ephe` when deploying with downloaded Swiss
Ephemeris data files.

Optional syntax check:

```bash
npm run check
```
