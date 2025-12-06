const express = require('express');
const router = express.Router();
const guruController = require('../controllers/guruController');

// GET all guru
router.get('/', guruController.getAllGuru);

// GET guru by NIP (must be before /:id route)
router.get('/nip/:nip', guruController.getGuruByNip);

// GET guru by ID
router.get('/:id', guruController.getGuruById);

// POST create new guru
router.post('/', guruController.createGuru);

// PUT update guru
router.put('/:id', guruController.updateGuru);

// DELETE guru
router.delete('/:id', guruController.deleteGuru);

module.exports = router;

