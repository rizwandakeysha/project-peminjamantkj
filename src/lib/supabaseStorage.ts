/// <reference types="vite/client" />
import { toast } from 'react-hot-toast';

const API_BASE_URL = 
  import.meta.env.VITE_API_URL || 
  "https://project-peminjamantkj.onrender.com/api";

/**
 * Upload gambar ke Supabase Storage via backend server
 * Lebih aman dan tidak expose credentials ke browser
 */
export async function uploadImageToSupabase(file: File): Promise<string> {
  try {
    // 1. Prepare form data
    const formData = new FormData();
    formData.append('image', file);

    // 2. Upload via backend
    const response = await fetch(`${API_BASE_URL}/upload/image`, {
      method: 'POST',
      body: formData,
      // Don't set Content-Type header, browser will set it automatically with boundary
    });

    const data = await response.json();

    if (!response.ok || !data.success) {
      throw new Error(data.message || 'Upload gagal');
    }

    console.log(`Upload berhasil: ${(file.size / 1024).toFixed(2)}KB`);
    return data.data.url;
  } catch (error) {
    console.error('Upload to Supabase failed:', error);
    throw error;
  }
}

/**
 * Delete gambar dari Supabase Storage via backend
 */
export async function deleteImageFromSupabase(url: string): Promise<void> {
  try {
    // Extract filename from URL
    const fileName = url.split('/').pop();
    if (!fileName) return;

    const response = await fetch(`${API_BASE_URL}/upload/image/${fileName}`, {
      method: 'DELETE',
    });

    const data = await response.json();

    if (!response.ok || !data.success) {
      console.error('Delete error:', data.message);
    }
  } catch (error) {
    console.error('Failed to delete image:', error);
  }
}

/**
 * Check apakah string adalah Base64 atau URL
 */
export function isBase64Image(str: string): boolean {
  return str.startsWith('data:image/');
}

/**
 * Get image source - backward compatible dengan base64
 */
export function getImageSrc(photoData: string | null | undefined): string | undefined {
  if (!photoData) return undefined;
  
  // Jika base64, return langsung
  if (isBase64Image(photoData)) {
    return photoData;
  }
  
  // Jika URL, return langsung
  return photoData;
}

