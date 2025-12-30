
import { GeoLocation } from '../types';

/**
 * Compresses an image file to a max width/height.
 * optimized for Mobile Memory: Uses createObjectURL instead of FileReader
 * to avoid loading massive Base64 strings into RAM.
 * 
 * Updated for High Quality: Defaults increased to 2500px / 0.9 quality.
 */
export const compressImage = (file: File, maxWidth = 2500, quality = 0.9): Promise<string> => {
  return new Promise((resolve, reject) => {
    // We removed the aggressive downsizing logic.
    // Now we respect the high quality defaults requested by the user.
    
    // 1. Use Object URL (Blob reference) instead of Data URL (Base64 string)
    const objectUrl = URL.createObjectURL(file);
    
    const img = new Image();
    img.src = objectUrl;

    img.onload = () => {
      // Clean up memory immediately after load
      URL.revokeObjectURL(objectUrl);

      const elem = document.createElement('canvas');
      let width = img.width;
      let height = img.height;

      // Calculate new dimensions only if it exceeds max width (2500px)
      if (width > maxWidth) {
        height = Math.round((height * maxWidth) / width);
        width = maxWidth;
      }

      elem.width = width;
      elem.height = height;
      
      const ctx = elem.getContext('2d');
      if (!ctx) {
         resolve(img.src); // Fallback
         return;
      }
      
      // Draw resized image
      ctx.drawImage(img, 0, 0, width, height);
      
      // Export as compressed JPEG
      resolve(elem.toDataURL('image/jpeg', quality));
    };

    img.onerror = (err) => {
        URL.revokeObjectURL(objectUrl);
        reject(err);
    };
  });
};

/**
 * Simulates EXIF extraction for the Demo.
 */
export const extractGPSFromImage = async (file: File, isDemo: boolean): Promise<GeoLocation | undefined> => {
   if (isDemo) {
       // Simulate parsing DJI Metadata
       await new Promise(r => setTimeout(r, 500)); 
       return {
           lat: 36.1699 + (Math.random() - 0.5) * 0.001,
           lng: -115.1398 + (Math.random() - 0.5) * 0.001,
           accuracy: 2, // Drone GPS is usually very accurate
           timestamp: file.lastModified
       };
   }
   return undefined;
};
