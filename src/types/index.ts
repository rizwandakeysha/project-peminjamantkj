// Type definitions for TKJ Borrowing App

export interface Item {
  id: number;
  kode_barang: string;
  nama_barang: string;
  jumlah_stok: number;
  jumlah_dipinjam: number;
  foto_barang?: string;
  notes?: string;
  // Optional jenis kode to link item to a jenis (type)
  kode_jenis?: string;
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
