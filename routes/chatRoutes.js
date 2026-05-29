const express = require('express');
const { grahaPathChat, lifePhaseValidationHandler, paymentProofStub } = require('../controllers/chatController');
const { grahaPathChatV2 } = require('../controllers/chatV2Controller');
const { requireInviteAccess } = require('../middlewares/requireInviteAccess');
const { requireChatAccess } = require('../middlewares/requireChatAccess');

const router = express.Router();
const protectedChat = [requireChatAccess, requireInviteAccess];

router.post('/chat-v2', ...protectedChat, grahaPathChatV2);
// Some proxies forward the /api prefix to Node unchanged — register both paths.
router.post('/api/chat-v2', ...protectedChat, grahaPathChatV2);
router.post('/chat', ...protectedChat, grahaPathChat);
router.post('/life-phase-validation', ...protectedChat, lifePhaseValidationHandler);
router.post('/payment-proof', ...protectedChat, paymentProofStub);

module.exports = router;
