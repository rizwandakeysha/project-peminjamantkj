// Type definitions for TKJ Borrowing App

export interface Item {
  id: number;
  id_barang?: number;
  kode_barang: string;
  nama_barang: string;
  status: 'Tersedia' | 'Dipinjam' | 'Rusak' | 'Hilang';
  deskripsi_barang?: string;
  no_serial_number?: string;
  foto_barang?: string;
  id_jenis_barang?: number;
  kode_jenis?: string;
  nama_jenis?: string;
  // Optional stock fields kept for legacy/mock admin screens
  jumlah_stok?: number;
  jumlah_dipinjam?: number;
  notes?: string;
  created_at: string;
}

export interface BorrowingFormData {
  nama_peminjam: string;
  kontak: string;
  keperluan: string;
  guru_pendamping: string;
  id_barang: number;
  jumlah: number;
}

export interface Borrowing {
  id?: number;
  id_peminjaman?: number;
  kode_peminjaman: string;
  id_barang?: number;
  nama_peminjam: string;
  kontak?: string;
  keperluan: string;
  guru_pendamping?: string;
  jumlah?: number;
  foto_credential?: string;
  tanggal_pinjam?: string;
  tanggal_kembali?: string;
  status?: 'Dipinjam' | 'Dikembalikan' | 'Sebagian Dikembalikan' | 'Selesai';
  signature?: string;
  created_at?: string;
  status_transaksi?: string;
  // Joined data
  nama_barang?: string;
  foto_barang?: string;
  // For API responses with detail_peminjaman array
  detail_peminjaman?: Array<{
    id_detail_peminjaman?: number;
    id_barang?: number;
    nama_barang?: string;
    kode_barang?: string;
    foto_barang?: string;
    status?: string;
    tanggal_kembali?: string;
    foto_bukti_kembali?: string;
  }>;
}

export interface Admin {
  id: number;
  username: string;
  nama_lengkap: string;
  created_at: string;
}

export type BorrowingStatus = 'Dipinjam' | 'Dikembalikan';
