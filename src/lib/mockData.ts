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
  // Today's borrowings
  {
    id: 3,
    kode_peminjaman: "PMJ-2025-003",
    id_barang: 2,
    nama_peminjam: "Rini Sutrisno",
    kontak: "083456789012",
    keperluan: "Praktikum Kabel Jaringan",
    guru_pendamping: "Pak Dino",
    jumlah: 3,
    foto_credential: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400",
    tanggal_pinjam: new Date().toISOString(),
    tanggal_kembali: undefined,
    status: 'Dipinjam',
    created_at: new Date().toISOString(),
    nama_barang: "Kabel Tester",
  },
  {
    id: 4,
    kode_peminjaman: "PMJ-2025-004",
    id_barang: 4,
    nama_peminjam: "Ari Wibowo",
    kontak: "084567890123",
    keperluan: "Troubleshooting Jaringan",
    guru_pendamping: "Bu Sita",
    jumlah: 1,
    foto_credential: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400",
    tanggal_pinjam: new Date().toISOString(),
    tanggal_kembali: undefined,
    status: 'Dipinjam',
    created_at: new Date().toISOString(),
    nama_barang: "LAN Tester",
  },
  {
    id: 5,
    kode_peminjaman: "PMJ-2025-005",
    id_barang: 5,
    nama_peminjam: "Dewi Lestari",
    kontak: "085678901234",
    keperluan: "Instalasi Kabel",
    guru_pendamping: "Pak Budi",
    jumlah: 2,
    foto_credential: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=400",
    tanggal_pinjam: new Date().toISOString(),
    tanggal_kembali: undefined,
    status: 'Dipinjam',
    created_at: new Date().toISOString(),
    nama_barang: "Kabel UTP Cat6 (Roll)",
  },
  // This month borrowings
  {
    id: 6,
    kode_peminjaman: "PMJ-2025-006",
    id_barang: 6,
    nama_peminjam: "Budi Santoso",
    kontak: "086789012345",
    keperluan: "Lab Praktikum",
    guru_pendamping: "Bu Ani",
    jumlah: 5,
    foto_credential: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400",
    tanggal_pinjam: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
    tanggal_kembali: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString(),
    status: 'Dikembalikan',
    created_at: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
    nama_barang: "RJ45 Connector (Box)",
  },
  {
    id: 7,
    kode_peminjaman: "PMJ-2025-007",
    id_barang: 1,
    nama_peminjam: "Toni Hermawan",
    kontak: "087890123456",
    keperluan: "Praktikum Lab TKJ",
    guru_pendamping: "Pak Dino",
    jumlah: 1,
    foto_credential: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400",
    tanggal_pinjam: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    tanggal_kembali: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString(),
    status: 'Dikembalikan',
    created_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    nama_barang: "Tang Crimping RJ45",
  },
];

// Available classes
export const kelasOptions = ["X TKJ 1", "X TKJ 2", "X TKJ 3", "XI TKJ 1", "XI TKJ 2", "XI TKJ 3"];

// Generate 100 mock teachers
const teacherFirstNames = [
  "Andi", "Budi", "Citra", "Dedi", "Eka", "Feri", "Gita", "Hendra", "Ira", "Joko",
  "Karin", "Lina", "Mitra", "Nanda", "Oka", "Putri", "Qintar", "Rindi", "Susi", "Tika",
  "Udin", "Vina", "Wawan", "Xander", "Yudi", "Zara", "Agus", "Bella", "Cerita", "Dadan",
  "Eka", "Fahmi", "Gina", "Hafis", "Inti", "Joko", "Kiki", "Livia", "Meri", "Novi",
  "Ocha", "Peni", "Qonita", "Rani", "Sigit", "Tania", "Ulfa", "Vega", "Winda", "Xenia",
  "Yasir", "Zahra", "Alvaro", "Bambang", "Ceria", "Dani", "Elisa", "Fajar", "Gilang", "Hani",
  "Irwan", "Josua", "Karma", "Lena", "Marno", "Nandi", "Osman", "Purno", "Querino", "Rian",
  "Sandi", "Tino", "Ulfah", "Vital", "Widia", "Xenia", "Yolanda", "Zikri", "Abdur", "Binar",
  "Castor", "Danang", "Elmo", "Fanda", "Gading", "Hafiz", "Ilyas", "Jarwo", "Karim", "Liang"
];

const teacherLastNames = [
  "Bayu", "Santoso", "Wijaya", "Kusuma", "Suharto", "Hartono", "Gunawan", "Pratama", "Rahman", "Ibrahim",
  "Setya", "Prabowo", "Suryanto", "Budiman", "Ardhana", "Rosmalina", "Handoko", "Setiawan", "Mahendra", "Wijaksono",
  "Handoyo", "Sutrisno", "Hapsara", "Mulyadi", "Supriyanto", "Wardhana", "Kusnandar", "Subagyo", "Wijaya", "Rismanto"
];

export const mockTeachers = Array.from({ length: 100 }, (_, i) => ({
  name: `${teacherFirstNames[i % teacherFirstNames.length]} ${teacherLastNames[i % teacherLastNames.length]}`,
  nip: `NIP-${String(i + 1).padStart(3, "0")}`,
}));

// Mock students with kelas data - organized by class
const studentDataByClass = {
  "X TKJ 1": [
    { name: "ABDULLOH ARRAFIFF", nis: "14301/2364.066" },
    { name: "ABY NUR SYAHDANI", nis: "14302/2365.066" },
    { name: "ADAM PRANANDA SUHENDAR", nis: "14304/2367.066" },
    { name: "ADEVITA INDRIYANTI", nis: "14305/2368.066" },
    { name: "AHMAD MAFTUHUR RIZQY", nis: "14309/2372.066" },
    { name: "AMELDA FITRI AYU PERMATA", nis: "14317/2380.066" },
    { name: "BENY WAHYUDI AKBAR", nis: "14326/2389.066" },
    { name: "CHARLY ANANDA PUTRA AFANDI", nis: "14329/2392.066" },
    { name: "CINTA AFIDAHTUL ISMA AINI", nis: "14330/2393.066" },
    { name: "FADHIL MAULANA PRATAMA", nis: "14339/2402.066" },
    { name: "FATIMAH", nis: "14341/2404.066" },
    { name: "FINO SEPTIAN AFANDI", nis: "14343/2406.066" },
    { name: "HILMIY FAKHRY AL FARIZI", nis: "14345/2408.066" },
    { name: "IBRAHIM SALIM SYAKIF", nis: "14346/2409.066" },
    { name: "INGE PANDALUWANGSA", nis: "14347/2410.066" },
    { name: "KEVIN WIDDAD BRAMANTYO", nis: "14349/2412.066" },
    { name: "MASHI ARDIKA", nis: "14357/2420.066" },
    { name: "MAULIDHA LAILATUL ZANNA", nis: "14358/2421.066" },
    { name: "MAYLA DIVA SEVILYA", nis: "14359/2422.066" },
    { name: "MEGA RIZKY WIDIYANTO", nis: "14360/2423.066" },
    { name: "MOCH FADIL MAULIDIANSYAH", nis: "14361/2424.066" },
    { name: "MOCHAMMAD JUNINHO PRATAMA", nis: "14364/2427.066" },
    { name: "MUHAMAD MARCELINO SYAHPUTRA", nis: "14367/2430.066" },
    { name: "MUHAMMAD RAFAEL DANANG PRIYONO", nis: "14376/2439.066" },
    { name: "MUHAMMAD SATRIA PUTRA PRATAMA", nis: "14379/2442.066" },
    { name: "OKTAVIAN AVIS SHOLEH", nis: "14382/2445.066" },
    { name: "RAFA SHOKHIBUL BAKHRI", nis: "14383/2446.066" },
  ],
  "X TKJ 2": Array.from({ length: 25 }, (_, i) => ({
    name: `Tali Goci ${String(i + 1).padStart(2, "0")}`,
    nis: `14400/2500.06${String(i).padStart(1, "0")}`,
  })),
  "X TKJ 3": Array.from({ length: 25 }, (_, i) => ({
    name: `Jian Ayune ${String(i + 1).padStart(2, "0")}`,
    nis: `14425/2525.06${String(i).padStart(1, "0")}`,
  })),
  "XI TKJ 1": Array.from({ length: 10 }, (_, i) => ({
    name: `Owalah Yowes ${String(i + 1).padStart(2, "0")}`,
    nis: `13700/2350.06${String(i).padStart(1, "0")}`,
  })),
  "XI TKJ 2": Array.from({ length: 10 }, (_, i) => ({
    name: `Yanto Hay ${String(i + 1).padStart(2, "0")}`,
    nis: `13710/2360.06${String(i).padStart(1, "0")}`,
  })),
  "XI TKJ 3": Array.from({ length: 3 }, (_, i) => ({
    name: `ZAHRATUS SADIYAH`,
    nis: `13781/2361.066`,
  })),
};

export const mockStudents = Array.from(
  { length: 100 },
  (_, i) => {
    const klasIndex = Math.floor(i / 20);
    const kelas = kelasOptions[klasIndex] || "X TKJ 1";
    const classStudents = studentDataByClass[kelas] || [];
    const studentIndex = i % Math.max(classStudents.length, 1);
    const student = classStudents[studentIndex] || { name: `Student ${i}`, nis: `NIS-${1001 + i}` };
    return {
      name: student.name,
      nis: student.nis,
      kelas,
    };
  }
);
