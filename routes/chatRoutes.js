const express = require('express');
const { grahaPathChat, lifePhaseValidationHandler, paymentProofStub } = require('../controllers/chatController');
const { grahaPathChatV2 } = require('../controllers/chatV2Controller');

const router = express.Router();

router.post('/chat-v2', grahaPathChatV2);
// Some proxies forward the /api prefix to Node unchanged — register both paths.
router.post('/api/chat-v2', grahaPathChatV2);
router.post('/chat', grahaPathChat);
router.post('/life-phase-validation', lifePhaseValidationHandler);
router.post('/payment-proof', paymentProofStub);

module.exports = router;
