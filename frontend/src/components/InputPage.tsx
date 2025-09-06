import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import type { GeminiConfig } from '../utils/gemini';
import { DEFAULT_GEMINI_CONFIG } from '../utils/gemini';
import { loadOpenAIConfig, loadGeminiConfig, loadSelectedAIProvider } from '../utils/storage';
import APIConfig from './APIConfig';
import { useTestContext } from '../contexts/TestContext';
import type { OpenAIConfig } from '../types/openai';
import { DEFAULT_OPENAI_CONFIG } from '../utils/openai';

const InputPage: React.FC = () => {
    const navigate = useNavigate();
    const [studentFiles, setStudentFiles] = useState<File[]>([]);
    const [isProcessing, setIsProcessing] = useState(false);
    const [dragActive, setDragActive] = useState(false);
    const [openAIConfig, setOpenAIConfig] = useState<OpenAIConfig>(DEFAULT_OPENAI_CONFIG);
    const [geminiConfig, setGeminiConfig] = useState<GeminiConfig>(DEFAULT_GEMINI_CONFIG);
    const [selectedProvider, setSelectedProvider] = useState<'openai' | 'gemini'>('gemini');
    const [testId, setTestId] = useState<string>("");
    const { fetchTestResponse } = useTestContext();

    useEffect(() => {
        const savedOpenAIConfig = loadOpenAIConfig();
        const savedGeminiConfig = loadGeminiConfig();
        const savedProvider = loadSelectedAIProvider();
        setOpenAIConfig(savedOpenAIConfig);
        setGeminiConfig(savedGeminiConfig);
        setSelectedProvider(savedProvider);
    }, []);

    const handleStudentFilesUpload = (files: FileList) => {
        const imageFiles = Array.from(files).filter(file => {
            const isImage = file.type === 'image/jpeg' || file.type === 'image/png';
            if (!isImage) {
                console.warn(`File ${file.name} is not a valid image (type: ${file.type})`);
            }
            return isImage;
        });
        if (imageFiles.length > 30) {
            alert('Maximum 30 student response sheets allowed');
            return;
        }
        if (imageFiles.length === 0) {
            alert('No valid JPEG or PNG files selected');
            return;
        }
        setStudentFiles(imageFiles);
        console.log('Uploaded student files:', imageFiles.map(f => ({ name: f.name, type: f.type, size: f.size })));
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
        const files = e.dataTransfer.files;
        handleStudentFilesUpload(files);
    };

    function imageToBase64(file: File): Promise<string> {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => {
                const result = reader.result as string;
                const base64 = result.split(',')[1];
                if (!base64 || base64.length < 100) { // Basic length check
                    reject(new Error(`Invalid base64 data for file ${file.name}`));
                    return;
                }
                // Basic validation of base64 string
                try {
                    atob(base64);
                    resolve(base64);
                } catch {
                    reject(new Error(`Corrupted base64 data for file ${file.name}`));
                }
            };
            reader.onerror = () => reject(new Error(`Error reading file ${file.name}`));
            reader.readAsDataURL(file);
        });
    }

    const handleProcess = async () => {
        if (!testId) {
            alert('Please enter a valid test ID');
            return;
        }
        if (studentFiles.length === 0) {
            alert('Please upload at least one student response sheet');
            return;
        }

        const currentConfig = selectedProvider === 'openai' ? openAIConfig : geminiConfig;

        if (!currentConfig.apiKey) {
            alert(`Please enter your ${selectedProvider === 'openai' ? 'OpenAI' : 'Gemini'} API key to continue`);
            return;
        }

        setIsProcessing(true);

        try {
            await fetchTestResponse({ testId });
            const studentFilesBase64 = await Promise.all(
                studentFiles.map(async (file) => {
                    try {
                        const base64 = await imageToBase64(file);
                        console.log(`Base64 for ${file.name} (first 50 chars):`, base64.slice(0, 50));
                        return {
                            name: file.name,
                            type: file.type,
                            data: base64
                        };
                    } catch (error) {
                        throw new Error(`Failed to process file ${file.name}: ${error instanceof Error ? error.message : 'Unknown error'}`);
                    }
                })
            );

            const sessionId = `session-${Date.now()}`;

            navigate('/results', {
                state: {
                    sessionId,
                    studentFiles: studentFilesBase64,
                    openAIConfig,
                    geminiConfig,
                    selectedProvider,
                    createdAt: new Date()
                }
            });
        } catch (error) {
            console.error('File conversion failed:', error);
            alert('Failed to prepare files for processing: ' + (error instanceof Error ? error.message : 'Unknown error'));
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <div className="min-h-screen bg-eggshell p-8">
            <div className="max-w-6xl mx-auto">
                <div className="text-center mb-12">
                    <h1 className="text-5xl font-bold text-delft-blue mb-4">
                        OMR Answer Checker
                    </h1>
                    <p className="text-xl text-cambridge-blue">
                        Enter test ID and upload student response sheets for AI-powered checking
                    </p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
                    <div className="bg-white rounded-xl shadow-lg p-6 border-2 border-cambridge-blue">
                        <h2 className="text-2xl font-semibold text-delft-blue mb-4">
                            Test Information
                        </h2>
                        <div className="mt-4">
                            <input
                                type="text"
                                placeholder="Enter the test ID"
                                className="border p-2 w-full rounded-xl"
                                value={testId}
                                onChange={(e) => setTestId(e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="bg-white rounded-xl shadow-lg p-6 border-2 border-cambridge-blue">
                        <h2 className="text-2xl font-semibold text-delft-blue mb-4">
                            Student Response Sheets
                        </h2>
                        <div
                            id="student-files-drop"
                            className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${dragActive ? 'border-burnt-sienna bg-sunset/20' : 'border-cambridge-blue'} ${studentFiles.length > 0 ? 'border-green-500 bg-green-50' : ''}`}
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
                                        accept="image/jpeg,image/png"
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

                <APIConfig
                    openAIConfig={openAIConfig}
                    geminiConfig={geminiConfig}
                    selectedProvider={selectedProvider}
                    onOpenAIConfigChange={setOpenAIConfig}
                    onGeminiConfigChange={setGeminiConfig}
                    onProviderChange={setSelectedProvider}
                    imageCount={studentFiles.length}
                />

                <div className="text-center mt-12">
                    <button
                        onClick={handleProcess}
                        disabled={!testId || studentFiles.length === 0 || isProcessing}
                        className={`px-12 py-4 text-xl font-semibold rounded-xl transition-all ${!testId || studentFiles.length === 0 || isProcessing
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
                    {(!openAIConfig.apiKey && selectedProvider === 'openai') || (!geminiConfig.apiKey && selectedProvider === 'gemini') ? (
                        <p className="text-sm text-red-600 mt-2">
                            Please enter your {selectedProvider === 'openai' ? 'OpenAI' : 'Gemini'} API key to continue
                        </p>
                    ) : null}
                </div>
            </div>
        </div>
    );
};

export default InputPage;
