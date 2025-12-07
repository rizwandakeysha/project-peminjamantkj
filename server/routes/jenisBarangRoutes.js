const express = require('express');
const router = express.Router();
const jenisBarangController = require('../controllers/jenisBarangController');

// GET all jenis_barang
router.get('/', jenisBarangController.getAllJenisBarang);

// GET jenis_barang by kode (must be before /:id route)
router.get('/kode/:kode', jenisBarangController.getJenisBarangByKode);

// GET jenis_barang by ID
router.get('/:id', jenisBarangController.getJenisBarangById);

// POST create new jenis_barang
router.post('/', jenisBarangController.createJenisBarang);

// PUT update jenis_barang
router.put('/:id', jenisBarangController.updateJenisBarang);

// DELETE jenis_barang
router.delete('/:id', jenisBarangController.deleteJenisBarang);

module.exports = router;
