import { useState, useEffect } from "react";
import AdminLayout from "@/layouts/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
} from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";
import {
  Search,
  Plus,
  Edit,
  Trash2,
  Download,
  Users as UsersIcon,
  GraduationCap,
} from "lucide-react";
import { adminAPI, guruAPI, siswaAPI } from "@/lib/api";
import { mockGuru, mockSiswa } from "@/lib/mockData";
import { toast } from "react-hot-toast";

const Users = () => {
  const [activeTab, setActiveTab] = useState("guru");
  const [activeKelas, setActiveKelas] = useState("X TKJ 1");
  const [searchQuery, setSearchQuery] = useState("");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<{
    id: number;
    type: string;
  } | null>(null);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [importGuruDialogOpen, setImportGuruDialogOpen] = useState(false);
  const [importSiswaDialogOpen, setImportSiswaDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Bulk delete states
  const [showBulkDeleteDialog, setShowBulkDeleteDialog] = useState(false);
  const [bulkDeleteType, setBulkDeleteType] = useState<"all" | "guru" | "siswa">("all");
  const [selectedForDelete, setSelectedForDelete] = useState<number[]>([]);

  // Data states
  const [guru, setGuru] = useState<any[]>([]);
  const [siswa, setSiswa] = useState<any[]>([]);
  const [kelasList, setKelasList] = useState<string[]>([]);

  // Form states
  const [formData, setFormData] = useState({
    username: "",
    nama_lengkap: "",
    password: "",
    nip: "",
    name: "",
    nis: "",
    kelas: "",
  });

  // Fetch data on mount
  useEffect(() => {
    fetchAllData();
  }, []);

  const fetchAllData = async () => {
    try {
      setLoading(true);
      console.log("🔄 Fetching guru and siswa data from API...");

      const [guruData, siswaData] = await Promise.all([
        guruAPI.getAll().catch((err) => {
          console.error("❌ Error fetching guru:", err);
          return null;
        }),
        siswaAPI.getAll().catch((err) => {
          console.error("❌ Error fetching siswa:", err);
          return null;
        }),
      ]);

      console.log("✅ API Response:", { guruData, siswaData });

      const guruList =
        guruData && Array.isArray(guruData) && guruData.length > 0
          ? guruData
          : mockGuru;
      const siswaList =
        siswaData && Array.isArray(siswaData) && siswaData.length > 0
          ? siswaData
          : mockSiswa;

      setGuru(guruList);
      setSiswa(siswaList);

      // Extract unique kelas from siswa data
      const uniqueKelas = [
        ...new Set(siswaList.map((s) => s.kelas).filter(Boolean)),
      ].sort() as string[];
      setKelasList(uniqueKelas);
    } catch (error) {
      console.error("❌ Error fetching data:", error);
      toast.error("Gagal memuat data pengguna");
      // Fallback to mock data
      setGuru(mockGuru);
      setSiswa(mockSiswa);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!itemToDelete) return;
    try {
      setLoading(true);
      const type = itemToDelete.type.toLowerCase();

      if (type === "guru") {
        await guruAPI.delete(itemToDelete.id);
        setGuru(guru.filter((g) => g.id !== itemToDelete.id));
      } else if (type === "siswa") {
        await siswaAPI.delete(itemToDelete.id);
        setSiswa(siswa.filter((s) => s.id !== itemToDelete.id));
      }

      toast.success(`${itemToDelete.type} berhasil dihapus!`);
      setDeleteDialogOpen(false);
      setItemToDelete(null);
    } catch (error) {
      console.error("Error deleting:", error);
      toast.error("Gagal menghapus data");
    } finally {
      setLoading(false);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedForDelete.length === 0) {
      toast.error("Pilih minimal satu item untuk dihapus");
      return;
    }
    
    try {
      setLoading(true);
      let successCount = 0;
      
      if (bulkDeleteType === "all" || bulkDeleteType === "guru") {
        const guruToDelete = bulkDeleteType === "all" 
          ? selectedForDelete.filter(id => guru.some(g => g.id === id))
          : selectedForDelete;
          
        for (const id of guruToDelete) {
          try {
            await guruAPI.delete(id);
            successCount++;
          } catch (err) {
            console.error("Error deleting guru:", err);
          }
        }
        setGuru(guru.filter(g => !guruToDelete.includes(g.id)));
      }
      
      if (bulkDeleteType === "all" || bulkDeleteType === "siswa") {
        const siswaToDelete = bulkDeleteType === "all"
          ? selectedForDelete.filter(id => siswa.some(s => s.id === id))
          : selectedForDelete;
          
        for (const id of siswaToDelete) {
          try {
            await siswaAPI.delete(id);
            successCount++;
          } catch (err) {
            console.error("Error deleting siswa:", err);
          }
        }
        setSiswa(siswa.filter(s => !siswaToDelete.includes(s.id)));
      }
      
      toast.success(`Berhasil menghapus ${successCount} pengguna`);
      setShowBulkDeleteDialog(false);
      setSelectedForDelete([]);
    } catch (error) {
      console.error("Error bulk deleting:", error);
      toast.error("Gagal menghapus data");
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = async () => {
    if (!formData.name && !formData.username && !formData.nis) {
      toast.error("Silakan isi semua field yang diperlukan");
      return;
    }

    try {
      setLoading(true);
      const type = activeTab;

      if (type === "guru") {
        if (!formData.nip || !formData.name) {
          toast.error("NIP dan nama harus diisi");
          return;
        }
        const newGuru = await guruAPI.create({
          nip: formData.nip,
          name: formData.name,
        });
        setGuru([...guru, newGuru]);
      } else if (type === "siswa") {
        if (!formData.nis || !formData.name || !formData.kelas) {
          toast.error("NIS, nama, dan kelas harus diisi");
          return;
        }
        const newSiswa = await siswaAPI.create({
          nis: formData.nis,
          name: formData.name,
          kelas: formData.kelas,
        });
        setSiswa([...siswa, newSiswa]);

        // Update kelas list if new kelas added
        if (formData.kelas && !kelasList.includes(formData.kelas)) {
          setKelasList([...kelasList, formData.kelas].sort());
        }
      }

      toast.success(
        `${
          activeTab === "admin"
            ? "Admin"
            : activeTab === "guru"
            ? "Guru"
            : "Siswa"
        } berhasil ditambahkan!`
      );
      setAddDialogOpen(false);
      setFormData({
        username: "",
        nama_lengkap: "",
        password: "",
        nip: "",
        name: "",
        nis: "",
        kelas: "",
      });
    } catch (error) {
      console.error("Error adding:", error);
      toast.error("Gagal menambah data");
    } finally {
      setLoading(false);
    }
  };

  // Import CSV Guru: headers nip,name
  const handleImportGuruCsv = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setLoading(true);
      const text = await file.text();
      const lines = text
        .split(/\r?\n/)
        .map((l) => l.trim())
        .filter(Boolean);
      if (lines.length < 2) {
        toast.error("File kosong atau format tidak valid");
        return;
      }
      const header = lines
        .shift()!
        .split(",")
        .map((h) => h.trim().toLowerCase());
      const idxNip = header.indexOf("nip");
      const idxName = header.indexOf("name");
      if (idxNip === -1 || idxName === -1) {
        toast.error("Header harus mengandung nip,name");
        return;
      }

      const newEntries: { nip: string; name: string; created_at?: string }[] =
        [];
      for (const line of lines) {
        const cols = line.split(",");
        const nip = (cols[idxNip] || "").trim();
        const name = (cols[idxName] || "").trim();
        if (!nip || !name) continue;
        try {
          const created = await guruAPI.create({ nip, name });
          newEntries.push(created);
        } catch (err) {
          console.error("Import guru gagal untuk", nip, err);
        }
      }

      if (newEntries.length === 0) {
        toast.error("Tidak ada guru yang berhasil diimport");
        return;
      }

      setGuru([...guru, ...newEntries]);
      toast.success(`Berhasil import ${newEntries.length} guru`);
    } catch (error) {
      console.error("Error import guru:", error);
      toast.error("Gagal import CSV guru");
    } finally {
      setLoading(false);
      e.target.value = "";
    }
  };

  // Import CSV Siswa: headers nis,name,kelas
  const handleImportSiswaCsv = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setLoading(true);
      const text = await file.text();
      const lines = text
        .split(/\r?\n/)
        .map((l) => l.trim())
        .filter(Boolean);
      if (lines.length < 2) {
        toast.error("File kosong atau format tidak valid");
        return;
      }
      const header = lines
        .shift()!
        .split(",")
        .map((h) => h.trim().toLowerCase());
      const idxNis = header.indexOf("nis");
      const idxName = header.indexOf("name");
      const idxKelas = header.indexOf("kelas");
      if (idxNis === -1 || idxName === -1 || idxKelas === -1) {
        toast.error("Header harus mengandung nis,name,kelas");
        return;
      }

      const newEntries: {
        nis: string;
        name: string;
        kelas: string;
        created_at?: string;
      }[] = [];
      for (const line of lines) {
        const cols = line.split(",");
        const nis = (cols[idxNis] || "").trim();
        const name = (cols[idxName] || "").trim();
        const kelas = (cols[idxKelas] || "").trim();
        if (!nis || !name || !kelas) continue;
        try {
          const created = await siswaAPI.create({ nis, name, kelas });
          newEntries.push(created);
        } catch (err) {
          console.error("Import siswa gagal untuk", nis, err);
        }
      }

      if (newEntries.length === 0) {
        toast.error("Tidak ada siswa yang berhasil diimport");
        return;
      }

      setSiswa([...siswa, ...newEntries]);
      toast.success(`Berhasil import ${newEntries.length} siswa`);
    } catch (error) {
      console.error("Error import siswa:", error);
      toast.error("Gagal import CSV siswa");
    } finally {
      setLoading(false);
      e.target.value = "";
    }
  };

  const csvEscape = (value: any) => {
    if (value === undefined || value === null) return "";
    const str = String(value).replace(/"/g, '""');
    return `"${str}"`;
  };

  const exportGuruCsv = () => {
    if (guru.length === 0) {
      toast.error("Tidak ada data guru untuk diexport");
      return;
    }

    const header = "nip,name";
    const rows = guru.map((g) =>
      [csvEscape(g.nip || ""), csvEscape(g.name || "")].join(",")
    );

    const csvContent = [header, ...rows].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "export-guru.csv";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success(`Berhasil export ${rows.length} data guru`);
  };

  const exportSiswaCsv = () => {
    if (siswa.length === 0) {
      toast.error("Tidak ada data siswa untuk diexport");
      return;
    }

    const header = "nis,name,kelas";
    const rows = siswa.map((s) =>
      [csvEscape(s.nis || ""), csvEscape(s.name || ""), csvEscape(s.kelas || "")].join(",")
    );

    const csvContent = [header, ...rows].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "export-siswa.csv";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success(`Berhasil export ${rows.length} data siswa`);
  };

  const handleEdit = async () => {
    if (!editingItem) return;
    try {
      setLoading(true);
      const type = editingItem.type;

      if (type === "guru") {
        if (!formData.nip || !formData.name) {
          toast.error("NIP dan nama harus diisi");
          return;
        }
        await guruAPI.update(editingItem.id, {
          nip: formData.nip,
          name: formData.name,
        });
        setGuru(
          guru.map((g) =>
            g.id === editingItem.id
              ? { ...g, nip: formData.nip, name: formData.name }
              : g
          )
        );
      } else if (type === "siswa") {
        if (!formData.nis || !formData.name || !formData.kelas) {
          toast.error("NIS, nama, dan kelas harus diisi");
          return;
        }
        await siswaAPI.update(editingItem.id, {
          nis: formData.nis,
          name: formData.name,
          kelas: formData.kelas,
        });
        setSiswa(
          siswa.map((s) =>
            s.id === editingItem.id
              ? {
                  ...s,
                  nis: formData.nis,
                  name: formData.name,
                  kelas: formData.kelas,
                }
              : s
          )
        );
      }

      toast.success(`Data berhasil diupdate!`);
      setEditDialogOpen(false);
      setEditingItem(null);
    } catch (error) {
      console.error("Error editing:", error);
      toast.error("Gagal mengupdate data");
    } finally {
      setLoading(false);
    }
  };

  const openEditDialog = (item: any, type: string) => {
    setEditingItem({ ...item, type });
    if (type === "guru") {
      setFormData({
        ...formData,
        nip: item.nip,
        name: item.name,
      });
    } else {
      setFormData({
        ...formData,
        nis: item.nis,
        name: item.name,
        kelas: item.kelas,
      });
    }
    setEditDialogOpen(true);
  };

  const filteredGuru = guru.filter(
    (g) =>
      g.nip.toLowerCase().includes(searchQuery.toLowerCase()) ||
      g.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredSiswa = siswa.filter(
    (s) =>
      s.nis.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.kelas.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading && guru.length === 0 && siswa.length === 0) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-muted-foreground">Memuat data pengguna...</p>
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold mb-2">Kelola Pengguna</h2>
            <p className="text-muted-foreground">
              Kelola data admin, guru, dan siswa
            </p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Guru
              </CardTitle>
              <UsersIcon className="h-5 w-5 text-success" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{guru.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Siswa
              </CardTitle>
              <GraduationCap className="h-5 w-5 text-info" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{siswa.length}</div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <CardTitle>Daftar Pengguna</CardTitle>
              <div className="flex gap-2">
                <div className="relative flex-1 md:w-64">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Cari..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => {
                    setSelectedForDelete([]);
                    setBulkDeleteType("all");
                    setShowBulkDeleteDialog(true);
                  }}
                  disabled={guru.length === 0 && siswa.length === 0}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Hapus Semua
                </Button>
                {activeTab === "guru" && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={exportGuruCsv}
                    disabled={guru.length === 0}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Export CSV Guru
                  </Button>
                )}
                {activeTab === "siswa" && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={exportSiswaCsv}
                    disabled={siswa.length === 0}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Export CSV Siswa
                  </Button>
                )}
                {activeTab === "guru" && (
                  <>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => {
                        setSelectedForDelete([]);
                        setBulkDeleteType("guru");
                        setShowBulkDeleteDialog(true);
                      }}
                      disabled={guru.length === 0}
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Hapus Semua Guru
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => setImportGuruDialogOpen(true)}
                    >
                      Import CSV Guru
                    </Button>
                  </>
                )}
                {activeTab === "siswa" && (
                  <>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => {
                        setSelectedForDelete([]);
                        setBulkDeleteType("siswa");
                        setShowBulkDeleteDialog(true);
                      }}
                      disabled={siswa.length === 0}
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Hapus Semua Siswa
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => setImportSiswaDialogOpen(true)}
                    >
                      Import CSV Siswa
                    </Button>
                  </>
                )}
                <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
                  <DialogTrigger asChild>
                    <Button>
                      <Plus className="h-4 w-4 mr-2" />
                      Tambah
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>
                        Tambah {activeTab === "guru" ? "Guru" : "Siswa"}
                      </DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      {activeTab === "guru" && (
                        <>
                          <div>
                            <Label htmlFor="nip">NIP *</Label>
                            <Input
                              id="nip"
                              value={formData.nip}
                              onChange={(e) =>
                                setFormData({
                                  ...formData,
                                  nip: e.target.value,
                                })
                              }
                              placeholder="NIP"
                            />
                          </div>
                          <div>
                            <Label htmlFor="name">Nama Lengkap *</Label>
                            <Input
                              id="name"
                              value={formData.name}
                              onChange={(e) =>
                                setFormData({
                                  ...formData,
                                  name: e.target.value,
                                })
                              }
                              placeholder="Nama Lengkap"
                            />
                          </div>
                        </>
                      )}
                      {activeTab === "siswa" && (
                        <>
                          <div>
                            <Label htmlFor="nis">NIS *</Label>
                            <Input
                              id="nis"
                              value={formData.nis}
                              onChange={(e) =>
                                setFormData({
                                  ...formData,
                                  nis: e.target.value,
                                })
                              }
                              placeholder="NIS"
                            />
                          </div>
                          <div>
                            <Label htmlFor="name">Nama Lengkap *</Label>
                            <Input
                              id="name"
                              value={formData.name}
                              onChange={(e) =>
                                setFormData({
                                  ...formData,
                                  name: e.target.value,
                                })
                              }
                              placeholder="Nama Lengkap"
                            />
                          </div>
                          <div>
                            <Label htmlFor="kelas">Kelas *</Label>
                            <select
                              id="kelas"
                              value={formData.kelas}
                              onChange={(e) =>
                                setFormData({
                                  ...formData,
                                  kelas: e.target.value,
                                })
                              }
                              className="w-full px-3 py-2 border rounded-md text-sm"
                            >
                              <option value="">Pilih Kelas</option>
                              {kelasList.map((kelas) => (
                                <option key={kelas} value={kelas}>
                                  {kelas}
                                </option>
                              ))}
                            </select>
                          </div>
                        </>
                      )}
                    </div>
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="outline"
                        onClick={() => setAddDialogOpen(false)}
                      >
                        Batal
                      </Button>
                      <Button onClick={handleAdd}>Simpan</Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="guru">
                  <UsersIcon className="h-4 w-4 mr-2" />
                  Guru
                </TabsTrigger>
                <TabsTrigger value="siswa">
                  <GraduationCap className="h-4 w-4 mr-2" />
                  Siswa
                </TabsTrigger>
              </TabsList>

              {/* Guru Tab */}
              <TabsContent value="guru" className="space-y-4">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>No</TableHead>
                        <TableHead>NIP</TableHead>
                        <TableHead>Nama Lengkap</TableHead>
                        <TableHead className="text-right">Aksi</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredGuru.map((guru, index) => (
                        <TableRow key={guru.id} className="h-auto">
                          <TableCell className="py-2">{index + 1}</TableCell>
                          <TableCell className="py-2">
                            <code className="text-xs bg-muted px-2 py-1 rounded">
                              {guru.nip}
                            </code>
                          </TableCell>
                          <TableCell className="font-medium py-2">
                            {guru.name}
                          </TableCell>
                          <TableCell className="text-right py-2">
                            <div className="flex gap-1 justify-end">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => openEditDialog(guru, "guru")}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="text-destructive hover:text-destructive"
                                onClick={() => {
                                  setItemToDelete({
                                    id: guru.id,
                                    type: "Guru",
                                  });
                                  setDeleteDialogOpen(true);
                                }}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </TabsContent>

              {/* Siswa Tab */}
              <TabsContent value="siswa" className="space-y-4">
                <Tabs value={activeKelas} onValueChange={setActiveKelas}>
                  <TabsList className="grid w-full grid-cols-6">
                    <TabsTrigger value="X TKJ 1">X TKJ 1</TabsTrigger>
                    <TabsTrigger value="X TKJ 2">X TKJ 2</TabsTrigger>
                    <TabsTrigger value="X TKJ 3">X TKJ 3</TabsTrigger>
                    <TabsTrigger value="XI TKJ 1">XI TKJ 1</TabsTrigger>
                    <TabsTrigger value="XI TKJ 2">XI TKJ 2</TabsTrigger>
                    <TabsTrigger value="XI TKJ 3">XI TKJ 3</TabsTrigger>
                  </TabsList>

                  {[
                    "X TKJ 1",
                    "X TKJ 2",
                    "X TKJ 3",
                    "XI TKJ 1",
                    "XI TKJ 2",
                    "XI TKJ 3",
                  ].map((kelas) => {
                    const siswaByKelas = filteredSiswa.filter(
                      (s) => s.kelas === kelas
                    );
                    return (
                      <TabsContent
                        key={kelas}
                        value={kelas}
                        className="space-y-4"
                      >
                        <div className="overflow-x-auto">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>No</TableHead>
                                <TableHead>NIS</TableHead>
                                <TableHead>Nama Lengkap</TableHead>
                                <TableHead className="text-right">
                                  Aksi
                                </TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {siswaByKelas.length > 0 ? (
                                siswaByKelas.map((siswa, index) => (
                                  <TableRow key={siswa.id} className="h-auto">
                                    <TableCell className="py-2">
                                      {index + 1}
                                    </TableCell>
                                    <TableCell className="py-2">
                                      <code className="text-xs bg-muted px-2 py-1 rounded">
                                        {siswa.nis}
                                      </code>
                                    </TableCell>
                                    <TableCell className="font-medium py-2">
                                      {siswa.name}
                                    </TableCell>
                                    <TableCell className="text-right py-2">
                                      <div className="flex gap-1 justify-end">
                                        <Button
                                          variant="ghost"
                                          size="icon"
                                          onClick={() =>
                                            openEditDialog(siswa, "siswa")
                                          }
                                        >
                                          <Edit className="h-4 w-4" />
                                        </Button>
                                        <Button
                                          variant="ghost"
                                          size="icon"
                                          className="text-destructive hover:text-destructive"
                                          onClick={() => {
                                            setItemToDelete({
                                              id: siswa.id,
                                              type: "Siswa",
                                            });
                                            setDeleteDialogOpen(true);
                                          }}
                                        >
                                          <Trash2 className="h-4 w-4" />
                                        </Button>
                                      </div>
                                    </TableCell>
                                  </TableRow>
                                ))
                              ) : (
                                <TableRow>
                                  <TableCell
                                    colSpan={4}
                                    className="text-center text-muted-foreground py-8"
                                  >
                                    Belum ada siswa di kelas {kelas}
                                  </TableCell>
                                </TableRow>
                              )}
                            </TableBody>
                          </Table>
                        </div>
                      </TabsContent>
                    );
                  })}
                </Tabs>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        {/* Edit Dialog */}
        <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                Edit{" "}
                {editingItem?.type === "admin"
                  ? "Admin"
                  : editingItem?.type === "guru"
                  ? "Guru"
                  : "Siswa"}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              {editingItem?.type === "admin" && (
                <>
                  <div>
                    <Label htmlFor="edit-username">Username *</Label>
                    <Input
                      id="edit-username"
                      value={formData.username}
                      onChange={(e) =>
                        setFormData({ ...formData, username: e.target.value })
                      }
                    />
                  </div>
                  <div>
                    <Label htmlFor="edit-nama">Nama Lengkap *</Label>
                    <Input
                      id="edit-nama"
                      value={formData.nama_lengkap}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          nama_lengkap: e.target.value,
                        })
                      }
                    />
                  </div>
                </>
              )}
              {editingItem?.type === "guru" && (
                <>
                  <div>
                    <Label htmlFor="edit-nip">NIP *</Label>
                    <Input
                      id="edit-nip"
                      value={formData.nip}
                      onChange={(e) =>
                        setFormData({ ...formData, nip: e.target.value })
                      }
                    />
                  </div>
                  <div>
                    <Label htmlFor="edit-name">Nama Lengkap *</Label>
                    <Input
                      id="edit-name"
                      value={formData.name}
                      onChange={(e) =>
                        setFormData({ ...formData, name: e.target.value })
                      }
                    />
                  </div>
                </>
              )}
              {editingItem?.type === "siswa" && (
                <>
                  <div>
                    <Label htmlFor="edit-nis">NIS *</Label>
                    <Input
                      id="edit-nis"
                      value={formData.nis}
                      onChange={(e) =>
                        setFormData({ ...formData, nis: e.target.value })
                      }
                    />
                  </div>
                  <div>
                    <Label htmlFor="edit-name">Nama Lengkap *</Label>
                    <Input
                      id="edit-name"
                      value={formData.name}
                      onChange={(e) =>
                        setFormData({ ...formData, name: e.target.value })
                      }
                    />
                  </div>
                  <div>
                    <Label htmlFor="edit-kelas">Kelas *</Label>
                    <select
                      id="edit-kelas"
                      value={formData.kelas}
                      onChange={(e) =>
                        setFormData({ ...formData, kelas: e.target.value })
                      }
                      className="w-full px-3 py-2 border rounded-md text-sm"
                    >
                      <option value="">Pilih Kelas</option>
                      {kelasList.map((kelas) => (
                        <option key={kelas} value={kelas}>
                          {kelas}
                        </option>
                      ))}
                    </select>
                  </div>
                </>
              )}
            </div>
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setEditDialogOpen(false)}
              >
                Batal
              </Button>
              <Button onClick={handleEdit}>Update</Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Import Guru Dialog */}
        <Dialog
          open={importGuruDialogOpen}
          onOpenChange={setImportGuruDialogOpen}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Import CSV Guru</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <p className="text-sm text-muted-foreground mb-3">
                  Format CSV: <strong>nip, name</strong>
                </p>
                <p className="text-xs text-muted-foreground mb-4">
                  ✓ Kode tidak perlu, hanya nip & name
                  <br />✓ Format: CSV saja (tidak support XLSX)
                </p>
                <Button
                  size="sm"
                  variant="secondary"
                  className="w-full mb-4"
                  onClick={() => {
                    const link = document.createElement("a");
                    link.href = "/template-guru.csv";
                    link.download = "template-guru.csv";
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
                    onChange={handleImportGuruCsv}
                    className="hidden"
                    id="import-guru-file"
                  />
                  <label htmlFor="import-guru-file" className="cursor-pointer">
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
                  onClick={() => setImportGuruDialogOpen(false)}
                >
                  Batal
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Import Siswa Dialog */}
        <Dialog
          open={importSiswaDialogOpen}
          onOpenChange={setImportSiswaDialogOpen}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Import CSV Siswa</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <p className="text-sm text-muted-foreground mb-3">
                  Format CSV: <strong>nis, name, kelas</strong>
                </p>
                <p className="text-xs text-muted-foreground mb-4">
                  ✓ Kode tidak perlu, hanya nis & name & kelas
                  <br />✓ Format: CSV saja (tidak support XLSX)
                </p>
                <Button
                  size="sm"
                  variant="secondary"
                  className="w-full mb-4"
                  onClick={() => {
                    const link = document.createElement("a");
                    link.href = "/template-siswa.csv";
                    link.download = "template-siswa.csv";
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
                    onChange={handleImportSiswaCsv}
                    className="hidden"
                    id="import-siswa-file"
                  />
                  <label htmlFor="import-siswa-file" className="cursor-pointer">
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
                  onClick={() => setImportSiswaDialogOpen(false)}
                >
                  Batal
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Delete Dialog */}
        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Konfirmasi Hapus</AlertDialogTitle>
              <AlertDialogDescription>
                Apakah Anda yakin ingin menghapus {itemToDelete?.type} ini?
                Tindakan ini tidak dapat dibatalkan.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Batal</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDelete}
                className="bg-destructive hover:bg-destructive/90"
              >
                Hapus
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Bulk Delete Dialog */}
        <AlertDialog open={showBulkDeleteDialog} onOpenChange={setShowBulkDeleteDialog}>
          <AlertDialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
            <AlertDialogHeader>
              <AlertDialogTitle>
                Hapus {bulkDeleteType === "all" ? "Semua Pengguna" : bulkDeleteType === "guru" ? "Semua Guru" : "Semua Siswa"}
              </AlertDialogTitle>
              <AlertDialogDescription>
                Pilih {bulkDeleteType === "all" ? "guru dan siswa" : bulkDeleteType === "guru" ? "guru" : "siswa"} yang ingin dihapus. Tindakan ini tidak dapat dibatalkan.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="space-y-4 py-4">
              {(bulkDeleteType === "all" || bulkDeleteType === "guru") && guru.length > 0 && (
                <>
                  <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="select-all-guru"
                        checked={guru.every(g => selectedForDelete.includes(g.id))}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedForDelete([...new Set([...selectedForDelete, ...guru.map(g => g.id)])]);
                          } else {
                            setSelectedForDelete(selectedForDelete.filter(id => !guru.some(g => g.id === id)));
                          }
                        }}
                        className="h-4 w-4 rounded border-gray-300"
                      />
                      <label htmlFor="select-all-guru" className="font-semibold cursor-pointer">
                        Pilih Semua Guru ({guru.length})
                      </label>
                    </div>
                  </div>
                  <div className="space-y-2 max-h-[30vh] overflow-y-auto">
                    {guru.map((g) => {
                      const isSelected = selectedForDelete.includes(g.id);
                      return (
                        <div
                          key={g.id}
                          className={`flex items-center gap-3 p-3 border rounded-lg hover:bg-muted/50 cursor-pointer transition-colors ${
                            isSelected ? 'bg-destructive/10 border-destructive' : ''
                          }`}
                          onClick={() => {
                            if (isSelected) {
                              setSelectedForDelete(selectedForDelete.filter(id => id !== g.id));
                            } else {
                              setSelectedForDelete([...selectedForDelete, g.id]);
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
                            <div className="font-medium">{g.name}</div>
                            <div className="text-xs text-muted-foreground">NIP: {g.nip}</div>
                          </div>
                          <Badge variant="secondary">Guru</Badge>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}

              {(bulkDeleteType === "all" || bulkDeleteType === "siswa") && siswa.length > 0 && (
                <>
                  <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="select-all-siswa"
                        checked={siswa.every(s => selectedForDelete.includes(s.id))}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedForDelete([...new Set([...selectedForDelete, ...siswa.map(s => s.id)])]);
                          } else {
                            setSelectedForDelete(selectedForDelete.filter(id => !siswa.some(s => s.id === id)));
                          }
                        }}
                        className="h-4 w-4 rounded border-gray-300"
                      />
                      <label htmlFor="select-all-siswa" className="font-semibold cursor-pointer">
                        Pilih Semua Siswa ({siswa.length})
                      </label>
                    </div>
                  </div>
                  <div className="space-y-2 max-h-[30vh] overflow-y-auto">
                    {siswa.map((s) => {
                      const isSelected = selectedForDelete.includes(s.id);
                      return (
                        <div
                          key={s.id}
                          className={`flex items-center gap-3 p-3 border rounded-lg hover:bg-muted/50 cursor-pointer transition-colors ${
                            isSelected ? 'bg-destructive/10 border-destructive' : ''
                          }`}
                          onClick={() => {
                            if (isSelected) {
                              setSelectedForDelete(selectedForDelete.filter(id => id !== s.id));
                            } else {
                              setSelectedForDelete([...selectedForDelete, s.id]);
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
                            <div className="font-medium">{s.name}</div>
                            <div className="text-xs text-muted-foreground">NIS: {s.nis} • Kelas: {s.kelas}</div>
                          </div>
                          <Badge>Siswa</Badge>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}

              <div className="flex items-center justify-between p-3 bg-primary/10 rounded-lg">
                <span className="font-semibold">Total Terpilih</span>
                <span className="text-lg font-bold">{selectedForDelete.length}</span>
              </div>
            </div>
            <AlertDialogFooter>
              <AlertDialogCancel>Batal</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleBulkDelete}
                disabled={selectedForDelete.length === 0}
                className="bg-destructive hover:bg-destructive/90"
              >
                Hapus {selectedForDelete.length} Pengguna
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </AdminLayout>
  );
};

export default Users;
