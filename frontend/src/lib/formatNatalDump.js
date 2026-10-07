import { toReportChart } from './reportChartPayload';

function fmt(n, d = 2) {
  const x = Number(n);
  return Number.isFinite(x) ? x.toFixed(d) : '—';
}

export function formatNatalDump(chart) {
  const natal = toReportChart(chart) || {};
  const planets = natal.planets || [];
  const brain = natal.astroBrain || {};
  const lines = [];
  lines.push('GRAHAPATH — natal extract (copy this block)');
  lines.push(`Name: ${natal.name || '—'}`);
  lines.push(`Birth: ${natal.localDateTime || natal.birthDateAD || '—'}`);
  lines.push(`Place: ${natal.place || natal.location?.displayName || '—'}`);
  lines.push(`Lagna: ${natal.ascendant || '—'}`);
  lines.push(`Moon sign: ${natal.moonSign || '—'}`);
  lines.push(`Sun sign: ${natal.sunSign || '—'}`);
  lines.push('');
  lines.push('PLANETS (sign, house, degree-in-sign, absolute longitude, nakshatra, pada, dignity, D9, D10)');
  planets.forEach((p) => {
    const pada = p.nakshatraPada != null ? `pada ${p.nakshatraPada}` : 'pada —';
    const rx = p.retrograde ? ' Rx' : '';
    lines.push(
      `- ${p.name}${rx}: ${p.sign || '—'} / H${p.house ?? '—'} / ${fmt(p.degree)}° / abs ${fmt(p.absoluteDegree)}° / ${p.nakshatra || '—'} ${pada} / ${p.dignity || '—'} / D9 ${p.d9Sign || '—'} / D10 ${p.d10Sign || '—'}${p.vargottama ? ' / vargottama' : ''}`
    );
  });
  lines.push('');
  lines.push('ASPECTS');
  const aspects = brain.aspects || [];
  if (!aspects.length) lines.push('- (not in this payload)');
  else {
    aspects.forEach((a) => {
      lines.push(`- ${a.planetA} ${a.aspectType} ${a.planetB} (orb ${fmt(a.orb)}°, ${a.strength || '—'})`);
    });
  }
  lines.push('');
  lines.push('YOGAS');
  const yogas = brain.yogas || [];
  if (!yogas.length) lines.push('- (not in this payload)');
  else {
    yogas.forEach((y) => {
      lines.push(`- ${y.name}${y.strength ? ` [${y.strength}]` : ''}${y.interpretation ? `: ${y.interpretation}` : ''}`);
    });
  }
  lines.push('');
  const dasha = brain.currentDasha?.planet || natal.dashaSnapshot?.mahaDasha;
  const antar = brain.currentAntardasha?.antarLord || natal.dashaSnapshot?.antarDasha;
  lines.push(`CURRENT DASHA: ${dasha || '—'} / antar ${antar || '—'}`);
  const timeline = brain.natalTimeline || brain.vimshottariTimeline || [];
  lines.push('VIMSHOTTARI MAHADASHA');
  if (!timeline.length) lines.push('- (not in this payload)');
  else {
    timeline.forEach((seg) => {
      const lord = seg.planet || seg.mahaLord;
      lines.push(`- ${lord}: ${seg.startDateApprox || '—'} → ${seg.endDateApprox || '—'}`);
      (seg.antardasha || []).slice(0, 9).forEach((a) => {
        lines.push(`    antar ${a.antarLord}: ${a.startDateApprox || '—'} → ${a.endDateApprox || '—'}`);
      });
    });
  }
  lines.push('');
  lines.push('Lahiri sidereal · Swiss Ephemeris · whole-sign houses');
  return lines.join('\n');
}
