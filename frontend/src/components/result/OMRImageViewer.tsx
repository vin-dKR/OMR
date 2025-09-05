import React from 'react';
import type { OMRResponse } from '../../types/omr';

interface OMRImageViewerProps {
    imageFile: File | null;
    imageUrl?: string;
    title: string;
    responses: OMRResponse[];
}

const OMRImageViewer: React.FC<OMRImageViewerProps> = ({ imageFile, imageUrl, title }) => {
    return (
        <div className="bg-white rounded-xl shadow-lg p-4 md:p-6">
            <h2 className="text-lg md:text-xl font-semibold text-delft-blue mb-4">{title}</h2>
            <div className="w-full h-[400px] md:h-[500px] overflow-auto">
                {imageUrl ? (
                    <img
                        src={imageUrl}
                        alt={title}
                        className="w-full h-auto object-contain"
                    />
                ) : imageFile && imageFile.size > 0 ? (
                    <img
                        src={URL.createObjectURL(imageFile)}
                        alt={title}
                        className="w-full h-auto object-contain"
                    />
                ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gray-200 text-gray-400">
                        No image uploaded
                    </div>
                )}
            </div>
        </div>
    );
};

export default OMRImageViewer;
