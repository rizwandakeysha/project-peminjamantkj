const db = require('../config/database');

function normalizeText(value) {
  const str = String(value ?? '').trim();
  return str.length ? str : null;
}

function deriveBarangPrefixFromKodeJenis(kodeJenis) {
  const raw = String(kodeJenis ?? '').trim();
  const last = raw.split('-').pop() || raw;
  return String(last).toUpperCase();
}

async function generateNextKodeBarangForJenis(client, jenisId) {
  const jenisRes = await client.query(
    'SELECT kode_jenis_barang FROM jenis_barang WHERE id_jenis_barang = $1',
    [jenisId]
  );
  if (jenisRes.rows.length === 0) {
    const err = new Error('Jenis barang tidak ditemukan');
    err.statusCode = 400;
    throw err;
  }

  const prefix = deriveBarangPrefixFromKodeJenis(jenisRes.rows[0].kode_jenis_barang);
  if (!prefix) {
    const err = new Error('Kode jenis barang tidak valid');
    err.statusCode = 400;
    throw err;
  }

  // Fetch existing codes for this jenis with the same prefix
  const existingRes = await client.query(
    `SELECT kode_barang
     FROM barang
     WHERE id_jenis_barang = $1
       AND UPPER(kode_barang) LIKE $2`,
    [jenisId, `${prefix}-%`]
  );

  const usedNumbers = new Set();
  for (const row of existingRes.rows) {
    const kode = String(row.kode_barang || '').toUpperCase();
    if (!kode.startsWith(prefix)) continue;
    const parts = kode.split('-');
    const lastPart = parts[parts.length - 1];
    const num = parseInt(lastPart, 10);
    if (!Number.isNaN(num)) usedNumbers.add(num);
  }

  let nextNumber = 1;
  while (usedNumbers.has(nextNumber)) nextNumber += 1;
  return `${prefix}-${nextNumber}`;
}

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

    const normalizedNama = normalizeText(nama_barang);
    const normalizedKode = normalizeText(kode_barang);
    const normalizedJenisId = id_jenis_barang ?? null;

    if (!normalizedNama) {
      return res.status(400).json({
        success: false,
        message: 'Nama barang harus diisi',
      });
    }

    if (!normalizedKode && !normalizedJenisId) {
      return res.status(400).json({
        success: false,
        message: 'Pilih jenis barang terlebih dahulu (atau isi kode barang manual)',
      });
    }

    const normalizedNoSerial = normalizeText(no_serial_number);
    const normalizedDeskripsi = normalizeText(deskripsi_barang);
    const normalizedFoto = normalizeText(foto_barang);
    const normalizedStatus = normalizeText(status) || 'Tersedia';

    const client = await db.connect();
    try {
      await client.query('BEGIN');

      // Prevent collisions across concurrent inserts for the same jenis
      if (normalizedJenisId) {
        await client.query('SELECT pg_advisory_xact_lock($1)', [Number(normalizedJenisId)]);
      }

      let finalKodeBarang = normalizedKode ? String(normalizedKode).toUpperCase() : null;
      const autoGenerate = !finalKodeBarang;

      let insertResult = null;
      if (!autoGenerate) {
        insertResult = await client.query(
          `INSERT INTO barang (kode_barang, nama_barang, deskripsi_barang, foto_barang, no_serial_number, id_jenis_barang, status)
           VALUES ($1, $2, $3, $4, $5, $6, $7)
           RETURNING id_barang`,
          [
            finalKodeBarang,
            normalizedNama,
            normalizedDeskripsi,
            normalizedFoto,
            normalizedNoSerial,
            normalizedJenisId,
            normalizedStatus,
          ]
        );
      } else {
        // Retry a few times in case of unexpected unique collisions
        for (let attempt = 0; attempt < 10; attempt += 1) {
          finalKodeBarang = await generateNextKodeBarangForJenis(client, Number(normalizedJenisId));

          // Use a savepoint so we can retry without aborting the whole transaction
          await client.query('SAVEPOINT create_barang_sp');
          try {
            insertResult = await client.query(
              `INSERT INTO barang (kode_barang, nama_barang, deskripsi_barang, foto_barang, no_serial_number, id_jenis_barang, status)
               VALUES ($1, $2, $3, $4, $5, $6, $7)
               RETURNING id_barang`,
              [
                finalKodeBarang,
                normalizedNama,
                normalizedDeskripsi,
                normalizedFoto,
                normalizedNoSerial,
                normalizedJenisId,
                normalizedStatus,
              ]
            );
            await client.query('RELEASE SAVEPOINT create_barang_sp');
            break;
          } catch (e) {
            await client.query('ROLLBACK TO SAVEPOINT create_barang_sp');
            if (e && e.code === '23505') {
              continue;
            }
            throw e;
          }
        }

        if (!insertResult) {
          throw new Error('Gagal membuat kode barang unik, silakan coba lagi');
        }
      }

      const newId = insertResult.rows[0].id_barang;

      const newItemResult = await client.query(
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

      await client.query('COMMIT');

      return res.status(201).json({
        success: true,
        message: 'Barang created successfully',
        data: newItemResult.rows[0],
      });
    } catch (error) {
      try {
        await client.query('ROLLBACK');
      } catch (_) {
        // ignore rollback errors
      }
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error creating barang:', error);
    if (error.statusCode) {
      return res.status(error.statusCode).json({
        success: false,
        message: error.message,
      });
    }
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
