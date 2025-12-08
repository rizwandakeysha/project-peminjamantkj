import { useState, useEffect, useCallback, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import PublicLayout from "@/layouts/PublicLayout";
import QRScanner from "@/components/QRScanner";
import CameraCapture from "@/components/CameraCapture";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Item } from "@/types";
import { toast } from "react-hot-toast";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  barangAPI,
  jenisBarangAPI,
  guruAPI,
  siswaAPI,
  peminjamanAPI,
} from "@/lib/api";

type Step = "scan" | "form" | "photo" | "summary";

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

const BorrowFlow = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState<Step>("scan");
  const [cameraUnavailable, setCameraUnavailable] = useState<boolean>(false);
  const [cameraChecked, setCameraChecked] = useState<boolean>(false);
  const [scanMode, setScanMode] = useState<"qr" | "manual">("qr");

  // Data from database
  const [allBarang, setAllBarang] = useState<BarangData[]>([]);
  const [allGuru, setAllGuru] = useState<GuruData[]>([]);
  const [allSiswa, setAllSiswa] = useState<SiswaData[]>([]);
  const [allKelas, setAllKelas] = useState<string[]>([]);

  // Scan step state
  const [selectedJenisCode, setSelectedJenisCode] = useState<string | null>(
    null
  );
  const [availableItems, setAvailableItems] = useState<BarangData[]>([]);
  const [selectedItemIds, setSelectedItemIds] = useState<number[]>([]);
  const [selectedItem, setSelectedItem] = useState<BarangData | null>(null);

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

  // Popover states
  const [openRolePicker, setOpenRolePicker] = useState(false);
  const [openKelas, setOpenKelas] = useState(false);
  const [searchKelas, setSearchKelas] = useState("");
  const [openNamaPeminjam, setOpenNamaPeminjam] = useState(false);
  const [searchNamaPeminjam, setSearchNamaPeminjam] = useState("");
  const [openGuruPendamping, setOpenGuruPendamping] = useState(false);
  const [searchGuruPendamping, setSearchGuruPendamping] = useState("");

  // Refs to sync popover width with trigger
  const kelasTriggerRef = useRef<HTMLButtonElement | null>(null);
  const namaTriggerRef = useRef<HTMLButtonElement | null>(null);
  const guruTriggerRef = useRef<HTMLButtonElement | null>(null);

  // Summary state
  const [borrowingCode, setBorrowingCode] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);

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

  const handleQRScan = useCallback(
    async (decodedText: string) => {
      try {
        // Deduplication using ref: ignore if same code scanned within SCAN_DEBOUNCE_MS
        const now = Date.now();
        if (
          decodedText === lastScanRef.current.code &&
          now - lastScanRef.current.time < SCAN_DEBOUNCE_MS
        ) {
          console.log("Duplicate scan ignored:", decodedText);
          return;
        }

        lastScanRef.current = { code: decodedText, time: now };

        // Check if it's a jenis code
        const jenisBarang = allBarang.find((b) => b.kode_jenis === decodedText);

        if (jenisBarang) {
          // Scan jenis - get all barang with this jenis code
          const itemsOfJenis = allBarang.filter(
            (b) => b.kode_jenis === decodedText && b.status === "Tersedia"
          );
          if (itemsOfJenis.length > 0) {
            setSelectedJenisCode(decodedText);
            setAvailableItems(itemsOfJenis);
            setSelectedItem(null);
            setSelectedItemIds([]);
            setCurrentStep("form");
            toast.success(
              `${itemsOfJenis.length} barang tersedia untuk jenis ini`
            );
            return;
          } else {
            toast.error("Tidak ada barang tersedia untuk jenis ini");
            return;
          }
        }

        // Check if it's individual barang code
        const barang = allBarang.find((b) => b.kode_barang === decodedText);

        if (barang) {
          if (barang.status !== "Tersedia") {
            toast.error(`Barang tidak tersedia (Status: ${barang.status})`);
            return;
          }

          setSelectedItem(barang);
          setSelectedJenisCode(barang.kode_jenis || null);
          setAvailableItems([]);
          setSelectedItemIds([]);
          setFormData({
            nama_peminjam: "",
            kontak: "",
            keperluan: "",
            guru_pendamping: "",
          });
          setCurrentStep("form");
          toast.success(`Barang "${barang.nama_barang}" dipilih`);
        } else {
          toast.error("QR Code tidak valid atau barang tidak ditemukan");
        }
      } catch (error) {
        console.error("Error in QR scan:", error);
        toast.error("Gagal memproses QR Code");
      }
    },
    [allBarang]
  );

  const handleManualCode = () => {
    const kodeBarang = (
      document.getElementById("manual-code") as HTMLInputElement
    )?.value;
    if (kodeBarang) {
      handleQRScan(kodeBarang);
      (document.getElementById("manual-code") as HTMLInputElement).value = "";
    } else {
      toast.error("Masukkan kode barang");
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

    if (availableItems.length > 0) {
      if (selectedItemIds.length === 0) {
        toast.error("Pilih minimal satu barang");
        return;
      }
    } else {
      if (!selectedItem) {
        toast.error("Barang belum dipilih");
        return;
      }
    }

    setCurrentStep("photo");
  };

  const handlePhotoCapture = async (imageData: string) => {
    setPhotoData(imageData);
    // Immediately submit to database after photo capture
    await handleSubmitBorrowing(imageData);
  };

  const handleSubmitBorrowing = async (photoDataToSubmit: string) => {
    setIsSubmitting(true);
    try {
      // Prepare items array
      let itemsToBorrow: Array<{ id_barang: number }> = [];

      if (availableItems.length > 0) {
        itemsToBorrow = selectedItemIds.map((id) => ({ id_barang: id }));
      } else if (selectedItem) {
        itemsToBorrow = [{ id_barang: selectedItem.id }];
      }

      if (itemsToBorrow.length === 0) {
        toast.error("Tidak ada barang yang dipilih");
        setIsSubmitting(false);
        return;
      }

      // Use provided photoData or fallback to state
      const fotoCredentialUrl = photoDataToSubmit || photoData || null;

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
      { id: "scan", label: "Scan/Pilih Barang", icon: QrCode },
      { id: "form", label: "Isi Data", icon: FileText },
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
      <div className="max-w-4xl mx-auto">
        <Button variant="ghost" onClick={() => navigate("/")} className="mb-6">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Kembali ke Beranda
        </Button>

        <h2 className="text-3xl font-bold mb-2">Pinjam Barang</h2>
        <p className="text-muted-foreground mb-8">
          Ikuti langkah-langkah berikut untuk meminjam barang
        </p>

        {renderStepIndicator()}

        {/* Step: Scan */}
        {currentStep === "scan" && (
          <div className="space-y-6">
            {!cameraChecked ? (
              <Card>
                <CardContent className="pt-6 pb-6 text-center">
                  <div className="animate-pulse space-y-2">
                    <div className="h-8 w-8 mx-auto bg-muted rounded-full"></div>
                    <p className="text-sm text-muted-foreground">
                      Memeriksa kamera...
                    </p>
                  </div>
                </CardContent>
              </Card>
            ) : scanMode === "qr" ? (
              <QRScanner
                key="qr-scanner"
                onScanSuccess={handleQRScan}
                onClose={() => navigate("/")}
                onUnavailable={() => {
                  setCameraUnavailable(true);
                  setScanMode("manual");
                }}
              />
            ) : (
              <Card>
                <CardHeader>
                  <CardTitle>Masukkan Kode Barang</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      Kamera tidak tersedia. Silakan input kode barang secara
                      manual.
                    </AlertDescription>
                  </Alert>
                  <div>
                    <Label htmlFor="manual-code">Kode Barang</Label>
                    <Input
                      id="manual-code"
                      placeholder="Contoh: BRG-001"
                      className="mt-1"
                      onKeyPress={(e) =>
                        e.key === "Enter" && handleManualCode()
                      }
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Lihat kode pada label barang
                    </p>
                  </div>
                  <Button onClick={handleManualCode} className="w-full">
                    Cari Barang
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* Step: Form */}
        {currentStep === "form" &&
          (selectedItem || availableItems.length > 0) && (
            <Card>
              <CardHeader>
                <CardTitle>Data Peminjaman</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleFormSubmit} className="space-y-4">
                  {/* Item Info */}
                  <div className="bg-accent/50 p-4 rounded-lg mb-4">
                    {availableItems.length > 0 ? (
                      <div>
                        <p className="font-semibold">
                          Jenis: {selectedJenisCode}
                        </p>
                        <p className="text-sm text-muted-foreground mb-3">
                          Pilih barang dari daftar
                        </p>
                        <div className="mt-3 grid gap-2">
                          {availableItems.map((item) => (
                            <label
                              key={item.id}
                              className="flex items-center gap-3 p-2 rounded border cursor-pointer hover:bg-accent"
                            >
                              <input
                                type="checkbox"
                                checked={selectedItemIds.includes(item.id)}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setSelectedItemIds((s) => [...s, item.id]);
                                  } else {
                                    setSelectedItemIds((s) =>
                                      s.filter((id) => id !== item.id)
                                    );
                                  }
                                }}
                              />
                              {item.foto_barang && (
                                <img
                                  src={item.foto_barang}
                                  alt={item.nama_barang}
                                  className="w-12 h-12 object-cover rounded"
                                />
                              )}
                              <div className="flex-1">
                                <div className="font-medium">
                                  {item.nama_barang}
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  Kode: {item.kode_barang}
                                </div>
                              </div>
                            </label>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center gap-3">
                        {selectedItem?.foto_barang && (
                          <img
                            src={selectedItem.foto_barang}
                            alt={selectedItem.nama_barang}
                            className="w-16 h-16 object-cover rounded"
                          />
                        )}
                        <div>
                          <p className="font-semibold">
                            {selectedItem?.nama_barang}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            Kode: {selectedItem?.kode_barang}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>

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
                                        key={t.nip}
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
                                        key={s.nis}
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
                                .filter((t) =>
                                  formatTeacherDisplay(t)
                                    .toLowerCase()
                                    .includes(
                                      searchGuruPendamping.toLowerCase()
                                    )
                                )
                                .map((g) => (
                                  <CommandItem
                                    key={g.nip}
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
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setCurrentStep("scan");
                        setSelectedItem(null);
                        setAvailableItems([]);
                        setSelectedItemIds([]);
                        lastScanRef.current = { code: "", time: 0 };
                      }}
                    >
                      <ArrowLeft className="h-4 w-4 mr-2" />
                      Kembali
                    </Button>
                    <Button type="submit" className="flex-1">
                      Selanjutnya
                      <ArrowRight className="h-4 w-4 ml-2" />
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          )}

        {/* Step: Photo */}
        {currentStep === "photo" && (
          <div className="space-y-4">
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Ambil foto yang jelas menampilkan wajah peminjam dan barang yang
                dipinjam
              </AlertDescription>
            </Alert>
            <CameraCapture
              onCapture={handlePhotoCapture}
              label="Foto Peminjam & Barang"
              isSubmitting={isSubmitting}
            />
            <Button
              variant="outline"
              onClick={() => setCurrentStep("form")}
              className="w-full"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Kembali
            </Button>
          </div>
        )}

        {/* Step: Summary */}
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
                          Jumlah
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {availableItems.length > 0
                        ? availableItems
                            .filter((item) => selectedItemIds.includes(item.id))
                            .map((item, index) => (
                              <tr
                                key={item.id}
                                className="border-b border-gray-200 hover:bg-gray-50"
                              >
                                <td className="py-2 px-2">{index + 1}</td>
                                <td className="py-2 px-2 font-medium">
                                  {item.nama_barang}
                                </td>
                                <td className="py-2 px-2 text-gray-600">
                                  {item.kode_barang}
                                </td>
                                <td className="py-2 px-2 text-center font-medium">
                                  1
                                </td>
                              </tr>
                            ))
                        : selectedItem && (
                            <tr className="border-b border-gray-200 hover:bg-gray-50">
                              <td className="py-2 px-2">1</td>
                              <td className="py-2 px-2 font-medium">
                                {selectedItem.nama_barang}
                              </td>
                              <td className="py-2 px-2 text-gray-600">
                                {selectedItem.kode_barang}
                              </td>
                              <td className="py-2 px-2 text-center font-medium">
                                1
                              </td>
                            </tr>
                          )}
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
