import type { OpenAIConfig } from './openai';
import { DEFAULT_OPENAI_CONFIG } from './openai';
import type { GeminiConfig } from './gemini';
import { DEFAULT_GEMINI_CONFIG } from './gemini';

const STORAGE_KEYS = {
    OPENAI_CONFIG: 'omr_checker_openai_config',
    GEMINI_CONFIG: 'omr_checker_gemini_config',
    PROCESSING_HISTORY: 'omr_checker_processing_history',
    USER_PREFERENCES: 'omr_checker_user_preferences',
    SELECTED_AI_PROVIDER: 'omr_checker_selected_ai_provider'
};

/**
 * Save OpenAI configuration to local storage
 */
export function saveOpenAIConfig(config: OpenAIConfig): void {
    try {
        // Store the actual config for functionality
        localStorage.setItem(STORAGE_KEYS.OPENAI_CONFIG, JSON.stringify(config));
    } catch (error) {
        console.warn('Failed to save OpenAI config to localStorage:', error);
    }
}

/**
 * Load OpenAI configuration from local storage or environment variables
 */
export function loadOpenAIConfig(): OpenAIConfig {
    try {
        // First try to load from environment variables
        const envApiKey = import.meta.env.VITE_OPENAI_API_KEY;
        if (envApiKey && envApiKey !== 'your_openai_api_key_here') {
            return {
                ...DEFAULT_OPENAI_CONFIG,
                apiKey: envApiKey
            };
        }

        // Fall back to localStorage if no environment variable
        const saved = localStorage.getItem(STORAGE_KEYS.OPENAI_CONFIG);
        if (saved) {
            const parsed = JSON.parse(saved);
            return {
                ...DEFAULT_OPENAI_CONFIG,
                ...parsed
            };
        }
    } catch (error) {
        console.warn('Failed to load OpenAI config:', error);
    }
    return DEFAULT_OPENAI_CONFIG;
}

/**
 * Save Gemini configuration to local storage
 */
export function saveGeminiConfig(config: GeminiConfig): void {
    try {
        // Store the actual config for functionality
        localStorage.setItem(STORAGE_KEYS.GEMINI_CONFIG, JSON.stringify(config));
    } catch (error) {
        console.warn('Failed to save Gemini config to localStorage:', error);
    }
}

/**
 * Load Gemini configuration from local storage or environment variables
 */
export function loadGeminiConfig(): GeminiConfig {
    try {
        // First try to load from environment variables
        const envApiKey = import.meta.env.VITE_GEMINI_API_KEY;
        if (envApiKey && envApiKey !== 'your_gemini_api_key_here') {
            return {
                ...DEFAULT_GEMINI_CONFIG,
                apiKey: envApiKey
            };
        }

        // Fall back to localStorage if no environment variable
        const saved = localStorage.getItem(STORAGE_KEYS.GEMINI_CONFIG);
        if (saved) {
            const parsed = JSON.parse(saved);
            return {
                ...DEFAULT_GEMINI_CONFIG,
                ...parsed
            };
        }
    } catch (error) {
        console.warn('Failed to load Gemini config:', error);
    }
    return DEFAULT_GEMINI_CONFIG;
}

/**
 * Save selected AI provider preference
 */
export function saveSelectedAIProvider(provider: 'openai' | 'gemini'): void {
    try {
        localStorage.setItem(STORAGE_KEYS.SELECTED_AI_PROVIDER, provider);
    } catch (error) {
        console.warn('Failed to save AI provider preference:', error);
    }
}

/**
 * Load selected AI provider preference
 */
export function loadSelectedAIProvider(): 'openai' | 'gemini' {
    try {
        const saved = localStorage.getItem(STORAGE_KEYS.SELECTED_AI_PROVIDER);
        if (saved && (saved === 'openai' || saved === 'gemini')) {
            return saved;
        }
    } catch (error) {
        console.warn('Failed to load AI provider preference:', error);
    }
    return 'openai'; // Default to OpenAI
}

/**
 * Save processing history
 */
export function saveProcessingHistory(sessionId: string, data: any): void {
    try {
        const history = loadProcessingHistory();
        const newEntry = {
            sessionId,
            timestamp: new Date().toISOString(),
            studentCount: data.studentResponses?.length || 0,
            questionCount: data.answerKey?.answers?.length || 0
        };

        // Keep only last 10 sessions
        const updatedHistory = [newEntry, ...history.slice(0, 9)];
        localStorage.setItem(STORAGE_KEYS.PROCESSING_HISTORY, JSON.stringify(updatedHistory));
    } catch (error) {
        console.warn('Failed to save processing history:', error);
    }
}

/**
 * Load processing history
 */
export function loadProcessingHistory(): Array<{
    sessionId: string;
    timestamp: string;
    studentCount: number;
    questionCount: number;
}> {
    try {
        const saved = localStorage.getItem(STORAGE_KEYS.PROCESSING_HISTORY);
        if (saved) {
            return JSON.parse(saved);
        }
    } catch (error) {
        console.warn('Failed to load processing history:', error);
    }
    return [];
}

/**
 * Save user preferences
 */
export function saveUserPreferences(preferences: {
    defaultImageQuality: 'low' | 'medium' | 'high';
    defaultPreprocessing: any;
    theme: 'light' | 'dark';
}): void {
    try {
        localStorage.setItem(STORAGE_KEYS.USER_PREFERENCES, JSON.stringify(preferences));
    } catch (error) {
        console.warn('Failed to save user preferences:', error);
    }
}

/**
 * Load user preferences
 */
export function loadUserPreferences(): {
    defaultImageQuality: 'low' | 'medium' | 'high';
    defaultPreprocessing: any;
    theme: 'light' | 'dark';
} {
    try {
        const saved = localStorage.getItem(STORAGE_KEYS.USER_PREFERENCES);
        if (saved) {
            return JSON.parse(saved);
        }
    } catch (error) {
        console.warn('Failed to load user preferences:', error);
    }
    return {
        defaultImageQuality: 'medium',
        defaultPreprocessing: {},
        theme: 'light'
    };
}

/**
 * Save OMR processing results to local storage
 */
export function saveOMRResults(sessionId: string, results: any): void {
    try {
        localStorage.setItem(`omr_results_${sessionId}`, JSON.stringify(results));
    } catch (error) {
        console.warn('Failed to save OMR results to localStorage:', error);
    }
}

/**
 * Load OMR processing results from local storage
 */
export function loadOMRResults(sessionId: string): any | null {
    try {
        const saved = localStorage.getItem(`omr_results_${sessionId}`);
        if (saved) {
            return JSON.parse(saved);
        }
    } catch (error) {
        console.warn('Failed to load OMR results from localStorage:', error);
    }
    return null;
}

/**
 * Get all available OMR result sessions
 */
export function getAllOMRSessions(): Array<{
    sessionId: string;
    timestamp: string;
    totalImages: number;
    summary: {
        totalStudents: number;
        totalQuestions: number;
    };
}> {
    try {
        const sessions: any[] = [];
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.startsWith('omr_results_')) {
                try {
                    const data = JSON.parse(localStorage.getItem(key)!);
                    if (data && data.sessionId && data.timestamp) {
                        sessions.push({
                            sessionId: data.sessionId,
                            timestamp: data.timestamp,
                            totalImages: data.totalImages || 0,
                            summary: data.summary || { totalStudents: 0, totalQuestions: 0 }
                        });
                    }
                } catch (parseError) {
                    console.warn(`Failed to parse session data for key: ${key}`);
                }
            }
        }

        // Sort by timestamp (newest first)
        return sessions.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    } catch (error) {
        console.warn('Failed to get OMR sessions:', error);
        return [];
    }
}

/**
 * Delete a specific OMR result session
 */
export function deleteOMRSession(sessionId: string): boolean {
    try {
        localStorage.removeItem(`omr_results_${sessionId}`);
        return true;
    } catch (error) {
        console.warn('Failed to delete OMR session:', error);
        return false;
    }
}

/**
 * Export OMR results as downloadable JSON file
 */
export function exportOMRResults(sessionId: string, results: any): void {
    try {
        const jsonBlob = new Blob([JSON.stringify(results, null, 2)], { type: 'application/json' });
        const downloadUrl = URL.createObjectURL(jsonBlob);
        const downloadLink = document.createElement('a');
        downloadLink.href = downloadUrl;
        downloadLink.download = `omr_results_${sessionId}.json`;
        downloadLink.click();
        URL.revokeObjectURL(downloadUrl);
    } catch (error) {
        console.warn('Failed to export OMR results:', error);
    }
}

/**
 * Clear all stored data
 */
export function clearAllData(): void {
    try {
        Object.values(STORAGE_KEYS).forEach(key => {
            localStorage.removeItem(key);
        });
    } catch (error) {
        console.warn('Failed to clear stored data:', error);
    }
}

/**
 * Get storage usage information
 */
export function getStorageInfo(): {
    used: number;
    available: number;
    percentage: number;
} {
    try {
        // This is a rough estimation since localStorage doesn't provide size info
        let used = 0;
        Object.values(STORAGE_KEYS).forEach(key => {
            const item = localStorage.getItem(key);
            if (item) {
                used += new Blob([item]).size;
            }
        });

        // Estimate available space (localStorage typically has 5-10MB limit)
        const available = 5 * 1024 * 1024; // 5MB
        const percentage = (used / available) * 100;

        return {
            used,
            available,
            percentage: Math.min(percentage, 100)
        };
    } catch (error) {
        console.warn('Failed to get storage info:', error);
        return { used: 0, available: 0, percentage: 0 };
    }
}


