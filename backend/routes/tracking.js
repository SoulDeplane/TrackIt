const express = require('express');
const router = express.Router();
const { 
  getRoutes, 
  getBusesByRoute, 
  getActiveBuses,
  getBusDetails,
  getRouteDetails 
} = require('../controllers/trackingController');
const { protect } = require('../middleware/auth');

router.use(protect);

router.get('/routes', getRoutes);
router.get('/buses/:routeId', getBusesByRoute);
router.get('/active-buses', getActiveBuses);
router.get('/bus/:busId', getBusDetails);
router.get('/route/:routeId', getRouteDetails);

module.exports = router;
