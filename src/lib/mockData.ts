// Mock data for development - will be replaced with API calls
import { Item, Borrowing } from "@/types";

export const mockItems: Item[] = [
  {
    id: 1,
    kode_barang: "BRG-001",
    nama_barang: "Tang Crimping RJ45",
  kode_jenis: "TKJ-LTRR",
    jumlah_stok: 10,
    jumlah_dipinjam: 3,
    foto_barang: "https://images.unsplash.com/photo-1581092160562-40aa08e78837?w=400",
    notes: "Untuk crimping kabel UTP",
    created_at: new Date().toISOString(),
  },
  {
    id: 2,
    kode_barang: "BRG-002",
    nama_barang: "Kabel Tester",
  kode_jenis: "TKJ-LTRR",
    jumlah_stok: 8,
    jumlah_dipinjam: 2,
    foto_barang: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400",
    notes: "Untuk testing koneksi kabel",
    created_at: new Date().toISOString(),
  },
  {
    id: 3,
    kode_barang: "BRG-003",
    nama_barang: "Obeng Set",
  kode_jenis: "TKJ-LTRR",
    jumlah_stok: 15,
    jumlah_dipinjam: 5,
    foto_barang: "https://images.unsplash.com/photo-1530124566582-a618bc2615dc?w=400",
    notes: "Set obeng lengkap",
    created_at: new Date().toISOString(),
  },
  {
    id: 4,
    kode_barang: "BRG-004",
    nama_barang: "LAN Tester",
  kode_jenis: "TKJ-LTRR",
    jumlah_stok: 6,
    jumlah_dipinjam: 1,
    foto_barang: "https://images.unsplash.com/photo-1598986646512-9330bcc4c0dc?w=400",
    notes: "Untuk testing koneksi LAN",
    created_at: new Date().toISOString(),
  },
  {
    id: 5,
    kode_barang: "BRG-005",
    nama_barang: "Kabel UTP Cat6 (Roll)",
  kode_jenis: "TKJ-CABL",
    jumlah_stok: 20,
    jumlah_dipinjam: 8,
    foto_barang: "https://images.unsplash.com/photo-1551818014-7c8ace9c3084?w=400",
    notes: "Kabel UTP Category 6",
    created_at: new Date().toISOString(),
  },
  {
    id: 6,
    kode_barang: "BRG-006",
    nama_barang: "RJ45 Connector (Box)",
  kode_jenis: "TKJ-CONN",
    jumlah_stok: 50,
    jumlah_dipinjam: 15,
    foto_barang: "https://images.unsplash.com/photo-1597852074816-d933c7d2b988?w=400",
    notes: "Konektor RJ45 untuk kabel UTP",
    created_at: new Date().toISOString(),
  },
];

export const mockBorrowings: Borrowing[] = [
  {
    id: 1,
    kode_peminjaman: "PMJ-2025-001",
    id_barang: 1,
    nama_peminjam: "Ahmad Fauzi",
    kontak: "081234567890",
    keperluan: "Praktikum Jaringan Komputer",
    guru_pendamping: "Pak Budi",
    jumlah: 2,
    foto_credential: "https://images.unsplash.com/photo-1633332755192-727a05c4013d?w=400",
    tanggal_pinjam: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    tanggal_kembali: undefined,
    status: 'Dipinjam',
    created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    nama_barang: "Tang Crimping RJ45",
  },
  {
    id: 2,
    kode_peminjaman: "PMJ-2025-002",
    id_barang: 3,
    nama_peminjam: "Siti Nurhaliza",
    kontak: "082345678901",
    keperluan: "Maintenance Lab Komputer",
    guru_pendamping: "Bu Ani",
    jumlah: 1,
    foto_credential: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400",
    tanggal_pinjam: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    tanggal_kembali: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    status: 'Dikembalikan',
    created_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    nama_barang: "Obeng Set",
  },
];

// Mock lists for borrowers (teachers and students)
export const mockTeachers = [
  { name: "Andi Bayu", nip: "NIP-001" },
  { name: "Ira Rosmalina", nip: "NIP-002" },
  { name: "Budi Santoso", nip: "NIP-003" },
];

export const mockStudents = [
  { name: "Rizwan A", nis: "NIS-1001" },
  { name: "Siti Nur", nis: "NIS-1002" },
  { name: "Ahmad Fauzi", nis: "NIS-1003" },
];
