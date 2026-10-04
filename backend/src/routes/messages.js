const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');
const { uploadChatFile } = require('../middleware/chatUpload');
const messagesController = require('../controllers/messagesController');

router.use(requireAuth);

router.get('/', messagesController.listConversations);
// Profile chats ("Message" on a profile); registered before /:id so "direct" isn't read as an id
router.get('/direct/:userId', messagesController.getProfileChat);
router.post('/direct', messagesController.startProfileChat);
router.get('/:id', messagesController.getConversation);
router.get('/:id/messages', messagesController.listMessages);
router.post('/:id/messages', uploadChatFile, messagesController.sendMessage);
router.get('/:id/messages/:messageId/download', messagesController.getAttachmentUrl);
router.post('/:id/delete-confirm', messagesController.confirmDelete);
router.post('/:id/delete-cancel', messagesController.cancelDeleteConfirm);

module.exports = router;
