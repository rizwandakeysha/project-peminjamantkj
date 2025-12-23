const axios = require('axios');
const FormData = require('form-data');
const db = require('../config/database');

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;

// Upload image to Telegram and store file_id in database
exports.uploadPhotoToTelegram = async (req, res) => {
  try {
    const { id_barang } = req.body;
    const file = req.file;

    if (!file) {
      return res.status(400).json({
        success: false,
        message: 'File tidak ditemukan',
      });
    }

    if (!id_barang) {
      return res.status(400).json({
        success: false,
        message: 'id_barang tidak boleh kosong',
      });
    }

    // Create FormData for Telegram API
    const formData = new FormData();
    formData.append('chat_id', TELEGRAM_CHAT_ID);
    formData.append('photo', file.buffer, {
      filename: file.originalname,
      contentType: file.mimetype,
    });

    // Send to Telegram
    const telegramResponse = await axios.post(
      `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendPhoto`,
      formData,
      {
        headers: formData.getHeaders(),
      }
    );

    // Extract file_id from Telegram response
    // Telegram returns the highest resolution photo
    const photos = telegramResponse.data.result.photo;
    const fileId = photos[photos.length - 1].file_id; // Get the largest resolution

    // Update barang table with file_id
    const updateResult = await db.query(
      `UPDATE barang 
       SET foto_barang = $1 
       WHERE id_barang = $2
       RETURNING id_barang, foto_barang`,
      [fileId, id_barang]
    );

    if (updateResult.rowCount === 0) {
      return res.status(404).json({
        success: false,
        message: 'Barang tidak ditemukan',
      });
    }

    res.json({
      success: true,
      message: 'Foto berhasil diupload',
      data: {
        id_barang,
        foto_barang: fileId,
      },
    });
  } catch (error) {
    console.error('Error uploading to Telegram:', error);
    res.status(500).json({
      success: false,
      message: 'Error uploading foto',
      error: error.message,
    });
  }
};

// Upload credential photo to Telegram and return file_id (without updating DB)
exports.uploadCredentialToTelegram = async (req, res) => {
  try {
    const file = req.file;

    if (!file) {
      return res.status(400).json({
        success: false,
        message: 'File tidak ditemukan',
      });
    }

    // Create FormData for Telegram API
    const formData = new FormData();
    formData.append('chat_id', TELEGRAM_CHAT_ID);
    formData.append('photo', file.buffer, {
      filename: file.originalname,
      contentType: file.mimetype,
    });

    // Send to Telegram
    const telegramResponse = await axios.post(
      `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendPhoto`,
      formData,
      {
        headers: formData.getHeaders(),
      }
    );

    // Extract file_id from Telegram response
    const photos = telegramResponse.data.result.photo;
    const fileId = photos[photos.length - 1].file_id;

    res.json({
      success: true,
      message: 'Foto credential berhasil diupload',
      data: {
        foto_credential: fileId,
      },
    });
  } catch (error) {
    console.error('Error uploading credential to Telegram:', error);
    res.status(500).json({
      success: false,
      message: 'Error uploading foto credential',
      error: error.message,
    });
  }
};

// Get photo from Telegram using file_id (proxy for permanent access)
exports.getPhoto = async (req, res) => {
  try {
    const { fileId } = req.params;

    if (!fileId) {
      return res.status(400).json({
        success: false,
        message: 'fileId tidak boleh kosong',
      });
    }

    // Get file info from Telegram
    const fileInfoResponse = await axios.get(
      `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/getFile?file_id=${fileId}`
    );

    if (!fileInfoResponse.data.ok) {
      return res.status(404).json({
        success: false,
        message: 'Foto tidak ditemukan di Telegram',
      });
    }

    const filePath = fileInfoResponse.data.result.file_path;
    const fileUrl = `https://api.telegram.org/file/bot${TELEGRAM_BOT_TOKEN}/${filePath}`;

    // Redirect to Telegram file URL
    res.redirect(fileUrl);
  } catch (error) {
    console.error('Error getting photo from Telegram:', error);
    res.status(500).json({
      success: false,
      message: 'Error getting foto',
      error: error.message,
    });
  }
};
