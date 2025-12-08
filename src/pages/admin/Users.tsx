import { useState } from "react";
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
import { Search, Plus, Edit, Trash2, UserCog, Users as UsersIcon, GraduationCap } from "lucide-react";
import { toast } from "react-hot-toast";

// Mock data
const mockAdmins = [
  {
    id: 1,
    username: "admin",
    nama_lengkap: "Administrator TKJ",
    created_at: new Date().toISOString(),
  },
  {
    id: 2,
    username: "admin2",
    nama_lengkap: "Admin Backup",
    created_at: new Date().toISOString(),
  },
];

const mockGuru = [
  { id: 1, nip: "NIP-001", name: "Pak Budi Santoso", created_at: new Date().toISOString() },
  { id: 2, nip: "NIP-002", name: "Bu Ani Wijaya", created_at: new Date().toISOString() },
  { id: 3, nip: "NIP-003", name: "Pak Dino Pratama", created_at: new Date().toISOString() },
  { id: 4, nip: "NIP-004", name: "Bu Sita Rahman", created_at: new Date().toISOString() },
  { id: 5, nip: "NIP-005", name: "Pak Eko Kurniawan", created_at: new Date().toISOString() },
];

const mockSiswa = [
  { id: 1, nis: "14301/2364.066", name: "ABDULLOH ARRAFIFF", kelas: "X TKJ 1", created_at: new Date().toISOString() },
  { id: 2, nis: "14302/2365.066", name: "ABY NUR SYAHDANI", kelas: "X TKJ 1", created_at: new Date().toISOString() },
  { id: 3, nis: "14304/2367.066", name: "ADAM PRANANDA SUHENDAR", kelas: "X TKJ 1", created_at: new Date().toISOString() },
  { id: 4, nis: "14305/2368.066", name: "ADEVITA INDRIYANTI", kelas: "X TKJ 1", created_at: new Date().toISOString() },
  { id: 5, nis: "14309/2372.066", name: "AHMAD MAFTUHUR RIZQY", kelas: "X TKJ 1", created_at: new Date().toISOString() },
  { id: 6, nis: "14400/2500.061", name: "Tali Goci 01", kelas: "X TKJ 2", created_at: new Date().toISOString() },
  { id: 7, nis: "14401/2501.061", name: "Tali Goci 02", kelas: "X TKJ 2", created_at: new Date().toISOString() },
  { id: 8, nis: "14425/2525.061", name: "Jian Ayune 01", kelas: "X TKJ 3", created_at: new Date().toISOString() },
  { id: 9, nis: "13700/2350.061", name: "Owalah Yowes 01", kelas: "XI TKJ 1", created_at: new Date().toISOString() },
  { id: 10, nis: "13710/2360.061", name: "Yanto Hay 01", kelas: "XI TKJ 2", created_at: new Date().toISOString() },
];

const Users = () => {
  const [activeTab, setActiveTab] = useState("admin");
  const [searchQuery, setSearchQuery] = useState("");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<{ id: number; type: string } | null>(null);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);

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

  const handleDelete = async () => {
    if (!itemToDelete) return;
    toast.success(`${itemToDelete.type} berhasil dihapus!`);
    setDeleteDialogOpen(false);
    setItemToDelete(null);
  };

  const handleAdd = () => {
    toast.success(`${activeTab === "admin" ? "Admin" : activeTab === "guru" ? "Guru" : "Siswa"} berhasil ditambahkan!`);
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
  };

  const handleEdit = () => {
    toast.success(`Data berhasil diupdate!`);
    setEditDialogOpen(false);
    setEditingItem(null);
  };

  const openEditDialog = (item: any, type: string) => {
    setEditingItem({ ...item, type });
    if (type === "admin") {
      setFormData({
        ...formData,
        username: item.username,
        nama_lengkap: item.nama_lengkap,
      });
    } else if (type === "guru") {
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

  const filteredAdmins = mockAdmins.filter((a) =>
    a.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
    a.nama_lengkap.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredGuru = mockGuru.filter((g) =>
    g.nip.toLowerCase().includes(searchQuery.toLowerCase()) ||
    g.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredSiswa = mockSiswa.filter((s) =>
    s.nis.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.kelas.toLowerCase().includes(searchQuery.toLowerCase())
  );

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
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Admin
              </CardTitle>
              <UserCog className="h-5 w-5 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{mockAdmins.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Guru
              </CardTitle>
              <UsersIcon className="h-5 w-5 text-success" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{mockGuru.length}</div>
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
              <div className="text-3xl font-bold">{mockSiswa.length}</div>
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
                        Tambah {activeTab === "admin" ? "Admin" : activeTab === "guru" ? "Guru" : "Siswa"}
                      </DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      {activeTab === "admin" && (
                        <>
                          <div>
                            <Label htmlFor="username">Username *</Label>
                            <Input
                              id="username"
                              value={formData.username}
                              onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                              placeholder="Username"
                            />
                          </div>
                          <div>
                            <Label htmlFor="nama_lengkap">Nama Lengkap *</Label>
                            <Input
                              id="nama_lengkap"
                              value={formData.nama_lengkap}
                              onChange={(e) => setFormData({ ...formData, nama_lengkap: e.target.value })}
                              placeholder="Nama Lengkap"
                            />
                          </div>
                          <div>
                            <Label htmlFor="password">Password *</Label>
                            <Input
                              id="password"
                              type="password"
                              value={formData.password}
                              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                              placeholder="Password"
                            />
                          </div>
                        </>
                      )}
                      {activeTab === "guru" && (
                        <>
                          <div>
                            <Label htmlFor="nip">NIP *</Label>
                            <Input
                              id="nip"
                              value={formData.nip}
                              onChange={(e) => setFormData({ ...formData, nip: e.target.value })}
                              placeholder="NIP"
                            />
                          </div>
                          <div>
                            <Label htmlFor="name">Nama Lengkap *</Label>
                            <Input
                              id="name"
                              value={formData.name}
                              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
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
                              onChange={(e) => setFormData({ ...formData, nis: e.target.value })}
                              placeholder="NIS"
                            />
                          </div>
                          <div>
                            <Label htmlFor="name">Nama Lengkap *</Label>
                            <Input
                              id="name"
                              value={formData.name}
                              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                              placeholder="Nama Lengkap"
                            />
                          </div>
                          <div>
                            <Label htmlFor="kelas">Kelas *</Label>
                            <Input
                              id="kelas"
                              value={formData.kelas}
                              onChange={(e) => setFormData({ ...formData, kelas: e.target.value })}
                              placeholder="Contoh: X TKJ 1"
                            />
                          </div>
                        </>
                      )}
                    </div>
                    <div className="flex justify-end gap-2">
                      <Button variant="outline" onClick={() => setAddDialogOpen(false)}>
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
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="admin">
                  <UserCog className="h-4 w-4 mr-2" />
                  Admin
                </TabsTrigger>
                <TabsTrigger value="guru">
                  <UsersIcon className="h-4 w-4 mr-2" />
                  Guru
                </TabsTrigger>
                <TabsTrigger value="siswa">
                  <GraduationCap className="h-4 w-4 mr-2" />
                  Siswa
                </TabsTrigger>
              </TabsList>

              {/* Admin Tab */}
              <TabsContent value="admin" className="space-y-4">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>No</TableHead>
                        <TableHead>Username</TableHead>
                        <TableHead>Nama Lengkap</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Aksi</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredAdmins.map((admin, index) => (
                        <TableRow key={admin.id}>
                          <TableCell>{index + 1}</TableCell>
                          <TableCell>
                            <code className="text-xs bg-muted px-2 py-1 rounded">
                              {admin.username}
                            </code>
                          </TableCell>
                          <TableCell className="font-medium">{admin.nama_lengkap}</TableCell>
                          <TableCell>
                            <Badge variant="default" className="bg-success">
                              Aktif
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex gap-1 justify-end">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => openEditDialog(admin, "admin")}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="text-destructive hover:text-destructive"
                                onClick={() => {
                                  setItemToDelete({ id: admin.id, type: "Admin" });
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
                        <TableRow key={guru.id}>
                          <TableCell>{index + 1}</TableCell>
                          <TableCell>
                            <code className="text-xs bg-muted px-2 py-1 rounded">
                              {guru.nip}
                            </code>
                          </TableCell>
                          <TableCell className="font-medium">{guru.name}</TableCell>
                          <TableCell className="text-right">
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
                                  setItemToDelete({ id: guru.id, type: "Guru" });
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
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>No</TableHead>
                        <TableHead>NIS</TableHead>
                        <TableHead>Nama Lengkap</TableHead>
                        <TableHead>Kelas</TableHead>
                        <TableHead className="text-right">Aksi</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredSiswa.map((siswa, index) => (
                        <TableRow key={siswa.id}>
                          <TableCell>{index + 1}</TableCell>
                          <TableCell>
                            <code className="text-xs bg-muted px-2 py-1 rounded">
                              {siswa.nis}
                            </code>
                          </TableCell>
                          <TableCell className="font-medium">{siswa.name}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{siswa.kelas}</Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex gap-1 justify-end">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => openEditDialog(siswa, "siswa")}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="text-destructive hover:text-destructive"
                                onClick={() => {
                                  setItemToDelete({ id: siswa.id, type: "Siswa" });
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
            </Tabs>
          </CardContent>
        </Card>

        {/* Edit Dialog */}
        <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit {editingItem?.type === "admin" ? "Admin" : editingItem?.type === "guru" ? "Guru" : "Siswa"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              {editingItem?.type === "admin" && (
                <>
                  <div>
                    <Label htmlFor="edit-username">Username *</Label>
                    <Input
                      id="edit-username"
                      value={formData.username}
                      onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="edit-nama">Nama Lengkap *</Label>
                    <Input
                      id="edit-nama"
                      value={formData.nama_lengkap}
                      onChange={(e) => setFormData({ ...formData, nama_lengkap: e.target.value })}
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
                      onChange={(e) => setFormData({ ...formData, nip: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="edit-name">Nama Lengkap *</Label>
                    <Input
                      id="edit-name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
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
                      onChange={(e) => setFormData({ ...formData, nis: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="edit-name">Nama Lengkap *</Label>
                    <Input
                      id="edit-name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="edit-kelas">Kelas *</Label>
                    <Input
                      id="edit-kelas"
                      value={formData.kelas}
                      onChange={(e) => setFormData({ ...formData, kelas: e.target.value })}
                    />
                  </div>
                </>
              )}
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
                Batal
              </Button>
              <Button onClick={handleEdit}>Update</Button>
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
      </div>
    </AdminLayout>
  );
};

export default Users;
