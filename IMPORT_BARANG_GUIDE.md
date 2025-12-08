# Fitur Import CSV/XLSX untuk Data Barang

## Lokasi
- File: `src/pages/admin/Items.tsx`
- Akses: Admin Panel → Kelola Barang → Tampilkan Barang (untuk jenis tertentu) → Import CSV/XLSX

## Fitur Utama

### 1. Import File CSV/XLSX
- Terletak di popup "Tampilkan Barang" di setiap jenis barang
- Button "Import CSV/XLSX" di sebelah button "Tambah Barang"
- Mendukung format CSV dan XLSX
- File dapat dipilih melalui file picker atau drag & drop

### 2. Template CSV
- Tersedia button "📥 Download Template CSV" di dalam dialog import
- Template disimpan di: `public/template-barang.csv`
- Kolom yang tersedia:
  - **Wajib**: `nama_barang`, `kode_barang`
  - **Opsional**: `no_serial_number`, `deskripsi_barang`, `status`, `foto_barang`

### 3. Validasi Data
- Memastikan kolom wajib ada di header CSV
- Minimal 1 data row (selain header)
- Otomatis mengabaikan baris kosong
- Mewarning jika data tidak sesuai format

### 4. Proses Import
1. Pilih jenis barang terlebih dahulu
2. Klik "Tampilkan Barang"
3. Klik button "Import CSV/XLSX"
4. Download template atau siapkan file CSV Anda
5. Upload file
6. Data akan langsung ditambahkan ke dalam sistem
7. Toast notification menunjukkan berapa barang yang berhasil diimport

## Format CSV

```csv
nama_barang,kode_barang,no_serial_number,deskripsi_barang,status,foto_barang
Router Cisco 2911,BRG-010,CSC-2911-002,Router untuk praktik jaringan,Tersedia,https://...
Switch 48 Port,BRG-011,CSC-SW48-001,Switch manageable untuk lab,Tersedia,https://...
```

## Validasi Kolom

| Kolom | Wajib | Tipe | Contoh |
|-------|-------|------|--------|
| nama_barang | ✅ | Text | Router Cisco 2911 |
| kode_barang | ✅ | Text | BRG-010 |
| no_serial_number | ❌ | Text | CSC-2911-002 |
| deskripsi_barang | ❌ | Text | Router untuk praktik jaringan |
| status | ❌ | Text | Tersedia, Dipinjam, Rusak |
| foto_barang | ❌ | URL | https://images.unsplash.com/... |

## Handler Function

### `handleImportBarang(event: React.ChangeEvent<HTMLInputElement>)`
- Parse file CSV
- Validasi header dan data
- Membuat object barang baru
- Menambahkan ke state `barangList`
- Menampilkan toast notification

## Error Handling
- File kosong atau tidak ada data → Error message
- Kolom wajib tidak ada → Error message
- Format file tidak sesuai → Error message
- Sukses import → Success message dengan jumlah barang yang diimport

## Notes
- Barang diimport langsung ke jenis yang sedang dipilih
- ID barang otomatis di-generate berdasarkan max ID + nomor urut
- Timestamp `created_at` otomatis diset ke waktu import
- Status default adalah "Tersedia" jika tidak ditentukan
