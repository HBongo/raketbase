const express = require('express');
const router = express.Router();
const proposalsController = require('../controllers/proposalsController');
const { requireAuth } = require('../middleware/auth');
// Same rules as direct-offer attachments: up to 3 files, 10 MB each, in a "files" field
const { uploadOfferFiles: uploadProposalFiles } = require('../middleware/offerUpload');

router.post('/', requireAuth, uploadProposalFiles, proposalsController.createProposal);
router.get('/me', requireAuth, proposalsController.getMyProposals);
router.get('/:id/files/:fileId/download', requireAuth, proposalsController.getProposalFileUrl);
router.patch('/:id/accept', requireAuth, proposalsController.acceptProposal);
router.patch('/:id/reject', requireAuth, proposalsController.rejectProposal);
router.patch('/:id/withdraw', requireAuth, proposalsController.withdrawProposal);
router.patch('/:id/unwithdraw', requireAuth, proposalsController.unwithdrawProposal);

module.exports = router;