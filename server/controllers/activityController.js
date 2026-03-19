const Activity = require('../models/Activity');
const Bin = require('../models/Bin');
const Collector = require('../models/Collector');

exports.getRecentActivity = async (req, res, next) => {
  try {
    const { limit = 10 } = req.query;
    const activities = await Activity.find()
      .populate('collector', 'name')
      .populate('bin', 'binId location')
      .sort({ createdAt: -1 })
      .limit(Number(limit));

    res.json(activities);
  } catch (error) {
    next(error);
  }
};

exports.logCollection = async (req, res, next) => {
  try {
    const { collectorId, binId } = req.body;

    const bin = await Bin.findById(binId);
    if (!bin) return res.status(404).json({ message: 'Bin not found' });

    const collector = await Collector.findById(collectorId);
    if (!collector) return res.status(404).json({ message: 'Collector not found' });

    // Reset bin fill level
    bin.fillLevel = 0;
    bin.lastCollected = new Date();
    await bin.save();

    // Update collector stats
    collector.collectionsToday += 1;
    collector.collectionsMonth += 1;
    await collector.save();

    const activity = await Activity.create({
      collector: collectorId,
      bin: binId,
      zone: bin.zone,
      action: 'collected',
      status: 'completed',
    });

    res.status(201).json(activity);
  } catch (error) {
    next(error);
  }
};

exports.getDashboardStats = async (req, res, next) => {
  try {
    const [totalBins, overdueBins, activeCollectors, collectionsToday] = await Promise.all([
      Bin.countDocuments(),
      Bin.countDocuments({ status: 'critical' }),
      Collector.countDocuments({ status: 'active' }),
      Activity.countDocuments({
        createdAt: { $gte: new Date(new Date().setHours(0, 0, 0, 0)) },
        action: 'collected',
      }),
    ]);

    const collectionsByZone = await Activity.aggregate([
      {
        $match: {
          createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
        },
      },
      { $group: { _id: '$zone', collections: { $sum: 1 } } },
    ]);

    res.json({
      totalBins,
      overdueBins,
      activeCollectors,
      collectionsToday,
      collectionsByZone,
    });
  } catch (error) {
    next(error);
  }
};
