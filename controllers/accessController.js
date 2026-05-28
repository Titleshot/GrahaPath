const {
  submitAccessRequest,
  listPendingAccessRequests,
  approveAccessEmail,
  isEmailApproved
} = require('../services/inviteAccessService');

function normalizeEmail(value) {
  return String(value || '').trim().toLowerCase();
}

function adminAuthorized(req) {
  const key = String(process.env.ACCESS_ADMIN_KEY || '').trim();
  if (!key) return false;
  const incoming = String(req.headers['x-admin-key'] || '').trim();
  return incoming && incoming === key;
}

async function requestAccess(req, res, next) {
  try {
    const record = await submitAccessRequest({
      email: req.body?.email,
      name: req.body?.name,
      phone: req.body?.phone,
      note: req.body?.note
    });
    return res.status(202).json({
      ok: true,
      message: 'Access request received. We will review and approve manually.',
      request: {
        email: record.email,
        status: 'pending'
      }
    });
  } catch (error) {
    if (error.code === 'INVALID_EMAIL') {
      return res.status(400).json({
        error: 'BadRequest',
        message: error.message
      });
    }
    return next(error);
  }
}

async function accessStatus(req, res, next) {
  try {
    const email = normalizeEmail(req.query?.email || req.body?.email || req.headers['x-gp-access-email']);
    if (!email) {
      return res.status(400).json({
        error: 'BadRequest',
        message: 'email is required.'
      });
    }
    const approved = await isEmailApproved(email);
    return res.json({ email, approved });
  } catch (error) {
    return next(error);
  }
}

async function adminListPendingRequests(req, res, next) {
  try {
    if (!adminAuthorized(req)) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Admin key missing or invalid.'
      });
    }
    const rows = await listPendingAccessRequests(Number(req.query?.limit) || 100);
    return res.json({ pending: rows, count: rows.length });
  } catch (error) {
    return next(error);
  }
}

async function adminApproveRequest(req, res, next) {
  try {
    if (!adminAuthorized(req)) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Admin key missing or invalid.'
      });
    }
    const email = normalizeEmail(req.body?.email);
    if (!email) {
      return res.status(400).json({
        error: 'BadRequest',
        message: 'email is required.'
      });
    }
    const approvedBy =
      String(req.body?.approvedBy || req.headers['x-admin-user'] || 'admin').trim() || 'admin';
    const result = await approveAccessEmail(email, approvedBy);
    return res.json({ ok: true, approval: result });
  } catch (error) {
    if (error.code === 'INVALID_EMAIL') {
      return res.status(400).json({
        error: 'BadRequest',
        message: error.message
      });
    }
    return next(error);
  }
}

module.exports = {
  requestAccess,
  accessStatus,
  adminListPendingRequests,
  adminApproveRequest
};
