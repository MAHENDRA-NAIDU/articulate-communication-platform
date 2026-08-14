const express = require('express');
const router = express.Router();
const {
  getUserProfile,
  updateUserProfile,
  deleteUserAccount,
} = require('../controllers/userController');
const { protect } = require('../middleware/authMiddleware');
const { upload } = require('../middleware/uploadMiddleware');

router.get('/:identifier', getUserProfile);
router.put('/:id', protect, upload.single('avatar'), updateUserProfile);
router.delete('/:id', protect, deleteUserAccount);

module.exports = router;
