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
  ArrowLeft,
  ArrowRight,
  QrCode,
  FileText,
  Camera,
  CheckCircle,
  AlertCircle,
} from "lucide-react";
import { Item, BorrowingFormData } from "@/types";
import { mockItems, mockTeachers, mockStudents } from "@/lib/mockData";
// Removed client-side code generation; server is source of truth
import { toast } from "react-hot-toast";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { barangAPI, peminjamanAPI } from "@/lib/api";

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

      // Otherwise, fallback to fetching single barang by kode
      const item = await barangAPI.getByKode(decodedText);
      if (item) {
        const available = item.jumlah_stok - item.jumlah_dipinjam;
        if (available > 0) {
          setSelectedItem(item);
          setFormData((prev) => ({ ...prev, id_barang: item.id }));
          setSelectedJenisCode(item.kode_jenis || null);
          setCurrentStep("form");
        } else {
          toast.error("Maaf, barang tidak tersedia saat ini");
        }
      } else {
        toast.error("QR Code tidak valid atau barang tidak ditemukan");
      }
    } catch (error) {
      console.error("Error fetching item:", error);
      toast.error("Gagal memuat data barang");
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
      const createdCodes: string[] = [];

      if (availableItems.length > 0) {
        // Create one borrowing per selected individual item (jumlah = 1)
        for (const id of itemIdsToBorrow) {
          const result = await peminjamanAPI.create({
            id_barang: Number(id),
            nama_peminjam: formData.nama_peminjam.trim(),
            kontak: formData.kontak?.trim() || null,
            keperluan: formData.keperluan.trim(),
            guru_pendamping: formData.guru_pendamping.trim(),
            jumlah: 1,
            foto_credential: imageData || null,
          });
          if (result && result.kode_peminjaman) createdCodes.push(result.kode_peminjaman);
        }
      } else {
        // Single item, possibly multiple jumlah
        const result = await peminjamanAPI.create({
          id_barang: Number(selectedItem!.id),
          nama_peminjam: formData.nama_peminjam.trim(),
          kontak: formData.kontak?.trim() || null,
          keperluan: formData.keperluan.trim(),
          guru_pendamping: formData.guru_pendamping.trim(),
          jumlah: Number(formData.jumlah),
          foto_credential: imageData || null,
        });
        if (result && result.kode_peminjaman) createdCodes.push(result.kode_peminjaman);
      }

      setBorrowingCode(createdCodes.join(", ") || "");
      setCurrentStep("summary");
      toast.success("Peminjaman berhasil dibuat!");
    } catch (error) {
      console.error("Error creating borrowing:", error);
      toast.error("Gagal menyimpan data peminjaman");
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
                    <select
                      id="role"
                      value={borrowerRole}
                      onChange={(e) => setBorrowerRole(e.target.value as any)}
                      className="mt-1 w-full rounded-md border px-3 py-2 bg-background"
                    >
                      <option value="guru">Guru</option>
                      <option value="siswa">Siswa</option>
                    </select>
                  </div>

                  <div>
                    <Label htmlFor="nama">Nama Peminjam *</Label>
                    {borrowerRole === "guru" ? (
                      <select
                        id="nama"
                        value={formData.nama_peminjam}
                        onChange={(e) =>
                          setFormData({ ...formData, nama_peminjam: e.target.value })
                        }
                        className="mt-1 w-full rounded-md border px-3 py-2 bg-background"
                        required
                      >
                        <option value="">Pilih Guru</option>
                        {mockTeachers.map((t) => (
                          <option key={t.nip} value={`${t.name} - ${t.nip}`}>
                            {`${t.name} - ${t.nip}`}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <select
                        id="nama"
                        value={formData.nama_peminjam}
                        onChange={(e) =>
                          setFormData({ ...formData, nama_peminjam: e.target.value })
                        }
                        className="mt-1 w-full rounded-md border px-3 py-2 bg-background"
                        required
                      >
                        <option value="">Pilih Siswa</option>
                        {mockStudents.map((s) => (
                          <option key={s.nis} value={`${s.name} - ${s.nis}`}>
                            {`${s.name} - ${s.nis}`}
                          </option>
                        ))}
                      </select>
                    )}
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
                      <select
                        id="guru"
                        value={formData.guru_pendamping}
                        onChange={(e) =>
                          setFormData({ ...formData, guru_pendamping: e.target.value })
                        }
                        className="mt-1 w-full rounded-md border px-3 py-2 bg-background"
                        required
                      >
                        <option value="">Pilih Guru</option>
                        <option value="Guru A">Pak Andi Bayu, S.Pd.</option>
                        <option value="Guru B">Bu Ira Rosmalina, M.Pd.</option>
                        <option value="Guru C">Guru C</option>
                      </select>
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
                <CardTitle className="text-2xl mb-2">
                  Peminjaman Berhasil!
                </CardTitle>
                <p className="text-muted-foreground">
                  Pemberitahuan: kode peminjaman di bawah hanya sebagai penanda. Tidak perlu disimpan untuk proses pengembalian.
                </p>
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

              {/* Details */}
              <div className="space-y-3">
                <h4 className="font-semibold">Detail Peminjaman:</h4>
                <div className="grid gap-2 text-sm">
                  {availableItems.length > 0 ? (
                    <div className="space-y-2">
                      <span className="text-muted-foreground">Barang dipilih:</span>
                      <div className="text-sm space-y-1">
                        {availableItems
                          .filter((it) => selectedItemIds.includes(it.id))
                          .map((it) => (
                            <div key={it.id} className="font-medium">{it.nama_barang} — {it.kode_barang}</div>
                          ))}
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Barang:</span>
                        <span className="font-medium">{selectedItem?.nama_barang}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Jumlah:</span>
                        <span className="font-medium">{formData.jumlah}</span>
                      </div>
                    </>
                  )}
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
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">
                      Guru Pendamping:
                    </span>
                    <span className="font-medium">
                      {formData.guru_pendamping}
                    </span>
                  </div>
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
