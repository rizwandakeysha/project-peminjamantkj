import { generateQRCode } from "./qrUtils";

export type LabelOpts = {
  width?: number;
  height?: number;
  topMargin?: number;
  fontFamily?: string;
};

/**
 * Render the label into a canvas and return the canvas element.
 * Simple, reliable: white background, QR centered, item name below.
 */
export const renderLabelToCanvas = async (
  qrText: string,
  itemName: string,
  opts?: LabelOpts
): Promise<HTMLCanvasElement> => {
  const W = opts?.width ?? 1080;
  const H = opts?.height ?? 1350;
  const topMargin = opts?.topMargin ?? 60;
  const fontFamily = opts?.fontFamily ?? "Poppins, Arial, sans-serif";

  // make QR slightly larger to better match the provided layout
  const qrSize = Math.min(1020, Math.floor(W * 0.92));
  const qrX = Math.round((W - qrSize) / 2);
  const qrY = topMargin;
  // increase gap a bit to give room for large bold text; nudged further down per request
  const textY = qrY + qrSize + 60;

  const darkBrown = "#4E342E";

  // generate QR image (data URL)
  const qrDataUrl = await generateQRCode(qrText);
  const img = new Image();
  img.crossOrigin = "anonymous";
  img.src = qrDataUrl;
  await new Promise<void>((res, rej) => {
    img.onload = () => res();
    img.onerror = () => rej(new Error("Failed to load generated QR image"));
  });

  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Unable to create canvas context");

  // white background
  ctx.fillStyle = "#FFFFFF";
  ctx.fillRect(0, 0, W, H);

  // draw QR
  ctx.drawImage(img, qrX, qrY, qrSize, qrSize);

  // draw item name
  ctx.fillStyle = darkBrown;
  const maxTextWidth = W - 80;
  // start with a larger, bold font to match the attached sample
  let fontSize = 120;
  // include font weight for bold text
  ctx.font = `700 ${fontSize}px ${fontFamily}`;
  // ensure Poppins is loaded if the browser supports the Font Loading API
  try {
    if ((document as any).fonts && (document as any).fonts.ready) {
      // await readiness so metrics are accurate when drawing
      // eslint-disable-next-line no-undef
      await (document as any).fonts.ready;
    }
  } catch (e) {
    // ignore if fonts API isn't available
  }
  while (ctx.measureText(itemName).width > maxTextWidth && fontSize > 18) {
    fontSize -= 2;
    ctx.font = `700 ${fontSize}px ${fontFamily}`;
  }
  ctx.textAlign = "center";
  ctx.textBaseline = "top";
  ctx.fillText(itemName, W / 2, textY);

  return canvas;
};

/**
 * Convenience: create a data URL (PNG) of a simple label
 */
export const createLabelDataURL = async (
  qrText: string,
  itemName: string,
  opts?: LabelOpts
): Promise<string> => {
  const canvas = await renderLabelToCanvas(qrText, itemName, opts);
  return canvas.toDataURL("image/png");
};

/**
 * Convenience: render simple label and trigger a download
 */
export const downloadLabelPNG = async (
  qrText: string,
  itemName: string,
  filename = "label",
  opts?: LabelOpts
) => {
  const dataUrl = await createLabelDataURL(qrText, itemName, opts);
  const link = document.createElement("a");
  link.href = dataUrl;
  link.download = `${filename}.png`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};
