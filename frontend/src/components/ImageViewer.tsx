import { useState, useEffect } from 'react';

interface ImageViewerProps {
  imageFile: File | null;
  imageUrl?: string;
  title: string;
  responses?: Array<{
    questionNumber: number;
    selectedAnswer: 'A' | 'B' | 'C' | 'D' | null;
    confidence: number;
  }>;
  onImageLoad?: () => void;
}

const ImageViewer: React.FC<ImageViewerProps> = ({
  imageFile,
  imageUrl,
  title,
  responses = [],
  onImageLoad
}) => {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [displayUrl, setDisplayUrl] = useState<string>('');

  // Handle image loading
  useEffect(() => {
    if (imageFile) {
      const url = URL.createObjectURL(imageFile);
      setDisplayUrl(url);
      return () => URL.revokeObjectURL(url);
    } else if (imageUrl) {
      setDisplayUrl(imageUrl);
    }
  }, [imageFile, imageUrl]);

  // Handle image load
  const handleImageLoad = () => {
    setImageLoaded(true);
    onImageLoad?.();
  };

  return (
    <div className="bg-white rounded-xl shadow-lg p-6">
      <div className="mb-4">
        <h2 className="text-2xl font-semibold text-delft-blue">
          {title}
        </h2>
      </div>

      {/* Image Container */}
      <div className="relative bg-gray-100 rounded-lg overflow-hidden border-2 border-gray-300">
        {displayUrl ? (
          <>
            <img
              src={displayUrl}
              alt={title}
              className="w-full h-auto max-h-[600px] object-contain"
              onLoad={handleImageLoad}
            />
            
          </>
        ) : (
          <div className="flex items-center justify-center h-64 text-gray-500">
            <div className="text-center">
              <p className="text-lg mb-2">📄 No image available</p>
              <p className="text-sm">Upload an image to see preview</p>
            </div>
          </div>
        )}
      </div>

      {/* Image Info */}
      {imageLoaded && (
        <div className="mt-4 p-3 bg-sunset/20 rounded-lg">
          <div className="flex justify-between items-center text-sm text-gray-600">
            <span>
              {imageFile?.name || 'Image loaded'}
            </span>
            <span>
              {responses.length > 0 ? `${responses.length} questions detected` : 'No responses'}
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

export default ImageViewer;
