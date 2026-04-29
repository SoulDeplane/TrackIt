const express = require('express');
const router = express.Router();
const { 
  bulkEntry, 
  getAllDrivers, 
  getAllBuses, 
  getAllRoutes,
  getStats 
} = require('../controllers/adminController');
const { protect, authorize } = require('../middleware/auth');

router.use(protect);
router.use(authorize('admin'));

router.post('/bulk-entry', bulkEntry);
router.get('/drivers', getAllDrivers);
router.get('/buses', getAllBuses);
router.get('/routes', getAllRoutes);
router.get('/stats', getStats);

module.exports = router;
