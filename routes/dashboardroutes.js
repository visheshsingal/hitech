const express = require("express");
const router = express.Router();
const { getDashboardStats } = require("../controllers/dashboardController");
const { protect } = require("../middleware/authMiddleware");

// GET /api/dashboard/stats - Get comprehensive dashboard statistics
router.get("/stats", protect, getDashboardStats);

module.exports = router;
