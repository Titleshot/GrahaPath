const express = require('express');
const {
  login,
  logout,
  me,
  authChart,
  adminCreateOrResetUser,
  adminSetUserActive,
  adminListUsers,
  adminAssignChart
} = require('../controllers/authController');

const router = express.Router();

router.post('/auth/login', login);
router.post('/auth/logout', logout);
router.get('/auth/me', me);
router.get('/auth/chart', authChart);

router.get('/admin/auth/users', adminListUsers);
router.post('/admin/auth/users/upsert', adminCreateOrResetUser);
router.post('/admin/auth/users/active', adminSetUserActive);
router.post('/admin/auth/users/assign-chart', adminAssignChart);

module.exports = router;
