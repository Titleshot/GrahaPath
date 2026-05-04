const express = require('express');
const { debugChart, generateChart, validateLifePhases } = require('../controllers/chartController');

const router = express.Router();

router.post('/generate-chart', generateChart);
router.post('/debug-chart', debugChart);
router.post('/validate-life-phases', validateLifePhases);

module.exports = router;
