import React from 'react';
import type { OMRResponse } from '../../types/omr';

interface AnswerKeyViewerProps {
    imageFile: File | null;
    imageUrl?: string;
    responses: OMRResponse[];
}

const AnswerKeyViewer: React.FC<AnswerKeyViewerProps> = ({ imageFile, imageUrl }) => {
    return (
        <div className="bg-white rounded-xl shadow-lg p-4 md:p-6 mb-8">
            <h2 className="text-lg md:text-xl font-semibold text-delft-blue mb-4">Answer Key</h2>
            <div className="w-full h-[300px] md:h-[400px] overflow-auto">
                {imageUrl ? (
                    <img
                        src={imageUrl}
                        alt="Answer Key"
                        className="w-full h-auto object-contain"
                    />
                ) : imageFile && imageFile.size > 0 ? (
                    <img
                        src={URL.createObjectURL(imageFile)}
                        alt="Answer Key"
                        className="w-full h-auto object-contain"
                    />
                ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gray-200 text-gray-400">
                        No answer key image
                    </div>
                )}
            </div>
        </div>
    );
};

export default AnswerKeyViewer;
