const express = require('express');
const router = express.Router();
const barangController = require('../controllers/barangController');

// GET all barang
router.get('/', barangController.getAllBarang);

// GET barang by kode (must be before /:id route)
router.get('/kode/:kode', barangController.getBarangByKode);

// GET barang by jenis code (must be before /:id route)
router.get('/jenis/:kode_jenis', barangController.getBarangByJenis);

// GET barang by ID
router.get('/:id', barangController.getBarangById);

// POST create new barang
router.post('/', barangController.createBarang);

// PUT update barang
router.put('/:id', barangController.updateBarang);

// DELETE barang
router.delete('/:id', barangController.deleteBarang);

module.exports = router;
