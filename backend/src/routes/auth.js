const express = require('express');
const {
  register,
  login,
  switchRole,
  getProfile,
  updateProfile,
  uploadAvatar,
  removeAvatar,
  logout,
} = require('../controllers/authController');
const { requireAuth } = require('../middleware/auth');
const { uploadAvatarImage } = require('../middleware/upload');

const router = express.Router();

router.post('/register', register);
router.post('/login', login);
router.post('/logout', logout);
router.patch('/switch-role', requireAuth, switchRole);
router.get('/profile', requireAuth, getProfile);
router.put('/profile', requireAuth, updateProfile);
// Profile photo: multipart form-data with a single "avatar" file field.
// requireAuth runs first so unauthenticated requests never get to stream a file.
router.post('/profile/avatar', requireAuth, uploadAvatarImage, uploadAvatar);
router.delete('/profile/avatar', requireAuth, removeAvatar);

module.exports = router;