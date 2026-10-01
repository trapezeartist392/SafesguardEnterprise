const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { getLicense } = require('../config/license');
const asyncHandler = require('../utils/asyncHandler');

// GET /license — returns license info for the dashboard's license status panel
router.get('/', authenticate, asyncHandler(async (req, res) => {
  const lic = getLicense();
  res.json({
    success: true,
    data: {
      customer: lic.customer,
      max_devices: lic.max_devices,
      max_cameras: lic.max_cameras,
      expires_at: lic.expires_at,
      features: lic.features,
      license_id: lic.license_id,
    },
  });
}));

module.exports = router;
