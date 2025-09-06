import { type OMRProcessingRequest, type OMRProcessingResponse, type OpenAIConfig } from '../types/openai'

// Default OpenAI configuration
export const DEFAULT_OPENAI_CONFIG: OpenAIConfig = {
    apiKey: import.meta.env.VITE_OPENAI_API_KEY,
    model: 'gpt-4-vision-preview', // Use a vision model
    maxTokens: 8000,
    temperature: 0.1,
};

// Process OMR images using OpenAI Vision API
export async function processOMRWithOpenAI(
    request: OMRProcessingRequest,
    config: OpenAIConfig
): Promise<OMRProcessingResponse> {
    if (!config.apiKey) {
        throw new Error('OpenAI API key is required');
    }

    try {
        // Prepare the system prompt for OMR processing (similar to Gemini)
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
    // ... continue for ALL 180 questions (001-180)
  }
}

IMPORTANT NOTES:
- Question numbers MUST be "001", "002", "003", ..., "180" (ALL questions)
- Answers should be one of: "A", "B", "C", "D", or null if unclear
- Use 3-digit format for question numbers (001, 002, etc.)
- DO NOT skip any questions - process all
- Look for DARK, FILLED circles/bubbles for each question
- Each question should have ONLY ONE bubble filled (A, B, C, or D)
- If you can't see a filled bubble clearly, use null
- Return ONLY valid JSON, no additional text or explanations`;

        // Determine if processing answer key or student responses
        const isAnswerKey = !!request.answerKeyImage;
        const images = isAnswerKey ? [request.answerKeyImage] : request.studentResponseImages;

        // eslint-disable-next-line rule-name
        // @ts-ignore
        const results: OMRProcessingResponse['data'] = isAnswerKey ? { answerKey: {} } : { studentResponses: [] };

        for (let i = 0; i < images.length; i++) {
            const image = images[i];

            const userMessage = [
                { type: 'text' as const, text: systemPrompt },
                { type: 'image_url' as const, image_url: { url: `data:image/jpeg;base64,${image}` } },
            ];

            const response = await fetch('https://api.openai.com/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${config.apiKey}`,
                },
                body: JSON.stringify({
                    model: config.model,
                    messages: [
                        { role: 'system', content: systemPrompt },
                        { role: 'user', content: userMessage },
                    ],
                    max_tokens: config.maxTokens,
                    temperature: config.temperature,
                }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(`OpenAI API error: ${response.status} - ${errorData.error.message}`);
            }

            const data = await response.json();
            const content = data.choices[0].message.content;

            let parsedData;
            try {
                const jsonMatch = content.match(/\{[\s\S]*\}/);
                if (!jsonMatch) {
                    throw new Error('No JSON found in response');
                }
                parsedData = JSON.parse(jsonMatch[0]);
            } catch (parseError) {
                throw new Error(`Failed to parse OpenAI response: ${parseError}`);
            }

            if (!parsedData.answers) {
                throw new Error('Invalid response structure: missing answers');
            }

            if (isAnswerKey) {
                // eslint-disable-next-line rule-name
                // @ts-ignore
                results.answerKey = parsedData.answers;
            } else {
                // eslint-disable-next-line rule-name
                // @ts-ignore
                results.studentResponses!.push({
                    studentId: `student-${i + 1}`,
                    responses: parsedData.answers,
                });
            }
        }

        return {
            success: true,
            data: results,
            usage: {
                promptTokens: 0, // OpenAI usage can be extracted from data.usage
                completionTokens: 0,
                totalTokens: 0,
            },
        };
    } catch (error) {
        console.error('OpenAI API processing error:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error occurred',
        };
    }
}

// Validate OpenAI API key format
export function validateOpenAIAPIKey(apiKey: string): boolean {
    return apiKey.startsWith('sk-') && apiKey.length > 20;
}

// Estimate API cost (similar to Gemini)
export function estimateOpenAIAPICost(
    imageCount: number,
): number {
    const inputCostPer1K = 0.01; // Approximate for vision
    const outputCostPer1K = 0.03;

    const estimatedInputTokens = imageCount * 1000;
    const estimatedOutputTokens = 2000;

    const inputCost = (estimatedInputTokens / 1000) * inputCostPer1K;
    const outputCost = (estimatedOutputTokens / 1000) * outputCostPer1K;

    return inputCost + outputCost;
}
