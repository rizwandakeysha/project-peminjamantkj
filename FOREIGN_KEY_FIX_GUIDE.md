# Penjelasan Error Foreign Key Constraint

## ❌ Masalahnya Apa?

```
Unable to delete row as it is currently referenced by a foreign key constraint 
from the table `detail_peminjaman`. Key (id_barang)=(136) is still referenced 
from table detail_peminjaman.
```

### Artinya:
- **Barang ID 136** masih tercatat dalam tabel `detail_peminjaman` (catatan peminjaman barang)
- Database memiliki **Foreign Key Constraint** yang mencegah penghapusan barang yang masih direferensikan
- Ini adalah mekanisme **data integrity protection** - mencegah data orphan (data anak tanpa parent)

### Contoh Kasus:
```
Tabel barang:
  ID 136 = Router Cisco 2911

Tabel detail_peminjaman:
  id_detail_peminjaman = 50
  id_barang = 136  <-- Masih mereferensikan barang ID 136
```

Saat Anda coba delete Router (ID 136), database menolak karena masih ada catatan peminjaman untuk barang itu.

---

## ✅ Solusinya

Ada 2 pilihan strategi delete:

### **Opsi 1: ON DELETE CASCADE** (Hapus semua catatan)
Saat barang dihapus → **otomatis hapus semua catatan peminjaman (detail_peminjaman) yang mereferensikan barang itu**

**Kapan digunakan:**
- Jika ingin menghapus barang dan semua riwayat peminjaman-nya
- Untuk data cleanup/maintenance

**Pro:**
- ✅ Bisa delete barang dengan mudah
- ✅ Database otomatis clean up

**Cons:**
- ❌ Akan hilang riwayat peminjaman barang itu

---

### **Opsi 2: ON DELETE SET NULL** ⭐ (Recommended - Pilihan Saat Ini)
Saat barang dihapus → catatan peminjaman tetap ada tapi **referensi barang menjadi NULL**

**Kapan digunakan:**
- ✅ Ingin keep audit trail (riwayat peminjaman tetap tercatat)
- ✅ Barang sudah tidak ada di inventori tapi perlu tau apa yang pernah dipinjam
- ✅ Compliance & tracking purposes

**Pro:**
- ✅ Tetap ada riwayat peminjaman (siapa pinjam kapan)
- ✅ Tetap bisa track peminjaman historis
- ✅ Bisa delete barang dari inventori tanpa kehilangan data
- ✅ Audit trail lengkap

**Cons:**
- ⚠️ Kolom id_barang akan NULL untuk peminjaman barang yang dihapus
- ⚠️ Query jadi perlu handle NULL values
- ⚠️ Di UI perlu tampilkan "Barang (Dihapus)" atau sejenisnya

---

## 🔧 Implementasi (Opsi 2: SET NULL - CURRENT)

### Step 1: Jalankan SQL Fix Script
```bash
# Via Supabase Dashboard:
# 1. Buka Supabase Dashboard → SQL Editor
# 2. Copy-paste isi FIX_FK_CONSTRAINT.sql
# 3. Jalankan

# Atau via psql (PostgreSQL CLI):
psql -U username -h your-host.supabase.co -d postgres -f FIX_FK_CONSTRAINT.sql
```

### Step 2: Script yang Dijalankan
```sql
-- Drop constraint yang lama
ALTER TABLE detail_peminjaman 
DROP CONSTRAINT detail_peminjaman_id_barang_fkey;

-- Ubah id_barang menjadi nullable
ALTER TABLE detail_peminjaman 
ALTER COLUMN id_barang DROP NOT NULL;

-- Buat constraint baru dengan ON DELETE SET NULL
ALTER TABLE detail_peminjaman 
ADD CONSTRAINT detail_peminjaman_id_barang_fkey 
FOREIGN KEY (id_barang) REFERENCES barang(id_barang) ON DELETE SET NULL;
```

### Step 3: Verifikasi
```sql
-- Cek constraint berhasil dibuat
SELECT constraint_name, table_name 
FROM information_schema.constraint_column_usage 
WHERE table_name = 'detail_peminjaman' AND column_name = 'id_barang';

-- Output yang diharapkan:
-- constraint_name: detail_peminjaman_id_barang_fkey

-- Cek column nullable
SELECT column_name, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'detail_peminjaman' AND column_name = 'id_barang';

-- Output yang diharapkan:
-- column_name: id_barang
-- is_nullable: YES
```

---

## 📝 Perubahan di Database Schema

### Sebelumnya:
```sql
id_barang INTEGER NOT NULL REFERENCES barang(id_barang) ON DELETE RESTRICT
```
- ❌ NOT NULL - Barang harus ada
- ❌ ON DELETE RESTRICT - Tidak boleh delete barang jika masih ada peminjaman

### Sekarang:
```sql
id_barang INTEGER REFERENCES barang(id_barang) ON DELETE SET NULL
```
- ✅ NULLABLE - Barang boleh tidak ada (NULL)
- ✅ ON DELETE SET NULL - Saat barang dihapus, field diset NULL

---

## 🚀 Testing Setelah Fix

### Test 1: Delete barang dengan riwayat peminjaman
```sql
-- Cek barang yang ada peminjaman
SELECT COUNT(*) FROM detail_peminjaman WHERE id_barang = 136;
-- Output: 2 (ada 2 peminjaman barang ini)

-- Delete barang
DELETE FROM barang WHERE id_barang = 136;
-- ✅ BERHASIL (tidak error lagi!)

-- Cek detail peminjaman masih ada tapi id_barang NULL
SELECT * FROM detail_peminjaman WHERE id_barang IS NULL;
-- Output: Ada 2 record dengan id_barang = NULL
-- Tetap bisa lihat: tanggal_pinjam, foto_bukti_kembali, status, dll
```

### Test 2: Query dengan NULL handling
```sql
-- Tampilkan peminjaman dan info barang (dengan NULL handling)
SELECT 
  dp.id_detail_peminjaman,
  dp.id_peminjaman,
  COALESCE(b.nama_barang, '(Barang Dihapus)') as nama_barang,
  dp.tanggal_kembali,
  dp.status
FROM detail_peminjaman dp
LEFT JOIN barang b ON dp.id_barang = b.id_barang;

-- Output contoh:
-- id_detail | id_peminjaman | nama_barang    | tanggal_kembali | status
-- 50        | 10            | (Barang Dihapus) | 2025-01-15     | Dikembalikan
-- 51        | 10            | Router Cisco   | 2025-01-20     | Dikembalikan
```

---

## 💡 Frontend Implementation Tips

### Handling NULL barang di UI:

```typescript
// Ketika fetch detail peminjaman
const displayName = barangData.nama_barang || '(Barang Dihapus)';

// Atau pakai badge untuk visual
<Badge variant="destructive">Barang Dihapus</Badge>

// Atau tampilkan info lain yang masih ada
{dp.id_barang ? (
  <span>{barang.nama_barang}</span>
) : (
  <span className="text-muted-foreground">(Barang Dihapus)</span>
)}
```

---

## 📋 File yang Sudah Diupdate

1. ✅ **SETUP_DATABASE.md** - id_barang nullable + ON DELETE SET NULL
2. ✅ **server/scripts/setupDatabase.js** - Sama seperti di atas
3. ✅ **FIX_FK_CONSTRAINT.sql** - Script untuk update existing database
4. ✅ **FOREIGN_KEY_FIX_GUIDE.md** - Dokumentasi ini

---

## 🎯 Ringkasan

| Aspek | Sebelumnya | Sekarang |
|-------|-----------|---------|
| Constraint | ON DELETE RESTRICT | ON DELETE SET NULL |
| Nullable | NOT NULL | NULLABLE |
| Delete Barang | ❌ Error | ✅ Berhasil |
| Riwayat Peminjaman | Hilang (error) | ✅ Tetap ada (NULL) |
| Audit Trail | ❌ Tidak ada | ✅ Lengkap |
| Use Case | Strict integrity | Business audit trail |

Sekarang Anda bisa:
1. ✅ Delete barang dari inventori
2. ✅ Riwayat peminjaman tetap tercatat
3. ✅ Bisa tau barang apa yang pernah dipinjam sebelum dihapus
4. ✅ Semua data audit trail tetap aman

