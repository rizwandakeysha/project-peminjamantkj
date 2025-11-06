import QRCodeStyling from "qr-code-styling";

export const generateQRCode = async (text: string, label?: string): Promise<string> => {
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
          color: "#000000",
          type: "rounded",
        },
        // transparent background so we can composite gradient under modules
        backgroundOptions: {
          color: "transparent",
        },
        imageOptions: {
          crossOrigin: "anonymous",
          hideBackgroundDots: true,
          imageSize: 0.18, // logo size relative to QR area
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
  container.style.width = "800px";
  container.style.height = "800px";
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
        const renderedCanvas = container.querySelector("canvas") as HTMLCanvasElement | null;
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
            return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svgData)}`;
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
            if (container.parentNode) container.parentNode.removeChild(container);
            return resolve(dataUrl);
          }
          attempts++;
          if (attempts > maxAttempts) {
            if (container.parentNode) container.parentNode.removeChild(container);
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

/** 📦 Download hasil QR */
export const downloadQRCode = (dataUrl: string, filename: string) => {
  const link = document.createElement("a");
  link.href = dataUrl;
  link.download = `${filename}.png`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

/** 🔢 Generate kode peminjaman */
export const generateBorrowingCode = (): string => {
  const year = new Date().getFullYear();
  const random = Math.floor(Math.random() * 1000).toString().padStart(3, "0");
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
    let abbrev = words.map((w) => w[0]).join("").slice(0, 4);
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
