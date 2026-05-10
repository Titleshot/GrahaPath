const express = require('express');
const { submitResonanceFeedback } = require('../controllers/feedbackController');

const router = express.Router();

router.post('/feedback/resonance', submitResonanceFeedback);

module.exports = router;

