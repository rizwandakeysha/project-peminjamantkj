import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import PublicLayout from "@/layouts/PublicLayout";
import CameraCapture from "@/components/CameraCapture";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, CheckCircle, AlertCircle, Barcode } from "lucide-react";
import { Html5Qrcode, Html5QrcodeSupportedFormats } from "html5-qrcode";
import { Item, Borrowing } from "@/types";
import { toast } from "react-hot-toast";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { barangAPI, peminjamanAPI, API_BASE_URL } from "@/lib/api";
import { getPhotoUrl, uploadCredentialToTelegram } from "@/lib/telegramUtils";

type Step = "scan" | "verify" | "complete";

interface DetailPeminjaman {
  id_detail_peminjaman?: number;
  id_barang?: number;
  status?: "Dipinjam" | "Dikembalikan" | "Rusak" | "Hilang";
  tanggal_kembali?: string;
  foto_bukti_kembali?: string;
}

interface BarangDetail extends Item {
  id_detail_peminjaman?: number;
  detail_peminjaman?: DetailPeminjaman;
  id_peminjaman?: number;
}

const ReturnFlow = () => {
  const navigate = useNavigate();
  const scanInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [webcamEnabled, setWebcamEnabled] = useState(false);
  const [cameras, setCameras] = useState<MediaDeviceInfo[]>([]);
  const [selectedCameraId, setSelectedCameraId] = useState<string | null>(null);
  const currentStreamRef = useRef<MediaStream | null>(null);
  const html5QrRef = useRef<Html5Qrcode | null>(null);
  // Default ke scanner fisik/keyboard; webcam opsional
  const [scanMode, setScanMode] = useState<"manual" | "qr">("manual");
  const [scannerActive, setScannerActive] = useState(false);
  const [currentStep, setCurrentStep] = useState<Step>("scan");
  const [scannedBarcode, setScannedBarcode] = useState("");
  const [foundItem, setFoundItem] = useState<BarangDetail | null>(null);
  const [foundPeminjaman, setFoundPeminjaman] = useState<Borrowing | null>(
    null
  );
  const [verificationPhoto, setVerificationPhoto] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // Focus on scan input on mount
  useEffect(() => {
    if (scanInputRef.current) {
      scanInputRef.current.focus();
    }
  }, []);

  // Enumerate cameras on mount
  useEffect(() => {
    const list = async () => {
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const cams = devices.filter((d) => d.kind === "videoinput");
        setCameras(cams);
        if (cams.length > 0 && !selectedCameraId) {
          setSelectedCameraId(cams[0].deviceId);
        }
      } catch (e) {
        console.warn("enumerateDevices failed", e);
      }
    };
    list();
  }, [selectedCameraId]);

  // Request camera permission
  const requestCameraPermission = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      stream.getTracks().forEach((t) => t.stop());
      const devices = await navigator.mediaDevices.enumerateDevices();
      const cams = devices.filter((d) => d.kind === "videoinput");
      setCameras(cams);
      if (cams.length > 0) setSelectedCameraId(cams[0].deviceId);
      return true;
    } catch (err) {
      console.error("Camera permission denied or error:", err);
      toast.error("Izin kamera ditolak atau tidak tersedia");
      return false;
    }
  };

  const startWebcam = async (deviceId?: string) => {
    try {
      const readerId = "qr-reader";
      setScannerActive(true);
      await new Promise((r) => setTimeout(r, 150));
      if (!html5QrRef.current) {
        html5QrRef.current = new Html5Qrcode(readerId);
      }

      const config = {
        fps: 10,
        formatsToSupport: [Html5QrcodeSupportedFormats.CODE_128],
      } as any;

      await html5QrRef.current.start(
        { deviceId: deviceId ? { exact: deviceId } : undefined } as any,
        config,
        async (decodedText) => {
          const code = String(decodedText).trim();
          await searchBarang(code);
        },
        (errorMsg) => {
          // scanning failure
        }
      );

      setWebcamEnabled(true);
    } catch (err) {
      console.error("Failed to start webcam/scanner:", err);
      toast.error("Gagal mengaktifkan webcam atau scanner");
      try {
        const constraints: MediaStreamConstraints = {
          video: deviceId
            ? { deviceId: { exact: deviceId } }
            : { facingMode: "environment" },
          audio: false,
        };
        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        currentStreamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }
        setWebcamEnabled(true);
      } catch (e) {
        console.error("Fallback webcam start failed:", e);
      }
    }
  };

  const stopWebcam = () => {
    try {
      if (html5QrRef.current) {
        try {
          html5QrRef.current.stop().then(() => {
            html5QrRef.current?.clear();
            html5QrRef.current = null;
          });
        } catch (e) {
          console.warn("Error stopping html5-qrcode:", e);
          html5QrRef.current = null;
        }
      }

      const s = currentStreamRef.current;
      if (s) {
        s.getTracks().forEach((t) => t.stop());
        currentStreamRef.current = null;
      }
      if (videoRef.current) {
        videoRef.current.pause();
        videoRef.current.srcObject = null;
      }
    } finally {
      setScannerActive(false);
      setWebcamEnabled(false);
    }
  };

  // Search barang by kode_barang from database
  const searchBarang = async (kode: string) => {
    if (!kode.trim()) {
      toast.error("Silakan scan atau masukkan barcode barang");
      return;
    }

    setIsLoading(true);
    try {
      // Get all barang and find the one with matching kode_barang
      const allBarang = await barangAPI.getAll();

      const item = allBarang.find(
        (b) => b.kode_barang.toLowerCase() === kode.toLowerCase()
      );

      if (!item) {
        toast.error("❌ Barcode tidak dikenali. Coba lagi.");
        setScannedBarcode("");
        if (scanInputRef.current) {
          scanInputRef.current.focus();
        }
        return;
      }

      // Check if item is currently borrowed (status should be "Dipinjam")
      if (item.status !== "Dipinjam") {
        toast.error(
          `❌ Barang ini tidak sedang dipinjam (Status: ${item.status})`
        );
        setScannedBarcode("");
        return;
      }

      // Find the peminjaman record that has this barang with status "Dipinjam"
      const allPeminjaman = await peminjamanAPI.getAll();

      let foundDetail: any = null;
      let foundPeminjamanRecord: any = null;

      for (const pmj of allPeminjaman) {
        // Filter out null/empty details
        const detailArray = (pmj.detail_peminjaman || []).filter(
          (d: any) => d && d.id_barang
        );

        console.log("🔍 Checking peminjaman:", {
          kode: pmj.kode_peminjaman,
          id_peminjaman: pmj.id_peminjaman,
          detailCount: detailArray.length,
          details: detailArray.map((d: any) => ({
            id_barang: d.id_barang,
            status: d.status,
          })),
        });

        const detail = detailArray.find((d: any) => {
          return d.id_barang === (item.id_barang || item.id) && d.status === "Dipinjam";
        });

        if (detail) {
          foundDetail = detail;
          foundPeminjamanRecord = pmj;
          break;
        }
      }

      if (!foundDetail || !foundPeminjamanRecord) {
        // Show helpful error message with available items
        const availableItems = [];
        for (const pmj of allPeminjaman) {
          const detailArray = (pmj.detail_peminjaman || []).filter(
            (d: any) => d && d.id_barang && d.status === "Dipinjam"
          );
          for (const detail of detailArray) {
            availableItems.push({
              nama_barang: detail.nama_barang,
              kode_barang: detail.kode_barang,
              id_barang: detail.id_barang,
              kode_peminjaman: pmj.kode_peminjaman,
            });
          }
        }

        const itemList = availableItems
          .map(
            (avail) =>
              `${avail.kode_barang} (${avail.nama_barang}) - Transaksi: ${avail.kode_peminjaman}`
          )
          .join("\n");

        toast.error(
          `❌ Barang ini tidak sedang dipinjam.\n\nBarang yang tersedia untuk return:\n${itemList}`
        );
        setScannedBarcode("");
        return;
      }

      // Combine barang info with detail_peminjaman info
      const itemWithDetail = {
        ...item,
        id_detail_peminjaman: foundDetail.id_detail_peminjaman,
      };

      setFoundItem(itemWithDetail);
      setFoundPeminjaman(foundPeminjamanRecord);

      setCurrentStep("verify");
      toast.success(`✓ Barang ditemukan: ${item.nama_barang}`);

      // Stop scanner
      try {
        stopWebcam();
      } catch (e) {
        console.warn("Error stopping scanner", e);
      }
    } catch (error) {
      console.error("Error searching barang:", error);
      toast.error("Gagal mencari barang");
    } finally {
      setIsLoading(false);
    }
  };

  const handleScanBarcode = async () => {
    await searchBarang(scannedBarcode);
  };

  const handlePhotoVerification = async (imageData: string) => {
    setVerificationPhoto(imageData);
    toast.success("Foto verifikasi berhasil! Memproses pengembalian...");

    setIsLoading(true);
    try {
      console.log("🔍 DEBUG - handlePhotoVerification:", {
        foundPeminjaman: foundPeminjaman?.kode_peminjaman,
        foundItem: {
          id: foundItem?.id,
          id_detail_peminjaman: foundItem?.id_detail_peminjaman,
          nama_barang: foundItem?.nama_barang,
        },
        hasImageData: !!imageData,
      });

      // Upload foto return ke Telegram jika base64
      let fotoReturnUrl = imageData;
      if (imageData && imageData.startsWith('data:')) {
        try {
          const base64Response = await fetch(imageData);
          const blob = await base64Response.blob();
          const file = new File([blob], 'return.jpg', { type: 'image/jpeg' });
          
          fotoReturnUrl = await uploadCredentialToTelegram(file, API_BASE_URL);
        } catch (error) {
          console.error('Error uploading return photo to Telegram:', error);
          toast.error('Gagal upload foto pengembalian, menggunakan data lokal');
          // Continue with base64 if upload fails
        }
      }

      // Update detail_peminjaman and peminjaman status via backend
      if (foundPeminjaman && foundItem && foundItem.id_detail_peminjaman) {
        console.log("📤 Calling peminjamanAPI.return()...");
        await peminjamanAPI.return(
          foundPeminjaman.kode_peminjaman,
          foundItem.id_detail_peminjaman,
          fotoReturnUrl
        );
        console.log("✅ peminjamanAPI.return() success!");
      } else {
        console.warn("⚠️ Missing required data for return:", {
          hasPeminjaman: !!foundPeminjaman,
          hasItem: !!foundItem,
          hasDetailId: !!foundItem?.id_detail_peminjaman,
        });
      }

      // Update barang status back to "Tersedia"
      await barangAPI.update(foundItem!.id, {
        status: "Tersedia",
      });

      toast.success(`✓ Pengembalian ${foundItem!.nama_barang} berhasil!`);

      // Move to complete step
      setTimeout(() => {
        setCurrentStep("complete");
      }, 500);
    } catch (error) {
      console.error("Error updating barang status:", error);
      toast.error("Gagal mengupdate status barang. Silahkan coba lagi.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handleScanBarcode();
    }
  };

  const handleScanAgain = () => {
    setCurrentStep("scan");
    setScannedBarcode("");
    setFoundItem(null);
    setFoundPeminjaman(null);
    setVerificationPhoto("");
    if (scanInputRef.current) {
      scanInputRef.current.focus();
    }
  };

  return (
    <PublicLayout>
      <div className="max-w-7xl mx-auto px-2 sm:px-4">
        <Button variant="ghost" onClick={() => navigate("/")} className="mb-6">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Kembali ke Beranda
        </Button>

        <h2 className="text-3xl font-bold mb-2">Kembalikan Barang</h2>
        <p className="text-muted-foreground mb-8">
          Scan barcode barang dengan alat scanner atau masukkan kode barang
          secara manual
        </p>

        {/* Step: Scan Barcode */}
        {currentStep === "scan" && (
          <Card>
            <CardHeader className="space-y-3">
              <div className="flex items-center justify-between gap-3">
                <CardTitle>Scan Barcode Barang</CardTitle>
                <div className="flex items-center gap-2 bg-white/60 backdrop-blur px-3 py-2 rounded-xl border border-border">
                  <div className="h-3 w-3 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-sm font-medium text-foreground">
                    {scanMode === "qr" ? "Kamera siap" : "Scanner fisik siap"}
                  </span>
                </div>
              </div>
              <div className="text-xs text-muted-foreground">
                {scanMode === "qr" ? "Mode: Kamera" : "Mode: Scanner Fisik / Manual"}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Button
                  variant={scanMode === "manual" ? "default" : "outline"}
                  onClick={() => {
                    setScanMode("manual");
                    stopWebcam();
                  }}
                  disabled={isLoading}
                >
                  Scanner Fisik / Manual (disarankan)
                </Button>
                <Button
                  variant={scanMode === "qr" ? "default" : "outline"}
                  onClick={() => setScanMode("qr")}
                  disabled={isLoading}
                >
                  Kamera Barcode
                </Button>
              </div>

              {scanMode === "manual" ? (
                <div className="rounded-2xl border p-4 space-y-4">
                  <div>
                    <Label htmlFor="barcode" className="flex items-center gap-2">
                      <Barcode className="h-4 w-4" />
                      Kode Barang
                    </Label>
                    <Input
                      ref={scanInputRef}
                      id="barcode"
                      placeholder="Contoh: BRG-001"
                      value={scannedBarcode}
                      onChange={(e) => setScannedBarcode(e.target.value.toUpperCase())}
                      onKeyPress={handleKeyPress}
                      className="text-lg font-mono mt-1"
                      autoFocus
                      disabled={isLoading}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      onClick={handleScanBarcode}
                      size="lg"
                      className="w-full"
                      variant="default"
                      disabled={isLoading}
                    >
                      <Barcode className="h-4 w-4 mr-2" />
                      Cari Barang
                    </Button>
                    <Button
                      onClick={() => {
                        setScannedBarcode("");
                        if (scanInputRef.current) {
                          scanInputRef.current.focus();
                        }
                      }}
                      size="lg"
                      variant="outline"
                      disabled={isLoading}
                    >
                      Bersihkan
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="rounded-2xl border p-4 space-y-4">
                  <div className="flex items-center justify-between mb-2 gap-2">
                    <div className="flex items-center gap-2 text-sm">
                      <Label htmlFor="camera-select">Kamera</Label>
                      <select
                        id="camera-select"
                        value={selectedCameraId ?? ""}
                        onChange={(e) => setSelectedCameraId(e.target.value)}
                        className="text-sm p-1 border rounded"
                      >
                        {cameras.map((c) => (
                          <option key={c.deviceId} value={c.deviceId}>
                            {c.label || c.deviceId}
                          </option>
                        ))}
                      </select>
                    </div>
                    {!webcamEnabled ? (
                      <Button
                        size="sm"
                        onClick={async () => {
                          const granted = await requestCameraPermission();
                          if (granted) {
                            startWebcam(selectedCameraId ?? undefined);
                          }
                        }}
                        disabled={isLoading}
                      >
                        Start Webcam
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => {
                          stopWebcam();
                          setScannerActive(false);
                        }}
                        disabled={isLoading}
                      >
                        Stop Webcam
                      </Button>
                    )}
                  </div>

                  <div className="border rounded p-2">
                    {scannerActive ? (
                      <div id="qr-reader" className="w-full h-80 bg-black" />
                    ) : (
                      <video
                        ref={videoRef}
                        className="w-full h-80 bg-black object-cover"
                        playsInline
                        muted
                      />
                    )}
                    <div className="flex gap-2 mt-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          stopWebcam();
                          setScannerActive(false);
                        }}
                        disabled={isLoading}
                      >
                        Close
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Step: Verify Item */}
        {currentStep === "verify" && foundItem && (
          <Card>
            <CardHeader>
              <CardTitle>Verifikasi Pengembalian</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-2xl border p-4">
                <div className="flex items-start gap-4">
                  {foundItem.foto_barang && (
                    <img
                      src={getPhotoUrl(foundItem.foto_barang, API_BASE_URL)}
                      alt={foundItem.nama_barang}
                      className="h-24 w-24 object-cover rounded"
                    />
                  )}
                  <div className="flex-1 space-y-2">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-bold text-lg">{foundItem.nama_barang}</h3>
                        <p className="text-sm font-mono text-muted-foreground">
                          Kode: {foundItem.kode_barang}
                        </p>
                      </div>
                      <CheckCircle className="h-6 w-6 text-success" />
                    </div>
                    {foundItem.deskripsi_barang && (
                      <p className="text-sm text-muted-foreground bg-muted/40 p-2 rounded">
                        {foundItem.deskripsi_barang}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription className="text-sm">
                  Pastikan barang yang di-scan sesuai dengan barang di tangan Anda sebelum melanjutkan.
                </AlertDescription>
              </Alert>

              <div className="rounded-2xl border p-4 space-y-4">
                <div className="space-y-1">
                  <h4 className="font-semibold">Foto Verifikasi</h4>
                  <p className="text-sm text-muted-foreground">
                    Ambil foto barang yang sedang dikembalikan.
                  </p>
                </div>
                <CameraCapture
                  onCapture={handlePhotoVerification}
                  label="Foto Pengembalian Barang"
                />
              </div>

              <Button onClick={handleScanAgain} variant="outline" className="w-full">
                Batal / Scan Lain
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Step: Complete */}
        {currentStep === "complete" && foundItem && (
          <Card>
            <CardHeader>
              <div className="text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-success/10 text-success rounded-full mb-4">
                  <CheckCircle className="h-8 w-8" />
                </div>
                <CardTitle className="text-3xl font-extrabold">
                  Pengembalian Berhasil!
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Item Returned */}
              <div className="bg-success/5 border border-success/30 rounded-2xl p-6">
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">
                    Barang yang Dikembalikan:
                  </p>
                  <p className="text-2xl font-bold">{foundItem.nama_barang}</p>
                  <p className="text-sm font-mono text-muted-foreground">
                    Kode: {foundItem.kode_barang}
                  </p>
                </div>
              </div>

              {/* Photo */}
              {verificationPhoto && (
                <div>
                  <h4 className="font-semibold mb-2">Foto Verifikasi:</h4>
                  <img
                    src={verificationPhoto}
                    alt="Verification"
                    className="w-full h-64 object-cover rounded-lg border"
                  />
                </div>
              )}

              {/* Actions */}
              <div className="grid grid-cols-2 gap-2">
                <Button
                  onClick={handleScanAgain}
                  size="lg"
                  className="w-full"
                  disabled={isLoading}
                >
                  Kembalikan Lagi
                </Button>
                <Button
                  onClick={() => navigate("/")}
                  size="lg"
                  variant="outline"
                  disabled={isLoading}
                >
                  Selesai
                </Button>
              </div>

              <Alert className="bg-blue-50 border-blue-200">
                <AlertCircle className="h-4 w-4 text-blue-600" />
                <AlertDescription className="text-blue-900 text-sm">
                  Terimakasih telah mengembalikan barang. Jika ada barang lagi
                  yang dikembalikan, klik "Kembalikan Lagi" untuk melanjutkan
                  dengan barang berikutnya.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        )}
      </div>
    </PublicLayout>
  );
};

export default ReturnFlow;
