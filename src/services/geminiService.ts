import { GoogleGenAI } from "@google/genai";

const env = import.meta.env as Record<string, string | undefined>;
const apiKey = env.VITE_GEMINI_API_KEY ?? env.GEMINI_API_KEY ?? "";

if (!apiKey) {
  throw new Error(
    "Missing Gemini API key. Set VITE_GEMINI_API_KEY or GEMINI_API_KEY in .env.local (UTF-8 encoding) and restart the dev server."
  );
}

const ai = new GoogleGenAI({ apiKey });

export interface BESSErrors {
  handsOffIliacCrests: number;
  openingEyes: number;
  stepStumbleFall: number;
  hipFlexionAbduction: number;
  liftingForefootHeel: number;
  outOfPosition: number;
}

export interface BESSAnalysisResult {
  totalScore: number;
  breakdown: BESSErrors;
  summary: string;
}

export async function analyzeBESSVideo(
  videoBase64: string,
  stance: string,
  surface: string
): Promise<BESSAnalysisResult> {
  const prompt = `
    Analyze this video of a person performing a Balance Error Scoring System (BESS) test.
    Stance: ${stance}
    Surface: ${surface}

    The BESS test lasts 20 seconds. Count the number of errors according to these 6 criteria:
    1. Hands lifted off iliac crests (hips).
    2. Opening eyes.
    3. Step, stumble, or fall.
    4. Moving hip into more than 30 degrees of flexion or abduction.
    5. Lifting forefoot or heel.
    6. Remaining out of test position for more than 5 seconds.

    Rules:
    - Maximum score for a single stance is 10.
    - If multiple errors occur simultaneously, only one error is counted.
    - If the subject is out of position for more than 5 seconds, only one error is counted.

    Return the result in JSON format with the following structure:
    {
      "totalScore": number,
      "breakdown": {
        "handsOffIliacCrests": number,
        "openingEyes": number,
        "stepStumbleFall": number,
        "hipFlexionAbduction": number,
        "liftingForefootHeel": number,
        "outOfPosition": number
      },
      "summary": "A brief explanation of the observed balance performance."
    }
  `;

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: [
      {
        parts: [
          { text: prompt },
          {
            inlineData: {
              mimeType: "video/mp4",
              data: videoBase64,
            },
          },
        ],
      },
    ],
    config: {
      responseMimeType: "application/json",
    },
  });

  const text = response.text;
  if (!text) throw new Error("No response from AI");
  return JSON.parse(text);
}
