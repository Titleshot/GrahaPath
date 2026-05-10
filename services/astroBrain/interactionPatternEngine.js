function indexByPlanet(grahaProfiles) {
  const out = {};
  (grahaProfiles || []).forEach((g) => {
    out[g.planet] = g;
  });
  return out;
}

function sameHouse(a, b) {
  return a != null && b != null && a === b;
}

function kendraRelationship(a, b) {
  if (a == null || b == null) return false;
  const diff = ((b - a + 12) % 12) + 1;
  return [1, 4, 7, 10].includes(diff);
}

function buildPattern(type, planetsInvolved, evidence, meaning, confidence = 'possible') {
  return {
    type,
    planetsInvolved,
    evidence,
    meaning,
    confidence
  };
}

/**
 * Detect focused interaction patterns for perceived + structural accuracy.
 * Output is strictly structured data (no final report prose).
 */
function findAspect(aspects, planetA, planetB) {
  return (aspects || []).find(
    (a) =>
      (a.planetA === planetA && a.planetB === planetB) ||
      (a.planetA === planetB && a.planetB === planetA)
  );
}

function findDrishti(drishtiLinks, from, to) {
  return (drishtiLinks || []).find((d) => d.from === from && d.to === to) || null;
}

function detectInteractionPatterns(
  grahaProfiles,
  strength,
  houseLordData,
  aspects = [],
  drishtiLinks = []
) {
  const idx = indexByPlanet(grahaProfiles);
  const patterns = [];

  const moon = idx.Moon;
  const saturn = idx.Saturn;
  const rahu = idx.Rahu;
  const ketu = idx.Ketu;

  if (moon && saturn) {
    const tight = sameHouse(moon.house, saturn.house);
    const kendra = kendraRelationship(moon.house, saturn.house);
    const asp = findAspect(aspects, 'Moon', 'Saturn');
    const drishti = findDrishti(drishtiLinks, 'Saturn', 'Moon') || findDrishti(drishtiLinks, 'Moon', 'Saturn');
    if (tight || kendra || asp || drishti) {
      patterns.push(
        buildPattern(
          'Moon-Saturn emotional pressure pattern',
          ['Moon', 'Saturn'],
          [
            `Moon house ${moon.house}, Saturn house ${saturn.house}`,
            tight
              ? 'Same-house contact detected'
              : kendra
                ? 'Mutual kendra-by-house contact detected'
                : 'No house-kendra tie',
            ...(asp ? [`Aspect: ${asp.aspectType} (orb ${asp.orb})`] : []),
            ...(drishti ? [`Drishti: ${drishti.rule}`] : [])
          ],
          'May indicate emotional heaviness, self-demand, or pressure-to-mature themes; can stabilize through routine and paced responsibility.',
          tight || (asp && asp.strength === 'strong') || drishti ? 'strong' : 'moderate'
        )
      );
    }
  }

  if (moon && rahu) {
    const tight = sameHouse(moon.house, rahu.house);
    const kendra = kendraRelationship(moon.house, rahu.house);
    const asp = findAspect(aspects, 'Moon', 'Rahu');
    const drishti = findDrishti(drishtiLinks, 'Rahu', 'Moon') || findDrishti(drishtiLinks, 'Moon', 'Rahu');
    if (tight || kendra || asp || drishti) {
      patterns.push(
        buildPattern(
          'Moon-Rahu restlessness pattern',
          ['Moon', 'Rahu'],
          [
            `Moon house ${moon.house}, Rahu house ${rahu.house}`,
            tight
              ? 'Same-house contact detected'
              : kendra
                ? 'Mutual kendra-by-house contact detected'
                : 'No house-kendra tie',
            ...(asp ? [`Aspect: ${asp.aspectType} (orb ${asp.orb})`] : []),
            ...(drishti ? [`Drishti: ${drishti.rule}`] : [])
          ],
          'May indicate emotional amplification, mental restlessness, or craving-for-certainty cycles; grounding routines may reduce volatility.',
          tight || (asp && asp.strength === 'strong') || drishti ? 'strong' : 'moderate'
        )
      );
    }
  }

  if (saturn && saturn.house === 10) {
    const tenthLord = houseLordData?.houses?.find((h) => h.house === 10)?.lord;
    const saturnToTenthLord = tenthLord ? findDrishti(drishtiLinks, 'Saturn', tenthLord) : null;
    patterns.push(
      buildPattern(
        'Saturn-10th career pressure pattern',
        ['Saturn'],
        [
          'Saturn placed in 10th house (whole-sign).',
          ...(saturnToTenthLord ? [`Drishti: ${saturnToTenthLord.rule}`] : [])
        ],
        'May indicate long-arc career building through responsibility, delay management, and public accountability.',
        saturnToTenthLord ? 'strong' : 'moderate'
      )
    );
  } else if (houseLordData?.houses?.find((h) => h.house === 10)?.lord === 'Saturn') {
    const lp = houseLordData.houses.find((h) => h.house === 10).lordPlacement;
    patterns.push(
      buildPattern(
        'Saturn-linked career structuring pattern',
        ['Saturn'],
        [`10th lord is Saturn; Saturn placed in house ${lp?.house ?? 'unknown'}.`],
        'May indicate career movement through structure, discipline, and slow credibility-building.',
        'moderate'
      )
    );
  }

  if (rahu && ketu) {
    const drishtiRK = findDrishti(drishtiLinks, 'Rahu', 'Ketu') || findDrishti(drishtiLinks, 'Ketu', 'Rahu');
    patterns.push(
      buildPattern(
        'Rahu-Ketu axis pattern',
        ['Rahu', 'Ketu'],
        [
          `Rahu house ${rahu.house}`,
          `Ketu house ${ketu.house}`,
          ...(drishtiRK ? [`Drishti: ${drishtiRK.rule}`] : [])
        ],
        `May indicate life tension between growth-hunger (Rahu ${rahu.house}) and release-patterns (Ketu ${ketu.house}); integration is key.`,
        drishtiRK ? 'strong' : 'moderate'
      )
    );
  }

  const dominant = (strength?.dominantPlanets || []).slice(0, 3);
  const challenged = (strength?.challengedPlanets || []).slice(0, 2);
  if (dominant.length >= 2) {
    patterns.push(
      buildPattern(
        'Dominant graha combination pattern',
        dominant.map((d) => d.planet),
        dominant.map((d) => `${d.planet} dominant score ${d.totalScore}`),
        'Top structural influences may shape life narrative more than minor placements; prioritize these signals first in interpretation.',
        'moderate'
      )
    );
  }
  if (challenged.length >= 1) {
    patterns.push(
      buildPattern(
        'Challenging graha friction pattern',
        challenged.map((c) => c.planet),
        challenged.map((c) => `${c.planet} challenged score ${c.totalScore}`),
        'Lower-scoring influences may indicate recurring friction loops and growth edges, not fixed failure.',
        'possible'
      )
    );
  }

  return { interactionPatterns: patterns };
}

module.exports = {
  detectInteractionPatterns
};

