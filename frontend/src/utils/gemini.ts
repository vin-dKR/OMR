export interface GeminiConfig {
  apiKey: string;
  model: string;
  maxTokens: number;
  temperature: number;
}

export interface GeminiOMRProcessingRequest {
  image: string; // base64 encoded image (single image only)
}

export interface GeminiOMRProcessingResponse {
  success: boolean;
  data?: {
    answers: {
      [questionNumber: string]: 'A' | 'B' | 'C' | 'D' | null;
    };
  };
  error?: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

// Default Gemini configuration
export const DEFAULT_GEMINI_CONFIG: GeminiConfig = {
  apiKey: '',
  model: 'gemini-1.5-flash', // Good balance of speed and accuracy
  maxTokens: 8000,
  temperature: 0.1, // Low temperature for consistent results
};

/**
 * Process OMR images using Gemini Vision API
 */
export async function processOMRWithGemini(
  request: GeminiOMRProcessingRequest,
  config: GeminiConfig
): Promise<GeminiOMRProcessingResponse> {
  if (!config.apiKey) {
    throw new Error('Gemini API key is required');
  }

  try {
    // Prepare the system prompt for OMR processing
    const systemPrompt = `You are an expert OMR (Optical Mark Recognition) processor. Your task is to analyze an OMR answer sheet and extract the selected answers for each question.

CRITICAL REQUIREMENTS - READ CAREFULLY:
1. You MUST process ALL 180 questions (001-180) - do not skip any questions
2. You MUST look at each individual question and identify which bubble (A, B, C, D) is ACTUALLY filled/marked
3. DO NOT pattern-match or assume answers - analyze each question individually
4. Return results in EXACT JSON format specified below
5. DO NOT truncate or limit the response - process everything

REQUIRED JSON FORMAT (MUST include ALL 180 questions):
{
  "answers": {
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

IMPORTANT NOTES:
- Question numbers MUST be "001", "002", "003", ..., "180" (ALL questions)
- Answers should be one of: "A", "B", "C", "D", or null if unclear
- Use 3-digit format for question numbers (001, 002, etc.)
- DO NOT skip any questions - process all 180
- Look for DARK, FILLED circles/bubbles for each question
- Each question should have ONLY ONE bubble filled (A, B, C, or D)
- If you can't see a filled bubble clearly, use null
- Return ONLY valid JSON, no additional text or explanations`;

    // Prepare the user message with single image
    const userMessage = {
      role: 'user' as const,
      content: [
        {
          type: 'text' as const,
          text: `Please process this OMR image and extract the selected answers for all 180 questions.

CRITICAL INSTRUCTIONS FOR BUBBLE DETECTION:
1. Look at each question individually
2. Identify which bubble (A, B, C, or D) is ACTUALLY filled/marked
3. Look for dark, filled circles - these are the selected answers
4. DO NOT pattern-match or assume answers
5. Each question should have only ONE bubble filled
6. If you can't see a filled bubble clearly, use null

IMPORTANT: You must process ALL 180 questions (001-180).

Return ONLY the JSON response, no additional text or explanations.`
        },
        // Add single image
        {
          type: 'image_url' as const,
          image_url: {
            url: `data:image/jpeg;base64,${request.image}`,
            detail: 'high'
          }
        }
      ]
    };

    // Make API call to Gemini
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${config.model}:generateContent?key=${config.apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [
          {
            role: 'user',
            parts: [
              {
                text: systemPrompt + '\n\n' + userMessage.content[0].text
              },
              {
                inlineData: {
                  mimeType: 'image/jpeg',
                  data: request.image // Remove data:image/jpeg;base64, prefix
                }
              }
            ]
          }
        ],
        generationConfig: {
          temperature: config.temperature,
          maxOutputTokens: config.maxTokens,
          responseMimeType: 'application/json'
        }
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const errorMessage = errorData.error?.message || errorData.error?.details?.[0]?.error?.message || response.statusText;
      throw new Error(`Gemini API error: ${response.status} - ${errorMessage}`);
    }

    const data = await response.json();
    
    // Check for Gemini-specific error responses
    if (data.promptFeedback?.blockReason) {
      throw new Error(`Gemini content blocked: ${data.promptFeedback.blockReason}`);
    }
    console.log('data from ai:', data);
    
    const content = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!content) {
      throw new Error('No content received from Gemini API');
    }

    // Parse the JSON response
    let parsedData;
    try {
      // Clean up the response text to extract just the JSON
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in response');
      }
      
      parsedData = JSON.parse(jsonMatch[0]);
    } catch (parseError) {
      throw new Error(`Failed to parse Gemini response: ${parseError}`);
    }

    // Validate the response structure
    if (!parsedData.answers || typeof parsedData.answers !== 'object') {
      throw new Error('Invalid response structure: missing answers');
    }

    // Ensure all 180 questions are present
    const expectedQuestions = Array.from({ length: 180 }, (_, i) => (i + 1).toString().padStart(3, '0'));
    const receivedQuestions = Object.keys(parsedData.answers);
    
    if (receivedQuestions.length < 180) {
      console.warn(`Warning: Only ${receivedQuestions.length} questions received, expected 180`);
      
      // Fill in missing questions with null
      expectedQuestions.forEach(questionNum => {
        if (!parsedData.answers[questionNum]) {
          parsedData.answers[questionNum] = null;
        }
      });
    }

    return {
      success: true,
      data: {
        answers: parsedData.answers
      },
      usage: {
        promptTokens: data.usageMetadata?.promptTokenCount || 0,
        completionTokens: data.usageMetadata?.completionTokenCount || 0,
        totalTokens: (data.usageMetadata?.promptTokenCount || 0) + (data.usageMetadata?.completionTokenCount || 0)
      }
    };

  } catch (error) {
    console.error('Gemini API processing error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
}

/**
 * Validate Gemini API key format
 */
export function validateGeminiAPIKey(apiKey: string): boolean {
  return apiKey.length > 20; // Gemini API keys are typically long strings
}

/**
 * Estimate API cost based on image count and processing
 */
export function estimateGeminiAPICost(
  imageCount: number,
  config: GeminiConfig = DEFAULT_GEMINI_CONFIG
): number {
  // Gemini pricing (approximate as of 2024)
  // Note: Gemini pricing is different from OpenAI, this is an estimate
  const inputCostPer1K = 0.0025; // $0.0025 per 1K input tokens
  const outputCostPer1K = 0.0075; // $0.0075 per 1K output tokens
  
  // Estimate tokens based on image count and complexity
  const estimatedInputTokens = imageCount * 1000; // High detail images
  const estimatedOutputTokens = 2000; // JSON response for 180 questions
  
  const inputCost = (estimatedInputTokens / 1000) * inputCostPer1K;
  const outputCost = (estimatedOutputTokens / 1000) * outputCostPer1K;
  
  return inputCost + outputCost;
}
