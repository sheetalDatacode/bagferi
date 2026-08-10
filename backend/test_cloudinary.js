import { uploadToCloudinary } from './utils/cloudinary.util.js';
import dotenv from 'dotenv';

dotenv.config();

const testUpload = async () => {
  try {
    console.log('Testing Cloudinary upload with config:', {
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY ? 'Present' : 'Missing',
      api_secret: process.env.CLOUDINARY_API_SECRET ? 'Present' : 'Missing',
    });
    
    // A 1x1 transparent pixel GIF buffer
    const gifBuffer = Buffer.from(
      'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
      'base64'
    );
    
    console.log('Uploading test image buffer...');
    const result = await uploadToCloudinary(gifBuffer, 'test_category');
    console.log('✅ Upload Success:', result);
  } catch (error) {
    console.error('❌ Upload Failed:', error);
  }
};

testUpload();
