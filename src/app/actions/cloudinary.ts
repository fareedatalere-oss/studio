
'use server';

import { v2 as cloudinary } from 'cloudinary';

/**
 * @fileOverview Cloudinary Server Action for Secure Uploads.
 * Hardened config logic to ensure signatures are valid across all environments.
 */

export async function uploadToCloudinary(base64Data: string, resourceType: 'image' | 'video' | 'raw' | 'auto' = 'auto') {
  // Verify credentials exist to provide a clear error message to the user
  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.NEXT_PUBLIC_CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;

  if (!cloudName || !apiKey || !apiSecret) {
      return { 
        success: false, 
        message: 'Cloudinary Error: Keys missing in Vercel settings (Cloud Name, API Key, or Secret).' 
      };
  }

  // Force configuration inside the action to ensure valid signing
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
    console.error('Cloudinary Upload Error Details:', error);
    return { success: false, message: error.message || 'Upload failed' };
  }
}
