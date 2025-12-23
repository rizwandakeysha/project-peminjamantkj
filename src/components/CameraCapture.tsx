import { useRef, useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Camera, RotateCcw, AlertCircle, Zap, ZapOff } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import SignaturePad from "@/components/SignaturePad";

interface CameraCaptureProps {
  onCapture: (imageData: string) => void;
  label?: string;
  isSubmitting?: boolean;
  enableFlashToggle?: boolean; // show flash toggle (only for add barang)
  autoConfirm?: boolean; // auto-call onCapture after shot (only for add barang)
  cropSquare?: boolean; // crop to 1:1 square (only for add barang)
}

const CameraCapture = ({
  onCapture,
  label = "Ambil Foto",
  isSubmitting = false,
  enableFlashToggle = false,
  autoConfirm = false,
  cropSquare = false,
}: CameraCaptureProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [error, setError] = useState<string>("");
  const [useSignature, setUseSignature] = useState<boolean>(false);
  const [mirrorPreview, setMirrorPreview] = useState<boolean>(true);
  const [flashEnabled, setFlashEnabled] = useState<boolean>(false);

  useEffect(() => {
    // On mobile devices, do not mirror the camera preview/capture
    const isCoarse = window.matchMedia?.("(pointer: coarse)").matches;
    const ua = navigator.userAgent.toLowerCase();
    const isMobileUA = /android|iphone|ipad|ipod/.test(ua);
    if (isCoarse || isMobileUA) {
      setMirrorPreview(false);
    }

    return () => {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [stream]);

  // Auto-start camera on mount. If camera isn't available or permission denied,
  // fall back immediately to the signature pad (useSignature = true).
  useEffect(() => {
    startCamera();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const startCamera = async () => {
    try {
      setError("");
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error("Camera API tidak tersedia pada perangkat ini");
      }

      const constraints: any = {
        video: { facingMode: { ideal: "environment" }, width: 640, height: 480 },
      };

      // Try to enable flash when allowed (only if toggle enabled)
      if (enableFlashToggle && flashEnabled) {
        constraints.video.torch = true;
      }

      const mediaStream = await navigator.mediaDevices.getUserMedia(constraints);

      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        setStream(mediaStream);
        setIsStreaming(true);
        setUseSignature(false);
      }
    } catch (err: any) {
      console.error("Error accessing camera:", err);
      setError(
        err?.name === "NotAllowedError" || err?.name === "PermissionDeniedError"
          ? "Akses kamera ditolak. Silakan gunakan tanda tangan digital."
          : "Kamera tidak tersedia. Silakan gunakan tanda tangan digital."
      );
      setUseSignature(true);
    }
  };

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const context = canvas.getContext("2d");

      if (context) {
        const videoWidth = video.videoWidth;
        const videoHeight = video.videoHeight;

        if (cropSquare) {
          const size = Math.min(videoWidth, videoHeight);
          const offsetX = (videoWidth - size) / 2;
          const offsetY = (videoHeight - size) / 2;
          canvas.width = size;
          canvas.height = size;
          context.save();
          if (mirrorPreview) {
            context.translate(size, 0);
            context.scale(-1, 1);
          }
          context.drawImage(video, offsetX, offsetY, size, size, 0, 0, size, size);
          context.restore();
        } else {
          // Keep original aspect ratio
          canvas.width = videoWidth;
          canvas.height = videoHeight;
          context.save();
          if (mirrorPreview) {
            context.translate(videoWidth, 0);
            context.scale(-1, 1);
          }
          context.drawImage(video, 0, 0, videoWidth, videoHeight);
          context.restore();
        }

        const imageData = canvas.toDataURL("image/jpeg", 0.8);
        setCapturedImage(imageData);

        if (autoConfirm) {
          onCapture(imageData);
        }

        // Stop camera after capture
        if (stream) {
          stream.getTracks().forEach((track) => track.stop());
          setIsStreaming(false);
        }
      }
    }
  };

  const retakePhoto = () => {
    setCapturedImage(null);
    setHasSubmitted(false);
    startCamera();
  };

  return (
    <Card className="p-6 w-full max-w-5xl mx-auto">
      <div className="space-y-4 w-full">
        <div className="flex items-center gap-2 mb-4">
          <Camera className="h-5 w-5 text-primary" />
          <h3 className="font-semibold text-lg">{label}</h3>
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {!useSignature ? (
          <div
            className={`relative bg-muted rounded-lg overflow-hidden w-full ${
              cropSquare ? "aspect-square max-w-md" : "aspect-video max-w-3xl"
            } mx-auto`}
          >
            {!isStreaming && !capturedImage && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center space-y-4">
                  <Camera className="h-16 w-16 text-muted-foreground mx-auto" />
                  <p className="text-sm text-muted-foreground">
                    Mencoba mengaktifkan kamera...
                  </p>
                </div>
              </div>
            )}

            {capturedImage ? (
              <img
                src={capturedImage}
                alt="Captured"
                className={`w-full h-full object-cover ${mirrorPreview ? "" : ""}`}
              />
            ) : (
              <video
                ref={videoRef}
                autoPlay
                playsInline
                className={`w-full h-full object-cover ${mirrorPreview ? "transform -scale-x-100" : ""}`}
              />
            )}

            <canvas ref={canvasRef} className="hidden" />

            {/* Flash toggle button - only for flows that need it (add barang) */}
            {enableFlashToggle && isStreaming && !capturedImage && (
              <button
                onClick={() => {
                  setFlashEnabled(!flashEnabled);
                  // Restart camera with new flash setting
                  if (stream) {
                    stream.getTracks().forEach((track) => track.stop());
                    setStream(null);
                    startCamera();
                  }
                }}
                className="absolute top-3 right-3 bg-black/50 hover:bg-black/70 text-white p-2 rounded-full transition"
                title={flashEnabled ? "Flash nyala" : "Flash mati"}
              >
                {flashEnabled ? (
                  <Zap className="h-5 w-5" />
                ) : (
                  <ZapOff className="h-5 w-5" />
                )}
              </button>
            )}
          </div>
        ) : (
          <SignaturePad
            label="Tanda Tangan Digital"
            onConfirm={(img) => {
              // For signature pad, directly call onCapture without waiting for button click
              onCapture(img);
            }}
          />
        )}

        <div className="space-y-2">
          {/* While attempting to start camera (auto-start), show a small status.
              If camera is unavailable we render SignaturePad above (useSignature=true).
              When streaming, show capture button. */}
          {!useSignature && !isStreaming && !capturedImage && (
            <div className="text-center text-sm text-muted-foreground">
              Mencoba mengaktifkan kamera...
            </div>
          )}

          {isStreaming && !capturedImage && (
            <Button onClick={capturePhoto} className="w-full">
              <Camera className="h-4 w-4 mr-2" />
              Ambil Foto
            </Button>
          )}

          {capturedImage && (
            autoConfirm ? (
              <Button
                onClick={retakePhoto}
                variant="outline"
                className="w-full"
              >
                <RotateCcw className="h-4 w-4 mr-2" />
                Ulangi
              </Button>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                <Button
                  onClick={retakePhoto}
                  variant="outline"
                  disabled={isSubmitting || hasSubmitted}
                >
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Ulangi
                </Button>
                <Button
                  onClick={() => {
                    if (capturedImage && !hasSubmitted) {
                      setHasSubmitted(true);
                      onCapture(capturedImage);
                    }
                  }}
                  className="bg-success hover:bg-success-light"
                  disabled={isSubmitting || hasSubmitted}
                >
                  {hasSubmitted ? "Terkirim" : "Gunakan"}
                </Button>
              </div>
            )
          )}
        </div>

        <p className="text-xs text-muted-foreground text-center">
          {useSignature
            ? "Tanda tangan ini akan disimpan sebagai bukti peminjaman."
            : "Pastikan barang terlihat jelas"}
        </p>
      </div>
    </Card>
  );
};

export default CameraCapture;
