function planetByName(chart, planetName) {
  return chart?.planets?.find((planet) => planet.name === planetName);
}

function interpretationFor(chart, planetName) {
  return (
    planetByName(chart, planetName)?.interpretation ||
    chart?.interpretations?.find((interpretation) => interpretation.planet === planetName)
  );
}

function joinHuman(values) {
  const cleanValues = [...new Set(values.filter(Boolean))];

  if (cleanValues.length <= 1) {
    return cleanValues[0] || '';
  }

  return `${cleanValues.slice(0, -1).join(', ')} and ${cleanValues.at(-1)}`;
}

function planetSignal(chart, planetName) {
  const planet = planetByName(chart, planetName);

  return {
    planet,
    interpretation: planet?.interpretation || interpretationFor(chart, planetName)
  };
}

export function buildKeyInsight(chart) {
  const { interpretation: sun } = planetSignal(chart, 'Sun');
  const { interpretation: moon } = planetSignal(chart, 'Moon');
  const { interpretation: saturn } = planetSignal(chart, 'Saturn');
  const strengths = joinHuman([sun?.strength, moon?.strength]);
  const pressure = joinHuman([moon?.challenge, saturn?.challenge]);

  return `You may appear guided by ${strengths || 'quiet intelligence and inner resolve'}, yet internally you can take time to process pressure around ${pressure || 'emotion and responsibility'}. This often creates a pattern of seeming composed while privately working through more than people realize.`;
}
