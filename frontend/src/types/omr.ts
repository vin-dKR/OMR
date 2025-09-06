export interface OMRResponse {
    questionId: string
    questionNumber: number;
    selectedAnswer: 'A' | 'B' | 'C' | 'D' | null;
    confidence: number;
}

export interface StudentResponse {
    id: string;
    name: string;
    imageFile: File;
    responses: OMRResponse[];
    processedAt: Date;
    isProcessing?: boolean; // Added for background processing
}

export interface AnswerKey {
    imageFile?: File;
    answers: OMRResponse[];
    processedAt: Date;
}

export interface OMRData {
    answerKey: AnswerKey;
    studentResponses: StudentResponse[];
    sessionId: string;
    createdAt: Date;
    isProcessing?: boolean; // Added for background processing
}

export interface ProcessingResult {
    success: boolean;
    data?: OMRData;
    error?: string;
}

export interface Base64Images {
    answerKey?: string;
    studentFiles: string[];
}
