const express = require('express');
const router = express.Router();
const upload = require('../config/multer');
const uploadController = require('../controllers/uploadController');

// POST upload image
router.post('/image', upload.single('image'), uploadController.handleUpload);

module.exports = router;
