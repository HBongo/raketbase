const express = require('express');
const router = express.Router();
const activityController = require('../controllers/activityController');
const { requireAuth } = require('../middleware/auth');

router.use(requireAuth);

// Your own activity (Profile → Activity tab). The sitewide log is under /admin/activity.
router.get('/me', activityController.listMyActivity);

module.exports = router;
