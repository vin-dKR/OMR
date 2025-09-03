import { useState } from 'react';
import type { PreprocessingOptions } from '../utils/imagePreprocessing';
import { getPreprocessingPreset } from '../utils/imagePreprocessing';

interface PreprocessingSettingsProps {
  options: PreprocessingOptions;
  onOptionsChange: (options: PreprocessingOptions) => void;
  onPresetChange: (preset: 'low' | 'medium' | 'high') => void;
}

const PreprocessingSettings: React.FC<PreprocessingSettingsProps> = ({
  options,
  onOptionsChange,
  onPresetChange
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const handleSliderChange = (key: keyof PreprocessingOptions, value: number) => {
    onOptionsChange({
      ...options,
      [key]: value
    });
  };

  const handlePresetChange = (preset: 'low' | 'medium' | 'high') => {
    const newOptions = getPreprocessingPreset(preset);
    onOptionsChange(newOptions);
    onPresetChange(preset);
  };

  return (
    <div className="bg-white rounded-xl shadow-lg p-6 border-2 border-cambridge-blue">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-xl font-semibold text-delft-blue">
          Image Preprocessing Settings
        </h3>
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="text-cambridge-blue hover:text-delft-blue transition-colors p-2 rounded-lg hover:bg-gray-100"
        >
          {isExpanded ? '▼' : '▶'}
        </button>
      </div>

      {/* Preset Selection */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Image Quality Preset
        </label>
        <div className="flex gap-3">
          {(['low', 'medium', 'high'] as const).map((preset) => {
            const isSelected = getPreprocessingPreset(preset).contrast === options.contrast;
            return (
              <button
                key={preset}
                onClick={() => handlePresetChange(preset)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors border-2 ${
                  isSelected
                    ? 'bg-burnt-sienna text-white border-burnt-sienna'
                    : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50 hover:border-gray-400'
                }`}
              >
                {preset.charAt(0).toUpperCase() + preset.slice(1)}
              </button>
            );
          })}
        </div>
        <p className="text-xs text-gray-500 mt-1">
          Choose based on your image quality. Low quality images need more aggressive preprocessing.
        </p>
      </div>

      {isExpanded && (
        <div className="space-y-6">
          {/* Contrast Control */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="text-sm font-medium text-gray-700">
                Contrast Enhancement
              </label>
              <span className="text-sm text-gray-500 bg-gray-100 px-2 py-1 rounded">
                {options.contrast.toFixed(1)}
              </span>
            </div>
            <input
              type="range"
              min="0.5"
              max="2.0"
              step="0.1"
              value={options.contrast}
              onChange={(e) => handleSliderChange('contrast', parseFloat(e.target.value))}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
            />
            <div className="flex justify-between text-xs text-gray-400 mt-1">
              <span>Low</span>
              <span>Normal</span>
              <span>High</span>
            </div>
          </div>

          {/* Brightness Control */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="text-sm font-medium text-gray-700">
                Brightness Adjustment
              </label>
              <span className="text-sm text-gray-500 bg-gray-100 px-2 py-1 rounded">
                {options.brightness > 0 ? '+' : ''}{options.brightness}
              </span>
            </div>
            <input
              type="range"
              min="-100"
              max="100"
              step="5"
              value={options.brightness}
              onChange={(e) => handleSliderChange('brightness', parseInt(e.target.value))}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
            />
            <div className="flex justify-between text-xs text-gray-400 mt-1">
              <span>Darker</span>
              <span>Normal</span>
              <span>Brighter</span>
            </div>
          </div>

          {/* Noise Reduction Control */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="text-sm font-medium text-gray-700">
                Noise Reduction
              </label>
              <span className="text-sm text-gray-500 bg-gray-100 px-2 py-1 rounded">
                {Math.round(options.noiseReduction * 100)}%
              </span>
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.1"
              value={options.noiseReduction}
              onChange={(e) => handleSliderChange('noiseReduction', parseFloat(e.target.value))}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
            />
            <div className="flex justify-between text-xs text-gray-400 mt-1">
              <span>None</span>
              <span>Moderate</span>
              <span>Maximum</span>
            </div>
          </div>

          {/* Sharpening Control */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="text-sm font-medium text-gray-700">
                Edge Sharpening
              </label>
              <span className="text-sm text-gray-500 bg-gray-100 px-2 py-1 rounded">
                {Math.round(options.sharpen * 100)}%
              </span>
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.1"
              value={options.sharpen}
              onChange={(e) => handleSliderChange('sharpen', parseFloat(e.target.value))}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
            />
            <div className="flex justify-between text-xs text-gray-400 mt-1">
              <span>None</span>
              <span>Moderate</span>
              <span>Maximum</span>
            </div>
          </div>

          {/* Info Box */}
          <div className="bg-sunset/20 rounded-lg p-4 border border-sunset/30">
            <h4 className="font-medium text-delft-blue mb-2">💡 Preprocessing Tips</h4>
            <ul className="text-sm text-gray-700 space-y-1">
              <li>• <strong>Contrast:</strong> Higher values make bubbles more distinct</li>
              <li>• <strong>Brightness:</strong> Adjust for poorly lit or overexposed images</li>
              <li>• <strong>Noise Reduction:</strong> Use for grainy or scanned images</li>
              <li>• <strong>Sharpening:</strong> Enhances bubble edges for better detection</li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );
};

export default PreprocessingSettings;
