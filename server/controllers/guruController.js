const db = require('../config/database');

// Get all guru
exports.getAllGuru = async (req, res) => {
  try {
    const result = await db.query(
      'SELECT id_guru as id, guru_nip as nip, nama_guru as name, created_at FROM guru ORDER BY nama_guru ASC'
    );
    res.json({
      success: true,
      data: result.rows,
    });
  } catch (error) {
    console.error('Error getting guru:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching guru',
      error: error.message,
    });
  }
};

// Get guru by ID
exports.getGuruById = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await db.query(
      'SELECT id_guru as id, guru_nip as nip, nama_guru as name, created_at FROM guru WHERE id_guru = $1',
      [id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Guru not found',
      });
    }

    res.json({
      success: true,
      data: result.rows[0],
    });
  } catch (error) {
    console.error('Error getting guru:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching guru',
      error: error.message,
    });
  }
};

// Get guru by NIP
exports.getGuruByNip = async (req, res) => {
  try {
    const { nip } = req.params;
    const result = await db.query(
      'SELECT id_guru as id, guru_nip as nip, nama_guru as name, created_at FROM guru WHERE guru_nip = $1',
      [nip]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Guru not found',
      });
    }

    res.json({
      success: true,
      data: result.rows[0],
    });
  } catch (error) {
    console.error('Error getting guru:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching guru',
      error: error.message,
    });
  }
};

// Create new guru
exports.createGuru = async (req, res) => {
  try {
    const { guru_nip, nama_guru } = req.body;

    if (!guru_nip || !nama_guru) {
      return res.status(400).json({
        success: false,
        message: 'NIP dan nama guru harus diisi',
      });
    }

    const result = await db.query(
      'INSERT INTO guru (guru_nip, nama_guru) VALUES ($1, $2) RETURNING id_guru',
      [guru_nip, nama_guru]
    );

    const newId = result.rows[0].id_guru;

    // Get the created guru
    const newGuruResult = await db.query(
      'SELECT id_guru as id, guru_nip as nip, nama_guru as name, created_at FROM guru WHERE id_guru = $1',
      [newId]
    );

    res.status(201).json({
      success: true,
      message: 'Guru created successfully',
      data: newGuruResult.rows[0],
    });
  } catch (error) {
    console.error('Error creating guru:', error);
    if (error.code === '23505') { // PostgreSQL duplicate key error
      return res.status(400).json({
        success: false,
        message: 'NIP sudah digunakan',
      });
    }
    res.status(500).json({
      success: false,
      message: 'Error creating guru',
      error: error.message,
    });
  }
};

// Update guru
exports.updateGuru = async (req, res) => {
  try {
    const { id } = req.params;
    const { nama_guru, guru_nip } = req.body;

    const result = await db.query(
      'UPDATE guru SET nama_guru = $1, guru_nip = $2 WHERE id_guru = $3',
      [nama_guru, guru_nip, id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({
        success: false,
        message: 'Guru not found',
      });
    }

    res.json({
      success: true,
      message: 'Guru updated successfully',
    });
  } catch (error) {
    console.error('Error updating guru:', error);
    if (error.code === '23505') {
      return res.status(400).json({
        success: false,
        message: 'NIP sudah digunakan',
      });
    }
    res.status(500).json({
      success: false,
      message: 'Error updating guru',
      error: error.message,
    });
  }
};

// Delete guru
exports.deleteGuru = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await db.query(
      'DELETE FROM guru WHERE id_guru = $1',
      [id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({
        success: false,
        message: 'Guru not found',
      });
    }

    res.json({
      success: true,
      message: 'Guru deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting guru:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting guru',
      error: error.message,
    });
  }
};

