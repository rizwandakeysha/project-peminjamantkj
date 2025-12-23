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
import { barangAPI, peminjamanAPI, guruAPI, siswaAPI, API_BASE_URL } from "@/lib/api";
import { getPhotoUrl } from "@/lib/telegramUtils";
import { toast } from "react-hot-toast";

const Dashboard = () => {
  const [statistics, setStatistics] = useState({
    total_barang: 0,
    total_jenis_barang: 0,
    total_tersedia: 0,
    total_dipinjam: 0,
    items_sedang_dipinjam: 0,
    items_sudah_dikembalikan: 0,
    peminjaman_hari_ini: 0,
    peminjaman_bulan_ini: 0,
    total_siswa: 0,
    total_guru: 0,
    active_peminjaman: 0,
    completed_peminjaman: 0,
  });
  const [borrowings, setBorrowings] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [barangData, peminjamanData, guruData, siswaData] =
          await Promise.all([
            barangAPI.getAll(),
            peminjamanAPI.getAll(),
            guruAPI.getAll().catch(() => []),
            siswaAPI.getAll().catch(() => []),
          ]);

        // Use only API data (no fallback to mock)
        const barang = barangData || [];
        const peminjaman = peminjamanData || [];
        const guruList = guruData || [];
        const siswaList = siswaData || [];

        setBorrowings(peminjaman);

        // Calculate stats from actual API data
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const thisMonthStart = new Date(
          today.getFullYear(),
          today.getMonth(),
          1
        );

        // Count borrowings today and this month
        const peminjamanHariIni = peminjaman.filter((b: any) => {
          const borrowDate = new Date(b.tanggal_pinjam);
          borrowDate.setHours(0, 0, 0, 0);
          return borrowDate.getTime() === today.getTime();
        }).length;

        const peminjamanBulanIni = peminjaman.filter((b: any) => {
          const borrowDate = new Date(b.tanggal_pinjam);
          return borrowDate >= thisMonthStart && borrowDate <= today;
        }).length;

        // Calculate item stats from API
        const totalItems = barang.length;

        // Get unique jenis barang from database
        const jenisSet = new Set<number>();
        barang.forEach((item: any) => {
          if (item.id_jenis_barang) {
            jenisSet.add(item.id_jenis_barang);
          }
        });
        const totalJenisBarang = jenisSet.size;

        // Calculate available and borrowed items (by item status in database)
        const totalTersedia = barang.filter(
          (b: any) => b.status === "Tersedia"
        ).length;
        const totalDipinjam = barang.filter(
          (b: any) => b.status === "Dipinjam"
        ).length;

        // Count items returned and still borrowed (from detail_peminjaman status)
        let itemsSedangDipinjam = 0;
        let itemsSudahDikembalikan = 0;

        peminjaman.forEach((pmj: any) => {
          if (pmj.detail_peminjaman && Array.isArray(pmj.detail_peminjaman)) {
            pmj.detail_peminjaman.forEach((detail: any) => {
              if (detail.status === "Dipinjam") {
                itemsSedangDipinjam++;
              } else if (detail.status === "Dikembalikan") {
                itemsSudahDikembalikan++;
              }
            });
          }
        });

        // Count active and completed transactions (based on status_transaksi)
        const activePeminjaman = peminjaman.filter(
          (b: any) => b.status_transaksi === "Dipinjam"
        ).length;
        const completedPeminjaman = peminjaman.filter(
          (b: any) => b.status_transaksi === "Dikembalikan"
        ).length;

        setStatistics({
          total_barang: totalItems,
          total_jenis_barang: totalJenisBarang,
          total_tersedia: totalTersedia,
          total_dipinjam: totalDipinjam,
          items_sedang_dipinjam: itemsSedangDipinjam,
          items_sudah_dikembalikan: itemsSudahDikembalikan,
          peminjaman_hari_ini: peminjamanHariIni,
          peminjaman_bulan_ini: peminjamanBulanIni,
          total_siswa: siswaList.length,
          total_guru: guruList.length,
          active_peminjaman: activePeminjaman,
          completed_peminjaman: completedPeminjaman,
        });
      } catch (error) {
        console.error("Error fetching dashboard data:", error);
        toast.error("Gagal memuat data dashboard");
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const {
    total_barang: totalItems,
    total_jenis_barang: totalJenisBarang,
    total_tersedia: totalAvailable,
    total_dipinjam: totalBorrowed,
    items_sedang_dipinjam: itemsBeingBorrowed,
    items_sudah_dikembalikan: itemsReturned,
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
              <div className="text-3xl font-bold">
                {totalAvailable + totalBorrowed}
              </div>
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
              <div className="text-3xl font-bold">{itemsBeingBorrowed}</div>
              <p className="text-xs text-muted-foreground mt-1">
                Item dipinjam
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Sudah Dikembalikan
              </CardTitle>
              <UserCheck className="h-5 w-5 text-success" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{itemsReturned}</div>
              <p className="text-xs text-muted-foreground mt-1">
                Item dikembalikan
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
            {borrowings.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">
                Tidak ada data peminjaman
              </p>
            ) : (
              <div className="space-y-3">
                {borrowings.slice(0, 5).map((borrowing, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      {borrowing.foto_credential && (
                        <img
                          src={getPhotoUrl(borrowing.foto_credential, API_BASE_URL)}
                          alt={borrowing.nama_peminjam}
                          className="w-10 h-10 rounded-full object-cover"
                        />
                      )}
                      <div className="flex-1">
                        <p className="font-medium">{borrowing.nama_peminjam}</p>
                        <p className="text-sm text-muted-foreground">
                          {borrowing.detail_peminjaman?.length || 0} barang
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-mono font-medium">
                        {borrowing.kode_peminjaman}
                      </p>
                      <p
                        className={`text-xs ${
                          borrowing.status_transaksi === "Dipinjam"
                            ? "text-warning"
                            : "text-success"
                        }`}
                      >
                        {borrowing.status_transaksi}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
};

export default Dashboard;
