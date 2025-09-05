import React from 'react';
import type { OMRResponse } from '../../types/omr';
import type { TestData } from '../../types/test';

interface EditableAnswersProps {
    responses: OMRResponse[];
    testData: TestData | null;
    onResponseChange: (questionIndex: number, newAnswer: 'A' | 'B' | 'C' | 'D' | null) => void;
}

const EditableAnswers: React.FC<EditableAnswersProps> = ({ responses, testData, onResponseChange }) => {
    const questions = testData?.questions || [];
    // Sort responses by questionNumber to ensure ascending order
    const sortedResponses = [...responses].sort((a, b) => a.questionNumber - b.questionNumber);

    console.log('Sorted responses:', sortedResponses);

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl md:text-2xl font-semibold text-delft-blue">AI Extracted Results</h2>
            </div>
            <div className="max-h-[500px] overflow-y-auto">
                <div className="grid grid-cols-5 gap-2 mb-4 text-sm font-medium text-gray-600">
                    <div>Q# (ID)</div>
                    <div>A</div>
                    <div>B</div>
                    <div>C</div>
                    <div>D</div>
                </div>
                {questions.sort((a, b) => a.questionNumber - b.questionNumber).map((question, index) => {
                    const response = sortedResponses.find(r => r.questionNumber === question.questionNumber) || { selectedAnswer: null };
                    return (
                        <div key={index} className="grid grid-cols-5 gap-2 mb-2 items-center">
                            <div className="text-sm font-medium text-gray-700 truncate">
                                {question.questionNumber.toString().padStart(3, '0')} ({question.questionId.slice(0, 8)}...)
                            </div>
                            {(['A', 'B', 'C', 'D'] as const).map((option) => (
                                <button
                                    key={option}
                                    onClick={() => onResponseChange(index, option)}
                                    className={`w-8 h-8 rounded-full border-2 transition-all ${response.selectedAnswer === option
                                        ? 'bg-burnt-sienna border-burnt-sienna text-white'
                                        : 'border-cambridge-blue hover:border-delft-blue hover:bg-sunset/20'
                                        }`}
                                >
                                    {response.selectedAnswer === option ? '✓' : ''}
                                </button>
                            ))}
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default EditableAnswers;
