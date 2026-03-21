const Collector = require('../models/Collector');
const Bin = require('../models/Bin');

exports.getAllCollectors = async (req, res, next) => {
  try {
    const { zone, status } = req.query;
    const filter = {};

    if (zone) filter.zone = zone;
    if (status) filter.status = status;

    const collectors = await Collector.find(filter).sort({ name: 1 });
    res.json(collectors);
  } catch (error) {
    next(error);
  }
};

exports.getCollectorById = async (req, res, next) => {
  try {
    const collector = await Collector.findById(req.params.id);
    if (!collector) return res.status(404).json({ message: 'Collector not found' });
    res.json(collector);
  } catch (error) {
    next(error);
  }
};

exports.createCollector = async (req, res, next) => {
  try {
    const collector = await Collector.create(req.body);
    res.status(201).json(collector);
  } catch (error) {
    next(error);
  }
};

exports.updateCollector = async (req, res, next) => {
  try {
    const collector = await Collector.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!collector) return res.status(404).json({ message: 'Collector not found' });
    res.json(collector);
  } catch (error) {
    next(error);
  }
};

exports.getMyRoute = async (req, res, next) => {
  try {
    const collectorId = req.user._id;
    const bins = await Bin.find({ assignedCollector: collectorId }).sort({ fillLevel: -1 });
    res.json({ bins });
  } catch (error) {
    next(error);
  }
};

exports.updateMyAvatar = async (req, res, next) => {
  try {
    const { avatar } = req.body;
    if (!avatar) return res.status(400).json({ message: 'Avatar image is required' });

    const collector = await Collector.findByIdAndUpdate(
      req.user._id,
      { avatar },
      { new: true }
    );
    if (!collector) return res.status(404).json({ message: 'Collector not found' });

    res.json({ message: 'Avatar updated', avatar: collector.avatar });
  } catch (error) {
    next(error);
  }
};

exports.deleteCollector = async (req, res, next) => {
  try {
    const collector = await Collector.findByIdAndDelete(req.params.id);
    if (!collector) return res.status(404).json({ message: 'Collector not found' });
    res.json({ message: 'Collector deleted successfully' });
  } catch (error) {
    next(error);
  }
};
