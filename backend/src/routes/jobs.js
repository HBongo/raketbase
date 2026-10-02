const express = require('express');
const router = express.Router();
const jobsController = require('../controllers/jobsController');
const proposalsController = require('../controllers/proposalsController');
const { requireAuth } = require('../middleware/auth');

router.get('/', jobsController.getAllJobs);
router.get('/categories', jobsController.getCategories);
router.get('/mine', requireAuth, jobsController.getMyJobs);
router.get('/:id/proposals', requireAuth, proposalsController.getProposalsForJob);
router.get('/:id', jobsController.getJobById);
router.post('/', requireAuth, jobsController.createJob);
router.patch('/:id', requireAuth, jobsController.updateJob);
router.patch('/:id/pause', requireAuth, jobsController.pauseJob);
router.patch('/:id/resume', requireAuth, jobsController.resumeJob);
router.patch('/:id/cancel', requireAuth, jobsController.cancelJob);

module.exports = router;