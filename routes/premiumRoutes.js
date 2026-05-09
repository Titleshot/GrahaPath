const express = require('express');
const { activatePremium, createCheckoutSession, gumroadWebhook, restorePremium } = require('../controllers/premiumController');

const router = express.Router();

router.post('/premium/activate', activatePremium);
router.post('/premium/checkout-session', createCheckoutSession);
router.post('/premium/webhook/gumroad', gumroadWebhook);
router.post('/premium/restore', restorePremium);

module.exports = router;
