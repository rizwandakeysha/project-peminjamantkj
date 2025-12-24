import imageCompression from 'browser-image-compression';
import { toast as toastFn } from 'sonner';

/**
 * Compress image before upload to Telegram
 * Max Size: 1MB
 * Format: JPEG (better Telegram compatibility)
 * Max Dimensions: 1280px
 */
export async function compressImage(file: File): Promise<File> {
  try {
    const options = {
      maxSizeMB: 1,
      maxWidthOrHeight: 1280,
      useWebWorker: true,
      fileType: 'image/jpeg',
    };

    const compressedFile = await imageCompression(file, options);
    return compressedFile;
  } catch (error) {
    console.error('Error compressing image:', error);
    toastFn.error('Error mengompres gambar');
    throw error;
  }
}

/**
 * Upload compressed image to Telegram via backend
 * Stores only file_id in database
 */
export async function uploadPhotoToTelegram(
  file: File,
  idBarang: number,
  apiUrl: string
): Promise<{ id_barang: number; foto_barang: string }> {
  try {
    // Compress image first
    const compressedFile = await compressImage(file);

    // Create FormData for upload
    const formData = new FormData();
    formData.append('photo', compressedFile);
    formData.append('id_barang', idBarang.toString());

    // Upload to backend Telegram endpoint
    const response = await fetch(`${apiUrl}/telegram/upload`, {
      method: 'POST',
      body: formData,
    });

    const data = await response.json();

    if (!response.ok || !data.success) {
      throw new Error(data.message || 'Upload gagal');
    }

    toastFn.success('Foto berhasil diupload!');
    return data.data;
  } catch (error) {
    console.error('Error uploading photo:', error);
    toastFn.error('Error mengupload foto');
    throw error;
  }
}

/**
 * Upload compressed credential photo to Telegram via backend
 * Returns only file_id (no database update)
 */
export async function uploadCredentialToTelegram(
  file: File,
  apiUrl: string
): Promise<string> {
  try {
    // Compress image first
    const compressedFile = await compressImage(file);

    // Create FormData for upload
    const formData = new FormData();
    formData.append('photo', compressedFile);

    // Upload to backend Telegram endpoint
    const response = await fetch(`${apiUrl}/telegram/upload-credential`, {
      method: 'POST',
      body: formData,
    });

    const data = await response.json();

    if (!response.ok || !data.success) {
      throw new Error(data.message || 'Upload credential gagal');
    }

    toastFn.success('Foto kredensial berhasil diupload!');
    return data.data.foto_credential;
  } catch (error) {
    console.error('Error uploading credential photo:', error);
    toastFn.error('Error mengupload foto kredensial');
    throw error;
  }
}

/**
 * Build proxy URL for displaying Telegram photo
 * Images accessed through backend proxy for permanent access
 */
export function getPhotoUrl(fileId: string | null, apiUrl: string): string {
  if (!fileId) {
    return 'https://images.unsplash.com/photo-1581092160562-40aa08e78837?w=400';
  }

  // If database still contains a full URL, just use it as-is.
  if (fileId.startsWith('http://') || fileId.startsWith('https://')) {
    return fileId;
  }

  // Check if it's already a Telegram file_id (not base64)
  if (fileId.startsWith('data:')) {
    return fileId; // Fallback for old base64 images
  }

  return `${apiUrl}/telegram/photo/${fileId}`;
}
