const express = require('express');
const {
  requestAccess,
  accessStatus,
  adminListPendingRequests,
  adminApproveRequest
} = require('../controllers/accessController');

const router = express.Router();

router.post('/access/request', requestAccess);
router.get('/access/status', accessStatus);
router.get('/admin/access/pending', adminListPendingRequests);
router.post('/admin/access/approve', adminApproveRequest);

module.exports = router;
