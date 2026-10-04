const express = require('express');
const router = express.Router();
const offersController = require('../controllers/directOffersController');
const { requireAuth } = require('../middleware/auth');
const { uploadOfferFiles } = require('../middleware/offerUpload');

router.use(requireAuth);

router.post('/', uploadOfferFiles, offersController.createOffer);
router.get('/received', offersController.listReceived);
router.get('/sent', offersController.listSent);
router.get('/:id/files/:fileId/download', offersController.getFileUrl);
router.patch('/:id/accept', offersController.acceptOffer);
router.patch('/:id/decline', offersController.declineOffer);
router.patch('/:id/withdraw', offersController.withdrawOffer);

module.exports = router;
