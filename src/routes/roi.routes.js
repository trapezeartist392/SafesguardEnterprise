const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const asyncHandler = require('../utils/asyncHandler');

router.post('/report', authenticate, asyncHandler(async (req, res) => {
  res.json({ success: true, data: { message: 'ROI report generated', input: req.body } });
}));

module.exports = router;
