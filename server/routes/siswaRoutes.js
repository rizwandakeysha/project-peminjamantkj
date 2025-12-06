const express = require('express');
const router = express.Router();
const siswaController = require('../controllers/siswaController');

// GET all siswa
router.get('/', siswaController.getAllSiswa);

// GET siswa by NIS (must be before /:id route)
router.get('/nis/:nis', siswaController.getSiswaByNis);

// GET siswa by ID
router.get('/:id', siswaController.getSiswaById);

// POST create new siswa
router.post('/', siswaController.createSiswa);

// PUT update siswa
router.put('/:id', siswaController.updateSiswa);

// DELETE siswa
router.delete('/:id', siswaController.deleteSiswa);

module.exports = router;

