import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import type { OpenAIConfig } from '../utils/openai';
import { imageToBase64, DEFAULT_OPENAI_CONFIG } from '../utils/openai';
import type { GeminiConfig } from '../utils/gemini';
import { DEFAULT_GEMINI_CONFIG } from '../utils/gemini';
import { loadOpenAIConfig, loadGeminiConfig, loadSelectedAIProvider } from '../utils/storage';
import APIConfig from './APIConfig';

const InputPage: React.FC = () => {
  const navigate = useNavigate();
  const [answerKeyFile, setAnswerKeyFile] = useState<File | null>(null);
  const [studentFiles, setStudentFiles] = useState<File[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [openAIConfig, setOpenAIConfig] = useState<OpenAIConfig>(DEFAULT_OPENAI_CONFIG);
  const [geminiConfig, setGeminiConfig] = useState<GeminiConfig>(DEFAULT_GEMINI_CONFIG);
  const [selectedProvider, setSelectedProvider] = useState<'openai' | 'gemini'>('openai');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load saved configuration on component mount
  useEffect(() => {
    const savedOpenAIConfig = loadOpenAIConfig();
    const savedGeminiConfig = loadGeminiConfig();
    const savedProvider = loadSelectedAIProvider();
    
    setOpenAIConfig(savedOpenAIConfig);
    setGeminiConfig(savedGeminiConfig);
    setSelectedProvider(savedProvider);
  }, []);

  const handleAnswerKeyUpload = (file: File) => {
    if (file.type.startsWith('image/')) {
      setAnswerKeyFile(file);
    }
  };

  const handleStudentFilesUpload = (files: FileList) => {
    const imageFiles = Array.from(files).filter(file => file.type.startsWith('image/'));
    if (imageFiles.length > 30) {
      alert('Maximum 30 student response sheets allowed');
      return;
    }
    setStudentFiles(imageFiles);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    
    if (e.currentTarget.id === 'answer-key-drop') {
      const file = e.dataTransfer.files[0];
      handleAnswerKeyUpload(file);
    } else if (e.currentTarget.id === 'student-files-drop') {
      const files = e.dataTransfer.files;
      handleStudentFilesUpload(files);
    }
  };

  const handleProcess = async () => {
    if (!answerKeyFile || studentFiles.length === 0) {
      alert('Please upload both answer key and student response sheets');
      return;
    }

    const currentConfig = selectedProvider === 'openai' ? openAIConfig : geminiConfig;
    
    if (!currentConfig.apiKey) {
      alert(`Please enter your ${selectedProvider === 'openai' ? 'OpenAI' : 'Gemini'} API key to continue`);
      return;
    }

    setIsProcessing(true);
    
    try {
      // Convert files to base64
      const answerKeyBase64 = await imageToBase64(answerKeyFile);
      const studentFilesBase64 = await Promise.all(
        studentFiles.map(async (file) => ({
          name: file.name,
          type: file.type,
          data: await imageToBase64(file)
        }))
      );

      // Create session ID
      const sessionId = `session-${Date.now()}`;

      // Navigate to results page with all necessary data
      navigate('/results', {
        state: {
          sessionId,
          answerKey: {
            name: answerKeyFile.name,
            type: answerKeyFile.type,
            data: answerKeyBase64
          },
          studentFiles: studentFilesBase64,
          openAIConfig,
          geminiConfig,
          selectedProvider,
          createdAt: new Date()
        }
      });

    } catch (error) {
      console.error('File conversion failed:', error);
      alert('Failed to prepare files for processing. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-eggshell p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold text-delft-blue mb-4">
            OMR Answer Checker
          </h1>
          <p className="text-xl text-cambridge-blue">
            Upload your answer key and student response sheets for AI-powered checking
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Answer Key Upload */}
          <div className="bg-white rounded-xl shadow-lg p-6 border-2 border-cambridge-blue">
            <h2 className="text-2xl font-semibold text-delft-blue mb-4">
              Answer Key
            </h2>
            <div
              id="answer-key-drop"
              className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                dragActive ? 'border-burnt-sienna bg-sunset/20' : 'border-cambridge-blue'
              } ${answerKeyFile ? 'border-green-500 bg-green-50' : ''}`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              {answerKeyFile ? (
                <div className="text-green-600">
                  <p className="text-lg font-medium">✓ Answer Key Uploaded</p>
                  <p className="text-sm mt-2">{answerKeyFile.name}</p>
                  <button
                    onClick={() => setAnswerKeyFile(null)}
                    className="mt-3 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
                  >
                    Remove
                  </button>
                </div>
              ) : (
                <div>
                  <p className="text-lg text-cambridge-blue mb-2">
                    Drag & drop your answer key here
                  </p>
                  <p className="text-sm text-gray-500 mb-4">
                    or click to browse
                  </p>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={(e) => e.target.files?.[0] && handleAnswerKeyUpload(e.target.files[0])}
                    className="hidden"
                  />
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="px-6 py-3 bg-cambridge-blue text-white rounded-lg hover:bg-delft-blue transition-colors"
                  >
                    Choose File
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Student Response Sheets Upload */}
          <div className="bg-white rounded-xl shadow-lg p-6 border-2 border-cambridge-blue">
            <h2 className="text-2xl font-semibold text-delft-blue mb-4">
              Student Response Sheets
            </h2>
            <div
              id="student-files-drop"
              className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                dragActive ? 'border-burnt-sienna bg-sunset/20' : 'border-cambridge-blue'
              } ${studentFiles.length > 0 ? 'border-green-500 bg-green-50' : ''}`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              {studentFiles.length > 0 ? (
                <div className="text-green-600">
                  <p className="text-lg font-medium">✓ {studentFiles.length} Files Uploaded</p>
                  <p className="text-sm mt-2 text-gray-600">
                    {studentFiles.map(f => f.name).join(', ')}
                  </p>
                  <button
                    onClick={() => setStudentFiles([])}
                    className="mt-3 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
                  >
                    Remove All
                  </button>
                </div>
              ) : (
                <div>
                  <p className="text-lg text-cambridge-blue mb-2">
                    Drag & drop student response sheets here
                  </p>
                  <p className="text-sm text-gray-500 mb-4">
                    Maximum 30 files (JPEG/PNG)
                  </p>
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={(e) => e.target.files && handleStudentFilesUpload(e.target.files)}
                    className="hidden"
                    id="student-files-input"
                  />
                  <label
                    htmlFor="student-files-input"
                    className="text-cambridge-blue hover:bg-delft-blue hover:text-white transition-colors cursor-pointer inline-block px-6 py-3 bg-cambridge-blue text-white rounded-lg hover:bg-delft-blue"
                  >
                    Choose Files
                  </label>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* API Configuration */}
        <APIConfig
          openAIConfig={openAIConfig}
          geminiConfig={geminiConfig}
          selectedProvider={selectedProvider}
          onOpenAIConfigChange={setOpenAIConfig}
          onGeminiConfigChange={setGeminiConfig}
          onProviderChange={setSelectedProvider}
          imageCount={studentFiles.length}
        />

        {/* Process Button */}
        <div className="text-center mt-12">
          <button
            onClick={handleProcess}
            disabled={!answerKeyFile || studentFiles.length === 0 || isProcessing}
            className={`px-12 py-4 text-xl font-semibold rounded-xl transition-all ${
              !answerKeyFile || studentFiles.length === 0 || isProcessing
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-burnt-sienna text-white hover:bg-delft-blue hover:scale-105 shadow-lg'
            }`}
          >
            {isProcessing ? (
              <div className="flex items-center justify-center">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white mr-3"></div>
                Preparing...
              </div>
            ) : (
              'Process with AI'
            )}
          </button>
          {!openAIConfig.apiKey && (
            <p className="text-sm text-red-600 mt-2">
              Please enter your OpenAI API key to continue
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default InputPage;
