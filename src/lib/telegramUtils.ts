import imageCompression from 'browser-image-compression';
import { toast as toastFn } from 'sonner';

/**
 * Compress image before upload to Telegram
 * Max Size: 1MB
 * Format: WebP
 * Max Dimensions: 1280px
 */
export async function compressImage(file: File): Promise<File> {
  try {
    const options = {
      maxSizeMB: 1,
      maxWidthOrHeight: 1280,
      useWebWorker: true,
      fileType: 'image/webp',
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
 * Build proxy URL for displaying Telegram photo
 * Images accessed through backend proxy for permanent access
 */
export function getPhotoUrl(fileId: string | null, apiUrl: string): string {
  if (!fileId) {
    return 'https://images.unsplash.com/photo-1581092160562-40aa08e78837?w=400';
  }

  // Check if it's already a Telegram file_id (not base64)
  if (fileId.startsWith('data:')) {
    return fileId; // Fallback for old base64 images
  }

  return `${apiUrl}/telegram/photo/${fileId}`;
}
