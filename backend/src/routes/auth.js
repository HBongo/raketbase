const express = require('express');
const {
  register,
  login,
  refreshSession,
  switchRole,
  getProfile,
  updateProfile,
  uploadAvatar,
  removeAvatar,
  logout,
  forgotPassword,
  resetPassword,
  changePassword,
  getActivityLogs,
} = require('../controllers/authController');
const { requireAuth } = require('../middleware/auth');
const { uploadAvatarImage } = require('../middleware/upload');
const { createRateLimiter } = require('../middleware/rateLimiter');

const loginLimiter = createRateLimiter({
  windowMs: 5 * 60 * 1000,
  max: 10,
  message: 'Too many login attempts. Please wait 5 minutes before trying again.',
});

const router = express.Router();

router.post('/register', register);
router.post('/login', loginLimiter, login);
router.post('/refresh', refreshSession);
router.post('/logout', logout);
router.post('/forgot-password', loginLimiter, forgotPassword);
router.post('/reset-password', resetPassword);
router.patch('/password', requireAuth, changePassword);
router.patch('/switch-role', requireAuth, switchRole);
router.get('/profile', requireAuth, getProfile);
router.get('/activity', requireAuth, getActivityLogs);
router.put('/profile', requireAuth, updateProfile);
// Profile photo: multipart form-data with a single "avatar" file field.
// requireAuth runs first so unauthenticated requests never get to stream a file.
router.post('/profile/avatar', requireAuth, uploadAvatarImage, uploadAvatar);
router.delete('/profile/avatar', requireAuth, removeAvatar);

module.exports = router;