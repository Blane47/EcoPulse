const Bin = require('../models/Bin');
const { isCollector } = require('../middleware/auth');
const { escapeRegex } = require('../utils/escapeRegex');
const { getDistanceMeters } = require('../utils/geo');

exports.getAllBins = async (req, res, next) => {
  try {
    const { zone, type, status, page = 1, limit = 10 } = req.query;
    const filter = {};

    if (zone) filter.zone = zone;
    if (type) filter.type = type;
    if (status) filter.status = status;
    // Text search from the dashboard (bin ID or location)
    if (req.query.q?.trim()) {
      const match = new RegExp(escapeRegex(req.query.q.trim().slice(0, 60)), 'i');
      filter.$or = [{ binId: match }, { location: match }];
    }

    const skip = (page - 1) * limit;
    const [bins, total] = await Promise.all([
      Bin.find(filter).populate('assignedCollector', 'name truck').sort({ createdAt: -1 }).skip(skip).limit(Number(limit)),
      Bin.countDocuments(filter),
    ]);

    res.json({
      bins,
      total,
      page: Number(page),
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    next(error);
  }
};

exports.getBinById = async (req, res, next) => {
  try {
    const bin = await Bin.findById(req.params.id).populate('assignedCollector', 'name truck');
    if (!bin) return res.status(404).json({ message: 'Bin not found' });
    res.json(bin);
  } catch (error) {
    next(error);
  }
};

exports.createBin = async (req, res, next) => {
  try {
    const bin = await Bin.create(req.body);
    res.status(201).json(bin);
  } catch (error) {
    next(error);
  }
};

exports.updateBin = async (req, res, next) => {
  try {
    // findByIdAndUpdate skips the save hook, so keep status in step with fillLevel here
    const updates = { ...req.body };
    if (updates.fillLevel != null) updates.status = Bin.statusForFill(Number(updates.fillLevel));
    const bin = await Bin.findByIdAndUpdate(req.params.id, updates, {
      returnDocument: 'after',
      runValidators: true,
    });
    if (!bin) return res.status(404).json({ message: 'Bin not found' });
    res.json(bin);
  } catch (error) {
    next(error);
  }
};

exports.deleteBin = async (req, res, next) => {
  try {
    const bin = await Bin.findByIdAndDelete(req.params.id);
    if (!bin) return res.status(404).json({ message: 'Bin not found' });
    res.json({ message: 'Bin deleted successfully' });
  } catch (error) {
    next(error);
  }
};

exports.getNearbyBins = async (req, res, next) => {
  try {
    const { lat, lng } = req.query;
    const bins = await Bin.find().populate('assignedCollector', 'name truck');
    const nearby = bins.filter((b) => {
      if (!b.coordinates?.lat || !b.coordinates?.lng) return false;
      const dlat = Math.abs(b.coordinates.lat - parseFloat(lat));
      const dlng = Math.abs(b.coordinates.lng - parseFloat(lng));
      return dlat < 0.02 && dlng < 0.02;
    });
    res.json(nearby);
  } catch (error) {
    next(error);
  }
};

exports.collectBin = async (req, res, next) => {
  try {
    const bin = await Bin.findById(req.params.id);
    if (!bin) return res.status(404).json({ message: 'Bin not found' });

    const { lat, lng, photo } = req.body || {};

    // Collectors must prove they're at the bin; admins can mark a bin collected from the dashboard
    if (isCollector(req.user) && (lat == null || lng == null)) {
      return res.status(400).json({ message: 'Your GPS location is required to mark a bin as collected.' });
    }

    // GPS proximity check — collector must be within 100m of the bin
    if (lat != null && lng != null && bin.coordinates?.lat && bin.coordinates?.lng) {
      const distance = getDistanceMeters(lat, lng, bin.coordinates.lat, bin.coordinates.lng);
      if (distance > 100) {
        return res.status(400).json({
          message: `You are ${Math.round(distance)}m away. You must be within 100m of the bin to mark it as collected.`,
          distance: Math.round(distance),
        });
      }
    }

    bin.fillLevel = 0;
    bin.status = 'empty';
    bin.lastCollected = new Date();
    if (photo) bin.photo = photo;
    await bin.save();

    res.json(bin);
  } catch (error) {
    next(error);
  }
};


exports.getStats = async (req, res, next) => {
  try {
    const [total, critical, warning, byZone, byType] = await Promise.all([
      Bin.countDocuments(),
      Bin.countDocuments({ status: 'critical' }),
      Bin.countDocuments({ status: 'warning' }),
      Bin.aggregate([
        { $group: { _id: '$zone', count: { $sum: 1 }, avgFill: { $avg: '$fillLevel' } } },
      ]),
      Bin.aggregate([
        { $group: { _id: '$type', count: { $sum: 1 } } },
      ]),
    ]);

    res.json({ total, critical, warning, byZone, byType });
  } catch (error) {
    next(error);
  }
};
