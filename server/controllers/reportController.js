const Report = require('../models/Report');
const Collector = require('../models/Collector');
const Notification = require('../models/Notification');
const { getDistanceMeters } = require('../utils/geo');

const MAX_PROOF_PHOTO_CHARS = 4 * 1024 * 1024; // ~3 MB image as a base64 data URL

const clearProof = (report) => {
  report.proof = {};
  report.review = {};
};

const ASSIGNEE_FIELDS = 'name zone status truck';

// Resident submits a report. Identity comes from the device token, never the body,
// and only report fields are accepted (status/assignment can't be set by the public).
exports.createReport = async (req, res, next) => {
  try {
    const { location, coordinates, photo, note, zone, binId } = req.body;
    const resident = req.communityUser;
    const report = await Report.create({
      location,
      coordinates,
      photo,
      note,
      zone: zone || resident.zone,
      binId: binId || null,
      deviceId: resident.phone,
      reporterName: resident.name,
      reporterPhone: resident.phone,
    });
    resident.reportsCount += 1;
    await resident.save();
    res.status(201).json(report);
  } catch (error) {
    next(error);
  }
};

// Resident's own reports
exports.getMyReports = async (req, res, next) => {
  try {
    const { phone } = req.communityUser;
    // Older app versions stored the phone only in deviceId
    // Residents don't see the collector's location or the admin's review notes; the cleanup
    // photo is shared once the admin has approved it
    const reports = await Report.find({ $or: [{ reporterPhone: phone }, { deviceId: phone }] })
      .select('-proof.lat -proof.lng -proof.distanceMeters -proof.submittedBy -review -assignedCollector')
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();
    for (const r of reports) {
      if (r.status !== 'collected' && r.proof) r.proof.photo = null;
    }
    res.json(reports);
  } catch (error) {
    next(error);
  }
};

exports.getAllReports = async (req, res, next) => {
  try {
    const { zone, status } = req.query;
    const filter = {};
    if (zone) filter.zone = zone;
    if (status) filter.status = status;

    const reports = await Report.find(filter)
      .populate('assignedCollector', ASSIGNEE_FIELDS)
      .sort({ createdAt: -1 });
    res.json(reports);
  } catch (error) {
    next(error);
  }
};

exports.updateReportStatus = async (req, res, next) => {
  try {
    const { status } = req.body;
    if (status === 'assigned') {
      return res.status(400).json({ message: 'Use the assign endpoint to assign a report' });
    }
    if (status === 'awaiting_review') {
      return res.status(400).json({ message: 'Reports move to review when the collector submits a proof photo' });
    }
    const updates = { status };
    if (status === 'collected') updates.collectedAt = new Date();
    const report = await Report.findByIdAndUpdate(req.params.id, updates, {
      returnDocument: 'after',
      runValidators: true,
    }).populate('assignedCollector', ASSIGNEE_FIELDS);
    if (!report) return res.status(404).json({ message: 'Report not found' });
    res.json(report);
  } catch (error) {
    next(error);
  }
};

// Admin assigns (or, with collectorId: null, unassigns) a report and notifies the collector
exports.assignReport = async (req, res, next) => {
  try {
    const { collectorId } = req.body;
    const report = await Report.findById(req.params.id);
    if (!report) return res.status(404).json({ message: 'Report not found' });
    if (report.status === 'collected') {
      return res.status(400).json({ message: 'This report has already been collected' });
    }

    const previous = report.assignedCollector?.toString() || null;
    // A new assignee starts fresh; an earlier collector's proof no longer applies
    if ((collectorId || null) !== previous) clearProof(report);

    if (!collectorId) {
      report.assignedCollector = null;
      report.assignedAt = null;
      report.status = 'pending';
    } else {
      const collector = await Collector.findById(collectorId);
      if (!collector) return res.status(404).json({ message: 'Collector not found' });
      if (collector.status === 'inactive') {
        return res.status(400).json({ message: 'This collector is inactive' });
      }
      report.assignedCollector = collector._id;
      report.assignedAt = new Date();
      report.status = 'assigned';
    }
    await report.save();

    const current = report.assignedCollector?.toString() || null;
    if (current !== previous) {
      const notifications = [];
      if (current) {
        notifications.push({
          recipient: current,
          type: 'report_assigned',
          title: 'New report assigned',
          body: `${report.location} (${report.zone})${report.note ? ` — ${report.note}` : ''}`,
          report: report._id,
        });
      }
      if (previous) {
        notifications.push({
          recipient: previous,
          type: 'report_unassigned',
          title: 'Report reassigned',
          body: report.location,
          report: report._id,
        });
      }
      await Notification.insertMany(notifications);
    }

    await report.populate('assignedCollector', ASSIGNEE_FIELDS);
    res.json(report);
  } catch (error) {
    next(error);
  }
};

// Collector's assigned reports: open ones first, then recently collected
exports.getMyAssignedReports = async (req, res, next) => {
  try {
    const reports = await Report.find({ assignedCollector: req.user._id })
      .sort({ status: 1, assignedAt: -1 })
      .limit(50);
    res.json(reports);
  } catch (error) {
    next(error);
  }
};

// Assigned collector submits a photo of the cleared spot (proof of collection) for the admin to check
exports.submitProof = async (req, res, next) => {
  try {
    const { photo } = req.body || {};
    const lat = Number(req.body?.lat);
    const lng = Number(req.body?.lng);
    if (typeof photo !== 'string' || !photo.startsWith('data:image/')) {
      return res.status(400).json({ message: 'A photo of the cleared spot is required' });
    }
    if (photo.length > MAX_PROOF_PHOTO_CHARS) {
      return res.status(413).json({ message: 'Photo is too large' });
    }
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      return res.status(400).json({ message: 'Your GPS location is required' });
    }

    const report = await Report.findById(req.params.id);
    if (!report) return res.status(404).json({ message: 'Report not found' });
    if (report.assignedCollector?.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'This report is not assigned to you' });
    }
    if (report.status !== 'assigned') {
      return res.status(400).json({
        message: report.status === 'awaiting_review'
          ? 'Your proof is already waiting for review'
          : 'This report is not open for collection',
      });
    }

    const hasSpot = report.coordinates?.lat && report.coordinates?.lng;
    report.proof = {
      photo,
      lat,
      lng,
      distanceMeters: hasSpot ? Math.round(getDistanceMeters(lat, lng, report.coordinates.lat, report.coordinates.lng)) : null,
      submittedAt: new Date(),
      submittedBy: req.user._id,
    };
    report.review = {};
    report.status = 'awaiting_review';
    await report.save();
    res.json(report);
  } catch (error) {
    next(error);
  }
};

// Admin approves the proof (report collected) or rejects it with a reason (back to the collector)
exports.reviewProof = async (req, res, next) => {
  try {
    const { decision } = req.body || {};
    const note = String(req.body?.note || '').trim().slice(0, 500);
    if (!['approve', 'reject'].includes(decision)) {
      return res.status(400).json({ message: 'Decision must be approve or reject' });
    }
    if (decision === 'reject' && note.length < 3) {
      return res.status(400).json({ message: 'Tell the collector why the proof was rejected' });
    }

    const report = await Report.findById(req.params.id);
    if (!report) return res.status(404).json({ message: 'Report not found' });
    if (report.status !== 'awaiting_review') {
      return res.status(400).json({ message: 'This report has no proof waiting for review' });
    }

    const approved = decision === 'approve';
    report.review = { decision: approved ? 'approved' : 'rejected', note, reviewedAt: new Date(), reviewedBy: req.user._id };
    report.status = approved ? 'collected' : 'assigned';
    if (approved) report.collectedAt = new Date();
    await report.save();

    if (report.assignedCollector) {
      await Notification.create({
        recipient: report.assignedCollector,
        type: approved ? 'proof_approved' : 'proof_rejected',
        title: approved ? 'Collection approved' : 'Collection proof rejected',
        // Data only (location / admin's note); the app words the title in the collector's language
        body: approved ? report.location : `${report.location} — ${note}`,
        report: report._id,
      });
    }

    await report.populate('assignedCollector', ASSIGNEE_FIELDS);
    res.json(report);
  } catch (error) {
    next(error);
  }
};
