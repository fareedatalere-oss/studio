
'use server';

import { v2 as cloudinary } from 'cloudinary';

/**
 * @fileOverview Cloudinary Server Action for Secure Uploads.
 * Configured with dqgzgak0e cloud name and user secret.
 */

cloudinary.config({
  cloud_name: 'dqgzgak0e',
  api_key: '544592771214677',
  api_secret: process.env.CLOUDINARY_API_SECRET, // Must be set in environment for security
});

export async function uploadToCloudinary(base64Data: string, resourceType: 'image' | 'video' | 'raw' | 'auto' = 'auto') {
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
    console.error('Cloudinary Upload Error:', error);
    return { success: false, message: error.message || 'Upload failed' };
  }
}
