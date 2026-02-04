'use server';
import { v2 as cloudinary } from 'cloudinary';

// Cloudinary config is automatically picked up from the CLOUDINARY_URL environment variable.
// Ensure CLOUDINARY_URL is set in your .env file.

export async function uploadToCloudinary(fileDataUri: string, resourceType: 'auto' | 'image' | 'video' | 'raw' = 'auto') {
  try {
    const uploadResult = await cloudinary.uploader.upload(fileDataUri, {
      resource_type: resourceType,
    });
    return { success: true, url: uploadResult.secure_url, public_id: uploadResult.public_id };
  } catch (error: any) {
    console.error('Cloudinary Upload Error:', error);
    return { success: false, message: error.message || 'Failed to upload file.' };
  }
}
