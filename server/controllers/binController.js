const Bin = require('../models/Bin');

exports.getAllBins = async (req, res, next) => {
  try {
    const { zone, type, status, page = 1, limit = 10 } = req.query;
    const filter = {};

    if (zone) filter.zone = zone;
    if (type) filter.type = type;
    if (status) filter.status = status;

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
    const bin = await Bin.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
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
