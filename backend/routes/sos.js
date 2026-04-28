const express = require('express');
const router = express.Router();
const { sendSOS } = require('../controllers/sosController');
const { protect, authorize } = require('../middleware/auth');

// Only students can trigger SOS
router.post('/', protect, authorize('student'), sendSOS);

module.exports = router;
