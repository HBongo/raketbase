const express = require('express');
const router = express.Router();
const notificationsController = require('../controllers/notificationsController');
const { requireAuth } = require('../middleware/auth');

router.use(requireAuth);

router.get('/', notificationsController.listNotifications);
router.patch('/read-all', notificationsController.markAllRead);
router.patch('/:id/read', notificationsController.markRead);

module.exports = router;
