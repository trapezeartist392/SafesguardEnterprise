const express = require('express');
const router = express.Router();
const { getDB } = require('../config/database');
const { authenticate } = require('../middleware/auth');
const asyncHandler = require('../utils/asyncHandler');

router.get('/', authenticate, asyncHandler(async (req, res) => {
  const { rows } = await getDB().query(
    `SELECT a.*, p.name AS plant_name FROM areas a
     JOIN plants p ON p.id = a.plant_id
     WHERE p.tenant_id = $1 ORDER BY a.name`,
    [req.user.tenantId]
  );
  res.json({ success: true, data: rows });
}));

router.post('/', authenticate, asyncHandler(async (req, res) => {
  const { plant_id, name, hazard_level } = req.body;
  const { rows } = await getDB().query(
    'INSERT INTO areas (plant_id, name, hazard_level) VALUES ($1,$2,$3) RETURNING *',
    [plant_id, name, hazard_level || 'medium']
  );
  res.status(201).json({ success: true, data: rows[0] });
}));

module.exports = router;
