const db = require('../config/database');

// Get all siswa
exports.getAllSiswa = async (req, res) => {
  try {
    const result = await db.query(
      'SELECT id_siswa as id, nis, nama_siswa as name, created_at FROM siswa ORDER BY nama_siswa ASC'
    );
    res.json({
      success: true,
      data: result.rows,
    });
  } catch (error) {
    console.error('Error getting siswa:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching siswa',
      error: error.message,
    });
  }
};

// Get siswa by ID
exports.getSiswaById = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await db.query(
      'SELECT id_siswa as id, nis, nama_siswa as name, created_at FROM siswa WHERE id_siswa = $1',
      [id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Siswa not found',
      });
    }

    res.json({
      success: true,
      data: result.rows[0],
    });
  } catch (error) {
    console.error('Error getting siswa:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching siswa',
      error: error.message,
    });
  }
};

// Get siswa by NIS
exports.getSiswaByNis = async (req, res) => {
  try {
    const { nis } = req.params;
    const result = await db.query(
      'SELECT id_siswa as id, nis, nama_siswa as name, created_at FROM siswa WHERE nis = $1',
      [nis]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Siswa not found',
      });
    }

    res.json({
      success: true,
      data: result.rows[0],
    });
  } catch (error) {
    console.error('Error getting siswa:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching siswa',
      error: error.message,
    });
  }
};

// Create new siswa
exports.createSiswa = async (req, res) => {
  try {
    const { nis, nama_siswa } = req.body;

    if (!nis || !nama_siswa) {
      return res.status(400).json({
        success: false,
        message: 'NIS dan nama siswa harus diisi',
      });
    }

    const result = await db.query(
      'INSERT INTO siswa (nis, nama_siswa) VALUES ($1, $2) RETURNING id_siswa',
      [nis, nama_siswa]
    );

    const newId = result.rows[0].id_siswa;

    // Get the created siswa
    const newSiswaResult = await db.query(
      'SELECT id_siswa as id, nis, nama_siswa as name, created_at FROM siswa WHERE id_siswa = $1',
      [newId]
    );

    res.status(201).json({
      success: true,
      message: 'Siswa created successfully',
      data: newSiswaResult.rows[0],
    });
  } catch (error) {
    console.error('Error creating siswa:', error);
    if (error.code === '23505') { // PostgreSQL duplicate key error
      return res.status(400).json({
        success: false,
        message: 'NIS sudah digunakan',
      });
    }
    res.status(500).json({
      success: false,
      message: 'Error creating siswa',
      error: error.message,
    });
  }
};

// Update siswa
exports.updateSiswa = async (req, res) => {
  try {
    const { id } = req.params;
    const { nama_siswa, nis } = req.body;

    const result = await db.query(
      'UPDATE siswa SET nama_siswa = $1, nis = $2 WHERE id_siswa = $3',
      [nama_siswa, nis, id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({
        success: false,
        message: 'Siswa not found',
      });
    }

    res.json({
      success: true,
      message: 'Siswa updated successfully',
    });
  } catch (error) {
    console.error('Error updating siswa:', error);
    if (error.code === '23505') {
      return res.status(400).json({
        success: false,
        message: 'NIS sudah digunakan',
      });
    }
    res.status(500).json({
      success: false,
      message: 'Error updating siswa',
      error: error.message,
    });
  }
};

// Delete siswa
exports.deleteSiswa = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await db.query(
      'DELETE FROM siswa WHERE id_siswa = $1',
      [id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({
        success: false,
        message: 'Siswa not found',
      });
    }

    res.json({
      success: true,
      message: 'Siswa deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting siswa:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting siswa',
      error: error.message,
    });
  }
};

