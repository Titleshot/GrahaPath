const fs = require('fs');
const { RESONANCE_FILE } = require('../services/feedbackService');

const DAYS = Number(process.env.FEEDBACK_WINDOW_DAYS || 7);
const MIN_SECTION_SAMPLE = Number(process.env.MIN_SECTION_SAMPLE || 5);
const LOW_HELPFUL_RATE = Number(process.env.LOW_HELPFUL_RATE || 0.65);
const LOW_AVG_SCORE = Number(process.env.LOW_AVG_SCORE || 3.4);
const HIGH_HELPFUL_RATE = Number(process.env.HIGH_HELPFUL_RATE || 0.82);
const HIGH_AVG_SCORE = Number(process.env.HIGH_AVG_SCORE || 4.2);

function safeParse(line) {
  try {
    return JSON.parse(line);
  } catch (_err) {
    return null;
  }
}

function readFeedbackRows() {
  if (!fs.existsSync(RESONANCE_FILE)) {
    return [];
  }
  const content = fs.readFileSync(RESONANCE_FILE, 'utf8');
  return content
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map(safeParse)
    .filter(Boolean);
}

function inWindow(createdAt, sinceTs) {
  const ts = Date.parse(createdAt || '');
  return Number.isFinite(ts) && ts >= sinceTs;
}

function sectionStats(rows) {
  const bySection = {};
  rows.forEach((row) => {
    const section = row.section || 'other';
    if (!bySection[section]) {
      bySection[section] = { count: 0, helpfulCount: 0, scoreSum: 0 };
    }
    bySection[section].count += 1;
    bySection[section].helpfulCount += row.helpful ? 1 : 0;
    bySection[section].scoreSum += Number(row.score) || 0;
  });

  return Object.entries(bySection).map(([section, raw]) => ({
    section,
    count: raw.count,
    helpfulRate: raw.count ? raw.helpfulCount / raw.count : 0,
    avgScore: raw.count ? raw.scoreSum / raw.count : 0
  }));
}

function recommendationForSection(stat) {
  if (stat.count < MIN_SECTION_SAMPLE) {
    return {
      section: stat.section,
      priority: 'observe',
      reason: `Only ${stat.count} responses; collect more data before changing logic.`,
      action: 'Increase sample size for this section before making copy/logic updates.'
    };
  }

  if (stat.helpfulRate < LOW_HELPFUL_RATE || stat.avgScore < LOW_AVG_SCORE) {
    return {
      section: stat.section,
      priority: 'high',
      reason: `Helpful rate ${stat.helpfulRate.toFixed(3)} and avg score ${stat.avgScore.toFixed(2)} are below targets.`,
      action:
        'Reduce generic phrasing, increase chart-specific evidence density, and lower confidence language unless strong structural signals agree.'
    };
  }

  if (stat.helpfulRate >= HIGH_HELPFUL_RATE && stat.avgScore >= HIGH_AVG_SCORE) {
    return {
      section: stat.section,
      priority: 'scale',
      reason: `Helpful rate ${stat.helpfulRate.toFixed(3)} and avg score ${stat.avgScore.toFixed(2)} are strong.`,
      action:
        'Use this section as a template for tone and evidence structure; replicate its causal phrasing patterns into weaker sections.'
    };
  }

  return {
    section: stat.section,
    priority: 'medium',
    reason: `Section is stable (helpful rate ${stat.helpfulRate.toFixed(3)}, avg score ${stat.avgScore.toFixed(2)}).`,
    action: 'Iterate with small prompt/logic changes and continue monitoring.'
  };
}

function main() {
  const rows = readFeedbackRows();
  const since = Date.now() - DAYS * 24 * 60 * 60 * 1000;
  const filtered = rows.filter((r) => inWindow(r.createdAt, since));
  const stats = sectionStats(filtered).sort((a, b) => b.count - a.count);
  const recommendations = stats.map(recommendationForSection);

  const report = {
    windowDays: DAYS,
    totalResponses: filtered.length,
    thresholds: {
      minSectionSample: MIN_SECTION_SAMPLE,
      lowHelpfulRate: LOW_HELPFUL_RATE,
      lowAvgScore: LOW_AVG_SCORE,
      highHelpfulRate: HIGH_HELPFUL_RATE,
      highAvgScore: HIGH_AVG_SCORE
    },
    recommendations
  };

  console.log(JSON.stringify(report, null, 2));
}

main();

