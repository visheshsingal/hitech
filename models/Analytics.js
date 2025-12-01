const mongoose = require('mongoose');

const analyticsSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  propertyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Property',
    required: true,
    index: true
  },
  eventType: {
    type: String,
    enum: ['view', 'click', 'filter'],
    required: true,
    index: true
  },
  city: {
    type: String,
    trim: true,
    index: true
  },
  price: {
    type: Number
  },
  bhk: {
    type: Number
  },
  sessionId: {
    type: String,
    index: true
  },
  ipAddress: {
    type: String
  },
  userAgent: {
    type: String
  },
  timestamp: {
    type: Date,
    default: Date.now,
    index: true
  }
}, {
  timestamps: true
});

// Compound indexes for efficient queries
analyticsSchema.index({ eventType: 1, timestamp: -1 });
analyticsSchema.index({ propertyId: 1, eventType: 1 });
analyticsSchema.index({ city: 1, eventType: 1 });

module.exports = mongoose.model('Analytics', analyticsSchema);