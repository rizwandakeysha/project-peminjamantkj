-- ============================================
-- ADD SNAPSHOT COLUMNS untuk Audit Trail
-- ============================================
-- Tambah kolom kode_barang dan nama_barang di detail_peminjaman
-- Sehingga walau barang dihapus, riwayat peminjaman tetap menunjukkan nama barang

-- Step 1: Tambah kolom snapshot barang
ALTER TABLE public.detail_peminjaman 
ADD COLUMN IF NOT EXISTS kode_barang VARCHAR(50);

ALTER TABLE public.detail_peminjaman 
ADD COLUMN IF NOT EXISTS nama_barang VARCHAR(255);

-- Step 2: Populate existing data dari barang yang masih ada
-- (Copy data dari tabel barang ke snapshot columns)
UPDATE public.detail_peminjaman dp
SET 
  kode_barang = b.kode_barang,
  nama_barang = b.nama_barang
FROM public.barang b
WHERE dp.id_barang = b.id_barang
  AND (dp.kode_barang IS NULL OR dp.nama_barang IS NULL);

-- Step 3: Untuk record yang barangnya sudah dihapus (id_barang = NULL)
-- Beri placeholder jika belum ada data
UPDATE public.detail_peminjaman
SET 
  kode_barang = COALESCE(kode_barang, '(Data tidak tersedia)'),
  nama_barang = COALESCE(nama_barang, '(Barang Dihapus)')
WHERE id_barang IS NULL 
  AND (kode_barang IS NULL OR nama_barang IS NULL);

-- Step 4: Verify hasil
SELECT 
  id_detail_peminjaman,
  id_barang,
  kode_barang,
  nama_barang,
  status,
  CASE 
    WHEN id_barang IS NULL THEN '⚠️ Barang dihapus tapi data tersimpan'
    ELSE '✅ Barang masih ada'
  END AS catatan
FROM public.detail_peminjaman
ORDER BY id_detail_peminjaman DESC
LIMIT 10;

-- Step 5: Check kolom baru sudah ada
SELECT 
    column_name, 
    data_type,
    character_maximum_length,
    is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'detail_peminjaman' 
  AND column_name IN ('kode_barang', 'nama_barang');

-- Success message
SELECT '✅ Snapshot columns berhasil ditambahkan! Sekarang nama barang tetap tersimpan walau barang dihapus.' AS status;
