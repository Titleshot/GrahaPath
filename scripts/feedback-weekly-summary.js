const fs = require('fs');
const { RESONANCE_FILE } = require('../services/feedbackService');

const DAYS = Number(process.env.FEEDBACK_WINDOW_DAYS || 7);

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

function summarize(rows) {
  const bySection = {};
  rows.forEach((row) => {
    const key = row.section || 'other';
    if (!bySection[key]) {
      bySection[key] = { count: 0, helpfulCount: 0, scoreSum: 0 };
    }
    bySection[key].count += 1;
    bySection[key].helpfulCount += row.helpful ? 1 : 0;
    bySection[key].scoreSum += Number(row.score) || 0;
  });

  const sections = Object.entries(bySection)
    .map(([section, stats]) => ({
      section,
      count: stats.count,
      helpfulRate: Number((stats.helpfulCount / stats.count).toFixed(3)),
      avgScore: Number((stats.scoreSum / stats.count).toFixed(2))
    }))
    .sort((a, b) => b.count - a.count);

  const totals = rows.reduce(
    (acc, row) => {
      acc.count += 1;
      acc.helpfulCount += row.helpful ? 1 : 0;
      acc.scoreSum += Number(row.score) || 0;
      return acc;
    },
    { count: 0, helpfulCount: 0, scoreSum: 0 }
  );

  return {
    windowDays: DAYS,
    totalResponses: totals.count,
    overallHelpfulRate: totals.count ? Number((totals.helpfulCount / totals.count).toFixed(3)) : 0,
    overallAvgScore: totals.count ? Number((totals.scoreSum / totals.count).toFixed(2)) : 0,
    sections
  };
}

function main() {
  const rows = readFeedbackRows();
  const since = Date.now() - DAYS * 24 * 60 * 60 * 1000;
  const filtered = rows.filter((r) => inWindow(r.createdAt, since));
  const report = summarize(filtered);
  console.log(JSON.stringify(report, null, 2));
}

main();

