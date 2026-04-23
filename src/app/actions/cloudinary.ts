
'use server';

import { v2 as cloudinary } from 'cloudinary';

/**
 * @fileOverview Cloudinary Server Action for Secure Uploads.
 * UPDATED: Optimized for Vercel environments. Trims all keys and enforces secure signing.
 */

export async function uploadToCloudinary(base64Data: string, resourceType: 'image' | 'video' | 'raw' | 'auto' = 'auto') {
  // CLOUDINARY MASTER KEYS - Prioritize Vercel process environment
  const cloudName = (process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || 'dwhkwiceh').trim();
  const apiKey = (process.env.NEXT_PUBLIC_CLOUDINARY_API_KEY || '483123493357221').trim();
  const apiSecret = (process.env.CLOUDINARY_API_SECRET || 'c4R2hTEJ08hRl9i_tMr52yhJV-M').trim();

  if (!cloudName || !apiKey || !apiSecret) {
      console.error("Cloudinary Configuration Missing!");
      return { 
        success: false, 
        message: 'Master Sync Error: Cloudinary keys missing in server configuration.' 
      };
  }

  // Configure Cloudinary inside the action context for maximum stability
  cloudinary.config({
    cloud_name: cloudName,
    api_key: apiKey,
    api_secret: apiSecret,
    secure: true,
  });

  try {
    const uploadResponse = await cloudinary.uploader.upload(base64Data, {
      resource_type: resourceType,
      folder: 'ipay_chat_media',
    });

    return {
      success: true,
      url: uploadResponse.secure_url,
      publicId: uploadResponse.public_id,
      duration: uploadResponse.duration ? Math.round(uploadResponse.duration) : undefined,
    };
  } catch (error: any) {
    console.error('Cloudinary Master Action Error:', error.message);
    return { success: false, message: error.message || 'Media cloud handshake failed.' };
  }
}
