const express = require('express');
const {
  activatePremium,
  createCheckoutSession,
  kofiWebhook,
  createFonepayCheckout,
  checkFonepayStatus,
  getPaymentOptions,
  restorePremium
} = require('../controllers/premiumController');

const router = express.Router();

router.post('/premium/activate', activatePremium);
router.post('/premium/checkout-session', createCheckoutSession);
router.post('/premium/webhook/kofi', kofiWebhook);
router.get('/premium/payment-options', getPaymentOptions);
router.post('/premium/fonepay/create', createFonepayCheckout);
router.post('/premium/fonepay/status', checkFonepayStatus);
router.post('/premium/restore', restorePremium);

module.exports = router;
