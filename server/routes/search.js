const express = require('express');
const router = express.Router();
const Bin = require('../models/Bin');
const Collector = require('../models/Collector');
const Report = require('../models/Report');
const { protect, authorize } = require('../middleware/auth');
const { escapeRegex } = require('../utils/escapeRegex');

const LIMIT = 5;

// Dashboard top-bar search across bins, collectors and community reports
router.get('/', protect, authorize('admin'), async (req, res, next) => {
  try {
    const q = String(req.query.q || '').trim().slice(0, 60);
    if (q.length < 2) return res.json({ bins: [], collectors: [], reports: [] });
    const match = new RegExp(escapeRegex(q), 'i');

    const [bins, collectors, reports] = await Promise.all([
      Bin.find({ $or: [{ binId: match }, { location: match }, { zone: match }] })
        .select('binId location zone status fillLevel')
        .limit(LIMIT),
      Collector.find({ $or: [{ name: match }, { phone: match }, { zone: match }, { truck: match }] })
        .select('name phone zone status')
        .limit(LIMIT),
      Report.find({ $or: [{ location: match }, { note: match }, { reporterName: match }, { zone: match }] })
        .select('location zone status reporterName createdAt')
        .sort({ createdAt: -1 })
        .limit(LIMIT),
    ]);
    res.json({ bins, collectors, reports });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
