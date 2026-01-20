/// <reference types="vite/client" />
import { toast } from 'react-hot-toast';
import { supabase } from './supabaseClient';

const API_BASE_URL = 
  import.meta.env.VITE_API_URL || 
  "https://project-peminjamantkj.onrender.com/api";

const SUPABASE_BUCKET = import.meta.env.VITE_SUPABASE_STORAGE_BUCKET || 'uploads';

function getPublicUrl(path: string): string {
  const { data } = supabase.storage.from(SUPABASE_BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

function makeObjectPath(file: File): string {
  const ext = file.name.split('.').pop() || 'jpg';
  const safeExt = ext.replace(/[^a-zA-Z0-9]/g, '').slice(0, 8) || 'jpg';
  return `images/${Date.now()}-${crypto.randomUUID()}.${safeExt}`;
}

/**
 * Upload gambar ke Supabase Storage via backend server
 * Lebih aman dan tidak expose credentials ke browser
 */
export async function uploadImageToSupabase(file: File): Promise<string> {
  try {
    // Prefer direct-to-Supabase upload when configured
    if (import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY) {
      const objectPath = makeObjectPath(file);
      const { error } = await supabase.storage
        .from(SUPABASE_BUCKET)
        .upload(objectPath, file, {
          cacheControl: '3600',
          upsert: false,
          contentType: file.type || undefined,
        });

      if (error) throw error;
      return getPublicUrl(objectPath);
    }

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
    // If direct storage is configured, delete directly (best-effort)
    if (import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY) {
      // url format: .../storage/v1/object/public/<bucket>/<path>
      const marker = `/storage/v1/object/public/${SUPABASE_BUCKET}/`;
      const idx = url.indexOf(marker);
      if (idx !== -1) {
        const objectPath = url.slice(idx + marker.length);
        await supabase.storage.from(SUPABASE_BUCKET).remove([objectPath]);
        return;
      }
    }

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

