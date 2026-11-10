const express = require('express');
const router = express.Router();
const {
  createPickup,
  getMyPickups,
  getPickupById,
  getPickups,
  acceptPickup,
  updatePickupStatus,
  cancelPickup,
  ratePickup,
  getAssignedPickups,
  advancePickup,
} = require('../controllers/pickupController');
const { communityAuth } = require('../middleware/communityAuth');
const { operatorAuth } = require('../middleware/operatorAuth');
const { protect, collectorOnly } = require('../middleware/auth');

// Resident (device-token) actions
router.post('/', communityAuth, createPickup);
router.get('/mine', communityAuth, getMyPickups);

// Collector (JWT) — their own assigned on-demand jobs + advancing them in the field
router.get('/assigned', protect, collectorOnly, getAssignedPickups);

// Operator listing — scoped to the signed-in operator (scope taken from the token)
router.get('/', operatorAuth, getPickups);

// Single request (keep below /mine so it is not shadowed)
router.get('/:id', getPickupById);

// Operator job handling — operatorAuth + per-request ownership check in the controller
router.patch('/:id/accept', operatorAuth, acceptPickup);
router.patch('/:id/status', operatorAuth, updatePickupStatus);

// Collector advances their own assigned job in the field (en_route → picked_up → completed)
router.patch('/:id/advance', protect, collectorOnly, advancePickup);

// Resident actions on their own request
router.patch('/:id/cancel', communityAuth, cancelPickup);
router.post('/:id/rate', communityAuth, ratePickup);

module.exports = router;
