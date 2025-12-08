# PENTING: Setup Database untuk Jenis Barang

## Masalah
Error saat menghapus jenis barang karena tabel `jenis_barang` belum ada di database.

## Solusi

### 1. Jalankan Script SQL
Buka Supabase Console atau SQL Editor dan jalankan script: `ADD_JENIS_BARANG_TABLE.sql`

Script ini akan:
- ✅ Membuat tabel `jenis_barang` 
- ✅ Menambahkan kolom `id_jenis_barang` ke tabel `barang`
- ✅ Membuat foreign key constraint dengan CASCADE DELETE
- ✅ Insert sample jenis_barang

### 2. Verifikasi di Supabase
1. Buka https://supabase.com
2. Pilih project Anda
3. Ke SQL Editor
4. Copy-paste isi dari `ADD_JENIS_BARANG_TABLE.sql`
5. Klik **Run**

### 3. Atau gunakan psql command line
```bash
psql -h aws-1-ap-southeast-2.pooler.supabase.com -U postgres -d postgres -c "$(cat ADD_JENIS_BARANG_TABLE.sql)"
```

## Yang Berubah

### Sebelum (Backend Error)
```
Tidak dapat menghapus jenis barang yang memiliki barang terkait
```

### Sesudah (Cascade Delete)
```
Jenis barang berhasil dihapus (5 barang terhapus)
```

Semua barang yang terkait akan otomatis dihapus ketika jenis barang dihapus.

## Troubleshooting

Jika sudah jalankan script tapi masih error:

1. **Restart server Node.js**
   ```bash
   npm restart  # di folder server
   ```

2. **Clear browser cache**
   - Buka DevTools (F12)
   - Klik kanan on refresh button → "Empty cache and hard refresh"

3. **Cek database**
   - Buka Supabase Console
   - Verifikasi tabel `jenis_barang` ada
   - Verifikasi kolom `id_jenis_barang` ada di tabel `barang`
