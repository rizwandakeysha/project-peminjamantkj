import { useState, useEffect } from "react";
import AdminLayout from "@/layouts/AdminLayout";
import { barangAPI, jenisBarangAPI, API_BASE_URL } from "@/lib/api";
import { uploadPhotoToTelegram, getPhotoUrl } from "@/lib/telegramUtils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import CameraCapture from "@/components/CameraCapture";
import {
  Package,
  Edit2,
  Trash2,
  Eye,
  Plus,
  QrCode,
  Barcode,
  Download,
  Printer,
  Camera as CameraIcon,
  Upload as UploadIcon,
} from "lucide-react";
import {
  createSimpleLabelDataURL,
  downloadSimpleLabelPNG,
} from "@/lib/qrUtils";
import { createBarcodeDataURL, downloadBarcodePNG } from "@/lib/barcodeUtils";
import { toast } from "react-hot-toast";
import JSZip from "jszip";

// Helper function to generate kode_jenis_barang from nama (4 most representative letters with TKJ- prefix)
const generateKodeJenis = (namaJenis: string, strategyNum: number = 0): string => {
  // Split by spaces and get words
  const words = namaJenis.trim().split(/\s+/);
  const letters = namaJenis.replace(/[^A-Za-z]/g, "").toUpperCase();
  let kode = "";

  if (strategyNum === 0) {
    // Strategy 0: First letter of each word
    for (const word of words) {
      if (kode.length < 4 && word.length > 0) {
        kode += word[0].toUpperCase();
      }
    }
  } else if (strategyNum === 1) {
    // Strategy 1: Use letters at different positions from whole name
    // For example: positions 0, 1, 2, 3 or 0, 2, 4, 6 (skip every other)
    const step = Math.floor(letters.length / 4);
    for (let i = 0; i < 4 && i * step < letters.length; i++) {
      kode += letters[i * step];
    }
  } else if (strategyNum === 2) {
    // Strategy 2: Use middle/ending letters from each word if available
    for (const word of words) {
      if (kode.length < 4 && word.length > 1) {
        kode += word[1].toUpperCase(); // second letter
      }
    }
  } else if (strategyNum === 3) {
    // Strategy 3: Use last letter of each word if available, else first
    for (const word of words) {
      if (kode.length < 4 && word.length > 0) {
        kode += word[word.length - 1].toUpperCase();
      }
    }
  }

  // Fallback: use first 4 letters from name
  if (kode.length < 4) {
    kode = letters.substring(strategyNum, strategyNum + 4);
  }

  // Ensure exactly 4 characters
  if (kode.length > 4) {
    kode = kode.substring(0, 4);
  } else if (kode.length < 4) {
    kode = kode.padEnd(4, "X"); // Pad with X if still short
  }

  return `TKJ-${kode}`;
};

// Ensure kode_jenis unique by trying different 4-letter combinations instead of appending suffix
const ensureUniqueKodeJenis = (
  namaJenis: string,
  existingCodes: string[]
): string => {
  // Try up to 4 different strategies to generate unique 4-letter codes
  for (let strategy = 0; strategy < 4; strategy++) {
    const candidate = generateKodeJenis(namaJenis, strategy);
    if (!existingCodes.includes(candidate)) {
      return candidate;
    }
  }

  // Fallback: if all strategies collide, use letters with position offset
  let counter = 1;
  const letters = namaJenis.replace(/[^A-Za-z]/g, "").toUpperCase();
  while (counter < letters.length - 3) {
    const fallbackKode = `TKJ-${letters.substring(counter, counter + 4)}`;
    if (!existingCodes.includes(fallbackKode)) {
      return fallbackKode;
    }
    counter += 1;
  }

  // Last resort: return with random suffix (very unlikely to reach here)
  return `TKJ-${letters.substring(0, 4).padEnd(4, "X")}-${Date.now() % 9999}`;
};

// Helper function to generate kode_barang from kode_jenis (AAAA-1, AAAA-2, etc)
const generateKodeBarang = (
  kodeJenis: string,
  barangListForJenis: any[]
): string => {
  // Count existing barang for this jenis with same kode prefix
  const prefix = kodeJenis.split("-").pop() || kodeJenis; // Get AAAA part
  const count = barangListForJenis.filter((b) =>
    b.kode_barang?.startsWith(prefix)
  ).length;
  return `${prefix}-${count + 1}`;
};

const Items = () => {
  const [jenisBarangList, setJenisBarangList] = useState<any[]>([]);
  const [barangList, setBarangList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingBarang, setSavingBarang] = useState(false);

  // Fetch data from API on component mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [jenisData, barangData] = await Promise.all([
          jenisBarangAPI.getAll(),
          barangAPI.getAll(),
        ]);

        // Map backend jenis format to local format
        const mappedJenis = jenisData.map((j: any) => ({
          id_jenis_barang: j.id,
          kode_jenis_barang: j.kode_jenis || j.kode_jenis_barang,
          nama_jenis_barang: j.nama_jenis || j.nama_jenis_barang,
          deskripsi_jenis_barang: j.deskripsi || j.deskripsi_jenis_barang,
          created_at: j.created_at,
        }));

        setJenisBarangList(mappedJenis);
        setBarangList(barangData);
      } catch (error) {
        console.error("Error fetching data:", error);
        toast.error("Gagal memuat data dari server");
        // Do not use mock data; leave empty on error
        setJenisBarangList([]);
        setBarangList([]);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Dialog states
  const [selectedJenisId, setSelectedJenisId] = useState<number | null>(null);
  const [showBarangDialog, setShowBarangDialog] = useState(false);
  const [showAddJenisDialog, setShowAddJenisDialog] = useState(false);
  const [showAddBarangDialog, setShowAddBarangDialog] = useState(false);
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [showImportJenisBarangDialog, setShowImportJenisBarangDialog] =
    useState(false);
  const [showBarangImportPreviewDialog, setShowBarangImportPreviewDialog] =
    useState(false);
  const [showJenisImportPreviewDialog, setShowJenisImportPreviewDialog] =
    useState(false);
  const [editingBarang, setEditingBarang] = useState<any | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{
    type: "jenis" | "barang";
    id: number;
  } | null>(null);
  const [qrDialogOpenForJenis, setQrDialogOpenForJenis] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [qrLabelName, setQrLabelName] = useState<string>("");
  const [qrJenisKode, setQrJenisKode] = useState<string>("");
  const [qrJenisNama, setQrJenisNama] = useState<string>("");
  // Bulk delete states
  const [showBulkDeleteJenisDialog, setShowBulkDeleteJenisDialog] = useState(false);
  const [selectedJenisForDelete, setSelectedJenisForDelete] = useState<number[]>([]);
  const [showBulkDeleteBarangDialog, setShowBulkDeleteBarangDialog] = useState(false);
  const [selectedBarangForDelete, setSelectedBarangForDelete] = useState<number[]>([]);
  // barcode dialog states for barang
  const [barcodeDialogOpen, setBarcodeDialogOpen] = useState(false);
  const [barcodeDataUrl, setBarcodeDataUrl] = useState<string | null>(null);
  const [barcodeKode, setBarcodeKode] = useState<string>("");
  const [barcodeNama, setBarcodeNama] = useState<string>("");
  
  // Separate print dialogs: QR-only and Barcode-only
  const [showQRPrintDialog, setShowQRPrintDialog] = useState(false);
  const [showBarcodePrintDialog, setShowBarcodePrintDialog] = useState(false);
  const [qrPrintSearchQuery, setQRPrintSearchQuery] = useState('');
  const [barcodePrintSearchQuery, setBarcodePrintSearchQuery] = useState('');
  const [selectedQRForPrint, setSelectedQRForPrint] = useState<number[]>([]);
  const [selectedBarcodeForPrint, setSelectedBarcodeForPrint] = useState<number[]>([]);
  
  // Legacy states (kept for backward compatibility with download functions)
  const [showBarcodeSelectionDialog, setShowBarcodeSelectionDialog] = useState(false);
  const [selectedBarangForDownload, setSelectedBarangForDownload] = useState<number[]>([]);
  const [jenisForBarcodeDownload, setJenisForBarcodeDownload] = useState<number | null>(null);
  const [showQRSelectionDialog, setShowQRSelectionDialog] = useState(false);
  const [selectedJenisForDownload, setSelectedJenisForDownload] = useState<number[]>([]);
  
  const [barangImportPreview, setBarangImportPreview] = useState<any[]>([]);
  const [barangImportFileName, setBarangImportFileName] = useState("");
  const [jenisImportPreview, setJenisImportPreview] = useState<any[]>([]);
  const [jenisImportFileName, setJenisImportFileName] = useState("");


  // Form states
  const [jenisFormData, setJenisFormData] = useState({
    kode_jenis_barang: "",
    nama_jenis_barang: "",
    deskripsi_jenis_barang: "",
  });
  const [jenisKodeDirty, setJenisKodeDirty] = useState(false);

  // Auto-generate kode jenis saat mengetik nama (hanya tambah baru & kode belum diubah manual)
  useEffect(() => {
    if (!selectedJenisId && !jenisKodeDirty) {
      if (jenisFormData.nama_jenis_barang.trim().length >= 1) {
        const generated = ensureUniqueKodeJenis(
          jenisFormData.nama_jenis_barang,
          jenisBarangList
            .map((j) => j.kode_jenis_barang?.toUpperCase())
            .filter(Boolean)
        );
        setJenisFormData((prev) => ({ ...prev, kode_jenis_barang: generated }));
      } else {
        setJenisFormData((prev) => ({ ...prev, kode_jenis_barang: "" }));
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jenisFormData.nama_jenis_barang, selectedJenisId, jenisKodeDirty, jenisBarangList]);

  const [barangFormData, setBarangFormData] = useState({
    nama_barang: "",
    kode_barang: "",
    no_serial_number: "",
    deskripsi_barang: "",
    status: "Tersedia",
    foto_barang: "",
  });

  const [isDragging, setIsDragging] = useState(false);

  // Get barang for selected jenis
  const getBarangForJenis = (jenisId: number) => {
    return barangList.filter((b) => b.id_jenis_barang === jenisId);
  };

  // Get jenis name
  const getJenisName = (jenisId: number) => {
    return (
      jenisBarangList.find((j) => j.id_jenis_barang === jenisId)
        ?.nama_jenis_barang || ""
    );
  };

  // Open barcode selection dialog
  const openBarcodeSelectionDialog = (jenisId: number) => {
    const barangForJenis = getBarangForJenis(jenisId);
    if (barangForJenis.length === 0) {
      toast.error("Tidak ada barang untuk jenis ini");
      return;
    }
    
    setJenisForBarcodeDownload(jenisId);
    // Select all by default
    setSelectedBarangForDownload(barangForJenis.map(b => b.id || b.id_barang));
    setShowBarcodeSelectionDialog(true);
  };

  // Toggle select all barcode
  const toggleSelectAllBarcode = () => {
    if (!jenisForBarcodeDownload) return;
    
    const barangForJenis = getBarangForJenis(jenisForBarcodeDownload);
    if (selectedBarangForDownload.length === barangForJenis.length) {
      // Deselect all
      setSelectedBarangForDownload([]);
    } else {
      // Select all
      setSelectedBarangForDownload(barangForJenis.map(b => b.id || b.id_barang));
    }
  };

  // Toggle individual barcode selection
  const toggleBarangSelection = (barangId: number) => {
    if (selectedBarangForDownload.includes(barangId)) {
      setSelectedBarangForDownload(selectedBarangForDownload.filter(id => id !== barangId));
    } else {
      setSelectedBarangForDownload([...selectedBarangForDownload, barangId]);
    }
  };

  // Print selected barcodes to A4
  const printSelectedBarcodes = async () => {
    if (!jenisForBarcodeDownload) return;
    
    const jenis = jenisBarangList.find(j => j.id_jenis_barang === jenisForBarcodeDownload);
    if (!jenis) {
      toast.error("Jenis barang tidak ditemukan");
      return;
    }

    const barangForJenis = getBarangForJenis(jenisForBarcodeDownload);
    const selectedBarang = barangForJenis.filter(b => 
      selectedBarangForDownload.includes(b.id || b.id_barang)
    );

    if (selectedBarang.length === 0) {
      toast.error("Pilih minimal 1 barang untuk dicetak");
      return;
    }

    try {
      toast.loading(`Mempersiapkan ${selectedBarang.length} barcode untuk cetak...`);
      
      // Generate all barcodes
      const barcodeDataUrls: Array<{ kode: string; nama: string; dataUrl: string }> = [];
      for (const barang of selectedBarang) {
        try {
          const dataUrl = await createBarcodeDataURL(barang.kode_barang, {
            width: 960,
            height: 300,
          });
          barcodeDataUrls.push({
            kode: barang.kode_barang,
            nama: barang.nama_barang,
            dataUrl,
          });
        } catch (err) {
          console.error(`Gagal membuat barcode untuk ${barang.kode_barang}:`, err);
        }
      }

      if (barcodeDataUrls.length === 0) {
        toast.dismiss();
        toast.error("Gagal membuat barcode");
        return;
      }

      // Create print window with A4 layout
      const printWindow = window.open("", "_blank", "width=800,height=600");
      if (!printWindow) {
        toast.dismiss();
        toast.error("Gagal membuka window cetak");
        return;
      }

      // Build HTML for print
      const htmlContent = `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8" />
            <title>Cetak Barcode - ${jenis.nama_jenis_barang}</title>
            <style>
              @page {
                size: A4;
                margin: 10mm;
              }
              * {
                margin: 0;
                padding: 0;
                box-sizing: border-box;
              }
              body {
                font-family: Arial, sans-serif;
                background: white;
              }
              .print-container {
                display: grid;
                grid-template-columns: repeat(3, 1fr);
                gap: 5mm;
                padding: 0;
              }
              .barcode-item {
                border: 0.5px solid #333;
                padding: 3mm;
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                page-break-inside: avoid;
                height: 2cm;
              }
              .barcode-item img {
                width: 100%;
                height: 2cm;
                object-fit: contain;
              }
              @media print {
                body {
                  -webkit-print-color-adjust: exact;
                  print-color-adjust: exact;
                }
              }
            </style>
          </head>
          <body>
            <div class="print-container">
              ${barcodeDataUrls.map(item => `
                <div class="barcode-item">
                  <img src="${item.dataUrl}" alt="${item.kode}" />
                </div>
              `).join('')}
            </div>
          </body>
        </html>
      `;

      printWindow.document.write(htmlContent);
      printWindow.document.close();
      printWindow.focus();

      toast.dismiss();
      toast.success("Siap cetak!");

      setTimeout(() => {
        printWindow.print();
      }, 500);
    } catch (error) {
      console.error("Error printing barcodes:", error);
      toast.dismiss();
      toast.error("Gagal mencetak barcode");
    }
  };

  // Download selected barcodes as ZIP
  const downloadSelectedBarcodes = async () => {
    if (!jenisForBarcodeDownload) return;
    
    const jenis = jenisBarangList.find(j => j.id_jenis_barang === jenisForBarcodeDownload);
    if (!jenis) {
      toast.error("Jenis barang tidak ditemukan");
      return;
    }

    const barangForJenis = getBarangForJenis(jenisForBarcodeDownload);
    const selectedBarang = barangForJenis.filter(b => 
      selectedBarangForDownload.includes(b.id || b.id_barang)
    );

    if (selectedBarang.length === 0) {
      toast.error("Pilih minimal 1 barang untuk didownload");
      return;
    }

    // Close selection dialog
    setShowBarcodeSelectionDialog(false);

    try {
      toast.loading(`Membuat ${selectedBarang.length} barcode...`);
      
      const zip = new JSZip();
      const folder = zip.folder(jenis.kode_jenis_barang || jenis.nama_jenis_barang);

      if (!folder) {
        throw new Error("Gagal membuat folder ZIP");
      }

      // Generate barcode for each selected barang
      for (const barang of selectedBarang) {
        try {
          const dataUrl = await createBarcodeDataURL(barang.kode_barang, {
            width: 960,
            height: 300,
          });
          
          // Convert data URL to blob
          const response = await fetch(dataUrl);
          const blob = await response.blob();
          
          // Add to ZIP with filename
          const filename = `${barang.kode_barang}.png`;
          folder.file(filename, blob);
        } catch (err) {
          console.error(`Gagal membuat barcode untuk ${barang.kode_barang}:`, err);
        }
      }

      // Generate ZIP and trigger download
      const zipBlob = await zip.generateAsync({ type: "blob" });
      const zipUrl = URL.createObjectURL(zipBlob);
      const link = document.createElement("a");
      link.href = zipUrl;
      link.download = `barcodes-${jenis.kode_jenis_barang || jenis.nama_jenis_barang}.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(zipUrl);

      toast.dismiss();
      toast.success(`${selectedBarang.length} barcode berhasil didownload!`);
    } catch (error) {
      console.error("Error creating ZIP:", error);
      toast.dismiss();
      toast.error("Gagal membuat file ZIP");
    }
  };

  // ===== QR JENIS BARANG ZIP DOWNLOAD HANDLERS =====
  // Open QR jenis selection dialog
  const openQRJenisSelectionDialog = () => {
    if (jenisBarangList.length === 0) {
      toast.error("Tidak ada jenis barang");
      return;
    }
    
    // Select all by default
    setSelectedJenisForDownload(jenisBarangList.map(j => j.id_jenis_barang));
    setShowQRSelectionDialog(true);
  };

  // Toggle select all QR jenis
  const toggleSelectAllQRJenis = () => {
    if (selectedJenisForDownload.length === jenisBarangList.length) {
      // Deselect all
      setSelectedJenisForDownload([]);
    } else {
      // Select all
      setSelectedJenisForDownload(jenisBarangList.map(j => j.id_jenis_barang));
    }
  };

  // Toggle individual jenis selection
  const toggleJenisSelection = (jenisId: number) => {
    if (selectedJenisForDownload.includes(jenisId)) {
      setSelectedJenisForDownload(selectedJenisForDownload.filter(id => id !== jenisId));
    } else {
      setSelectedJenisForDownload([...selectedJenisForDownload, jenisId]);
    }
  };

  // ===== QR PRINT HANDLER (QR-only) =====
  const handleQRPrint = async () => {
    if (selectedQRForPrint.length === 0) {
      toast.error("Pilih minimal 1 QR code untuk dicetak");
      return;
    }

    const selectedJenis = jenisBarangList.filter(j => 
      selectedQRForPrint.includes(j.id_jenis_barang)
    );

    try {
      toast.loading(`Mempersiapkan ${selectedJenis.length} QR code untuk cetak...`);

      // Build list of tiles
      type Tile = {
        w: number;
        h: number;
        src: string;
        label: string;
      };

      const tiles: Tile[] = [];

      // Generate QR images (8x10 cm)
      for (const jenis of selectedJenis) {
        const dataUrl = await createSimpleLabelDataURL(
          jenis.kode_jenis_barang,
          jenis.nama_jenis_barang,
          { width: 800, height: 1000 }
        );
        tiles.push({ w: 8, h: 10, src: dataUrl, label: jenis.kode_jenis_barang });
      }

      if (tiles.length === 0) {
        toast.dismiss();
        toast.error("Tidak ada QR yang bisa dicetak");
        return;
      }

      // QR-only layout: 5 per A4 (2x2 + 1 rotated bottom centered)
      const PAGE_W = 21.0;
      const PAGE_H = 29.7;
      const MARGIN = 0.3;
      const USABLE_W = PAGE_W - MARGIN * 2;

      const perPage = 5;
      const pagesHtml: string[] = [];
      
      for (let i = 0; i < tiles.length; i += perPage) {
        const batch = tiles.slice(i, i + perPage);
        const htmlItems: string[] = [];
        
        // Center grid horizontally (grid width = 16cm for 2x8cm)
        const gridW = 16;
        const gridX = MARGIN + (USABLE_W - gridW) / 2;
        
        // Top 4: 2x2 of 8x10
        const posTop = [
          { x: gridX + 0, y: MARGIN + 0 },
          { x: gridX + 8, y: MARGIN + 0 },
          { x: gridX + 0, y: MARGIN + 10 },
          { x: gridX + 8, y: MARGIN + 10 },
        ];
        
        for (let k = 0; k < Math.min(4, batch.length); k++) {
          const t = batch[k];
          const style = `left:${posTop[k].x}cm;top:${posTop[k].y}cm;width:8cm;height:10cm;border:none;`;
          htmlItems.push(`
            <div class="tile" style="${style}">
              <img src="${t.src}" alt="${t.label}" style="width:100%;height:100%;object-fit:contain;" />
            </div>`);
        }
        
        // Bottom rotated centered (if exists)
        if (batch.length > 4) {
          const t = batch[4];
          const w = 10; // rotated width (physical space)
          const h = 8;  // rotated height (physical space)
          const x = MARGIN + (USABLE_W - w) / 2;
          const y = MARGIN + 20; // below top grid
          const style = `left:${x}cm;top:${y}cm;width:${w}cm;height:${h}cm;border:none;`;
          const imgStyle = 'transform: rotate(90deg); width: 8cm; height: 10cm;';
          htmlItems.push(`
            <div class="tile" style="${style}">
              <img src="${t.src}" alt="${t.label}" style="${imgStyle}" />
            </div>`);
        }
        
        pagesHtml.push(`<div class="page">${htmlItems.join('')}</div>`);
      }

      const printWindow = window.open("", "_blank", "width=1000,height=800");
      if (!printWindow) {
        toast.dismiss();
        toast.error("Gagal membuka window cetak");
        return;
      }

      const html = `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8" />
            <title>Cetak QR Code</title>
            <style>
              @page { size: A4; margin: 3mm; }
              * { box-sizing: border-box; margin: 0; padding: 0; }
              html, body { height: 100%; }
              body { background: white; }
              .page { position: relative; width: 21cm; height: 29.7cm; page-break-after: always; overflow: hidden; }
              .tile { position: absolute; display: flex; align-items: center; justify-content: center; }
              .tile img { display: block; }
              @media print { 
                body { -webkit-print-color-adjust: exact; print-color-adjust: exact; color-adjust: exact; }
              }
            </style>
          </head>
          <body>
            ${pagesHtml.join('\n')}
          </body>
        </html>`;

      printWindow.document.open();
      printWindow.document.write(html);
      printWindow.document.close();
      printWindow.focus();
      toast.dismiss();
      toast.success("Siap cetak!");
      setTimeout(() => printWindow.print(), 600);
      setShowQRPrintDialog(false);
    } catch (error) {
      console.error("Error printing:", error);
      toast.dismiss();
      toast.error("Gagal mencetak");
    }
  };

  // ===== BARCODE PRINT HANDLER (Barcode-only) =====
  const handleBarcodePrint = async () => {
    if (selectedBarcodeForPrint.length === 0) {
      toast.error("Pilih minimal 1 barcode untuk dicetak");
      return;
    }

    const selectedBarang = barangList.filter(b => 
      selectedBarcodeForPrint.includes(b.id || b.id_barang)
    );

    try {
      toast.loading(`Mempersiapkan ${selectedBarang.length} barcode untuk cetak...`);

      // Build list of tiles
      type Tile = {
        w: number;
        h: number;
        src: string;
        label: string;
      };

      const tiles: Tile[] = [];

      // Generate barcode images (7x2 cm)
      for (const barang of selectedBarang) {
        const dataUrl = await createBarcodeDataURL(barang.kode_barang, {
          width: 700,
          height: 200,
          verticalScale: 0.6,
        });
        tiles.push({ w: 7, h: 2, src: dataUrl, label: barang.kode_barang });
      }

      if (tiles.length === 0) {
        toast.dismiss();
        toast.error("Tidak ada barcode yang bisa dicetak");
        return;
      }

      // Barcode-only layout: 2 columns, multiple rows, centered
      const PAGE_W = 21.0;
      const PAGE_H = 29.7;
      const MARGIN = 0.3;
      const USABLE_W = PAGE_W - MARGIN * 2;
      const USABLE_H = PAGE_H - MARGIN * 2;

      const cols = 2;
      const barcodeW = 7;
      const barcodeH = 2;
      const vGap = 0; // no vertical gap
      const gridW = cols * barcodeW;
      const gridX = MARGIN + (USABLE_W - gridW) / 2;
      const rowsPerPage = Math.floor(USABLE_H / (barcodeH + vGap));
      const perPage = cols * rowsPerPage;

      const pagesHtml: string[] = [];
      
      for (let i = 0; i < tiles.length; i += perPage) {
        const batch = tiles.slice(i, i + perPage);
        const htmlItems: string[] = [];
        
        for (let k = 0; k < batch.length; k++) {
          const t = batch[k];
          const col = k % cols;
          const row = Math.floor(k / cols);
          const x = gridX + col * barcodeW;
          const y = MARGIN + row * (barcodeH + vGap);
          const style = `left:${x}cm;top:${y}cm;width:${barcodeW}cm;height:${barcodeH}cm;border:none;`;
          htmlItems.push(`
            <div class="tile" style="${style}">
              <img src="${t.src}" alt="${t.label}" style="width:100%;height:100%;object-fit:contain;" />
            </div>`);
        }
        
        pagesHtml.push(`<div class="page">${htmlItems.join('')}</div>`);
      }

      const printWindow = window.open("", "_blank", "width=1000,height=800");
      if (!printWindow) {
        toast.dismiss();
        toast.error("Gagal membuka window cetak");
        return;
      }

      const html = `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8" />
            <title>Cetak Barcode</title>
            <style>
              @page { size: A4; margin: 3mm; }
              * { box-sizing: border-box; margin: 0; padding: 0; }
              html, body { height: 100%; }
              body { background: white; }
              .page { position: relative; width: 21cm; height: 29.7cm; page-break-after: always; overflow: hidden; }
              .tile { position: absolute; display: flex; align-items: center; justify-content: center; }
              .tile img { display: block; }
              @media print { 
                body { -webkit-print-color-adjust: exact; print-color-adjust: exact; color-adjust: exact; }
              }
            </style>
          </head>
          <body>
            ${pagesHtml.join('\n')}
          </body>
        </html>`;

      printWindow.document.open();
      printWindow.document.write(html);
      printWindow.document.close();
      printWindow.focus();
      toast.dismiss();
      toast.success("Siap cetak!");
      setTimeout(() => printWindow.print(), 600);
      setShowBarcodePrintDialog(false);
    } catch (error) {
      console.error("Error printing:", error);
      toast.dismiss();
      toast.error("Gagal mencetak");
    }
  };

  // Open QR print dialog
  const openQRPrintDialog = () => {
    if (jenisBarangList.length === 0) {
      toast.error("Tidak ada jenis barang untuk dicetak");
      return;
    }
    // Default: select all
    setSelectedQRForPrint(jenisBarangList.map(j => j.id_jenis_barang));
    setQRPrintSearchQuery('');
    setShowQRPrintDialog(true);
  };

  // Open Barcode print dialog
  const openBarcodePrintDialog = () => {
    if (barangList.length === 0) {
      toast.error("Tidak ada barang untuk dicetak");
      return;
    }
    // Default: select all
    setSelectedBarcodeForPrint(barangList.map(b => (b.id || b.id_barang)));
    setBarcodePrintSearchQuery('');
    setShowBarcodePrintDialog(true);
  };

  // Filter QR items
  const getFilteredQRForPrint = () => {
    const query = qrPrintSearchQuery.toLowerCase();
    return jenisBarangList.filter(j =>
      j.nama_jenis_barang.toLowerCase().includes(query) ||
      j.kode_jenis_barang.toLowerCase().includes(query)
    );
  };

  // Filter Barcode items
  const getFilteredBarcodeForPrint = () => {
    const query = barcodePrintSearchQuery.toLowerCase();
    return barangList.filter(b =>
      b.nama_barang.toLowerCase().includes(query) ||
      b.kode_barang.toLowerCase().includes(query)
    );
  };

  // Legacy: Print selected QR jenis to A4 (kept for backward compatibility)
  const printSelectedQRJenis = async () => {
    const selectedJenis = jenisBarangList.filter(j => 
      selectedJenisForDownload.includes(j.id_jenis_barang)
    );

    if (selectedJenis.length === 0) {
      toast.error("Pilih minimal 1 jenis barang untuk dicetak");
      return;
    }

    try {
      toast.loading(`Mempersiapkan ${selectedJenis.length} QR code untuk cetak...`);
      
      // Generate all QR codes
      const qrDataUrls: Array<{ kode: string; nama: string; dataUrl: string }> = [];
      for (const jenis of selectedJenis) {
        try {
          const dataUrl = await createSimpleLabelDataURL(
            jenis.kode_jenis_barang,
            jenis.nama_jenis_barang,
            {
              width: 720,
              height: 900,
            }
          );
          qrDataUrls.push({
            kode: jenis.kode_jenis_barang,
            nama: jenis.nama_jenis_barang,
            dataUrl,
          });
        } catch (err) {
          console.error(`Gagal membuat QR untuk ${jenis.kode_jenis_barang}:`, err);
        }
      }

      if (qrDataUrls.length === 0) {
        toast.dismiss();
        toast.error("Gagal membuat QR code");
        return;
      }

      // Create print window with A4 layout
      const printWindow = window.open("", "_blank", "width=800,height=600");
      if (!printWindow) {
        toast.dismiss();
        toast.error("Gagal membuka window cetak");
        return;
      }

      // Build HTML for print (QR 10cm height, 8cm width = 4:5 ratio, 2 columns)
      const htmlContent = `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8" />
            <title>Cetak QR Jenis Barang</title>
            <style>
              @page {
                size: A4;
                margin: 10mm;
              }
              * {
                margin: 0;
                padding: 0;
                box-sizing: border-box;
              }
              body {
                font-family: Arial, sans-serif;
                background: white;
              }
              .print-container {
                display: grid;
                grid-template-columns: repeat(2, 1fr);
                gap: 5mm;
                padding: 0;
              }
              .qr-item {
                border: 0.5px solid #333;
                padding: 3mm;
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                page-break-inside: avoid;
              }
              .qr-item img {
                width: 8cm;
                height: 10cm;
                object-fit: contain;
              }
              @media print {
                body {
                  -webkit-print-color-adjust: exact;
                  print-color-adjust: exact;
                }
              }
            </style>
          </head>
          <body>
            <div class="print-container">
              ${qrDataUrls.map(item => `
                <div class="qr-item">
                  <img src="${item.dataUrl}" alt="${item.kode}" />
                </div>
              `).join('')}
            </div>
          </body>
        </html>
      `;

      printWindow.document.write(htmlContent);
      printWindow.document.close();
      printWindow.focus();

      toast.dismiss();
      toast.success("Siap cetak!");

      setTimeout(() => {
        printWindow.print();
      }, 500);
    } catch (error) {
      console.error("Error printing QR codes:", error);
      toast.dismiss();
      toast.error("Gagal mencetak QR code");
    }
  };

  // Download selected QR jenis as ZIP
  const downloadSelectedQRJenis = async () => {
    const selectedJenis = jenisBarangList.filter(j => 
      selectedJenisForDownload.includes(j.id_jenis_barang)
    );

    if (selectedJenis.length === 0) {
      toast.error("Pilih minimal 1 jenis barang untuk didownload");
      return;
    }

    // Close selection dialog
    setShowQRSelectionDialog(false);

    try {
      toast.loading(`Membuat ${selectedJenis.length} QR code...`);
      
      const zip = new JSZip();
      const folder = zip.folder("QR-Jenis-Barang");

      if (!folder) {
        throw new Error("Gagal membuat folder ZIP");
      }

      // Generate QR for each selected jenis
      for (const jenis of selectedJenis) {
        try {
          const dataUrl = await createSimpleLabelDataURL(
            jenis.kode_jenis_barang,
            jenis.nama_jenis_barang,
            {
              width: 720,
              height: 920,
            }
          );
          
          // Convert data URL to blob
          const response = await fetch(dataUrl);
          const blob = await response.blob();
          
          // Add to ZIP with filename
          const filename = `${jenis.kode_jenis_barang}-${jenis.nama_jenis_barang.replace(/\s+/g, "-")}.png`;
          folder.file(filename, blob);
        } catch (err) {
          console.error(`Gagal membuat QR untuk ${jenis.kode_jenis_barang}:`, err);
        }
      }

      // Generate ZIP and trigger download
      const zipBlob = await zip.generateAsync({ type: "blob" });
      const zipUrl = URL.createObjectURL(zipBlob);
      const link = document.createElement("a");
      link.href = zipUrl;
      link.download = `QR-Jenis-Barang.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(zipUrl);

      toast.dismiss();
      toast.success(`${selectedJenis.length} QR code berhasil didownload!`);
    } catch (error) {
      console.error("Error creating ZIP:", error);
      toast.dismiss();
      toast.error("Gagal membuat file ZIP");
    }
  };

  // ===== JENIS BARANG HANDLERS =====
  const handleEditJenis = (jenis: any) => {
    setJenisFormData({
      kode_jenis_barang: jenis.kode_jenis_barang,
      nama_jenis_barang: jenis.nama_jenis_barang,
      deskripsi_jenis_barang: jenis.deskripsi_jenis_barang || "",
    });
    setJenisKodeDirty(true);
    setSelectedJenisId(jenis.id_jenis_barang);
    setShowAddJenisDialog(true);
  };

  const handleSaveJenis = async () => {
    if (!jenisFormData.nama_jenis_barang.trim()) {
      toast.error("Nama jenis barang tidak boleh kosong");
      return;
    }

    try {
      setLoading(true);

      // Build desired kode (from form if filled, else auto-generate) and ensure uniqueness
      const existingCodes = jenisBarangList
        .filter((j) => j.id_jenis_barang !== selectedJenisId)
        .map((j) => j.kode_jenis_barang?.toUpperCase())
        .filter(Boolean) as string[];

      const uniqueKode = ensureUniqueKodeJenis(
        jenisFormData.nama_jenis_barang,
        existingCodes
      );

      if (selectedJenisId) {
        // Update jenis barang via API
        await jenisBarangAPI.update(selectedJenisId, {
          kode_jenis: uniqueKode,
          nama_jenis: jenisFormData.nama_jenis_barang,
          deskripsi: jenisFormData.deskripsi_jenis_barang,
        });
        setJenisBarangList(
          jenisBarangList.map((j) =>
            j.id_jenis_barang === selectedJenisId
              ? { ...j, ...jenisFormData, kode_jenis_barang: uniqueKode }
              : j
          )
        );
        toast.success("Jenis barang berhasil diupdate!");
      } else {
        // Create jenis barang via API with unique auto-generated kode
        const newJenis = await jenisBarangAPI.create({
          kode_jenis: uniqueKode,
          nama_jenis: jenisFormData.nama_jenis_barang,
          deskripsi: jenisFormData.deskripsi_jenis_barang,
        });

        // Map response to local format
        const mappedJenis = {
          id_jenis_barang: newJenis.id,
          kode_jenis_barang: newJenis.kode_jenis || uniqueKode,
          nama_jenis_barang:
            newJenis.nama_jenis || jenisFormData.nama_jenis_barang,
          deskripsi_jenis_barang:
            newJenis.deskripsi || jenisFormData.deskripsi_jenis_barang,
          created_at: newJenis.created_at,
        };

        setJenisBarangList([...jenisBarangList, mappedJenis]);
        toast.success(
          `Jenis barang berhasil ditambahkan! (Kode: ${mappedJenis.kode_jenis_barang})`
        );
      }
    } catch (error) {
      console.error("Error saving jenis barang:", error);
      toast.error("Gagal menyimpan jenis barang");
    } finally {
      setLoading(false);
    }

    setShowAddJenisDialog(false);
    setJenisKodeDirty(false);
    setJenisFormData({
      kode_jenis_barang: "",
      nama_jenis_barang: "",
      deskripsi_jenis_barang: "",
    });
    setSelectedJenisId(null);
  };

  const handleDeleteJenis = async (jenisId: number) => {
    try {
      setLoading(true);
      await jenisBarangAPI.delete(jenisId);
      setJenisBarangList(
        jenisBarangList.filter((j) => j.id_jenis_barang !== jenisId)
      );
      setBarangList(barangList.filter((b) => b.id_jenis_barang !== jenisId));
      toast.success("Jenis barang berhasil dihapus!");
      setDeleteTarget(null);
    } catch (error) {
      console.error("Error deleting jenis barang:", error);
      toast.error("Gagal menghapus jenis barang");
    } finally {
      setLoading(false);
    }
  };

  const handleBulkDeleteJenis = async () => {
    if (selectedJenisForDelete.length === 0) {
      toast.error("Pilih minimal satu jenis barang untuk dihapus");
      return;
    }
    try {
      setLoading(true);
      let successCount = 0;
      for (const id of selectedJenisForDelete) {
        try {
          await jenisBarangAPI.delete(id);
          successCount++;
        } catch (err) {
          console.error("Error deleting jenis:", err);
        }
      }
      // Refresh data
      setJenisBarangList(
        jenisBarangList.filter(
          (j) => !selectedJenisForDelete.includes(j.id_jenis_barang)
        )
      );
      setBarangList(
        barangList.filter(
          (b) => !selectedJenisForDelete.includes(b.id_jenis_barang || 0)
        )
      );
      toast.success(`Berhasil menghapus ${successCount} jenis barang`);
      setShowBulkDeleteJenisDialog(false);
      setSelectedJenisForDelete([]);
    } catch (error) {
      console.error("Error bulk deleting jenis:", error);
      toast.error("Gagal menghapus jenis barang");
    } finally {
      setLoading(false);
    }
  };

  const handleBulkDeleteBarang = async () => {
    if (selectedBarangForDelete.length === 0) {
      toast.error("Pilih minimal satu barang untuk dihapus");
      return;
    }
    try {
      setLoading(true);
      let successCount = 0;
      for (const id of selectedBarangForDelete) {
        try {
          await barangAPI.delete(id);
          successCount++;
        } catch (err) {
          console.error("Error deleting barang:", err);
        }
      }
      // Refresh data
      setBarangList(
        barangList.filter(
          (b) => !selectedBarangForDelete.includes(b.id_barang || b.id)
        )
      );
      toast.success(`Berhasil menghapus ${successCount} barang`);
      setShowBulkDeleteBarangDialog(false);
      setSelectedBarangForDelete([]);
    } catch (error) {
      console.error("Error bulk deleting barang:", error);
      toast.error("Gagal menghapus barang");
    } finally {
      setLoading(false);
    }
  };

  const handleFotoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Ukuran file maksimal 5MB");
      return;
    }

    // Validate file type
    if (!file.type.startsWith("image/")) {
      toast.error("File harus berupa gambar (JPG, PNG, GIF, dll)");
      return;
    }

    try {
      setSavingBarang(true);
      
      // For both new and existing barang: just store base64 for preview
      // Upload to Telegram will happen when user clicks Save
      const reader = new FileReader();
      reader.onload = (e) => {
        const base64String = e.target?.result as string;
        setBarangFormData({ ...barangFormData, foto_barang: base64String });
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error("Error uploading foto:", error);
      toast.error("Gagal mengupload foto");
    } finally {
      setSavingBarang(false);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDragEnter = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Only set isDragging to false if we're actually leaving the drop zone
    // (not just moving over a child element)
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX;
    const y = e.clientY;
    
    if (x < rect.left || x >= rect.right || y < rect.top || y >= rect.bottom) {
      setIsDragging(false);
    }
  };

  const handleDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      const file = files[0];

      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast.error("Ukuran file maksimal 5MB");
        return;
      }

      // Validate file type
      if (!file.type.startsWith("image/")) {
        toast.error("File harus berupa gambar (JPG, PNG, GIF, dll)");
        return;
      }

      // For both new and existing barang: just store base64 for preview
      // Upload to Telegram will happen when user clicks Save
      const reader = new FileReader();
      reader.onload = (event) => {
        const base64String = event.target?.result as string;
        setBarangFormData({ ...barangFormData, foto_barang: base64String });
      };
      reader.readAsDataURL(file);
    }
  };

  // ===== BARANG HANDLERS =====
  const handleAddBarang = async () => {
    if (!barangFormData.nama_barang.trim()) {
      toast.error("Nama barang tidak boleh kosong");
      return;
    }

    try {
      setSavingBarang(true);
      if (editingBarang) {
        const editingId = (editingBarang.id_barang ?? editingBarang.id) as number;

        // If foto is base64 (new upload), upload to Telegram first
        let fotoFileId = barangFormData.foto_barang;
        
        if (barangFormData.foto_barang && barangFormData.foto_barang.startsWith("data:")) {
          try {
            // Convert base64 to File
            const base64String = barangFormData.foto_barang;
            const arr = base64String.split(',');
            const mime = arr[0].match(/:(.*?);/)?.[1] || 'image/jpeg';
            const bstr = atob(arr[1]);
            const n = bstr.length;
            const u8arr = new Uint8Array(n);
            for (let i = 0; i < n; i++) {
              u8arr[i] = bstr.charCodeAt(i);
            }
            const photoFile = new File([u8arr], 'photo.jpg', { type: mime });
            
            const uploadResult = await uploadPhotoToTelegram(photoFile, editingId, API_BASE_URL);
            
            // Use the returned file_id
            fotoFileId = uploadResult.foto_barang;
          } catch (error) {
            console.error('Error uploading photo to Telegram:', error);
            toast.error('Gagal mengupload foto');
            // Continue with update without foto
          }
        }
        
        // Update barang via API - only send allowed fields
        const updatePayload: any = {
          nama_barang: barangFormData.nama_barang,
          deskripsi_barang: barangFormData.deskripsi_barang?.trim()
            ? barangFormData.deskripsi_barang
            : null,
          // IMPORTANT: no_serial_number has UNIQUE constraint; send null when empty
          no_serial_number: barangFormData.no_serial_number?.trim()
            ? barangFormData.no_serial_number
            : null,
          status: barangFormData.status as
            | "Dipinjam"
            | "Tersedia"
            | "Rusak"
            | "Hilang",
        };
        
        // Include foto_barang if it was uploaded
        if (fotoFileId && fotoFileId !== editingBarang.foto_barang) {
          updatePayload.foto_barang = fotoFileId;
        }
        
        console.log('Update payload:', updatePayload);
        console.log('Update payload JSON:', JSON.stringify(updatePayload, null, 2));
        console.log('Current foto_barang:', fotoFileId);
        
        // Try to update other fields (foto already updated by uploadPhotoToTelegram if it was base64)
        try {
          await barangAPI.update(editingId, updatePayload);
        } catch (updateError: any) {
          console.error('Update error:', updateError);
          // If it's "No valid fields to update", that's okay
          if (!updateError.message?.includes("No valid fields")) {
            throw updateError; // Re-throw if it's a real error
          }
        }

        // Update local list so changes (incl. foto) appear immediately without refresh.
        setBarangList((prev) =>
          prev.map((b: any) => {
            const rowId = (b.id_barang ?? b.id) as number | undefined;
            if (rowId === editingId) {
              return {
                ...b,
                ...barangFormData,
                foto_barang: fotoFileId,
                id_barang: b.id_barang ?? editingId,
                id: b.id ?? editingId,
              };
            }
            return b;
          })
        );
        toast.success("Barang berhasil diupdate!");
      } else {
        // Create barang via API with auto-generated kode_barang
        const jenisBarang = jenisBarangList.find(
          (j) => j.id_jenis_barang === selectedJenisId
        );
        const kodeJenis = jenisBarang?.kode_jenis_barang || "";
        const barangForJenis = barangList.filter(
          (b) => b.id_jenis_barang === selectedJenisId
        );
        const generatedKode = generateKodeBarang(kodeJenis, barangForJenis);

        // Create barang without foto first if it's base64
        let fotoValue = "https://images.unsplash.com/photo-1581092160562-40aa08e78837?w=400";
        
        const newBarang = {
          id_jenis_barang: selectedJenisId || 1,
          kode_barang: generatedKode,
          nama_barang: barangFormData.nama_barang,
          no_serial_number: barangFormData.no_serial_number,
          deskripsi_barang: barangFormData.deskripsi_barang,
          status: barangFormData.status as
            | "Dipinjam"
            | "Tersedia"
            | "Rusak"
            | "Hilang",
          foto_barang: fotoValue,
        };
        const createdBarang = await barangAPI.create(newBarang);
        
        // If user selected a photo (base64), upload it to Telegram now
        if (barangFormData.foto_barang && barangFormData.foto_barang.startsWith("data:")) {
          try {
            // Convert base64 to File
            const base64String = barangFormData.foto_barang;
            const arr = base64String.split(',');
            const mime = arr[0].match(/:(.*?);/)?.[1] || 'image/jpeg';
            const bstr = atob(arr[1]);
            const n = bstr.length;
            const u8arr = new Uint8Array(n);
            for (let i = 0; i < n; i++) {
              u8arr[i] = bstr.charCodeAt(i);
            }
            const photoFile = new File([u8arr], 'photo.jpg', { type: mime });
            
            const uploadResult = await uploadPhotoToTelegram(
              photoFile,
              createdBarang.id_barang ?? createdBarang.id,
              API_BASE_URL
            );
            
            // Update the local object with file_id (DB already updated by telegramController)
            createdBarang.foto_barang = uploadResult.foto_barang;
          } catch (error) {
            console.error('Error uploading photo to Telegram:', error);
            // Continue anyway, barang is created without photo
          }
        }
        
        setBarangList([...barangList, createdBarang]);
        toast.success(`Barang berhasil ditambahkan! (Kode: ${generatedKode})`);
      }
    } catch (error) {
      console.error("Error saving barang:", error);
      const message = (error as any)?.message;
      toast.error(message ? `Gagal menyimpan barang: ${message}` : "Gagal menyimpan barang");
    } finally {
      setSavingBarang(false);
    }

    setShowAddBarangDialog(false);
    setBarangFormData({
      nama_barang: "",
      kode_barang: "",
      no_serial_number: "",
      deskripsi_barang: "",
      status: "Tersedia",
      foto_barang: "",
    });
    setEditingBarang(null);
  };

  // ===== JENIS QR HANDLERS =====
  const handleShowJenisQR = async (kode: string, nama: string) => {
    try {
      // small label preview
      const dataUrl = await createSimpleLabelDataURL(kode, nama, {
        width: 720,
        height: 920,
      });
      setQrDataUrl(dataUrl);
      setQrLabelName(`${kode}-${nama}`.replace(/\s+/g, "-"));
      setQrJenisKode(kode);
      setQrJenisNama(nama);
      setQrDialogOpenForJenis(true);
    } catch (err) {
      console.error("Gagal membuat QR jenis:", err);
      toast.error("Gagal membuat QR untuk jenis barang");
    }
  };

  const handleDownloadJenisQR = async (kode: string, nama: string) => {
    try {
      await downloadSimpleLabelPNG(kode, nama, `jenis-${kode}`);
      toast.success("QR jenis berhasil diunduh");
    } catch (err) {
      console.error("Gagal mengunduh QR jenis:", err);
      toast.error("Gagal mengunduh QR jenis");
    }
  };

  const handleEditBarang = (barang: any) => {
    const normalizedBarang = {
      ...barang,
      id_barang: barang.id_barang ?? barang.id,
      id: barang.id ?? barang.id_barang,
    };
    setBarangFormData({
      nama_barang: barang.nama_barang,
      kode_barang: barang.kode_barang,
      no_serial_number: barang.no_serial_number || "",
      deskripsi_barang: barang.deskripsi_barang || "",
      status: barang.status,
      foto_barang: barang.foto_barang || "",
    });
    setEditingBarang(normalizedBarang);
    setShowAddBarangDialog(true);
  };

  const handleDeleteBarang = async (id: number) => {
    try {
      setLoading(true);
      await barangAPI.delete(id);
      // Filter using both id and id_barang for compatibility
      setBarangList(
        barangList.filter((b) => b.id !== id && b.id_barang !== id)
      );
      toast.success("Barang berhasil dihapus!");
      setDeleteTarget(null);
    } catch (error) {
      console.error("Error deleting barang:", error);
      toast.error("Gagal menghapus barang");
    } finally {
      setLoading(false);
    }
  };

  const handleImportBarang = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!selectedJenisId) {
      toast.error("Pilih jenis barang terlebih dahulu");
      return;
    }

    try {
      setLoading(true);
      const text = await file.text();
      const lines = text.trim().split("\n");

      if (lines.length < 2) {
        toast.error("File CSV harus memiliki header dan minimal 1 data");
        return;
      }

      // Parse CSV header
      const headers = lines[0].split(",").map((h) => h.trim().toLowerCase());
      const namaIndex = headers.indexOf("nama_barang");
      const seriesIndex = headers.indexOf("no_serial_number");
      const deskIndex = headers.indexOf("deskripsi_barang");
      const statusIndex = headers.indexOf("status");
      const fotoIndex = headers.indexOf("foto_barang");

      if (namaIndex === -1) {
        toast.error("CSV harus memiliki kolom 'nama_barang'");
        return;
      }

      const jenisBarang = jenisBarangList.find(
        (j) => j.id_jenis_barang === selectedJenisId
      );
      if (!jenisBarang) {
        toast.error("Jenis barang tidak ditemukan");
        return;
      }

      const kodeJenis = jenisBarang.kode_jenis_barang || "";
      const currentBarangForJenis = barangList.filter(
        (b) => b.id_jenis_barang === selectedJenisId
      );

      // Parse data rows
      const newBarang: any[] = [];
      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(",").map((v) => v.trim());
        if (values.length > 1 && values[namaIndex]) {
          // Auto-generate kode_barang
          const barangForThisJenis = [...currentBarangForJenis, ...newBarang];
          const generatedKode = generateKodeBarang(
            kodeJenis,
            barangForThisJenis
          );

          const barang = {
            id_jenis_barang: selectedJenisId,
            nama_barang: values[namaIndex] || "",
            kode_barang: generatedKode,
            no_serial_number: seriesIndex !== -1 ? values[seriesIndex] : "",
            deskripsi_barang: deskIndex !== -1 ? values[deskIndex] : "",
            status: (statusIndex !== -1 ? values[statusIndex] : "Tersedia") as
              | "Dipinjam"
              | "Tersedia"
              | "Rusak"
              | "Hilang",
            foto_barang: fotoIndex !== -1 ? values[fotoIndex] : "",
          };
          newBarang.push(barang);
        }
      }

      if (newBarang.length === 0) {
        toast.error("Tidak ada data yang berhasil diparse");
        return;
      }

      setBarangImportPreview(newBarang);
      setBarangImportFileName(file.name);
      setShowImportDialog(false);
      setShowBarangImportPreviewDialog(true);
      toast.success(
        `${newBarang.length} barang siap diimport. Silakan review dulu.`
      );
    } catch (error) {
      console.error("Error importing:", error);
      toast.error("Gagal mengimport file. Pastikan format CSV benar.");
    } finally {
      setLoading(false);
      event.target.value = "";
    }
  };

  // Handler untuk import jenis barang dan barang sekaligus
  const handleImportJenisBarang = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setLoading(true);
      const text = await file.text();
      const lines = text.trim().split("\n");

      if (lines.length < 2) {
        toast.error("File CSV harus memiliki header dan minimal 1 data");
        return;
      }

      // Parse CSV header
      const headers = lines[0].split(",").map((h) => h.trim().toLowerCase());
      const jenisIndex = headers.indexOf("jenis_barang");
      const deskJenisIndex = headers.indexOf("deskripsi_jenis");
      const namaIndex = headers.indexOf("nama_barang");
      const seriesIndex = headers.indexOf("no_serial_number");
      const deskIndex = headers.indexOf("deskripsi_barang");
      const statusIndex = headers.indexOf("status");
      const fotoIndex = headers.indexOf("foto_barang");

      if (jenisIndex === -1 || namaIndex === -1) {
        toast.error(
          "CSV harus memiliki kolom 'jenis_barang' dan 'nama_barang'"
        );
        return;
      }

      // Parse data rows dan group by jenis_barang
      const jenisMap = new Map<string, { deskripsi: string; barang: any[] }>();

      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(",").map((v) => v.trim());
        if (values.length > 1 && values[jenisIndex] && values[namaIndex]) {
          const jenisBaek = values[jenisIndex];
          const deskJenis = deskJenisIndex !== -1 ? values[deskJenisIndex] : "";

          if (!jenisMap.has(jenisBaek)) {
            jenisMap.set(jenisBaek, { deskripsi: deskJenis, barang: [] });
          }

          const barangData = {
            nama_barang: values[namaIndex],
            no_serial_number: seriesIndex !== -1 ? values[seriesIndex] : "",
            deskripsi_barang: deskIndex !== -1 ? values[deskIndex] : "",
            status: (statusIndex !== -1 ? values[statusIndex] : "Tersedia") as
              | "Dipinjam"
              | "Tersedia"
              | "Rusak"
              | "Hilang",
            foto_barang: fotoIndex !== -1 ? values[fotoIndex] : "",
          };

          jenisMap.get(jenisBaek)!.barang.push(barangData);
        }
      }

      if (jenisMap.size === 0) {
        toast.error("Tidak ada data yang berhasil diparse");
        return;
      }

      const previewList: any[] = [];

      for (const [jenisNama, jenisData] of jenisMap.entries()) {
        const existingJenis = jenisBarangList.find(
          (j) => j.nama_jenis_barang.toLowerCase() === jenisNama.toLowerCase()
        );

        const kodeJenis =
          existingJenis?.kode_jenis_barang || generateKodeJenis(jenisNama);

        const baseBarangForJenis = existingJenis
          ? barangList.filter((b) => b.id_jenis_barang === existingJenis.id_jenis_barang)
          : [];

        const barangPreview: any[] = [];

        for (let j = 0; j < jenisData.barang.length; j++) {
          const barangToCreate = jenisData.barang[j];
          const barangForThisJenis = [...baseBarangForJenis, ...barangPreview];
          const generatedKode = generateKodeBarang(
            kodeJenis,
            barangForThisJenis
          );

          barangPreview.push({
            id_jenis_barang: existingJenis?.id_jenis_barang || null,
            nama_barang: barangToCreate.nama_barang,
            kode_barang: generatedKode,
            no_serial_number: barangToCreate.no_serial_number,
            deskripsi_barang: barangToCreate.deskripsi_barang,
            status: barangToCreate.status,
            foto_barang: barangToCreate.foto_barang,
          });
        }

        previewList.push({
          nama_jenis_barang: jenisNama,
          deskripsi_jenis_barang: jenisData.deskripsi,
          kode_jenis_barang: kodeJenis,
          id_jenis_barang: existingJenis?.id_jenis_barang || null,
          existing: Boolean(existingJenis),
          barang: barangPreview,
        });
      }

      const totalBarangPreview = previewList.reduce(
        (acc, jenis) => acc + (jenis.barang?.length || 0),
        0
      );

      setJenisImportPreview(previewList);
      setJenisImportFileName(file.name);
      setShowImportJenisBarangDialog(false);
      setShowJenisImportPreviewDialog(true);
      toast.success(
        `${previewList.length} jenis dan ${totalBarangPreview} barang siap diimport. Silakan review dulu.`
      );
    } catch (error) {
      console.error("Error importing:", error);
      toast.error("Gagal mengimport file. Pastikan format CSV benar.");
    } finally {
      setLoading(false);
      event.target.value = "";
    }
  };

  const handleConfirmImportBarang = async () => {
    if (!selectedJenisId || barangImportPreview.length === 0) {
      toast.error("Tidak ada data yang siap diimport");
      return;
    }

    try {
      setLoading(true);
      const createdBarang: any[] = [];

      for (const barang of barangImportPreview) {
        const payload = {
          ...barang,
          id_jenis_barang: selectedJenisId,
        };
        const created = await barangAPI.create(payload);
        createdBarang.push(created);
      }

      setBarangList([...barangList, ...createdBarang]);
      toast.success(`${createdBarang.length} barang berhasil diimport!`);
      setShowBarangImportPreviewDialog(false);
      setBarangImportPreview([]);
      setBarangImportFileName("");
    } catch (error) {
      console.error("Error importing barang:", error);
      toast.error("Gagal mengimport barang");
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmImportJenisBarang = async () => {
    if (jenisImportPreview.length === 0) {
      toast.error("Tidak ada data yang siap diimport");
      return;
    }

    try {
      setLoading(true);
      const createdJenis: any[] = [];
      const createdBarang: any[] = [];

      for (const jenisPreview of jenisImportPreview) {
        let targetJenis = jenisBarangList.find(
          (j) => j.id_jenis_barang === jenisPreview.id_jenis_barang
        );

        if (!targetJenis) {
          targetJenis = jenisBarangList.find(
            (j) =>
              j.nama_jenis_barang.toLowerCase() ===
              jenisPreview.nama_jenis_barang.toLowerCase()
          );
        }

        if (!targetJenis) {
          const created: any = await jenisBarangAPI.create({
            kode_jenis: jenisPreview.kode_jenis_barang,
            nama_jenis: jenisPreview.nama_jenis_barang,
            deskripsi: jenisPreview.deskripsi_jenis_barang,
          });

          targetJenis = {
            id_jenis_barang: created.id,
            kode_jenis_barang: created.kode_jenis || created.kode_jenis_barang,
            nama_jenis_barang: created.nama_jenis || created.nama_jenis_barang,
            deskripsi_jenis_barang:
              created.deskripsi || created.deskripsi_jenis_barang,
          };

          createdJenis.push(targetJenis);
        }

        const jenisId = targetJenis.id_jenis_barang;

        for (const barang of jenisPreview.barang) {
          const payload = {
            ...barang,
            id_jenis_barang: jenisId,
          };

          const created = await barangAPI.create(payload);
          createdBarang.push(created);
        }
      }

      if (createdJenis.length > 0) {
        setJenisBarangList([...jenisBarangList, ...createdJenis]);
      }

      if (createdBarang.length > 0) {
        setBarangList([...barangList, ...createdBarang]);
      }

      toast.success(
        `${createdJenis.length} jenis dan ${createdBarang.length} barang berhasil diimport!`
      );
      setShowJenisImportPreviewDialog(false);
      setJenisImportPreview([]);
      setJenisImportFileName("");
    } catch (error) {
      console.error("Error importing jenis/barang:", error);
      toast.error("Gagal mengimport jenis/barang");
    } finally {
      setLoading(false);
    }
  };

  const csvEscape = (value: any) => {
    if (value === undefined || value === null) return "";
    const str = String(value).replace(/"/g, '""');
    return `"${str}"`;
  };

  const exportJenisBarangCsv = () => {
    if (jenisBarangList.length === 0) {
      toast.error("Tidak ada jenis barang untuk diexport");
      return;
    }

    const jenisMap = new Map(
      jenisBarangList.map((j) => [j.id_jenis_barang, j])
    );

    const header =
      "jenis_barang,deskripsi_jenis,nama_barang,no_serial_number,deskripsi_barang,status";

    const barangRows = barangList.map((b) => {
      const jenisKey =
        (b as any).id_jenis_barang ?? (b as any).id_jenis ?? null;
      const jenis = (jenisKey ? jenisMap.get(jenisKey) : undefined) || {};

      return [
        csvEscape(jenis.nama_jenis_barang || ""),
        csvEscape(jenis.deskripsi_jenis_barang || ""),
        csvEscape(b.nama_barang || ""),
        csvEscape(b.no_serial_number || ""),
        csvEscape(b.deskripsi_barang || ""),
        csvEscape(b.status || ""),
      ].join(",");
    });

    const jenisDenganBarang = new Set<number>();
    barangList.forEach((b) => {
      const key = (b as any).id_jenis_barang ?? (b as any).id_jenis;
      if (typeof key === "number") jenisDenganBarang.add(key);
    });

    const jenisTanpaBarang = jenisBarangList
      .filter((j) => !jenisDenganBarang.has(j.id_jenis_barang))
      .map((j) =>
        [
          csvEscape(j.nama_jenis_barang || ""),
          csvEscape(j.deskripsi_jenis_barang || ""),
          csvEscape(""),
          csvEscape(""),
          csvEscape(""),
          csvEscape(""),
        ].join(",")
      );

    const rows = [...barangRows, ...jenisTanpaBarang];

    const csvContent = [header, ...rows].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "export-jenis-barang.csv";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success(`Berhasil export ${rows.length} baris CSV`);
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-muted-foreground">Memuat data barang...</p>
          </div>
        </div>
      </AdminLayout>
    );
  }

  // Calculate statistics
  const stats = {
    totalJenis: jenisBarangList.length,
    totalBarang: barangList.length,
    tersedia: barangList.filter((b) => b.status === "Tersedia").length,
    dipinjam: barangList.filter((b) => b.status === "Dipinjam").length,
    rusak: barangList.filter(
      (b) => b.status === "Rusak" || b.status === "Hilang"
    ).length,
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold mb-2">Kelola Barang</h2>
            <p className="text-muted-foreground">
              Kelola jenis barang dan item barang yang tersedia
            </p>
          </div>
          <div className="flex gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="secondary"
                  className="gap-2"
                  disabled={jenisBarangList.length === 0}
                >
                  ⚙️ Menu
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuItem onClick={() => openQRPrintDialog()} className="gap-2">
                  <QrCode className="h-4 w-4" />
                  Cetak QR Code
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => openBarcodePrintDialog()} className="gap-2">
                  <Barcode className="h-4 w-4" />
                  Cetak Barcode
                </DropdownMenuItem>
                <DropdownMenuItem onClick={openQRJenisSelectionDialog} className="gap-2">
                  <Download className="h-4 w-4" />
                  Download QR ZIP
                </DropdownMenuItem>
                <DropdownMenuItem onClick={exportJenisBarangCsv} className="gap-2">
                  <Download className="h-4 w-4" />
                  Export CSV
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={() => {
                    setSelectedJenisForDelete([]);
                    setShowBulkDeleteJenisDialog(true);
                  }}
                  className="gap-2 text-red-600"
                >
                  <Trash2 className="h-4 w-4" />
                  Hapus Semua Jenis
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={() => setShowImportJenisBarangDialog(true)}
                  className="gap-2"
                >
                  <UploadIcon className="h-4 w-4" />
                  Import Jenis & Barang
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Dialog
              open={showImportJenisBarangDialog}
              onOpenChange={setShowImportJenisBarangDialog}
            >
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>Import Jenis Barang & Barang</DialogTitle>
                  <DialogDescription>
                    Import data jenis barang dan barang sekaligus menggunakan template CSV.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <p className="text-sm text-muted-foreground mb-3">
                      Format CSV:{" "}
                      <strong>
                        jenis_barang, deskripsi_jenis, nama_barang,
                        no_serial_number, deskripsi_barang, status, foto_barang
                      </strong>
                    </p>
                    <p className="text-xs text-muted-foreground mb-4">
                      ✓ Kode jenis dan barang otomatis generate
                      <br />
                      ✓ Jenis barang dibuat otomatis jika belum ada
                      <br />✓ Format: CSV saja (tidak support XLSX)
                    </p>
                    <Button
                      size="sm"
                      variant="secondary"
                      className="w-full mb-4"
                      onClick={() => {
                        const link = document.createElement("a");
                        link.href = "/template-barang-lengkap.csv";
                        link.download = "template-barang-lengkap.csv";
                        document.body.appendChild(link);
                        link.click();
                        document.body.removeChild(link);
                        toast.success("Template CSV berhasil didownload");
                      }}
                    >
                      📥 Download Template CSV
                    </Button>
                    <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6 text-center">
                      <input
                        type="file"
                        accept=".csv"
                        onChange={handleImportJenisBarang}
                        className="hidden"
                        id="import-jenis-barang-file"
                      />
                      <label
                        htmlFor="import-jenis-barang-file"
                        className="cursor-pointer"
                      >
                        <div className="text-sm font-medium">
                          Klik untuk memilih file
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">
                          CSV
                        </div>
                      </label>
                    </div>
                  </div>
                  <div className="flex gap-2 justify-end">
                    <Button
                      variant="outline"
                      onClick={() => setShowImportJenisBarangDialog(false)}
                    >
                      Batal
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
            <Dialog
              open={showAddJenisDialog}
              onOpenChange={setShowAddJenisDialog}
            >
              <DialogTrigger asChild>
                <Button
                  onClick={() => {
                    setSelectedJenisId(null);
                    setJenisKodeDirty(false);
                    setJenisFormData({
                      kode_jenis_barang: "",
                      nama_jenis_barang: "",
                      deskripsi_jenis_barang: "",
                    });
                  }}
                  className="gap-2"
                >
                  <Plus className="h-4 w-4" />
                  Tambah Jenis Barang
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>
                    {selectedJenisId
                      ? "Edit Jenis Barang"
                      : "Tambah Jenis Barang"}
                  </DialogTitle>
                  <DialogDescription>
                    Isi kode dan nama jenis barang, lalu simpan perubahan.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium">
                      Kode Jenis Barang
                    </label>
                    <Input
                      placeholder="TKJ-XXXX"
                      value={jenisFormData.kode_jenis_barang}
                      onChange={(e) => {
                        setJenisKodeDirty(true);
                        setJenisFormData({
                          ...jenisFormData,
                          kode_jenis_barang: e.target.value.toUpperCase(),
                        });
                      }}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">
                      Nama Jenis Barang
                    </label>
                    <Input
                      placeholder="Contoh: Peralatan Networking"
                      value={jenisFormData.nama_jenis_barang}
                      onChange={(e) =>
                        setJenisFormData({
                          ...jenisFormData,
                          nama_jenis_barang: e.target.value,
                        })
                      }
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Deskripsi</label>
                    <textarea
                      placeholder="Deskripsi jenis barang"
                      value={jenisFormData.deskripsi_jenis_barang}
                      onChange={(e) =>
                        setJenisFormData({
                          ...jenisFormData,
                          deskripsi_jenis_barang: e.target.value,
                        })
                      }
                      className="w-full p-2 border rounded-md text-sm mt-1"
                      rows={4}
                    />
                  </div>
                  <div className="flex gap-2 justify-end">
                    <Button
                      variant="outline"
                      onClick={() => setShowAddJenisDialog(false)}
                    >
                      Batal
                    </Button>
                    <Button onClick={handleSaveJenis}>
                      {selectedJenisId ? "Update" : "Tambah"}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Jenis Barang
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stats.totalJenis}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Barang
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stats.totalBarang}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Tersedia
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-600">
                {stats.tersedia}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Dipinjam
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-amber-600">
                {stats.dipinjam}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Rusak/Hilang
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-red-600">
                {stats.rusak}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Jenis Barang Table */}
        <Card>
          <CardHeader>
            <CardTitle>Daftar Jenis Barang</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted border-b">
                  <tr>
                    <th className="text-left p-3 font-semibold">Kode</th>
                    <th className="text-left p-3 font-semibold">Nama Jenis</th>
                    <th className="text-left p-3 font-semibold">Deskripsi</th>
                    <th className="text-center p-3 font-semibold">
                      Jumlah Item
                    </th>
                    <th className="text-center p-3 font-semibold">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {jenisBarangList.map((jenis) => {
                    const itemCount = getBarangForJenis(
                      jenis.id_jenis_barang
                    ).length;
                    return (
                      <tr
                        key={jenis.id_jenis_barang}
                        className="hover:bg-muted/50"
                      >
                        <td className="p-3 font-mono text-xs font-semibold text-primary">
                          <div className="flex items-center gap-2">
                            <code className="bg-muted px-2 py-1 rounded">
                              {jenis.kode_jenis_barang}
                            </code>
                            <div className="flex items-center gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() =>
                                  handleShowJenisQR(
                                    jenis.kode_jenis_barang,
                                    jenis.nama_jenis_barang
                                  )
                                }
                                title="Tampilkan QR Jenis"
                              >
                                <QrCode className="h-4 w-4" />
                              </Button>
                              {/* <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleDownloadJenisQR(jenis.kode_jenis_barang, jenis.nama_jenis_barang)}
                                title="Download QR Jenis"
                              >
                                <QrCode className="h-4 w-4 opacity-60" />
                              </Button> */}
                            </div>
                          </div>
                        </td>
                        <td className="p-3 font-medium">
                          {jenis.nama_jenis_barang}
                        </td>
                        <td className="p-3 text-muted-foreground text-xs">
                          {jenis.deskripsi_jenis_barang}
                        </td>
                        <td className="p-3 text-center">
                          <span className="inline-flex items-center justify-center px-3 py-1 bg-blue-100 text-blue-700 text-xs font-semibold rounded-full">
                            {itemCount} item
                          </span>
                        </td>
                        <td className="p-3">
                          <div className="flex items-center justify-center gap-2">
                            <Dialog
                              open={
                                showBarangDialog &&
                                selectedJenisId === jenis.id_jenis_barang
                              }
                              onOpenChange={setShowBarangDialog}
                            >
                              <DialogTrigger asChild>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() =>
                                    setSelectedJenisId(jenis.id_jenis_barang)
                                  }
                                  className="gap-2"
                                >
                                  <Eye className="h-4 w-4" />
                                  Tampilkan Barang
                                </Button>
                              </DialogTrigger>
                              <DialogContent className="max-w-5xl max-h-[85vh] overflow-y-auto">
                                <DialogHeader>
                                  <DialogTitle>
                                    Barang -{" "}
                                    {getJenisName(selectedJenisId || 0)}
                                  </DialogTitle>
                                  <DialogDescription>
                                    Kelola daftar barang pada jenis ini (tambah, import, hapus, dan download barcode).
                                  </DialogDescription>
                                </DialogHeader>
                                <div className="flex gap-2 mb-4">
                                  <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                      <Button
                                        size="sm"
                                        variant="secondary"
                                        className="gap-2"
                                        disabled={getBarangForJenis(selectedJenisId || 0).length === 0}
                                      >
                                        ⚙️ Menu
                                      </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end" className="w-56">
                                      <DropdownMenuItem 
                                        onClick={() => openBarcodeSelectionDialog(selectedJenisId || 0)}
                                        className="gap-2"
                                      >
                                        <Printer className="h-4 w-4" />
                                        Cetak Barcode
                                      </DropdownMenuItem>
                                      <DropdownMenuItem 
                                        onClick={() => openBarcodeSelectionDialog(selectedJenisId || 0)}
                                        className="gap-2"
                                      >
                                        <Download className="h-4 w-4" />
                                        Download Barcode (ZIP)
                                      </DropdownMenuItem>
                                      <DropdownMenuItem 
                                        onClick={() => setShowImportDialog(true)}
                                        className="gap-2"
                                      >
                                        <UploadIcon className="h-4 w-4" />
                                        Import CSV/XLSX
                                      </DropdownMenuItem>
                                      <DropdownMenuItem 
                                        onClick={() => {
                                          setSelectedBarangForDelete([]);
                                          setShowBulkDeleteBarangDialog(true);
                                        }}
                                        className="gap-2 text-red-600"
                                      >
                                        <Trash2 className="h-4 w-4" />
                                        Hapus Semua
                                      </DropdownMenuItem>
                                    </DropdownMenuContent>
                                  </DropdownMenu>
                                  <Button
                                    size="sm"
                                    onClick={() => {
                                      setBarangFormData({
                                        nama_barang: "",
                                        kode_barang: "",
                                        no_serial_number: "",
                                        deskripsi_barang: "",
                                        status: "Tersedia",
                                        foto_barang: "",
                                      });
                                      setEditingBarang(null);
                                      setShowAddBarangDialog(true);
                                    }}
                                    className="gap-2"
                                  >
                                    <Plus className="h-4 w-4" />
                                    Tambah Barang
                                  </Button>
                                  <Dialog
                                    open={showImportDialog}
                                    onOpenChange={setShowImportDialog}
                                  >
                                    <DialogContent className="max-w-md">
                                      <DialogHeader>
                                        <DialogTitle>
                                          Import Barang dari File
                                        </DialogTitle>
                                        <DialogDescription>
                                          Unggah CSV/XLSX dengan kolom minimal nama_barang untuk menambah data barang.
                                        </DialogDescription>
                                      </DialogHeader>
                                      <div className="space-y-4">
                                        <div>
                                          <p className="text-sm text-muted-foreground mb-3">
                                            Format CSV harus memiliki kolom:{" "}
                                            <strong>nama_barang</strong>
                                          </p>
                                          <p className="text-xs text-muted-foreground mb-4">
                                            <strong>
                                              Kode barang otomatis generate!
                                            </strong>{" "}
                                            Kolom opsional: no_serial_number,
                                            deskripsi_barang, status,
                                            foto_barang
                                          </p>
                                          <Button
                                            size="sm"
                                            variant="secondary"
                                            className="w-full mb-4"
                                            onClick={() => {
                                              const link =
                                                document.createElement("a");
                                              link.href =
                                                "/template-barang.csv";
                                              link.download =
                                                "template-barang.csv";
                                              document.body.appendChild(link);
                                              link.click();
                                              document.body.removeChild(link);
                                              toast.success(
                                                "Template CSV berhasil didownload"
                                              );
                                            }}
                                          >
                                            📥 Download Template CSV
                                          </Button>
                                          <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6 text-center">
                                            <input
                                              type="file"
                                              accept=".csv,.xlsx"
                                              onChange={handleImportBarang}
                                              className="hidden"
                                              id="import-file"
                                            />
                                            <label
                                              htmlFor="import-file"
                                              className="cursor-pointer"
                                            >
                                              <div className="text-sm font-medium">
                                                Klik untuk memilih file atau
                                                drag & drop
                                              </div>
                                              <div className="text-xs text-muted-foreground mt-1">
                                                CSV atau XLSX
                                              </div>
                                            </label>
                                          </div>
                                        </div>
                                        <div className="flex gap-2 justify-end">
                                          <Button
                                            variant="outline"
                                            onClick={() =>
                                              setShowImportDialog(false)
                                            }
                                          >
                                            Batal
                                          </Button>
                                        </div>
                                      </div>
                                    </DialogContent>
                                  </Dialog>
                                </div>
                                <div className="space-y-4">
                                  {getBarangForJenis(selectedJenisId || 0)
                                    .length > 0 ? (
                                    <div className="space-y-3">
                                      {getBarangForJenis(
                                        selectedJenisId || 0
                                      ).map((barang) => (
                                        <div
                                          key={barang.id || barang.id_barang}
                                          className="border rounded-lg p-4 hover:shadow-md transition-shadow flex gap-4"
                                        >
                                          {barang.foto_barang && (
                                            <img
                                              src={getPhotoUrl(barang.foto_barang, API_BASE_URL)}
                                              alt={barang.nama_barang}
                                              className="w-24 h-24 object-cover rounded flex-shrink-0"
                                            />
                                          )}
                                          <div className="flex-1">
                                            <div className="flex items-start justify-between gap-4">
                                              <div>
                                                <h4 className="font-semibold text-base">
                                                  {barang.nama_barang}
                                                </h4>
                                                <p className="text-xs text-muted-foreground font-mono">
                                                  {barang.kode_barang}
                                                </p>
                                                <p className="text-sm mt-1">
                                                  {barang.deskripsi_barang}
                                                </p>
                                                {barang.no_serial_number && (
                                                  <p className="text-xs text-muted-foreground mt-1">
                                                    SN:{" "}
                                                    {barang.no_serial_number}
                                                  </p>
                                                )}
                                                <div className="flex items-center gap-2 mt-2">
                                                  <span
                                                    className={`px-2 py-1 rounded text-xs font-semibold ${
                                                      barang.status ===
                                                      "Tersedia"
                                                        ? "bg-green-100 text-green-700"
                                                        : barang.status ===
                                                          "Dipinjam"
                                                        ? "bg-yellow-100 text-yellow-700"
                                                        : "bg-red-100 text-red-700"
                                                    }`}
                                                  >
                                                    {barang.status}
                                                  </span>
                                                </div>
                                              </div>
                                              <div className="flex gap-2 flex-shrink-0">
                                                <Button
                                                  variant="outline"
                                                  size="sm"
                                                  onClick={() => {
                                                    handleEditBarang(barang);
                                                    setShowAddBarangDialog(
                                                      true
                                                    );
                                                  }}
                                                  className="gap-1"
                                                >
                                                  <Edit2 className="h-4 w-4" />
                                                  Edit
                                                </Button>
                                                <Button
                                                  variant="ghost"
                                                  size="sm"
                                                  onClick={async () => {
                                                    try {
                                                      const dataUrl =
                                                        await createBarcodeDataURL(
                                                          barang.kode_barang,
                                                          {
                                                            width: 960,
                                                            height: 300,
                                                          }
                                                        );
                                                      setBarcodeDataUrl(
                                                        dataUrl
                                                      );
                                                      setBarcodeKode(
                                                        barang.kode_barang
                                                      );
                                                      setBarcodeNama(
                                                        barang.nama_barang
                                                      );
                                                      setBarcodeDialogOpen(
                                                        true
                                                      );
                                                    } catch (err) {
                                                      console.error(
                                                        "Gagal membuat barcode:",
                                                        err
                                                      );
                                                      toast.error(
                                                        "Gagal membuat barcode"
                                                      );
                                                    }
                                                  }}
                                                  className="gap-1"
                                                >
                                                  <Barcode className="h-4 w-4" />
                                                  Barcode
                                                </Button>
                                                <AlertDialog
                                                  open={
                                                    deleteTarget?.type ===
                                                      "barang" &&
                                                    deleteTarget?.id ===
                                                      (barang.id ||
                                                        barang.id_barang)
                                                  }
                                                  onOpenChange={(open) => {
                                                    if (!open)
                                                      setDeleteTarget(null);
                                                  }}
                                                >
                                                  <Button
                                                    variant="destructive"
                                                    size="sm"
                                                    onClick={() =>
                                                      setDeleteTarget({
                                                        type: "barang",
                                                        id:
                                                          barang.id ||
                                                          barang.id_barang,
                                                      })
                                                    }
                                                    className="gap-1"
                                                  >
                                                    <Trash2 className="h-4 w-4" />
                                                    Hapus
                                                  </Button>
                                                  <AlertDialogContent>
                                                    <AlertDialogHeader>
                                                      <AlertDialogTitle>
                                                        Hapus Barang?
                                                      </AlertDialogTitle>
                                                      <AlertDialogDescription>
                                                        Apakah Anda yakin ingin
                                                        menghapus "
                                                        {barang.nama_barang}"?
                                                        Tindakan ini tidak bisa
                                                        dibatalkan.
                                                      </AlertDialogDescription>
                                                    </AlertDialogHeader>
                                                    <div className="flex gap-2 justify-end">
                                                      <AlertDialogCancel
                                                        onClick={() =>
                                                          setDeleteTarget(null)
                                                        }
                                                      >
                                                        Batal
                                                      </AlertDialogCancel>
                                                      <AlertDialogAction
                                                        onClick={() =>
                                                          handleDeleteBarang(
                                                            barang.id ||
                                                              barang.id_barang
                                                          )
                                                        }
                                                        className="bg-red-600 hover:bg-red-700"
                                                      >
                                                        Hapus
                                                      </AlertDialogAction>
                                                    </div>
                                                  </AlertDialogContent>
                                                </AlertDialog>
                                              </div>
                                            </div>
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  ) : (
                                    <div className="text-center py-12 text-muted-foreground">
                                      <Package className="h-12 w-12 mx-auto mb-2 opacity-50" />
                                      <p>Tidak ada barang untuk jenis ini</p>
                                    </div>
                                  )}
                                </div>
                              </DialogContent>
                            </Dialog>

                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleEditJenis(jenis)}
                              className="gap-2"
                            >
                              <Edit2 className="h-4 w-4" />
                              Edit
                            </Button>

                            <AlertDialog
                              open={
                                deleteTarget?.type === "jenis" &&
                                deleteTarget?.id === jenis.id_jenis_barang
                              }
                              onOpenChange={(open) => {
                                if (!open) setDeleteTarget(null);
                              }}
                            >
                              <Button
                                variant="destructive"
                                size="sm"
                                onClick={() =>
                                  setDeleteTarget({
                                    type: "jenis",
                                    id: jenis.id_jenis_barang,
                                  })
                                }
                                className="gap-2"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>
                                    Hapus Jenis Barang?
                                  </AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Menghapus jenis barang akan menghapus semua
                                    barang di dalamnya. Tindakan ini tidak bisa
                                    dibatalkan.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <div className="flex gap-2 justify-end">
                                  <AlertDialogCancel
                                    onClick={() => setDeleteTarget(null)}
                                  >
                                    Batal
                                  </AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() =>
                                      handleDeleteJenis(jenis.id_jenis_barang)
                                    }
                                    className="bg-red-600 hover:bg-red-700"
                                  >
                                    Hapus
                                  </AlertDialogAction>
                                </div>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {jenisBarangList.length === 0 && (
              <div className="text-center py-12 text-muted-foreground">
                <Package className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>Belum ada jenis barang</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Import Barang Preview Dialog */}
        <Dialog
          open={showBarangImportPreviewDialog}
          onOpenChange={(open) => {
            setShowBarangImportPreviewDialog(open);
            if (!open) {
              setBarangImportPreview([]);
              setBarangImportFileName("");
            }
          }}
        >
          <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Review Import Barang</DialogTitle>
              <DialogDescription>
                Tinjau data barang sebelum diimport. Pastikan kode dan status sudah sesuai.
              </DialogDescription>
              <p className="text-sm text-muted-foreground">
                {getJenisName(selectedJenisId || 0)}
                {barangImportFileName ? ` • File: ${barangImportFileName}` : ""}
              </p>
            </DialogHeader>
            <div className="max-h-[50vh] overflow-y-auto border rounded-lg">
              {barangImportPreview.length > 0 ? (
                <table className="w-full text-sm">
                  <thead className="bg-muted">
                    <tr>
                      <th className="text-left p-3 font-semibold">Kode</th>
                      <th className="text-left p-3 font-semibold">Nama</th>
                      <th className="text-left p-3 font-semibold">Serial</th>
                      <th className="text-left p-3 font-semibold">Deskripsi</th>
                      <th className="text-left p-3 font-semibold">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {barangImportPreview.map((barang, idx) => (
                      <tr key={idx} className="hover:bg-muted/50">
                        <td className="p-3 font-mono text-xs text-primary">{barang.kode_barang}</td>
                        <td className="p-3 font-medium">{barang.nama_barang}</td>
                        <td className="p-3 text-xs text-muted-foreground">
                          {barang.no_serial_number || "-"}
                        </td>
                        <td className="p-3 text-xs text-muted-foreground">
                          {barang.deskripsi_barang || "-"}
                        </td>
                        <td className="p-3">
                          <span
                            className={`px-2 py-1 rounded text-xs font-semibold ${
                              barang.status === "Tersedia"
                                ? "bg-green-100 text-green-700"
                                : barang.status === "Dipinjam"
                                ? "bg-yellow-100 text-yellow-700"
                                : "bg-red-100 text-red-700"
                            }`}
                          >
                            {barang.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="p-6 text-center text-muted-foreground text-sm">
                  Tidak ada data untuk diimport
                </div>
              )}
            </div>
            <div className="flex items-center justify-between gap-2 pt-4">
              <p className="text-xs text-muted-foreground">
                Kode barang sudah digenerate otomatis. Pastikan data sudah benar.
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => setShowBarangImportPreviewDialog(false)}
                >
                  Batal
                </Button>
                <Button
                  onClick={handleConfirmImportBarang}
                  disabled={barangImportPreview.length === 0}
                >
                  Import {barangImportPreview.length} Barang
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Import Jenis + Barang Preview Dialog */}
        <Dialog
          open={showJenisImportPreviewDialog}
          onOpenChange={(open) => {
            setShowJenisImportPreviewDialog(open);
            if (!open) {
              setJenisImportPreview([]);
              setJenisImportFileName("");
            }
          }}
        >
          <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Review Import Jenis & Barang</DialogTitle>
              <DialogDescription>
                Pastikan daftar jenis dan barang sudah benar sebelum proses import berjalan.
              </DialogDescription>
              <p className="text-sm text-muted-foreground">
                {jenisImportFileName ? `File: ${jenisImportFileName} • ` : ""}
                {jenisImportPreview.length} jenis, {jenisImportPreview.reduce((acc, j) => acc + (j.barang?.length || 0), 0)} barang
              </p>
            </DialogHeader>
            <div className="space-y-4">
              {jenisImportPreview.length > 0 ? (
                jenisImportPreview.map((jenis, idx) => (
                  <div key={idx} className="border rounded-lg overflow-hidden">
                    <div className="flex items-start justify-between gap-3 bg-muted p-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <code className="bg-white/60 px-2 py-1 rounded text-xs font-semibold text-primary">
                            {jenis.kode_jenis_barang}
                          </code>
                          <span className="font-semibold">{jenis.nama_jenis_barang}</span>
                        </div>
                        {jenis.deskripsi_jenis_barang && (
                          <div className="text-xs text-muted-foreground mt-1">
                            {jenis.deskripsi_jenis_barang}
                          </div>
                        )}
                      </div>
                      <span className="text-xs font-semibold uppercase text-muted-foreground">
                        {jenis.existing ? "Sudah ada" : "Jenis baru"}
                      </span>
                    </div>
                    <div className="max-h-[40vh] overflow-y-auto">
                      <table className="w-full text-sm">
                        <thead className="bg-muted/80">
                          <tr>
                            <th className="text-left p-3 font-semibold">Kode Barang</th>
                            <th className="text-left p-3 font-semibold">Nama</th>
                            <th className="text-left p-3 font-semibold">Serial</th>
                            <th className="text-left p-3 font-semibold">Deskripsi</th>
                            <th className="text-left p-3 font-semibold">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y">
                          {jenis.barang.map((barang: any, bIdx: number) => (
                            <tr key={`${idx}-${bIdx}`} className="hover:bg-muted/50">
                              <td className="p-3 font-mono text-xs text-primary">
                                {barang.kode_barang}
                              </td>
                              <td className="p-3 font-medium">{barang.nama_barang}</td>
                              <td className="p-3 text-xs text-muted-foreground">
                                {barang.no_serial_number || "-"}
                              </td>
                              <td className="p-3 text-xs text-muted-foreground">
                                {barang.deskripsi_barang || "-"}
                              </td>
                              <td className="p-3">
                                <span
                                  className={`px-2 py-1 rounded text-xs font-semibold ${
                                    barang.status === "Tersedia"
                                      ? "bg-green-100 text-green-700"
                                      : barang.status === "Dipinjam"
                                      ? "bg-yellow-100 text-yellow-700"
                                      : "bg-red-100 text-red-700"
                                  }`}
                                >
                                  {barang.status}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      {jenis.barang.length === 0 && (
                        <div className="p-4 text-center text-muted-foreground text-sm">
                          Tidak ada barang pada jenis ini
                        </div>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-6 text-center text-muted-foreground text-sm">
                  Tidak ada data untuk diimport
                </div>
              )}
            </div>
            <div className="flex items-center justify-between gap-2 pt-4">
              <p className="text-xs text-muted-foreground">
                Kode jenis dan barang sudah digenerate. Jika jenis sudah ada, barang baru akan ditambahkan ke jenis tersebut.
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => setShowJenisImportPreviewDialog(false)}
                >
                  Batal
                </Button>
                <Button
                  onClick={handleConfirmImportJenisBarang}
                  disabled={jenisImportPreview.length === 0}
                >
                  Import Semua
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Add/Edit Barang Dialog */}
        <Dialog
          open={showAddBarangDialog}
          onOpenChange={(open) => {
            setShowAddBarangDialog(open);
            // Reset form when closing dialog
            if (!open) {
              setBarangFormData({
                nama_barang: "",
                kode_barang: "",
                no_serial_number: "",
                deskripsi_barang: "",
                status: "Tersedia",
                foto_barang: "",
              });
              setEditingBarang(null);
            }
          }}
        >
          <DialogContent className="max-w-lg max-h-[90vh] flex flex-col">
            <DialogHeader>
              <DialogTitle>
                {editingBarang ? "Edit Barang" : "Tambah Barang"}
              </DialogTitle>
              <DialogDescription>
                Isi detail barang beserta foto (opsional) lalu simpan untuk menambahkan ke inventaris.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 overflow-y-auto pr-4">
              <div>
                <label className="text-sm font-medium">Nama Barang *</label>
                <Input
                  placeholder="Contoh: Router Cisco 2911"
                  value={barangFormData.nama_barang}
                  onChange={(e) =>
                    setBarangFormData({
                      ...barangFormData,
                      nama_barang: e.target.value,
                    })
                  }
                  className="mt-1"
                />
              </div>

              <div>
                <label className="text-sm font-medium">No. Serial</label>
                <Input
                  placeholder="Contoh: CSC-2911-001"
                  value={barangFormData.no_serial_number}
                  onChange={(e) =>
                    setBarangFormData({
                      ...barangFormData,
                      no_serial_number: e.target.value,
                    })
                  }
                  className="mt-1"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Deskripsi</label>
                <textarea
                  placeholder="Deskripsi barang"
                  value={barangFormData.deskripsi_barang}
                  onChange={(e) =>
                    setBarangFormData({
                      ...barangFormData,
                      deskripsi_barang: e.target.value,
                    })
                  }
                  className="w-full p-2 border rounded-md text-sm mt-1"
                  rows={3}
                />
              </div>
              <div>
                <label className="text-sm font-medium">Status</label>
                <select
                  value={barangFormData.status}
                  onChange={(e) =>
                    setBarangFormData({
                      ...barangFormData,
                      status: e.target.value,
                    })
                  }
                  className="w-full p-2 border rounded-md text-sm mt-1"
                >
                  <option value="Tersedia">Tersedia</option>
                  <option value="Dipinjam">Dipinjam</option>
                  <option value="Rusak">Rusak</option>
                  <option value="Hilang">Hilang</option>
                </select>
              </div>
              <div>
                <label className="text-sm font-medium">Foto Barang</label>
                <div className="mt-1">
                  <Tabs defaultValue="upload" className="w-full">
                    <TabsList className="grid w-full grid-cols-2">
                      <TabsTrigger value="upload" className="gap-2">
                        <UploadIcon className="h-4 w-4" />
                        Upload File
                      </TabsTrigger>
                      <TabsTrigger value="capture" className="gap-2">
                        <CameraIcon className="h-4 w-4" />
                        Ambil Foto
                      </TabsTrigger>
                    </TabsList>

                    <TabsContent value="upload" className="space-y-2 mt-3">
                      {barangFormData.foto_barang && (
                        <div className="relative">
                          <img
                            src={getPhotoUrl(barangFormData.foto_barang, API_BASE_URL)}
                            alt="Preview"
                            className="w-full h-32 object-cover rounded-md border"
                          />
                          <Button
                            size="sm"
                            variant="destructive"
                            className="absolute top-1 right-1"
                            onClick={() =>
                              setBarangFormData({
                                ...barangFormData,
                                foto_barang: "",
                              })
                            }
                          >
                            Hapus
                          </Button>
                        </div>
                      )}
                      <div 
                        className={`border-2 border-dashed rounded-md p-8 min-h-[120px] text-center cursor-pointer transition-all duration-200 flex items-center justify-center ${
                          isDragging 
                            ? "bg-primary/10 border-primary border-4 scale-105" 
                            : "hover:bg-muted/50"
                        }`}
                        onDragOver={handleDragOver}
                        onDragEnter={handleDragEnter}
                        onDragLeave={handleDragLeave}
                        onDrop={handleDrop}
                      >
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleFotoUpload}
                          className="hidden"
                          id="foto-barang-input"
                        />
                        <label
                          htmlFor="foto-barang-input"
                          className="cursor-pointer block w-full"
                        >
                          <div className="text-sm font-medium">
                            Klik untuk upload atau drag & drop
                          </div>
                          <div className="text-xs text-muted-foreground mt-1">
                            JPG, PNG, GIF (Max 5MB)
                          </div>
                        </label>
                      </div>
                    </TabsContent>

                    <TabsContent value="capture" className="mt-3">
                      <CameraCapture
                        label="Ambil Foto Barang"
                        enableFlashToggle
                        autoConfirm
                        cropSquare
                        onCapture={(imageData) => {
                          setBarangFormData({
                            ...barangFormData,
                            foto_barang: imageData,
                          });
                        }}
                      />
                    </TabsContent>
                  </Tabs>
                </div>
              </div>
              <div className="flex gap-2 justify-end">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowAddBarangDialog(false);
                    setEditingBarang(null);
                  }}
                >
                  Batal
                </Button>
                <Button onClick={handleAddBarang} disabled={savingBarang}>
                  {savingBarang ? "Menyimpan..." : (editingBarang ? "Update" : "Tambah")}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Jenis QR Preview / Download Dialog */}
        <Dialog
          open={qrDialogOpenForJenis}
          onOpenChange={setQrDialogOpenForJenis}
        >
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>QR Jenis Barang</DialogTitle>
              <DialogDescription>
                Preview QR untuk jenis barang, lalu download jika diperlukan.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 text-center">
              {qrDataUrl ? (
                <img
                  src={qrDataUrl}
                  alt={`QR ${qrJenisKode}`}
                  className="mx-auto rounded-md shadow-md"
                />
              ) : (
                <div className="py-12">Membuat preview QR...</div>
              )}
              <div className="flex gap-2 justify-center">
                <Button
                  variant="outline"
                  onClick={() => setQrDialogOpenForJenis(false)}
                >
                  Tutup
                </Button>
                <Button
                  onClick={() =>
                    handleDownloadJenisQR(qrJenisKode, qrJenisNama)
                  }
                >
                  Download
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Barang Barcode Preview / Download Dialog */}
        <Dialog open={barcodeDialogOpen} onOpenChange={setBarcodeDialogOpen}>
          <DialogContent className="max-w-md scale-150">
            <DialogHeader>
              <DialogTitle>Barcode Barang</DialogTitle>
              <DialogDescription>
                Preview barcode barang, lalu download jika diperlukan.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 text-center">
              {barcodeDataUrl ? (
                <img
                  src={barcodeDataUrl}
                  alt={`Barcode ${barcodeKode}`}
                  className="mx-auto rounded-md shadow-md"
                />
              ) : (
                <div className="py-12">Membuat preview barcode...</div>
              )}
              <div className="flex gap-2 justify-center">
                <Button
                  variant="outline"
                  onClick={() => setBarcodeDialogOpen(false)}
                >
                  Tutup
                </Button>
                <Button
                  onClick={() =>
                    downloadBarcodePNG(barcodeKode, `barcode-${barcodeKode}`)
                  }
                >
                  Download
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* QR Print Dialog */}
        <Dialog open={showQRPrintDialog} onOpenChange={setShowQRPrintDialog}>
          <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <QrCode className="h-5 w-5" />
                Cetak QR Code Jenis Barang
              </DialogTitle>
              <DialogDescription>
                Pilih jenis barang yang ingin dicetak QR code-nya. Maksimal 5 QR per halaman A4.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              {/* Search input */}
              <Input
                placeholder={"Cari jenis barang..."}
                value={qrPrintSearchQuery}
                onChange={(e) => setQRPrintSearchQuery(e.target.value)}
                className="w-full"
              />

              {/* Select all */}
              {(() => {
                const filtered = getFilteredQRForPrint();
                const allSelected = filtered.length > 0 && filtered.every(j => selectedQRForPrint.includes(j.id_jenis_barang));
                const toggleAll = (checked: boolean) => {
                  if (checked) {
                    setSelectedQRForPrint(filtered.map(j => j.id_jenis_barang));
                  } else {
                    setSelectedQRForPrint([]);
                  }
                };
                return (
                  <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="select-all-qr-print"
                        checked={allSelected}
                        onChange={(e) => toggleAll(e.target.checked)}
                        className="h-4 w-4 rounded border-gray-300"
                      />
                      <label htmlFor="select-all-qr-print" className="font-semibold cursor-pointer">
                        Pilih Semua ({filtered.length} jenis)
                      </label>
                    </div>
                    <span className="text-sm text-muted-foreground">
                      {selectedQRForPrint.length} terpilih
                    </span>
                  </div>
                );
              })()}

              {/* QR items list */}
              <div className="space-y-2 max-h-[50vh] overflow-y-auto">
                {getFilteredQRForPrint().map((jenis) => {
                  const selected = selectedQRForPrint.includes(jenis.id_jenis_barang);
                  const itemCount = barangList.filter((b) => b.id_jenis_barang === jenis.id_jenis_barang).length;
                  return (
                    <div
                      key={jenis.id_jenis_barang}
                      className="flex items-center gap-3 p-3 border rounded-lg hover:bg-muted/50 cursor-pointer"
                      onClick={() => {
                        if (selected) {
                          setSelectedQRForPrint(selectedQRForPrint.filter(id => id !== jenis.id_jenis_barang));
                        } else {
                          setSelectedQRForPrint([...selectedQRForPrint, jenis.id_jenis_barang]);
                        }
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={selected}
                        onChange={() => {}}
                        onClick={(e) => e.stopPropagation()}
                        className="h-4 w-4 rounded border-gray-300"
                      />
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <code className="bg-muted px-2 py-1 rounded text-xs font-semibold text-primary">{jenis.kode_jenis_barang}</code>
                          <span className="font-medium">{jenis.nama_jenis_barang}</span>
                        </div>
                      </div>
                      <span className="inline-flex items-center justify-center px-3 py-1 bg-blue-100 text-blue-700 text-xs font-semibold rounded-full">
                        {itemCount} item
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* Action buttons */}
              <div className="flex gap-2 justify-end pt-4 border-t">
                <Button
                  variant="outline"
                  onClick={() => setShowQRPrintDialog(false)}
                >
                  Batal
                </Button>
                <Button
                  onClick={handleQRPrint}
                  disabled={selectedQRForPrint.length === 0}
                  className="gap-2"
                >
                  <Printer className="h-4 w-4" />
                  Cetak {selectedQRForPrint.length} QR Code
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Barcode Print Dialog */}
        <Dialog open={showBarcodePrintDialog} onOpenChange={setShowBarcodePrintDialog}>
          <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Barcode className="h-5 w-5" />
                Cetak Barcode Barang
              </DialogTitle>
              <DialogDescription>
                Pilih barang yang ingin dicetak barcode-nya. 2 kolom per halaman A4.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              {/* Search input */}
              <Input
                placeholder={"Cari barang..."}
                value={barcodePrintSearchQuery}
                onChange={(e) => setBarcodePrintSearchQuery(e.target.value)}
                className="w-full"
              />

              {/* Select all */}
              {(() => {
                const filtered = getFilteredBarcodeForPrint();
                const allSelected = filtered.length > 0 && filtered.every(b => selectedBarcodeForPrint.includes(b.id || b.id_barang));
                const toggleAll = (checked: boolean) => {
                  if (checked) {
                    setSelectedBarcodeForPrint(filtered.map(b => b.id || b.id_barang));
                  } else {
                    setSelectedBarcodeForPrint([]);
                  }
                };
                return (
                  <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="select-all-barcode-print"
                        checked={allSelected}
                        onChange={(e) => toggleAll(e.target.checked)}
                        className="h-4 w-4 rounded border-gray-300"
                      />
                      <label htmlFor="select-all-barcode-print" className="font-semibold cursor-pointer">
                        Pilih Semua ({filtered.length} barang)
                      </label>
                    </div>
                    <span className="text-sm text-muted-foreground">
                      {selectedBarcodeForPrint.length} terpilih
                    </span>
                  </div>
                );
              })()}

              {/* Barcode items list */}
              <div className="space-y-2 max-h-[50vh] overflow-y-auto">
                {getFilteredBarcodeForPrint().map((barang) => {
                  const barangId = barang.id || barang.id_barang;
                  const selected = selectedBarcodeForPrint.includes(barangId);
                  return (
                    <div
                      key={barangId}
                      className="flex items-center gap-3 p-3 border rounded-lg hover:bg-muted/50 cursor-pointer"
                      onClick={() => {
                        if (selected) {
                          setSelectedBarcodeForPrint(selectedBarcodeForPrint.filter(id => id !== barangId));
                        } else {
                          setSelectedBarcodeForPrint([...selectedBarcodeForPrint, barangId]);
                        }
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={selected}
                        onChange={() => {}}
                        onClick={(e) => e.stopPropagation()}
                        className="h-4 w-4 rounded border-gray-300"
                      />
                      {barang.foto_barang && (
                        <img
                          src={getPhotoUrl(barang.foto_barang, API_BASE_URL)}
                          alt={barang.nama_barang}
                          className="w-12 h-12 object-cover rounded"
                        />
                      )}
                      <div className="flex-1">
                        <div className="font-medium">{barang.nama_barang}</div>
                        <div className="text-xs text-muted-foreground font-mono">{barang.kode_barang}</div>
                      </div>
                      <span
                        className={`px-2 py-1 rounded text-xs font-semibold ${
                          barang.status === "Tersedia"
                            ? "bg-green-100 text-green-700"
                            : barang.status === "Dipinjam"
                            ? "bg-yellow-100 text-yellow-700"
                            : "bg-red-100 text-red-700"
                        }`}
                      >
                        {barang.status}
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* Action buttons */}
              <div className="flex gap-2 justify-end pt-4 border-t">
                <Button
                  variant="outline"
                  onClick={() => setShowBarcodePrintDialog(false)}
                >
                  Batal
                </Button>
                <Button
                  onClick={handleBarcodePrint}
                  disabled={selectedBarcodeForPrint.length === 0}
                  className="gap-2"
                >
                  <Printer className="h-4 w-4" />
                  Cetak {selectedBarcodeForPrint.length} Barcode
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Legacy Barcode Selection Dialog for ZIP Download (kept for backward compatibility) */}
        <Dialog open={showBarcodeSelectionDialog} onOpenChange={setShowBarcodeSelectionDialog}>
          <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Pilih Barcode untuk Didownload</DialogTitle>
              <DialogDescription>
                Pilih barang yang ingin didownload barcodenya dalam format ZIP.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="select-all-barcode"
                    checked={jenisForBarcodeDownload ? selectedBarangForDownload.length === getBarangForJenis(jenisForBarcodeDownload).length : false}
                    onChange={toggleSelectAllBarcode}
                    className="h-4 w-4 rounded border-gray-300"
                  />
                  <label htmlFor="select-all-barcode" className="font-semibold cursor-pointer">
                    Pilih Semua ({jenisForBarcodeDownload ? getBarangForJenis(jenisForBarcodeDownload).length : 0} barang)
                  </label>
                </div>
                <span className="text-sm text-muted-foreground">
                  {selectedBarangForDownload.length} terpilih
                </span>
              </div>

              <div className="space-y-2 max-h-[50vh] overflow-y-auto">
                {jenisForBarcodeDownload && getBarangForJenis(jenisForBarcodeDownload).map((barang) => (
                  <div
                    key={barang.id || barang.id_barang}
                    className="flex items-center gap-3 p-3 border rounded-lg hover:bg-muted/50 cursor-pointer"
                    onClick={() => toggleBarangSelection(barang.id || barang.id_barang)}
                  >
                    <input
                      type="checkbox"
                      checked={selectedBarangForDownload.includes(barang.id || barang.id_barang)}
                      onChange={() => toggleBarangSelection(barang.id || barang.id_barang)}
                      onClick={(e) => e.stopPropagation()}
                      className="h-4 w-4 rounded border-gray-300"
                    />
                    {barang.foto_barang && (
                      <img
                        src={getPhotoUrl(barang.foto_barang, API_BASE_URL)}
                        alt={barang.nama_barang}
                        className="w-12 h-12 object-cover rounded"
                      />
                    )}
                    <div className="flex-1">
                      <div className="font-medium">{barang.nama_barang}</div>
                      <div className="text-xs text-muted-foreground font-mono">
                        {barang.kode_barang}
                      </div>
                    </div>
                    <span
                      className={`px-2 py-1 rounded text-xs font-semibold ${
                        barang.status === "Tersedia"
                          ? "bg-green-100 text-green-700"
                          : barang.status === "Dipinjam"
                          ? "bg-yellow-100 text-yellow-700"
                          : "bg-red-100 text-red-700"
                      }`}
                    >
                      {barang.status}
                    </span>
                  </div>
                ))}
              </div>

              <div className="flex gap-2 justify-end pt-4 border-t">
                <Button
                  variant="outline"
                  onClick={() => setShowBarcodeSelectionDialog(false)}
                >
                  Batal
                </Button>
                <Button
                  variant="secondary"
                  onClick={printSelectedBarcodes}
                  disabled={selectedBarangForDownload.length === 0}
                  className="gap-2"
                >
                  <Printer className="h-4 w-4" />
                  Cetak {selectedBarangForDownload.length} Barcode
                </Button>
                <Button
                  onClick={downloadSelectedBarcodes}
                  disabled={selectedBarangForDownload.length === 0}
                  className="gap-2"
                >
                  <Download className="h-4 w-4" />
                  Download {selectedBarangForDownload.length} Barcode
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Legacy QR Jenis Selection Dialog for ZIP Download */}
        <Dialog open={showQRSelectionDialog} onOpenChange={setShowQRSelectionDialog}>
          <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Pilih QR Jenis Barang untuk Didownload</DialogTitle>
              <DialogDescription>
                Pilih jenis barang yang ingin didownload QR-nya dalam format ZIP.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="select-all-qr-jenis"
                    checked={selectedJenisForDownload.length === jenisBarangList.length}
                    onChange={toggleSelectAllQRJenis}
                    className="h-4 w-4 rounded border-gray-300"
                  />
                  <label htmlFor="select-all-qr-jenis" className="font-semibold cursor-pointer">
                    Pilih Semua ({jenisBarangList.length} jenis barang)
                  </label>
                </div>
                <span className="text-sm text-muted-foreground">
                  {selectedJenisForDownload.length} terpilih
                </span>
              </div>

              <div className="space-y-2 max-h-[50vh] overflow-y-auto">
                {jenisBarangList.map((jenis) => {
                  const itemCount = barangList.filter(
                    (b) => b.id_jenis_barang === jenis.id_jenis_barang
                  ).length;
                  
                  return (
                    <div
                      key={jenis.id_jenis_barang}
                      className="flex items-center gap-3 p-3 border rounded-lg hover:bg-muted/50 cursor-pointer"
                      onClick={() => toggleJenisSelection(jenis.id_jenis_barang)}
                    >
                      <input
                        type="checkbox"
                        checked={selectedJenisForDownload.includes(jenis.id_jenis_barang)}
                        onChange={() => toggleJenisSelection(jenis.id_jenis_barang)}
                        onClick={(e) => e.stopPropagation()}
                        className="h-4 w-4 rounded border-gray-300"
                      />
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <code className="bg-muted px-2 py-1 rounded text-xs font-semibold text-primary">
                            {jenis.kode_jenis_barang}
                          </code>
                          <span className="font-medium">{jenis.nama_jenis_barang}</span>
                        </div>
                        {jenis.deskripsi_jenis_barang && (
                          <div className="text-xs text-muted-foreground mt-1">
                            {jenis.deskripsi_jenis_barang}
                          </div>
                        )}
                      </div>
                      <span className="inline-flex items-center justify-center px-3 py-1 bg-blue-100 text-blue-700 text-xs font-semibold rounded-full">
                        {itemCount} item
                      </span>
                    </div>
                  );
                })}
              </div>

              <div className="flex gap-2 justify-end pt-4 border-t">
                <Button
                  variant="outline"
                  onClick={() => setShowQRSelectionDialog(false)}
                >
                  Batal
                </Button>
                <Button
                  variant="secondary"
                  onClick={printSelectedQRJenis}
                  disabled={selectedJenisForDownload.length === 0}
                  className="gap-2"
                >
                  <Printer className="h-4 w-4" />
                  Cetak {selectedJenisForDownload.length} QR Code
                </Button>
                <Button
                  onClick={downloadSelectedQRJenis}
                  disabled={selectedJenisForDownload.length === 0}
                  className="gap-2"
                >
                  <Download className="h-4 w-4" />
                  Download {selectedJenisForDownload.length} QR Code
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Bulk Delete Jenis Dialog */}
        <AlertDialog open={showBulkDeleteJenisDialog} onOpenChange={setShowBulkDeleteJenisDialog}>
          <AlertDialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
            <AlertDialogHeader>
              <AlertDialogTitle>Hapus Semua Jenis Barang</AlertDialogTitle>
              <AlertDialogDescription>
                Pilih jenis barang yang ingin dihapus. Semua barang dalam jenis tersebut juga akan ikut terhapus.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="space-y-4 py-4">
              <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="select-all-delete-jenis"
                    checked={selectedJenisForDelete.length === jenisBarangList.length && jenisBarangList.length > 0}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedJenisForDelete(jenisBarangList.map(j => j.id_jenis_barang));
                      } else {
                        setSelectedJenisForDelete([]);
                      }
                    }}
                    className="h-4 w-4 rounded border-gray-300"
                  />
                  <label htmlFor="select-all-delete-jenis" className="font-semibold cursor-pointer">
                    Pilih Semua ({jenisBarangList.length} jenis barang)
                  </label>
                </div>
                <span className="text-sm text-muted-foreground">
                  {selectedJenisForDelete.length} terpilih
                </span>
              </div>

              <div className="space-y-2 max-h-[50vh] overflow-y-auto">
                {jenisBarangList.map((jenis) => {
                  const itemCount = barangList.filter(
                    (b) => b.id_jenis_barang === jenis.id_jenis_barang
                  ).length;
                  const isSelected = selectedJenisForDelete.includes(jenis.id_jenis_barang);
                  
                  return (
                    <div
                      key={jenis.id_jenis_barang}
                      className={`flex items-center gap-3 p-3 border rounded-lg hover:bg-muted/50 cursor-pointer transition-colors ${
                        isSelected ? 'bg-destructive/10 border-destructive' : ''
                      }`}
                      onClick={() => {
                        if (isSelected) {
                          setSelectedJenisForDelete(selectedJenisForDelete.filter(id => id !== jenis.id_jenis_barang));
                        } else {
                          setSelectedJenisForDelete([...selectedJenisForDelete, jenis.id_jenis_barang]);
                        }
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => {}}
                        onClick={(e) => e.stopPropagation()}
                        className="h-4 w-4 rounded border-gray-300"
                      />
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <code className="bg-muted px-2 py-1 rounded text-xs font-semibold text-primary">
                            {jenis.kode_jenis_barang}
                          </code>
                          <span className="font-medium">{jenis.nama_jenis_barang}</span>
                        </div>
                        {jenis.deskripsi_jenis_barang && (
                          <div className="text-xs text-muted-foreground mt-1">
                            {jenis.deskripsi_jenis_barang}
                          </div>
                        )}
                      </div>
                      <span className="inline-flex items-center justify-center px-3 py-1 bg-blue-100 text-blue-700 text-xs font-semibold rounded-full">
                        {itemCount} item
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
            <AlertDialogFooter>
              <AlertDialogCancel>Batal</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleBulkDeleteJenis}
                disabled={selectedJenisForDelete.length === 0}
                className="bg-destructive hover:bg-destructive/90"
              >
                Hapus {selectedJenisForDelete.length} Jenis
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Bulk Delete Barang Dialog */}
        <AlertDialog open={showBulkDeleteBarangDialog} onOpenChange={setShowBulkDeleteBarangDialog}>
          <AlertDialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
            <AlertDialogHeader>
              <AlertDialogTitle>Hapus Semua Barang</AlertDialogTitle>
              <AlertDialogDescription>
                Pilih barang yang ingin dihapus dari jenis {getJenisName(selectedJenisId || 0)}.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="space-y-4 py-4">
              {selectedJenisId && (() => {
                const barangForJenis = getBarangForJenis(selectedJenisId);
                return (
                  <>
                    <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          id="select-all-delete-barang"
                          checked={selectedBarangForDelete.length === barangForJenis.length && barangForJenis.length > 0}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedBarangForDelete(barangForJenis.map(b => b.id_barang || b.id));
                            } else {
                              setSelectedBarangForDelete([]);
                            }
                          }}
                          className="h-4 w-4 rounded border-gray-300"
                        />
                        <label htmlFor="select-all-delete-barang" className="font-semibold cursor-pointer">
                          Pilih Semua ({barangForJenis.length} barang)
                        </label>
                      </div>
                      <span className="text-sm text-muted-foreground">
                        {selectedBarangForDelete.length} terpilih
                      </span>
                    </div>

                    <div className="space-y-2 max-h-[50vh] overflow-y-auto">
                      {barangForJenis.map((barang) => {
                        const barangId = barang.id_barang || barang.id;
                        const isSelected = selectedBarangForDelete.includes(barangId);
                        
                        return (
                          <div
                            key={barangId}
                            className={`flex items-center gap-3 p-3 border rounded-lg hover:bg-muted/50 cursor-pointer transition-colors ${
                              isSelected ? 'bg-destructive/10 border-destructive' : ''
                            }`}
                            onClick={() => {
                              if (isSelected) {
                                setSelectedBarangForDelete(selectedBarangForDelete.filter(id => id !== barangId));
                              } else {
                                setSelectedBarangForDelete([...selectedBarangForDelete, barangId]);
                              }
                            }}
                          >
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => {}}
                              onClick={(e) => e.stopPropagation()}
                              className="h-4 w-4 rounded border-gray-300"
                            />
                            {barang.foto_barang && (
                              <img
                                src={getPhotoUrl(barang.foto_barang, API_BASE_URL)}
                                alt={barang.nama_barang}
                                className="w-12 h-12 object-cover rounded"
                              />
                            )}
                            <div className="flex-1">
                              <div className="font-medium">{barang.nama_barang}</div>
                              <div className="text-xs text-muted-foreground">
                                {barang.kode_barang}
                                {barang.no_serial_number && ` • SN: ${barang.no_serial_number}`}
                              </div>
                            </div>
                            <span
                              className={`inline-flex items-center justify-center px-3 py-1 text-xs font-semibold rounded-full ${
                                barang.status === "Tersedia"
                                  ? "bg-green-100 text-green-700"
                                  : barang.status === "Dipinjam"
                                  ? "bg-yellow-100 text-yellow-700"
                                  : "bg-red-100 text-red-700"
                              }`}
                            >
                              {barang.status}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </>
                );
              })()}
            </div>
            <AlertDialogFooter>
              <AlertDialogCancel>Batal</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleBulkDeleteBarang}
                disabled={selectedBarangForDelete.length === 0}
                className="bg-destructive hover:bg-destructive/90"
              >
                Hapus {selectedBarangForDelete.length} Barang
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </AdminLayout>
  );
};

export default Items;
