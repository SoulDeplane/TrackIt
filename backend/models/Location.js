const mongoose = require('mongoose');

const locationSchema = new mongoose.Schema({
  busId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Bus',
    required: true
  },
  lat: {
    type: Number,
    required: true
  },
  lng: {
    type: Number,
    required: true
  },
  timestamp: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

locationSchema.index({ busId: 1, timestamp: -1 });

module.exports = mongoose.model('Location', locationSchema);
