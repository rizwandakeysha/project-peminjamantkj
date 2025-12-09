import { useState, useEffect } from "react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import AdminLayout from "@/layouts/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  Search,
  Download,
  Eye,
  Trash2,
  Calendar,
  ChevronsUpDown,
} from "lucide-react";
import { Borrowing } from "@/types";
import {
  mockDetailPeminjaman,
  mockBarang,
  mockJenisBarang,
  mockBorrowingsExtended,
} from "@/lib/mockData";
import { peminjamanAPI, barangAPI } from "@/lib/api";
import { toast } from "react-hot-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

const Borrowings = () => {
  const [borrowings, setBorrowings] = useState<Borrowing[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [periodFilter, setPeriodFilter] = useState<string>("all");
  const [periodDetailDate, setPeriodDetailDate] = useState<string>("");
  const [periodDetailMonth, setPeriodDetailMonth] = useState<string>(""); // yyyy-mm
  const [periodDetailWeekMonth, setPeriodDetailWeekMonth] =
    useState<string>(""); // yyyy-mm for week-in-month
  const [periodDetailWeekNumber, setPeriodDetailWeekNumber] =
    useState<number>(1);
  const [periodDetailYear, setPeriodDetailYear] = useState<number>(
    new Date().getFullYear()
  );
  const [selectedBorrowing, setSelectedBorrowing] = useState<Borrowing | null>(
    null
  );
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<number | null>(null);
  const [exportDialogOpen, setExportDialogOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState<string>("tanggal_pinjam");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  // Helper function to get date in Indonesia timezone (UTC+7)
  const getIndonesiaDate = (
    dateStr: string | null | undefined
  ): Date | null => {
    if (!dateStr) return null;
    try {
      // Parse as UTC
      const utcDate = new Date(dateStr);
      // Convert to Indonesia timezone (UTC+7)
      const indonesiaDate = new Date(utcDate.getTime() + 7 * 60 * 60 * 1000);
      return indonesiaDate;
    } catch (e) {
      return null;
    }
  };

  // Helper function to convert timestamp to local date
  const convertToLocalDate = (
    dateStr: string | null | undefined
  ): string | null => {
    if (!dateStr) return null;
    const date = getIndonesiaDate(dateStr);
    if (!date) return null;
    return date.toISOString().split("T")[0];
  };

  // Format tanggal untuk display dengan timezone conversion
  const formatTanggal = (dateStr: string | null | undefined): string => {
    if (!dateStr) return "-";
    const date = getIndonesiaDate(dateStr);
    if (!date) return dateStr;

    return date.toLocaleDateString("id-ID", {
      day: "2-digit",
      month: "short",
      year: "2-digit",
    });
  };

  useEffect(() => {
    fetchBorrowings();

    // Auto-refresh data setiap 30 detik untuk detect status changes dari return flow
    const interval = setInterval(() => {
      fetchBorrowings();
    }, 30000); // 30 seconds

    return () => clearInterval(interval);
  }, []);

  const fetchBorrowings = async () => {
    try {
      setLoading(true);
      const data = await peminjamanAPI.getAll();

      // Transform peminjaman with detail_peminjaman into flattened array for table display
      let flattenedBorrowings: any[] = [];

      if (data && Array.isArray(data) && data.length > 0) {
        // Transform structure: 1 peminjaman + multiple detail_peminjaman -> multiple rows in table
        data.forEach((pmj: any) => {
          if (pmj.detail_peminjaman && Array.isArray(pmj.detail_peminjaman)) {
            pmj.detail_peminjaman.forEach((detail: any) => {
              flattenedBorrowings.push({
                id: pmj.id_peminjaman,
                id_detail_peminjaman: detail.id_detail_peminjaman,
                kode_peminjaman: pmj.kode_peminjaman,
                id_barang: detail.id_barang,
                nama_peminjam: pmj.nama_peminjam,
                kontak: pmj.kontak,
                keperluan: pmj.keperluan,
                guru_pendamping: pmj.guru_pendamping,
                foto_credential: pmj.foto_credential,
                tanggal_pinjam: pmj.tanggal_pinjam,
                status_transaksi: pmj.status_transaksi,
                // Detail peminjaman fields (status di level barang, bukan transaksi)
                nama_barang: detail.nama_barang,
                kode_barang: detail.kode_barang,
                foto_barang: detail.foto_barang,
                status: detail.status, // Status detail (Dipinjam, Dikembalikan, etc)
                tanggal_kembali: detail.tanggal_kembali,
                foto_bukti_kembali: detail.foto_bukti_kembali,
                created_at: pmj.created_at,
                // Jenis Barang info from detail
                id_jenis_barang: detail.id_jenis_barang,
                nama_jenis_barang: detail.nama_jenis_barang,
              });
            });
          }
        });
        setBorrowings(flattenedBorrowings);
        // Store raw data for stats calculation (peminjaman header only)
        window.__peminjamanData = data;
      } else {
        // Fallback to mock
        setBorrowings(mockBorrowingsExtended as any);
      }
    } catch (error) {
      console.error("Error fetching borrowings:", error);
      toast.error("Gagal memuat data peminjaman");
      // Fallback to mock data
      setBorrowings(mockBorrowingsExtended as any);
    } finally {
      setLoading(false);
    }
  };

  const filteredBorrowings = borrowings.filter((borrowing) => {
    const q = searchQuery.toLowerCase().trim();

    // collect searchable fields and normalize to lowercase strings
    const fields: string[] = [
      borrowing.kode_peminjaman || "",
      borrowing.nama_peminjam || "",
      borrowing.nama_barang || "",
      borrowing.kontak || "",
      borrowing.keperluan || "",
      borrowing.guru_pendamping || "",
      borrowing.status || "",
      borrowing.tanggal_pinjam
        ? new Date(borrowing.tanggal_pinjam).toLocaleString("id-ID")
        : "",
      borrowing.tanggal_kembali
        ? new Date(borrowing.tanggal_kembali).toLocaleString("id-ID")
        : "",
    ].map((s) => String(s).toLowerCase());

    const matchesSearch = q === "" || fields.some((f) => f.includes(q));

    const matchesStatus =
      statusFilter === "all" || borrowing.status === statusFilter;

    // Period filter: hari/minggu/bulan/tahun applied to tanggal_pinjam with detail inputs
    const isInPeriod = (dateStr?: string | null, period?: string) => {
      if (!dateStr) return false;
      if (!period || period === "all") return true;

      // Convert UTC to Indonesia timezone (UTC+7) using helper
      const d = getIndonesiaDate(dateStr);
      if (!d) return false;

      // Use getDate/getMonth/getFullYear (local methods) since we manually adjusted the time
      const sameDay = (a: Date, b: Date) =>
        a.getFullYear() === b.getFullYear() &&
        a.getMonth() === b.getMonth() &&
        a.getDate() === b.getDate();

      if (period === "day") {
        if (!periodDetailDate) return false; // Must have date selected to filter by day
        // Parse selected date (YYYY-MM-DD format)
        const selDate = new Date(periodDetailDate);
        return sameDay(d, selDate);
      }

      if (period === "week") {
        if (!periodDetailWeekMonth) return false; // Must have month selected to filter by week
        // week-in-month: week 1 = days 1-7, week 2 = 8-14, etc.
        const [yStr, mStr] = periodDetailWeekMonth.split("-");
        const year = Number(yStr);
        const month = Number(mStr) - 1; // 0-based
        const wk = Number(periodDetailWeekNumber) || 1;
        const start = new Date(year, month, (wk - 1) * 7 + 1);
        start.setHours(0, 0, 0, 0);
        const end = new Date(year, month, wk * 7 + 1);
        end.setHours(0, 0, 0, 0);
        return d >= start && d < end;
      }

      if (period === "month") {
        if (!periodDetailMonth) return false; // Must have month selected to filter by month
        const [yStr, mStr] = periodDetailMonth.split("-");
        const year = Number(yStr);
        const month = Number(mStr) - 1;
        return d.getFullYear() === year && d.getMonth() === month;
      }

      if (period === "year") {
        if (!periodDetailYear) return false; // Must have year selected to filter by year
        return d.getFullYear() === Number(periodDetailYear);
      }

      return true;
    };

    const matchesPeriod =
      periodFilter === "all" ||
      isInPeriod(borrowing.tanggal_pinjam, periodFilter);

    return matchesSearch && matchesStatus && matchesPeriod;
  });

  // Sort the filtered list client-side. Clicking a header toggles asc/desc.
  const sortedBorrowings = [...filteredBorrowings].sort((a, b) => {
    const dir = sortDir === "asc" ? 1 : -1;
    const getVal = (obj: any, key: string) => {
      switch (key) {
        case "kode_peminjaman":
          return obj.kode_peminjaman || "";
        case "tanggal_pinjam":
          return obj.tanggal_pinjam
            ? new Date(obj.tanggal_pinjam).getTime()
            : 0;
        case "tanggal_kembali":
          return obj.tanggal_kembali
            ? new Date(obj.tanggal_kembali).getTime()
            : 0;
        case "nama_peminjam":
          return obj.nama_peminjam || "";
        case "nama_barang":
          return obj.nama_barang || "";
        case "jumlah":
          return Number(obj.jumlah) || 0;
        case "status":
          return obj.status || "";
        case "guru_pendamping":
          return obj.guru_pendamping || "";
        case "keperluan":
          return obj.keperluan || "";
        case "jenis_barang":
          return obj.jenis_barang || "";
        default:
          return obj[key] || "";
      }
    };

    const va = getVal(a, sortBy);
    const vb = getVal(b, sortBy);

    if (typeof va === "number" && typeof vb === "number") {
      return (va - vb) * dir;
    }

    return (
      String(va).toLowerCase().localeCompare(String(vb).toLowerCase()) * dir
    );
  });

  const handleSort = (key: string) => {
    if (sortBy === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortBy(key);
      setSortDir("asc");
    }
  };

  const handleViewDetail = (borrowing: Borrowing) => {
    setSelectedBorrowing(borrowing);
    setDetailDialogOpen(true);
  };

  const handleDelete = async () => {
    if (!itemToDelete) return;
    try {
      setLoading(true);
      await peminjamanAPI.delete(itemToDelete);
      setBorrowings(borrowings.filter((b) => b.id !== itemToDelete));
      toast.success("Data peminjaman berhasil dihapus!");
    } catch (error) {
      console.error("Error deleting borrowing:", error);
      toast.error("Gagal menghapus data peminjaman");
    } finally {
      setLoading(false);
    }
    setDeleteDialogOpen(false);
    setItemToDelete(null);
  };

  const exportToCSV = () => {
    const headers = [
      "No",
      "Kode Peminjaman",
      "Tanggal Pinjam",
      "Tanggal Kembali",
      "Nama Peminjam",
      "Kontak",
      "Barang",
      "Jumlah",
      "Keperluan",
      "Guru Pendamping",
      "Status",
    ];

    const rows: string[] = [];
    rows.push(headers.join(","));

    let globalIndex = 0;
    for (const borrowing of sortedBorrowings) {
      const details = mockDetailPeminjaman.filter(
        (d) => d.peminjaman_id === borrowing.id
      );
      if (details.length === 0) {
        globalIndex++;
        rows.push(
          [
            globalIndex,
            borrowing.kode_peminjaman,
            new Date(borrowing.tanggal_pinjam).toLocaleDateString("id-ID"),
            borrowing.tanggal_kembali
              ? new Date(borrowing.tanggal_kembali).toLocaleDateString("id-ID")
              : "-",
            `"${borrowing.nama_peminjam}"`,
            borrowing.kontak || "-",
            `"${borrowing.nama_barang}"`,
            borrowing.jumlah,
            `"${borrowing.keperluan}"`,
            `"${borrowing.guru_pendamping}"`,
            borrowing.status,
          ].join(",")
        );
      } else {
        // multiple rows: first row contains borrower info, subsequent rows have empty borrower columns
        for (let i = 0; i < details.length; i++) {
          const d = details[i];
          globalIndex++;
          rows.push(
            [
              globalIndex,
              borrowing.kode_peminjaman,
              new Date(borrowing.tanggal_pinjam).toLocaleDateString("id-ID"),
              borrowing.tanggal_kembali
                ? new Date(borrowing.tanggal_kembali).toLocaleDateString(
                    "id-ID"
                  )
                : "-",
              i === 0 ? `"${borrowing.nama_peminjam}"` : "",
              i === 0 ? borrowing.kontak || "-" : "",
              `"${d.nama_barang}"`,
              d.jumlah,
              i === 0 ? `"${borrowing.keperluan}"` : "",
              i === 0 ? `"${borrowing.guru_pendamping}"` : "",
              i === 0 ? borrowing.status : "",
            ].join(",")
          );
        }
      }
    }

    const csvContent = rows.join("\n");

    const blob = new Blob(["\uFEFF" + csvContent], {
      type: "text/csv;charset=utf-8;",
    });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `Data_Peminjaman_${
      new Date().toISOString().split("T")[0]
    }.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportToPDF = () => {
    const doc = new jsPDF({ orientation: "landscape" });

    doc.setFontSize(14);
    doc.text("Data Peminjaman Barang", 14, 15);

    // use columns + object-body API
    const columns = [
      { header: "No", dataKey: "no" },
      { header: "Kode Peminjaman", dataKey: "kode" },
      { header: "Nama Peminjam", dataKey: "nama" },
      { header: "Kontak", dataKey: "kontak" },
      { header: "Barang", dataKey: "barang" },
      { header: "Keperluan", dataKey: "keperluan" },
      { header: "Guru Pendamping", dataKey: "guru" },
      { header: "Tanggal Pinjam", dataKey: "pinjam" },
      { header: "Tanggal Kembali", dataKey: "kembali" },
      { header: "Status", dataKey: "status" },
    ];

    const bodyRows: any[] = [];
    let rowCounter = 0;

    for (const b of sortedBorrowings) {
      const details = mockDetailPeminjaman.filter(
        (d) => d.peminjaman_id === b.id
      );
      const datePinjam = new Date(b.tanggal_pinjam).toLocaleDateString("id-ID");
      const dateKembali = b.tanggal_kembali
        ? new Date(b.tanggal_kembali).toLocaleDateString("id-ID")
        : "-";

      if (details.length === 0) {
        rowCounter++;
        bodyRows.push({
          no: rowCounter,
          kode: b.kode_peminjaman,
          nama: b.nama_peminjam,
          kontak: b.kontak || "-",
          barang: b.nama_barang,
          keperluan: b.keperluan || "-",
          guru: b.guru_pendamping || "-",
          pinjam: datePinjam,
          kembali: dateKembali,
          status: b.status,
        });
      } else {
        for (let i = 0; i < details.length; i++) {
          const d = details[i];
          rowCounter++;
          if (i === 0) {
            // first row: include borrower fields and a hidden grouping marker
            bodyRows.push({
              __groupId: b.id,
              __groupSize: details.length,
              no: rowCounter,
              kode: b.kode_peminjaman,
              nama: b.nama_peminjam,
              kontak: b.kontak || "-",
              barang: d.nama_barang,
              keperluan: b.keperluan || "-",
              guru: b.guru_pendamping || "-",
              pinjam: datePinjam,
              kembali: dateKembali,
              status: b.status,
            });
          } else {
            // subsequent rows: only barang is filled; other fields empty
            bodyRows.push({
              __groupId: b.id,
              __groupSize: details.length,
              no: "",
              kode: "",
              nama: "",
              kontak: "",
              barang: d.nama_barang,
              keperluan: "",
              guru: "",
              pinjam: "",
              kembali: "",
              status: "",
            });
          }
        }
      }
    }

    // helpful debugging in browser console when export is triggered
    // eslint-disable-next-line no-console
    console.log("PDF export bodyRows:", bodyRows);

    autoTable(doc, {
      columns,
      body: bodyRows,
      startY: 25,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [78, 52, 46] },
      theme: "grid",
      didParseCell: function (data) {
        // only apply rowSpan for body cells that belong to a grouped borrowing
        if (data.section === "body") {
          const raw = data.row.raw as any;
          if (raw && raw.__groupId && raw.__groupSize && raw.__groupSize > 1) {
            // columns to merge vertically on grouped rows (all borrower-related cols)
            const mergeKeys = [
              "no",
              "kode",
              "nama",
              "kontak",
              "keperluan",
              "guru",
              "pinjam",
              "kembali",
              "status",
            ];
            const key = data.column.dataKey as string;
            // first row of group has actual content for these keys; detect via raw[key] !== ''
            if (mergeKeys.includes(key) && raw[key] !== "") {
              data.cell.rowSpan = raw.__groupSize;
            }
          }
        }
      },
    });

    doc.save(`Data_Peminjaman_${new Date().toISOString().split("T")[0]}.pdf`);
    toast.success("Data berhasil diexport ke PDF!");
  };

  // helper to escape HTML in table cells
  function escapeHtml(str: string) {
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  const handleExport = (format: "csv" | "pdf") => {
    try {
      if (format === "pdf") {
        setExportDialogOpen(false);
        exportToPDF();
        return;
      }

      setExportDialogOpen(false);
      exportToCSV();
    } catch (error) {
      console.error("Error exporting data:", error);
      toast.error("Gagal mengeksport data");
    }
  };

  console.log("📄 Mulai export PDF...", sortedBorrowings.length);

  // Calculate stats dari detail_peminjaman status
  // Count items (detail_peminjaman) berdasarkan status, bukan transaction count
  const peminjamanData = (window as any).__peminjamanData || [];

  let itemsSedangDipinjam = 0;
  let itemsSudahDikembalikan = 0;

  peminjamanData.forEach((pmj: any) => {
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

  const stats = {
    total: peminjamanData.length, // Total unique peminjaman transactions
    active: itemsSedangDipinjam, // Count of items being borrowed
    completed: itemsSudahDikembalikan, // Count of items returned
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold mb-2">Kelola Peminjaman</h2>
            <p className="text-muted-foreground">
              Lihat dan kelola semua transaksi peminjaman barang
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              size="lg"
              variant="outline"
              onClick={() => {
                setLoading(true);
                fetchBorrowings().finally(() => setLoading(false));
              }}
              disabled={loading}
              className="shadow-md"
            >
              {loading ? "Memuat..." : "Refresh"}
            </Button>
            <Button
              size="lg"
              onClick={() => setExportDialogOpen(true)}
              className="shadow-md"
            >
              <Download className="h-5 w-5 mr-2" />
              Export Data
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Transaksi
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stats.total}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Barang Sedang Dipinjam
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-warning">
                {stats.active}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Barang Sudah Dikembalikan
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-success">
                {stats.completed}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Cari apapun..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <div className="flex gap-2 w-full md:w-auto">
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-full md:w-[200px]">
                    <SelectValue placeholder="Filter Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Semua Status</SelectItem>
                    <SelectItem value="Dipinjam">Dipinjam</SelectItem>
                    <SelectItem value="Dikembalikan">Dikembalikan</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            {/* Period selector under search with inline detail control */}
            <div className="mt-3 flex flex-col md:flex-row items-start gap-3">
              <div className="w-full md:w-1/4">
                <label className="text-xs text-muted-foreground">
                  Filter Periode
                </label>
                <Select value={periodFilter} onValueChange={setPeriodFilter}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Pilih Periode" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Semua Periode</SelectItem>
                    <SelectItem value="day">Hari</SelectItem>
                    <SelectItem value="week">
                      Minggu (ke dalam bulan)
                    </SelectItem>
                    <SelectItem value="month">Bulan</SelectItem>
                    <SelectItem value="year">Tahun</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex-1 flex gap-3">
                {periodFilter === "day" && (
                  <div className="w-full md:w-1/3">
                    <label className="text-xs text-muted-foreground">
                      Pilih Tanggal
                    </label>
                    <input
                      type="date"
                      className="w-full mt-1 input"
                      value={periodDetailDate}
                      onChange={(e) => setPeriodDetailDate(e.target.value)}
                    />
                  </div>
                )}

                {periodFilter === "week" && (
                  <>
                    <div className="w-full md:w-1/3">
                      <label className="text-xs text-muted-foreground">
                        Pilih Bulan
                      </label>
                      <input
                        type="month"
                        className="w-full mt-1 input"
                        value={periodDetailWeekMonth}
                        onChange={(e) =>
                          setPeriodDetailWeekMonth(e.target.value)
                        }
                      />
                    </div>
                    <div className="w-28">
                      <label className="text-xs text-muted-foreground">
                        Minggu ke
                      </label>
                      <Select
                        value={String(periodDetailWeekNumber)}
                        onValueChange={(v) =>
                          setPeriodDetailWeekNumber(Number(v))
                        }
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="1">1</SelectItem>
                          <SelectItem value="2">2</SelectItem>
                          <SelectItem value="3">3</SelectItem>
                          <SelectItem value="4">4</SelectItem>
                          <SelectItem value="5">5</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </>
                )}

                {periodFilter === "month" && (
                  <div className="w-full md:w-1/3">
                    <label className="text-xs text-muted-foreground">
                      Pilih Bulan
                    </label>
                    <input
                      type="month"
                      className="w-full mt-1 input"
                      value={periodDetailMonth}
                      onChange={(e) => setPeriodDetailMonth(e.target.value)}
                    />
                  </div>
                )}

                {periodFilter === "year" && (
                  <div className="w-44">
                    <label className="text-xs text-muted-foreground">
                      Pilih Tahun
                    </label>
                    <input
                      type="number"
                      min="2000"
                      max="2100"
                      className="w-full mt-1 input"
                      value={periodDetailYear}
                      onChange={(e) =>
                        setPeriodDetailYear(Number(e.target.value))
                      }
                    />
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Table */}
        <Card>
          <CardHeader>
            <CardTitle>
              Daftar Peminjaman ({filteredBorrowings.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="w-full">
              <Table className="table-fixed w-full">
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[3%]">No</TableHead>
                    <TableHead className="w-[5%]">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="-ml-3 h-8"
                        onClick={() => handleSort("kode_peminjaman")}
                      >
                        Kode
                        <ChevronsUpDown className="ml-1 h-3 w-3" />
                      </Button>
                    </TableHead>
                    <TableHead className="w-[5%]">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="-ml-5 h-8"
                        onClick={() => handleSort("tanggal_pinjam")}
                      >
                        Pinjam
                        <ChevronsUpDown className="ml-1 h-3 w-3" />
                      </Button>
                    </TableHead>
                    <TableHead className="w-[5%]">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="-ml-5 h-8"
                        onClick={() => handleSort("tanggal_kembali")}
                      >
                        Kembali
                        <ChevronsUpDown className="ml-1 h-3 w-3" />
                      </Button>
                    </TableHead>
                    <TableHead className="w-[8%]">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="-ml-3 h-8"
                        onClick={() => handleSort("nama_peminjam")}
                      >
                        Peminjam
                        <ChevronsUpDown className="ml-1 h-3 w-3" />
                      </Button>
                    </TableHead>
                    <TableHead className="w-[5%]">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="-ml-3 h-8"
                        onClick={() => handleSort("guru_pendamping")}
                      >
                        Guru
                        <ChevronsUpDown className="ml-1 h-3 w-3" />
                      </Button>
                    </TableHead>
                    <TableHead className="w-[5%]">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="-ml-3 h-8"
                        onClick={() => handleSort("jenis_barang")}
                      >
                        Jenis
                        <ChevronsUpDown className="ml-1 h-3 w-3" />
                      </Button>
                    </TableHead>
                    <TableHead className="w-[7%]">Barang</TableHead>
                    <TableHead className="w-[8%]">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="-ml-3 h-8"
                        onClick={() => handleSort("keperluan")}
                      >
                        Keperluan
                        <ChevronsUpDown className="ml-1 h-3 w-3" />
                      </Button>
                    </TableHead>
                    <TableHead className="w-[7%]">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="-ml-3 h-8"
                        onClick={() => handleSort("status")}
                      >
                        Status
                        <ChevronsUpDown className="ml-1 h-3 w-3" />
                      </Button>
                    </TableHead>
                    <TableHead className="text-right w-[5%]">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedBorrowings.map((borrowing: any, index) => {
                    return (
                      <TableRow key={borrowing.id}>
                        <TableCell className="text-center text-sm p-2">
                          {index + 1}
                        </TableCell>

                        <TableCell className="p-2">
                          <code className="text-xs bg-muted px-1.5 py-0.5 rounded font-mono break-all">
                            {borrowing.kode_peminjaman}
                          </code>
                        </TableCell>

                        <TableCell className="p-2">
                          <div className="text-xs">
                            {formatTanggal(borrowing.tanggal_pinjam)}
                          </div>
                        </TableCell>

                        <TableCell className="p-2">
                          {borrowing.tanggal_kembali ? (
                            <div className="text-xs">
                              {formatTanggal(borrowing.tanggal_kembali)}
                            </div>
                          ) : (
                            <div className="text-xs text-muted-foreground">
                              -
                            </div>
                          )}
                        </TableCell>

                        <TableCell className="p-2">
                          <div className="flex items-start gap-2">
                            {borrowing.foto_credential && (
                              <img
                                src={borrowing.foto_credential}
                                alt={borrowing.nama_peminjam}
                                className="w-8 h-8 rounded-full object-cover aspect-square flex-shrink-0"
                              />
                            )}
                            <div className="min-w-0 flex-1">
                              <div className="font-medium text-xs break-words">
                                {borrowing.nama_peminjam}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {borrowing.nip_nis}
                              </div>
                            </div>
                          </div>
                        </TableCell>

                        <TableCell className="text-xs p-2 break-words">
                          {borrowing.guru_pendamping || "-"}
                        </TableCell>

                        <TableCell className="p-2">
                          {borrowing.nama_jenis_barang ? (
                            <div>
                              <div className="font-medium text-xs break-words">
                                {borrowing.nama_jenis_barang}
                              </div>
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground">
                              -
                            </span>
                          )}
                        </TableCell>

                        <TableCell className="p-2">
                          <div className="text-xs break-words">
                            {borrowing.nama_barang || "-"}
                          </div>
                        </TableCell>

                        <TableCell className="text-xs p-2 break-words">
                          {borrowing.keperluan}
                        </TableCell>

                        <TableCell>
                          <Badge
                            variant={
                              borrowing.status === "Dipinjam"
                                ? "default"
                                : "secondary"
                            }
                            className={
                              borrowing.status === "Dipinjam"
                                ? "bg-warning"
                                : "bg-success"
                            }
                          >
                            {borrowing.status}
                          </Badge>
                        </TableCell>

                        <TableCell className="text-right">
                          <div className="flex gap-1 justify-end">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() =>
                                handleViewDetail(borrowing as Borrowing)
                              }
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <AlertDialog
                              open={
                                deleteDialogOpen &&
                                itemToDelete === borrowing.id
                              }
                              onOpenChange={(open) => {
                                setDeleteDialogOpen(open);
                                if (!open) setItemToDelete(null);
                              }}
                            >
                              <AlertDialogTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="text-destructive hover:text-destructive"
                                  onClick={() => setItemToDelete(borrowing.id)}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>
                                    Konfirmasi Hapus Peminjaman
                                  </AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Apakah Anda yakin ingin menghapus data
                                    peminjaman{" "}
                                    <strong>{borrowing.kode_peminjaman}</strong>
                                    ? Tindakan ini tidak dapat dibatalkan.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Batal</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={handleDelete}
                                    className="bg-destructive hover:bg-destructive/90"
                                  >
                                    Hapus
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* Detail Dialog */}
        <Dialog open={detailDialogOpen} onOpenChange={setDetailDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
            <DialogHeader>
              <DialogTitle>Detail Peminjaman</DialogTitle>
            </DialogHeader>
            {selectedBorrowing && (
              <div className="space-y-4 overflow-y-auto flex-1 pr-2">
                <div className="bg-accent/50 p-4 rounded-lg">
                  <div className="text-center mb-2">
                    <code className="text-lg font-mono font-bold">
                      {selectedBorrowing.kode_peminjaman}
                    </code>
                  </div>
                  <div className="flex justify-center">
                    <Badge
                      variant={
                        selectedBorrowing.status === "Dipinjam"
                          ? "default"
                          : "secondary"
                      }
                      className={
                        selectedBorrowing.status === "Dipinjam"
                          ? "bg-warning"
                          : "bg-success"
                      }
                    >
                      {selectedBorrowing.status}
                    </Badge>
                  </div>
                </div>

                {/* Detail list of items for this borrowing (detail_peminjaman) */}
                <div>
                  <h4 className="font-semibold mb-3">
                    Daftar Barang dalam Transaksi
                  </h4>
                  <div className="space-y-2">
                    {mockDetailPeminjaman
                      .filter((d) => d.peminjaman_id === selectedBorrowing.id)
                      .map((d) => {
                        const item = mockBarang.find(
                          (b) => b.id_barang === d.id_barang
                        );
                        const jenis = item
                          ? mockJenisBarang.find(
                              (j) => j.id_jenis_barang === item.id_jenis_barang
                            )
                          : undefined;
                        return (
                          <div
                            key={`${d.peminjaman_id}-${d.id_barang}`}
                            className="flex items-center gap-3 p-2 border rounded"
                          >
                            {item?.foto_barang && (
                              <img
                                src={item.foto_barang}
                                alt={d.nama_barang}
                                className="w-16 h-16 object-cover rounded"
                              />
                            )}
                            <div className="flex-1">
                              <div className="font-medium">{d.nama_barang}</div>
                              <div className="text-xs text-muted-foreground">
                                Kode:{" "}
                                <code className="font-mono">
                                  {d.kode_barang}
                                </code>
                              </div>
                              {jenis && (
                                <div className="text-xs text-muted-foreground">
                                  Jenis: {jenis.nama_jenis_barang}
                                </div>
                              )}
                            </div>
                            <div className="text-sm">x{d.jumlah}</div>
                          </div>
                        );
                      })}
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <h4 className="font-semibold mb-3">Informasi Peminjam</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Nama:</span>
                        <span className="font-medium">
                          {selectedBorrowing.nama_peminjam}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Kontak:</span>
                        <span className="font-medium">
                          {selectedBorrowing.kontak}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Guru:</span>
                        <span className="font-medium">
                          {selectedBorrowing.guru_pendamping}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h4 className="font-semibold mb-3">Informasi Barang</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Barang:</span>
                        <span className="font-medium">
                          {selectedBorrowing.nama_barang}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Jumlah:</span>
                        <span className="font-medium">
                          {selectedBorrowing.jumlah}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">
                          Keperluan:
                        </span>
                        <span className="font-medium">
                          {selectedBorrowing.keperluan}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="font-semibold mb-3">Timeline</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">
                        Tanggal Pinjam:
                      </span>
                      <span className="font-medium">
                        {new Date(
                          selectedBorrowing.tanggal_pinjam
                        ).toLocaleString("id-ID")}
                      </span>
                    </div>
                    {selectedBorrowing.tanggal_kembali && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">
                          Tanggal Kembali:
                        </span>
                        <span className="font-medium">
                          {new Date(
                            selectedBorrowing.tanggal_kembali
                          ).toLocaleString("id-ID")}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {selectedBorrowing.foto_credential && (
                  <div>
                    <h4 className="font-semibold mb-3">Foto Credential</h4>
                    <img
                      src={selectedBorrowing.foto_credential}
                      alt="Credential"
                      className="w-full rounded-lg border border-border"
                    />
                  </div>
                )}

                <Button
                  onClick={() => setDetailDialogOpen(false)}
                  className="w-full"
                >
                  Tutup
                </Button>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Export Dialog */}
        <Dialog open={exportDialogOpen} onOpenChange={setExportDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Export Data Peminjaman</DialogTitle>
            </DialogHeader>
            <div className="space-y-3 py-4">
              <p className="text-sm text-muted-foreground">
                Pilih format file untuk export data peminjaman
              </p>
              <div className="space-y-2">
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => handleExport("csv")}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Export ke CSV
                </Button>
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => handleExport("pdf")}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Export ke PDF
                </Button>
              </div>
            </div>
            <div className="flex justify-end">
              <Button
                variant="outline"
                onClick={() => setExportDialogOpen(false)}
              >
                Batal
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
};

export default Borrowings;
