export interface OpenAIConfig {
    apiKey: string;
    model: string;
    maxTokens: number;
    temperature: number;
}

export interface OMRProcessingRequest {
    answerKeyImage: string; // base64 encoded image
    studentResponseImages: string[]; // array of base64 encoded images
    preprocessingOptions: {
        contrast: number;
        brightness: number;
        noiseReduction: number;
        sharpen: number;
    };
}

export interface OMRProcessingResponse {
    success: boolean;
    data?: {
        answerKey: {
            [questionNumber: string]: 'A' | 'B' | 'C' | 'D';
        };
        studentResponses: Array<{
            studentId: string;
            responses: {
                [questionNumber: string]: 'A' | 'B' | 'C' | 'D' | null;
            };
        }>;
    };
    error?: string;
    usage?: {
        promptTokens: number;
        completionTokens: number;
        totalTokens: number;
    };
}
