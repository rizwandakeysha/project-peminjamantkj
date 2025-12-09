import { useState, useEffect } from "react";
import AdminLayout from "@/layouts/AdminLayout";
import { barangAPI, jenisBarangAPI } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Package,
  Edit2,
  Trash2,
  Eye,
  Plus,
  QrCode,
  Barcode,
} from "lucide-react";
import { mockJenisBarang, mockBarang } from "@/lib/mockData";
import {
  createSimpleLabelDataURL,
  downloadSimpleLabelPNG,
} from "@/lib/qrUtils";
import { createBarcodeDataURL, downloadBarcodePNG } from "@/lib/barcodeUtils";
import { toast } from "react-hot-toast";

// Helper function to generate kode_jenis_barang from nama (4 most representative letters with TKJ- prefix)
const generateKodeJenis = (namaJenis: string): string => {
  // Split by spaces and get first letter of each word
  const words = namaJenis.trim().split(/\s+/);
  let kode = "";

  // Try to get 4 letters from first letters of words
  for (const word of words) {
    if (kode.length < 4 && word.length > 0) {
      kode += word[0].toUpperCase();
    }
  }

  // If still less than 4, use first 4 chars of the name
  if (kode.length < 4) {
    kode = namaJenis
      .replace(/[^A-Za-z]/g, "")
      .substring(0, 4)
      .toUpperCase();
  }

  // Ensure exactly 4 characters
  if (kode.length > 4) {
    kode = kode.substring(0, 4);
  }

  return `TKJ-${kode}`;
};

// Helper function to generate kode_barang from kode_jenis (AAAA-1, AAAA-2, etc)
const generateKodeBarang = (
  kodeJenis: string,
  barangListForJenis: any[]
): string => {
  // Count existing barang for this jenis with same kode prefix
  const prefix = kodeJenis.split("-").pop() || kodeJenis; // Get AAAA part
  const count = barangListForJenis.filter((b) =>
    b.kode_barang?.startsWith(prefix)
  ).length;
  return `${prefix}-${count + 1}`;
};

const Items = () => {
  const [jenisBarangList, setJenisBarangList] = useState<any[]>([]);
  const [barangList, setBarangList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch data from API on component mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [jenisData, barangData] = await Promise.all([
          jenisBarangAPI.getAll(),
          barangAPI.getAll(),
        ]);

        // Map backend jenis format to local format
        const mappedJenis = jenisData.map((j: any) => ({
          id_jenis_barang: j.id,
          kode_jenis_barang: j.kode_jenis || j.kode_jenis_barang,
          nama_jenis_barang: j.nama_jenis || j.nama_jenis_barang,
          deskripsi_jenis_barang: j.deskripsi || j.deskripsi_jenis_barang,
          created_at: j.created_at,
        }));

        setJenisBarangList(
          mappedJenis.length > 0 ? mappedJenis : mockJenisBarang
        );
        setBarangList(barangData);
      } catch (error) {
        console.error("Error fetching data:", error);
        toast.error("Gagal memuat data dari server");
        // Fallback to mock data
        setJenisBarangList(mockJenisBarang);
        setBarangList(mockBarang);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Dialog states
  const [selectedJenisId, setSelectedJenisId] = useState<number | null>(null);
  const [showBarangDialog, setShowBarangDialog] = useState(false);
  const [showAddJenisDialog, setShowAddJenisDialog] = useState(false);
  const [showAddBarangDialog, setShowAddBarangDialog] = useState(false);
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [showImportJenisBarangDialog, setShowImportJenisBarangDialog] =
    useState(false);
  const [editingBarang, setEditingBarang] = useState<any | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{
    type: "jenis" | "barang";
    id: number;
  } | null>(null);
  const [qrDialogOpenForJenis, setQrDialogOpenForJenis] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [qrLabelName, setQrLabelName] = useState<string>("");
  const [qrJenisKode, setQrJenisKode] = useState<string>("");
  const [qrJenisNama, setQrJenisNama] = useState<string>("");
  // barcode dialog states for barang
  const [barcodeDialogOpen, setBarcodeDialogOpen] = useState(false);
  const [barcodeDataUrl, setBarcodeDataUrl] = useState<string | null>(null);
  const [barcodeKode, setBarcodeKode] = useState<string>("");
  const [barcodeNama, setBarcodeNama] = useState<string>("");

  // Form states
  const [jenisFormData, setJenisFormData] = useState({
    nama_jenis_barang: "",
    deskripsi_jenis_barang: "",
  });

  const [barangFormData, setBarangFormData] = useState({
    nama_barang: "",
    kode_barang: "",
    no_serial_number: "",
    deskripsi_barang: "",
    status: "Tersedia",
    foto_barang: "",
  });

  // Get barang for selected jenis
  const getBarangForJenis = (jenisId: number) => {
    return barangList.filter((b) => b.id_jenis_barang === jenisId);
  };

  // Get jenis name
  const getJenisName = (jenisId: number) => {
    return (
      jenisBarangList.find((j) => j.id_jenis_barang === jenisId)
        ?.nama_jenis_barang || ""
    );
  };

  // ===== JENIS BARANG HANDLERS =====
  const handleEditJenis = (jenis: any) => {
    setJenisFormData({
      nama_jenis_barang: jenis.nama_jenis_barang,
      deskripsi_jenis_barang: jenis.deskripsi_jenis_barang || "",
    });
    setSelectedJenisId(jenis.id_jenis_barang);
    setShowAddJenisDialog(true);
  };

  const handleSaveJenis = async () => {
    if (!jenisFormData.nama_jenis_barang.trim()) {
      toast.error("Nama jenis barang tidak boleh kosong");
      return;
    }

    try {
      setLoading(true);
      if (selectedJenisId) {
        // Update jenis barang via API
        await jenisBarangAPI.update(selectedJenisId, {
          nama_jenis: jenisFormData.nama_jenis_barang,
          deskripsi: jenisFormData.deskripsi_jenis_barang,
        });
        setJenisBarangList(
          jenisBarangList.map((j) =>
            j.id_jenis_barang === selectedJenisId
              ? { ...j, ...jenisFormData }
              : j
          )
        );
        toast.success("Jenis barang berhasil diupdate!");
      } else {
        // Create jenis barang via API with auto-generated kode
        const generatedKode = generateKodeJenis(
          jenisFormData.nama_jenis_barang
        );
        const newJenis = await jenisBarangAPI.create({
          kode_jenis: generatedKode,
          nama_jenis: jenisFormData.nama_jenis_barang,
          deskripsi: jenisFormData.deskripsi_jenis_barang,
        });

        // Map response to local format
        const mappedJenis = {
          id_jenis_barang: newJenis.id,
          kode_jenis_barang: newJenis.kode_jenis || generatedKode,
          nama_jenis_barang:
            newJenis.nama_jenis || jenisFormData.nama_jenis_barang,
          deskripsi_jenis_barang:
            newJenis.deskripsi || jenisFormData.deskripsi_jenis_barang,
          created_at: newJenis.created_at,
        };

        setJenisBarangList([...jenisBarangList, mappedJenis]);
        toast.success(
          `Jenis barang berhasil ditambahkan! (Kode: ${mappedJenis.kode_jenis_barang})`
        );
      }
    } catch (error) {
      console.error("Error saving jenis barang:", error);
      toast.error("Gagal menyimpan jenis barang");
    } finally {
      setLoading(false);
    }

    setShowAddJenisDialog(false);
    setJenisFormData({ nama_jenis_barang: "", deskripsi_jenis_barang: "" });
    setSelectedJenisId(null);

    setShowAddJenisDialog(false);
    setJenisFormData({ nama_jenis_barang: "", deskripsi_jenis_barang: "" });
    setSelectedJenisId(null);
  };

  const handleDeleteJenis = async (jenisId: number) => {
    try {
      setLoading(true);
      await jenisBarangAPI.delete(jenisId);
      setJenisBarangList(
        jenisBarangList.filter((j) => j.id_jenis_barang !== jenisId)
      );
      setBarangList(barangList.filter((b) => b.id_jenis_barang !== jenisId));
      toast.success("Jenis barang berhasil dihapus!");
      setDeleteTarget(null);
    } catch (error) {
      console.error("Error deleting jenis barang:", error);
      toast.error("Gagal menghapus jenis barang");
    } finally {
      setLoading(false);
    }
  };

  const handleFotoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Ukuran file maksimal 5MB");
      return;
    }

    // Validate file type
    if (!file.type.startsWith("image/")) {
      toast.error("File harus berupa gambar (JPG, PNG, GIF, dll)");
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const base64String = e.target?.result as string;
      setBarangFormData({ ...barangFormData, foto_barang: base64String });
    };
    reader.readAsDataURL(file);
  };

  // ===== BARANG HANDLERS =====
  const handleAddBarang = async () => {
    if (!barangFormData.nama_barang.trim()) {
      toast.error("Nama barang tidak boleh kosong");
      return;
    }

    try {
      setLoading(true);
      if (editingBarang) {
        // Update barang via API
        await barangAPI.update(editingBarang.id_barang, {
          ...barangFormData,
          status: barangFormData.status as
            | "Dipinjam"
            | "Tersedia"
            | "Rusak"
            | "Hilang",
        });
        setBarangList(
          barangList.map((b) =>
            b.id_barang === editingBarang.id_barang
              ? { ...b, ...barangFormData }
              : b
          )
        );
        toast.success("Barang berhasil diupdate!");
      } else {
        // Create barang via API with auto-generated kode_barang
        const jenisBarang = jenisBarangList.find(
          (j) => j.id_jenis_barang === selectedJenisId
        );
        const kodeJenis = jenisBarang?.kode_jenis_barang || "";
        const barangForJenis = barangList.filter(
          (b) => b.id_jenis_barang === selectedJenisId
        );
        const generatedKode = generateKodeBarang(kodeJenis, barangForJenis);

        const newBarang = {
          id_jenis_barang: selectedJenisId || 1,
          kode_barang: generatedKode,
          nama_barang: barangFormData.nama_barang,
          no_serial_number: barangFormData.no_serial_number,
          deskripsi_barang: barangFormData.deskripsi_barang,
          status: barangFormData.status as
            | "Dipinjam"
            | "Tersedia"
            | "Rusak"
            | "Hilang",
          foto_barang:
            barangFormData.foto_barang ||
            "https://images.unsplash.com/photo-1581092160562-40aa08e78837?w=400",
        };
        const createdBarang = await barangAPI.create(newBarang);
        setBarangList([...barangList, createdBarang]);
        toast.success(`Barang berhasil ditambahkan! (Kode: ${generatedKode})`);
      }
    } catch (error) {
      console.error("Error saving barang:", error);
      toast.error("Gagal menyimpan barang");
    } finally {
      setLoading(false);
    }

    setShowAddBarangDialog(false);
    setBarangFormData({
      nama_barang: "",
      kode_barang: "",
      no_serial_number: "",
      deskripsi_barang: "",
      status: "Tersedia",
      foto_barang: "",
    });
    setEditingBarang(null);
  };

  // ===== JENIS QR HANDLERS =====
  const handleShowJenisQR = async (kode: string, nama: string) => {
    try {
      // small label preview
      const dataUrl = await createSimpleLabelDataURL(kode, nama, {
        width: 720,
        height: 920,
      });
      setQrDataUrl(dataUrl);
      setQrLabelName(`${kode}-${nama}`.replace(/\s+/g, "-"));
      setQrJenisKode(kode);
      setQrJenisNama(nama);
      setQrDialogOpenForJenis(true);
    } catch (err) {
      console.error("Gagal membuat QR jenis:", err);
      toast.error("Gagal membuat QR untuk jenis barang");
    }
  };

  const handleDownloadJenisQR = async (kode: string, nama: string) => {
    try {
      await downloadSimpleLabelPNG(kode, nama, `jenis-${kode}`);
      toast.success("QR jenis berhasil diunduh");
    } catch (err) {
      console.error("Gagal mengunduh QR jenis:", err);
      toast.error("Gagal mengunduh QR jenis");
    }
  };

  const handleEditBarang = (barang: any) => {
    setBarangFormData({
      nama_barang: barang.nama_barang,
      kode_barang: barang.kode_barang,
      no_serial_number: barang.no_serial_number || "",
      deskripsi_barang: barang.deskripsi_barang || "",
      status: barang.status,
      foto_barang: barang.foto_barang || "",
    });
    setEditingBarang(barang);
    setShowAddBarangDialog(true);
  };

  const handleDeleteBarang = async (id: number) => {
    try {
      setLoading(true);
      await barangAPI.delete(id);
      // Filter using both id and id_barang for compatibility
      setBarangList(
        barangList.filter((b) => b.id !== id && b.id_barang !== id)
      );
      toast.success("Barang berhasil dihapus!");
      setDeleteTarget(null);
    } catch (error) {
      console.error("Error deleting barang:", error);
      toast.error("Gagal menghapus barang");
    } finally {
      setLoading(false);
    }
  };

  const handleImportBarang = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file || !selectedJenisId) return;

    try {
      setLoading(true);
      const text = await file.text();
      const lines = text.trim().split("\n");

      if (lines.length < 2) {
        toast.error("File CSV harus memiliki header dan minimal 1 data");
        return;
      }

      // Parse CSV header
      const headers = lines[0].split(",").map((h) => h.trim().toLowerCase());
      const namaIndex = headers.indexOf("nama_barang");
      const seriesIndex = headers.indexOf("no_serial_number");
      const deskIndex = headers.indexOf("deskripsi_barang");
      const statusIndex = headers.indexOf("status");
      const fotoIndex = headers.indexOf("foto_barang");

      if (namaIndex === -1) {
        toast.error("CSV harus memiliki kolom 'nama_barang'");
        return;
      }

      // Get kode_jenis for auto-generating kode_barang
      const jenisBarang = jenisBarangList.find(
        (j) => j.id_jenis_barang === selectedJenisId
      );
      const kodeJenis = jenisBarang?.kode_jenis_barang || "";
      const currentBarangForJenis = barangList.filter(
        (b) => b.id_jenis_barang === selectedJenisId
      );

      // Parse data rows
      const newBarang: any[] = [];
      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(",").map((v) => v.trim());
        if (values.length > 1 && values[namaIndex]) {
          // Auto-generate kode_barang
          const barangForThisJenis = [...currentBarangForJenis, ...newBarang];
          const generatedKode = generateKodeBarang(
            kodeJenis,
            barangForThisJenis
          );

          const barang = {
            id_jenis_barang: selectedJenisId,
            nama_barang: values[namaIndex] || "",
            kode_barang: generatedKode,
            no_serial_number: seriesIndex !== -1 ? values[seriesIndex] : "",
            deskripsi_barang: deskIndex !== -1 ? values[deskIndex] : "",
            status: (statusIndex !== -1 ? values[statusIndex] : "Tersedia") as
              | "Dipinjam"
              | "Tersedia"
              | "Rusak"
              | "Hilang",
            foto_barang: fotoIndex !== -1 ? values[fotoIndex] : "",
          };
          newBarang.push(barang);
        }
      }

      if (newBarang.length === 0) {
        toast.error("Tidak ada data yang berhasil diparse");
        return;
      }

      // Create all items via API
      const createdBarang: any[] = [];
      for (const barang of newBarang) {
        const created = await barangAPI.create(barang);
        createdBarang.push(created);
      }

      setBarangList([...barangList, ...createdBarang]);
      toast.success(`${createdBarang.length} barang berhasil diimport!`);
      setShowImportDialog(false);
      event.target.value = "";
    } catch (error) {
      console.error("Error importing:", error);
      toast.error("Gagal mengimport file. Pastikan format CSV benar.");
    } finally {
      setLoading(false);
    }
  };

  // Handler untuk import jenis barang dan barang sekaligus
  const handleImportJenisBarang = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setLoading(true);
      const text = await file.text();
      const lines = text.trim().split("\n");

      if (lines.length < 2) {
        toast.error("File CSV harus memiliki header dan minimal 1 data");
        return;
      }

      // Parse CSV header
      const headers = lines[0].split(",").map((h) => h.trim().toLowerCase());
      const jenisIndex = headers.indexOf("jenis_barang");
      const deskJenisIndex = headers.indexOf("deskripsi_jenis");
      const namaIndex = headers.indexOf("nama_barang");
      const seriesIndex = headers.indexOf("no_serial_number");
      const deskIndex = headers.indexOf("deskripsi_barang");
      const statusIndex = headers.indexOf("status");
      const fotoIndex = headers.indexOf("foto_barang");

      if (jenisIndex === -1 || namaIndex === -1) {
        toast.error(
          "CSV harus memiliki kolom 'jenis_barang' dan 'nama_barang'"
        );
        return;
      }

      // Parse data rows dan group by jenis_barang
      const jenisMap = new Map<string, { deskripsi: string; barang: any[] }>();

      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(",").map((v) => v.trim());
        if (values.length > 1 && values[jenisIndex] && values[namaIndex]) {
          const jenisBaek = values[jenisIndex];
          const deskJenis = deskJenisIndex !== -1 ? values[deskJenisIndex] : "";

          if (!jenisMap.has(jenisBaek)) {
            jenisMap.set(jenisBaek, { deskripsi: deskJenis, barang: [] });
          }

          const barangData = {
            nama_barang: values[namaIndex],
            no_serial_number: seriesIndex !== -1 ? values[seriesIndex] : "",
            deskripsi_barang: deskIndex !== -1 ? values[deskIndex] : "",
            status: (statusIndex !== -1 ? values[statusIndex] : "Tersedia") as
              | "Dipinjam"
              | "Tersedia"
              | "Rusak"
              | "Hilang",
            foto_barang: fotoIndex !== -1 ? values[fotoIndex] : "",
          };

          jenisMap.get(jenisBaek)!.barang.push(barangData);
        }
      }

      if (jenisMap.size === 0) {
        toast.error("Tidak ada data yang berhasil diparse");
        return;
      }

      // Create jenis barang and barang for each jenis
      const createdJenis: any[] = [];
      const createdBarang: any[] = [];

      for (const [jenisNama, jenisData] of jenisMap.entries()) {
        try {
          // Create jenis barang
          const kodeJenis = generateKodeJenis(jenisNama);
          const jenisPayload = {
            kode_jenis: kodeJenis,
            nama_jenis: jenisNama,
            deskripsi: jenisData.deskripsi,
          };

          // Check if jenis already exists
          let createdJenisData = jenisBarangList.find(
            (j) => j.nama_jenis_barang.toLowerCase() === jenisNama.toLowerCase()
          );

          if (!createdJenisData) {
            createdJenisData = await jenisBarangAPI.create(jenisPayload);
            // Map response to local format
            createdJenisData = {
              id_jenis_barang: createdJenisData.id,
              kode_jenis_barang:
                createdJenisData.kode_jenis ||
                createdJenisData.kode_jenis_barang,
              nama_jenis_barang:
                createdJenisData.nama_jenis ||
                createdJenisData.nama_jenis_barang,
              deskripsi_jenis_barang:
                createdJenisData.deskripsi ||
                createdJenisData.deskripsi_jenis_barang,
            };
            createdJenis.push(createdJenisData);
            setJenisBarangList((prev) => [...prev, createdJenisData]);
          }

          // Create barang for this jenis
          const jenisId = createdJenisData.id_jenis_barang;
          const currentBarangForJenis = barangList.filter(
            (b) => b.id_jenis_barang === jenisId
          );

          for (let j = 0; j < jenisData.barang.length; j++) {
            const barangToCreate = jenisData.barang[j];
            const barangForThisJenis = [
              ...currentBarangForJenis,
              ...createdBarang.filter((b) => b.id_jenis_barang === jenisId),
            ];
            const generatedKode = generateKodeBarang(
              createdJenisData.kode_jenis_barang,
              barangForThisJenis
            );

            const barangPayload = {
              id_jenis_barang: jenisId,
              nama_barang: barangToCreate.nama_barang,
              kode_barang: generatedKode,
              no_serial_number: barangToCreate.no_serial_number,
              deskripsi_barang: barangToCreate.deskripsi_barang,
              status: barangToCreate.status,
              foto_barang: barangToCreate.foto_barang,
            };

            const created = await barangAPI.create(barangPayload);
            createdBarang.push(created);
          }
        } catch (err) {
          console.error(`Error creating jenis/barang for ${jenisNama}:`, err);
          toast.error(`Gagal membuat data untuk jenis ${jenisNama}`);
        }
      }

      setBarangList([...barangList, ...createdBarang]);
      setJenisBarangList((prev) => [...prev, ...createdJenis]);
      toast.success(
        `${createdJenis.length} jenis dan ${createdBarang.length} barang berhasil diimport!`
      );
      setShowImportJenisBarangDialog(false);
      event.target.value = "";
    } catch (error) {
      console.error("Error importing:", error);
      toast.error("Gagal mengimport file. Pastikan format CSV benar.");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-muted-foreground">Memuat data barang...</p>
          </div>
        </div>
      </AdminLayout>
    );
  }

  // Calculate statistics
  const stats = {
    totalJenis: jenisBarangList.length,
    totalBarang: barangList.length,
    tersedia: barangList.filter((b) => b.status === "Tersedia").length,
    dipinjam: barangList.filter((b) => b.status === "Dipinjam").length,
    rusak: barangList.filter(
      (b) => b.status === "Rusak" || b.status === "Hilang"
    ).length,
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold mb-2">Kelola Barang</h2>
            <p className="text-muted-foreground">
              Kelola jenis barang dan item barang yang tersedia
            </p>
          </div>
          <div className="flex gap-2">
            <Dialog
              open={showImportJenisBarangDialog}
              onOpenChange={setShowImportJenisBarangDialog}
            >
              <Button
                variant="outline"
                className="gap-2"
                onClick={() => setShowImportJenisBarangDialog(true)}
              >
                Import Jenis & Barang
              </Button>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>Import Jenis Barang & Barang</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <p className="text-sm text-muted-foreground mb-3">
                      Format CSV:{" "}
                      <strong>
                        jenis_barang, deskripsi_jenis, nama_barang,
                        no_serial_number, deskripsi_barang, status, foto_barang
                      </strong>
                    </p>
                    <p className="text-xs text-muted-foreground mb-4">
                      ✓ Kode jenis dan barang otomatis generate
                      <br />
                      ✓ Jenis barang dibuat otomatis jika belum ada
                      <br />✓ Format: CSV saja (tidak support XLSX)
                    </p>
                    <Button
                      size="sm"
                      variant="secondary"
                      className="w-full mb-4"
                      onClick={() => {
                        const link = document.createElement("a");
                        link.href = "/template-barang-lengkap.csv";
                        link.download = "template-barang-lengkap.csv";
                        document.body.appendChild(link);
                        link.click();
                        document.body.removeChild(link);
                        toast.success("Template CSV berhasil didownload");
                      }}
                    >
                      📥 Download Template CSV
                    </Button>
                    <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6 text-center">
                      <input
                        type="file"
                        accept=".csv"
                        onChange={handleImportJenisBarang}
                        className="hidden"
                        id="import-jenis-barang-file"
                      />
                      <label
                        htmlFor="import-jenis-barang-file"
                        className="cursor-pointer"
                      >
                        <div className="text-sm font-medium">
                          Klik untuk memilih file
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">
                          CSV
                        </div>
                      </label>
                    </div>
                  </div>
                  <div className="flex gap-2 justify-end">
                    <Button
                      variant="outline"
                      onClick={() => setShowImportJenisBarangDialog(false)}
                    >
                      Batal
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
            <Dialog
              open={showAddJenisDialog}
              onOpenChange={setShowAddJenisDialog}
            >
              <DialogTrigger asChild>
                <Button
                  onClick={() => {
                    setSelectedJenisId(null);
                    setJenisFormData({
                      nama_jenis_barang: "",
                      deskripsi_jenis_barang: "",
                    });
                  }}
                  className="gap-2"
                >
                  <Plus className="h-4 w-4" />
                  Tambah Jenis Barang
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>
                    {selectedJenisId
                      ? "Edit Jenis Barang"
                      : "Tambah Jenis Barang"}
                  </DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium">
                      Nama Jenis Barang
                    </label>
                    <Input
                      placeholder="Contoh: Peralatan Networking"
                      value={jenisFormData.nama_jenis_barang}
                      onChange={(e) =>
                        setJenisFormData({
                          ...jenisFormData,
                          nama_jenis_barang: e.target.value,
                        })
                      }
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Deskripsi</label>
                    <textarea
                      placeholder="Deskripsi jenis barang"
                      value={jenisFormData.deskripsi_jenis_barang}
                      onChange={(e) =>
                        setJenisFormData({
                          ...jenisFormData,
                          deskripsi_jenis_barang: e.target.value,
                        })
                      }
                      className="w-full p-2 border rounded-md text-sm mt-1"
                      rows={4}
                    />
                  </div>
                  <div className="flex gap-2 justify-end">
                    <Button
                      variant="outline"
                      onClick={() => setShowAddJenisDialog(false)}
                    >
                      Batal
                    </Button>
                    <Button onClick={handleSaveJenis}>
                      {selectedJenisId ? "Update" : "Tambah"}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Jenis Barang
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stats.totalJenis}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Barang
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stats.totalBarang}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Tersedia
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-600">
                {stats.tersedia}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Dipinjam
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-amber-600">
                {stats.dipinjam}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Rusak/Hilang
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-red-600">
                {stats.rusak}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Jenis Barang Table */}
        <Card>
          <CardHeader>
            <CardTitle>Daftar Jenis Barang</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted border-b">
                  <tr>
                    <th className="text-left p-3 font-semibold">Kode</th>
                    <th className="text-left p-3 font-semibold">Nama Jenis</th>
                    <th className="text-left p-3 font-semibold">Deskripsi</th>
                    <th className="text-center p-3 font-semibold">
                      Jumlah Item
                    </th>
                    <th className="text-center p-3 font-semibold">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {jenisBarangList.map((jenis) => {
                    const itemCount = getBarangForJenis(
                      jenis.id_jenis_barang
                    ).length;
                    return (
                      <tr
                        key={jenis.id_jenis_barang}
                        className="hover:bg-muted/50"
                      >
                        <td className="p-3 font-mono text-xs font-semibold text-primary">
                          <div className="flex items-center gap-2">
                            <code className="bg-muted px-2 py-1 rounded">
                              {jenis.kode_jenis_barang}
                            </code>
                            <div className="flex items-center gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() =>
                                  handleShowJenisQR(
                                    jenis.kode_jenis_barang,
                                    jenis.nama_jenis_barang
                                  )
                                }
                                title="Tampilkan QR Jenis"
                              >
                                <QrCode className="h-4 w-4" />
                              </Button>
                              {/* <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleDownloadJenisQR(jenis.kode_jenis_barang, jenis.nama_jenis_barang)}
                                title="Download QR Jenis"
                              >
                                <QrCode className="h-4 w-4 opacity-60" />
                              </Button> */}
                            </div>
                          </div>
                        </td>
                        <td className="p-3 font-medium">
                          {jenis.nama_jenis_barang}
                        </td>
                        <td className="p-3 text-muted-foreground text-xs">
                          {jenis.deskripsi_jenis_barang}
                        </td>
                        <td className="p-3 text-center">
                          <span className="inline-flex items-center justify-center px-3 py-1 bg-blue-100 text-blue-700 text-xs font-semibold rounded-full">
                            {itemCount} item
                          </span>
                        </td>
                        <td className="p-3">
                          <div className="flex items-center justify-center gap-2">
                            <Dialog
                              open={
                                showBarangDialog &&
                                selectedJenisId === jenis.id_jenis_barang
                              }
                              onOpenChange={setShowBarangDialog}
                            >
                              <DialogTrigger asChild>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() =>
                                    setSelectedJenisId(jenis.id_jenis_barang)
                                  }
                                  className="gap-2"
                                >
                                  <Eye className="h-4 w-4" />
                                  Tampilkan Barang
                                </Button>
                              </DialogTrigger>
                              <DialogContent className="max-w-5xl max-h-[85vh] overflow-y-auto">
                                <DialogHeader className="flex flex-row items-center justify-between">
                                  <DialogTitle>
                                    Barang -{" "}
                                    {getJenisName(selectedJenisId || 0)}
                                  </DialogTitle>
                                  <div className="flex gap-2">
                                    <Dialog
                                      open={showImportDialog}
                                      onOpenChange={setShowImportDialog}
                                    >
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() =>
                                          setShowImportDialog(true)
                                        }
                                        className="gap-2"
                                      >
                                        Import CSV/XLSX
                                      </Button>
                                      <DialogContent className="max-w-md">
                                        <DialogHeader>
                                          <DialogTitle>
                                            Import Barang dari File
                                          </DialogTitle>
                                        </DialogHeader>
                                        <div className="space-y-4">
                                          <div>
                                            <p className="text-sm text-muted-foreground mb-3">
                                              Format CSV harus memiliki kolom:{" "}
                                              <strong>nama_barang</strong>
                                            </p>
                                            <p className="text-xs text-muted-foreground mb-4">
                                              <strong>
                                                Kode barang otomatis generate!
                                              </strong>{" "}
                                              Kolom opsional: no_serial_number,
                                              deskripsi_barang, status,
                                              foto_barang
                                            </p>
                                            <Button
                                              size="sm"
                                              variant="secondary"
                                              className="w-full mb-4"
                                              onClick={() => {
                                                const link =
                                                  document.createElement("a");
                                                link.href =
                                                  "/template-barang.csv";
                                                link.download =
                                                  "template-barang.csv";
                                                document.body.appendChild(link);
                                                link.click();
                                                document.body.removeChild(link);
                                                toast.success(
                                                  "Template CSV berhasil didownload"
                                                );
                                              }}
                                            >
                                              📥 Download Template CSV
                                            </Button>
                                            <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6 text-center">
                                              <input
                                                type="file"
                                                accept=".csv,.xlsx"
                                                onChange={handleImportBarang}
                                                className="hidden"
                                                id="import-file"
                                              />
                                              <label
                                                htmlFor="import-file"
                                                className="cursor-pointer"
                                              >
                                                <div className="text-sm font-medium">
                                                  Klik untuk memilih file atau
                                                  drag & drop
                                                </div>
                                                <div className="text-xs text-muted-foreground mt-1">
                                                  CSV atau XLSX
                                                </div>
                                              </label>
                                            </div>
                                          </div>
                                          <div className="flex gap-2 justify-end">
                                            <Button
                                              variant="outline"
                                              onClick={() =>
                                                setShowImportDialog(false)
                                              }
                                            >
                                              Batal
                                            </Button>
                                          </div>
                                        </div>
                                      </DialogContent>
                                    </Dialog>
                                    <Button
                                      size="sm"
                                      onClick={() => {
                                        setBarangFormData({
                                          nama_barang: "",
                                          kode_barang: "",
                                          no_serial_number: "",
                                          deskripsi_barang: "",
                                          status: "Tersedia",
                                          foto_barang: "",
                                        });
                                        setEditingBarang(null);
                                        setShowAddBarangDialog(true);
                                      }}
                                      className="gap-2"
                                    >
                                      <Plus className="h-4 w-4" />
                                      Tambah Barang
                                    </Button>
                                  </div>
                                </DialogHeader>
                                <div className="space-y-4">
                                  {getBarangForJenis(selectedJenisId || 0)
                                    .length > 0 ? (
                                    <div className="space-y-3">
                                      {getBarangForJenis(
                                        selectedJenisId || 0
                                      ).map((barang) => (
                                        <div
                                          key={barang.id || barang.id_barang}
                                          className="border rounded-lg p-4 hover:shadow-md transition-shadow flex gap-4"
                                        >
                                          {barang.foto_barang && (
                                            <img
                                              src={barang.foto_barang}
                                              alt={barang.nama_barang}
                                              className="w-24 h-24 object-cover rounded flex-shrink-0"
                                            />
                                          )}
                                          <div className="flex-1">
                                            <div className="flex items-start justify-between gap-4">
                                              <div>
                                                <h4 className="font-semibold text-base">
                                                  {barang.nama_barang}
                                                </h4>
                                                <p className="text-xs text-muted-foreground font-mono">
                                                  {barang.kode_barang}
                                                </p>
                                                <p className="text-sm mt-1">
                                                  {barang.deskripsi_barang}
                                                </p>
                                                {barang.no_serial_number && (
                                                  <p className="text-xs text-muted-foreground mt-1">
                                                    SN:{" "}
                                                    {barang.no_serial_number}
                                                  </p>
                                                )}
                                                <div className="flex items-center gap-2 mt-2">
                                                  <span
                                                    className={`px-2 py-1 rounded text-xs font-semibold ${
                                                      barang.status ===
                                                      "Tersedia"
                                                        ? "bg-green-100 text-green-700"
                                                        : barang.status ===
                                                          "Dipinjam"
                                                        ? "bg-yellow-100 text-yellow-700"
                                                        : "bg-red-100 text-red-700"
                                                    }`}
                                                  >
                                                    {barang.status}
                                                  </span>
                                                </div>
                                              </div>
                                              <div className="flex gap-2 flex-shrink-0">
                                                <Button
                                                  variant="outline"
                                                  size="sm"
                                                  onClick={() => {
                                                    handleEditBarang(barang);
                                                    setShowAddBarangDialog(
                                                      true
                                                    );
                                                  }}
                                                  className="gap-1"
                                                >
                                                  <Edit2 className="h-4 w-4" />
                                                  Edit
                                                </Button>
                                                <Button
                                                  variant="ghost"
                                                  size="sm"
                                                  onClick={async () => {
                                                    try {
                                                      const dataUrl =
                                                        await createBarcodeDataURL(
                                                          barang.kode_barang,
                                                          {
                                                            width: 960,
                                                            height: 300,
                                                          }
                                                        );
                                                      setBarcodeDataUrl(
                                                        dataUrl
                                                      );
                                                      setBarcodeKode(
                                                        barang.kode_barang
                                                      );
                                                      setBarcodeNama(
                                                        barang.nama_barang
                                                      );
                                                      setBarcodeDialogOpen(
                                                        true
                                                      );
                                                    } catch (err) {
                                                      console.error(
                                                        "Gagal membuat barcode:",
                                                        err
                                                      );
                                                      toast.error(
                                                        "Gagal membuat barcode"
                                                      );
                                                    }
                                                  }}
                                                  className="gap-1"
                                                >
                                                  <Barcode className="h-4 w-4" />
                                                  Barcode
                                                </Button>
                                                <AlertDialog
                                                  open={
                                                    deleteTarget?.type ===
                                                      "barang" &&
                                                    deleteTarget?.id ===
                                                      (barang.id ||
                                                        barang.id_barang)
                                                  }
                                                  onOpenChange={(open) => {
                                                    if (!open)
                                                      setDeleteTarget(null);
                                                  }}
                                                >
                                                  <Button
                                                    variant="destructive"
                                                    size="sm"
                                                    onClick={() =>
                                                      setDeleteTarget({
                                                        type: "barang",
                                                        id:
                                                          barang.id ||
                                                          barang.id_barang,
                                                      })
                                                    }
                                                    className="gap-1"
                                                  >
                                                    <Trash2 className="h-4 w-4" />
                                                    Hapus
                                                  </Button>
                                                  <AlertDialogContent>
                                                    <AlertDialogHeader>
                                                      <AlertDialogTitle>
                                                        Hapus Barang?
                                                      </AlertDialogTitle>
                                                      <AlertDialogDescription>
                                                        Apakah Anda yakin ingin
                                                        menghapus "
                                                        {barang.nama_barang}"?
                                                        Tindakan ini tidak bisa
                                                        dibatalkan.
                                                      </AlertDialogDescription>
                                                    </AlertDialogHeader>
                                                    <div className="flex gap-2 justify-end">
                                                      <AlertDialogCancel
                                                        onClick={() =>
                                                          setDeleteTarget(null)
                                                        }
                                                      >
                                                        Batal
                                                      </AlertDialogCancel>
                                                      <AlertDialogAction
                                                        onClick={() =>
                                                          handleDeleteBarang(
                                                            barang.id ||
                                                              barang.id_barang
                                                          )
                                                        }
                                                        className="bg-red-600 hover:bg-red-700"
                                                      >
                                                        Hapus
                                                      </AlertDialogAction>
                                                    </div>
                                                  </AlertDialogContent>
                                                </AlertDialog>
                                              </div>
                                            </div>
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  ) : (
                                    <div className="text-center py-12 text-muted-foreground">
                                      <Package className="h-12 w-12 mx-auto mb-2 opacity-50" />
                                      <p>Tidak ada barang untuk jenis ini</p>
                                    </div>
                                  )}
                                </div>
                              </DialogContent>
                            </Dialog>

                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleEditJenis(jenis)}
                              className="gap-2"
                            >
                              <Edit2 className="h-4 w-4" />
                              Edit
                            </Button>

                            <AlertDialog
                              open={
                                deleteTarget?.type === "jenis" &&
                                deleteTarget?.id === jenis.id_jenis_barang
                              }
                              onOpenChange={(open) => {
                                if (!open) setDeleteTarget(null);
                              }}
                            >
                              <Button
                                variant="destructive"
                                size="sm"
                                onClick={() =>
                                  setDeleteTarget({
                                    type: "jenis",
                                    id: jenis.id_jenis_barang,
                                  })
                                }
                                className="gap-2"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>
                                    Hapus Jenis Barang?
                                  </AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Menghapus jenis barang akan menghapus semua
                                    barang di dalamnya. Tindakan ini tidak bisa
                                    dibatalkan.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <div className="flex gap-2 justify-end">
                                  <AlertDialogCancel
                                    onClick={() => setDeleteTarget(null)}
                                  >
                                    Batal
                                  </AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() =>
                                      handleDeleteJenis(jenis.id_jenis_barang)
                                    }
                                    className="bg-red-600 hover:bg-red-700"
                                  >
                                    Hapus
                                  </AlertDialogAction>
                                </div>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {jenisBarangList.length === 0 && (
              <div className="text-center py-12 text-muted-foreground">
                <Package className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>Belum ada jenis barang</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Add/Edit Barang Dialog */}
        <Dialog
          open={showAddBarangDialog}
          onOpenChange={setShowAddBarangDialog}
        >
          <DialogContent className="max-w-lg max-h-[90vh] flex flex-col">
            <DialogHeader>
              <DialogTitle>
                {editingBarang ? "Edit Barang" : "Tambah Barang"}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 overflow-y-auto pr-4">
              <div>
                <label className="text-sm font-medium">Nama Barang *</label>
                <Input
                  placeholder="Contoh: Router Cisco 2911"
                  value={barangFormData.nama_barang}
                  onChange={(e) =>
                    setBarangFormData({
                      ...barangFormData,
                      nama_barang: e.target.value,
                    })
                  }
                  className="mt-1"
                />
              </div>

              <div>
                <label className="text-sm font-medium">No. Serial</label>
                <Input
                  placeholder="Contoh: CSC-2911-001"
                  value={barangFormData.no_serial_number}
                  onChange={(e) =>
                    setBarangFormData({
                      ...barangFormData,
                      no_serial_number: e.target.value,
                    })
                  }
                  className="mt-1"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Deskripsi</label>
                <textarea
                  placeholder="Deskripsi barang"
                  value={barangFormData.deskripsi_barang}
                  onChange={(e) =>
                    setBarangFormData({
                      ...barangFormData,
                      deskripsi_barang: e.target.value,
                    })
                  }
                  className="w-full p-2 border rounded-md text-sm mt-1"
                  rows={3}
                />
              </div>
              <div>
                <label className="text-sm font-medium">Status</label>
                <select
                  value={barangFormData.status}
                  onChange={(e) =>
                    setBarangFormData({
                      ...barangFormData,
                      status: e.target.value,
                    })
                  }
                  className="w-full p-2 border rounded-md text-sm mt-1"
                >
                  <option value="Tersedia">Tersedia</option>
                  <option value="Dipinjam">Dipinjam</option>
                  <option value="Rusak">Rusak</option>
                  <option value="Hilang">Hilang</option>
                </select>
              </div>
              <div>
                <label className="text-sm font-medium">Foto Barang</label>
                <div className="mt-1 space-y-2">
                  {barangFormData.foto_barang && (
                    <div className="relative">
                      <img
                        src={barangFormData.foto_barang}
                        alt="Preview"
                        className="w-full h-32 object-cover rounded-md border"
                      />
                      <Button
                        size="sm"
                        variant="destructive"
                        className="absolute top-1 right-1"
                        onClick={() =>
                          setBarangFormData({
                            ...barangFormData,
                            foto_barang: "",
                          })
                        }
                      >
                        Hapus
                      </Button>
                    </div>
                  )}
                  <div className="border-2 border-dashed rounded-md p-4 text-center cursor-pointer hover:bg-muted/50 transition">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleFotoUpload}
                      className="hidden"
                      id="foto-barang-input"
                    />
                    <label
                      htmlFor="foto-barang-input"
                      className="cursor-pointer block"
                    >
                      <div className="text-sm font-medium">
                        Klik untuk upload atau drag & drop
                      </div>
                      <div className="text-xs text-muted-foreground">
                        JPG, PNG, GIF (Max 5MB)
                      </div>
                    </label>
                  </div>
                </div>
              </div>
              <div className="flex gap-2 justify-end">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowAddBarangDialog(false);
                    setEditingBarang(null);
                  }}
                >
                  Batal
                </Button>
                <Button onClick={handleAddBarang}>
                  {editingBarang ? "Update" : "Tambah"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Jenis QR Preview / Download Dialog */}
        <Dialog
          open={qrDialogOpenForJenis}
          onOpenChange={setQrDialogOpenForJenis}
        >
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>QR Jenis Barang</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 text-center">
              {qrDataUrl ? (
                <img
                  src={qrDataUrl}
                  alt={`QR ${qrJenisKode}`}
                  className="mx-auto rounded-md shadow-md"
                />
              ) : (
                <div className="py-12">Membuat preview QR...</div>
              )}
              <div className="flex gap-2 justify-center">
                <Button
                  variant="outline"
                  onClick={() => setQrDialogOpenForJenis(false)}
                >
                  Tutup
                </Button>
                <Button
                  onClick={() =>
                    handleDownloadJenisQR(qrJenisKode, qrJenisNama)
                  }
                >
                  Download
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Barang Barcode Preview / Download Dialog */}
        <Dialog open={barcodeDialogOpen} onOpenChange={setBarcodeDialogOpen}>
          <DialogContent className="max-w-md scale-150">
            <DialogHeader>
              <DialogTitle>Barcode Barang</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 text-center">
              {barcodeDataUrl ? (
                <img
                  src={barcodeDataUrl}
                  alt={`Barcode ${barcodeKode}`}
                  className="mx-auto rounded-md shadow-md"
                />
              ) : (
                <div className="py-12">Membuat preview barcode...</div>
              )}
              <div className="flex gap-2 justify-center">
                <Button
                  variant="outline"
                  onClick={() => setBarcodeDialogOpen(false)}
                >
                  Tutup
                </Button>
                <Button
                  onClick={() =>
                    downloadBarcodePNG(barcodeKode, `barcode-${barcodeKode}`)
                  }
                >
                  Download
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
};

export default Items;
