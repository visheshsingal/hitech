const express = require("express");
const router = express.Router();
const { handleChatMessage } = require("../controllers/chatbotController");

// POST /api/chatbot/message - Handle chatbot messages
router.post("/message", handleChatMessage);

module.exports = router;
