const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');

// GET all admins
router.get('/', adminController.getAllAdmins);

// POST create admin
router.post('/', adminController.register);

// POST login
router.post('/login', adminController.login);

// GET profile (protected route)
router.get('/profile', adminController.verifyToken, adminController.getProfile);

// PUT update admin
router.put('/:id', adminController.updateAdmin);

// DELETE admin
router.delete('/:id', adminController.deleteAdmin);

module.exports = router;