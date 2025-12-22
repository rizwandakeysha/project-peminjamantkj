-- ============================================
-- FIX EXISTING DATABASE: Remove duplicate constraints and add ON DELETE SET NULL
-- ============================================
-- Run this in Supabase SQL Editor

-- Step 1: Drop ALL existing constraints untuk id_barang di detail_peminjaman
-- Ada 2 duplicate constraints yang perlu dihapus
ALTER TABLE public.detail_peminjaman 
DROP CONSTRAINT IF EXISTS fk_barang_item;

ALTER TABLE public.detail_peminjaman 
DROP CONSTRAINT IF EXISTS detail_peminjaman_id_barang_fkey;

-- Step 2: Make sure id_barang is NULLABLE
-- (Jika kolom sudah nullable, command ini akan diabaikan)
ALTER TABLE public.detail_peminjaman 
ALTER COLUMN id_barang DROP NOT NULL;

-- Step 3: Add single constraint dengan ON DELETE SET NULL
-- Ini akan preserve borrowing history ketika barang dihapus
ALTER TABLE public.detail_peminjaman 
ADD CONSTRAINT detail_peminjaman_id_barang_fkey 
FOREIGN KEY (id_barang) REFERENCES public.barang(id_barang) ON DELETE SET NULL;

-- Step 4: Verify constraints
SELECT 
    conname AS constraint_name,
    contype AS constraint_type,
    pg_get_constraintdef(oid) AS definition
FROM pg_constraint
WHERE conrelid = 'public.detail_peminjaman'::regclass
  AND conname LIKE '%barang%';

-- Step 5: Check if id_barang is nullable
SELECT 
    column_name, 
    is_nullable,
    data_type
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'detail_peminjaman' 
  AND column_name = 'id_barang';

-- Success message
SELECT '✅ Foreign key constraint berhasil diperbaiki! Sekarang barang bisa dihapus dan riwayat peminjaman tetap tersimpan.' AS status;
