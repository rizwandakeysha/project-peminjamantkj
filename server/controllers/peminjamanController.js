const db = require('../config/database');
const { v4: uuidv4 } = require('uuid');

// Helper function to generate borrowing code
const generateBorrowingCode = () => {
  const year = new Date().getFullYear();
  const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  return `PMJ-${year}-${random}`;
};

// Get all peminjaman with detail
exports.getAllPeminjaman = async (req, res) => {
  try {
    const { status_transaksi } = req.query;
    
    let query = `
      SELECT p.id_peminjaman, p.kode_peminjaman, p.nama_peminjam, p.kontak, 
             p.keperluan, p.guru_pendamping, p.foto_credential, p.tanggal_pinjam, 
             p.signature, p.status_transaksi, p.created_at,
             json_agg(
               json_build_object(
                 'id_detail_peminjaman', dp.id_detail_peminjaman,
                 'id_barang', dp.id_barang,
                 'nama_barang', b.nama_barang,
                 'kode_barang', b.kode_barang,
                 'foto_barang', b.foto_barang,
                 'status', dp.status,
                 'tanggal_kembali', dp.tanggal_kembali,
                 'foto_bukti_kembali', dp.foto_bukti_kembali
               )
             ) as detail_peminjaman
      FROM peminjaman p
      LEFT JOIN detail_peminjaman dp ON p.id_peminjaman = dp.id_peminjaman
      LEFT JOIN barang b ON dp.id_barang = b.id_barang
    `;
    
    const params = [];
    
    if (status_transaksi && status_transaksi !== 'all') {
      query += ' WHERE p.status_transaksi = $1';
      params.push(status_transaksi);
    }
    
    query += ' GROUP BY p.id_peminjaman ORDER BY p.created_at DESC';
    
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

// Get peminjaman by code with detail
exports.getPeminjamanByCode = async (req, res) => {
  try {
    const { kode } = req.params;
    
    const result = await db.query(
      `SELECT p.id_peminjaman, p.kode_peminjaman, p.nama_peminjam, p.kontak, 
              p.keperluan, p.guru_pendamping, p.foto_credential, p.tanggal_pinjam, 
              p.signature, p.status_transaksi, p.created_at,
              json_agg(
                json_build_object(
                  'id_detail_peminjaman', dp.id_detail_peminjaman,
                  'id_barang', dp.id_barang,
                  'nama_barang', b.nama_barang,
                  'kode_barang', b.kode_barang,
                  'foto_barang', b.foto_barang,
                  'status', dp.status,
                  'tanggal_kembali', dp.tanggal_kembali,
                  'foto_bukti_kembali', dp.foto_bukti_kembali
                )
              ) as detail_peminjaman
       FROM peminjaman p
       LEFT JOIN detail_peminjaman dp ON p.id_peminjaman = dp.id_peminjaman
       LEFT JOIN barang b ON dp.id_barang = b.id_barang
       WHERE p.kode_peminjaman = $1
       GROUP BY p.id_peminjaman`,
      [kode]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Peminjaman tidak ditemukan',
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

// Create new peminjaman with multiple items (detail_peminjaman)
exports.createPeminjaman = async (req, res) => {
  const client = await db.connect();
  
  try {
    await client.query('BEGIN');

    const {
      nama_peminjam,
      kontak,
      keperluan,
      guru_pendamping,
      foto_credential,
      signature,
      items, // Array of { id_barang } for multiple items or single item borrowing
    } = req.body;

    // Validate required fields
    if (!nama_peminjam || !keperluan || !items || items.length === 0) {
      await client.query('ROLLBACK');
      console.error('Missing required fields:', {
        nama_peminjam, keperluan, items
      });
      return res.status(400).json({
        success: false,
        message: 'Semua field wajib harus diisi (nama_peminjam, keperluan, items array)',
      });
    }

    // Debug log
    console.log('Creating peminjaman with data:', {
      nama_peminjam, kontak, keperluan, guru_pendamping, items
    });

    // Validate all items exist and are available
    for (const item of items) {
      const barangResult = await client.query(
        `SELECT id_barang, kode_barang, nama_barang, status FROM barang WHERE id_barang = $1`,
        [item.id_barang]
      );

      if (barangResult.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({
          success: false,
          message: `Barang dengan ID ${item.id_barang} tidak ditemukan`,
        });
      }

      const barang = barangResult.rows[0];
      
      // Check if barang is available (status should be 'Tersedia')
      if (barang.status !== 'Tersedia') {
        await client.query('ROLLBACK');
        return res.status(400).json({
          success: false,
          message: `Barang "${barang.nama_barang}" tidak tersedia (Status: ${barang.status})`,
        });
      }
    }

    // Generate unique borrowing code
    const kode_peminjaman = generateBorrowingCode();

    // Insert peminjaman header
    // Handle empty/null values - convert to meaningful defaults for NOT NULL columns
    const guruPendampingValue = (guru_pendamping && guru_pendamping.trim()) 
      ? guru_pendamping.trim() 
      : "-"; // Default value for NOT NULL constraint
    const kontakValue = (kontak && kontak.trim()) ? kontak.trim() : null;
    
    const peminjamanResult = await client.query(
      `INSERT INTO peminjaman 
       (kode_peminjaman, nama_peminjam, kontak, keperluan, guru_pendamping, foto_credential, signature, status_transaksi) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id_peminjaman`,
      [kode_peminjaman, nama_peminjam.trim(), kontakValue, keperluan.trim(), guruPendampingValue, foto_credential || null, signature || null, 'Dipinjam']
    );

    const id_peminjaman = peminjamanResult.rows[0].id_peminjaman;

    // Create detail_peminjaman records for each item and update barang status
    const detailRecords = [];
    for (const item of items) {
      // Insert detail_peminjaman
      const detailResult = await client.query(
        `INSERT INTO detail_peminjaman 
         (id_peminjaman, id_barang, status) 
         VALUES ($1, $2, $3) RETURNING id_detail_peminjaman`,
        [id_peminjaman, item.id_barang, 'Dipinjam']
      );

      // Update barang status to 'Dipinjam'
      await client.query(
        'UPDATE barang SET status = $1 WHERE id_barang = $2',
        ['Dipinjam', item.id_barang]
      );

      detailRecords.push({
        id_detail_peminjaman: detailResult.rows[0].id_detail_peminjaman,
        id_barang: item.id_barang,
      });
    }

    await client.query('COMMIT');

    res.status(201).json({
      success: true,
      message: 'Peminjaman berhasil dibuat',
      data: {
        id_peminjaman,
        kode_peminjaman,
        nama_peminjam,
        items_count: items.length,
        detail_records: detailRecords,
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

// Return barang (update detail_peminjaman status and barang status)
exports.returnBarang = async (req, res) => {
  const client = await db.connect();
  
  try {
    await client.query('BEGIN');

    const { kode_peminjaman } = req.params;
    const { id_detail_peminjaman, foto_bukti_kembali } = req.body;

    // Get peminjaman data
    const peminjamanResult = await client.query(
      'SELECT id_peminjaman FROM peminjaman WHERE kode_peminjaman = $1',
      [kode_peminjaman]
    );

    if (peminjamanResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({
        success: false,
        message: 'Peminjaman tidak ditemukan',
      });
    }

    const id_peminjaman = peminjamanResult.rows[0].id_peminjaman;

    // Get detail_peminjaman
    const detailResult = await client.query(
      'SELECT id_barang FROM detail_peminjaman WHERE id_detail_peminjaman = $1 AND id_peminjaman = $2',
      [id_detail_peminjaman, id_peminjaman]
    );

    if (detailResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({
        success: false,
        message: 'Detail peminjaman tidak ditemukan',
      });
    }

    const id_barang = detailResult.rows[0].id_barang;

    // Update detail_peminjaman status
    await client.query(
      'UPDATE detail_peminjaman SET status = $1, tanggal_kembali = NOW(), foto_bukti_kembali = $2 WHERE id_detail_peminjaman = $3',
      ['Dikembalikan', foto_bukti_kembali || null, id_detail_peminjaman]
    );

    // Update barang status back to 'Tersedia'
    await client.query(
      'UPDATE barang SET status = $1 WHERE id_barang = $2',
      ['Tersedia', id_barang]
    );

    // Check if all items from this peminjaman are returned
    const unreturned = await client.query(
      'SELECT COUNT(*) as count FROM detail_peminjaman WHERE id_peminjaman = $1 AND status != $2',
      [id_peminjaman, 'Dikembalikan']
    );

    const unreturnedCount = parseInt(unreturned.rows[0].count);
    let newTransactionStatus = 'Selesai';
    
    if (unreturnedCount > 0) {
      newTransactionStatus = 'Sebagian Dikembalikan';
    }

    // Update peminjaman status
    await client.query(
      'UPDATE peminjaman SET status_transaksi = $1 WHERE id_peminjaman = $2',
      [newTransactionStatus, id_peminjaman]
    );

    await client.query('COMMIT');

    res.json({
      success: true,
      message: 'Barang berhasil dikembalikan',
      data: {
        kode_peminjaman,
        tanggal_kembali: new Date(),
        status_transaksi: newTransactionStatus,
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

// Delete peminjaman and all detail_peminjaman
exports.deletePeminjaman = async (req, res) => {
  const client = await db.connect();
  
  try {
    await client.query('BEGIN');

    const { id } = req.params;

    // Get peminjaman data with all details
    const peminjamanResult = await client.query(
      `SELECT p.*, 
              json_agg(dp.id_barang) as id_barang_list
       FROM peminjaman p
       LEFT JOIN detail_peminjaman dp ON p.id_peminjaman = dp.id_peminjaman
       WHERE p.id_peminjaman = $1
       GROUP BY p.id_peminjaman`,
      [id]
    );

    if (peminjamanResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({
        success: false,
        message: 'Peminjaman tidak ditemukan',
      });
    }

    const peminjaman = peminjamanResult.rows[0];

    // If still borrowed, update barang status back to Tersedia
    if (peminjaman.status_transaksi === 'Dipinjam' && peminjaman.id_barang_list) {
      for (const id_barang of peminjaman.id_barang_list) {
        if (id_barang) {
          await client.query(
            'UPDATE barang SET status = $1 WHERE id_barang = $2',
            ['Tersedia', id_barang]
          );
        }
      }
    }

    // Delete detail_peminjaman first (foreign key constraint)
    await client.query(
      'DELETE FROM detail_peminjaman WHERE id_peminjaman = $1',
      [id]
    );

    // Delete peminjaman
    await client.query(
      'DELETE FROM peminjaman WHERE id_peminjaman = $1',
      [id]
    );

    await client.query('COMMIT');

    res.json({
      success: true,
      message: 'Peminjaman berhasil dihapus',
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
