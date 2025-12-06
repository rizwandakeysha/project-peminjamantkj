import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import AdminLayout from "@/layouts/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Package,
  ClipboardList,
  TrendingUp,
  Users,
  ArrowRight,
  Calendar,
  UserCheck,
} from "lucide-react";
import { mockItems, mockBorrowings, mockTeachers, mockStudents } from "@/lib/mockData";
import { toast } from "react-hot-toast";

const Dashboard = () => {
  const [statistics, setStatistics] = useState({
    total_barang: 0,
    total_jenis_barang: 0,
    total_tersedia: 0,
    total_dipinjam: 0,
    peminjaman_hari_ini: 0,
    peminjaman_bulan_ini: 0,
    total_siswa: 0,
    total_guru: 0,
    active_peminjaman: 0,
    completed_peminjaman: 0,
  });
  const [borrowings, setBorrowings] = useState(mockBorrowings);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // DUMMY MODE: Calculate stats from mock data
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const thisMonthStart = new Date(today.getFullYear(), today.getMonth(), 1);
    
    // Count borrowings today and this month
    const peminjamanHariIni = mockBorrowings.filter((b) => {
      const borrowDate = new Date(b.tanggal_pinjam);
      borrowDate.setHours(0, 0, 0, 0);
      return borrowDate.getTime() === today.getTime();
    }).length;

    const peminjamanBulanIni = mockBorrowings.filter((b) => {
      const borrowDate = new Date(b.tanggal_pinjam);
      return borrowDate >= thisMonthStart && borrowDate <= today;
    }).length;

    const activePeminjaman = mockBorrowings.filter((b) => b.status === 'Dipinjam').length;
    const completedPeminjaman = mockBorrowings.filter((b) => b.status === 'Dikembalikan').length;

    // Calculate item stats
    const totalItems = mockItems.length;
    const totalJenisBayang = [...new Set(mockItems.map(i => i.kode_jenis))].length;
    const totalTersedia = mockItems.reduce((sum, item) => sum + (item.jumlah_stok - item.jumlah_dipinjam), 0);
    const totalDipinjam = mockItems.reduce((sum, item) => sum + item.jumlah_dipinjam, 0);

    setStatistics({
      total_barang: totalItems,
      total_jenis_barang: totalJenisBayang,
      total_tersedia: totalTersedia,
      total_dipinjam: totalDipinjam,
      peminjaman_hari_ini: peminjamanHariIni,
      peminjaman_bulan_ini: peminjamanBulanIni,
      total_siswa: mockStudents.length,
      total_guru: mockTeachers.length,
      active_peminjaman: activePeminjaman,
      completed_peminjaman: completedPeminjaman,
    });

    setLoading(false);
  }, []);

  const {
    total_barang: totalItems,
    total_jenis_barang: totalJenisBarang,
    total_tersedia: totalAvailable,
    total_dipinjam: totalBorrowed,
    peminjaman_hari_ini: todayBorrowings,
    peminjaman_bulan_ini: monthBorrowings,
    total_siswa: totalSiswa,
    total_guru: totalGuru,
    active_peminjaman: activeBorrowings,
    completed_peminjaman: completedBorrowings,
  } = statistics;

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h2 className="text-3xl font-bold mb-2">Dashboard Admin</h2>
          <p className="text-muted-foreground">
            Selamat datang di sistem manajemen peminjaman barang Unit TKJ
          </p>
        </div>

        {/* Stats Cards - Row 1 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Barang
              </CardTitle>
              <Package className="h-5 w-5 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{totalItems}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {totalJenisBarang} jenis
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Stok
              </CardTitle>
              <TrendingUp className="h-5 w-5 text-success" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{totalAvailable + totalBorrowed}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {totalAvailable} tersedia, {totalBorrowed} dipinjam
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Peminjaman Hari Ini
              </CardTitle>
              <Calendar className="h-5 w-5 text-info" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{todayBorrowings}</div>
              <p className="text-xs text-muted-foreground mt-1">
                Transaksi baru
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Peminjaman Bulan Ini
              </CardTitle>
              <ClipboardList className="h-5 w-5 text-warning" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{monthBorrowings}</div>
              <p className="text-xs text-muted-foreground mt-1">
                Total transaksi
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Stats Cards - Row 2 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Siswa
              </CardTitle>
              <Users className="h-5 w-5 text-info" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{totalSiswa}</div>
              <p className="text-xs text-muted-foreground mt-1">
                Terdaftar di sistem
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Guru
              </CardTitle>
              <UserCheck className="h-5 w-5 text-success" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{totalGuru}</div>
              <p className="text-xs text-muted-foreground mt-1">
                Guru pendamping
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Sedang Dipinjam
              </CardTitle>
              <ClipboardList className="h-5 w-5 text-warning" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{activeBorrowings}</div>
              <p className="text-xs text-muted-foreground mt-1">
                Transaksi aktif
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Sudah Dikembalikan
              </CardTitle>
              <Users className="h-5 w-5 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{completedBorrowings}</div>
              <p className="text-xs text-muted-foreground mt-1">
                Transaksi selesai
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <div className="grid md:grid-cols-2 gap-6">
          <Card className="overflow-hidden">
            <div className="bg-gradient-to-br from-primary/10 to-primary/5 p-6">
              <Package className="h-12 w-12 text-primary mb-4" />
              <CardTitle className="text-2xl mb-2">Kelola Barang</CardTitle>
              <p className="text-muted-foreground mb-4">
                Tambah, edit, atau hapus data barang. Generate QR code otomatis
                untuk setiap barang.
              </p>
              <Button asChild size="lg" className="shadow-md">
                <Link to="/admin-tkj/items">
                  Ke Halaman Barang
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Link>
              </Button>
            </div>
          </Card>

          <Card className="overflow-hidden bg-gradient-to-br from-success/10 to-success/5">
            <div className=" p-6">
              <ClipboardList className="h-12 w-12 text-success mb-4" />
              <CardTitle className="text-2xl mb-2">Kelola Peminjaman</CardTitle>
              <p className="text-muted-foreground mb-4">
                Lihat histori peminjaman, edit status, dan export data untuk
                laporan.
              </p>
              <Button asChild size="lg" className="shadow-md">
                <Link to="/admin-tkj/borrowings">
                  Ke Halaman Peminjaman
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Link>
              </Button>
            </div>
          </Card>
        </div>

        {/* Recent Borrowings */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Peminjaman Terbaru</CardTitle>
              <Button variant="ghost" size="sm" asChild>
                <Link to="/admin-tkj/borrowings">
                  Lihat Semua
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {mockBorrowings.slice(0, 5).map((borrowing, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    {borrowing.foto_credential && (
                      <img
                        src={borrowing.foto_credential}
                        alt={borrowing.nama_peminjam}
                        className="w-10 h-10 rounded-full object-cover"
                      />
                    )}
                    <div>
                      <p className="font-medium">{borrowing.nama_peminjam}</p>
                      <p className="text-sm text-muted-foreground">
                        {borrowing.nama_barang} ({borrowing.jumlah}x)
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-mono font-medium">
                      {borrowing.kode_peminjaman}
                    </p>
                    <p
                      className={`text-xs ${
                        borrowing.status === "Dipinjam"
                          ? "text-warning"
                          : "text-success"
                      }`}
                    >
                      {borrowing.status}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
};

export default Dashboard;
