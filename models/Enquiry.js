const mongoose = require('mongoose');

const enquirySchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please add your name'],
    trim: true,
    maxlength: [50, 'Name cannot be more than 50 characters']
  },
  email: {
    type: String,
    required: [true, 'Please add your email'],
    trim: true,
    lowercase: true,
    match: [
      /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
      'Please add a valid email'
    ]
  },
  phone: {
    type: String,
    required: [true, 'Please add your phone number'],
    match: [
      /^[0-9]{10}$/,
      'Please add a valid 10-digit phone number'
    ]
  },
  message: {
    type: String,
    required: [true, 'Please add a message'],
    maxlength: [1000, 'Message cannot be more than 1000 characters']
  },
  propertyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Property',
    default: null
  },
  // Admin-only notes visible to admins in the admin panel
  adminNotes: [
    {
      text: { type: String },
      admin: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin' },
      createdAt: { type: Date, default: Date.now }
    }
  ],
  status: {
    type: String,
    enum: ['pending', 'handled'],
    default: 'pending'
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Index for faster queries
enquirySchema.index({ status: 1, createdAt: -1 });
enquirySchema.index({ propertyId: 1 });

module.exports = mongoose.model('Enquiry', enquirySchema);