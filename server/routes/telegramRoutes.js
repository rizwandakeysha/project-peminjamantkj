const express = require('express');
const multer = require('multer');
const telegramController = require('../controllers/telegramController');

const router = express.Router();

// Configure multer for memory storage (no disk writes for Render compatibility)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    // Only allow image files
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('File harus berupa gambar'));
    }
  },
});

// POST /api/telegram/upload - Upload image to Telegram and store file_id
router.post('/upload', upload.single('photo'), telegramController.uploadPhotoToTelegram);

// POST /api/telegram/upload-credential - Upload credential photo to Telegram
router.post('/upload-credential', upload.single('photo'), telegramController.uploadCredentialToTelegram);

// GET /api/telegram/photo/:fileId - Get photo from Telegram (proxy)
router.get('/photo/:fileId', telegramController.getPhoto);

module.exports = router;
