const express = require('express');
const router = express.Router();
const proposalsController = require('../controllers/proposalsController');
const { requireAuth } = require('../middleware/auth');
const multer = require('multer');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
});

const uploadMiddleware = upload.fields([
  { name: 'files', maxCount: 3 },
  { name: 'attachment', maxCount: 1 },
]);

function proposalUpload(req, res, next) {
  uploadMiddleware(req, res, (err) => {
    if (err) {
      return res.status(400).json({ success: false, error: err.message || 'File upload failed' });
    }
    if (req.files && req.files.attachment && req.files.attachment[0]) {
      req.file = req.files.attachment[0];
    }
    if (req.files && req.files.files) {
      req.files = req.files.files;
    } else if (!Array.isArray(req.files)) {
      req.files = req.file ? [req.file] : [];
    }
    next();
  });
}

router.post('/', requireAuth, proposalUpload, proposalsController.createProposal);
router.get('/me', requireAuth, proposalsController.getMyProposals);
router.get('/:id/files/:fileId/download', requireAuth, proposalsController.getProposalFileUrl);
router.patch('/:id/accept', requireAuth, proposalsController.acceptProposal);
router.patch('/:id/reject', requireAuth, proposalsController.rejectProposal);
router.patch('/:id/withdraw', requireAuth, proposalsController.withdrawProposal);
router.patch('/:id/unwithdraw', requireAuth, proposalsController.unwithdrawProposal);

module.exports = router;