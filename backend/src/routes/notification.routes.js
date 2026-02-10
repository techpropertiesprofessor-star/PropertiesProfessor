const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notification.controller');
const auth = require('../middlewares/auth.middleware');

router.use(auth);

router.get('/', notificationController.getNotifications);
router.get('/unread/count', notificationController.getUnreadCount);
router.get('/counts-by-type', notificationController.getCountsByType);
router.put('/:id/read', notificationController.markAsRead);
router.put('/team-chat/mark-read', notificationController.markTeamChatAsRead);

module.exports = router;
