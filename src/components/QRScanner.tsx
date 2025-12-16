import { useEffect, useRef, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { QrCode, X, AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface QRScannerProps {
  onScanSuccess: (decodedText: string) => void;
  onClose?: () => void;
  onUnavailable?: () => void;
}

const QRScanner = ({
  onScanSuccess,
  onClose,
  onUnavailable,
}: QRScannerProps) => {
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState<string>("");
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const videoElRef = useRef<HTMLVideoElement | null>(null);
  const barcodeLoopRef = useRef<number | null>(null);
  const barcodeDetectorRef = useRef<any | null>(null);
  const hasStoppedRef = useRef<boolean>(false);
  const isProcessingRef = useRef<boolean>(false); // Lock to prevent multiple scans
  const [cameraPermission, setCameraPermission] = useState<
    "granted" | "denied" | "prompt"
  >("prompt");

  // NOTE: scanner cleanup is handled in the mount effect below which returns
  // `stopScanner`. Removing the above conditional cleanup avoids complex
  // interleavings that could leave media tracks running in some edge cases.

  const stopScanner = async (shouldClose?: boolean) => {
    if (hasStoppedRef.current) {
      if (shouldClose) onClose?.();
      return;
    }
    hasStoppedRef.current = true;
    try {
      // Stop html5-qrcode if running
      if (scannerRef.current && isScanning) {
        await scannerRef.current.stop();
      }

      // Stop native BarcodeDetector path: stop video tracks and cancel loop
      if (videoElRef.current) {
        try {
          const stream = (videoElRef.current as HTMLVideoElement)
            .srcObject as MediaStream | null;
          if (stream) stream.getTracks().forEach((t) => t.stop());
        } catch (e) {}
        try {
          if (videoElRef.current.parentElement)
            videoElRef.current.parentElement.removeChild(videoElRef.current);
        } catch (e) {}
        videoElRef.current = null;
      }
      if (barcodeLoopRef.current) {
        cancelAnimationFrame(barcodeLoopRef.current);
        barcodeLoopRef.current = null;
      }
      barcodeDetectorRef.current = null;
    } catch (err) {
      // Swallow errors from double-stops or invalid state
      // This is expected when scanner was never started successfully
      console.log("Scanner stop error (safe to ignore):", err);
    } finally {
      setIsScanning(false);
      scannerRef.current = null;
      if (shouldClose) onClose?.();
    }
  };

  const startScanning = async () => {
    try {
      setError("");
      hasStoppedRef.current = false;
      if (isScanning) return; // avoid starting twice
      
      // Prefer native BarcodeDetector when available (faster)
      const supportsBarcodeDetector =
        typeof (window as any).BarcodeDetector === "function";

      if (supportsBarcodeDetector) {
        try {
          barcodeDetectorRef.current = new (window as any).BarcodeDetector({
            formats: ["qr_code"],
          });

          const container = document.getElementById("qr-reader");
          if (!container) throw new Error("Missing qr-reader container");

          const video = document.createElement("video");
          video.setAttribute("playsinline", "true");
          video.style.width = "100%";
          video.style.height = "auto";
          container.appendChild(video);
          videoElRef.current = video;

          const stream = await navigator.mediaDevices.getUserMedia({
            video: {
              facingMode: "environment",
              width: { ideal: 640 },
              height: { ideal: 480 },
            },
            audio: false,
          });
          video.srcObject = stream;
          await video.play();

          setIsScanning(true);
          setCameraPermission("granted");

          // detection loop (throttled via RAF)
          let lastTs = 0;
          const loop = async (ts: number) => {
            if (hasStoppedRef.current) return;
            if (ts - lastTs >= 33) {
              lastTs = ts;
              try {
                const barcodes = await barcodeDetectorRef.current.detect(video);
                if (barcodes && barcodes.length > 0) {
                  // Prevent multiple callbacks for same/different scan
                  if (isProcessingRef.current) return;
                  isProcessingRef.current = true;

                  const code = barcodes[0];
                  const decodedValue = code.rawValue || code.rawText || "";
                  await stopScanner(false);
                  onScanSuccess(decodedValue);
                  return;
                }
              } catch (e) {
                // ignore detection errors
              }
            }
            barcodeLoopRef.current = requestAnimationFrame(loop);
          };

          barcodeLoopRef.current = requestAnimationFrame(loop);
          return;
        } catch (err) {
          console.warn(
            "BarcodeDetector init failed, falling back to html5-qrcode:",
            err
          );
          barcodeDetectorRef.current = null;
          if (videoElRef.current) {
            try {
              const s = (videoElRef.current as HTMLVideoElement)
                .srcObject as MediaStream | null;
              if (s) s.getTracks().forEach((t) => t.stop());
            } catch (e) {}
            try {
              videoElRef.current.remove();
            } catch (e) {}
            videoElRef.current = null;
          }
        }
      }

      // Fallback: html5-qrcode with higher fps and responsive qrbox
      const html5QrCode = new Html5Qrcode("qr-reader");

      const container = document.getElementById("qr-reader");
      let qrboxSize = 250;
      if (container) {
        try {
          const cw = container.clientWidth || 640;
          qrboxSize = Math.max(160, Math.min(800, Math.floor(cw * 0.8)));
        } catch (e) {}
      }

      const config = {
        fps: 20,
        qrbox: { width: qrboxSize, height: qrboxSize },
        videoConstraints: {
          facingMode: "environment",
          width: { ideal: 640 },
          height: { ideal: 480 },
        },
      } as any;

      await html5QrCode.start(
        { facingMode: "environment" },
        config,
        async (decodedText) => {
          // Prevent multiple callbacks
          if (isProcessingRef.current) return;
          isProcessingRef.current = true;

          await stopScanner(false);
          onScanSuccess(decodedText);
        },
        (errorMessage) => {
          // ignore
        }
      );

      scannerRef.current = html5QrCode;
      setIsScanning(true);
      setCameraPermission("granted");
    } catch (err: any) {
      console.error("Error starting scanner:", err);

      // Clear scanner ref since start failed
      scannerRef.current = null;
      hasStoppedRef.current = true; // Prevent stop errors
      setCameraPermission("denied");

      // Check if it's a permission denied error
      if (
        err.name === "NotAllowedError" ||
        err.message?.includes("Permission denied")
      ) {
        setError(
          "Akses kamera ditolak. Silakan gunakan input manual di bawah."
        );
      } else {
        setError(
          "Tidak dapat mengakses kamera. Pastikan izin kamera telah diberikan atau gunakan input manual."
        );
      }

      // Call onUnavailable after a brief delay to allow component to settle
      setTimeout(() => {
        onUnavailable?.();
      }, 100);
    }
  };

  const stopScanning = () => {
    stopScanner(true);
  };

  // Auto-start scanner on mount
  useEffect(() => {
    startScanning();
    return () => {
      stopScanner();
    };
    // run once on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Card className="p-6 w-full max-w-3xl mx-auto">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <QrCode className="h-5 w-5 text-primary" />
            <h3 className="font-semibold text-lg">Scan QR Code</h3>
          </div>
          <Button variant="ghost" size="icon" onClick={stopScanning}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="bg-muted/60 border border-border rounded-lg p-3 flex items-start gap-2">
          <AlertCircle className="h-4 w-4 text-primary mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-foreground">
              Arahkan QR ke kotak bercahaya di layar
            </p>
            <p className="text-xs text-muted-foreground">
              Pastikan kode berada di tengah frame dan stabil selama 1-2 detik. Scanner berhenti otomatis setelah berhasil.
            </p>
          </div>
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="relative bg-muted rounded-lg overflow-hidden">
          <div id="qr-reader" className="w-full min-h-[300px]"></div>
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <div className="relative w-64 h-64 max-w-[80%] max-h-[80%]">
              <div className="absolute inset-0 rounded-2xl border-2 border-primary/80 shadow-[0_0_0_9999px_rgba(0,0,0,0.35)]" />
              <div className="absolute inset-8 border border-dashed border-primary/50 rounded-xl" />
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-1 h-10 bg-primary/80 animate-pulse" />
              </div>
            </div>
          </div>
          {!isScanning && (
            <div className="absolute inset-0 flex items-center justify-center bg-muted">
              <div className="text-center space-y-4">
                <QrCode className="h-16 w-16 text-muted-foreground mx-auto" />
                <p className="text-sm text-muted-foreground">
                  {cameraPermission === "denied"
                    ? "Akses kamera ditolak"
                    : "Klik tombol di bawah untuk memulai scan"}
                </p>
              </div>
            </div>
          )}
        </div>

        <div className="space-y-2">
          {!isScanning ? (
            <Button onClick={startScanning} className="w-full">
              Mulai Scan
            </Button>
          ) : (
            <Button onClick={stopScanning} variant="outline" className="w-full">
              Batal
            </Button>
          )}

          {cameraPermission === "denied" && onUnavailable && (
            <Button
              onClick={() => onUnavailable()}
              variant="outline"
              className="w-full"
            >
              Gunakan Input Manual
            </Button>
          )}
        </div>

        <p className="text-xs text-muted-foreground text-center">
          {cameraPermission === "denied"
            ? "Atau klik tombol di atas untuk input kode manual"
            : "Arahkan kamera ke QR Code yang ada pada barang"}
        </p>
      </div>
    </Card>
  );
};

export default QRScanner;
