import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import PublicLayout from "@/layouts/PublicLayout";
import CameraCapture from "@/components/CameraCapture";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, CheckCircle, AlertCircle, Barcode } from "lucide-react";
import { Item } from "@/types";
import { mockItems } from "@/lib/mockData";
import { toast } from "react-hot-toast";
import { Alert, AlertDescription } from "@/components/ui/alert";

type Step = "scan" | "verify" | "complete";

const ReturnFlow = () => {
  const navigate = useNavigate();
  const scanInputRef = useRef<HTMLInputElement>(null);
  const [currentStep, setCurrentStep] = useState<Step>("scan");
  const [scannedBarcode, setScannedBarcode] = useState("");
  const [foundItem, setFoundItem] = useState<Item | null>(null);
  const [verificationPhoto, setVerificationPhoto] = useState("");

  // Focus on scan input on mount
  useEffect(() => {
    if (scanInputRef.current) {
      scanInputRef.current.focus();
    }
  }, []);

  const handleScanBarcode = () => {
    if (!scannedBarcode.trim()) {
      toast.error("Silakan scan atau masukkan barcode barang");
      return;
    }

    // DUMMY MODE: Find item by kode_barang
    const item = mockItems.find(
      (i) => i.kode_barang.toLowerCase() === scannedBarcode.toLowerCase()
    );

    if (item) {
      setFoundItem(item);
      setCurrentStep("verify");
      toast.success(`✓ Barang ditemukan: ${item.nama_barang}`);
    } else {
      toast.error("❌ Barcode tidak dikenali. Coba lagi.");
      setScannedBarcode("");
      if (scanInputRef.current) {
        scanInputRef.current.focus();
      }
    }
  };

  const handlePhotoVerification = (imageData: string) => {
    setVerificationPhoto(imageData);
    toast.success("Foto verifikasi berhasil!");
    setTimeout(() => {
      setCurrentStep("complete");
    }, 500);
  };

  const handleComplete = () => {
    if (!foundItem) {
      toast.error("Data barang tidak lengkap");
      return;
    }

    // DUMMY MODE: Just show success
    toast.success(
      `✓ Pengembalian ${foundItem.nama_barang} berhasil!`
    );

    // Reset untuk scan berikutnya
    setTimeout(() => {
      setCurrentStep("scan");
      setScannedBarcode("");
      setFoundItem(null);
      setVerificationPhoto("");
      if (scanInputRef.current) {
        scanInputRef.current.focus();
      }
    }, 1500);
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handleScanBarcode();
    }
  };

  return (
    <PublicLayout>
      <div className="max-w-3xl mx-auto">
        <Button variant="ghost" onClick={() => navigate("/")} className="mb-6">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Kembali ke Beranda
        </Button>

        <h2 className="text-3xl font-bold mb-2">Kembalikan Barang</h2>
        <p className="text-muted-foreground mb-8">
          Scan barcode barang dengan alat scanner atau masukkan kode barang secara manual
        </p>

        {/* Step: Scan Barcode */}
        {currentStep === "scan" && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Barcode className="h-5 w-5 text-primary" />
                Scan Barcode Barang
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Scanner Input - Invisible but functional */}
              <div className="space-y-4">
                <Alert className="bg-blue-50 border-blue-200">
                  <AlertCircle className="h-4 w-4 text-blue-600" />
                  <AlertDescription className="text-blue-900 text-sm">
                    <strong>Instruksi:</strong> Letakkan kursor di input box di bawah, kemudian gunakan alat scanner untuk scan barcode barang. Input akan otomatis terisi dan diproses.
                  </AlertDescription>
                </Alert>

                <div>
                  <Label htmlFor="barcode" className="flex items-center gap-2">
                    <Barcode className="h-4 w-4" />
                    Barcode Barang *
                  </Label>
                  <Input
                    ref={scanInputRef}
                    id="barcode"
                    placeholder="Scan barcode atau ketik kode barang (contoh: BRG-001)"
                    value={scannedBarcode}
                    onChange={(e) => setScannedBarcode(e.target.value.toUpperCase())}
                    onKeyPress={handleKeyPress}
                    className="text-lg font-mono mt-1 border-2"
                    autoFocus
                  />
                  <p className="text-xs text-muted-foreground mt-2">
                    Tekan Enter atau klik tombol Scan untuk memproses barcode
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <Button
                    onClick={handleScanBarcode}
                    size="lg"
                    className="w-full"
                    variant="default"
                  >
                    <Barcode className="h-4 w-4 mr-2" />
                    Scan
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
                  >
                    Bersihkan
                  </Button>
                </div>
              </div>

              {/* Info */}
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription className="text-xs space-y-2">
                  <p><strong>Satu barang = Satu scan</strong></p>
                  <p>Jika ada beberapa barang yang dikembalikan, scan satu per satu dan proses untuk masing-masing barang.</p>
                  <p>Format barcode: BRG-001, BRG-002, dst (sesuai dengan kode barang individual)</p>
                </AlertDescription>
              </Alert>

              {/* Recent Items - untuk testing */}
              <div className="border-t pt-4">
                <p className="text-sm font-semibold mb-2">📦 Barang Tersedia untuk Testing:</p>
                <div className="grid grid-cols-1 gap-2">
                  {mockItems.slice(0, 3).map((item) => (
                    <Button
                      key={item.id}
                      variant="outline"
                      className="justify-start text-left h-auto py-2"
                      onClick={() => {
                        setScannedBarcode(item.kode_barang);
                        setTimeout(() => handleScanBarcode(), 100);
                      }}
                    >
                      <div className="text-xs">
                        <div className="font-mono font-bold">{item.kode_barang}</div>
                        <div className="text-gray-600">{item.nama_barang}</div>
                      </div>
                    </Button>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step: Verify Item */}
        {currentStep === "verify" && foundItem && (
          <Card>
            <CardHeader>
              <CardTitle>Verifikasi Barang</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Item Info */}
              <div className="bg-green-50 border-2 border-green-200 p-4 rounded-lg">
                <div className="flex items-start gap-4">
                  {foundItem.foto_barang && (
                    <img
                      src={foundItem.foto_barang}
                      alt={foundItem.nama_barang}
                      className="h-24 w-24 object-cover rounded"
                    />
                  )}
                  <div className="flex-1 space-y-2">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-bold text-lg">{foundItem.nama_barang}</h3>
                        <p className="text-sm font-mono text-gray-600">
                          Kode: {foundItem.kode_barang}
                        </p>
                      </div>
                      <CheckCircle className="h-6 w-6 text-green-600" />
                    </div>
                    {foundItem.notes && (
                      <p className="text-sm text-gray-700 bg-white/50 p-2 rounded">
                        {foundItem.notes}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Info Alert */}
              <Alert className="bg-yellow-50 border-yellow-200">
                <AlertCircle className="h-4 w-4 text-yellow-700" />
                <AlertDescription className="text-yellow-800 text-sm">
                  Pastikan barang yang di-scan sesuai dengan barang di tangan Anda sebelum melanjutkan.
                </AlertDescription>
              </Alert>

              {/* Photo Capture */}
              <div className="space-y-4">
                <h4 className="font-semibold flex items-center gap-2">
                  📸 Ambil Foto Verifikasi
                </h4>
                <CameraCapture onCapture={handlePhotoVerification} />
              </div>

              {/* Actions */}
              <div className="grid grid-cols-2 gap-2">
                <Button
                  onClick={() => {
                    setCurrentStep("scan");
                    setFoundItem(null);
                    setScannedBarcode("");
                    if (scanInputRef.current) {
                      scanInputRef.current.focus();
                    }
                  }}
                  variant="outline"
                  className="w-full"
                >
                  Batal / Scan Lain
                </Button>
              </div>
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
              <div className="bg-success/5 border-2 border-success rounded-lg p-6">
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">Barang yang Dikembalikan:</p>
                  <p className="text-2xl font-bold">{foundItem.nama_barang}</p>
                  <p className="text-sm font-mono text-gray-600">
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
                  onClick={handleComplete}
                  size="lg"
                  className="w-full"
                >
                  ✓ Selesai
                </Button>
                <Button
                  onClick={() => navigate("/")}
                  size="lg"
                  variant="outline"
                >
                  Beranda
                </Button>
              </div>

              <Alert className="bg-blue-50 border-blue-200">
                <AlertCircle className="h-4 w-4 text-blue-600" />
                <AlertDescription className="text-blue-900 text-sm">
                  Terimakasih telah mengembalikan barang. Jika ada barang lagi yang dikembalikan, klik "Selesai" untuk melanjutkan dengan barang berikutnya.
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
