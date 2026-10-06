const express = require('express');
const crypto = require('crypto');
const router = express.Router();
const Application = require('../models/Application');
const Collector = require('../models/Collector');
const { protect, authorize } = require('../middleware/auth');
const { normalizePhone } = require('../utils/phone');

// POST — community user submits application (public)
router.post('/', async (req, res) => {
  try {
    const { name, zone, hasLicense, motivation } = req.body;
    const phone = normalizePhone(req.body.phone);
    if (!name || !req.body.phone || !zone) {
      return res.status(400).json({ message: 'Name, phone, and zone are required' });
    }
    if (!phone) return res.status(400).json({ message: 'Enter a valid phone number' });
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
    const phone = normalizePhone(req.params.phone);
    const app = phone && await Application.findOne({ phone }).sort({ createdAt: -1 }).select('status');
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
    const app = await Application.findByIdAndUpdate(req.params.id, { status }, { returnDocument: 'after' });
    if (!app) {
      return res.status(404).json({ message: 'Application not found' });
    }
    res.json(app);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST — approve and create the collector account (admin only).
// Returns the login PIN once, in plain text, so the admin can give it to the new collector.
router.post('/:id/create-collector', protect, authorize('admin'), async (req, res) => {
  try {
    const app = await Application.findById(req.params.id);
    if (!app) return res.status(404).json({ message: 'Application not found' });
    if (app.collector) return res.status(400).json({ message: 'A collector account already exists for this application' });

    const existing = await Collector.findOne({ phone: app.phone });
    if (existing) return res.status(409).json({ message: 'A collector with this phone number already exists' });

    const pin = String(crypto.randomInt(0, 1000000)).padStart(6, '0');
    const collector = await Collector.create({
      name: app.name,
      phone: app.phone,
      zone: app.zone,
      pin,
      truck: req.body.truck || '',
    });

    app.status = 'approved';
    app.collector = collector._id;
    await app.save();

    const created = collector.toObject();
    delete created.pin;
    res.status(201).json({ application: app, collector: created, pin });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
