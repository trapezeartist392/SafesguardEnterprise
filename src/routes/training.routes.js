const express = require('express');
const router  = express.Router();
const { getDB } = require('../config/database');
const { authenticate } = require('../middleware/auth');
const asyncHandler = require('../utils/asyncHandler');
const { generateRecommendations, summarise } = require('../utils/trainingRules');

// GET /training/recommendations?days=30
router.get('/recommendations', authenticate, asyncHandler(async (req, res) => {
  const days = Math.min(parseInt(req.query.days) || 30, 365);
  const { rows } = await getDB().query(`
    SELECT v.violation_type, v.occurred_at,
           d.zone_name, a.name AS area_name, c.cam_label AS camera_label
    FROM violations v
    LEFT JOIN edge_devices d ON d.id = v.edge_device_id
    LEFT JOIN cameras c      ON c.id = v.camera_id
    LEFT JOIN areas a        ON a.id = c.area_id
    WHERE v.tenant_id = $1 AND v.occurred_at > now() - ($2 || ' days')::interval
    ORDER BY v.occurred_at DESC`,
    [req.user.tenantId, String(days)]
  );

  res.json({ success: true, data: {
    period_days: days,
    summary: summarise(rows),
    recommendations: generateRecommendations(rows),
    generated_at: new Date().toISOString(),
  }});
}));

module.exports = router;
