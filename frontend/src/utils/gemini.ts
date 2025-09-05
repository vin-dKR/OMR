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

export const DEFAULT_GEMINI_CONFIG: GeminiConfig = {
    apiKey: '',
    model: 'gemini-1.5-flash',
    maxTokens: 8000,
    temperature: 0.1,
};

export async function processOMRWithGemini(
    request: GeminiOMRProcessingRequest,
    config: GeminiConfig
): Promise<GeminiOMRProcessingResponse> {
    console.log("ai is workig here .......................")

    if (!config.apiKey) {
        throw new Error('Gemini API key is required');
    }

    try {
        const systemPrompt = `You are an expert OMR (Optical Mark Recognition) processor specialized in analyzing student answer sheets. Your task is to examine the provided OMR sheet image and accurately detect the filled (dark/blackened) bubbles for each question.

CRITICAL REQUIREMENTS - READ CAREFULLY:
1. Detect ALL questions present in the image - scan the entire sheet and identify question numbers (typically starting from 1 upwards). Do not assume a fixed number; determine based on what is visible.
2. For EACH question, independently analyze the bubbles/options (A, B, C, D) beside the question number.
3. Identify ONLY the bubble that is clearly filled/darkened/blackened. If none or multiple are unclear, use null.
4. DO NOT guess or assume patterns - base decisions solely on visual evidence of filled circles.
5. Handle variable sheet layouts: questions may be in columns, rows, or sections; look for question numbers and adjacent A/B/C/D options.
6. If the image quality is poor or parts are obscured, use null for affected questions.
7. Return results in EXACT JSON format specified below - no additional text.

REQUIRED JSON FORMAT (include ALL detected questions, keyed by their number as strings, e.g., "1", "2"):
{
  "answers": {
    "1": "<selected_option>",
    "2": "<selected_option>",
    // ... continue for ALL detected questions in numerical order
  }
}

IMPORTANT NOTES:
- Question keys MUST be strings of the detected question numbers (e.g., "1", "2", ... no padding).
- Selected options MUST be one of: "A", "B", "C", "D", or null if no clear fill or uncertain.
- Sort the answers object by question number in ascending order.
- If no questions are detected, return an empty "answers" object.
- Focus on precision: only mark a bubble as selected if it's distinctly darker/filled compared to others.
- Return ONLY valid JSON, no explanations or extra content.`;

        const userMessage = {
            role: 'user' as const,
            content: [
                {
                    type: 'text' as const,
                    text: `Analyze this OMR student answer sheet image and extract the selected answers.

CRITICAL INSTRUCTIONS FOR DETECTION:
1. Scan for question numbers (e.g., 1, 2, 3...) and their corresponding A/B/C/D bubbles.
2. For each question, check which bubble is filled/darkened (look for solid black circles).
3. If a bubble is partially filled or ambiguous, use null to avoid errors.
4. Process the entire image - detect as many questions as visible.
5. Assume standard multiple-choice format unless otherwise visible.

Return ONLY the JSON response as specified, no additional text.`
                },
                {
                    type: 'image_url' as const,
                    image_url: {
                        url: `data:image/jpeg;base64,${request.image}`,
                        detail: 'high'
                    }
                }
            ]
        };

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
        console.log("the ai data...................", data)

        if (data.promptFeedback?.blockReason) {
            throw new Error(`Gemini content blocked: ${data.promptFeedback.blockReason}`);
        }

        const content = data.candidates?.[0]?.content?.parts?.[0]?.text;

        if (!content) {
            throw new Error('No content received from Gemini API');
        }

        let parsedData;
        try {
            const jsonMatch = content.match(/\{[\s\S]*\}/);
            if (!jsonMatch) {
                throw new Error('No JSON found in response');
            }
            parsedData = JSON.parse(jsonMatch[0]);
            console.log("still in try blocak....................")
        } catch (parseError) {
            throw new Error(`Failed to parse Gemini response: ${parseError}`);
        }

        if (!parsedData.answers || typeof parsedData.answers !== 'object') {
            throw new Error('Invalid response structure: missing answers');
        }

        // Sort answers by question number (ascending)
        const sortedAnswers = Object.keys(parsedData.answers)
            .sort((a, b) => parseInt(a) - parseInt(b))
            .reduce((acc, key) => {
                acc[key] = parsedData.answers[key];
                return acc;
            }, {} as { [key: string]: 'A' | 'B' | 'C' | 'D' | null });

        return {
            success: true,
            data: {
                answers: sortedAnswers
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

export function validateGeminiAPIKey(apiKey: string): boolean {
    return apiKey.length > 20;
}

export function estimateGeminiAPICost(
    imageCount: number,
    config: GeminiConfig = DEFAULT_GEMINI_CONFIG
): number {
    const inputCostPer1K = 0.0025;
    const outputCostPer1K = 0.0075;
    const estimatedInputTokens = imageCount * 1000;
    const estimatedOutputTokens = 2000;
    const inputCost = (estimatedInputTokens / 1000) * inputCostPer1K;
    const outputCost = (estimatedOutputTokens / 1000) * outputCostPer1K;
    return inputCost + outputCost;
}
