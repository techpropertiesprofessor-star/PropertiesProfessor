const express = require('express');
const router = express.Router();
const chatController = require('../controllers/chat.controller');
const auth = require('../middlewares/auth.middleware');
const chatUpload = require('../middlewares/chatUpload.middleware');

// All chat routes require authentication
router.use(auth);

// Chat list and messages
router.get('/chats', chatController.getChatList);
router.get('/messages', chatController.getMessages);

// Send messages
router.post('/message', chatController.sendMessage);
router.post('/upload', chatUpload.single('file'), chatController.uploadAttachment);

// Message status
router.post('/message/delivered', chatController.markAsDelivered);
router.post('/message/seen', chatController.markAsSeen);
router.post('/chat/seen', chatController.markChatAsSeen);

// Debug endpoint
router.get('/debug-employees', chatController.debugEmployees);

module.exports = router;
