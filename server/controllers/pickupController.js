const PickupRequest = require('../models/PickupRequest');
const Operator = require('../models/Operator');
const Collector = require('../models/Collector');
const { computeFee, WASTE_TYPES, LOAD_SIZES } = require('../utils/pricing');

// Status -> the lifecycle timestamp it stamps.
const TIMESTAMP_FOR = {
  accepted: 'acceptedAt',
  en_route: 'enRouteAt',
  picked_up: 'pickedUpAt',
  completed: 'completedAt',
  cancelled: 'cancelledAt',
};

const canTransition = (from, to) => (PickupRequest.TRANSITIONS[from] || []).includes(to);

// POST / — a resident creates a pickup request against an operator. The fee is
// computed server-side from the operator's pricing; resident name/phone are
// snapshotted onto the request. Uses the device-token resident (communityAuth).
exports.createPickup = async (req, res, next) => {
  try {
    const { operator: operatorId, wasteType, loadSize, note, location } = req.body;
    if (!operatorId) return res.status(400).json({ message: 'An operator is required' });
    if (wasteType && !WASTE_TYPES.includes(wasteType)) {
      return res.status(400).json({ message: 'Invalid waste type' });
    }
    if (loadSize && !LOAD_SIZES.includes(loadSize)) {
      return res.status(400).json({ message: 'Invalid load size' });
    }

    const operator = await Operator.findById(operatorId);
    if (!operator) return res.status(404).json({ message: 'Operator not found' });
    if (operator.status !== 'approved' || !operator.acceptingRequests) {
      return res.status(400).json({ message: 'This operator is not accepting requests right now' });
    }

    const resident = req.communityUser;
    const fee = computeFee(operator, {
      wasteType: wasteType || 'household',
      loadSize: loadSize || 'medium',
    });

    const pickup = await PickupRequest.create({
      resident: resident._id,
      residentName: req.body.residentName?.trim() || resident.name,
      phone: req.body.phone || resident.phone,
      operator: operator._id,
      location: location || {},
      note,
      wasteType: wasteType || 'household',
      loadSize: loadSize || 'medium',
      fee,
      status: 'requested',
    });

    res.status(201).json(pickup);
  } catch (error) {
    next(error);
  }
};

// GET /mine — the signed-in resident's own requests (device-token auth).
exports.getMyPickups = async (req, res, next) => {
  try {
    const pickups = await PickupRequest.find({ resident: req.communityUser._id })
      .populate('operator', 'businessName logoUrl phone')
      .populate('collector', 'name phone')
      .sort({ createdAt: -1 });
    res.json(pickups);
  } catch (error) {
    next(error);
  }
};

// GET /:id — a single request.
exports.getPickupById = async (req, res, next) => {
  try {
    const pickup = await PickupRequest.findById(req.params.id)
      .populate('operator', 'businessName logoUrl phone')
      .populate('collector', 'name phone');
    if (!pickup) return res.status(404).json({ message: 'Pickup request not found' });
    res.json(pickup);
  } catch (error) {
    next(error);
  }
};

// GET / — the signed-in operator's requests, optional ?status=.
// operatorAuth has loaded req.operator; the scope is taken from the token, never the
// query, so an operator can only ever see its own jobs.
exports.getPickups = async (req, res, next) => {
  try {
    const { status } = req.query;
    const filter = { operator: req.operator._id };
    if (status) filter.status = status;

    const pickups = await PickupRequest.find(filter)
      .populate('collector', 'name phone')
      .sort({ createdAt: -1 });
    res.json(pickups);
  } catch (error) {
    next(error);
  }
};

// PATCH /:id/accept — operator assigns a collector and moves the job to 'accepted'.
exports.acceptPickup = async (req, res, next) => {
  try {
    const { collectorId } = req.body;
    if (!collectorId) return res.status(400).json({ message: 'A collector is required' });

    const pickup = await PickupRequest.findById(req.params.id);
    if (!pickup) return res.status(404).json({ message: 'Pickup request not found' });
    if (!pickup.operator.equals(req.operator._id)) {
      return res.status(403).json({ message: 'This request belongs to another operator' });
    }
    if (!canTransition(pickup.status, 'accepted')) {
      return res.status(400).json({ message: `Cannot accept a request that is ${pickup.status}` });
    }

    const collector = await Collector.findById(collectorId);
    if (!collector) return res.status(404).json({ message: 'Collector not found' });
    // A collector may only be assigned to jobs of the operator that employs them.
    if (!collector.operatorId || !collector.operatorId.equals(req.operator._id)) {
      return res.status(403).json({ message: 'That collector does not work for your business' });
    }

    pickup.collector = collector._id;
    pickup.status = 'accepted';
    pickup.acceptedAt = new Date();
    await pickup.save();
    res.json(pickup);
  } catch (error) {
    next(error);
  }
};

// PATCH /:id/status — advance the lifecycle. Every transition is guarded against
// PickupRequest.TRANSITIONS; illegal jumps are rejected with 400. On 'completed'
// the (simulated cash) payment is marked paid and the operator's completed count grows.
exports.updatePickupStatus = async (req, res, next) => {
  try {
    const { status } = req.body;
    if (!status || !PickupRequest.STATUSES.includes(status)) {
      return res.status(400).json({ message: 'A valid status is required' });
    }

    const pickup = await PickupRequest.findById(req.params.id);
    if (!pickup) return res.status(404).json({ message: 'Pickup request not found' });
    if (!pickup.operator.equals(req.operator._id)) {
      return res.status(403).json({ message: 'This request belongs to another operator' });
    }

    if (!canTransition(pickup.status, status)) {
      return res.status(400).json({ message: `Cannot change status from ${pickup.status} to ${status}` });
    }

    pickup.status = status;
    if (TIMESTAMP_FOR[status]) pickup[TIMESTAMP_FOR[status]] = new Date();

    if (status === 'completed') {
      pickup.paymentStatus = 'paid'; // cash on pickup, simulated
      await Operator.findByIdAndUpdate(pickup.operator, { $inc: { pickupsCompleted: 1 } });
    }

    await pickup.save();
    res.json(pickup);
  } catch (error) {
    next(error);
  }
};

// PATCH /:id/cancel — the resident cancels (only from requested/accepted/en_route,
// per TRANSITIONS).
exports.cancelPickup = async (req, res, next) => {
  try {
    const pickup = await PickupRequest.findById(req.params.id);
    if (!pickup) return res.status(404).json({ message: 'Pickup request not found' });

    if (!canTransition(pickup.status, 'cancelled')) {
      return res.status(400).json({ message: `Cannot cancel a request that is ${pickup.status}` });
    }

    pickup.status = 'cancelled';
    pickup.cancelledAt = new Date();
    pickup.cancelledBy = 'resident';
    await pickup.save();
    res.json(pickup);
  } catch (error) {
    next(error);
  }
};

// GET /assigned — the signed-in collector's own on-demand jobs (collector auth).
// protect + collectorOnly put the Collector on req.user.
exports.getAssignedPickups = async (req, res, next) => {
  try {
    const { status } = req.query;
    const filter = { collector: req.user._id };
    if (status) filter.status = status;
    else filter.status = { $in: ['accepted', 'en_route', 'picked_up', 'completed'] };

    const pickups = await PickupRequest.find(filter)
      .populate('operator', 'businessName phone')
      .sort({ createdAt: -1 });
    res.json(pickups);
  } catch (error) {
    next(error);
  }
};

// PATCH /:id/advance — the assigned collector moves a job forward in the field:
// accepted → en_route → picked_up → completed. Ownership: the pickup must be theirs.
// Same TRANSITIONS guard and completion side effects as the operator path.
exports.advancePickup = async (req, res, next) => {
  try {
    const { status } = req.body;
    if (!status || !PickupRequest.STATUSES.includes(status)) {
      return res.status(400).json({ message: 'A valid status is required' });
    }

    const pickup = await PickupRequest.findById(req.params.id);
    if (!pickup) return res.status(404).json({ message: 'Pickup request not found' });
    if (!pickup.collector || !pickup.collector.equals(req.user._id)) {
      return res.status(403).json({ message: 'This job is not assigned to you' });
    }
    // Collectors only move a job forward through the field states, never accept/decline/cancel.
    if (!['en_route', 'picked_up', 'completed'].includes(status)) {
      return res.status(400).json({ message: 'Collectors can only advance a job to en_route, picked_up or completed' });
    }
    if (!canTransition(pickup.status, status)) {
      return res.status(400).json({ message: `Cannot change status from ${pickup.status} to ${status}` });
    }

    pickup.status = status;
    if (TIMESTAMP_FOR[status]) pickup[TIMESTAMP_FOR[status]] = new Date();
    if (status === 'completed') {
      pickup.paymentStatus = 'paid'; // cash on pickup, simulated
      await Operator.findByIdAndUpdate(pickup.operator, { $inc: { pickupsCompleted: 1 } });
    }
    await pickup.save();
    res.json(pickup);
  } catch (error) {
    next(error);
  }
};

// POST /:id/rate — resident rates a completed request. The operator's running
// average rating and reviewCount are recomputed from the new star value.
exports.ratePickup = async (req, res, next) => {
  try {
    const { stars, comment, tags } = req.body;
    const value = Number(stars);
    if (!Number.isInteger(value) || value < 1 || value > 5) {
      return res.status(400).json({ message: 'Stars must be a whole number from 1 to 5' });
    }

    const pickup = await PickupRequest.findById(req.params.id);
    if (!pickup) return res.status(404).json({ message: 'Pickup request not found' });
    if (pickup.status !== 'completed') {
      return res.status(400).json({ message: 'Only a completed request can be rated' });
    }
    if (pickup.rating?.stars) {
      return res.status(400).json({ message: 'This request has already been rated' });
    }

    pickup.rating = { stars: value, comment: comment || '', tags: Array.isArray(tags) ? tags : [] };
    await pickup.save();

    // Running average: fold the new star value into the operator's existing aggregate.
    const operator = await Operator.findById(pickup.operator);
    if (operator) {
      const count = operator.reviewCount + 1;
      operator.rating = Math.round(((operator.rating * operator.reviewCount + value) / count) * 10) / 10;
      operator.reviewCount = count;
      await operator.save();
    }

    res.json(pickup);
  } catch (error) {
    next(error);
  }
};
