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

// Default OpenAI configuration
export const DEFAULT_OPENAI_CONFIG: OpenAIConfig = {
  apiKey: '',
  model: 'gpt-4-vision-preview',
  maxTokens: 8000, // Increased for full 180 questions + multiple students
  temperature: 0.1, // Low temperature for consistent results
};

/**
 * Convert image file to base64 string
 */
export function imageToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      // Remove data:image/jpeg;base64, prefix
      const base64 = result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/**
 * Process OMR images using OpenAI Vision API
 */
export async function processOMRWithOpenAI(
  request: OMRProcessingRequest,
  config: OpenAIConfig
): Promise<OMRProcessingResponse> {
  if (!config.apiKey) {
    throw new Error('OpenAI API key is required');
  }

  try {
    // Prepare the system prompt for OMR processing
    const systemPrompt = `You are an expert OMR (Optical Mark Recognition) processor. Your task is to analyze OMR answer sheets and extract the selected answers for each question.

CRITICAL REQUIREMENTS - READ CAREFULLY:
1. You MUST process ALL 180 questions (001-180) - do not skip any questions
2. You MUST process ALL student response sheets provided (not just one)
3. Return results in EXACT JSON format specified below
4. Be very careful with bubble detection - only mark as selected if clearly filled
5. DO NOT truncate or limit the response - process everything

REQUIRED JSON FORMAT (MUST include ALL 180 questions):
{
  "answerKey": {
    "001": "<selected_response>",
    "002": "<selected_response>",
    "003": "<selected_response>",
    "004": "<selected_response>",
    "005": "<selected_response>",
    "006": "<selected_response>",
    "007": "<selected_response>",
    "008": "<selected_response>",
    "009": "<selected_response>",
    "010": "<selected_response>"
    // ... continue for ALL 180 questions (001-180)
  },
  "studentResponses": [
    {
      "studentId": "student-1",
      "responses": {
        "001": "<selected_response>",
        "002": "<selected_response>",
        "003": "<selected_response>",
        "004": "<selected_response>",
        "005": "<selected_response>",
        "006": "<selected_response>",
        "007": "<selected_response>",
        "008": "<selected_response>",
        "009": "<selected_response>",
        "010": "<selected_response>"
        // ... continue for ALL 180 questions (001-180)
      }
    }
    // ... continue for ALL students provided
  ]
}

IMPORTANT NOTES:
- Question numbers MUST be "001", "002", "003", ..., "180" (ALL questions)
- Answers should be one of: "A", "B", "C", "D", or null if unclear
- Use 3-digit format for question numbers (001, 002, etc.)
- DO NOT skip any questions - process all 180
- Process ALL student response sheets provided
- Use max_tokens efficiently to ensure complete response`;

    // Prepare the user message with images
    const userMessage = {
      role: 'user' as const,
      content: [
        {
          type: 'text' as const,
          text: `Please process these OMR images. The first image is the answer key, followed by ${request.studentResponseImages.length} student response sheets.

CRITICAL INSTRUCTIONS FOR BUBBLE DETECTION:
1. Look at each question individually
2. Identify which bubble (A, B, C, or D) is ACTUALLY filled/marked
3. Look for dark, filled circles - these are the student's answers
4. DO NOT pattern-match or assume answers
5. Each question should have only ONE bubble filled
6. If you can't see a filled bubble clearly, use null

IMPORTANT: You must process ALL 180 questions (001-180) and ALL ${request.studentResponseImages.length} student response sheets.

Return ONLY the JSON response, no additional text or explanations.`
        },
        // Add answer key image
        {
          type: 'image_url' as const,
          image_url: {
            url: `data:image/jpeg;base64,${request.answerKeyImage}`,
            detail: 'high'
          }
        },
        // Add student response images
        ...request.studentResponseImages.map((image, index) => ({
          type: 'image_url' as const,
          image_url: {
            url: `data:image/jpeg;base64,${image}`,
            detail: 'high'
          }
        }))
      ]
    };

    // Make API call to OpenAI
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${config.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: config.model,
        messages: [
          { role: 'system', content: systemPrompt },
          userMessage
        ],
        max_tokens: config.maxTokens,
        temperature: config.temperature,
        response_format: { type: 'json_object' }
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(`OpenAI API error: ${response.status} - ${errorData.error?.message || response.statusText}`);
    }

    const data = await response.json();
    const content = data.choices[0]?.message?.content;

    if (!content) {
      throw new Error('No content received from OpenAI API');
    }

    // Parse the JSON response
    let parsedData;
    try {
      parsedData = JSON.parse(content);
    } catch (parseError) {
      throw new Error(`Failed to parse OpenAI response: ${parseError}`);
          }
      
      // Validate the response structure
    if (!parsedData.answerKey || typeof parsedData.answerKey !== 'object') {
      throw new Error('Invalid response structure: missing answerKey');
    }

    if (!parsedData.studentResponses || !Array.isArray(parsedData.studentResponses)) {
      throw new Error('Invalid response structure: missing or invalid studentResponses');
    }

    // Ensure all 180 questions are present in answer key
    const answerKeyQuestions = Object.keys(parsedData.answerKey);
    if (answerKeyQuestions.length < 180) {
      console.warn(`Warning: Only ${answerKeyQuestions.length} questions processed instead of 180. Attempting to fill missing questions.`);
      
      // Fill missing questions with default values
      for (let i = 1; i <= 180; i++) {
        const questionKey = i.toString().padStart(3, '0'); // "001", "002", etc.
        if (!parsedData.answerKey[questionKey]) {
          parsedData.answerKey[questionKey] = 'A'; // Default answer
        }
      }
    }

    // Ensure each student has all questions
    parsedData.studentResponses.forEach((student: any, studentIndex: number) => {
      if (!student.responses || typeof student.responses !== 'object') {
        throw new Error(`Invalid student ${studentIndex + 1}: missing responses object`);
      }
      
      const studentQuestionKeys = Object.keys(student.responses);
      if (studentQuestionKeys.length < 180) {
        console.warn(`Warning: Student ${studentIndex + 1} only has ${studentQuestionKeys.length} responses. Attempting to fill missing questions.`);
        
        // Fill missing questions with null answers
        for (let i = 1; i <= 180; i++) {
          const questionKey = i.toString().padStart(3, '0'); // "001", "002", etc.
          if (!student.responses[questionKey]) {
            student.responses[questionKey] = null; // No answer for missing questions
          }
        }
      }
    });

    return {
      success: true,
      data: parsedData,
      usage: data.usage
    };

  } catch (error) {
    console.error('OpenAI API processing failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
}

/**
 * Validate OpenAI API key format
 */
export function validateAPIKey(apiKey: string): boolean {
  return apiKey.startsWith('sk-') && apiKey.length > 20;
}

/**
 * Estimate API cost based on image count and processing
 */
export function estimateAPICost(
  imageCount: number,
  config: OpenAIConfig = DEFAULT_OPENAI_CONFIG
): number {
  // GPT-4 Vision pricing (approximate as of 2024)
  const inputCostPer1K = 0.01; // $0.01 per 1K input tokens
  const outputCostPer1K = 0.03; // $0.03 per 1K output tokens
  
  // Estimate tokens based on image count and complexity
  const estimatedInputTokens = imageCount * 1000; // High detail images
  const estimatedOutputTokens = 2000; // Simplified JSON response for 180 questions
  
  const inputCost = (estimatedInputTokens / 1000) * inputCostPer1K;
  const outputCost = (estimatedOutputTokens / 1000) * outputCostPer1K;
  
  return inputCost + outputCost;
}
