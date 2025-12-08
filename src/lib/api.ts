// API Configuration and Helper Functions
import { Item, Borrowing, BorrowingFormData } from "@/types";

// FIXED: Better API URL handling
const API_BASE_URL = 
  import.meta.env.VITE_API_URL || 
  "https://tkj-peminjaman-server-production.up.railway.app/api";


// Helper function for API calls
async function fetchAPI<T>(
  endpoint: string,
  options?: RequestInit
): Promise<{ success: boolean; data?: T; message?: string }> {
  try {
    const url = `${API_BASE_URL}${endpoint}`;

    const response = await fetch(url, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...options?.headers,
      },
      mode: "cors", // Explicitly set CORS mode
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "API request failed");
    }

    return data;
  } catch (error) {
    console.error("❌ API Error:", error);
    throw error;
  }
}

// Barang API
export const barangAPI = {
  // Get all items
  getAll: async (): Promise<Item[]> => {
    const result = await fetchAPI<Item[]>("/barang");
    return result.data || [];
  },

  // Get item by ID
  getById: async (id: number): Promise<Item | null> => {
    const result = await fetchAPI<Item>(`/barang/${id}`);
    return result.data || null;
  },

  // Get item by code (for QR scan)
  getByKode: async (kode: string): Promise<Item | null> => {
    const result = await fetchAPI<Item>(`/barang/kode/${kode}`);
    return result.data || null;
  },

  // Get items by jenis code (for jenis scan)
  getByJenis: async (kode_jenis: string): Promise<Item[]> => {
    const result = await fetchAPI<Item[]>(`/barang/jenis/${kode_jenis}`);
    return result.data || [];
  },

  // Create new item
  create: async (data: Omit<Item, "id" | "created_at">): Promise<Item> => {
    const result = await fetchAPI<Item>("/barang", {
      method: "POST",
      body: JSON.stringify(data),
    });
    return result.data!;
  },

  // Update item
  update: async (id: number, data: Partial<Item>): Promise<void> => {
    await fetchAPI(`/barang/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  },

  // Delete item
  delete: async (id: number): Promise<void> => {
    await fetchAPI(`/barang/${id}`, {
      method: "DELETE",
    });
  },
};

// Peminjaman API
export const peminjamanAPI = {
  // Get all borrowings
  getAll: async (status?: "Dipinjam" | "Sebagian Dikembalikan" | "Selesai"): Promise<Borrowing[]> => {
    const queryParams = status ? `?status_transaksi=${status}` : "";
    const result = await fetchAPI<Borrowing[]>(`/peminjaman${queryParams}`);
    return result.data || [];
  },

  // Get borrowing by code
  getByKode: async (kode: string): Promise<Borrowing | null> => {
    const result = await fetchAPI<Borrowing>(`/peminjaman/kode/${kode}`);
    return result.data || null;
  },

  // Create new borrowing with multiple items (NEW STRUCTURE)
  create: async (data: {
    nama_peminjam: string;
    kontak?: string | null;
    keperluan: string;
    guru_pendamping?: string | null;
    foto_credential?: string | null;
    signature?: string | null;
    items: Array<{ id_barang: number }>;
  }): Promise<any> => {
    const result = await fetchAPI<any>("/peminjaman", {
      method: "POST",
      body: JSON.stringify(data),
    });
    return result.data!;
  },

  // Return item (update detail_peminjaman)
  return: async (kode_peminjaman: string, id_detail_peminjaman: number, foto_bukti_kembali?: string | null): Promise<void> => {
    await fetchAPI(`/peminjaman/return/${kode_peminjaman}`, {
      method: "PUT",
      body: JSON.stringify({ id_detail_peminjaman, foto_bukti_kembali }),
    });
  },

  // Update borrowing
  update: async (id: number, data: Partial<Borrowing>): Promise<void> => {
    await fetchAPI(`/peminjaman/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  },

  // Delete borrowing
  delete: async (id: number): Promise<void> => {
    await fetchAPI(`/peminjaman/${id}`, {
      method: "DELETE",
    });
  },

  // Get statistics
  getStatistics: async (): Promise<{
    total_barang: number;
    total_peminjaman: number;
    active_peminjaman: number;
    completed_peminjaman: number;
    total_stok: number;
    total_dipinjam: number;
    total_tersedia: number;
  }> => {
    const result = await fetchAPI<any>("/peminjaman/statistics");
    return result.data!;
  },
};

// Admin API
export const adminAPI = {
  // Login
  login: async (username: string, password: string): Promise<{ token: string; admin: any }> => {
    const result = await fetchAPI<{ token: string; admin: any }>("/admin/login", {
      method: "POST",
      body: JSON.stringify({ username, password }),
    });
    return result.data!;
  },

  // Get all admins
  getAll: async (): Promise<{ id: number; username: string; nama_lengkap: string; created_at: string }[]> => {
    const result = await fetchAPI<{ id: number; username: string; nama_lengkap: string; created_at: string }[]>("/admin");
    return result.data || [];
  },

  // Get profile (requires token)
  getProfile: async (token: string): Promise<any> => {
    const result = await fetchAPI<any>("/admin/profile", {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    return result.data!;
  },

  // Create admin
  create: async (data: { username: string; nama_lengkap: string; password: string }): Promise<{ id: number; username: string; nama_lengkap: string; created_at: string }> => {
    const result = await fetchAPI<{ id: number; username: string; nama_lengkap: string; created_at: string }>("/admin", {
      method: "POST",
      body: JSON.stringify(data),
    });
    return result.data!;
  },

  // Update admin
  update: async (id: number, data: Partial<{ username: string; nama_lengkap: string }>): Promise<void> => {
    await fetchAPI(`/admin/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  },

  // Delete admin
  delete: async (id: number): Promise<void> => {
    await fetchAPI(`/admin/${id}`, {
      method: "DELETE",
    });
  },
};

// Upload API
export const uploadAPI = {
  // Upload image
  uploadImage: async (file: File): Promise<string> => {
    const formData = new FormData();
    formData.append("image", file);

    const url = `${API_BASE_URL}/upload/image`;

    const response = await fetch(url, {
      method: "POST",
      body: formData,
      mode: "cors",
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "Upload failed");
    }

    return data.data.url; // Return the URL
  },
};

// Jenis Barang API
export const jenisBarangAPI = {
  // Get all jenis barang
  getAll: async (): Promise<Array<{ id: number; kode_jenis: string; nama_jenis: string; deskripsi?: string; created_at: string }>> => {
    const result = await fetchAPI<Array<{ id: number; kode_jenis: string; nama_jenis: string; deskripsi?: string; created_at: string }>>("/jenis-barang");
    return result.data || [];
  },

  // Get jenis barang by ID
  getById: async (id: number): Promise<{ id: number; kode_jenis: string; nama_jenis: string; deskripsi?: string; created_at: string } | null> => {
    const result = await fetchAPI<{ id: number; kode_jenis: string; nama_jenis: string; deskripsi?: string; created_at: string }>(`/jenis-barang/${id}`);
    return result.data || null;
  },

  // Get jenis barang by kode
  getByKode: async (kode: string): Promise<{ id: number; kode_jenis: string; nama_jenis: string; deskripsi?: string; created_at: string } | null> => {
    const result = await fetchAPI<{ id: number; kode_jenis: string; nama_jenis: string; deskripsi?: string; created_at: string }>(`/jenis-barang/kode/${kode}`);
    return result.data || null;
  },

  // Create jenis barang
  create: async (data: { kode_jenis: string; nama_jenis: string; deskripsi?: string }): Promise<{ id: number; kode_jenis: string; nama_jenis: string; deskripsi?: string; created_at: string }> => {
    const result = await fetchAPI<{ id: number; kode_jenis: string; nama_jenis: string; deskripsi?: string; created_at: string }>("/jenis-barang", {
      method: "POST",
      body: JSON.stringify(data),
    });
    return result.data!;
  },

  // Update jenis barang
  update: async (id: number, data: Partial<{ kode_jenis: string; nama_jenis: string; deskripsi: string }>): Promise<void> => {
    await fetchAPI(`/jenis-barang/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  },

  // Delete jenis barang
  delete: async (id: number): Promise<void> => {
    await fetchAPI(`/jenis-barang/${id}`, {
      method: "DELETE",
    });
  },
};

// Guru API
export const guruAPI = {
  // Get all teachers
  getAll: async (): Promise<{ id: number; nip: string; name: string; created_at: string }[]> => {
    const result = await fetchAPI<{ id: number; nip: string; name: string; created_at: string }[]>("/guru");
    return result.data || [];
  },

  // Get teacher by ID
  getById: async (id: number): Promise<{ id: number; nip: string; name: string; created_at: string } | null> => {
    const result = await fetchAPI<{ id: number; nip: string; name: string; created_at: string }>(`/guru/${id}`);
    return result.data || null;
  },

  // Get teacher by NIP
  getByNip: async (nip: string): Promise<{ id: number; nip: string; name: string; created_at: string } | null> => {
    const result = await fetchAPI<{ id: number; nip: string; name: string; created_at: string }>(`/guru/nip/${nip}`);
    return result.data || null;
  },

  // Create teacher
  create: async (data: { nip: string; name: string }): Promise<{ id: number; nip: string; name: string; created_at: string }> => {
    const result = await fetchAPI<{ id: number; nip: string; name: string; created_at: string }>("/guru", {
      method: "POST",
      body: JSON.stringify(data),
    });
    return result.data!;
  },

  // Update teacher
  update: async (id: number, data: Partial<{ nip: string; name: string }>): Promise<void> => {
    await fetchAPI(`/guru/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  },

  // Delete teacher
  delete: async (id: number): Promise<void> => {
    await fetchAPI(`/guru/${id}`, {
      method: "DELETE",
    });
  },
};

// Siswa API
export const siswaAPI = {
  // Get all students
  getAll: async (): Promise<{ id: number; nis: string; name: string; kelas?: string; created_at: string }[]> => {
    const result = await fetchAPI<{ id: number; nis: string; name: string; kelas?: string; created_at: string }[]>("/siswa");
    return result.data || [];
  },

  // Get all kelas
  getAllKelas: async (): Promise<string[]> => {
    const result = await fetchAPI<string[]>("/siswa/all-kelas");
    return result.data || [];
  },

  // Get students by kelas
  getByKelas: async (kelas: string): Promise<{ id: number; nis: string; name: string; kelas: string; created_at: string }[]> => {
    const result = await fetchAPI<{ id: number; nis: string; name: string; kelas: string; created_at: string }[]>(`/siswa/kelas/${kelas}`);
    return result.data || [];
  },

  // Get student by ID
  getById: async (id: number): Promise<{ id: number; nis: string; name: string; kelas?: string; created_at: string } | null> => {
    const result = await fetchAPI<{ id: number; nis: string; name: string; kelas?: string; created_at: string }>(`/siswa/${id}`);
    return result.data || null;
  },

  // Get student by NIS
  getByNis: async (nis: string): Promise<{ id: number; nis: string; name: string; kelas?: string; created_at: string } | null> => {
    const result = await fetchAPI<{ id: number; nis: string; name: string; kelas?: string; created_at: string }>(`/siswa/nis/${nis}`);
    return result.data || null;
  },

  // Create student
  create: async (data: { nis: string; name: string; kelas: string }): Promise<{ id: number; nis: string; name: string; kelas: string; created_at: string }> => {
    const result = await fetchAPI<{ id: number; nis: string; name: string; kelas: string; created_at: string }>("/siswa", {
      method: "POST",
      body: JSON.stringify(data),
    });
    return result.data!;
  },

  // Update student
  update: async (id: number, data: Partial<{ nis: string; name: string; kelas: string }>): Promise<void> => {
    await fetchAPI(`/siswa/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  },

  // Delete student
  delete: async (id: number): Promise<void> => {
    await fetchAPI(`/siswa/${id}`, {
      method: "DELETE",
    });
  },
};

// Helper to check if backend is available
export const checkBackendConnection = async (): Promise<boolean> => {
  try {
    const response = await fetch(API_BASE_URL.replace("/api", ""), {
      mode: "cors",
    });
    return response.ok;
  } catch {
    return false;
  }
};