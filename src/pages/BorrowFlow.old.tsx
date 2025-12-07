import { useState, useEffect } from "react";
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
import {
  ArrowLeft,
  ArrowRight,
  QrCode,
  FileText,
  Camera,
  CheckCircle,
  AlertCircle,
} from "lucide-react";
import { Item, BorrowingFormData } from "@/types";
import { mockItems, mockTeachers, mockStudents, kelasOptions } from "@/lib/mockData";
// Removed client-side code generation; server is source of truth
import { toast } from "react-hot-toast";
import { Alert, AlertDescription } from "@/components/ui/alert";

type Step = "scan" | "form" | "photo" | "summary";

const BorrowFlow = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState<Step>("scan");
  const [selectedItem, setSelectedItem] = useState<Item | null>(
    location.state?.selectedItem || null
  );
  const [borrowerRole, setBorrowerRole] = useState<"guru" | "siswa">("guru");
  const [scanMode, setScanMode] = useState<"qr" | "manual">("qr");
  const [cameraUnavailable, setCameraUnavailable] = useState<boolean>(false);
  const [cameraChecked, setCameraChecked] = useState<boolean>(false);
  const [formData, setFormData] = useState<BorrowingFormData>({
    nama_peminjam: "",
    kontak: "",
    keperluan: "",
    guru_pendamping: "",
    id_barang: 0,
    jumlah: 1,
  });
  // For jenis (type) scan flows
  const [selectedJenisCode, setSelectedJenisCode] = useState<string | null>(null);
  const [availableItems, setAvailableItems] = useState<Item[]>([]);
  const [selectedItemIds, setSelectedItemIds] = useState<number[]>([]);
  const [photoData, setPhotoData] = useState<string>("");
  const [borrowingCode, setBorrowingCode] = useState<string>("");
  const [openNamaPeminjam, setOpenNamaPeminjam] = useState(false);
  const [searchNamaPeminjam, setSearchNamaPeminjam] = useState("");
  const [openRolePicker, setOpenRolePicker] = useState(false);
  const [openGuruPendamping, setOpenGuruPendamping] = useState(false);
  const [searchGuruPendamping, setSearchGuruPendamping] = useState("");
  const [selectedKelas, setSelectedKelas] = useState<string>("");
  const [openKelas, setOpenKelas] = useState(false);
  const [searchKelas, setSearchKelas] = useState("");

  // Check camera availability on mount
  useEffect(() => {
    const checkCamera = async () => {
      try {
        // Check if mediaDevices is supported
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          setCameraUnavailable(true);
          setScanMode("manual");
          setCameraChecked(true);
          return;
        }

        // Try to check camera permission
        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
        });
        // If successful, stop the stream immediately
        stream.getTracks().forEach((track) => track.stop());
        setCameraChecked(true);
        // Keep scanMode as "qr" if camera is available
      } catch (err: any) {
        // Camera not available or permission denied
        console.log("Camera not available:", err);
        setCameraUnavailable(true);
        setScanMode("manual");
        setCameraChecked(true);
      }
    };

    if (!cameraChecked) {
      checkCamera();
    }
  }, [cameraChecked]);

  useEffect(() => {
    if (selectedItem) {
      setCurrentStep("form");
      setFormData((prev) => ({ ...prev, id_barang: selectedItem.id }));
    }
  }, [selectedItem]);

  const handleQRScan = async (decodedText: string) => {
    try {
      // First check mockItems for kode_jenis match (jenis scan)
      const matchesJenis = mockItems.filter((i) => i.kode_jenis === decodedText);
      if (matchesJenis.length > 0) {
        setSelectedJenisCode(decodedText);
        setAvailableItems(matchesJenis);
        setSelectedItem(null);
        setSelectedItemIds([]);
        setCurrentStep("form");
        return;
      }

      // DUMMY MODE: Check mockItems for individual item kode match instead of API call
      const matchedItem = mockItems.find(
        (i) => i.kode_barang === decodedText || i.kode_barang.includes(decodedText)
      );
      
      if (matchedItem) {
        const available = matchedItem.jumlah_stok - matchedItem.jumlah_dipinjam;
        if (available > 0) {
          setSelectedItem(matchedItem);
          setFormData((prev) => ({ ...prev, id_barang: matchedItem.id }));
          setSelectedJenisCode(matchedItem.kode_jenis || null);
          setCurrentStep("form");
        } else {
          toast.error("Maaf, barang tidak tersedia saat ini");
        }
      } else {
        toast.error("QR Code tidak valid atau barang tidak ditemukan (Dummy Mode)");
      }
    } catch (error) {
      console.error("Error in QR scan:", error);
      toast.error("Gagal memproses QR Code");
    }
  };

  const handleManualCode = () => {
    const kodeBarang = (
      document.getElementById("manual-code") as HTMLInputElement
    )?.value;
    if (kodeBarang) {
      handleQRScan(kodeBarang);
    } else {
      toast.error("Masukkan kode barang");
    }
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Basic validation
    if (!formData.nama_peminjam || !formData.kontak || !formData.keperluan) {
      toast.error("Mohon lengkapi semua field");
      return;
    }

    // If borrower is siswa, require guru pendamping
    if (borrowerRole === "siswa" && !formData.guru_pendamping) {
      toast.error("Pilih guru pendamping untuk siswa");
      return;
    }

    // If borrower is siswa, require kelas
    if (borrowerRole === "siswa" && !selectedKelas) {
      toast.error("Pilih kelas untuk siswa");
      return;
    }

    // If user selected specific items from a jenis, ensure at least one selected
    if (availableItems.length > 0) {
      if (selectedItemIds.length === 0) {
        toast.error("Pilih minimal satu barang dari daftar");
        return;
      }
    } else {
      if (!selectedItem || formData.jumlah <= 0) {
        toast.error("Data barang tidak valid");
        return;
      }

      const available = selectedItem.jumlah_stok - selectedItem.jumlah_dipinjam;
      if (formData.jumlah > available) {
        toast.error(`Stok tidak mencukupi. Tersedia: ${available}`);
        return;
      }
    }

    setCurrentStep("photo");
  };

  const handlePhotoCapture = async (imageData: string) => {
    setPhotoData(imageData);

    // Prepare list of item ids to create borrowings for
    let itemIdsToBorrow: number[] = [];
    if (availableItems.length > 0) {
      itemIdsToBorrow = selectedItemIds.slice();
    } else if (selectedItem) {
      itemIdsToBorrow = [selectedItem.id];
    } else {
      toast.error("Barang belum dipilih");
      return;
    }

    try {
      // DUMMY MODE: Skip API calls and generate single code for all items
      // When backend is ready, this will call API and return single code with multiple detail records
      const dummyCode = `PMJ-${Date.now()}`;
      
      setBorrowingCode(dummyCode);
      setCurrentStep("summary");
      toast.success("Peminjaman berhasil dibuat! (Dummy Mode)");
    } catch (error) {
      console.error("Error in dummy borrowing:", error);
      toast.error("Gagal memproses peminjaman");
    }
  };

  const handleComplete = async () => {
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

        {/* Step: Scan/Select Item */}
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
                      Kamera tidak tersedia atau akses ditolak. Silakan input
                      kode barang secara manual.
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
        {currentStep === "form" && (selectedItem || availableItems.length > 0) && (
          <Card>
            <CardHeader>
              <CardTitle>Data Peminjaman</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleFormSubmit} className="space-y-4">
                {/* Selected Item / Jenis Info */}
                <div className="bg-accent/50 p-4 rounded-lg mb-4">
                  {availableItems.length > 0 ? (
                    <div>
                      <p className="font-semibold">Jenis: {selectedJenisCode}</p>
                      <p className="text-sm text-muted-foreground">
                        Pilih barang dari daftar jenis untuk dipinjam
                      </p>
                      <div className="mt-3 grid gap-2">
                        {availableItems.map((it) => (
                          <label key={it.id} className="flex items-center gap-3 p-2 rounded border">
                            <input
                              type="checkbox"
                              checked={selectedItemIds.includes(it.id)}
                              onChange={(e) => {
                                if (e.target.checked) setSelectedItemIds((s) => [...s, it.id]);
                                else setSelectedItemIds((s) => s.filter((id) => id !== it.id));
                              }}
                            />
                            {it.foto_barang && (
                              <img src={it.foto_barang} alt={it.nama_barang} className="w-12 h-12 object-cover rounded" />
                            )}
                            <div className="flex-1">
                              <div className="font-medium">{it.nama_barang}</div>
                              <div className="text-xs text-muted-foreground">Kode: {it.kode_barang} — Tersedia: {it.jumlah_stok - it.jumlah_dipinjam}</div>
                            </div>
                          </label>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-3">
                      {selectedItem?.foto_barang && (
                        <img src={selectedItem!.foto_barang} alt={selectedItem!.nama_barang} className="w-16 h-16 object-cover rounded" />
                      )}
                      <div>
                        <p className="font-semibold">{selectedItem?.nama_barang}</p>
                        <p className="text-sm text-muted-foreground">Kode: {selectedItem?.kode_barang}</p>
                        <p className="text-sm text-muted-foreground">Tersedia: {selectedItem && (selectedItem.jumlah_stok - selectedItem.jumlah_dipinjam)}</p>
                      </div>
                    </div>
                  )}
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="role">Meminjam sebagai *</Label>
                    <Popover open={openRolePicker} onOpenChange={setOpenRolePicker}>
                      <PopoverTrigger asChild>
                        <Button
                          id="role"
                          variant="outline"
                          role="combobox"
                          aria-expanded={openRolePicker}
                          className="mt-1 w-full justify-between"
                        >
                          {borrowerRole === "guru" ? "Guru" : "Siswa"}
                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-full p-0">
                        <Command>
                          <div className="max-h-44 overflow-y-auto">
                            <CommandItem
                              value="guru"
                              onSelect={(v) => {
                                setBorrowerRole("guru");
                                setOpenRolePicker(false);
                                // clear nama peminjam when role changes
                                setFormData({ ...formData, nama_peminjam: "", guru_pendamping: "" });
                                setSelectedKelas("");
                                setSearchNamaPeminjam("");
                              }}
                            >
                              <Check className={cn("mr-2 h-4 w-4", borrowerRole === "guru" ? "opacity-100" : "opacity-0")} />
                              Guru
                            </CommandItem>
                            <CommandItem
                              value="siswa"
                              onSelect={(v) => {
                                setBorrowerRole("siswa");
                                setOpenRolePicker(false);
                                setFormData({ ...formData, nama_peminjam: "", guru_pendamping: "" });
                                setSelectedKelas("");
                                setSearchNamaPeminjam("");
                              }}
                            >
                              <Check className={cn("mr-2 h-4 w-4", borrowerRole === "siswa" ? "opacity-100" : "opacity-0")} />
                              Siswa
                            </CommandItem>
                          </div>
                        </Command>
                      </PopoverContent>
                    </Popover>
                  </div>

                  {borrowerRole === "siswa" && (
                    <div>
                      <Label htmlFor="kelas">Kelas *</Label>
                      <Popover open={openKelas} onOpenChange={setOpenKelas}>
                        <PopoverTrigger asChild>
                          <Button
                            id="kelas"
                            variant="outline"
                            role="combobox"
                            aria-expanded={openKelas}
                            className="mt-1 w-full justify-between"
                          >
                            {selectedKelas || "Pilih Kelas..."}
                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-full p-0">
                          <Command>
                            <CommandInput
                              placeholder="Cari kelas..."
                              value={searchKelas}
                              onValueChange={setSearchKelas}
                            />
                            <CommandEmpty>Tidak ada kelas ditemukan</CommandEmpty>
                            <div className="max-h-44 overflow-y-auto">
                              {kelasOptions
                                .filter((k) => k.toLowerCase().includes(searchKelas.toLowerCase()))
                                .map((k) => (
                                  <CommandItem
                                    key={k}
                                    value={k}
                                    onSelect={(currentValue) => {
                                      setSelectedKelas(currentValue === selectedKelas ? "" : currentValue);
                                      setOpenKelas(false);
                                      setSearchKelas("");
                                      // Reset nama_peminjam when kelas changes
                                      setFormData({ ...formData, nama_peminjam: "" });
                                      setSearchNamaPeminjam("");
                                    }}
                                  >
                                    <Check
                                      className={cn(
                                        "mr-2 h-4 w-4",
                                        selectedKelas === k ? "opacity-100" : "opacity-0"
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
                    <Popover open={openNamaPeminjam} onOpenChange={setOpenNamaPeminjam}>
                      <PopoverTrigger asChild>
                        <Button
                          id="nama"
                          variant="outline"
                          role="combobox"
                          aria-expanded={openNamaPeminjam}
                          className="mt-1 w-full justify-between"
                        >
                          {formData.nama_peminjam || (borrowerRole === "guru" ? "Pilih Guru..." : "Pilih Siswa...")}
                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-full p-0">
                        <Command>
                          <CommandInput
                            placeholder={borrowerRole === "guru" ? "Cari guru..." : "Cari siswa..."}
                            value={searchNamaPeminjam}
                            onValueChange={setSearchNamaPeminjam}
                          />
                          <CommandEmpty>Tidak ada data ditemukan</CommandEmpty>
                          <div className="max-h-64 overflow-y-auto">
                            {borrowerRole === "guru" ? (
                              mockTeachers
                                .filter((t) =>
                                  `${t.name} - ${t.nip}`.toLowerCase().includes(searchNamaPeminjam.toLowerCase())
                                )
                                .map((t) => (
                                  <CommandItem
                                    key={t.nip}
                                    value={`${t.name} - ${t.nip}`}
                                    onSelect={(currentValue) => {
                                      setFormData({
                                        ...formData,
                                        nama_peminjam: currentValue === formData.nama_peminjam ? "" : currentValue,
                                      });
                                      setOpenNamaPeminjam(false);
                                      setSearchNamaPeminjam("");
                                    }}
                                  >
                                    <Check
                                      className={cn(
                                        "mr-2 h-4 w-4",
                                        formData.nama_peminjam === `${t.name} - ${t.nip}` ? "opacity-100" : "opacity-0"
                                      )}
                                    />
                                    {`${t.name} - ${t.nip}`}
                                  </CommandItem>
                                ))
                            ) : (
                              mockStudents
                                .filter((s) =>
                                  (selectedKelas === "" || s.kelas === selectedKelas) &&
                                  `${s.name} – ${s.nis} – ${s.kelas}`.toLowerCase().includes(searchNamaPeminjam.toLowerCase())
                                )
                                .map((s) => (
                                  <CommandItem
                                    key={s.nis}
                                    value={`${s.name} – ${s.nis} – ${s.kelas}`}
                                    onSelect={(currentValue) => {
                                      setFormData({
                                        ...formData,
                                        nama_peminjam: currentValue === formData.nama_peminjam ? "" : currentValue,
                                      });
                                      setOpenNamaPeminjam(false);
                                      setSearchNamaPeminjam("");
                                    }}
                                  >
                                    <Check
                                      className={cn(
                                        "mr-2 h-4 w-4",
                                        formData.nama_peminjam === `${s.name} – ${s.nis} – ${s.kelas}` ? "opacity-100" : "opacity-0"
                                      )}
                                    />
                                    {`${s.name} – ${s.nis} – ${s.kelas}`}
                                  </CommandItem>
                                ))
                            )}
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
                    required
                  />
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  {borrowerRole === "siswa" && (
                    <div>
                      <Label htmlFor="guru">Guru Pendamping *</Label>
                      <Popover open={openGuruPendamping} onOpenChange={setOpenGuruPendamping}>
                        <PopoverTrigger asChild>
                          <Button
                            id="guru"
                            variant="outline"
                            role="combobox"
                            aria-expanded={openGuruPendamping}
                            className="mt-1 w-full justify-between"
                          >
                            {formData.guru_pendamping || "Pilih Guru..."}
                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-full p-0">
                          <Command>
                            <CommandInput
                              placeholder="Cari guru pendamping..."
                              value={searchGuruPendamping}
                              onValueChange={setSearchGuruPendamping}
                            />
                            <CommandEmpty>Tidak ada guru ditemukan</CommandEmpty>
                            <div className="max-h-64 overflow-y-auto">
                              {mockTeachers
                                .filter((t) =>
                                  `${t.name} - ${t.nip}`.toLowerCase().includes(searchGuruPendamping.toLowerCase())
                                )
                                .map((t) => (
                                  <CommandItem
                                    key={t.nip}
                                    value={`${t.name} - ${t.nip}`}
                                    onSelect={(currentValue) => {
                                      setFormData({
                                        ...formData,
                                        guru_pendamping: currentValue === formData.guru_pendamping ? "" : currentValue,
                                      });
                                      setOpenGuruPendamping(false);
                                      setSearchGuruPendamping("");
                                    }}
                                  >
                                    <Check
                                      className={cn(
                                        "mr-2 h-4 w-4",
                                        formData.guru_pendamping === `${t.name} - ${t.nip}` ? "opacity-100" : "opacity-0"
                                      )}
                                    />
                                    {`${t.name} - ${t.nip}`}
                                  </CommandItem>
                                ))}
                            </div>
                          </Command>
                        </PopoverContent>
                      </Popover>
                    </div>
                  )}

                  <div>
                    {/* If picking specific items from a jenis, jumlah is derived from selections */}
                    {availableItems.length > 0 ? (
                      <div>
                        <Label>Items dipilih:</Label>
                        <p className="text-sm text-muted-foreground">{selectedItemIds.length} item terpilih</p>
                      </div>
                    ) : (
                      <div>
                        <Label htmlFor="jumlah">Jumlah Barang *</Label>
                        <Input
                          id="jumlah"
                          type="number"
                          min="1"
                          max={selectedItem ? selectedItem.jumlah_stok - selectedItem.jumlah_dipinjam : 1}
                          value={formData.jumlah}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              jumlah: parseInt(e.target.value),
                            })
                          }
                          required
                        />
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex gap-3 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setCurrentStep("scan")}
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
              {/* Borrowing Code */}
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
                    <strong>Catatan:</strong> Kode ini hanya penanda internal.
                  </AlertDescription>
                </Alert>
              </div>

              {/* Peminjam Info */}
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

              {/* Borrowing Details Table */}
              <div className="space-y-3">
                <h4 className="font-semibold">Detail Barang Dipinjam:</h4>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm border-collapse">
                    <thead>
                      <tr className="border-b-2 border-gray-300">
                        <th className="text-left py-2 px-2 font-semibold">No</th>
                        <th className="text-left py-2 px-2 font-semibold">Nama Barang</th>
                        <th className="text-left py-2 px-2 font-semibold">Kode</th>
                        <th className="text-center py-2 px-2 font-semibold">Jumlah</th>
                      </tr>
                    </thead>
                    <tbody>
                      {availableItems.length > 0 ? (
                        availableItems
                          .filter((it) => selectedItemIds.includes(it.id))
                          .map((it, index) => (
                            <tr key={it.id} className="border-b border-gray-200 hover:bg-gray-50">
                              <td className="py-2 px-2">{index + 1}</td>
                              <td className="py-2 px-2 font-medium">{it.nama_barang}</td>
                              <td className="py-2 px-2 text-gray-600">{it.kode_barang}</td>
                              <td className="py-2 px-2 text-center font-medium">1</td>
                            </tr>
                          ))
                      ) : (
                        <tr className="border-b border-gray-200 hover:bg-gray-50">
                          <td className="py-2 px-2">1</td>
                          <td className="py-2 px-2 font-medium">{selectedItem?.nama_barang}</td>
                          <td className="py-2 px-2 text-gray-600">{selectedItem?.kode_barang}</td>
                          <td className="py-2 px-2 text-center font-medium">{formData.jumlah}</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Photo */}
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

              <Button onClick={handleComplete} className="w-full" size="lg">
                <CheckCircle className="h-5 w-5 mr-2" />
                Selesai
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </PublicLayout>
  );
};

export default BorrowFlow;
