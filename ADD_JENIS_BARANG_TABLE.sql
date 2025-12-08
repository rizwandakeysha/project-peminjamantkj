-- ============================================
-- Add jenis_barang table to PostgreSQL schema
-- ============================================

-- Create jenis_barang table
CREATE TABLE IF NOT EXISTS jenis_barang (
  id_jenis_barang SERIAL PRIMARY KEY,
  kode_jenis_barang VARCHAR(20) UNIQUE NOT NULL,
  nama_jenis_barang VARCHAR(100) NOT NULL,
  deskripsi_jenis_barang TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_kode_jenis_barang ON jenis_barang(kode_jenis_barang);
CREATE INDEX IF NOT EXISTS idx_nama_jenis_barang ON jenis_barang(nama_jenis_barang);

-- Add id_jenis_barang column to barang table if it doesn't exist
ALTER TABLE barang ADD COLUMN IF NOT EXISTS id_jenis_barang INTEGER;

-- Add foreign key constraint for jenis_barang (if not already exists)
DO $$
BEGIN
  BEGIN
    ALTER TABLE barang 
    ADD CONSTRAINT fk_jenis_barang 
    FOREIGN KEY (id_jenis_barang) REFERENCES jenis_barang(id_jenis_barang) ON DELETE CASCADE;
  EXCEPTION WHEN others THEN
    -- Constraint already exists, ignore error
    NULL;
  END;
END $$;

-- Add NOT NULL constraint after data is added
-- Note: If barang already has rows, set them to a default jenis_barang first
-- UPDATE barang SET id_jenis_barang = 1 WHERE id_jenis_barang IS NULL;
-- ALTER TABLE barang ALTER COLUMN id_jenis_barang SET NOT NULL;

-- Insert sample jenis_barang if needed
INSERT INTO jenis_barang (kode_jenis_barang, nama_jenis_barang, deskripsi_jenis_barang) VALUES 
('TKJ-PERL', 'Peralatan Networking', 'Alat dan kabel untuk praktik jaringan')
ON CONFLICT (kode_jenis_barang) DO NOTHING;
