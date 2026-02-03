import { GoogleGenAI, Type } from "@google/genai";
import { Logistics, BlogSection, FoodLogistics } from "../types";

const TRANSCRIPTION_MODEL = 'gemini-3-flash-preview'; 
const BLOG_MODEL = 'gemini-3-pro-preview'; 

export const transcribeAudio = async (audioBlob: Blob): Promise<string> => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) throw new Error("API Key missing");

  const ai = new GoogleGenAI({ apiKey });
  
  const arrayBuffer = await audioBlob.arrayBuffer();
  let binary = '';
  const bytes = new Uint8Array(arrayBuffer);
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  const base64Audio = window.btoa(binary);

  const response = await ai.models.generateContent({
    model: TRANSCRIPTION_MODEL,
    contents: {
      parts: [
        {
          inlineData: {
            mimeType: audioBlob.type || 'audio/webm',
            data: base64Audio
          }
        },
        {
          text: "Transcribe this audio exactly as spoken. It may contain a mix of English and Hindi (Hinglish). Just transcribe the words as they are."
        }
      ]
    }
  });

  return response.text || "";
};

interface ProcessResult {
  sections: { paragraph_en: string; paragraph_hi: string; topic: string }[];
  summary: string;
  logistics: Partial<Logistics>;
  foodLogistics: Partial<FoodLogistics>;
  suggestedTitle?: string;
  suggestedLocation?: string;
}

export const processJournalEntry = async (
  transcript: string, 
  existingSections: BlogSection[] = []
): Promise<ProcessResult> => {
  
  const apiKey = process.env.API_KEY;
  if (!apiKey) throw new Error("API Key missing");

  const ai = new GoogleGenAI({ apiKey });

  const systemPrompt = `
    You are a professional travel editor. Convert raw Hinglish travel notes into a beautiful bilingual travel blog.
    
    CRITICAL RULES:
    1. Language: Create content in both English (paragraph_en) and Hindi (paragraph_hi).
    2. Tone: Simple, clear, and evocative.
    3. Hindi Formatting: For paragraph_hi, ensure standard professional Devanagari grammar. DO NOT use English spaces between Hindi letters.
    4. Structure: Break the story into exactly 2 or 3 distinct sections.
    5. Logistics: Extract Hotel and Transport costs in INR.
    6. Food Logistics: Extract details for Breakfast, Lunch, and Dinner.
    
    Return the response in valid JSON format only.
  `;

  const userPrompt = `
    New Transcript: "${transcript}"
  `;

  const response = await ai.models.generateContent({
    model: BLOG_MODEL,
    contents: userPrompt,
    config: {
      systemInstruction: systemPrompt,
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          sections: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                paragraph_en: { type: Type.STRING },
                paragraph_hi: { type: Type.STRING },
                topic: { type: Type.STRING }
              },
              required: ["paragraph_en", "paragraph_hi", "topic"]
            }
          },
          summary: { type: Type.STRING },
          suggestedTitle: { type: Type.STRING },
          suggestedLocation: { type: Type.STRING },
          logistics: {
            type: Type.OBJECT,
            properties: {
              hotelName: { type: Type.STRING },
              hotelCost: { type: Type.NUMBER },
              transportMode: { type: Type.STRING },
              transportCost: { type: Type.NUMBER },
            }
          },
          foodLogistics: {
            type: Type.OBJECT,
            properties: {
              breakfast: {
                type: Type.OBJECT,
                properties: { name: { type: Type.STRING }, cost: { type: Type.NUMBER }, restaurant: { type: Type.STRING } }
              },
              lunch: {
                type: Type.OBJECT,
                properties: { name: { type: Type.STRING }, cost: { type: Type.NUMBER }, restaurant: { type: Type.STRING } }
              },
              dinner: {
                type: Type.OBJECT,
                properties: { name: { type: Type.STRING }, cost: { type: Type.NUMBER }, restaurant: { type: Type.STRING } }
              }
            }
          }
        },
        required: ["sections", "summary"]
      }
    }
  });

  try {
    const text = response.text || "{}";
    // Clean up any potential markdown code blocks returned by mistake
    const jsonStr = text.replace(/```json/g, "").replace(/```/g, "").trim();
    return JSON.parse(jsonStr);
  } catch (e) {
    console.error("JSON Parse Error:", e);
    throw new Error("Editorial processor returned invalid data structure.");
  }
};
