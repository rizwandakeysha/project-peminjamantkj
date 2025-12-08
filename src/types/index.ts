// Type definitions for TKJ Borrowing App

export interface Item {
  id: number;
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
  id: number;
  kode_peminjaman: string;
  id_barang: number;
  nama_peminjam: string;
  kontak: string;
  keperluan: string;
  guru_pendamping: string;
  jumlah: number;
  foto_credential?: string;
  tanggal_pinjam: string;
  tanggal_kembali?: string;
  status: 'Dipinjam' | 'Dikembalikan';
  signature?: string;
  created_at: string;
  // Joined data
  nama_barang?: string;
  foto_barang?: string;
}

export interface Admin {
  id: number;
  username: string;
  nama_lengkap: string;
  created_at: string;
}

export type BorrowingStatus = 'Dipinjam' | 'Dikembalikan';
