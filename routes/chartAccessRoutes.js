const express = require('express');
const { requireUserAuth } = require('../middlewares/requireUserAuth');
const {
  adminGenerateChartProfile,
  redeemViewToken,
  getSessionChart,
  chartBoundChatQuery
} = require('../controllers/chartAccessController');

const router = express.Router();

router.post('/admin/charts/generate', requireUserAuth, adminGenerateChartProfile);
router.get('/view/:token', redeemViewToken);
router.get('/chart/session', getSessionChart);
router.post('/v1/chat-query', chartBoundChatQuery);

module.exports = router;
