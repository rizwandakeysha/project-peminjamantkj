import { useState } from "react";
import AdminLayout from "@/layouts/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Package, Edit2, Trash2, Eye, Plus, QrCode, Barcode } from "lucide-react";
import { mockJenisBarang, mockBarang } from "@/lib/mockData";
import { createSimpleLabelDataURL, downloadSimpleLabelPNG } from "@/lib/qrUtils";
import { createBarcodeDataURL, downloadBarcodePNG } from "@/lib/barcodeUtils";
import { toast } from "react-hot-toast";

const Items = () => {
  const [jenisBarangList, setJenisBarangList] = useState(mockJenisBarang);
  const [barangList, setBarangList] = useState(mockBarang);
  
  // Dialog states
  const [selectedJenisId, setSelectedJenisId] = useState<number | null>(null);
  const [showBarangDialog, setShowBarangDialog] = useState(false);
  const [showAddJenisDialog, setShowAddJenisDialog] = useState(false);
  const [showAddBarangDialog, setShowAddBarangDialog] = useState(false);
  const [editingBarang, setEditingBarang] = useState<any | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ type: 'jenis' | 'barang'; id: number } | null>(null);
  const [qrDialogOpenForJenis, setQrDialogOpenForJenis] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [qrLabelName, setQrLabelName] = useState<string>("");
  const [qrJenisKode, setQrJenisKode] = useState<string>("");
  const [qrJenisNama, setQrJenisNama] = useState<string>("");
  // barcode dialog states for barang
  const [barcodeDialogOpen, setBarcodeDialogOpen] = useState(false);
  const [barcodeDataUrl, setBarcodeDataUrl] = useState<string | null>(null);
  const [barcodeKode, setBarcodeKode] = useState<string>("");
  const [barcodeNama, setBarcodeNama] = useState<string>("");
  
  // Form states
  const [jenisFormData, setJenisFormData] = useState({
    nama_jenis_barang: '',
    deskripsi_jenis_barang: '',
  });

  const [barangFormData, setBarangFormData] = useState({
    nama_barang: '',
    kode_barang: '',
    no_serial_number: '',
    deskripsi_barang: '',
    status: 'Tersedia',
    foto_barang: '',
  });

  // Get barang for selected jenis
  const getBarangForJenis = (jenisId: number) => {
    return barangList.filter(b => b.id_jenis_barang === jenisId);
  };

  // Get jenis name
  const getJenisName = (jenisId: number) => {
    return jenisBarangList.find(j => j.id_jenis_barang === jenisId)?.nama_jenis_barang || '';
  };

  // ===== JENIS BARANG HANDLERS =====
  const handleEditJenis = (jenis: any) => {
    setJenisFormData({
      nama_jenis_barang: jenis.nama_jenis_barang,
      deskripsi_jenis_barang: jenis.deskripsi_jenis_barang || '',
    });
    setSelectedJenisId(jenis.id_jenis_barang);
    setShowAddJenisDialog(true);
  };

  const handleSaveJenis = () => {
    if (!jenisFormData.nama_jenis_barang.trim()) {
      toast.error("Nama jenis barang tidak boleh kosong");
      return;
    }

    if (selectedJenisId) {
      // Update
      setJenisBarangList(
        jenisBarangList.map(j =>
          j.id_jenis_barang === selectedJenisId
            ? { ...j, ...jenisFormData }
            : j
        )
      );
      toast.success("Jenis barang berhasil diupdate!");
    } else {
      // Create
      const newJenis = {
        id_jenis_barang: Math.max(...jenisBarangList.map(j => j.id_jenis_barang), 0) + 1,
        kode_jenis_barang: `TKJ-${Date.now().toString().slice(-4)}`,
        nama_jenis_barang: jenisFormData.nama_jenis_barang,
        deskripsi_jenis_barang: jenisFormData.deskripsi_jenis_barang,
        created_at: new Date().toISOString(),
      };
      setJenisBarangList([...jenisBarangList, newJenis]);
      toast.success("Jenis barang berhasil ditambahkan!");
    }

    setShowAddJenisDialog(false);
    setJenisFormData({ nama_jenis_barang: '', deskripsi_jenis_barang: '' });
    setSelectedJenisId(null);
  };

  const handleDeleteJenis = (jenisId: number) => {
    setJenisBarangList(jenisBarangList.filter(j => j.id_jenis_barang !== jenisId));
    setBarangList(barangList.filter(b => b.id_jenis_barang !== jenisId));
    toast.success("Jenis barang berhasil dihapus!");
    setDeleteTarget(null);
  };

  // ===== BARANG HANDLERS =====
  const handleAddBarang = () => {
    if (!barangFormData.nama_barang.trim() || !barangFormData.kode_barang.trim()) {
      toast.error("Nama dan kode barang tidak boleh kosong");
      return;
    }

    if (editingBarang) {
      // Update barang
      setBarangList(
        barangList.map(b =>
          b.id_barang === editingBarang.id_barang
            ? { ...b, ...barangFormData }
            : b
        )
      );
      toast.success("Barang berhasil diupdate!");
    } else {
      // Create barang
      const newBarang = {
        id_barang: Math.max(...barangList.map(b => b.id_barang), 0) + 1,
        id_jenis_barang: selectedJenisId || 1,
        kode_barang: barangFormData.kode_barang,
        nama_barang: barangFormData.nama_barang,
        no_serial_number: barangFormData.no_serial_number,
        deskripsi_barang: barangFormData.deskripsi_barang,
        status: barangFormData.status,
        foto_barang: barangFormData.foto_barang || 'https://images.unsplash.com/photo-1581092160562-40aa08e78837?w=400',
        created_at: new Date().toISOString(),
      };
      setBarangList([...barangList, newBarang]);
      toast.success("Barang berhasil ditambahkan!");
    }

    setShowAddBarangDialog(false);
    setBarangFormData({
      nama_barang: '',
      kode_barang: '',
      no_serial_number: '',
      deskripsi_barang: '',
      status: 'Tersedia',
      foto_barang: '',
    });
    setEditingBarang(null);
  };

  // ===== JENIS QR HANDLERS =====
  const handleShowJenisQR = async (kode: string, nama: string) => {
    try {
      // small label preview
      const dataUrl = await createSimpleLabelDataURL(kode, nama, { width: 720, height: 920 });
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
    setBarangFormData({
      nama_barang: barang.nama_barang,
      kode_barang: barang.kode_barang,
      no_serial_number: barang.no_serial_number || '',
      deskripsi_barang: barang.deskripsi_barang || '',
      status: barang.status,
      foto_barang: barang.foto_barang || '',
    });
    setEditingBarang(barang);
    setShowAddBarangDialog(true);
  };

  const handleDeleteBarang = (barangId: number) => {
    setBarangList(barangList.filter(b => b.id_barang !== barangId));
    toast.success("Barang berhasil dihapus!");
    setDeleteTarget(null);
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
          <Dialog open={showAddJenisDialog} onOpenChange={setShowAddJenisDialog}>
            <DialogTrigger asChild>
              <Button
                onClick={() => {
                  setSelectedJenisId(null);
                  setJenisFormData({ nama_jenis_barang: '', deskripsi_jenis_barang: '' });
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
                  {selectedJenisId ? "Edit Jenis Barang" : "Tambah Jenis Barang"}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium">Nama Jenis Barang</label>
                  <Input
                    placeholder="Contoh: Peralatan Networking"
                    value={jenisFormData.nama_jenis_barang}
                    onChange={(e) =>
                      setJenisFormData({ ...jenisFormData, nama_jenis_barang: e.target.value })
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
                      setJenisFormData({ ...jenisFormData, deskripsi_jenis_barang: e.target.value })
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
                    <th className="text-center p-3 font-semibold">Jumlah Item</th>
                    <th className="text-center p-3 font-semibold">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {jenisBarangList.map((jenis) => {
                    const itemCount = getBarangForJenis(jenis.id_jenis_barang).length;
                    return (
                      <tr key={jenis.id_jenis_barang} className="hover:bg-muted/50">
                        <td className="p-3 font-mono text-xs font-semibold text-primary">
                          <div className="flex items-center gap-2">
                            <code className="bg-muted px-2 py-1 rounded">{jenis.kode_jenis_barang}</code>
                            <div className="flex items-center gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleShowJenisQR(jenis.kode_jenis_barang, jenis.nama_jenis_barang)}
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
                        <td className="p-3 font-medium">{jenis.nama_jenis_barang}</td>
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
                            <Dialog open={showBarangDialog && selectedJenisId === jenis.id_jenis_barang} onOpenChange={setShowBarangDialog}>
                              <DialogTrigger asChild>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => setSelectedJenisId(jenis.id_jenis_barang)}
                                  className="gap-2"
                                >
                                  <Eye className="h-4 w-4" />
                                  Tampilkan Barang
                                </Button>
                              </DialogTrigger>
                              <DialogContent className="max-w-5xl max-h-[85vh] overflow-y-auto">
                                <DialogHeader className="flex flex-row items-center justify-between">
                                  <DialogTitle>
                                    Barang - {getJenisName(selectedJenisId || 0)}
                                  </DialogTitle>
                                  <Button
                                    size="sm"
                                    onClick={() => {
                                      setBarangFormData({
                                        nama_barang: '',
                                        kode_barang: '',
                                        no_serial_number: '',
                                        deskripsi_barang: '',
                                        status: 'Tersedia',
                                        foto_barang: '',
                                      });
                                      setEditingBarang(null);
                                      setShowAddBarangDialog(true);
                                    }}
                                    className="gap-2"
                                  >
                                    <Plus className="h-4 w-4" />
                                    Tambah Barang
                                  </Button>
                                </DialogHeader>
                                <div className="space-y-4">
                                  {getBarangForJenis(selectedJenisId || 0).length > 0 ? (
                                    <div className="space-y-3">
                                      {getBarangForJenis(selectedJenisId || 0).map((barang) => (
                                        <div
                                          key={barang.id_barang}
                                          className="border rounded-lg p-4 hover:shadow-md transition-shadow flex gap-4"
                                        >
                                          {barang.foto_barang && (
                                            <img
                                              src={barang.foto_barang}
                                              alt={barang.nama_barang}
                                              className="w-24 h-24 object-cover rounded flex-shrink-0"
                                            />
                                          )}
                                          <div className="flex-1">
                                            <div className="flex items-start justify-between gap-4">
                                              <div>
                                                <h4 className="font-semibold text-base">{barang.nama_barang}</h4>
                                                <p className="text-xs text-muted-foreground font-mono">
                                                  {barang.kode_barang}
                                                </p>
                                                <p className="text-sm mt-1">{barang.deskripsi_barang}</p>
                                                {barang.no_serial_number && (
                                                  <p className="text-xs text-muted-foreground mt-1">
                                                    SN: {barang.no_serial_number}
                                                  </p>
                                                )}
                                                <div className="flex items-center gap-2 mt-2">
                                                  <span className={`px-2 py-1 rounded text-xs font-semibold ${
                                                    barang.status === 'Tersedia'
                                                      ? 'bg-green-100 text-green-700'
                                                      : barang.status === 'Dipinjam'
                                                      ? 'bg-yellow-100 text-yellow-700'
                                                      : 'bg-red-100 text-red-700'
                                                  }`}>
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
                                                    setShowAddBarangDialog(true);
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
                                                      const dataUrl = await createBarcodeDataURL(barang.kode_barang, { width: 960, height: 300 });
                                                      setBarcodeDataUrl(dataUrl);
                                                      setBarcodeKode(barang.kode_barang);
                                                      setBarcodeNama(barang.nama_barang);
                                                      setBarcodeDialogOpen(true);
                                                    } catch (err) {
                                                      console.error("Gagal membuat barcode:", err);
                                                      toast.error("Gagal membuat barcode");
                                                    }
                                                  }}
                                                  className="gap-1"
                                                >
                                                  <Barcode className="h-4 w-4" />
                                                  Barcode
                                                </Button>
                                                <AlertDialog open={deleteTarget?.type === 'barang' && deleteTarget?.id === barang.id_barang} onOpenChange={(open) => {
                                                  if (!open) setDeleteTarget(null);
                                                }}>
                                                  <Button
                                                    variant="destructive"
                                                    size="sm"
                                                    onClick={() => setDeleteTarget({ type: 'barang', id: barang.id_barang })}
                                                    className="gap-1"
                                                  >
                                                    <Trash2 className="h-4 w-4" />
                                                    Hapus
                                                  </Button>
                                                  <AlertDialogContent>
                                                    <AlertDialogHeader>
                                                      <AlertDialogTitle>Hapus Barang?</AlertDialogTitle>
                                                      <AlertDialogDescription>
                                                        Apakah Anda yakin ingin menghapus "{barang.nama_barang}"? Tindakan ini tidak bisa dibatalkan.
                                                      </AlertDialogDescription>
                                                    </AlertDialogHeader>
                                                    <div className="flex gap-2 justify-end">
                                                      <AlertDialogCancel onClick={() => setDeleteTarget(null)}>
                                                        Batal
                                                      </AlertDialogCancel>
                                                      <AlertDialogAction
                                                        onClick={() => handleDeleteBarang(barang.id_barang)}
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

                            <AlertDialog open={deleteTarget?.type === 'jenis' && deleteTarget?.id === jenis.id_jenis_barang} onOpenChange={(open) => {
                              if (!open) setDeleteTarget(null);
                            }}>
                              <Button
                                variant="destructive"
                                size="sm"
                                onClick={() => setDeleteTarget({ type: 'jenis', id: jenis.id_jenis_barang })}
                                className="gap-2"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Hapus Jenis Barang?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Menghapus jenis barang akan menghapus semua barang di dalamnya. Tindakan ini tidak bisa dibatalkan.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <div className="flex gap-2 justify-end">
                                  <AlertDialogCancel onClick={() => setDeleteTarget(null)}>
                                    Batal
                                  </AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => handleDeleteJenis(jenis.id_jenis_barang)}
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

        {/* Add/Edit Barang Dialog */}
        <Dialog open={showAddBarangDialog} onOpenChange={setShowAddBarangDialog}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>
                {editingBarang ? "Edit Barang" : "Tambah Barang"}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Nama Barang *</label>
                <Input
                  placeholder="Contoh: Router Cisco 2911"
                  value={barangFormData.nama_barang}
                  onChange={(e) =>
                    setBarangFormData({ ...barangFormData, nama_barang: e.target.value })
                  }
                  className="mt-1"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Kode Barang *</label>
                <Input
                  placeholder="Contoh: BRG-001"
                  value={barangFormData.kode_barang}
                  onChange={(e) =>
                    setBarangFormData({ ...barangFormData, kode_barang: e.target.value })
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
                    setBarangFormData({ ...barangFormData, no_serial_number: e.target.value })
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
                    setBarangFormData({ ...barangFormData, deskripsi_barang: e.target.value })
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
                    setBarangFormData({ ...barangFormData, status: e.target.value })
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
                <label className="text-sm font-medium">URL Foto</label>
                <Input
                  placeholder="https://..."
                  value={barangFormData.foto_barang}
                  onChange={(e) =>
                    setBarangFormData({ ...barangFormData, foto_barang: e.target.value })
                  }
                  className="mt-1"
                />
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
                <Button onClick={handleAddBarang}>
                  {editingBarang ? "Update" : "Tambah"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Jenis QR Preview / Download Dialog */}
        <Dialog open={qrDialogOpenForJenis} onOpenChange={setQrDialogOpenForJenis}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>QR Jenis Barang</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 text-center">
              {qrDataUrl ? (
                <img src={qrDataUrl} alt={`QR ${qrJenisKode}`} className="mx-auto rounded-md shadow-md" />
              ) : (
                <div className="py-12">Membuat preview QR...</div>
              )}
              <div className="flex gap-2 justify-center">
                <Button variant="outline" onClick={() => setQrDialogOpenForJenis(false)}>Tutup</Button>
                <Button onClick={() => handleDownloadJenisQR(qrJenisKode, qrJenisNama)}>Download</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Barang Barcode Preview / Download Dialog */}
        <Dialog open={barcodeDialogOpen} onOpenChange={setBarcodeDialogOpen}>
          <DialogContent className="max-w-md scale-150">
            <DialogHeader>
              <DialogTitle>Barcode Barang</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 text-center">
              {barcodeDataUrl ? (
                <img src={barcodeDataUrl} alt={`Barcode ${barcodeKode}`} className="mx-auto rounded-md shadow-md" />
              ) : (
                <div className="py-12">Membuat preview barcode...</div>
              )}
              <div className="flex gap-2 justify-center">
                <Button variant="outline" onClick={() => setBarcodeDialogOpen(false)}>Tutup</Button>
                <Button onClick={() => downloadBarcodePNG(barcodeKode, `barcode-${barcodeKode}`)}>Download</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

      </div>
    </AdminLayout>
  );
};

export default Items;