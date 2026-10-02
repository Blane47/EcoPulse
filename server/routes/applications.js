const express = require('express');
const router = express.Router();
const Application = require('../models/Application');
const { protect, authorize } = require('../middleware/auth');

// POST — community user submits application (public)
router.post('/', async (req, res) => {
  try {
    const { name, phone, zone, hasLicense, motivation } = req.body;
    if (!name || !phone || !zone) {
      return res.status(400).json({ message: 'Name, phone, and zone are required' });
    }
    // Check if already applied
    const existing = await Application.findOne({ phone, status: 'pending' });
    if (existing) {
      return res.status(400).json({ message: 'You already have a pending application' });
    }
    const application = await Application.create({ name, phone, zone, hasLicense, motivation });
    res.status(201).json(application);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET — check application status by phone (public)
router.get('/status/:phone', async (req, res) => {
  try {
    // Public endpoint — return only the status, never the applicant's details
    const app = await Application.findOne({ phone: req.params.phone }).sort({ createdAt: -1 }).select('status');
    res.json({ status: app ? app.status : 'none' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET — list all applications (admin only)
router.get('/', protect, authorize('admin'), async (req, res) => {
  try {
    const apps = await Application.find().sort({ createdAt: -1 });
    res.json(apps);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PUT — approve or reject (admin only)
router.put('/:id', protect, authorize('admin'), async (req, res) => {
  try {
    const { status } = req.body;
    if (!Application.schema.path('status').enumValues.includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }
    const app = await Application.findByIdAndUpdate(req.params.id, { status }, { new: true });
    if (!app) {
      return res.status(404).json({ message: 'Application not found' });
    }
    res.json(app);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
