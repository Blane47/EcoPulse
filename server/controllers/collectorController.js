const Collector = require('../models/Collector');

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

exports.deleteCollector = async (req, res, next) => {
  try {
    const collector = await Collector.findByIdAndDelete(req.params.id);
    if (!collector) return res.status(404).json({ message: 'Collector not found' });
    res.json({ message: 'Collector deleted successfully' });
  } catch (error) {
    next(error);
  }
};
