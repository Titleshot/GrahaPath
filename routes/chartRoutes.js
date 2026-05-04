const express = require('express');
const { debugChart, generateChart } = require('../controllers/chartController');

const router = express.Router();

router.post('/generate-chart', generateChart);
router.post('/debug-chart', debugChart);

module.exports = router;
