const Report = require('../models/Report');
const Collector = require('../models/Collector');
const Notification = require('../models/Notification');

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
    const reports = await Report.find({ $or: [{ reporterPhone: phone }, { deviceId: phone }] })
      .sort({ createdAt: -1 })
      .limit(50);
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

// Assigned collector marks the report as collected
exports.markAssignedReportCollected = async (req, res, next) => {
  try {
    const report = await Report.findById(req.params.id);
    if (!report) return res.status(404).json({ message: 'Report not found' });
    if (report.assignedCollector?.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'This report is not assigned to you' });
    }
    if (report.status !== 'collected') {
      report.status = 'collected';
      report.collectedAt = new Date();
      await report.save();
    }
    res.json(report);
  } catch (error) {
    next(error);
  }
};
