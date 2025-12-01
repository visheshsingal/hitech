const express = require('express');
const router = express.Router();
const {
  createEnquiry,
  getAllEnquiries,
  updateEnquiryStatus,
  deleteEnquiry,
  getRecentEnquiries
} = require('../controllers/enquiryController');
const { protect } = require('../middleware/authMiddleware');

// Public routes
router.post('/', createEnquiry);

// Protected routes (Admin only)
router.get('/all', protect, getAllEnquiries);
router.get('/recent', protect, getRecentEnquiries);
router.put('/:id', protect, updateEnquiryStatus);
router.delete('/:id', protect, deleteEnquiry);

module.exports = router;