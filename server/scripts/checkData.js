#!/usr/bin/env node

/**
 * Quick data verification script
 */

const db = require('../config/database');

async function checkData() {
  try {
    console.log('🔍 Checking database data...\n');

    // Check jenis_barang
    console.log('📦 Jenis Barang:');
    const jenisResult = await db.query('SELECT * FROM jenis_barang LIMIT 5');
    console.log(`   Found ${jenisResult.rows.length} jenis barang:`);
    jenisResult.rows.forEach(row => {
      console.log(`   - ${row.kode_jenis_barang}: ${row.nama_jenis_barang}`);
    });

    // Check barang
    console.log('\n📦 Barang:');
    const barangResult = await db.query(
      `SELECT b.*, jb.kode_jenis_barang, jb.nama_jenis_barang 
       FROM barang b
       LEFT JOIN jenis_barang jb ON b.id_jenis_barang = jb.id_jenis_barang
       LIMIT 5`
    );
    console.log(`   Found ${barangResult.rows.length} barang:`);
    barangResult.rows.forEach(row => {
      console.log(`   - ${row.kode_barang}: ${row.nama_barang} (Status: ${row.status}, Jenis: ${row.kode_jenis_barang || 'N/A'})`);
    });

    // Check BRG-001 specifically
    console.log('\n🎯 Looking for BRG-001:');
    const brgResult = await db.query(
      `SELECT b.*, jb.kode_jenis_barang, jb.nama_jenis_barang 
       FROM barang b
       LEFT JOIN jenis_barang jb ON b.id_jenis_barang = jb.id_jenis_barang
       WHERE b.kode_barang = $1`,
      ['BRG-001']
    );

    if (brgResult.rows.length > 0) {
      const item = brgResult.rows[0];
      console.log(`   ✅ FOUND!`);
      console.log(`   - ID: ${item.id_barang}`);
      console.log(`   - Kode: ${item.kode_barang}`);
      console.log(`   - Nama: ${item.nama_barang}`);
      console.log(`   - Status: ${item.status}`);
      console.log(`   - Jenis: ${item.kode_jenis_barang} (${item.nama_jenis_barang})`);
      console.log(`   - Serial: ${item.no_serial_number}`);
      console.log(`   - Deskripsi: ${item.deskripsi_barang}`);
    } else {
      console.log(`   ❌ NOT FOUND`);
      console.log(`   Checking if table is empty...`);
      const countResult = await db.query('SELECT COUNT(*) as count FROM barang');
      console.log(`   Total barang in database: ${countResult.rows[0].count}`);
    }

    // Check guru
    console.log('\n👨‍🏫 Guru:');
    const guruResult = await db.query('SELECT * FROM guru LIMIT 3');
    console.log(`   Found ${guruResult.rows.length} guru:`);
    guruResult.rows.forEach(row => {
      console.log(`   - ${row.nama_guru} (NIP: ${row.nip})`);
    });

    // Check siswa
    console.log('\n👥 Siswa:');
    const siswaResult = await db.query('SELECT * FROM siswa LIMIT 3');
    console.log(`   Found ${siswaResult.rows.length} siswa:`);
    siswaResult.rows.forEach(row => {
      console.log(`   - ${row.nama_siswa} (NIS: ${row.nis}, Kelas: ${row.kelas})`);
    });

    console.log('\n✅ Data check complete!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('   Full error:', error);
    process.exit(1);
  }
}

checkData();
