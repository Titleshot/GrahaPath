/**
 * Optional bridge to your existing Swiss Ephemeris + interpretation pipeline.
 * Export `buildChartResultFromRequest` and return the same object you already
 * send from /generate-chart (planets, ascendant, moon/sun signs, interpretation).
 * When implemented, `chartController` uses it and skips the mock fixture.
 *
 * @example
 * const { buildFullChart } = require("./yourExistingChartService");
 * module.exports.buildChartResultFromRequest = async (req) => buildFullChart(req.body);
 */

module.exports = {};
