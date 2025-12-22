# Setup Database PostgreSQL Supabase

## Langkah 1: Login ke Supabase Console
1. Buka https://supabase.com
2. Login dengan akun Anda
3. Pilih project TKJ

## Langkah 2: Buka SQL Editor
1. Klik tab "SQL Editor" di sidebar kiri
2. Klik "+ New Query"

## Langkah 3: Jalankan Schema Terbaru

Salin dan jalankan SQL di bawah ini:

```sql
-- ============================================
-- DROP tables lama jika ada (HATI-HATI!)
-- ============================================
DROP TABLE IF EXISTS detail_peminjaman CASCADE;
DROP TABLE IF EXISTS peminjaman CASCADE;
DROP TABLE IF EXISTS barang CASCADE;
DROP TABLE IF EXISTS jenis_barang CASCADE;
DROP TABLE IF EXISTS siswa CASCADE;
DROP TABLE IF EXISTS guru CASCADE;
DROP TABLE IF EXISTS admin CASCADE;

-- ============================================
-- Tabel: jenis_barang (BARU)
-- ============================================
CREATE TABLE jenis_barang (
  id_jenis_barang SERIAL PRIMARY KEY,
  kode_jenis_barang VARCHAR(20) UNIQUE NOT NULL,
  nama_jenis_barang VARCHAR(100) NOT NULL,
  deskripsi_jenis_barang TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- Tabel: barang (UPDATED)
-- ============================================
CREATE TABLE barang (
  id_barang SERIAL PRIMARY KEY,
  kode_barang VARCHAR(20) UNIQUE NOT NULL,
  nama_barang VARCHAR(100) NOT NULL,
  foto_barang VARCHAR(255),
  status VARCHAR(20) DEFAULT 'Tersedia' CHECK (status IN ('Tersedia', 'Dipinjam', 'Rusak', 'Hilang')),
  no_serial_number VARCHAR(50),
  deskripsi_barang TEXT,
  id_jenis_barang INTEGER REFERENCES jenis_barang(id_jenis_barang),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_kode_barang ON barang(kode_barang);
CREATE INDEX idx_status ON barang(status);
CREATE INDEX idx_id_jenis_barang ON barang(id_jenis_barang);

-- ============================================
-- Tabel: guru
-- ============================================
CREATE TABLE guru (
  id SERIAL PRIMARY KEY,
  nama_guru VARCHAR(100) NOT NULL,
  nip VARCHAR(20) UNIQUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- Tabel: siswa
-- ============================================
CREATE TABLE siswa (
  id_siswa SERIAL PRIMARY KEY,
  nama_siswa VARCHAR(100) NOT NULL,
  nis VARCHAR(20) UNIQUE,
  kelas VARCHAR(10),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- Tabel: peminjaman (UPDATED)
-- ============================================
CREATE TABLE peminjaman (
  id_peminjaman SERIAL PRIMARY KEY,
  kode_peminjaman VARCHAR(30) UNIQUE NOT NULL,
  nama_peminjam VARCHAR(100) NOT NULL,
  kontak VARCHAR(20),
  keperluan TEXT NOT NULL,
  guru_pendamping VARCHAR(100),
  tanggal_pinjam TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  foto_credential TEXT,
  signature TEXT,
  status_transaksi VARCHAR(30) DEFAULT 'Dipinjam' CHECK (status_transaksi IN ('Dipinjam', 'Sebagian Dikembalikan', 'Selesai')),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_kode_peminjaman ON peminjaman(kode_peminjaman);
CREATE INDEX idx_status_transaksi ON peminjaman(status_transaksi);
CREATE INDEX idx_tanggal_pinjam ON peminjaman(tanggal_pinjam);

-- ============================================
-- Tabel: detail_peminjaman (BARU)
-- ============================================
CREATE TABLE detail_peminjaman (
  id_detail_peminjaman SERIAL PRIMARY KEY,
  id_peminjaman INTEGER NOT NULL REFERENCES peminjaman(id_peminjaman) ON DELETE CASCADE,
  id_barang INTEGER REFERENCES barang(id_barang) ON DELETE SET NULL,
  kode_barang VARCHAR(50),
  nama_barang VARCHAR(255),
  tanggal_kembali TIMESTAMP,
  foto_bukti_kembali TEXT,
  status VARCHAR(20) DEFAULT 'Dipinjam' CHECK (status IN ('Dipinjam', 'Dikembalikan', 'Rusak', 'Hilang')),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_id_peminjaman ON detail_peminjaman(id_peminjaman);
CREATE INDEX idx_id_barang ON detail_peminjaman(id_barang);
CREATE INDEX idx_status_detail ON detail_peminjaman(status);

-- ============================================
-- Tabel: admin
-- ============================================
CREATE TABLE admin (
  id_admin SERIAL PRIMARY KEY,
  username VARCHAR(50) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  nama_lengkap VARCHAR(100) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_username ON admin(username);

-- ============================================
-- Sample Data: jenis_barang
-- ============================================
INSERT INTO jenis_barang (kode_jenis_barang, nama_jenis_barang, deskripsi_jenis_barang) VALUES
('JNS-001', 'Alat Jaringan', 'Peralatan untuk setup dan testing jaringan'),
('JNS-002', 'Tools Manual', 'Peralatan tangan untuk maintenance'),
('JNS-003', 'Elektronik', 'Perangkat elektronik dan pengukuran'),
('JNS-004', 'Hardware', 'Komponen hardware komputer')
ON CONFLICT (kode_jenis_barang) DO NOTHING;

-- ============================================
-- Sample Data: barang
-- ============================================
INSERT INTO barang (kode_barang, nama_barang, status, no_serial_number, deskripsi_barang, id_jenis_barang) VALUES
('BRG-001', 'Tang Crimping RJ45', 'Tersedia', 'SN-001', 'Untuk crimping kabel UTP', 1),
('BRG-002', 'Kabel Tester', 'Tersedia', 'SN-002', 'Untuk testing koneksi kabel', 1),
('BRG-003', 'Obeng Set', 'Tersedia', 'SN-003', 'Set obeng lengkap dengan berbagai ukuran', 2),
('BRG-004', 'LAN Tester', 'Tersedia', 'SN-004', 'Untuk testing koneksi jaringan LAN', 1),
('BRG-005', 'Kabel UTP Cat6 (Roll)', 'Tersedia', 'SN-005', 'Kabel UTP Category 6 per roll', 1),
('BRG-006', 'RJ45 Connector (Box)', 'Tersedia', 'SN-006', 'Konektor RJ45 untuk kabel UTP', 1),
('BRG-007', 'Cable Stripper', 'Tersedia', 'SN-007', 'Untuk mengupas kabel UTP', 2),
('BRG-008', 'Multimeter Digital', 'Tersedia', 'SN-008', 'Untuk mengukur tegangan dan arus', 3),
('BRG-009', 'Switch 8 Port', 'Tersedia', 'SN-009', 'Switch jaringan 8 port', 1),
('BRG-010', 'Toolkit Komputer', 'Tersedia', 'SN-010', 'Set alat lengkap untuk maintenance PC', 2)
ON CONFLICT (kode_barang) DO NOTHING;

-- ============================================
-- Sample Data: guru
-- ============================================
INSERT INTO guru (nama_guru, nip) VALUES
('Ibu Siti Nurhaliza', '123456789001'),
('Pak Ahmad Sugiono', '123456789002'),
('Ibu Dewi Lestari', '123456789003'),
('Pak Budi Santoso', '123456789004')
ON CONFLICT (nip) DO NOTHING;

-- ============================================
-- Sample Data: siswa
-- ============================================
INSERT INTO siswa (nama_siswa, nis, kelas) VALUES
('Andi Pratama', '0001', 'XII TKJ A'),
('Budi Kusuma', '0002', 'XII TKJ A'),
('Citra Dewi', '0003', 'XII TKJ B'),
('Doni Hermawan', '0004', 'XII TKJ B'),
('Eka Putri', '0005', 'XI TKJ A'),
('Fajar Rahman', '0006', 'XI TKJ A'),
('Gita Sari', '0007', 'XI TKJ B'),
('Hendra Wijaya', '0008', 'XI TKJ B')
ON CONFLICT (nis) DO NOTHING;

-- ============================================
-- Sample Data: admin
-- ============================================
INSERT INTO admin (username, password, nama_lengkap) VALUES
('admin', '$2b$10$YLhMgKKz8p7L9H5D8Y4U9O3K4L6M8N9P0Q2R4S5T6U7V8W9X0Y1Z2', 'Administrator TKJ')
ON CONFLICT (username) DO NOTHING;
```

## Langkah 4: Verifikasi
Setelah SQL berhasil, cek apakah data ada:
```sql
SELECT COUNT(*) as barang_count FROM barang;
SELECT * FROM barang LIMIT 5;
SELECT * FROM jenis_barang;
```

Jika BRG-001 muncul dengan nama "Tang Crimping RJ45", maka setup berhasil!

## Langkah 5: Restart Server
```bash
cd server
npm start
```

Sekarang server seharusnya bisa connect dan menampilkan data.
