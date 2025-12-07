import { useRef, useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Pencil, RotateCcw, Check, AlertCircle } from "lucide-react";

interface SignaturePadProps {
  onConfirm: (imageData: string) => void;
  label?: string;
  width?: number;
  height?: number;
}

const SignaturePad = ({
  onConfirm,
  label = "Tanda Tangan Digital",
  width = 640,
  height = 360,
}: SignaturePadProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isDrawingRef = useRef<boolean>(false);
  const [hasStroke, setHasStroke] = useState(false);
  const [error, setError] = useState<string>("");

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    // White background to ensure exported image is opaque
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }, []);

  const getPos = (e: MouseEvent | TouchEvent, canvas: HTMLCanvasElement) => {
    const rect = canvas.getBoundingClientRect();
    // Touch support
    // @ts-expect-error unified access for touch
    const point = e.touches ? e.touches[0] : e;
    const x = (point.clientX - rect.left) * (canvas.width / rect.width);
    const y = (point.clientY - rect.top) * (canvas.height / rect.height);
    return { x, y };
  };

  const startDrawing = (x: number, y: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    isDrawingRef.current = true;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.lineWidth = 3;
    ctx.strokeStyle = "#111827"; // gray-900
    setHasStroke(true);
  };

  const draw = (x: number, y: number) => {
    if (!isDrawingRef.current) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    if (!isDrawingRef.current) return;
    isDrawingRef.current = false;
  };

  const handlePointerDown = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current!;
    const { x, y } = getPos(e.nativeEvent as any, canvas);
    startDrawing(x, y);
  };

  const handlePointerMove = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current!;
    const { x, y } = getPos(e.nativeEvent as any, canvas);
    draw(x, y);
  };

  const handlePointerUp = (e: React.MouseEvent | React.TouchEvent) => {
    stopDrawing();
  };

  const clear = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    setHasStroke(false);
    setError("");
  };

  const confirm = () => {
    if (!hasStroke) {
      setError("Mohon buat tanda tangan terlebih dahulu.");
      return;
    }
    const canvas = canvasRef.current;
    if (!canvas) return;
    const data = canvas.toDataURL("image/png");
    onConfirm(data);
  };

  return (
    <Card className="p-6 w-full max-w-5xl mx-auto">
      <div className="space-y-4 w-full">
        <div className="flex items-center gap-2 mb-2">
          <Pencil className="h-5 w-5 text-primary" />
          <h3 className="font-semibold text-lg">{label}</h3>
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="bg-white border rounded-lg">
          <canvas
            ref={canvasRef}
            width={width}
            height={height}
            className="w-full touch-none"
            onMouseDown={handlePointerDown}
            onMouseMove={handlePointerMove}
            onMouseUp={handlePointerUp}
            onMouseLeave={handlePointerUp}
            onTouchStart={handlePointerDown}
            onTouchMove={handlePointerMove}
            onTouchEnd={handlePointerUp}
          />
        </div>

        <div className="grid grid-cols-2 gap-2">
          <Button onClick={clear} variant="outline">
            <RotateCcw className="h-4 w-4 mr-2" />
            Bersihkan
          </Button>
          <Button
            onClick={confirm}
            className="bg-success hover:bg-success-light"
          >
            <Check className="h-4 w-4 mr-2" />
            Gunakan
          </Button>
        </div>

        <p className="text-xs text-muted-foreground text-center">
          Tanda tangan ini akan disimpan sebagai gambar.
        </p>
      </div>
    </Card>
  );
};

export default SignaturePad;
