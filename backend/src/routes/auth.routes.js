const express = require('express');
const router = express.Router();
const multer = require('multer');
const authController = require('../controllers/auth.controller');
const auth = require('../middlewares/auth.middleware');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB max for profile photos
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) cb(null, true);
    else cb(new Error('Only image files are allowed'), false);
  }
});

router.post('/register', authController.register);
router.post('/login', authController.login);
router.post('/logout', auth, authController.logout);
router.get('/profile', auth, authController.profile);
router.put('/update-profile', auth, upload.single('photo'), authController.updateProfile);
router.post('/verify-token', auth, authController.verifyToken);
router.put('/change-password', auth, authController.changePassword);

module.exports = router;
