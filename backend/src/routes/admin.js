const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');
const { requireAdmin } = require('../middleware/rbac');
const adminController = require('../controllers/adminController');
const activityController = require('../controllers/activityController');

// Every admin route requires a logged-in admin.
router.use(requireAuth, requireAdmin);

router.get('/analytics', adminController.getAnalytics);
router.get('/users', adminController.getAllUsers);
router.get('/admins', adminController.listAdmins);
router.patch('/users/:id', adminController.updateUserStatus);
router.get('/jobs', adminController.getAllJobs);
router.patch('/jobs/:id/takedown', adminController.takedownJob);
router.get('/activity', activityController.listAllActivity);

module.exports = router;
