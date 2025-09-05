import React from 'react';
import type { OMRData } from '../../types/omr';

interface SessionSummaryProps {
    currentOMRData: OMRData | null;
    omrData: OMRData;
}

const SessionSummary: React.FC<SessionSummaryProps> = ({ currentOMRData, omrData }) => {
    return (
        <div className="bg-white rounded-xl shadow-lg p-4 md:p-6 mt-8">
            <h3 className="text-lg md:text-xl font-semibold text-delft-blue mb-4">Session Summary</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
                <div className="text-center">
                    <p className="text-xl md:text-2xl font-bold text-burnt-sienna">
                        {(currentOMRData?.studentResponses || omrData.studentResponses).length}
                    </p>
                    <p className="text-sm text-gray-600">Students</p>
                </div>
                <div className="text-center">
                    <p className="text-xl md:text-2xl font-bold text-cambridge-blue">
                        {(currentOMRData?.answerKey.answers || omrData.answerKey.answers).length}
                    </p>
                    <p className="text-sm text-gray-600">Questions</p>
                </div>
                <div className="text-center">
                    <p className="text-xl md:text-2xl font-bold text-delft-blue">
                        {(currentOMRData?.createdAt || omrData.createdAt).toLocaleDateString()}
                    </p>
                    <p className="text-sm text-gray-600">Created</p>
                </div>
                <div className="text-center">
                    <p className="text-xl md:text-2xl font-bold text-sunset">
                        {(currentOMRData?.sessionId || omrData.sessionId).split('-')[1]}
                    </p>
                    <p className="text-sm text-gray-600">Session ID</p>
                </div>
            </div>
        </div>
    );
};

export default SessionSummary;
