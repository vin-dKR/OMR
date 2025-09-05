import React from 'react';

interface ProcessingProgressProps {
    processingStep: string;
    processingProgress: number;
}

const ProcessingProgress: React.FC<ProcessingProgressProps> = ({ processingStep, processingProgress }) => {
    return (
        <div className="bg-white rounded-xl shadow-lg p-4 md:p-6 border-2 border-cambridge-blue mb-8">
            <h3 className="text-lg md:text-xl font-semibold text-delft-blue mb-4">Processing Progress</h3>
            <div className="space-y-4">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-2">
                    <span className="text-sm text-gray-600">{processingStep}</span>
                    <span className="text-sm font-medium text-delft-blue">{processingProgress}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3">
                    <div
                        className="bg-cambridge-blue h-3 rounded-full transition-all duration-300"
                        style={{ width: `${processingProgress}%` }}
                    ></div>
                </div>
            </div>
        </div>
    );
};

export default ProcessingProgress;
