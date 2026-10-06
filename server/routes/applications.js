const express = require('express');
const router = express.Router();
const Application = require('../models/Application');
const Collector = require('../models/Collector');
const { protect, authorize } = require('../middleware/auth');
const { normalizePhone } = require('../utils/phone');
const { normalizeEmail, isValidEmail } = require('../utils/email');
const { tempPassword } = require('../utils/tempPassword');

// POST — community user submits application (public)
router.post('/', async (req, res) => {
  try {
    const { name, zone, hasLicense, motivation } = req.body;
    const phone = normalizePhone(req.body.phone);
    const email = normalizeEmail(req.body.email);
    if (!name || !req.body.phone || !zone || !email) {
      return res.status(400).json({ message: 'Name, phone, email and zone are required' });
    }
    if (!phone) return res.status(400).json({ message: 'Enter a valid phone number' });
    if (!isValidEmail(email)) return res.status(400).json({ message: 'Enter a valid email address' });
    // Check if already applied, or already a collector
    const existing = await Application.findOne({ status: 'pending', $or: [{ phone }, { email }] });
    if (existing) {
      return res.status(400).json({ message: 'You already have a pending application' });
    }
    if (await Collector.exists({ email })) {
      return res.status(400).json({ message: 'This email is already used by a collector account' });
    }
    const application = await Application.create({ name, phone, email, zone, hasLicense, motivation });
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

// POST — approve and create the collector account (admin only). The collector signs in with the
// application's email (or body.email for older applications without one) and a temporary password,
// returned once so the admin can give it to them; the Collector app makes them change it.
router.post('/:id/create-collector', protect, authorize('admin'), async (req, res) => {
  try {
    const app = await Application.findById(req.params.id);
    if (!app) return res.status(404).json({ message: 'Application not found' });
    if (app.collector) return res.status(400).json({ message: 'A collector account already exists for this application' });

    const email = normalizeEmail(app.email || req.body.email);
    if (!isValidEmail(email)) {
      return res.status(400).json({ message: 'This application has no email. Enter the email the collector will sign in with.' });
    }
    if (await Collector.exists({ phone: app.phone })) {
      return res.status(409).json({ message: 'A collector with this phone number already exists' });
    }
    if (await Collector.exists({ email })) {
      return res.status(409).json({ message: 'A collector with this email already exists' });
    }

    const temporaryPassword = tempPassword();
    const collector = await Collector.create({
      name: app.name,
      phone: app.phone,
      email,
      zone: app.zone,
      password: temporaryPassword,
      mustChangePassword: true,
      truck: req.body.truck || '',
    });

    app.status = 'approved';
    app.email = email;
    app.collector = collector._id;
    await app.save();

    res.status(201).json({ application: app, collector, temporaryPassword });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
