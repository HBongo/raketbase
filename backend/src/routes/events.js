const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');
const { openStream } = require('../utils/live');

// One long-lived Server-Sent Events stream per browser tab (see utils/live.js)
router.get('/', requireAuth, openStream);

module.exports = router;
