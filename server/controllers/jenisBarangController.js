const db = require('../config/database');

// Get all jenis_barang
exports.getAllJenisBarang = async(req, res) => {
    try {
        const result = await db.query(
            `SELECT 
        id_jenis_barang as id, 
        kode_jenis_barang as kode_jenis, 
        nama_jenis_barang as nama_jenis, 
        deskripsi_jenis_barang as deskripsi, 
        created_at 
      FROM jenis_barang 
      ORDER BY nama_jenis_barang ASC`
        );
        res.json({
            success: true,
            data: result.rows,
        });
    } catch (error) {
        console.error('Error getting jenis_barang:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching jenis_barang',
            error: error.message,
        });
    }
};

// Get jenis_barang by ID
exports.getJenisBarangById = async(req, res) => {
    try {
        const { id } = req.params;
        const result = await db.query(
            `SELECT 
        id_jenis_barang as id, 
        kode_jenis_barang as kode_jenis, 
        nama_jenis_barang as nama_jenis, 
        deskripsi_jenis_barang as deskripsi, 
        created_at 
      FROM jenis_barang 
      WHERE id_jenis_barang = $1`, [id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Jenis barang tidak ditemukan',
            });
        }

        res.json({
            success: true,
            data: result.rows[0],
        });
    } catch (error) {
        console.error('Error getting jenis_barang:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching jenis_barang',
            error: error.message,
        });
    }
};

// Get jenis_barang by kode
exports.getJenisBarangByKode = async(req, res) => {
    try {
        const { kode } = req.params;
        const result = await db.query(
            `SELECT 
        id_jenis_barang as id, 
        kode_jenis_barang as kode_jenis, 
        nama_jenis_barang as nama_jenis, 
        deskripsi_jenis_barang as deskripsi, 
        created_at 
      FROM jenis_barang 
      WHERE kode_jenis_barang = $1`, [kode]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Jenis barang tidak ditemukan',
            });
        }

        res.json({
            success: true,
            data: result.rows[0],
        });
    } catch (error) {
        console.error('Error getting jenis_barang:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching jenis_barang',
            error: error.message,
        });
    }
};

// Create new jenis_barang
exports.createJenisBarang = async(req, res) => {
    try {
        const { kode_jenis, nama_jenis, deskripsi } = req.body;

        if (!kode_jenis || !nama_jenis) {
            return res.status(400).json({
                success: false,
                message: 'Kode dan nama jenis barang harus diisi',
            });
        }

        const result = await db.query(
            `INSERT INTO jenis_barang (kode_jenis_barang, nama_jenis_barang, deskripsi_jenis_barang) 
       VALUES ($1, $2, $3) RETURNING id_jenis_barang`, [kode_jenis, nama_jenis, deskripsi || null]
        );

        const newId = result.rows[0].id_jenis_barang;

        // Get the created item
        const newItemResult = await db.query(
            `SELECT 
        id_jenis_barang as id, 
        kode_jenis_barang as kode_jenis, 
        nama_jenis_barang as nama_jenis, 
        deskripsi_jenis_barang as deskripsi, 
        created_at 
      FROM jenis_barang 
      WHERE id_jenis_barang = $1`, [newId]
        );

        res.status(201).json({
            success: true,
            message: 'Jenis barang berhasil dibuat',
            data: newItemResult.rows[0],
        });
    } catch (error) {
        console.error('Error creating jenis_barang:', error);
        if (error.code === '23505') { // PostgreSQL duplicate key error
            return res.status(400).json({
                success: false,
                message: 'Kode jenis barang sudah digunakan',
            });
        }
        res.status(500).json({
            success: false,
            message: 'Error creating jenis_barang',
            error: error.message,
        });
    }
};

// Update jenis_barang
exports.updateJenisBarang = async(req, res) => {
    try {
        const { id } = req.params;
        const { nama_jenis, deskripsi } = req.body;

        const result = await db.query(
            `UPDATE jenis_barang 
       SET nama_jenis_barang = $1, deskripsi_jenis_barang = $2 
       WHERE id_jenis_barang = $3`, [nama_jenis, deskripsi || null, id]
        );

        if (result.rowCount === 0) {
            return res.status(404).json({
                success: false,
                message: 'Jenis barang tidak ditemukan',
            });
        }

        res.json({
            success: true,
            message: 'Jenis barang berhasil diupdate',
        });
    } catch (error) {
        console.error('Error updating jenis_barang:', error);
        res.status(500).json({
            success: false,
            message: 'Error updating jenis_barang',
            error: error.message,
        });
    }
};

// Delete jenis_barang
exports.deleteJenisBarang = async(req, res) => {
    try {
        const { id } = req.params;

        // Delete related barang first (cascade delete)
        const deleteBarangResult = await db.query(
            'DELETE FROM barang WHERE id_jenis_barang = $1', [id]
        );

        // Then delete jenis barang
        const result = await db.query(
            'DELETE FROM jenis_barang WHERE id_jenis_barang = $1', [id]
        );

        if (result.rowCount === 0) {
            return res.status(404).json({
                success: false,
                message: 'Jenis barang tidak ditemukan',
            });
        }

        res.json({
            success: true,
            message: `Jenis barang berhasil dihapus (${deleteBarangResult.rowCount} barang terhapus)`,
        });
    } catch (error) {
        console.error('Error deleting jenis_barang:', error);
        res.status(500).json({
            success: false,
            message: 'Error deleting jenis_barang',
            error: error.message,
        });
    }
};