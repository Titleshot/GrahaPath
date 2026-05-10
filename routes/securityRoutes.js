const express = require('express');
const { clearSecurityLocks, getSecurityMetricsAdmin } = require('../controllers/securityController');

const router = express.Router();

router.post('/admin/security/clear', clearSecurityLocks);
router.get('/admin/security/metrics', getSecurityMetricsAdmin);

module.exports = router;

