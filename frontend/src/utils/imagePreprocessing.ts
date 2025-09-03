export interface PreprocessingOptions {
  contrast: number; // 0.5 to 2.0 (1.0 = no change)
  brightness: number; // -100 to 100
  noiseReduction: number; // 0 to 1 (0 = no reduction, 1 = maximum reduction)
  sharpen: number; // 0 to 1 (0 = no sharpening, 1 = maximum sharpening)
}

export interface PreprocessedImage {
  originalFile: File;
  processedBlob: Blob;
  processedUrl: string;
  preprocessingOptions: PreprocessingOptions;
}

/**
 * Default preprocessing options optimized for OMR sheets
 */
export const DEFAULT_OMR_PREPROCESSING: PreprocessingOptions = {
  contrast: 1.3,        // Increase contrast for better bubble detection
  brightness: 10,       // Slight brightness increase
  noiseReduction: 0.3,  // Moderate noise reduction
  sharpen: 0.4          // Moderate sharpening for clearer edges
};

/**
 * Preprocess an image for better OMR detection
 */
export async function preprocessImage(
  file: File, 
  options: PreprocessingOptions = DEFAULT_OMR_PREPROCESSING
): Promise<PreprocessedImage> {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();
    
    img.onload = () => {
      try {
        // Set canvas dimensions
        canvas.width = img.width;
        canvas.height = img.height;
        
        if (!ctx) {
          reject(new Error('Could not get canvas context'));
          return;
        }
        
        // Draw original image
        ctx.drawImage(img, 0, 0);
        
        // Get image data for pixel manipulation
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;
        
        // Apply preprocessing filters
        applyContrastAndBrightness(data, options.contrast, options.brightness);
        
        if (options.noiseReduction > 0) {
          applyNoiseReduction(data, canvas.width, canvas.height, options.noiseReduction);
        }
        
        if (options.sharpen > 0) {
          applySharpening(data, canvas.width, canvas.height, options.sharpen);
        }
        
        // Put processed image data back
        ctx.putImageData(imageData, 0, 0);
        
        // Convert to blob
        canvas.toBlob((blob) => {
          if (blob) {
            const processedUrl = URL.createObjectURL(blob);
            resolve({
              originalFile: file,
              processedBlob: blob,
              processedUrl,
              preprocessingOptions: options
            });
          } else {
            reject(new Error('Failed to create blob'));
          }
        }, 'image/jpeg', 0.9);
        
      } catch (error) {
        reject(error);
      }
    };
    
    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = URL.createObjectURL(file);
  });
}

/**
 * Apply contrast and brightness adjustments
 */
function applyContrastAndBrightness(
  data: Uint8ClampedArray, 
  contrast: number, 
  brightness: number
): void {
  const factor = (259 * (contrast * 255 + 255)) / (255 * (259 - contrast * 255));
  
  for (let i = 0; i < data.length; i += 4) {
    // Apply contrast and brightness to RGB channels
    for (let j = 0; j < 3; j++) {
      let value = data[i + j];
      value = factor * (value - 128) + 128 + brightness;
      data[i + j] = Math.max(0, Math.min(255, value));
    }
    // Alpha channel remains unchanged
  }
}

/**
 * Apply noise reduction using a simple median filter
 */
function applyNoiseReduction(
  data: Uint8ClampedArray, 
  width: number, 
  height: number, 
  intensity: number
): void {
  const tempData = new Uint8ClampedArray(data);
  const radius = Math.floor(intensity * 2) + 1;
  
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      
      // Collect neighboring pixel values
      const neighbors: number[][] = [[], [], []];
      
      for (let dy = -radius; dy <= radius; dy++) {
        for (let dx = -radius; dx <= radius; dx++) {
          const ny = y + dy;
          const nx = x + dx;
          
          if (ny >= 0 && ny < height && nx >= 0 && nx < width) {
            const nIdx = (ny * width + nx) * 4;
            for (let c = 0; c < 3; c++) {
              neighbors[c].push(tempData[nIdx + c]);
            }
          }
        }
      }
      
      // Apply median filter to RGB channels
      for (let c = 0; c < 3; c++) {
        neighbors[c].sort((a, b) => a - b);
        const median = neighbors[c][Math.floor(neighbors[c].length / 2)];
        const original = tempData[idx + c];
        
        // Blend original with median based on intensity
        data[idx + c] = Math.round(original * (1 - intensity) + median * intensity);
      }
    }
  }
}

/**
 * Apply sharpening using unsharp mask technique
 */
function applySharpening(
  data: Uint8ClampedArray, 
  width: number, 
  height: number, 
  intensity: number
): void {
  const tempData = new Uint8ClampedArray(data);
  
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const idx = (y * width + x) * 4;
      
      for (let c = 0; c < 3; c++) {
        // Get surrounding pixel values
        const center = tempData[idx + c];
        const top = tempData[((y - 1) * width + x) * 4 + c];
        const bottom = tempData[((y + 1) * width + x) * 4 + c];
        const left = tempData[(y * width + (x - 1)) * 4 + c];
        const right = tempData[(y * width + (x + 1)) * 4 + c];
        
        // Calculate sharpening value
        const sharpValue = center * 5 - top - bottom - left - right;
        const sharpened = Math.max(0, Math.min(255, center + sharpValue * intensity * 0.1));
        
        data[idx + c] = Math.round(sharpened);
      }
    }
  }
}

/**
 * Clean up object URLs to prevent memory leaks
 */
export function cleanupImageUrl(url: string): void {
  URL.revokeObjectURL(url);
}

/**
 * Get preprocessing preset for different image qualities
 */
export function getPreprocessingPreset(imageQuality: 'low' | 'medium' | 'high'): PreprocessingOptions {
  switch (imageQuality) {
    case 'low':
      return {
        contrast: 1.8,
        brightness: 25,
        noiseReduction: 0.7,
        sharpen: 0.8
      };
    case 'medium':
      return DEFAULT_OMR_PREPROCESSING;
    case 'high':
      return {
        contrast: 1.1,
        brightness: 5,
        noiseReduction: 0.1,
        sharpen: 0.2
      };
    default:
      return DEFAULT_OMR_PREPROCESSING;
  }
}
