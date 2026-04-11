
'use server';

import { v2 as cloudinary } from 'cloudinary';

/**
 * @fileOverview Cloudinary Server Action for Secure Uploads.
 * Configured to strictly use environment variables for production.
 */

// Verify credentials exist to provide a clear error message to the user
const isConfigured = !!(
  process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME &&
  process.env.NEXT_PUBLIC_CLOUDINARY_API_KEY &&
  process.env.CLOUDINARY_API_SECRET
);

if (isConfigured) {
  cloudinary.config({
    cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
    api_key: process.env.NEXT_PUBLIC_CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true,
  });
}

export async function uploadToCloudinary(base64Data: string, resourceType: 'image' | 'video' | 'raw' | 'auto' = 'auto') {
  if (!isConfigured) {
      return { 
        success: false, 
        message: 'Cloudinary Error: Keys missing in Vercel settings (Cloud Name, API Key, or Secret).' 
      };
  }

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
    console.error('Cloudinary Upload Error Details:', error);
    return { success: false, message: error.message || 'Upload failed' };
  }
}
