-- ============================================
-- FIX: Change id_barang to nullable with ON DELETE SET NULL
-- ============================================
-- When a barang is deleted, the detail_peminjaman record remains
-- but id_barang is set to NULL. This preserves borrowing history
-- while allowing items to be deleted from inventory.

-- Step 1: Drop the existing constraint
ALTER TABLE detail_peminjaman 
DROP CONSTRAINT detail_peminjaman_id_barang_fkey;

-- Step 2: Make id_barang nullable (if not already)
ALTER TABLE detail_peminjaman 
ALTER COLUMN id_barang DROP NOT NULL;

-- Step 3: Add new constraint with ON DELETE SET NULL
ALTER TABLE detail_peminjaman 
ADD CONSTRAINT detail_peminjaman_id_barang_fkey 
FOREIGN KEY (id_barang) REFERENCES barang(id_barang) ON DELETE SET NULL;

-- Verify the constraint was created
SELECT constraint_name, table_name, column_name 
FROM information_schema.constraint_column_usage 
WHERE table_name = 'detail_peminjaman' AND column_name = 'id_barang';

-- Check if column is nullable
SELECT column_name, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'detail_peminjaman' AND column_name = 'id_barang';

-- Success message
SELECT 'Foreign key constraint fixed! Borrowing history preserved when items are deleted.' AS status;

