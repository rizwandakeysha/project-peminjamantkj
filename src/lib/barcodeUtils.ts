// Use jsbarcode to generate standards-compliant Code128 barcodes.
type BarcodeOpts = {
  width?: number; // full canvas width
  height?: number; // full canvas height
  margin?: number; // margin for JsBarcode
  moduleWidth?: number; // narrow bar width (JsBarcode 'width')
  barHeight?: number; // JsBarcode 'height'
  fontSize?: number;
  bg?: string;
  // vertical compression factor when drawing into final canvas (0.0-1.0)
  verticalScale?: number;
  textBelow?: boolean;
};

export const createBarcodeDataURL = async (
  code: string,
  opts?: BarcodeOpts
): Promise<string> => {
  // dynamic import to avoid type issues at build-time
  const JsBarcodeModule: any = (await import("jsbarcode"));
  const JsBarcode = JsBarcodeModule.default ?? JsBarcodeModule;

  const W = opts?.width ?? 1080;
  const H = opts?.height ?? 360;
  const bg = opts?.bg ?? "#FFFFFF";
  const pad = Math.max(6, Math.floor(W * 0.02));

  // Prepare a canvas for JsBarcode to draw onto.
  const barCanvas = document.createElement("canvas");
  const targetBarWidth = Math.max(400, Math.floor(W - pad * 2));
  barCanvas.width = targetBarWidth;
  const barFontSize = opts?.fontSize ?? Math.max(14, Math.floor(H * 0.07));
  
  // BarHeight: Tinggi garis barcode yang akan digepengkan
  const barHeight = opts?.barHeight ?? Math.max(60, Math.floor(H * 0.35));
  
  // Total tinggi canvas sementara harus MENGHINDARI teks di bawah barcode
  // Kita hanya perlu ruang untuk garis barcode dan margin JsBarcode.
  const jsbMargin = opts?.margin ?? 8;
  barCanvas.height = barHeight + jsbMargin * 2; // Hanya tinggi garis + margin

  // Call JsBarcode on the barCanvas. DISABLE displayValue di sini.
  try {
    JsBarcode(barCanvas, code, {
      format: "CODE128",
      width: opts?.moduleWidth ?? 2,
      height: barHeight,
      displayValue: false, // <<< PENTING: Matikan teks JsBarcode
      fontSize: barFontSize, // Tetap set untuk fallback
      margin: jsbMargin,
      textAlign: "center",
    });
  } catch (e) {
    // ... (Fallback code remains the same) ...
    const fallback = document.createElement("canvas");
    fallback.width = W;
    fallback.height = H;
    const fctx = fallback.getContext("2d");
    if (!fctx) throw e;
    fctx.fillStyle = bg;
    fctx.fillRect(0, 0, W, H);
    fctx.fillStyle = "#111827";
    fctx.textAlign = "center";
    fctx.textBaseline = "middle";
    fctx.font = `600 ${barFontSize}px Poppins, Arial, sans-serif`;
    fctx.fillText(code, W / 2, H / 2);
    return fallback.toDataURL("image/png");
  }

  // Compose final canvas
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Unable to create canvas context");

  // background
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  // Dapatkan data piksel mentah dari barCanvas (JsBarcode output)
  const barCtx = barCanvas.getContext("2d");
  if (!barCtx) throw new Error("Unable to get barCanvas context");
  const barcodeData = barCtx.getImageData(0, 0, barCanvas.width, barCanvas.height);
  
  // --- Perhitungan Skala dan Posisi ---
  const desiredWidth = Math.max(200, Math.floor(W * 0.9));
  const scale = desiredWidth / barCanvas.width; // Skala horizontal
  const drawWidth = desiredWidth;
  
  // Faktor penggepengan
  const vScale = Math.max(0.2, Math.min(1, opts?.verticalScale ?? 0.55));
  const rawDrawHeight = Math.floor(barCanvas.height * scale); // Tinggi setelah scaling horizontal
  const drawHeight = Math.floor(rawDrawHeight * vScale); // Tinggi akhir setelah penggepengan
  
  // Posisi Y (pusat di kanvas akhir, menyisakan ruang di bawah untuk teks)
  const textSpace = barFontSize + 4; // Ruang untuk teks di bawah
  const totalBarcodeSpace = drawHeight + textSpace;
  const drawY = Math.round((H - totalBarcodeSpace) / 2); // Mulai barcode di tengah, menyisakan ruang teks
  const drawX = Math.round((W - drawWidth) / 2);

  // --- 1. Gambar Barcode (Tajam & Gepeng) ---
  // Membuat Canvas sementara untuk menggambar ulang dan melakukan squashing tanpa blur
  const tempCanvas = document.createElement("canvas");
  tempCanvas.width = drawWidth;
  tempCanvas.height = drawHeight;
  const tempCtx = tempCanvas.getContext("2d");
  if (!tempCtx) throw new Error("Unable to create temp canvas context");
  
  // PENTING: Matikan image smoothing untuk menjaga ketajaman garis
  tempCtx.imageSmoothingEnabled = false; 

  // Tarik seluruh gambar barcode (sudah tajam) ke canvas sementara dengan tinggi gepeng
  tempCtx.drawImage(
    barCanvas, 
    0, 0, barCanvas.width, barCanvas.height, // Source area (seluruh barcode mentah)
    0, 0, drawWidth, drawHeight // Destination area (lebar penuh, tinggi gepeng)
  );
  
  // Gambar barcode gepeng dan tajam dari tempCanvas ke canvas final
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(tempCanvas, drawX, drawY, drawWidth, drawHeight);

  // --- 2. Gambar Teks Kode (Proporsional) ---
  const textY = drawY + drawHeight + textSpace / 2; // Posisi di bawah barcode

  ctx.fillStyle = "#111827";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle"; 
  ctx.font = `600 ${barFontSize}px Poppins, Arial, sans-serif`; // Font proporsional
  ctx.fillText(code, W / 2, textY);

  return canvas.toDataURL("image/png");
};

export const downloadBarcodePNG = async (
  code: string,
  filename = "barcode",
  opts?: BarcodeOpts
) => {
  const dataUrl = await createBarcodeDataURL(code, opts);
  const a = document.createElement("a");
  a.href = dataUrl;
  a.download = `${filename}.png`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
};

export default createBarcodeDataURL;
