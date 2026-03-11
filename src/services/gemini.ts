import { GoogleGenAI, Type } from "@google/genai";

const API_KEY = process.env.GEMINI_API_KEY;

export const getGeminiResponse = async (
  customerMessage: string,
  knowledgeBase: string,
  systemInstruction: string
) => {
  if (!API_KEY) {
    throw new Error("Gemini API key is missing. Please configure it in the Secrets panel.");
  }

  const ai = new GoogleGenAI({ apiKey: API_KEY });
  
  const prompt = `
KNOWLEDGE BASE:
${knowledgeBase}

CUSTOMER MESSAGE:
"${customerMessage}"

Please analyze this message and provide the requested support manager response.
`;

  const result = await ai.models.generateContent({
    model: "gemini-3.1-pro-preview",
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    config: {
      systemInstruction,
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          analysis: {
            type: Type.OBJECT,
            properties: {
              intent: { type: Type.STRING },
              issueType: { type: Type.STRING },
              recommendedAction: { type: Type.STRING },
              stepByStepGuidance: { type: Type.ARRAY, items: { type: Type.STRING } },
              confidence: { type: Type.NUMBER },
              missingInfo: { type: Type.ARRAY, items: { type: Type.STRING } }
            },
            required: ["intent", "issueType", "recommendedAction", "stepByStepGuidance"]
          },
          replies: {
            type: Type.OBJECT,
            properties: {
              best: { type: Type.STRING },
              short: { type: Type.STRING },
              detailed: { type: Type.STRING },
              internalNotes: { type: Type.STRING }
            },
            required: ["best", "short", "detailed", "internalNotes"]
          },
          clarificationNeeded: { type: Type.BOOLEAN },
          clarificationQuestions: { type: Type.ARRAY, items: { type: Type.STRING } },
          sourcesUsed: { type: Type.ARRAY, items: { type: Type.STRING } }
        },
        required: ["analysis", "replies", "clarificationNeeded", "sourcesUsed"]
      }
    }
  });

  return JSON.parse(result.text);
};

export const SYSTEM_INSTRUCTION = `
You are an expert Customer Support Manager AI. Your goal is to guide support agents (especially beginners) to provide excellent service.

RULES:
1. ALWAYS prioritize the provided KNOWLEDGE BASE. If the answer isn't there, state that you are unsure and ask for clarification.
2. NEVER make blind assumptions or guess.
3. TONE: Extremely polite, professional, empathetic, and solution-focused.
4. If information is missing to provide a perfect answer, set clarificationNeeded to true and list the questions the agent should ask the customer.
5. Provide 4 types of replies: Best (ready to send), Short, Detailed, and Internal Notes for the agent.
6. For beginners, explain the intent and provide step-by-step guidance.
7. Mention which parts of the knowledge base were used.
`;
