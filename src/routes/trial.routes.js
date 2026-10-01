const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { getLicense } = require('../config/license');
const asyncHandler = require('../utils/asyncHandler');

// GET /trial/status — v1 frontend checks this for TrialExpiredBanner
// Enterprise maps this to license status instead of SaaS trial
router.get('/status', authenticate, asyncHandler(async (req, res) => {
  try {
    const lic = getLicense();
    res.json({ success: true, data: {
      status: 'active',         // license valid = active
      plan: 'enterprise',
      daysLeft: Math.max(0, Math.ceil((new Date(lic.expires_at) - Date.now()) / 86400000)),
      maxDevices: lic.max_devices,
      maxCameras: lic.max_cameras,
      expiresAt: lic.expires_at,
      customer: lic.customer,
    }});
  } catch (err) {
    res.json({ success: true, data: { status: 'expired', plan: 'enterprise', daysLeft: 0, message: err.message }});
  }
}));

module.exports = router;
