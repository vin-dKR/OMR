import React from 'react';
import type { OMRData } from '../../types/omr';

interface HeaderProps {
    sessionId: string;
    isProcessing: boolean;
    processingStep: string;
    processingProgress: number;
    currentOMRData: OMRData | null;
    onBackToInput: () => void;
}

const Header: React.FC<HeaderProps> = ({ sessionId, isProcessing, processingStep, processingProgress, currentOMRData, onBackToInput }) => {
    return (
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
            <div>
                <h1 className="text-3xl md:text-4xl font-bold text-delft-blue">OMR Results</h1>
                <p className="text-base md:text-lg text-cambridge-blue mt-1">Session: {sessionId}</p>
                {isProcessing && (
                    <div className="flex items-center gap-2 mt-2">
                        <div className="w-3 h-3 bg-yellow-500 rounded-full animate-pulse"></div>
                        <span className="text-sm text-yellow-600">{processingStep} ({processingProgress}%)</span>
                    </div>
                )}
                {currentOMRData?.isProcessing && !isProcessing && (
                    <div className="flex items-center gap-2 mt-2">
                        <div className="w-3 h-3 bg-yellow-500 rounded-full animate-pulse"></div>
                        <span className="text-sm text-yellow-600">
                            Processing images in background... (
                            {currentOMRData.studentResponses.filter((s) => !s.isProcessing).length}/
                            {currentOMRData.studentResponses.length} completed)
                        </span>
                    </div>
                )}
            </div>
            <button
                onClick={onBackToInput}
                className="px-4 py-2 md:px-6 md:py-3 bg-cambridge-blue text-white rounded-lg hover:bg-delft-blue transition-colors w-full md:w-auto"
            >
                ← Back to Input
            </button>
        </div>
    );
};

export default Header;
