// users.js — Public user profile routes
const express = require('express');
const router = express.Router();
const usersController = require('../controllers/usersController');
const { requireAuth } = require('../middleware/auth');

// GET /api/v1/users/browse — Browse Users page (login required). Must stay above /:id.
router.get('/browse', requireAuth, usersController.browseUsers);

// GET /api/v1/users/:id — Public profile (no auth required)
router.get('/:id', usersController.getPublicProfile);

module.exports = router;

