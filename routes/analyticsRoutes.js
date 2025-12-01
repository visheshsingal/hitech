const express = require('express');
const router = express.Router();
const {
  trackView,
  trackClick,
  trackFilter,
  getTopProperties,
  getTopLocations,
  getTopPrices,
  getTopBHK,
  getEngagement,
  getSummary
} = require('../controllers/analyticsController');
const { protect } = require('../middleware/authMiddleware');

// Public routes (tracking)
router.post('/view', trackView);
router.post('/click', trackClick);
router.post('/filter', trackFilter);

// Admin routes (analytics)
router.get('/top-properties', protect, getTopProperties);
router.get('/top-locations', protect, getTopLocations);
router.get('/top-prices', protect, getTopPrices);
router.get('/top-bhk', protect, getTopBHK);
router.get('/engagement', protect, getEngagement);
router.get('/summary', protect, getSummary);

module.exports = router;