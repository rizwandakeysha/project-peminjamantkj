import { useState, useEffect } from "react";
import AdminLayout from "@/layouts/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
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
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Plus,
  Edit,
  Trash2,
  Download,
  QrCode,
  Search,
  Package,
} from "lucide-react";
import { Item } from "@/types";
import { exportItemLabelPNG } from "@/lib/qrUtils";
import { createLabelDataURL, downloadLabelPNG } from "@/lib/labelRenderer";
import { toast } from "react-hot-toast";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { barangAPI, uploadAPI } from "@/lib/api";

const Items = () => {
  const [items, setItems] = useState<Item[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Item | null>(null);
  const [qrCodeData, setQrCodeData] = useState<string>("");
  const [qrDialogOpen, setQrDialogOpen] = useState(false);
  const [currentQrCode, setCurrentQrCode] = useState("");
  const [currentItemName, setCurrentItemName] = useState("");
  const [loading, setLoading] = useState(true);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<number | null>(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    const fetchItems = async () => {
      try {
        setLoading(true);
        const data = await barangAPI.getAll();
        setItems(data);
      } catch (error) {
        console.error("Error fetching items:", error);
        toast.error("Gagal memuat data barang");
      } finally {
        setLoading(false);
      }
    };

    fetchItems();
  }, []);

  const filteredItems = items.filter(
    (item) =>
      item.nama_barang.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.kode_barang.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleAddItem = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    // Generate kode_barang in format TKJ-XXXX where XXXX is a 4-char
    // abbreviation derived from the item name. Ensure uniqueness by
    // appending a numeric suffix if needed.
    const name = String(formData.get("nama") || "").trim();

    const sanitize = (s: string) => s.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();

    const makeAbbrev = (raw: string) => {
      if (!raw) return "XXXX";
      const words = raw
        .split(/[^a-zA-Z0-9]+/)
        .map((w) => w.trim())
        .filter(Boolean);

      let abbrev = "";
      // take first letters of up to 4 words
      if (words.length > 0) {
        for (let i = 0; i < Math.min(4, words.length); i++) {
          abbrev += words[i][0] || "";
        }
      }

      // if still less than 4 chars, append letters from the sanitized name
      const pool = sanitize(raw);
      let idx = 0;
      while (abbrev.length < 4 && idx < pool.length) {
        const ch = pool[idx];
        if (!abbrev.includes(ch)) abbrev += ch;
        idx++;
      }

      // ensure exactly 4 chars
      abbrev = (abbrev + "XXXX").slice(0, 4);
      return abbrev;
    };

    const base = makeAbbrev(name);
    const existing = new Set(items.map((it) => it.kode_barang));
    let newCode = `TKJ-${base}`;
    let suffix = 1;
    while (existing.has(newCode)) {
      newCode = `TKJ-${base}-${suffix}`;
      suffix++;
    }

    try {
      setUploading(true);

      // Upload image if provided
      let fotoUrl: string | undefined = undefined;
      const fotoFile = (formData.get("foto") as File) || null;
      if (fotoFile && fotoFile.size > 0) {
        fotoUrl = await uploadAPI.uploadImage(fotoFile);
      }

      const newItem = await barangAPI.create({
        kode_barang: newCode,
        nama_barang: formData.get("nama") as string,
        jumlah_stok: parseInt(formData.get("stok") as string),
        jumlah_dipinjam: 0,
        foto_barang: fotoUrl,
        notes: (formData.get("notes") as string) || undefined,
      });

      setItems([...items, newItem]);
      setIsAddDialogOpen(false);

    // Generate and show composed label (quick preview)
    const labelData = await createLabelDataURL(newCode, newItem.nama_barang);
    setQrCodeData(labelData);
    setCurrentQrCode(newCode);
    setCurrentItemName(newItem.nama_barang);
    setQrDialogOpen(true);

      toast.success("Barang berhasil ditambahkan!");
    } catch (error) {
      console.error("Error creating item:", error);
      toast.error("Gagal menambahkan barang");
    } finally {
      setUploading(false);
    }
  };

  const handleEditItem = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editingItem) return;

    const formData = new FormData(e.currentTarget);

    try {
      setUploading(true);

      // Upload new image if provided, otherwise keep existing
      let fotoUrl: string | undefined = editingItem.foto_barang;
      const fotoFile = (formData.get("foto") as File) || null;
      if (fotoFile && fotoFile.size > 0) {
        fotoUrl = await uploadAPI.uploadImage(fotoFile);
      }

      await barangAPI.update(editingItem.id, {
        nama_barang: formData.get("nama") as string,
        jumlah_stok: parseInt(formData.get("stok") as string),
        foto_barang: fotoUrl,
        notes: (formData.get("notes") as string) || undefined,
      });

      // Refresh items from server
      const updatedItems = await barangAPI.getAll();
      setItems(updatedItems);
      setIsEditDialogOpen(false);
      setEditingItem(null);
      toast.success("Barang berhasil diupdate!");
    } catch (error) {
      console.error("Error updating item:", error);
      toast.error("Gagal mengupdate barang");
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteItem = async () => {
    if (!itemToDelete) return;
    try {
      await barangAPI.delete(itemToDelete);
      setItems(items.filter((item) => item.id !== itemToDelete));
      setDeleteDialogOpen(false);
      setItemToDelete(null);
      toast.success("Barang berhasil dihapus!");
    } catch (error) {
      console.error("Error deleting item:", error);
      toast.error("Gagal menghapus barang");
    }
  };

  const handleShowQR = async (kodeBarang: string, namaBarang?: string) => {
    const label = await createLabelDataURL(kodeBarang, namaBarang || kodeBarang);
    setQrCodeData(label);
    setCurrentQrCode(kodeBarang);
    if (namaBarang) setCurrentItemName(namaBarang);
    setQrDialogOpen(true);
  };

  const handleDownloadQR = async () => {
    try {
      // download a simple composed label PNG (fast)
      await downloadLabelPNG(currentQrCode, currentItemName || currentQrCode, currentQrCode);
      toast.success("Label berhasil diunduh!");
    } catch (err) {
      console.error("Failed to download label:", err);
      toast.error("Gagal menyiapkan file. Coba lagi.");
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold mb-2">Kelola Barang</h2>
            <p className="text-muted-foreground">
              Tambah, edit, atau hapus data barang Unit TKJ
            </p>
          </div>
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button size="lg" className="shadow-md">
                <Plus className="h-5 w-5 mr-2" />
                Tambah Barang
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Tambah Barang Baru</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleAddItem} className="space-y-4">
                <div>
                  <Label htmlFor="add-nama">Nama Barang *</Label>
                  <Input id="add-nama" name="nama" required />
                </div>
                <div>
                  <Label htmlFor="add-stok">Jumlah Stok *</Label>
                  <Input
                    id="add-stok"
                    name="stok"
                    type="number"
                    min="1"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="add-foto">Foto Barang</Label>
                  <Input
                    id="add-foto"
                    name="foto"
                    type="file"
                    accept="image/*"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Format: JPG, PNG, GIF, WebP (maks 5MB)
                  </p>
                </div>
                <div>
                  <Label htmlFor="add-notes">Catatan</Label>
                  <Textarea
                    id="add-notes"
                    name="notes"
                    placeholder="Keterangan tambahan..."
                  />
                </div>
                <Alert>
                  <AlertDescription className="text-xs">
                    Kode barang dan QR Code akan dibuat otomatis setelah barang
                    ditambahkan
                  </AlertDescription>
                </Alert>
                <Button type="submit" className="w-full" disabled={uploading}>
                  {uploading ? "Menyimpan..." : "Tambah Barang"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Search */}
        <Card>
          <CardContent className="pt-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Cari barang..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </CardContent>
        </Card>

        {/* Table */}
        <Card>
          <CardHeader>
            <CardTitle>Daftar Barang ({filteredItems.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>No</TableHead>
                    <TableHead>Foto</TableHead>
                    <TableHead>Nama Barang</TableHead>
                    <TableHead>Kode</TableHead>
                    <TableHead>Stok</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Notes</TableHead>
                    <TableHead className="text-right">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredItems.map((item, index) => {
                    const available = item.jumlah_stok - item.jumlah_dipinjam;
                    return (
                      <TableRow key={item.id}>
                        <TableCell>{index + 1}</TableCell>
                        <TableCell>
                          {item.foto_barang ? (
                            <img
                              src={item.foto_barang}
                              alt={item.nama_barang}
                              className="w-12 h-12 object-cover rounded"
                            />
                          ) : (
                            <div className="w-12 h-12 bg-muted rounded flex items-center justify-center">
                              <Package className="h-6 w-6 text-muted-foreground" />
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="font-medium">
                          {item.nama_barang}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <code className="text-xs bg-muted px-2 py-1 rounded">
                              {item.kode_barang}
                            </code>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() => handleShowQR(item.kode_barang, item.nama_barang)}
                            >
                              <QrCode className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            <div>Total: {item.jumlah_stok}</div>
                            <div className="text-success">
                              Tersedia: {available}
                            </div>
                            <div className="text-warning">
                              Dipinjam: {item.jumlah_dipinjam}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={available > 0 ? "default" : "secondary"}
                          >
                            {available > 0 ? "Tersedia" : "Habis"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="max-w-xs truncate text-sm text-muted-foreground">
                            {item.notes || "-"}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex gap-1 justify-end">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                setEditingItem(item);
                                setIsEditDialogOpen(true);
                              }}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <AlertDialog
                              open={
                                deleteDialogOpen && itemToDelete === item.id
                              }
                              onOpenChange={(open) => {
                                setDeleteDialogOpen(open);
                                if (!open) setItemToDelete(null);
                              }}
                            >
                              <AlertDialogTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="text-destructive hover:text-destructive"
                                  onClick={() => setItemToDelete(item.id)}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>
                                    Konfirmasi Hapus Barang
                                  </AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Apakah Anda yakin ingin menghapus barang{" "}
                                    <strong>{item.nama_barang}</strong>?
                                    Tindakan ini tidak dapat dibatalkan.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Batal</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={handleDeleteItem}
                                    className="bg-destructive hover:bg-destructive/90"
                                  >
                                    Hapus
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* Edit Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="!max-w-md max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Edit Barang</DialogTitle>
            </DialogHeader>
            {editingItem && (
              <form onSubmit={handleEditItem} className="space-y-4">
                <div>
                  <Label>Kode Barang</Label>
                  <Input value={editingItem.kode_barang} disabled />
                </div>
                <div>
                  <Label htmlFor="edit-nama">Nama Barang *</Label>
                  <Input
                    id="edit-nama"
                    name="nama"
                    defaultValue={editingItem.nama_barang}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="edit-stok">Jumlah Stok *</Label>
                  <Input
                    id="edit-stok"
                    name="stok"
                    type="number"
                    min="0"
                    defaultValue={editingItem.jumlah_stok}
                    required
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Saat ini dipinjam: {editingItem.jumlah_dipinjam}
                  </p>
                </div>
                <div>
                  <Label htmlFor="edit-foto">Foto Barang</Label>
                  {editingItem.foto_barang && (
                    <img
                      src={editingItem.foto_barang}
                      alt="Current"
                      className="w-24 h-24 object-cover rounded mb-2"
                    />
                  )}
                  <Input
                    id="edit-foto"
                    name="foto"
                    type="file"
                    accept="image/*"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Kosongkan jika tidak ingin mengubah foto
                  </p>
                </div>
                <div>
                  <Label htmlFor="edit-notes">Catatan</Label>
                  <Textarea
                    id="edit-notes"
                    name="notes"
                    defaultValue={editingItem.notes}
                  />
                </div>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsEditDialogOpen(false)}
                    className="flex-1"
                  >
                    Batal
                  </Button>
                  <Button type="submit" className="flex-1" disabled={uploading}>
                    {uploading ? "Menyimpan..." : "Simpan"}
                  </Button>
                </div>
              </form>
            )}
          </DialogContent>
        </Dialog>

        {/* QR Code Dialog */}
        <Dialog open={qrDialogOpen} onOpenChange={setQrDialogOpen}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle>QR Code Barang</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="bg-orange-700/5 p-2 rounded-lg text-center">
                <code className="font-mono text-2xl font-bold">{currentQrCode}</code>
              </div>
              {qrCodeData && (
                <div className="flex justify-center">
                  <img src={qrCodeData} alt="QR Code" className="h-full outline-orange-800 rounded-md outline-double" />
                </div>
              )}
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => setQrDialogOpen(false)}
                  className="flex-1"
                >
                  Tutup
                </Button>
                <Button onClick={handleDownloadQR} className="flex-1">
                  <Download className="h-4 w-4 mr-2" />
                  Download
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
};

export default Items;
