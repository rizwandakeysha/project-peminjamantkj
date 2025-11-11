import QRCodeStyling from "qr-code-styling";

export const generateQRCode = async (
  text: string,
  label?: string
): Promise<string> => {
  return new Promise((resolve, reject) => {
    try {
      // We'll render QR into a temporary canvas of qrSize x qrSize
      const qrSize = 760; // square QR area
      const qr = new QRCodeStyling({
        width: qrSize,
        height: qrSize,
        type: "canvas",
        data: text,
        margin: 8,
        qrOptions: {
          errorCorrectionLevel: "H",
        },
        // draw modules as solid (we'll apply gradient mask later)
        dotsOptions: {
          type: "classy-rounded",
          gradient: {
            type: "linear", // bisa "linear" atau "radial"
            rotation: 5, // derajat kemiringan gradasi
            colorStops: [
              { offset: 0, color: "#4E342E" }, // coklat tua
              { offset: 1, color: "#795931" }, // krem gelap
            ],
          },
        },
        // transparent background so we can composite gradient under modules
        backgroundOptions: {
          color: "transparent",
        },
        imageOptions: {
          crossOrigin: "anonymous",
          hideBackgroundDots: true,
          imageSize: 0.5, // logo size relative to QR area
          margin: 8,
        },
        image: "/android-chrome-512x512.png",
      });

      // render QR into a hidden container appended to document so the
      // qr-code-styling library can properly render canvas/svg
      const container = document.createElement("div");
      // keep off-screen but attached so styles and rendering work
      container.style.position = "absolute";
      container.style.left = "-9999px";
      container.style.top = "-9999px";
      // must provide render area size for qr-code-styling to draw
      container.style.width = "1000px";
      container.style.height = "1000px";
      document.body.appendChild(container);
      qr.append(container);

      // First try library's getRawData (if available) which returns a Blob
      const tryGetRawData = async (): Promise<string | null> => {
        try {
          const anyQr: any = qr as any;
          if (typeof anyQr.getRawData === "function") {
            const blob: Blob = await anyQr.getRawData("png");
            // convert blob to dataURL
            return await new Promise<string>((res, rej) => {
              const reader = new FileReader();
              reader.onload = () => res(String(reader.result));
              reader.onerror = () => rej(new Error("Failed to read blob"));
              reader.readAsDataURL(blob);
            });
          }
        } catch (e) {
          // fall through to poll
        }
        return null;
      };

      // poll until qr-code-styling has rendered a canvas or svg inside the container
      const getDataUrlFromContainer = (): string | null => {
        const renderedCanvas = container.querySelector(
          "canvas"
        ) as HTMLCanvasElement | null;
        if (renderedCanvas) {
          try {
            return renderedCanvas.toDataURL("image/png");
          } catch (e) {
            return null;
          }
        }
        const svg = container.querySelector("svg") as SVGElement | null;
        if (svg) {
          try {
            const svgData = new XMLSerializer().serializeToString(svg);
            return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(
              svgData
            )}`;
          } catch (e) {
            return null;
          }
        }
        return null;
      };

      (async () => {
        // quick attempt via library API
        const raw = await tryGetRawData();
        if (raw) {
          if (container.parentNode) container.parentNode.removeChild(container);
          return resolve(raw);
        }

        let attempts = 0;
        const maxAttempts = 40;
        const attemptDelay = 100; // ms

        const poll = () => {
          const dataUrl = getDataUrlFromContainer();
          if (dataUrl) {
            // cleanup container
            if (container.parentNode)
              container.parentNode.removeChild(container);
            return resolve(dataUrl);
          }
          attempts++;
          if (attempts > maxAttempts) {
            if (container.parentNode)
              container.parentNode.removeChild(container);
            return reject(new Error("Timed out waiting for QR render"));
          }
          setTimeout(poll, attemptDelay);
        };

        poll();
      })();
    } catch (error) {
      console.error("Error generating styled QR:", error);
      reject(error);
    }
  });
};

// helper: draw rounded rect path (used by composed label generator)
function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/**
 * Compose a 1080x1350 PNG containing: white background, centered QR, and item name below.
 * Uses generateQRCode(text) for the QR image (transparent background). Triggers download.
 */
export const exportItemLabelPNG = async (
  qrText: string,
  itemName: string,
  filename = "label"
) => {
  // target canvas size
  const W = 1080;
  const H = 1350;

  // sizes and layout
  const topMargin = 60;
  const qrSize = 960; // square QR area
  const qrX = Math.round((W - qrSize) / 2);
  const qrY = topMargin;
  const textAreaY = qrY + qrSize + 30;

  // colors
  const cream = "#FBF6EF";
  const lightBrown = "#D8BFA6";
  const darkBrown = "#4E342E";

  // generate QR data URL (transparent background, dark modules)
  const qrDataUrl = await generateQRCode(qrText);

  // load QR image
  const img = new Image();
  img.crossOrigin = "anonymous";
  img.src = qrDataUrl;
  await new Promise<void>((res, rej) => {
    img.onload = () => res();
    img.onerror = () => rej(new Error("Failed to load generated QR image"));
  });

  // compose final canvas
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Unable to create canvas context");

  // white background
  ctx.fillStyle = "#FFFFFF";
  ctx.fillRect(0, 0, W, H);

  // cream rounded panel behind QR for classy look
  const panelPad = 28;
  const panelX = qrX - panelPad;
  const panelY = qrY - panelPad;
  const panelW = qrSize + panelPad * 2;
  const panelH = qrSize + panelPad * 2;
  const r = 28;
  ctx.fillStyle = cream;
  roundRect(ctx, panelX, panelY, panelW, panelH, r);
  ctx.fill();
  // subtle border
  ctx.lineWidth = 2;
  ctx.strokeStyle = lightBrown;
  ctx.stroke();

  // draw QR centered in panel
  ctx.drawImage(img, qrX, qrY, qrSize, qrSize);

  // draw item name text below QR
  ctx.fillStyle = darkBrown;
  // choose font size to fit width
  const maxTextWidth = W - 80;
  let fontSize = 48;
  ctx.font = `${fontSize}px Poppins, Arial, sans-serif`;
  while (ctx.measureText(itemName).width > maxTextWidth && fontSize > 18) {
    fontSize -= 2;
    ctx.font = `${fontSize}px Poppins, Arial, sans-serif`;
  }
  ctx.textAlign = "center";
  ctx.textBaseline = "top";
  ctx.fillText(itemName, W / 2, textAreaY);

  // download
  const dataUrl = canvas.toDataURL("image/png");
  const link = document.createElement("a");
  link.href = dataUrl;
  link.download = `${filename}.png`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

/** 📦 Download hasil QR */
export const downloadQRCode = (dataUrl: string, filename: string) => {
  const link = document.createElement("a");
  link.href = dataUrl;
  link.download = `${filename}.png`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

/**
 * Simple label generator for quick dialog preview/download.
 * Returns a PNG data URL containing a white canvas with the QR centered and the
 * item name below it. This is intentionally simple so the UI can show the
 * generated image immediately after creating an item.
 */
export const createSimpleLabelDataURL = async (
  qrText: string,
  itemName: string,
  opts?: { width?: number; height?: number }
): Promise<string> => {
  const W = opts?.width ?? 1080;
  const H = opts?.height ?? 1350;

  const qrSize = Math.min(960, Math.floor(W * 0.88));
  const qrX = Math.round((W - qrSize) / 2);
  const qrY = 60;
  const textY = qrY + qrSize + 30;

  const darkBrown = "#4E342E";

  // get QR data URL (library handles rendering offscreen)
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
  let fontSize = 72;
  ctx.font = `${fontSize}px Poppins, Arial, sans-serif`;
  while (ctx.measureText(itemName).width > maxTextWidth && fontSize > 18) {
    fontSize -= 2;
    ctx.font = `${fontSize}px Poppins, Arial, sans-serif`;
  }
  ctx.textAlign = "center";
  ctx.textBaseline = "top";
  ctx.fillText(itemName, W / 2, textY);

  return canvas.toDataURL("image/png");
};

/** Convenience: create simple label and trigger download */
export const downloadSimpleLabelPNG = async (
  qrText: string,
  itemName: string,
  filename = "label",
  opts?: { width?: number; height?: number }
) => {
  const dataUrl = await createSimpleLabelDataURL(qrText, itemName, opts);
  downloadQRCode(dataUrl, filename);
};

/** 🔢 Generate kode peminjaman */
export const generateBorrowingCode = (): string => {
  const year = new Date().getFullYear();
  const random = Math.floor(Math.random() * 1000)
    .toString()
    .padStart(3, "0");
  return `PMJ-${year}-${random}`;
};

/**
 * 🧾 Generate kode barang berdasarkan nama (format: TKJ-XXXX)
 */
export const generateItemCodeFromName = (
  name: string,
  existingCodes: string[]
): string => {
  const sanitize = (s: string) => s.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
  const makeAbbrev = (raw: string) => {
    if (!raw) return "XXXX";
    const words = raw
      .split(/[^a-zA-Z0-9]+/)
      .map((w) => w.trim())
      .filter(Boolean);
    let abbrev = words
      .map((w) => w[0])
      .join("")
      .slice(0, 4);
    const pool = sanitize(raw);
    let i = 0;
    while (abbrev.length < 4 && i < pool.length) {
      const ch = pool[i];
      if (!abbrev.includes(ch)) abbrev += ch;
      i++;
    }
    return (abbrev + "XXXX").slice(0, 4);
  };

  const base = makeAbbrev(name);
  const existing = new Set(existingCodes);
  let newCode = `TKJ-${base}`;
  let suffix = 1;
  while (existing.has(newCode)) {
    newCode = `TKJ-${base}-${suffix}`;
    suffix++;
  }
  return newCode;
};
