import { useState, useEffect, useCallback, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import PublicLayout from "@/layouts/PublicLayout";
import QRScanner from "@/components/QRScanner";
import CameraCapture from "@/components/CameraCapture";
import { useReactToPrint } from "react-to-print";
import { ReceiptComponent, type ReceiptData } from "@/components/ReceiptComponent";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Command,
  CommandEmpty,
  CommandInput,
  CommandItem,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatStudentDisplay, formatTeacherDisplay } from "@/lib/formatters";
import { getPhotoUrl, uploadCredentialToTelegram } from "@/lib/telegramUtils";
import { BorrowerLabel } from "@/components/BorrowerLabel";
import {
  ArrowLeft,
  ArrowRight,
  QrCode,
  FileText,
  Camera,
  CheckCircle,
  AlertCircle,
} from "lucide-react";
import { Borrowing, Item } from "@/types";
import { toast } from "react-hot-toast";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  barangAPI,
  jenisBarangAPI,
  guruAPI,
  siswaAPI,
  peminjamanAPI,
} from "@/lib/api";

const API_BASE_URL = import.meta.env.VITE_API_URL || 
  "https://tkj-peminjaman-server-production.up.railway.app/api";

type Step = "form" | "cart" | "photo" | "summary";

interface BarangData extends Item {
  id_jenis_barang?: number;
}

interface GuruData {
  id: number;
  nip: string;
  name: string;
  created_at: string;
}

interface SiswaData {
  id: number;
  nis: string;
  name: string;
  kelas?: string;
  created_at: string;
}

// Hanya guru berikut yang boleh jadi guru pendamping siswa
const ALLOWED_GURU_PENDAMPING = [
  "bayu andi",
  "erlitawanty",
  "soepardi",
  "ari subagyo",
  "winarto",
  "abdul basit",
  "rustika",
];

const BorrowFlow = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState<Step>("form");
  const [cameraUnavailable, setCameraUnavailable] = useState<boolean>(false);
  const [cameraChecked, setCameraChecked] = useState<boolean>(false);
  // Default to scanner fisik/keyboard; kamera QR opsional
  const [scanMode, setScanMode] = useState<"qr" | "manual">("manual");

  // Data from database
  const [allBarang, setAllBarang] = useState<BarangData[]>([]);
  const [allGuru, setAllGuru] = useState<GuruData[]>([]);
  const [allSiswa, setAllSiswa] = useState<SiswaData[]>([]);
  const [allKelas, setAllKelas] = useState<string[]>([]);

  // Shopping Cart state - multiple items
  const [cart, setCart] = useState<BarangData[]>([]);

  // Cart/scan step state
  const [selectedJenisCode, setSelectedJenisCode] = useState<string | null>(
    null
  );
  const [availableItems, setAvailableItems] = useState<BarangData[]>([]);
  const [selectedItemIds, setSelectedItemIds] = useState<number[]>([]);
  const [selectedItem, setSelectedItem] = useState<BarangData | null>(null);
  const [searchBarang, setSearchBarang] = useState<string>("");
  const [showDetailDialog, setShowDetailDialog] = useState<boolean>(false);
  const [detailDialogItem, setDetailDialogItem] = useState<BarangData | null>(null);

  // Form step state
  const [borrowerRole, setBorrowerRole] = useState<"guru" | "siswa">("guru");
  const [selectedKelas, setSelectedKelas] = useState<string>("");
  const [filteredSiswa, setFilteredSiswa] = useState<SiswaData[]>([]);
  const [formData, setFormData] = useState({
    nama_peminjam: "",
    kontak: "",
    keperluan: "",
    guru_pendamping: "",
  });

  // Photo step state
  const [photoData, setPhotoData] = useState<string>("");
  const [signatureData, setSignatureData] = useState<string>("");
  const [detailItem, setDetailItem] = useState<BarangData | null>(null);

  // Popover states
  const [openRolePicker, setOpenRolePicker] = useState(false);
  const [openKelas, setOpenKelas] = useState(false);
  const [searchKelas, setSearchKelas] = useState("");
  const [openNamaPeminjam, setOpenNamaPeminjam] = useState(false);
  const [searchNamaPeminjam, setSearchNamaPeminjam] = useState("");
  const [openGuruPendamping, setOpenGuruPendamping] = useState(false);
  const [searchGuruPendamping, setSearchGuruPendamping] = useState("");

  const manualInputRef = useRef<HTMLInputElement | null>(null);

  // Refs to sync popover width with trigger
  const kelasTriggerRef = useRef<HTMLButtonElement | null>(null);
  const namaTriggerRef = useRef<HTMLButtonElement | null>(null);
  const guruTriggerRef = useRef<HTMLButtonElement | null>(null);
  const searchBarangRef = useRef<HTMLInputElement | null>(null);

  // Summary state
  const [borrowingCode, setBorrowingCode] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [receiptBorrowing, setReceiptBorrowing] = useState<Borrowing | null>(null);
  const [isReceiptLoading, setIsReceiptLoading] = useState(false);

  const receiptRef = useRef<HTMLDivElement | null>(null);
  const handlePrintReceipt = useReactToPrint({
    contentRef: receiptRef,
    documentTitle: borrowingCode ? `Struk-${borrowingCode}` : "Struk-SIMABAR",
  });

  // Scan deduplication using ref to avoid re-renders
  const lastScanRef = useRef<{ code: string; time: number }>({
    code: "",
    time: 0,
  });
  const SCAN_DEBOUNCE_MS = 1500; // 1.5 seconds

  // Load data on mount
  useEffect(() => {
    const loadData = async () => {
      try {
        const [barangRes, guruRes, siswaRes, kelasRes] = await Promise.all([
          barangAPI.getAll(),
          guruAPI.getAll(),
          siswaAPI.getAll(),
          siswaAPI.getAllKelas(),
        ]);

        setAllBarang(barangRes);
        setAllGuru(guruRes);
        setAllSiswa(siswaRes);
        setAllKelas(kelasRes);
      } catch (error) {
        console.error("Error loading data:", error);
        toast.error("Gagal memuat data dari database");
      }
    };

    loadData();
  }, []);

  useEffect(() => {
    const loadReceiptBorrowing = async () => {
      if (currentStep !== "summary" || !borrowingCode) return;

      setIsReceiptLoading(true);
      try {
        const borrowing = await peminjamanAPI.getByKode(borrowingCode);
        setReceiptBorrowing(borrowing);
      } catch (error) {
        console.error("Error loading receipt borrowing:", error);
        setReceiptBorrowing(null);
      } finally {
        setIsReceiptLoading(false);
      }
    };

    loadReceiptBorrowing();
  }, [currentStep, borrowingCode]);

  const receiptData: ReceiptData | null = receiptBorrowing
    ? {
        kode_peminjaman: receiptBorrowing.kode_peminjaman || borrowingCode,
        tanggal: (() => {
          const raw = receiptBorrowing.tanggal_pinjam || receiptBorrowing.created_at;
          const date = raw ? new Date(raw) : new Date();
          return date.toLocaleString("id-ID", {
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
            hour: "2-digit",
            minute: "2-digit",
          });
        })(),
        nama_peminjam: receiptBorrowing.nama_peminjam || formData.nama_peminjam,
        guru_pendamping:
          receiptBorrowing.guru_pendamping ||
          (borrowerRole === "siswa" ? formData.guru_pendamping : undefined),
        items: (receiptBorrowing.detail_peminjaman || []).map((d) => ({
          nama_barang: d.nama_barang || "(Barang)",
          kode_barang: d.kode_barang || "-",
        })),
      }
    : null;

  // Check camera availability on mount
  useEffect(() => {
    const checkCamera = async () => {
      try {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          setCameraUnavailable(true);
          setScanMode("manual");
          setCameraChecked(true);
          return;
        }

        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
        });
        stream.getTracks().forEach((track) => track.stop());
        setCameraChecked(true);
      } catch (err) {
        console.log("Camera not available:", err);
        setCameraUnavailable(true);
        setScanMode("manual");
        setCameraChecked(true);
      }
    };
    if (!cameraChecked) checkCamera();
  }, [cameraChecked]);

  // Update filtered siswa when kelas changes
  useEffect(() => {
    if (selectedKelas && borrowerRole === "siswa") {
      const filtered = allSiswa.filter((s) => s.kelas === selectedKelas);
      setFilteredSiswa(filtered);
      setFormData((prev) => ({ ...prev, nama_peminjam: "" }));
    }
  }, [selectedKelas, borrowerRole, allSiswa]);

  // Auto-focus manual input so scanner fisik langsung siap ketik di kotak input
  useEffect(() => {
    if (currentStep === "cart" && scanMode === "manual") {
      const timer = setTimeout(() => {
        manualInputRef.current?.focus();
        manualInputRef.current?.select();
      }, 120);
      return () => clearTimeout(timer);
    }
  }, [currentStep, scanMode]);

  // Auto-focus search barang input after QR scan
  useEffect(() => {
    if (currentStep === "cart" && availableItems.length > 0) {
      const timer = setTimeout(() => {
        searchBarangRef.current?.focus();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [currentStep, availableItems]);

  // Cart management functions
  const addToCart = (item: BarangData) => {
    // Check if item already in cart
    if (cart.some(i => (i.id || i.id_barang) === (item.id || item.id_barang))) {
      toast.error("Barang sudah ada di keranjang");
      return;
    }
    setCart([...cart, item]);
    toast.success(`${item.nama_barang} ditambahkan ke keranjang`);
  };

  const removeFromCart = (itemId: number) => {
    const item = cart.find(i => (i.id || i.id_barang) === itemId);
    setCart(cart.filter(i => (i.id || i.id_barang) !== itemId));
    if (item) {
      toast.success(`${item.nama_barang} dihapus dari keranjang`);
    }
  };

  const clearCart = () => {
    setCart([]);
    toast.success("Keranjang dikosongkan");
  };

  const handleAddSelectedToCart = () => {
    if (availableItems.length > 0) {
      // Multiple items selection mode
      if (selectedItemIds.length === 0) {
        toast.error("Pilih minimal satu barang");
        return;
      }
      const itemsToAdd = availableItems.filter(item => 
        selectedItemIds.includes(item.id || item.id_barang || 0)
      );
      itemsToAdd.forEach(item => {
        if (!cart.some(i => (i.id || i.id_barang) === (item.id || item.id_barang))) {
          addToCart(item);
        }
      });
      // Reset selection
      setSelectedItemIds([]);
      setAvailableItems([]);
      setSelectedJenisCode(null);
      setSearchBarang("");
    } else if (selectedItem) {
      // Single item mode
      addToCart(selectedItem);
      setSelectedItem(null);
      setSelectedJenisCode(null);
    }
  };

  const handleContinueToPhoto = () => {
    if (cart.length === 0) {
      toast.error("Keranjang kosong! Scan minimal 1 barang");
      return;
    }
    setCurrentStep("photo");
  };

  const handleQRScan = useCallback(
    async (decodedText: string) => {
      try {
        // Aggressive whitespace handling: trim all spaces, tabs, newlines
        const normalized = decodedText
          .trim()
          .replace(/[\s\t\n\r]/g, "")
          .toUpperCase();
        
        const scannedCode = normalized;
        
        // Deduplication using ref: ignore if same code scanned within SCAN_DEBOUNCE_MS
        const now = Date.now();
        if (
          scannedCode === lastScanRef.current.code &&
          now - lastScanRef.current.time < SCAN_DEBOUNCE_MS
        ) {
          return;
        }

        lastScanRef.current = { code: scannedCode, time: now };

        // Try to match jenis_barang via API first
        try {
          const itemsOfJenis = await barangAPI.getByJenis(scannedCode);
          
          // Filter to only available items
          const availableByJenis = itemsOfJenis.filter(b => b.status === "Tersedia");
          
          if (availableByJenis.length > 0) {
            setSelectedJenisCode(scannedCode);
            setAvailableItems(availableByJenis);
            setSelectedItem(null);
            setSelectedItemIds([]);
            setSearchBarang("");
            toast.success(
              `${availableByJenis.length} barang tersedia untuk jenis "${scannedCode}"`
            );
            return;
          } else if (itemsOfJenis.length > 0) {
            // Jenis found but all items not available
            toast.error(
              `Jenis "${scannedCode}" ditemukan tapi semua barang sedang dipinjam`
            );
            return;
          }
        } catch (jenisError) {
          // Jenis tidak ditemukan, lanjut ke fallback
        }

        // Fallback: Try to find by kode_barang (individual item)
        const barangByKodeAny = allBarang.find(
          (b) => {
            const normBarangCode = (b.kode_barang || "")
              .trim()
              .replace(/[\s\t\n\r]/g, "")
              .toUpperCase();
            return normBarangCode === scannedCode;
          }
        );

        const barangByKode = barangByKodeAny?.status === "Tersedia" ? barangByKodeAny : null;

        if (barangByKode) {
          setSelectedItem(barangByKode);
          setSelectedJenisCode(barangByKode.kode_jenis || null);
          setAvailableItems([]);
          setSelectedItemIds([]);
          setSearchBarang("");
          toast.success(`Barang "${barangByKode.nama_barang}" dipilih`);
          return;
        }

        // If nothing found
        toast.error(
          `QR Code tidak valid: "${decodedText}"\n\nTidak ada kode barang atau jenis yang cocok`
        );
      } catch (error) {
        console.error("Error in QR scan:", error);
        toast.error("Gagal memproses QR Code");
      }
    },
    [allBarang]
  );

  const handleManualCode = () => {
    const kodeBarang = manualInputRef.current?.value?.trim();

    if (!kodeBarang) {
      toast.error("Masukkan kode barang atau jenis");
      manualInputRef.current?.focus();
      return;
    }

    handleQRScan(kodeBarang);
    if (manualInputRef.current) {
      manualInputRef.current.value = "";
      manualInputRef.current.focus();
    }
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!formData.nama_peminjam || !formData.kontak || !formData.keperluan) {
      toast.error("Mohon lengkapi semua field");
      return;
    }

    if (borrowerRole === "siswa" && !formData.guru_pendamping) {
      toast.error("Pilih guru pendamping");
      return;
    }

    if (borrowerRole === "siswa" && !selectedKelas) {
      toast.error("Pilih kelas");
      return;
    }

    // Move to cart step to scan items
    setCurrentStep("cart");
  };

  const handlePhotoCapture = async (imageData: string) => {
    setPhotoData(imageData);
    // Immediately submit to database after photo capture
    await handleSubmitBorrowing(imageData);
  };

  const handleSubmitBorrowing = async (photoDataToSubmit: string) => {
    setIsSubmitting(true);
    try {
      // Prepare items array from cart
      const itemsToBorrow = cart.map((item) => ({ 
        id_barang: item.id || item.id_barang || 0 
      }));

      if (itemsToBorrow.length === 0) {
        toast.error("Keranjang kosong! Tidak ada barang yang dipilih");
        setIsSubmitting(false);
        return;
      }

      // Use provided photoData or fallback to state
      let fotoCredentialUrl = photoDataToSubmit || photoData || null;

      // If photoData is base64, upload to Telegram first
      if (fotoCredentialUrl && fotoCredentialUrl.startsWith('data:')) {
        try {
          // Convert base64 to File
          const base64Response = await fetch(fotoCredentialUrl);
          const blob = await base64Response.blob();
          const file = new File([blob], 'credential.jpg', { type: 'image/jpeg' });
          
          // Upload to Telegram and get file_id
          fotoCredentialUrl = await uploadCredentialToTelegram(file, API_BASE_URL);
          toast.success('Foto kredensial berhasil diupload ke Telegram');
        } catch (error) {
          console.error('Error uploading credential to Telegram:', error);
          toast.error('Gagal upload foto kredensial, menggunakan data lokal');
          // Continue with base64 if upload fails
        }
      }

      // Create peminjaman in database
      const result = await peminjamanAPI.create({
        nama_peminjam: formData.nama_peminjam,
        kontak: formData.kontak,
        keperluan: formData.keperluan,
        guru_pendamping:
          borrowerRole === "guru"
            ? formData.guru_pendamping
            : formData.guru_pendamping,
        foto_credential: fotoCredentialUrl,
        signature: signatureData || null,
        items: itemsToBorrow,
      });

      // Extract kode_peminjaman from result
      const kodePeminjaman = result?.kode_peminjaman || result?.id_peminjaman;

      if (!kodePeminjaman) {
        throw new Error("Kode peminjaman tidak diterima dari server");
      }

      setBorrowingCode(kodePeminjaman);
      // Move to summary to show success
      setCurrentStep("summary");
      toast.success(`Peminjaman berhasil! Kode: ${kodePeminjaman}`);
    } catch (error) {
      console.error("Error creating peminjaman:", error);
      toast.error(
        error instanceof Error ? error.message : "Gagal membuat peminjaman"
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCompleteAndClose = () => {
    if (!borrowingCode) {
      toast.error("Kode peminjaman belum tersedia");
      return;
    }
    toast.success(`Peminjaman berhasil! Kode: ${borrowingCode}`);
    setTimeout(() => {
      navigate("/");
    }, 1500);
  };

  const renderStepIndicator = () => {
    const steps = [
      { id: "form", label: "Data Peminjam", icon: FileText },
      { id: "cart", label: "Pilih Barang", icon: QrCode },
      { id: "photo", label: "Ambil Foto", icon: Camera },
      { id: "summary", label: "Selesai", icon: CheckCircle },
    ];

    const currentIndex = steps.findIndex((s) => s.id === currentStep);

    return (
      <div className="flex items-center justify-center mb-8 gap-2">
        {steps.map((step, index) => {
          const Icon = step.icon;
          const isActive = index === currentIndex;
          const isCompleted = index < currentIndex;

          return (
            <div key={step.id} className="flex items-center">
              <div
                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
                  isActive
                    ? "bg-primary text-primary-foreground shadow-md"
                    : isCompleted
                    ? "bg-success text-success-foreground"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                <Icon className="h-4 w-4" />
                <span className="text-sm font-medium hidden sm:inline">
                  {step.label}
                </span>
              </div>
              {index < steps.length - 1 && (
                <ArrowRight
                  className={`h-4 w-4 mx-1 ${
                    isCompleted ? "text-success" : "text-muted-foreground"
                  }`}
                />
              )}
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <PublicLayout>
      <div className="max-w-7xl mx-auto px-2 sm:px-4">
        <Button variant="ghost" onClick={() => navigate("/")} className="mb-6">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Kembali ke Beranda
        </Button>

        <h2 className="text-3xl font-bold mb-2">Pinjam Barang</h2>
        <p className="text-muted-foreground mb-8">
          Ikuti langkah-langkah berikut untuk meminjam barang
        </p>

        {renderStepIndicator()}

        {/* Step 1: Form - Data Peminjam (AWAL) */}
        {currentStep === "form" && (
          <Card>
            <CardHeader>
              <CardTitle>Data Peminjam</CardTitle>
              <p className="text-sm text-muted-foreground">
                Isi identitas peminjam terlebih dahulu sebelum memilih barang
              </p>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleFormSubmit} className="space-y-4">
                {/* Role Selection */}
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="role">Meminjam sebagai *</Label>
                    <Select
                      value={borrowerRole}
                      onValueChange={(value: any) => {
                        setBorrowerRole(value);
                        setFormData({
                          ...formData,
                          nama_peminjam: "",
                          guru_pendamping: "",
                        });
                        setSelectedKelas("");
                      }}
                    >
                      <SelectTrigger className="mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="guru">Guru</SelectItem>
                        <SelectItem value="siswa">Siswa</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {borrowerRole === "siswa" && (
                    <div>
                      <Label htmlFor="kelas">Kelas *</Label>
                      <Popover open={openKelas} onOpenChange={setOpenKelas}>
                        <PopoverTrigger asChild>
                          <Button
                            ref={kelasTriggerRef}
                            variant="outline"
                            role="combobox"
                            className="mt-1 w-full justify-between"
                          >
                            {selectedKelas || "Pilih Kelas..."}
                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent
                          side="bottom"
                          align="start"
                          sideOffset={4}
                          className="p-0"
                          style={{ width: kelasTriggerRef.current?.offsetWidth }}
                        >
                          <Command>
                            <CommandInput
                              placeholder="Cari kelas..."
                              value={searchKelas}
                              onValueChange={setSearchKelas}
                            />
                            <CommandEmpty>Tidak ada kelas</CommandEmpty>
                            <div className="max-h-44 overflow-y-auto">
                              {allKelas
                                .filter((k) =>
                                  k
                                    .toLowerCase()
                                    .includes(searchKelas.toLowerCase())
                                )
                                .map((k) => (
                                  <CommandItem
                                    key={k}
                                    value={k}
                                    onSelect={() => {
                                      setSelectedKelas(k);
                                      setOpenKelas(false);
                                      setSearchKelas("");
                                    }}
                                  >
                                    <Check
                                      className={cn(
                                        "mr-2 h-4 w-4",
                                        selectedKelas === k
                                          ? "opacity-100"
                                          : "opacity-0"
                                      )}
                                    />
                                    {k}
                                  </CommandItem>
                                ))}
                            </div>
                          </Command>
                        </PopoverContent>
                      </Popover>
                    </div>
                  )}

                  <div>
                    <Label htmlFor="nama">Nama Peminjam *</Label>
                    <Popover
                      open={openNamaPeminjam}
                      onOpenChange={setOpenNamaPeminjam}
                    >
                      <PopoverTrigger asChild>
                        <Button
                          ref={namaTriggerRef}
                          id="nama"
                          variant="outline"
                          role="combobox"
                          aria-expanded={openNamaPeminjam}
                          className="mt-1 w-full justify-between"
                        >
                          {formData.nama_peminjam ? (
                            <BorrowerLabel
                              label={formData.nama_peminjam}
                              role={borrowerRole}
                            />
                          ) : borrowerRole === "guru" ? (
                            "Pilih Guru..."
                          ) : (
                            "Pilih Siswa..."
                          )}
                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent
                        side="bottom"
                        align="start"
                        sideOffset={4}
                        className="p-0"
                        style={{ width: namaTriggerRef.current?.offsetWidth }}
                      >
                        <Command>
                          <CommandInput
                            placeholder={
                              borrowerRole === "guru"
                                ? "Cari guru..."
                                : "Cari siswa..."
                            }
                            value={searchNamaPeminjam}
                            onValueChange={setSearchNamaPeminjam}
                          />
                          <CommandEmpty>
                            Tidak ada data ditemukan
                          </CommandEmpty>
                          <div className="max-h-64 overflow-y-auto">
                            {borrowerRole === "guru"
                              ? allGuru
                                  .filter((t) =>
                                    formatTeacherDisplay(t)
                                      .toLowerCase()
                                      .includes(
                                        searchNamaPeminjam.toLowerCase()
                                      )
                                  )
                                  .map((t) => (
                                    <CommandItem
                                      key={t.id || t.nip}
                                      value={formatTeacherDisplay(t)}
                                      onSelect={(currentValue) => {
                                        setFormData({
                                          ...formData,
                                          nama_peminjam:
                                            currentValue ===
                                            formData.nama_peminjam
                                              ? ""
                                              : currentValue,
                                        });
                                        setOpenNamaPeminjam(false);
                                        setSearchNamaPeminjam("");
                                      }}
                                    >
                                      <Check
                                        className={cn(
                                          "mr-2 h-4 w-4",
                                          formData.nama_peminjam ===
                                            formatTeacherDisplay(t)
                                            ? "opacity-100"
                                            : "opacity-0"
                                        )}
                                      />
                                      <BorrowerLabel
                                        label={formatTeacherDisplay(t)}
                                        role="guru"
                                      />
                                    </CommandItem>
                                  ))
                              : allSiswa
                                  .filter(
                                    (s) =>
                                      (selectedKelas === "" ||
                                        s.kelas === selectedKelas) &&
                                      formatStudentDisplay(s)
                                        .toLowerCase()
                                        .includes(
                                          searchNamaPeminjam.toLowerCase()
                                        )
                                  )
                                  .map((s) => (
                                    <CommandItem
                                      key={s.id || s.nis}
                                      value={formatStudentDisplay(s)}
                                      onSelect={(currentValue) => {
                                        setFormData({
                                          ...formData,
                                          nama_peminjam:
                                            currentValue ===
                                            formData.nama_peminjam
                                              ? ""
                                              : currentValue,
                                        });
                                        setOpenNamaPeminjam(false);
                                        setSearchNamaPeminjam("");
                                      }}
                                    >
                                      <Check
                                        className={cn(
                                          "mr-2 h-4 w-4",
                                          formData.nama_peminjam ===
                                            formatStudentDisplay(s)
                                            ? "opacity-100"
                                            : "opacity-0"
                                        )}
                                      />
                                      <BorrowerLabel
                                        label={formatStudentDisplay(s)}
                                        role="siswa"
                                      />
                                    </CommandItem>
                                  ))}
                          </div>
                        </Command>
                      </PopoverContent>
                    </Popover>
                  </div>
                  <div>
                    <Label htmlFor="kontak">Nomor Kontak (WA) *</Label>
                    <Input
                      id="kontak"
                      type="tel"
                      value={formData.kontak}
                      onChange={(e) =>
                        setFormData({ ...formData, kontak: e.target.value })
                      }
                      placeholder="08xxxxxxxxxx"
                      required
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="keperluan">Keperluan *</Label>
                  <Textarea
                    id="keperluan"
                    value={formData.keperluan}
                    onChange={(e) =>
                      setFormData({ ...formData, keperluan: e.target.value })
                    }
                    placeholder="Contoh: Praktikum Jaringan Komputer"
                    className="mt-1"
                    required
                  />
                </div>

                {borrowerRole === "siswa" && (
                  <div>
                    <Label htmlFor="guru">Guru Pendamping *</Label>
                    <Popover
                      open={openGuruPendamping}
                      onOpenChange={setOpenGuruPendamping}
                    >
                      <PopoverTrigger asChild>
                        <Button
                          ref={guruTriggerRef}
                          variant="outline"
                          role="combobox"
                          className="mt-1 w-full justify-between"
                        >
                          {formData.guru_pendamping ? (
                            <BorrowerLabel
                              label={formData.guru_pendamping}
                              role="guru"
                            />
                          ) : (
                            "Pilih Guru..."
                          )}
                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent
                        side="bottom"
                        align="start"
                        sideOffset={4}
                        className="p-0"
                        style={{ width: guruTriggerRef.current?.offsetWidth }}
                      >
                        <Command>
                          <CommandInput
                            placeholder="Cari guru..."
                            value={searchGuruPendamping}
                            onValueChange={setSearchGuruPendamping}
                          />
                          <CommandEmpty>Tidak ada guru</CommandEmpty>
                          <div className="max-h-64 overflow-y-auto">
                            {allGuru
                              .filter((g) =>
                                ALLOWED_GURU_PENDAMPING.some((allowed) =>
                                  g.name.toLowerCase().includes(allowed)
                                )
                              )
                              .filter((t) =>
                                formatTeacherDisplay(t)
                                  .toLowerCase()
                                  .includes(
                                    searchGuruPendamping.toLowerCase()
                                  )
                              )
                              .map((g) => (
                                <CommandItem
                                  key={g.id || g.nip}
                                  value={formatTeacherDisplay(g)}
                                  onSelect={(currentValue) => {
                                    setFormData({
                                      ...formData,
                                      guru_pendamping: currentValue,
                                    });
                                    setOpenGuruPendamping(false);
                                    setSearchGuruPendamping("");
                                  }}
                                >
                                  <Check
                                    className={cn(
                                      "mr-2 h-4 w-4",
                                      formData.guru_pendamping ===
                                        formatTeacherDisplay(g)
                                        ? "opacity-100"
                                        : "opacity-0"
                                    )}
                                  />
                                  <BorrowerLabel
                                    label={formatTeacherDisplay(g)}
                                    role="guru"
                                  />
                                </CommandItem>
                              ))}
                          </div>
                        </Command>
                      </PopoverContent>
                    </Popover>
                  </div>
                )}

                <div className="flex gap-3 pt-4">
                  <Button type="submit" className="flex-1">
                    Lanjut ke Keranjang
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                </div>
              </form>
              </CardContent>
            </Card>
          )}

        {/* Step 2: Cart - Shopping Cart dengan Scan */}
        {currentStep === "cart" && (
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 mx-auto px-2">
            {/* Main Content - Scan Area */}
            <div className="lg:col-span-3 space-y-4">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>Scan/Pilih Barang</CardTitle>
                    <Badge variant="secondary">{cart.length} item di keranjang</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Scan QR code atau masukkan kode barang. Anda bisa menambah beberapa barang sekaligus.
                  </p>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Scan Mode Toggle */}
                  <div className="flex gap-2">
                    <Button
                      variant={scanMode === "manual" ? "default" : "outline"}
                      onClick={() => setScanMode("manual")}
                      size="sm"
                    >
                      Scanner Fisik / Manual
                    </Button>
                    {!cameraUnavailable && (
                      <Button
                        variant={scanMode === "qr" ? "default" : "outline"}
                        onClick={() => setScanMode("qr")}
                        size="sm"
                      >
                        Kamera QR
                      </Button>
                    )}
                  </div>

                  {/* Scan Interface */}
                  {scanMode === "qr" ? (
                    <div className="rounded-2xl border p-4">
                      <QRScanner
                        key="qr-scanner-cart"
                        onScanSuccess={handleQRScan}
                        onClose={() => {}}
                        onUnavailable={() => {
                          setCameraUnavailable(true);
                          setScanMode("manual");
                        }}
                      />
                    </div>
                  ) : (
                    <div className="rounded-2xl border p-4 space-y-3">
                      <Label htmlFor="manual-code">Kode Barang atau Jenis</Label>
                      <div className="flex gap-2">
                        <Input
                          id="manual-code"
                          placeholder="Contoh: TKJ-LAPT"
                          ref={manualInputRef}
                          onKeyPress={(e) => e.key === "Enter" && handleManualCode()}
                        />
                        <Button onClick={handleManualCode}>
                          Cari
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* Available Items Selection (jika ada) */}
                  {availableItems.length > 0 && (
                    <div className="space-y-3 mt-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="font-semibold">Jenis: {selectedJenisCode}</h3>
                          <p className="text-sm text-muted-foreground">{availableItems.length} barang tersedia</p>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setAvailableItems([]);
                            setSelectedJenisCode(null);
                            setSelectedItemIds([]);
                            setSearchBarang("");
                          }}
                        >
                          Ganti Jenis / Scan Lagi
                        </Button>
                      </div>

                      {/* Search */}
                      <Input
                        ref={searchBarangRef}
                        placeholder="Cari barang..."
                        value={searchBarang}
                        onChange={(e) => setSearchBarang(e.target.value)}
                      />

                      {/* Items Grid with Hover Detail/Select */}
                      <div className="grid grid-cols-3 sm:grid-cols-4 gap-3 max-h-96 overflow-y-auto">
                        {availableItems
                          .filter((item) =>
                            item.kode_barang.toLowerCase().includes(searchBarang.toLowerCase()) ||
                            item.nama_barang.toLowerCase().includes(searchBarang.toLowerCase())
                          )
                          .map((item) => {
                            const isInCart = cart.some(i => (i.id || i.id_barang) === (item.id || item.id_barang));
                            return (
                              <div
                                key={item.id || item.id_barang}
                                className="relative rounded-lg border overflow-hidden group cursor-pointer transition-all hover:shadow-lg"
                              >
                                {/* Item Image */}
                                {item.foto_barang && (
                                  <img
                                    src={getPhotoUrl(item.foto_barang, API_BASE_URL)}
                                    alt={item.nama_barang}
                                    className="w-full h-24 object-cover"
                                  />
                                )}
                                
                                {/* Item Name and Code - Always Visible */}
                                <div className="p-2 text-center text-xs bg-card">
                                  <p className="font-medium line-clamp-1">{item.nama_barang}</p>
                                  <p className="text-muted-foreground text-xs line-clamp-1">{item.kode_barang}</p>
                                </div>

                                {/* Hover Overlay with Detail/Select Buttons */}
                                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2 p-2">
                                  <Button
                                    size="sm"
                                    variant="secondary"
                                    className="w-full text-xs"
                                    onClick={() => {
                                      setDetailDialogItem(item);
                                      setShowDetailDialog(true);
                                    }}
                                  >
                                    Detail
                                  </Button>
                                  <Button
                                    size="sm"
                                    className="w-full text-xs"
                                    disabled={isInCart}
                                    onClick={() => {
                                      if (isInCart) {
                                        toast.error("Sudah ada di keranjang");
                                      } else {
                                        addToCart(item);
                                      }
                                    }}
                                  >
                                    {isInCart ? "Di Keranjang" : "Pilih"}
                                  </Button>
                                </div>

                                {/* Overlay if already in cart */}
                                {isInCart && (
                                  <div className="absolute inset-0 bg-background/70 flex items-center justify-center rounded-lg">
                                    <Badge variant="secondary" className="text-xs">Di Keranjang</Badge>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                      </div>
                    </div>
                  )}

                  {/* Detail Dialog */}
                  <Dialog open={showDetailDialog} onOpenChange={setShowDetailDialog}>
                    <DialogContent className="max-w-2xl">
                      {detailDialogItem && (
                        <>
                          <DialogHeader>
                            <DialogTitle className="line-clamp-2">{detailDialogItem.nama_barang}</DialogTitle>
                            <DialogDescription>Kode: {detailDialogItem.kode_barang}</DialogDescription>
                          </DialogHeader>
                          <div className="grid gap-4">
                            {/* Gambar */}
                            <div className="w-full">
                              {detailDialogItem.foto_barang ? (
                                <img
                                  src={getPhotoUrl(detailDialogItem.foto_barang, API_BASE_URL)}
                                  alt={detailDialogItem.nama_barang}
                                  className="w-full max-h-[60vh] object-contain rounded-md border"
                                />
                              ) : (
                                <div className="w-full h-64 flex items-center justify-center bg-muted rounded-md border">
                                  <span className="text-muted-foreground">Tidak ada foto</span>
                                </div>
                              )}
                            </div>

                            {/* Data Barang */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Status</span>
                                <span className="font-medium">{detailDialogItem.status}</span>
                              </div>
                              {detailDialogItem.nama_jenis && (
                                <div className="flex justify-between">
                                  <span className="text-muted-foreground">Jenis</span>
                                  <span className="font-medium">{detailDialogItem.nama_jenis}</span>
                                </div>
                              )}
                              {detailDialogItem.kode_jenis && (
                                <div className="flex justify-between">
                                  <span className="text-muted-foreground">Kode Jenis</span>
                                  <span className="font-medium">{detailDialogItem.kode_jenis}</span>
                                </div>
                              )}
                              {detailDialogItem.no_serial_number && (
                                <div className="flex justify-between">
                                  <span className="text-muted-foreground">No. Seri</span>
                                  <span className="font-medium font-mono">{detailDialogItem.no_serial_number}</span>
                                </div>
                              )}
                            </div>

                            {/* Deskripsi */}
                            {detailDialogItem.deskripsi_barang && (
                              <div className="text-sm">
                                <span className="text-muted-foreground block">Deskripsi</span>
                                <p className="mt-1">{detailDialogItem.deskripsi_barang}</p>
                              </div>
                            )}

                            {/* Tombol Pilih */}
                            <Button 
                              onClick={() => {
                                const isInCart = cart.some(i => (i.id || i.id_barang) === (detailDialogItem.id || detailDialogItem.id_barang));
                                if (isInCart) {
                                  toast.error("Sudah ada di keranjang");
                                } else {
                                  addToCart(detailDialogItem);
                                  setShowDetailDialog(false);
                                }
                              }}
                              disabled={cart.some(i => (i.id || i.id_barang) === (detailDialogItem.id || detailDialogItem.id_barang))}
                              className="w-full"
                            >
                              Pilih Barang Ini
                            </Button>
                          </div>
                        </>
                      )}
                    </DialogContent>
                  </Dialog>
                </CardContent>
              </Card>
            </div>

            {/* Sidebar - Cart Panel */}
            <div className="lg:col-span-1">
              <Card className="sticky top-6">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    🛒 Keranjang
                    <Badge>{cart.length}</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {cart.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <p className="text-sm">Keranjang kosong</p>
                      <p className="text-xs mt-2">Scan/pilih barang untuk meminjam</p>
                    </div>
                  ) : (
                    <>
                      <div className="space-y-2 max-h-96 overflow-y-auto">
                        {cart.map((item, index) => (
                          <div
                            key={item.id || item.id_barang}
                            className="flex flex-col gap-1 p-2 border rounded-lg bg-card hover:bg-accent/50 transition-colors"
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex-1 min-w-0">
                                <p className="text-xs text-muted-foreground font-medium">{item.nama_jenis || "—"}</p>
                                <p className="text-sm font-medium line-clamp-1">{item.nama_barang}</p>
                                <p className="text-xs text-muted-foreground font-mono">{item.kode_barang}</p>
                              </div>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => removeFromCart(item.id || item.id_barang || 0)}
                                className="flex-shrink-0 h-6 w-6 p-0"
                              >
                                ×
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>

                      <div className="pt-4 border-t space-y-2">
                        <Button onClick={clearCart} variant="outline" className="w-full" size="sm">
                          Kosongkan Keranjang
                        </Button>
                        <Button onClick={handleContinueToPhoto} className="w-full">
                          Lanjut Foto ({cart.length} item)
                          <ArrowRight className="h-4 w-4 ml-2" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          onClick={() => setCurrentStep("form")} 
                          className="w-full"
                          size="sm"
                        >
                          <ArrowLeft className="h-4 w-4 mr-2" />
                          Kembali
                        </Button>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {/* Step 3: Photo */}
        {currentStep === "photo" && (
          <Card>
            <CardHeader>
              <CardTitle>Foto Barang</CardTitle>
              <p className="text-sm text-muted-foreground">
                Total: {cart.length} barang akan dipinjam
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Ambil foto yang jelas menampilkan semua barang yang dipinjam.
                </AlertDescription>
              </Alert>

              <div className="grid lg:grid-cols-2 gap-4 items-start">
                {/* Cart Summary */}
                <div className="bg-muted p-4 rounded-lg space-y-3">
                  <h3 className="font-semibold text-sm">Barang yang dipinjam</h3>
                  <div className="space-y-2 max-h-72 overflow-y-auto">
                    {cart.map((item) => (
                      <div
                        key={item.id || item.id_barang}
                        className="flex flex-col gap-0.5 rounded-md border bg-card px-3 py-2"
                      >
                        <span className="text-xs text-muted-foreground font-medium">
                          {item.nama_jenis || "—"}
                        </span>
                        <span className="text-sm font-semibold line-clamp-1">{item.nama_barang}</span>
                        <span className="text-xs text-muted-foreground font-mono">{item.kode_barang}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="rounded-2xl border p-4">
                  <CameraCapture
                    onCapture={handlePhotoCapture}
                    label="Foto Barang"
                    isSubmitting={isSubmitting}
                  />
                </div>
              </div>

              <Button
                variant="outline"
                onClick={() => setCurrentStep("cart")}
                className="w-full"
                disabled={isSubmitting}
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Kembali
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Step 4: Summary */}
        {currentStep === "summary" && (
          <Card>
            <CardHeader>
              <div className="text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-success/10 text-success rounded-full mb-4">
                  <CheckCircle className="h-8 w-8" />
                </div>
                <CardTitle className="text-4xl font-extrabold">
                  Peminjaman Berhasil!
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="bg-primary/5 border-2 border-primary rounded-lg p-6 text-center">
                <p className="text-sm text-muted-foreground mb-2">
                  Kode Peminjaman
                </p>
                <p className="text-3xl font-bold text-primary mb-4">
                  {borrowingCode}
                </p>
                <Alert
                  variant="default"
                  className="bg-warning/10 border-warning"
                >
                  <AlertCircle className="h-4 w-4 text-warning" />
                  <AlertDescription className="text-warning-foreground text-black">
                    <strong>Catatan:</strong> Simpan kode ini untuk pengembalian
                    barang.
                  </AlertDescription>
                </Alert>
              </div>

              {/* Borrower Info */}
              <div className="space-y-3">
                <h4 className="font-semibold">Data Peminjam:</h4>
                <div className="grid gap-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Peminjam:</span>
                    <span className="font-medium">
                      {formData.nama_peminjam}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Kontak:</span>
                    <span className="font-medium">{formData.kontak}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Keperluan:</span>
                    <span className="font-medium">{formData.keperluan}</span>
                  </div>
                  {formData.guru_pendamping && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">
                        Guru Pendamping:
                      </span>
                      <span className="font-medium">
                        {formData.guru_pendamping}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Barang Details */}
              <div className="space-y-3">
                <h4 className="font-semibold">Detail Barang Dipinjam:</h4>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm border-collapse">
                    <thead>
                      <tr className="border-b-2 border-gray-300">
                        <th className="text-left py-2 px-2 font-semibold">
                          No
                        </th>
                        <th className="text-left py-2 px-2 font-semibold">
                          Nama Barang
                        </th>
                        <th className="text-left py-2 px-2 font-semibold">
                          Kode
                        </th>
                        <th className="text-center py-2 px-2 font-semibold">
                          Jenis
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {cart.map((item, index) => (
                        <tr
                          key={item.id || item.id_barang}
                          className="border-b border-gray-200 hover:bg-gray-50"
                        >
                          <td className="py-2 px-2">{index + 1}</td>
                          <td className="py-2 px-2 font-medium">
                            {item.nama_barang}
                          </td>
                          <td className="py-2 px-2 text-gray-600">
                            {item.kode_barang}
                          </td>
                          <td className="py-2 px-2 text-center text-xs">
                            {item.nama_jenis || "—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {photoData && (
                <div>
                  <h4 className="font-semibold mb-2">Foto Credential:</h4>
                  <img
                    src={photoData}
                    alt="Credential"
                    className="w-full rounded-lg border border-border"
                  />
                </div>
              )}

              {receiptData && (
                <div className="print-receipt fixed -left-[10000px] top-0">
                  <ReceiptComponent ref={receiptRef} data={receiptData} />
                </div>
              )}

              <Button
                type="button"
                variant="outline"
                className="w-full"
                disabled={isReceiptLoading || !receiptData}
                onClick={() => {
                  if (!receiptData) {
                    toast.error("Data struk belum siap");
                    return;
                  }
                  handlePrintReceipt();
                }}
              >
                {isReceiptLoading ? "Menyiapkan struk..." : "Cetak Struk"}
              </Button>

              <Button
                onClick={handleCompleteAndClose}
                className="w-full"
                size="lg"
                disabled={isSubmitting}
              >
                <CheckCircle className="h-5 w-5 mr-2" />
                {isSubmitting ? "Menyimpan..." : "Selesai"}
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </PublicLayout>
  );
};

export default BorrowFlow;
