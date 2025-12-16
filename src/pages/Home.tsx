import { useState, useEffect, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import PublicLayout from "@/layouts/PublicLayout";
import ItemCard from "@/components/ItemCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  ArrowRight,
  Package,
  RotateCcw,
  Search,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { Item } from "@/types";
import { barangAPI } from "@/lib/api";
import { toast } from "react-hot-toast";

const ITEMS_PER_PAGE = 12;

const Home = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<
    "semua" | "Tersedia" | "Dipinjam"
  >("semua");
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    const fetchItems = async () => {
      try {
        setLoading(true);
        const data = await barangAPI.getAll();
        setItems(data);
      } catch (error) {
        console.error("Error fetching items:", error);
        toast.error("Gagal memuat data barang");
      } finally {
        setLoading(false);
      }
    };

    fetchItems();
  }, []);

  // Memoized filtered items untuk avoid re-compute setiap render
  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      // Filter by search query
      const matchesSearch =
        item.nama_barang.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.kode_barang.toLowerCase().includes(searchQuery.toLowerCase());

      // Filter by status
      const matchesStatus =
        filterStatus === "semua" || item.status === filterStatus;

      return matchesSearch && matchesStatus;
    });
  }, [items, searchQuery, filterStatus]);

  // Reset ke halaman 1 saat filter atau search berubah
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, filterStatus]);

  // Pagination logic
  const totalPages = Math.ceil(filteredItems.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const paginatedItems = filteredItems.slice(startIndex, endIndex);

  const handleBorrowItem = (_item: Item) => {
    navigate("/borrow");
  };

  const totalItems = items.length;
  const availableItems = items.filter((i) => i.status === "Tersedia").length;
  const borrowedItems = items.filter((i) => i.status === "Dipinjam").length;
  const damagedItems = items.filter(
    (i) => i.status === "Rusak" || i.status === "Hilang"
  ).length;

  return (
    <PublicLayout>
      <div className="space-y-8">
        {/* Hero Section */}
        <div className="bg-gradient-to-br from-primary/10 via-primary/5 to-transparent rounded-2xl p-8 border border-border shadow-custom">
          <div className="max-w-3xl">
            <div className="flex items-center gap-4 mb-4">
              <img
                src="/LOGOK5.png"
                alt="Logo SMKN 5 Malang"
                className="h-14 w-14 rounded-md border border-border bg-white object-contain shadow-sm"
              />
              <div>
                <p className="text-sm text-muted-foreground">Unit TKJ</p>
                <p className="text-lg font-semibold text-foreground">
                  SMKN 5 Malang
                </p>
              </div>
            </div>

            <h2 className="text-3xl font-bold mb-3">Selamat Datang!</h2>
            <p className="text-lg text-muted-foreground mb-6">
              Sistem peminjaman barang Unit TKJ SMKN 5 Malang. Pilih barang
              yang ingin dipinjam atau kembalikan barang yang sudah selesai
              digunakan.
            </p>

            <div className="flex flex-wrap gap-6 items-center">
              <Button
                size="lg"
                asChild
                className="shadow-md px-8 py-5 text-2xl md:text-2xl w-56 h-30 rounded-xl font-semibold md:w-auto transition-transform transform hover:scale-105"
              >
                <Link
                  to="/borrow"
                  className="flex items-center justify-center gap-3 w-full md:w-auto"
                >
                  <Package className="h-7 w-7" />
                  <span>Pinjam Barang</span>
                  <ArrowRight className="h-6 w-6" />
                </Link>
              </Button>

              <Button
                size="lg"
                variant="outline"
                asChild
                className="shadow-md px-8 py-5 text-2xl md:text-2xl rounded-xl h-30 font-semibold w-full md:w-auto transition-transform transform hover:scale-105"
              >
                <Link
                  to="/return"
                  className="flex items-center justify-center gap-3 w-full md:w-auto"
                >
                  <RotateCcw className="h-7 w-7" />
                  <span>Kembalikan Barang</span>
                  <ArrowRight className="h-6 w-6" />
                </Link>
              </Button>
            </div>
          </div>
        </div>

        {/* Stats Section */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-card border border-border rounded-lg p-4 shadow-sm">
            <div className="text-xs text-muted-foreground mb-1">
              Total Barang
            </div>
            <div className="text-2xl font-bold">{totalItems}</div>
          </div>
          <div className="bg-card border border-success/30 rounded-lg p-4 shadow-sm">
            <div className="text-xs text-success mb-1">Tersedia</div>
            <div className="text-2xl font-bold text-success">
              {availableItems}
            </div>
          </div>
          <div className="bg-card border border-warning/30 rounded-lg p-4 shadow-sm">
            <div className="text-xs text-warning mb-1">Dipinjam</div>
            <div className="text-2xl font-bold text-warning">
              {borrowedItems}
            </div>
          </div>
          <div className="bg-card border border-destructive/30 rounded-lg p-4 shadow-sm">
            <div className="text-xs text-destructive mb-1">Rusak/Hilang</div>
            <div className="text-2xl font-bold text-destructive">
              {damagedItems}
            </div>
          </div>
        </div>

        {/* Search & Filter Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-2xl font-bold">Daftar Barang</h3>
            <div className="text-sm text-muted-foreground">
              Menampilkan {startIndex + 1}-
              {Math.min(endIndex, filteredItems.length)} dari{" "}
              {filteredItems.length}
            </div>
          </div>

          <div className="flex flex-col md:flex-row gap-4 items-start md:items-center md:justify-between">
            <div className="relative max-w-md w-full md:w-auto">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Cari barang..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 w-full"
              />
            </div>

            <div className="flex gap-2 w-full md:w-auto">
              <Button
                variant={filterStatus === "semua" ? "default" : "outline"}
                size="sm"
                onClick={() => setFilterStatus("semua")}
              >
                Semua
              </Button>
              <Button
                variant={filterStatus === "Tersedia" ? "default" : "outline"}
                size="sm"
                onClick={() => setFilterStatus("Tersedia")}
                className={
                  filterStatus === "Tersedia"
                    ? "bg-success hover:bg-success/90"
                    : ""
                }
              >
                Tersedia
              </Button>
              <Button
                variant={filterStatus === "Dipinjam" ? "default" : "outline"}
                size="sm"
                onClick={() => setFilterStatus("Dipinjam")}
                className={
                  filterStatus === "Dipinjam"
                    ? "bg-warning hover:bg-warning/90"
                    : ""
                }
              >
                Dipinjam
              </Button>
            </div>
          </div>
        </div>

        {/* Items Grid */}
        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            <p className="text-muted-foreground mt-4">Memuat data...</p>
          </div>
        ) : paginatedItems.length > 0 ? (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {paginatedItems.map((item) => (
                <ItemCard
                  key={item.id}
                  item={item}
                  onBorrow={handleBorrowItem}
                />
              ))}
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 mt-8">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="h-4 w-4 mr-1" />
                  Sebelumnya
                </Button>

                <div className="flex gap-1">
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map(
                    (page) => (
                      <Button
                        key={page}
                        variant={currentPage === page ? "default" : "outline"}
                        size="sm"
                        onClick={() => setCurrentPage(page)}
                        className="w-10 h-10 p-0"
                      >
                        {page}
                      </Button>
                    )
                  )}
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setCurrentPage(Math.min(totalPages, currentPage + 1))
                  }
                  disabled={currentPage === totalPages}
                >
                  Selanjutnya
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-12">
            <Package className="h-16 w-16 text-muted-foreground/30 mx-auto mb-4" />
            <p className="text-lg font-medium text-muted-foreground">
              Tidak ada barang yang ditemukan
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              {searchQuery
                ? "Coba kata kunci pencarian yang lain"
                : "Tidak ada barang dengan status ini"}
            </p>
          </div>
        )}

        {/* Info Cards */}
        <div className="grid md:grid-cols-3 gap-4 mt-8">
          <div className="bg-card border border-border rounded-lg p-5 shadow-sm">
            <div className="flex items-center gap-3 mb-2">
              <div className="bg-primary/10 text-primary p-2 rounded-lg">
                <Package className="h-5 w-5" />
              </div>
              <h4 className="font-semibold">Pinjam Barang</h4>
            </div>
            <p className="text-sm text-muted-foreground">
              Scan barcode atau pilih barang untuk memulai proses peminjaman
            </p>
          </div>

          <div className="bg-card border border-border rounded-lg p-5 shadow-sm">
            <div className="flex items-center gap-3 mb-2">
              <div className="bg-success/10 text-success p-2 rounded-lg">
                <RotateCcw className="h-5 w-5" />
              </div>
              <h4 className="font-semibold">Kembalikan Barang</h4>
            </div>
            <p className="text-sm text-muted-foreground">
              Scan barcode barang yang ingin dikembalikan untuk proses
              pengembalian
            </p>
          </div>

          <div className="bg-card border border-border rounded-lg p-5 shadow-sm">
            <div className="flex items-center gap-3 mb-2">
              <div className="bg-warning/10 text-warning p-2 rounded-lg">
                <Search className="h-5 w-5" />
              </div>
              <h4 className="font-semibold">Status Barang</h4>
            </div>
            <p className="text-sm text-muted-foreground">
              Lihat status setiap barang: Tersedia, Dipinjam, Rusak, atau Hilang
            </p>
          </div>
        </div>
      </div>
    </PublicLayout>
  );
};

export default Home;
