
'use server';

import { v2 as cloudinary } from 'cloudinary';

/**
 * @fileOverview Cloudinary Server Action for Secure Uploads.
 * Updated with latest master credentials for cloud: dwhkwiceh.
 */

// Configuration logic
if (process.env.CLOUDINARY_URL) {
  cloudinary.config({
    cloudinary_url: process.env.CLOUDINARY_URL,
    secure: true
  });
} else {
  // Hardcoded fallback for immediate production use
  cloudinary.config({
    cloud_name: 'dwhkwiceh',
    api_key: '483123493357221',
    api_secret: 'c4R2hTEJ08hRl9i_tMr52yhJV-M',
    secure: true,
  });
}

export async function uploadToCloudinary(base64Data: string, resourceType: 'image' | 'video' | 'raw' | 'auto' = 'auto') {
  try {
    // Cloudinary uploader automatically handles signing when configured correctly
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
