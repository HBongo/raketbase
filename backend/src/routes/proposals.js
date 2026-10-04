const express = require('express');
const router = express.Router();
const proposalsController = require('../controllers/proposalsController');
const { requireAuth } = require('../middleware/auth');
const multer = require('multer');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
});

router.post('/', requireAuth, upload.single('attachment'), proposalsController.createProposal);
router.get('/me', requireAuth, proposalsController.getMyProposals);
router.patch('/:id/accept', requireAuth, proposalsController.acceptProposal);
router.patch('/:id/reject', requireAuth, proposalsController.rejectProposal);
router.patch('/:id/withdraw', requireAuth, proposalsController.withdrawProposal);
router.patch('/:id/unwithdraw', requireAuth, proposalsController.unwithdrawProposal);

module.exports = router;