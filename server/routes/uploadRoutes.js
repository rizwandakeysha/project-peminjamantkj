const express = require('express');
const router = express.Router();
const upload = require('../config/multer');
const supabaseUploadController = require('../controllers/supabaseUploadController');

// POST upload image ke Supabase Storage
router.post('/image', upload.single('image'), supabaseUploadController.uploadImage);

// DELETE image dari Supabase Storage
router.delete('/image/:filename', supabaseUploadController.deleteImage);

module.exports = router;
