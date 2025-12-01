const express = require('express');
const router = express.Router();
const { signup, login, getProfile } = require('../controllers/userController');
const { protectUser } = require('../middleware/authMiddleware');

// Public routes
router.post('/signup', signup);
router.post('/login', login);

// Protected routes
router.get('/profile', protectUser, getProfile);

module.exports = router;