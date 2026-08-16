const express = require('express');
const { debugChart, generateChart, generateChartReport, placeSuggestions, validateLifePhases, dailyWeather, panchanga } = require('../controllers/chartController');
const { requireInviteAccess } = require('../middlewares/requireInviteAccess');
const { requireUserAuth } = require('../middlewares/requireUserAuth');

const router = express.Router();
const protectedChart = [requireUserAuth, requireInviteAccess];

router.post('/generate-chart', generateChart);
router.post('/generate-chart-report', generateChartReport);
router.post('/debug-chart', ...protectedChart, debugChart);
router.post('/validate-life-phases', ...protectedChart, validateLifePhases);
router.post('/daily-weather', ...protectedChart, dailyWeather);
router.get('/panchanga', ...protectedChart, panchanga);
router.get('/place-suggestions', placeSuggestions);

module.exports = router;
