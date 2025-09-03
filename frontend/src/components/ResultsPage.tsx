import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import type { OMRData, OMRResponse, AnswerKey, StudentResponse } from '../types/omr';
import { getAllOMRSessions, loadOMRResults, deleteOMRSession, exportOMRResults, saveProcessingHistory } from '../utils/storage';
import { processOMRWithOpenAI } from '../utils/openai';
import { processOMRWithGemini } from '../utils/gemini';
import type { OpenAIConfig } from '../utils/openai';
import type { GeminiConfig } from '../utils/gemini';
import ImageViewer from './ImageViewer';

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

const ResultsPage: React.FC<ResultsPageProps> = ({ omrData, onBackToInput }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [selectedStudent, setSelectedStudent] = useState(0);
  const [editableResponses, setEditableResponses] = useState<OMRResponse[]>([]);
  const [savedSessions, setSavedSessions] = useState<any[]>([]);
  const [showSavedSessions, setShowSavedSessions] = useState(false);
  
  // Processing state
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStep, setProcessingStep] = useState<string>('');
  const [processingProgress, setProcessingProgress] = useState<number>(0);
  const [currentOMRData, setCurrentOMRData] = useState<OMRData | null>(null);
  const [base64Images, setBase64Images] = useState<{
    answerKey: string;
    studentFiles: string[];
  } | null>(null);

  // Get processing data from navigation state
  const processingData = location.state as ProcessingData;

  // Load saved sessions on component mount
  useEffect(() => {
    const sessions = getAllOMRSessions();
    setSavedSessions(sessions);
  }, []);

  // Start processing if we have processing data
  useEffect(() => {
    if (processingData && !currentOMRData) {
      startProcessing();
    }
  }, [processingData, currentOMRData]);

  const startProcessing = async () => {
    if (!processingData || isProcessing) return;

    setIsProcessing(true);
    setProcessingStep('Initializing processing...');
    setProcessingProgress(5);

    try {
      // Create initial OMR data structure with base64 data
      const initialOMRData: OMRData = {
        answerKey: {
          imageFile: new File([], processingData.answerKey.name),
          answers: [],
          processedAt: new Date()
        },
        studentResponses: processingData.studentFiles.map((file, index) => ({
          id: `student-${index + 1}`,
          name: `Student ${index + 1}`,
          imageFile: new File([], file.name),
          responses: [],
          processedAt: new Date(),
          isProcessing: true
        })),
        sessionId: processingData.sessionId,
        createdAt: processingData.createdAt,
        isProcessing: true
      };

      // Store base64 data for image display
      const base64Data = {
        answerKey: processingData.answerKey.data,
        studentFiles: processingData.studentFiles.map(f => f.data)
      };

      setBase64Images(base64Data);
      setCurrentOMRData(initialOMRData);
      setProcessingStep('Processing answer key...');
      setProcessingProgress(10);

      // Process answer key
      let answerKeyData;
      if (processingData.selectedProvider === 'openai') {
        const answerKeyRequest = {
          answerKeyImage: processingData.answerKey.data,
          studentResponseImages: [],
          preprocessingOptions: {
            contrast: 1.0,
            brightness: 0,
            noiseReduction: 0,
            sharpen: 0
          }
        };
        const answerKeyResponse = await processOMRWithOpenAI(answerKeyRequest, processingData.openAIConfig);
        if (answerKeyResponse.success && answerKeyResponse.data) {
          answerKeyData = answerKeyResponse.data.answerKey;
        }
      } else {
        const answerKeyRequest = {
          image: processingData.answerKey.data
        };
        const answerKeyResponse = await processOMRWithGemini(answerKeyRequest, processingData.geminiConfig);
        if (answerKeyResponse.success && answerKeyResponse.data) {
          answerKeyData = answerKeyResponse.data.answers;
        }
      }

      if (!answerKeyData) {
        throw new Error('Answer key processing failed');
      }

      // Update answer key
      const updatedAnswerKey: AnswerKey = {
        imageFile: new File([], processingData.answerKey.name),
        answers: Object.entries(answerKeyData).map(([questionKey, answer]) => ({
          questionNumber: parseInt(questionKey),
          selectedAnswer: answer as 'A' | 'B' | 'C' | 'D' | null,
          confidence: 0.9
        })),
        processedAt: new Date()
      };

      setProcessingStep('Processing student response sheets...');
      setProcessingProgress(30);

      // Process each student response
      const updatedStudentResponses: StudentResponse[] = [];
      
      for (let i = 0; i < processingData.studentFiles.length; i++) {
        const studentFile = processingData.studentFiles[i];
        const progress = 30 + ((i + 1) / processingData.studentFiles.length) * 60; // 30% to 90%
        
        setProcessingStep(`Processing student ${i + 1} of ${processingData.studentFiles.length}...`);
        setProcessingProgress(progress);
        
        let studentData;
        if (processingData.selectedProvider === 'openai') {
          const studentRequest = {
            answerKeyImage: '',
            studentResponseImages: [studentFile.data],
            preprocessingOptions: {
              contrast: 1.0,
              brightness: 0,
              noiseReduction: 0,
              sharpen: 0
            }
          };
          const studentResponse = await processOMRWithOpenAI(studentRequest, processingData.openAIConfig);
          if (studentResponse.success && studentResponse.data) {
            studentData = studentResponse.data.studentResponses[0];
          }
        } else {
          const studentRequest = {
            image: studentFile.data
          };
          const studentResponse = await processOMRWithGemini(studentRequest, processingData.geminiConfig);
          if (studentResponse.success && studentResponse.data) {
            studentData = studentResponse.data.answers;
          }
        }

        if (studentData) {
          const studentResponse: StudentResponse = {
            id: `student-${i + 1}`,
            name: `Student ${i + 1}`,
            imageFile: new File([], studentFile.name),
            responses: Object.entries(studentData).map(([questionKey, answer]) => ({
              questionNumber: parseInt(questionKey),
              selectedAnswer: answer as 'A' | 'B' | 'C' | 'D' | null,
              confidence: 0.8
            })),
            processedAt: new Date(),
            isProcessing: false
          };
          updatedStudentResponses.push(studentResponse);
        } else {
          // Add failed student with empty responses
          const failedStudent: StudentResponse = {
            id: `student-${i + 1}`,
            name: `Student ${i + 1}`,
            imageFile: new File([], studentFile.name),
            responses: [],
            processedAt: new Date(),
            isProcessing: false
          };
          updatedStudentResponses.push(failedStudent);
        }

        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      // Final update
      setProcessingStep('Saving results...');
      setProcessingProgress(95);

      const finalOMRData: OMRData = {
        ...initialOMRData,
        answerKey: updatedAnswerKey,
        studentResponses: updatedStudentResponses,
        isProcessing: false
      };

      setCurrentOMRData(finalOMRData);
      setProcessingStep('Processing complete!');
      setProcessingProgress(100);

      // Save to processing history
      saveProcessingHistory(processingData.sessionId, finalOMRData);

      // Set editable responses for first student
      if (updatedStudentResponses.length > 0) {
        setEditableResponses(updatedStudentResponses[0].responses);
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
      selectedAnswer: newAnswer
    };
    setEditableResponses(updatedResponses);
  };

  const handleStudentChange = (studentIndex: number) => {
    setSelectedStudent(studentIndex);
    setEditableResponses(currentOMRData?.studentResponses[studentIndex]?.responses || []);
  };

  const handleBackToInput = () => {
    onBackToInput();
    navigate('/');
  };

  const handleLoadSession = (sessionId: string) => {
    const sessionData = loadOMRResults(sessionId);
    console.log(sessionData);
    if (sessionData) {
      // Convert saved data back to OMRData format
      const convertedData: OMRData = {
        answerKey: {
          imageFile: new File([], 'answer-key.jpg'), // Placeholder file
          answers: Object.entries(sessionData.answerKey?.data || {}).map(([questionKey, answer]) => ({
            questionNumber: parseInt(questionKey),
            selectedAnswer: answer as 'A' | 'B' | 'C' | 'D' | null,
            confidence: 0.9
          })),
          processedAt: new Date(sessionData.answerKey?.timestamp || Date.now())
        },
        studentResponses: sessionData.studentResponses?.map((student: any, index: number) => ({
          id: student.data?.studentId || `student-${student.studentIndex}`,
          name: `Student ${student.studentIndex}`,
          imageFile: new File([], `student-${student.studentIndex}.jpg`), // Placeholder file
          responses: Object.entries(student.data?.responses || {}).map(([questionKey, answer]) => ({
            questionNumber: parseInt(questionKey),
            selectedAnswer: answer as 'A' | 'B' | 'C' | 'D' | null,
            confidence: 0.8
          })),
          processedAt: new Date(student.timestamp || Date.now())
        })) || [],
        sessionId: sessionData.sessionId,
        createdAt: new Date(sessionData.timestamp)
      };

      console.log(convertedData);
      
      // Update the current page data
      setCurrentOMRData(convertedData);
      setEditableResponses(convertedData.studentResponses[0]?.responses || []);
      setSelectedStudent(0);
      
      // Clear base64 images since we're loading from saved session
      setBase64Images(null);
      
      // Show a success message
      alert(`Session "${sessionId}" loaded successfully!`);
    }
  };

  const handleDeleteSession = (sessionId: string) => {
    if (confirm('Are you sure you want to delete this session?')) {
      if (deleteOMRSession(sessionId)) {
        setSavedSessions(prev => prev.filter(s => s.sessionId !== sessionId));
      }
    }
  };

  const handleExportSession = (sessionId: string) => {
    const sessionData = loadOMRResults(sessionId);
    if (sessionData) {
      exportOMRResults(sessionId, sessionData);
    }
  };

  const calculateScore = (studentResponses: OMRResponse[]) => {
    let correct = 0;
    let total = 0;
    
    studentResponses.forEach((response, index) => {
      const answerKeyResponse = currentOMRData?.answerKey.answers[index];
      if (response.selectedAnswer && answerKeyResponse?.selectedAnswer) {
        if (response.selectedAnswer === answerKeyResponse.selectedAnswer) {
          correct++;
        }
        total++;
      }
    });
    
    return total > 0 ? Math.round((correct / total) * 100) : 0;
  };

  const currentStudent = currentOMRData?.studentResponses[selectedStudent];
  const currentScore = calculateScore(editableResponses);

  return (
    <div className="min-h-screen bg-eggshell p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-bold text-delft-blue">
              OMR Results
            </h1>
            <p className="text-lg text-cambridge-blue">
              Session: {currentOMRData?.sessionId || omrData.sessionId}
            </p>
            {/* Processing Status */}
            {isProcessing && (
              <div className="flex items-center gap-2 mt-2">
                <div className="w-3 h-3 bg-yellow-500 rounded-full animate-pulse"></div>
                <span className="text-sm text-yellow-600">
                  {processingStep} ({processingProgress}%)
                </span>
              </div>
            )}
            {currentOMRData?.isProcessing && !isProcessing && (
              <div className="flex items-center gap-2 mt-2">
                <div className="w-3 h-3 bg-yellow-500 rounded-full animate-pulse"></div>
                <span className="text-sm text-yellow-600">
                  Processing images in background... ({currentOMRData.studentResponses.filter(s => !s.isProcessing).length}/{currentOMRData.studentResponses.length} completed)
                </span>
              </div>
            )}
          </div>
          <button
            onClick={handleBackToInput}
            className="px-6 py-3 bg-cambridge-blue text-white rounded-lg hover:bg-delft-blue transition-colors"
          >
            ← Back to Input
          </button>
        </div>

        {/* Processing Progress */}
        {isProcessing && (
          <div className="bg-white rounded-xl shadow-lg p-6 border-2 border-cambridge-blue mb-8">
            <h3 className="text-xl font-semibold text-delft-blue mb-4">
              Processing Progress
            </h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
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
        )}

        {/* Main Layout - Left Sidebar + Right Content */}
        <div className="flex gap-8">
          {/* Left Sidebar - Student Selection */}
          <div className="w-64 flex-shrink-0">
            <div className="bg-white rounded-xl shadow-lg p-6 sticky top-6">
              <h2 className="text-xl font-semibold text-delft-blue mb-4">
                Students
              </h2>
              
              {/* Student Thumbnails - Vertical List */}
              <div className="space-y-3 max-h-[600px] overflow-y-auto">
                {(currentOMRData?.studentResponses || omrData.studentResponses).map((student, index) => (
                  <button
                    key={student.id}
                    onClick={() => handleStudentChange(index)}
                    className={`w-full p-3 rounded-lg border-2 transition-all text-left ${
                      selectedStudent === index
                        ? 'border-burnt-sienna bg-burnt-sienna/10'
                        : 'border-gray-300 hover:border-cambridge-blue hover:bg-sunset/20'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-16 rounded border overflow-hidden flex-shrink-0">
                        {base64Images?.studentFiles[index] ? (
                          <img 
                            src={`data:image/jpeg;base64,${base64Images.studentFiles[index]}`}
                            alt={student.name}
                            className="w-full h-full object-cover"
                          />
                        ) : student.imageFile && student.imageFile.size > 0 ? (
                          <img 
                            src={URL.createObjectURL(student.imageFile)} 
                            alt={student.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full bg-gray-200 flex items-center justify-center text-gray-400">
                            📄
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm text-gray-900 truncate">
                          {student.name}
                        </div>
                        {/* Processing Status Indicator */}
                        {student.isProcessing ? (
                          <div className="flex items-center gap-2 mt-1">
                            <div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse"></div>
                            <span className="text-xs text-yellow-600">Processing...</span>
                          </div>
                        ) : student.responses.length > 0 ? (
                          <div className="flex items-center gap-2 mt-1">
                            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                            <span className="text-xs text-green-600">Ready</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 mt-1">
                            <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
                            <span className="text-xs text-gray-500">Pending</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Right Content - Main Results */}
          <div className="flex-1">
            {/* Main Content - Side by Side Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
              {/* Left Side - OMR Image */}
              <div>
                <ImageViewer
                  imageFile={base64Images ? null : (currentStudent?.imageFile || null)}
                  imageUrl={base64Images?.studentFiles[selectedStudent] ? `data:image/jpeg;base64,${base64Images.studentFiles[selectedStudent]}` : undefined}
                  title={`Student Response: ${currentStudent?.name || 'Unknown'}`}
                  responses={editableResponses}
                />
              </div>

              {/* Right Side - AI Extracted Results */}
              <div className="bg-white rounded-xl shadow-lg p-6">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-2xl font-semibold text-delft-blue">
                    AI Extracted Results
                  </h2>
                  <div className="text-right">
                    <p className="text-sm text-gray-600">Score</p>
                    <p className="text-3xl font-bold text-burnt-sienna">
                      {currentScore}%
                    </p>
                  </div>
                </div>

                {/* Processing Status for Current Student */}
                {currentStudent?.isProcessing && (
                  <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-yellow-500 rounded-full animate-pulse"></div>
                      <span className="text-sm text-yellow-700">Processing student response...</span>
                    </div>
                  </div>
                )}

                {/* Editable Responses */}
                <div className="max-h-[500px] overflow-y-auto">
                  <div className="grid grid-cols-5 gap-2 mb-4 text-sm font-medium text-gray-600">
                    <div>Q#</div>
                    <div>A</div>
                    <div>B</div>
                    <div>C</div>
                    <div>D</div>
                  </div>
                  
                  {editableResponses.map((response, index) => (
                    <div key={index} className="grid grid-cols-5 gap-2 mb-2 items-center">
                      <div className="text-sm font-medium text-gray-700">
                        {response.questionNumber.toString().padStart(3, '0')}
                      </div>
                      {(['A', 'B', 'C', 'D'] as const).map((option) => (
                        <button
                          key={option}
                          onClick={() => handleResponseChange(index, option)}
                          className={`w-8 h-8 rounded-full border-2 transition-all ${
                            response.selectedAnswer === option
                              ? 'bg-burnt-sienna border-burnt-sienna text-white'
                              : 'border-cambridge-blue hover:border-delft-blue hover:bg-sunset/20'
                          }`}
                        >
                          {response.selectedAnswer === option ? '✓' : ''}
                        </button>
                      ))}
                    </div>
                  ))}
                </div>

                {/* Confidence Indicator */}
                <div className="mt-6 p-4 bg-sunset/20 rounded-lg">
                  <p className="text-sm text-gray-600 mb-2">AI Confidence</p>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-cambridge-blue h-2 rounded-full"
                        style={{ 
                          width: `${(editableResponses.reduce((sum, r) => sum + r.confidence, 0) / editableResponses.length) * 100}%` 
                        }}
                      ></div>
                    </div>
                    <span className="text-sm font-medium text-delft-blue">
                      {Math.round((editableResponses.reduce((sum, r) => sum + r.confidence, 0) / editableResponses.length) * 100)}%
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Answer Key Section - Full Width Below */}
            <div className="mb-8">
              <ImageViewer
                imageFile={base64Images ? null : (currentOMRData?.answerKey || omrData.answerKey).imageFile}
                imageUrl={base64Images?.answerKey ? `data:image/jpeg;base64,${base64Images.answerKey}` : undefined}
                title="Answer Key"
                responses={(currentOMRData?.answerKey || omrData.answerKey).answers}
              />
            </div>

            {/* Summary Stats */}
            <div className="bg-white rounded-xl shadow-lg p-6 mt-8">
              <h3 className="text-xl font-semibold text-delft-blue mb-4">
                Session Summary
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                <div className="text-center">
                  <p className="text-2xl font-bold text-burnt-sienna">
                    {(currentOMRData?.studentResponses || omrData.studentResponses).length}
                  </p>
                  <p className="text-sm text-gray-600">Students</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-cambridge-blue">
                    {(currentOMRData?.answerKey.answers || omrData.answerKey.answers).length}
                  </p>
                  <p className="text-sm text-gray-600">Questions</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-delft-blue">
                    {(currentOMRData?.createdAt || omrData.createdAt).toLocaleDateString()}
                  </p>
                  <p className="text-sm text-gray-600">Created</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-sunset">
                    {(currentOMRData?.sessionId || omrData.sessionId).split('-')[1]}
                  </p>
                  <p className="text-sm text-gray-600">Session ID</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ResultsPage;
