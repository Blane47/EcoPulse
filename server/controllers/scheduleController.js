const Schedule = require('../models/Schedule');

exports.getScheduleByZone = async (req, res, next) => {
  try {
    const schedules = await Schedule.find({ zone: req.params.zone }).sort({ day: 1 });
    res.json(schedules);
  } catch (error) {
    next(error);
  }
};

exports.createSchedule = async (req, res, next) => {
  try {
    const schedule = await Schedule.create(req.body);
    res.status(201).json(schedule);
  } catch (error) {
    next(error);
  }
};

exports.updateSchedule = async (req, res, next) => {
  try {
    const schedule = await Schedule.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!schedule) return res.status(404).json({ message: 'Schedule not found' });
    res.json(schedule);
  } catch (error) {
    next(error);
  }
};
