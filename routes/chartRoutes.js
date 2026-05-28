const express = require('express');
const { debugChart, generateChart, placeSuggestions, validateLifePhases, dailyWeather, panchanga } = require('../controllers/chartController');
const { requireInviteAccess } = require('../middlewares/requireInviteAccess');
const { requireUserAuth } = require('../middlewares/requireUserAuth');

const router = express.Router();

router.use(requireUserAuth);
router.use(requireInviteAccess);

router.post('/generate-chart', generateChart);
router.post('/debug-chart', debugChart);
router.post('/validate-life-phases', validateLifePhases);
router.post('/daily-weather', dailyWeather);
router.get('/panchanga', panchanga);
router.get('/place-suggestions', placeSuggestions);

module.exports = router;
