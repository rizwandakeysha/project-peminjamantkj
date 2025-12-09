const db = require('../config/database');

// Get all barang
exports.getAllBarang = async (req, res) => {
  try {
    const result = await db.query(
      `SELECT 
        b.id_barang as id,
        b.id_barang,
        b.kode_barang, 
        b.nama_barang, 
        b.foto_barang, 
        b.status,
        b.deskripsi_barang,
        b.no_serial_number,
        b.id_jenis_barang,
        jb.kode_jenis_barang as kode_jenis,
        jb.nama_jenis_barang as nama_jenis,
        b.created_at 
      FROM barang b
      LEFT JOIN jenis_barang jb ON b.id_jenis_barang = jb.id_jenis_barang
      ORDER BY b.created_at DESC`
    );
    
    res.json({
      success: true,
      data: result.rows,
    });
  } catch (error) {
    console.error('Error getting barang:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching barang',
      error: error.message,
    });
  }
};

// Get barang by ID
exports.getBarangById = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await db.query(
      `SELECT 
        b.id_barang as id,
        b.id_barang,
        b.kode_barang, 
        b.nama_barang, 
        b.foto_barang, 
        b.status,
        b.deskripsi_barang,
        b.no_serial_number,
        b.id_jenis_barang,
        jb.kode_jenis_barang as kode_jenis,
        jb.nama_jenis_barang as nama_jenis,
        b.created_at 
      FROM barang b
      LEFT JOIN jenis_barang jb ON b.id_jenis_barang = jb.id_jenis_barang
      WHERE b.id_barang = $1`,
      [id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Barang tidak ditemukan',
      });
    }

    res.json({
      success: true,
      data: result.rows[0],
    });
  } catch (error) {
    console.error('Error getting barang:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching barang',
      error: error.message,
    });
  }
};

// Get barang by kode
exports.getBarangByKode = async (req, res) => {
  try {
    const { kode } = req.params;
    const result = await db.query(
      `SELECT 
        b.id_barang as id, 
        b.kode_barang, 
        b.nama_barang, 
        b.foto_barang, 
        b.status,
        b.deskripsi_barang,
        b.no_serial_number,
        b.id_jenis_barang,
        jb.kode_jenis_barang as kode_jenis,
        jb.nama_jenis_barang as nama_jenis,
        b.created_at 
      FROM barang b
      LEFT JOIN jenis_barang jb ON b.id_jenis_barang = jb.id_jenis_barang
      WHERE b.kode_barang = $1`,
      [kode]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Barang tidak ditemukan',
      });
    }

    res.json({
      success: true,
      data: result.rows[0],
    });
  } catch (error) {
    console.error('Error getting barang:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching barang',
      error: error.message,
    });
  }
};

// Get barang by jenis code (kode_jenis)
exports.getBarangByJenis = async (req, res) => {
  try {
    const { kode_jenis } = req.params;
    const result = await db.query(
      `SELECT 
        b.id_barang as id, 
        b.kode_barang, 
        b.nama_barang, 
        b.foto_barang, 
        b.status,
        b.deskripsi_barang,
        b.no_serial_number,
        b.id_jenis_barang,
        jb.kode_jenis_barang as kode_jenis,
        jb.nama_jenis_barang as nama_jenis,
        b.created_at 
      FROM barang b
      LEFT JOIN jenis_barang jb ON b.id_jenis_barang = jb.id_jenis_barang
      WHERE jb.kode_jenis_barang = $1 
      ORDER BY b.nama_barang ASC`,
      [kode_jenis]
    );
    
    res.json({
      success: true,
      data: result.rows,
    });
  } catch (error) {
    console.error('Error getting barang by jenis:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching barang by jenis',
      error: error.message,
    });
  }
};

// Create new barang
exports.createBarang = async (req, res) => {
  try {
    const { kode_barang, nama_barang, deskripsi_barang, foto_barang, no_serial_number, id_jenis_barang, status } = req.body;

    if (!kode_barang || !nama_barang) {
      return res.status(400).json({
        success: false,
        message: 'Kode barang dan nama barang harus diisi',
      });
    }

    const result = await db.query(
      `INSERT INTO barang (kode_barang, nama_barang, deskripsi_barang, foto_barang, no_serial_number, id_jenis_barang, status) 
       VALUES ($1, $2, $3, $4, $5, $6, $7) 
       RETURNING id_barang`,
      [kode_barang, nama_barang, deskripsi_barang || null, foto_barang || null, no_serial_number || null, id_jenis_barang || null, status || 'Tersedia']
    );

    const newId = result.rows[0].id_barang;

    // Get the created item with all fields
    const newItemResult = await db.query(
      `SELECT 
        b.id_barang as id, 
        b.kode_barang, 
        b.nama_barang, 
        b.foto_barang, 
        b.status,
        b.deskripsi_barang,
        b.no_serial_number,
        b.id_jenis_barang,
        jb.kode_jenis_barang as kode_jenis,
        jb.nama_jenis_barang as nama_jenis,
        b.created_at 
      FROM barang b
      LEFT JOIN jenis_barang jb ON b.id_jenis_barang = jb.id_jenis_barang
      WHERE b.id_barang = $1`,
      [newId]
    );

    res.status(201).json({
      success: true,
      message: 'Barang created successfully',
      data: newItemResult.rows[0],
    });
  } catch (error) {
    console.error('Error creating barang:', error);
    if (error.code === '23505') { // PostgreSQL duplicate key error
      return res.status(400).json({
        success: false,
        message: 'Kode barang sudah digunakan',
      });
    }
    res.status(500).json({
      success: false,
      message: 'Error creating barang',
      error: error.message,
    });
  }
};

// Update barang
exports.updateBarang = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    // Build dynamic UPDATE query - only update fields that are provided
    const allowedFields = ['nama_barang', 'deskripsi_barang', 'foto_barang', 'no_serial_number', 'id_jenis_barang', 'status'];
    const fieldsToUpdate = allowedFields.filter(field => updates.hasOwnProperty(field));

    if (fieldsToUpdate.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No valid fields to update',
      });
    }

    // Build the SET clause dynamically
    const setClause = fieldsToUpdate.map((field, index) => `${field} = $${index + 1}`).join(', ');
    const values = fieldsToUpdate.map(field => updates[field]);
    values.push(id); // Add ID as the last parameter

    const result = await db.query(
      `UPDATE barang 
       SET ${setClause}
       WHERE id_barang = $${fieldsToUpdate.length + 1}`,
      values
    );

    if (result.rowCount === 0) {
      return res.status(404).json({
        success: false,
        message: 'Barang tidak ditemukan',
      });
    }

    // Get updated item
    const updatedResult = await db.query(
      `SELECT 
        b.id_barang as id, 
        b.kode_barang, 
        b.nama_barang, 
        b.foto_barang, 
        b.status,
        b.deskripsi_barang,
        b.no_serial_number,
        b.id_jenis_barang,
        jb.kode_jenis_barang as kode_jenis,
        jb.nama_jenis_barang as nama_jenis,
        b.created_at 
      FROM barang b
      LEFT JOIN jenis_barang jb ON b.id_jenis_barang = jb.id_jenis_barang
      WHERE b.id_barang = $1`,
      [id]
    );

    res.json({
      success: true,
      message: 'Barang updated successfully',
      data: updatedResult.rows[0],
    });
  } catch (error) {
    console.error('Error updating barang:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating barang',
      error: error.message,
    });
  }
};

// Delete barang
exports.deleteBarang = async (req, res) => {
  try {
    const { id } = req.params;

    // Check if barang has active borrows in detail_peminjaman
    const borrowResult = await db.query(
      `SELECT * FROM detail_peminjaman 
       WHERE id_barang = $1 AND status IN ('Dipinjam', 'Sebagian Dikembalikan')`,
      [id]
    );

    if (borrowResult.rows.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Tidak dapat menghapus barang yang sedang dipinjam',
      });
    }

    const result = await db.query(
      'DELETE FROM barang WHERE id_barang = $1',
      [id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({
        success: false,
        message: 'Barang tidak ditemukan',
      });
    }

    res.json({
      success: true,
      message: 'Barang deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting barang:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting barang',
      error: error.message,
    });
  }
};
