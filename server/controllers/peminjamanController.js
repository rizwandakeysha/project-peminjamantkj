const db = require('../config/database');
const { v4: uuidv4 } = require('uuid');

// Helper function to generate borrowing code
const generateBorrowingCode = () => {
  const year = new Date().getFullYear();
  const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  return `PMJ-${year}-${random}`;
};

// Get all peminjaman
exports.getAllPeminjaman = async (req, res) => {
  try {
    const { status } = req.query;
    
    let query = `
      SELECT p.id_peminjaman as id, p.kode_peminjaman, p.id_barang, p.nama_peminjam, p.kontak, 
             p.keperluan, p.guru_pendamping, p.jumlah, p.foto_credential, p.tanggal_pinjam, 
             p.tanggal_kembali, p.status, p.signature, p.created_at,
             b.nama_barang, b.kode_barang, b.foto_barang
      FROM peminjaman p
      LEFT JOIN barang b ON p.id_barang = b.id_barang
    `;
    
    const params = [];
    
    if (status && status !== 'all') {
      query += ' WHERE p.status = $1';
      params.push(status);
    }
    
    query += ' ORDER BY p.created_at DESC';
    
    const result = await db.query(query, params);
    
    res.json({
      success: true,
      data: result.rows,
    });
  } catch (error) {
    console.error('Error getting peminjaman:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching peminjaman',
      error: error.message,
    });
  }
};

// Get peminjaman by code
exports.getPeminjamanByCode = async (req, res) => {
  try {
    const { kode } = req.params;
    
    const result = await db.query(
      `SELECT p.id_peminjaman as id, p.kode_peminjaman, p.id_barang, p.nama_peminjam, p.kontak, 
              p.keperluan, p.guru_pendamping, p.jumlah, p.foto_credential, p.tanggal_pinjam, 
              p.tanggal_kembali, p.status, p.signature, p.created_at,
              b.nama_barang, b.kode_barang, b.foto_barang
       FROM peminjaman p
       LEFT JOIN barang b ON p.id_barang = b.id_barang
       WHERE p.kode_peminjaman = $1`,
      [kode]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Peminjaman not found',
      });
    }

    res.json({
      success: true,
      data: result.rows[0],
    });
  } catch (error) {
    console.error('Error getting peminjaman:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching peminjaman',
      error: error.message,
    });
  }
};

// Create new peminjaman
exports.createPeminjaman = async (req, res) => {
  const client = await db.connect();
  
  try {
    await client.query('BEGIN');

    const {
      id_barang,
      nama_peminjam,
      kontak,
      keperluan,
      guru_pendamping,
      jumlah,
      foto_credential,
    } = req.body;

    // Validate required fields
    if (!id_barang || !nama_peminjam || !keperluan || !jumlah) {
      await client.query('ROLLBACK');
      console.error('Missing required fields:', {
        id_barang, nama_peminjam, keperluan, jumlah
      });
      return res.status(400).json({
        success: false,
        message: 'Semua field wajib harus diisi (id_barang, nama_peminjam, keperluan, jumlah)',
      });
    }

    // Debug log
    console.log('Creating peminjaman with data:', {
      id_barang, nama_peminjam, kontak, keperluan, guru_pendamping, jumlah
    });

    // Check barang availability
    const barangResult = await client.query(
      'SELECT jumlah_stok, jumlah_dipinjam FROM barang WHERE id_barang = $1',
      [id_barang]
    );

    if (barangResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({
        success: false,
        message: 'Barang tidak ditemukan',
      });
    }

    const barang = barangResult.rows[0];
    const available = barang.jumlah_stok - barang.jumlah_dipinjam;

    if (available < jumlah) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        message: `Stok tidak mencukupi. Tersedia: ${available}`,
      });
    }

    // Generate unique borrowing code
    const kode_peminjaman = generateBorrowingCode();

    // Insert peminjaman
    // Convert empty strings to null for optional fields
    const guruPendampingValue = (guru_pendamping && guru_pendamping.trim()) ? guru_pendamping.trim() : null;
    const kontakValue = (kontak && kontak.trim()) ? kontak.trim() : null;
    
    const result = await client.query(
      `INSERT INTO peminjaman 
       (kode_peminjaman, id_barang, nama_peminjam, kontak, keperluan, guru_pendamping, jumlah, foto_credential) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id_peminjaman`,
      [kode_peminjaman, id_barang, nama_peminjam.trim(), kontakValue, keperluan.trim(), guruPendampingValue, jumlah, foto_credential || null]
    );

    const newId = result.rows[0].id_peminjaman;

    // Update barang jumlah_dipinjam
    await client.query(
      'UPDATE barang SET jumlah_dipinjam = jumlah_dipinjam + $1 WHERE id_barang = $2',
      [jumlah, id_barang]
    );

    await client.query('COMMIT');

    res.status(201).json({
      success: true,
      message: 'Peminjaman berhasil dibuat',
      data: {
        id_peminjaman: newId,
        kode_peminjaman,
        id_barang,
        nama_peminjam,
        jumlah,
      },
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error creating peminjaman:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating peminjaman',
      error: error.message,
    });
  } finally {
    client.release();
  }
};

// Return barang (update status to Dikembalikan)
exports.returnBarang = async (req, res) => {
  const client = await db.connect();
  
  try {
    await client.query('BEGIN');

    const { kode_peminjaman } = req.params;
    const { foto_verifikasi } = req.body;

    // Get peminjaman data
    const peminjamanResult = await client.query(
      'SELECT * FROM peminjaman WHERE kode_peminjaman = $1 AND status = $2',
      [kode_peminjaman, 'Dipinjam']
    );

    if (peminjamanResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({
        success: false,
        message: 'Peminjaman tidak ditemukan atau sudah dikembalikan',
      });
    }

    const peminjaman = peminjamanResult.rows[0];

    // Update peminjaman status
    await client.query(
      'UPDATE peminjaman SET status = $1, tanggal_kembali = NOW() WHERE kode_peminjaman = $2',
      ['Dikembalikan', kode_peminjaman]
    );

    // Update barang jumlah_dipinjam
    await client.query(
      'UPDATE barang SET jumlah_dipinjam = jumlah_dipinjam - $1 WHERE id_barang = $2',
      [peminjaman.jumlah, peminjaman.id_barang]
    );

    await client.query('COMMIT');

    res.json({
      success: true,
      message: 'Barang berhasil dikembalikan',
      data: {
        kode_peminjaman,
        tanggal_kembali: new Date(),
      },
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error returning barang:', error);
    res.status(500).json({
      success: false,
      message: 'Error returning barang',
      error: error.message,
    });
  } finally {
    client.release();
  }
};

// Update peminjaman
exports.updatePeminjaman = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const allowedUpdates = ['nama_peminjam', 'kontak', 'keperluan', 'guru_pendamping', 'status'];
    const updateFields = [];
    const updateValues = [];

    allowedUpdates.forEach((field, index) => {
      if (updates[field] !== undefined) {
        updateFields.push(`${field} = $${index + 1}`);
        updateValues.push(updates[field]);
      }
    });

    if (updateFields.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No valid fields to update',
      });
    }

    // Add id at the end
    updateValues.push(id);

    const result = await db.query(
      `UPDATE peminjaman SET ${updateFields.join(', ')} WHERE id_peminjaman = $${updateValues.length}`,
      updateValues
    );

    if (result.rowCount === 0) {
      return res.status(404).json({
        success: false,
        message: 'Peminjaman not found',
      });
    }

    res.json({
      success: true,
      message: 'Peminjaman updated successfully',
    });
  } catch (error) {
    console.error('Error updating peminjaman:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating peminjaman',
      error: error.message,
    });
  }
};

// Delete peminjaman
exports.deletePeminjaman = async (req, res) => {
  const client = await db.connect();
  
  try {
    await client.query('BEGIN');

    const { id } = req.params;

    // Get peminjaman data
    const peminjamanResult = await client.query(
      'SELECT * FROM peminjaman WHERE id_peminjaman = $1',
      [id]
    );

    if (peminjamanResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({
        success: false,
        message: 'Peminjaman not found',
      });
    }

    const peminjaman = peminjamanResult.rows[0];

    // If still borrowed, update barang count
    if (peminjaman.status === 'Dipinjam') {
      await client.query(
        'UPDATE barang SET jumlah_dipinjam = jumlah_dipinjam - $1 WHERE id_barang = $2',
        [peminjaman.jumlah, peminjaman.id_barang]
      );
    }

    // Delete peminjaman
    await client.query(
      'DELETE FROM peminjaman WHERE id_peminjaman = $1',
      [id]
    );

    await client.query('COMMIT');

    res.json({
      success: true,
      message: 'Peminjaman deleted successfully',
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error deleting peminjaman:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting peminjaman',
      error: error.message,
    });
  } finally {
    client.release();
  }
};

// Get statistics
exports.getStatistics = async (req, res) => {
  try {
    const totalBarang = await db.query('SELECT COUNT(*) as count FROM barang');
    const totalPeminjaman = await db.query('SELECT COUNT(*) as count FROM peminjaman');
    const activePeminjaman = await db.query('SELECT COUNT(*) as count FROM peminjaman WHERE status = $1', ['Dipinjam']);
    const completedPeminjaman = await db.query('SELECT COUNT(*) as count FROM peminjaman WHERE status = $1', ['Dikembalikan']);
    const totalStok = await db.query('SELECT SUM(jumlah_stok) as total, SUM(jumlah_dipinjam) as dipinjam FROM barang');

    res.json({
      success: true,
      data: {
        total_barang: parseInt(totalBarang.rows[0].count),
        total_peminjaman: parseInt(totalPeminjaman.rows[0].count),
        active_peminjaman: parseInt(activePeminjaman.rows[0].count),
        completed_peminjaman: parseInt(completedPeminjaman.rows[0].count),
        total_stok: parseInt(totalStok.rows[0].total) || 0,
        total_dipinjam: parseInt(totalStok.rows[0].dipinjam) || 0,
        total_tersedia: (parseInt(totalStok.rows[0].total) || 0) - (parseInt(totalStok.rows[0].dipinjam) || 0),
      },
    });
  } catch (error) {
    console.error('Error getting statistics:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching statistics',
      error: error.message,
    });
  }
};
