import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTestContext } from '../contexts/TestContext';
import type { OMRData, OMRResponse } from '../types/omr';
import { getAllOMRSessions, saveProcessingHistory } from '../utils/storage';
import { processOMRWithOpenAI } from '../utils/openai';
import { processOMRWithGemini } from '../utils/gemini';
import type { GeminiConfig } from '../utils/gemini';
import Header from './result/Header';
import ProcessingProgress from './result/ProcessingProgress';
import StudentList from './result/StudentList';
import StudentInfoForm from './result/StudentInfoForm';
import OMRImageViewer from './result/OMRImageViewer';
import EditableAnswers from './result/EditableAnswers';
import SubmitVerifiedButton from './result/SubmitVerifiedButton';
import SessionSummary from './result/SessionSummary';
import type { OpenAIConfig } from '../types/openai';

interface ProcessingData {
    sessionId: string;
    answerKey: {
        name: string;
        type: string;
        data: string;
    };
    studentFiles: Array<{
        name: string;
        type: string;
        data: string;
    }>;
    openAIConfig: OpenAIConfig;
    geminiConfig: GeminiConfig;
    selectedProvider: 'openai' | 'gemini';
    createdAt: Date;
}

interface ResultsPageProps {
    omrData: OMRData;
    onBackToInput: () => void;
}

interface StudentInfo {
    name: string;
    className: string;
    rollNumber: string;
}

const ResultsPage: React.FC<ResultsPageProps> = ({ omrData, onBackToInput }) => {
    const navigate = useNavigate();
    const location = useLocation();
    const { testData, submitVerifiedAnswers } = useTestContext();
    const [selectedStudent, setSelectedStudent] = useState(0);
    const [editableResponses, setEditableResponses] = useState<OMRResponse[]>([]);
    const [studentInfos, setStudentInfos] = useState<StudentInfo[]>([]);
    const [isProcessing, setIsProcessing] = useState(false);
    const [processingStep, setProcessingStep] = useState<string>('');
    const [processingProgress, setProcessingProgress] = useState<number>(0);
    const [currentOMRData, setCurrentOMRData] = useState<OMRData | null>(null);
    const [base64Images, setBase64Images] = useState<{
        answerKey: string;
        studentFiles: string[];
    } | null>(null);

    const processingData = location.state as ProcessingData;
    console.log("processingData ................", editableResponses)

    useEffect(() => {
        if (processingData && !currentOMRData) {
            startProcessing();
        }
    }, [processingData, currentOMRData]);

    useEffect(() => {
        // Load persisted student infos from localStorage
        const savedInfos = localStorage.getItem('studentInfos');
        if (savedInfos) {
            setStudentInfos(JSON.parse(savedInfos));
        } else if (currentOMRData) {
            setStudentInfos(
                currentOMRData.studentResponses.map((student) => ({
                    name: student.name,
                    className: '',
                    rollNumber: '',
                }))
            );
        }
    }, [currentOMRData]);

    useEffect(() => {
        // Persist student infos to localStorage
        if (studentInfos.length > 0) {
            localStorage.setItem('studentInfos', JSON.stringify(studentInfos));
        }
    }, [studentInfos]);

    const startProcessing = async () => {
        if (!processingData || isProcessing || !testData) {
            console.error('Missing required data:', { processingData, isProcessing, testData });
            alert('Missing required data for processing');
            return;
        }

        setIsProcessing(true);
        setProcessingStep('Initializing processing...');
        setProcessingProgress(5);

        try {
            // Initialize OMR data without answer key image
            const initialOMRData = {
                answerKey: {
                    answers: testData.questions.map((q) => ({
                        questionNumber: q.questionNumber,
                        questionId: q.questionId,
                        selectedAnswer: q.correctAnswer || null, // Use correctAnswer from testData
                        confidence: 1.0,
                    })),
                    processedAt: new Date(),
                },
                studentResponses: processingData.studentFiles.map((file, index) => ({
                    id: `student-${index + 1}`,
                    name: `Student ${index + 1}`,
                    imageFile: new File([], file.name),
                    responses: [],
                    processedAt: new Date(),
                    isProcessing: true,
                })),
                sessionId: processingData.sessionId,
                createdAt: processingData.createdAt,
                isProcessing: true,
            };

            // Validate base64 images for student files
            const base64Data = {
                studentFiles: processingData.studentFiles.map((f) => f.data),
            };
            if (base64Data.studentFiles.some(file => !file || typeof file !== 'string')) {
                console.error('Invalid base64 data for student files:', base64Data.studentFiles);
                throw new Error('Missing or invalid image data in student files');
            }
            setBase64Images(base64Data);
            setCurrentOMRData(initialOMRData);
            setProcessingStep('Processing student response sheets...');
            setProcessingProgress(10);

            // Process student responses
            const updatedStudentResponses = [];
            for (let i = 0; i < processingData.studentFiles.length; i++) {
                const studentFile = processingData.studentFiles[i];
                setProcessingStep(`Processing student ${i + 1} of ${processingData.studentFiles.length}...`);
                setProcessingProgress(10 + ((i + 1) / processingData.studentFiles.length) * 80);

                let studentData;
                if (processingData.selectedProvider === 'openai') {
                    const studentRequest = {
                        answerKeyImage: '',
                        studentResponseImages: [studentFile.data],
                        preprocessingOptions: { contrast: 1.0, brightness: 0, noiseReduction: 0, sharpen: 0 },
                    };
                    const response = await processOMRWithOpenAI(studentRequest, processingData.openAIConfig);
                    if (response.success && response.data) {
                        studentData = response.data.studentResponses[0].responses;
                    } else {
                        throw new Error(`OpenAI student processing failed for student ${i + 1}: ` + response.error);
                    }
                } else {
                    const cleanStudentImage = studentFile.data.replace(/^data:image\/[a-z]+;base64,/, '');
                    if (!cleanStudentImage) {
                        console.error('Invalid student image base64:', studentFile.data);
                        throw new Error(`Invalid student image data for student ${i + 1}`);
                    }
                    console.log('Sending student image base64 (first 50 chars):', cleanStudentImage.slice(0, 50));
                    const studentRequest = { image: cleanStudentImage };
                    const response = await processOMRWithGemini(studentRequest, processingData.geminiConfig);
                    if (response.success && response.data) {
                        studentData = response.data.answers;
                    } else {
                        throw new Error(`Gemini student processing failed for student ${i + 1}: ` + response.error);
                    }
                }

                const studentResponse = {
                    id: `student-${i + 1}`,
                    name: studentInfos[i]?.name || `Student ${i + 1}`,
                    imageFile: new File([], studentFile.name),
                    responses: testData.questions.map((q) => ({
                        questionNumber: q.questionNumber,
                        questionId: q.questionId,
                        selectedAnswer: studentData ? studentData[q.questionNumber.toString()] || null : null,
                        confidence: 0.8,
                    })),
                    processedAt: new Date(),
                    isProcessing: false,
                };
                updatedStudentResponses.push(studentResponse);

                await new Promise((resolve) => setTimeout(resolve, 1000));
            }

            const finalOMRData = {
                ...initialOMRData,
                answerKey: initialOMRData.answerKey,
                studentResponses: updatedStudentResponses,
                isProcessing: false,
            };

            setCurrentOMRData(finalOMRData);
            setProcessingStep('Saving results...');
            setProcessingProgress(95);

            saveProcessingHistory(processingData.sessionId, finalOMRData);
            const sessions = getAllOMRSessions();
            const updatedSessions = [
                ...sessions,
                {
                    sessionId: processingData.sessionId,
                    timestamp: processingData.createdAt.toISOString(),
                    totalImages: processingData.studentFiles.length,
                    summary: {
                        totalStudents: processingData.studentFiles.length,
                        totalQuestions: testData.questions.length,
                    },
                },
            ];
            localStorage.setItem('omrSessions', JSON.stringify(updatedSessions));

            setProcessingStep('Processing complete!');
            setProcessingProgress(100);

            if (updatedStudentResponses.length > 0) {
                setEditableResponses(updatedStudentResponses[0].responses);
            }

            if (studentInfos.length === 0) {
                setStudentInfos(
                    updatedStudentResponses.map((student, index) => ({
                        name: index === 0 ? 'Alice Johnson' : `Student ${index + 1}`,
                        className: index === 0 ? 'Class 10A' : '',
                        rollNumber: index === 0 ? 'STU001' : '',
                    }))
                );
            }
        } catch (error) {
            console.error('Processing failed:', error);
            setProcessingStep('Processing failed');
            alert(`Processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        } finally {
            setIsProcessing(false);
        }
    };

    const handleResponseChange = (questionIndex: number, newAnswer: 'A' | 'B' | 'C' | 'D' | null) => {
        const updatedResponses = [...editableResponses];
        updatedResponses[questionIndex] = {
            ...updatedResponses[questionIndex],
            selectedAnswer: newAnswer,
        };
        setEditableResponses(updatedResponses);
    };

    const handleStudentChange = (studentIndex: number) => {
        setSelectedStudent(studentIndex);
        setEditableResponses(currentOMRData?.studentResponses[studentIndex]?.responses || []);
    };

    const handleStudentInfoChange = (field: keyof StudentInfo, value: string) => {
        const updatedInfos = [...studentInfos];
        updatedInfos[selectedStudent] = {
            ...updatedInfos[selectedStudent],
            [field]: value,
        };
        setStudentInfos(updatedInfos);
    };

    const handleSubmitVerifiedAnswers = async () => {
        if (!testData || !currentOMRData) return;

        try {
            const currentStudentInfo = studentInfos[selectedStudent];
            const payload = {
                testId: testData.id,
                name: currentStudentInfo.name,
                rollNumber: currentStudentInfo.rollNumber,
                className: currentStudentInfo.className,
                answers: editableResponses.map((response) => ({
                    questionId: response.questionId,
                    selectedAnswer: response.selectedAnswer || '',
                })),
            };
            await submitVerifiedAnswers(payload);
            alert('Verified answers submitted successfully!');
        } catch (error: any) {
            alert(error.message || 'Failed to submit verified answers');
        }
    };

    const handleBackToInput = () => {
        onBackToInput();
        navigate('/');
    };

    const currentStudent = currentOMRData?.studentResponses[selectedStudent] || omrData.studentResponses[selectedStudent];
    const currentStudentInfo = studentInfos[selectedStudent] || { name: '', className: '', rollNumber: '' };

    return (
        <div className="min-h-screen bg-eggshell p-6">
            <div className="max-w-7xl mx-auto">
                hii
                <Header
                    sessionId={currentOMRData?.sessionId || omrData.sessionId}
                    isProcessing={isProcessing}
                    processingStep={processingStep}
                    processingProgress={processingProgress}
                    currentOMRData={currentOMRData}
                    onBackToInput={handleBackToInput}
                />
                {isProcessing && (
                    <ProcessingProgress
                        processingStep={processingStep}
                        processingProgress={processingProgress}
                    />
                )}
                <div className="flex flex-col lg:flex-row gap-8">
                    <div className="w-full lg:w-64 flex-shrink-0">
                        <StudentList
                            students={currentOMRData?.studentResponses || omrData.studentResponses}
                            selectedStudent={selectedStudent}
                            onStudentChange={handleStudentChange}
                            base64Images={base64Images}
                        />
                    </div>
                    <div className="flex-1">
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
                            <OMRImageViewer
                                imageFile={base64Images ? null : currentStudent?.imageFile || null}
                                imageUrl={
                                    base64Images?.studentFiles[selectedStudent]
                                        ? `data:image/jpeg;base64,${base64Images.studentFiles[selectedStudent]}`
                                        : undefined
                                }
                                title={`Student Response: ${currentStudent?.name || 'Unknown'}`}
                                responses={editableResponses}
                            />
                            <div className="bg-white rounded-xl shadow-lg p-6">
                                <StudentInfoForm
                                    studentInfo={currentStudentInfo}
                                    onChange={handleStudentInfoChange}
                                />
                                <EditableAnswers
                                    responses={editableResponses}
                                    testData={testData}
                                    onResponseChange={handleResponseChange}
                                />
                                <SubmitVerifiedButton
                                    onSubmit={handleSubmitVerifiedAnswers}
                                    disabled={!editableResponses.length}
                                />
                            </div>
                        </div>
                        <SessionSummary currentOMRData={currentOMRData} omrData={omrData} />
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ResultsPage;
