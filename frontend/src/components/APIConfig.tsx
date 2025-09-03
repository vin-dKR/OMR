import { useState, useEffect } from 'react';
import type { OpenAIConfig } from '../utils/openai';
import { DEFAULT_OPENAI_CONFIG, validateAPIKey, estimateAPICost } from '../utils/openai';
import type { GeminiConfig } from '../utils/gemini';
import { DEFAULT_GEMINI_CONFIG, validateGeminiAPIKey, estimateGeminiAPICost } from '../utils/gemini';
import { saveOpenAIConfig, loadOpenAIConfig, saveGeminiConfig, loadGeminiConfig, saveSelectedAIProvider, loadSelectedAIProvider } from '../utils/storage';

interface APIConfigProps {
  openAIConfig: OpenAIConfig;
  geminiConfig: GeminiConfig;
  selectedProvider: 'openai' | 'gemini';
  onOpenAIConfigChange: (config: OpenAIConfig) => void;
  onGeminiConfigChange: (config: GeminiConfig) => void;
  onProviderChange: (provider: 'openai' | 'gemini') => void;
  imageCount: number;
}

const APIConfig: React.FC<APIConfigProps> = ({
  openAIConfig,
  geminiConfig,
  selectedProvider,
  onOpenAIConfigChange,
  onGeminiConfigChange,
  onProviderChange,
  imageCount
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [openAIKey, setOpenAIKey] = useState(openAIConfig.apiKey);
  const [geminiKey, setGeminiKey] = useState(geminiConfig.apiKey);
  const [openAIModel, setOpenAIModel] = useState(openAIConfig.model);
  const [geminiModel, setGeminiModel] = useState(geminiConfig.model);

  // Check if API keys are loaded from environment variables
  const isOpenAIFromEnv = !!import.meta.env.VITE_OPENAI_API_KEY && import.meta.env.VITE_OPENAI_API_KEY !== 'your_openai_api_key_here';
  const isGeminiFromEnv = !!import.meta.env.VITE_GEMINI_API_KEY && import.meta.env.VITE_GEMINI_API_KEY !== 'your_gemini_api_key_here';

  // Load saved configurations on component mount
  useEffect(() => {
    const savedOpenAIConfig = loadOpenAIConfig();
    const savedGeminiConfig = loadGeminiConfig();
    const savedProvider = loadSelectedAIProvider();
    
    onOpenAIConfigChange(savedOpenAIConfig);
    onGeminiConfigChange(savedGeminiConfig);
    onProviderChange(savedProvider);
    
    // Set the actual API keys for functionality
    setOpenAIKey(savedOpenAIConfig.apiKey);
    setGeminiKey(savedGeminiConfig.apiKey);
    setOpenAIModel(savedOpenAIConfig.model);
    setGeminiModel(savedGeminiConfig.model);
  }, []);

  const handleOpenAIKeyChange = (key: string) => {
    setOpenAIKey(key);
    const newConfig = { ...openAIConfig, apiKey: key };
    onOpenAIConfigChange(newConfig);
    saveOpenAIConfig(newConfig);
  };

  const handleGeminiKeyChange = (key: string) => {
    setGeminiKey(key);
    const newConfig = { ...geminiConfig, apiKey: key };
    onGeminiConfigChange(newConfig);
    saveGeminiConfig(newConfig);
  };

  const handleOpenAIModelChange = (model: string) => {
    setOpenAIModel(model);
    const newConfig = { ...openAIConfig, model };
    onOpenAIConfigChange(newConfig);
    saveOpenAIConfig(newConfig);
  };

  const handleGeminiModelChange = (model: string) => {
    setGeminiModel(model);
    const newConfig = { ...geminiConfig, model };
    onGeminiConfigChange(newConfig);
    saveGeminiConfig(newConfig);
  };

  const handleProviderChange = (provider: 'openai' | 'gemini') => {
    onProviderChange(provider);
    saveSelectedAIProvider(provider);
  };

  const isOpenAIValid = validateAPIKey(openAIKey);
  const isGeminiValid = validateGeminiAPIKey(geminiKey);
  const currentConfig = selectedProvider === 'openai' ? openAIConfig : geminiConfig;
  const estimatedCost = selectedProvider === 'openai' 
    ? estimateAPICost(imageCount, openAIConfig)
    : estimateGeminiAPICost(imageCount, geminiConfig);

  return (
    <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-semibold text-delft-blue">
          AI Provider Configuration
        </h2>
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="px-4 py-2 bg-cambridge-blue text-white rounded-lg hover:bg-delft-blue transition-colors"
        >
          {isExpanded ? 'Hide' : 'Show'} Configuration
        </button>
      </div>

      {/* AI Provider Selection */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Select AI Provider
        </label>
        <div className="flex gap-4">
          <label className="flex items-center">
            <input
              type="radio"
              name="aiProvider"
              value="openai"
              checked={selectedProvider === 'openai'}
              onChange={(e) => handleProviderChange(e.target.value as 'openai')}
              className="mr-2"
            />
            <span className="text-gray-700">OpenAI (GPT-4 Vision)</span>
          </label>
          <label className="flex items-center">
            <input
              type="radio"
              name="aiProvider"
              value="gemini"
              checked={selectedProvider === 'gemini'}
              onChange={(e) => handleProviderChange(e.target.value as 'gemini')}
              className="mr-2"
            />
            <span className="text-gray-700">Google Gemini</span>
          </label>
        </div>
      </div>

      {/* Cost Estimation */}
      <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <h3 className="text-lg font-semibold text-blue-800 mb-2">
          Estimated Cost
        </h3>
        <p className="text-blue-700">
          Processing {imageCount} images with {selectedProvider === 'openai' ? 'OpenAI' : 'Gemini'}: 
          <span className="font-semibold ml-2">${estimatedCost.toFixed(4)}</span>
        </p>
        <p className="text-sm text-blue-600 mt-1">
          {selectedProvider === 'openai' 
            ? 'OpenAI pricing: $0.01 per 1K input tokens, $0.03 per 1K output tokens'
            : 'Gemini pricing: $0.0025 per 1K input tokens, $0.0075 per 1K output tokens'
          }
        </p>
      </div>

             {isExpanded && (
         <div className="space-y-6">
           {/* Environment Variables Notice */}
           {(isOpenAIFromEnv || isGeminiFromEnv) && (
             <div className="bg-green-50 border border-green-200 rounded-lg p-4">
               <h3 className="text-lg font-semibold text-green-800 mb-2">
                 🌍 Environment Variables Detected
               </h3>
               <div className="text-sm text-green-700 space-y-1">
                 <p>• API keys are automatically loaded from your <code className="bg-green-100 px-1 rounded">.env</code> file</p>
                 <p>• You can still override these by entering keys manually in the fields below</p>
                 <p>• Environment variables take priority over manually entered keys</p>
               </div>
             </div>
           )}

           {/* OpenAI Configuration */}
           {selectedProvider === 'openai' && (
            <div className="border border-gray-200 rounded-lg p-4">
              <h3 className="text-lg font-semibold text-delft-blue mb-4">
                OpenAI Configuration
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    API Key
                    {isOpenAIFromEnv && (
                      <span className="ml-2 text-xs text-green-600 bg-green-100 px-2 py-1 rounded">
                        From Environment
                      </span>
                    )}
                  </label>
                  <input
                    type="password"
                    value={isOpenAIFromEnv ? '••••••••••••••••' : openAIKey}
                    onChange={(e) => handleOpenAIKeyChange(e.target.value)}
                    placeholder="sk-..."
                    disabled={isOpenAIFromEnv}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-cambridge-blue focus:border-transparent ${
                      isOpenAIValid ? 'border-green-500' : 'border-red-500'
                    } ${isOpenAIFromEnv ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                  />
                  {!isOpenAIValid && openAIKey && !isOpenAIFromEnv && (
                    <p className="text-red-500 text-sm mt-1">Invalid API key format</p>
                  )}
                  {isOpenAIFromEnv && (
                    <p className="text-green-600 text-sm mt-1">✓ API key loaded from environment variables</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Model
                  </label>
                  <select
                    value={openAIModel}
                    onChange={(e) => handleOpenAIModelChange(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cambridge-blue focus:border-transparent"
                  >
                    <option value="gpt-4-vision-preview">GPT-4 Vision Preview</option>
                    <option value="gpt-4o">GPT-4o</option>
                    <option value="gpt-4o-mini">GPT-4o Mini</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* Gemini Configuration */}
          {selectedProvider === 'gemini' && (
            <div className="border border-gray-200 rounded-lg p-4">
              <h3 className="text-lg font-semibold text-delft-blue mb-4">
                Gemini Configuration
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    API Key
                    {isGeminiFromEnv && (
                      <span className="ml-2 text-xs text-green-600 bg-green-100 px-2 py-1 rounded">
                        From Environment
                      </span>
                    )}
                  </label>
                  <input
                    type="password"
                    value={isGeminiFromEnv ? '••••••••••••••••' : geminiKey}
                    onChange={(e) => handleGeminiKeyChange(e.target.value)}
                    placeholder="Enter your Gemini API key"
                    disabled={isGeminiFromEnv}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-cambridge-blue focus:border-transparent ${
                      isGeminiValid ? 'border-green-500' : 'border-red-500'
                    } ${isGeminiFromEnv ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                  />
                  {!isGeminiValid && geminiKey && !isGeminiFromEnv && (
                    <p className="text-red-500 text-sm mt-1">Invalid API key format</p>
                  )}
                  {isGeminiFromEnv && (
                    <p className="text-green-600 text-sm mt-1">✓ API key loaded from environment variables</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Model
                  </label>
                  <select
                    value={geminiModel}
                    onChange={(e) => handleGeminiModelChange(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cambridge-blue focus:border-transparent"
                  >
                    <option value="gemini-2.5-flash">Gemini 2.5 Flash (Fast)</option>
                    <option value="gemini-2.5-pro">Gemini 2.5 Pro</option>
                    <option value="gemini-2.5-flash-lite">Gemini 2.5 Flash-Lite</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* API Key Instructions */}
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-yellow-800 mb-2">
              How to Get API Keys
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-yellow-700">
              <div>
                <h4 className="font-semibold">OpenAI API Key:</h4>
                <ol className="list-decimal list-inside space-y-1 mt-2">
                  <li>Visit <a href="https://platform.openai.com/api-keys" target="_blank" rel="noopener noreferrer" className="underline">OpenAI Platform</a></li>
                  <li>Sign in or create an account</li>
                  <li>Go to API Keys section</li>
                  <li>Create a new secret key</li>
                </ol>
              </div>
              <div>
                <h4 className="font-semibold">Gemini API Key:</h4>
                <ol className="list-decimal list-inside space-y-1 mt-2">
                  <li>Visit <a href="https://makersuite.google.com/app/apikey" target="_blank" rel="noopener noreferrer" className="underline">Google AI Studio</a></li>
                  <li>Sign in with your Google account</li>
                  <li>Click "Create API Key"</li>
                  <li>Copy the generated key</li>
                </ol>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default APIConfig;
