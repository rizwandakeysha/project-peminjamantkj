-- Quick schema check for barang table
SELECT column_name, data_type FROM information_schema.columns 
WHERE table_name = 'barang' 
ORDER BY ordinal_position;
