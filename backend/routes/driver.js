const express = require('express');
const router = express.Router();
const { 
  getMyBus, 
  startTrip, 
  stopTrip, 
  updateSeats,
  saveLocation 
} = require('../controllers/driverController');
const { protect, authorize } = require('../middleware/auth');

router.use(protect);
router.use(authorize('driver'));

router.get('/my-bus', getMyBus);
router.post('/start-trip', startTrip);
router.post('/stop-trip', stopTrip);
router.put('/update-seats', updateSeats);
router.post('/location', saveLocation);

module.exports = router;
