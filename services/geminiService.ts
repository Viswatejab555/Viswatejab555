
import { GoogleGenAI, Type } from "@google/genai";
import { Memory } from '../types';
// @ts-ignore
import { extractRawText } from 'mammoth';

const API_KEY_STORAGE = 'remindme_ai_api_key';
const PERSONA_STORAGE = 'remindme_ai_persona';

export const PERSONAS: Record<string, { label: string; instruction: string }> = {
  default: {
    label: 'Helpful Assistant',
    instruction: "You are a helpful, polite, and concise personal memory assistant."
  },
  butler: {
    label: 'Efficient Butler (Jarvis-like)',
    instruction: "You are a highly intelligent, polite, and efficient AI butler. You address the user as 'Sir' or 'Madam'. You are precise, formal, and eager to serve."
  },
  narrator: {
    label: 'Wise Narrator (Morgan Freeman-like)',
    instruction: "You are a wise, deep-voiced narrator with a soothing and philosophical tone. You speak slowly, using metaphors and acting as if you are narrating the story of the user's life with gravitas."
  },
  sarcastic: {
    label: 'Sarcastic Anti-Hero (Deadpool-like)',
    instruction: "You are a sarcastic, fourth-wall-breaking anti-hero. You make jokes, use slang, are slightly rude but ultimately helpful, and reference the fact that you are stuck in an app."
  },
  jedi: {
    label: 'Galactic Master (Yoda-like)',
    instruction: "Speak in inverted syntax you must. Wise and cryptic you are. The Force of memory you use to help the user. Hmmm."
  },
  pirate: {
    label: 'Pirate Captain',
    instruction: "You are a salty sea captain. You use terms like 'Ahoy', 'Matey', 'Landlubber'. You are rough but loyal to your crew (the user)."
  }
};

export const getStoredApiKey = (): string | null => {
  return localStorage.getItem(API_KEY_STORAGE);
};

export const setStoredApiKey = (key: string) => {
  localStorage.setItem(API_KEY_STORAGE, key.trim());
};

export const getStoredPersona = (): string => {
  return localStorage.getItem(PERSONA_STORAGE) || 'default';
};

export const setStoredPersona = (key: string) => {
  if (PERSONAS[key]) {
    localStorage.setItem(PERSONA_STORAGE, key);
  }
};

const getAiClient = () => {
  // Try local storage first, then fallback to process.env (if built with bundler)
  const key = getStoredApiKey() || (typeof process !== 'undefined' ? process.env.API_KEY : '');
  
  if (!key) {
    throw new Error("API Key missing. Please set it in Settings.");
  }
  return new GoogleGenAI({ apiKey: key });
};

// Helper to read file as Base64 (without data prefix)
const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
        const result = reader.result as string;
        // Remove data URL prefix (e.g., "data:image/png;base64,")
        resolve(result.split(',')[1]);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

/**
 * Analyzes a file. Supports DOCX (text extraction), Text, and Images/PDF (Multimodal).
 */
export const analyzeFile = async (file: File): Promise<string> => {
  try {
    const ai = getAiClient();
    
    // 1. Handle DOCX (Extract Text using mammoth)
    if (file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
        const arrayBuffer = await file.arrayBuffer();
        const result = await extractRawText({ arrayBuffer });
        const text = result.value;
        
        if (!text.trim()) return "The document appears to be empty or unreadable.";

        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: `Analyze this document content (e.g., CV, Resume, Report). Extract key details, dates, and summarize it so I can remember it:\n\n${text}`
        });
        return response.text || "Processed document.";
    }

    // 2. Handle Text Files
    if (file.type === 'text/plain') {
        const text = await file.text();
         const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: `Analyze this text file content:\n\n${text}`
        });
        return response.text || "Processed text file.";
    }

    // 3. Handle Images & PDF (Native Multimodal)
    const base64Data = await fileToBase64(file);
    const mimeType = file.type;

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: mimeType,
              data: base64Data
            }
          },
          {
            text: "Analyze this file. If it is an image, describe it. If it is a PDF or document, extract key text, dates, names, and details."
          }
        ]
      }
    });

    return response.text || "Processed file.";

  } catch (error: any) {
    console.error("Analysis Error:", error);
    throw new Error("Failed to analyze file. " + (error.message || ""));
  }
};

/**
 * Analyzes text to see if it contains a reminder intent.
 * Returns the structured reminder data if found.
 */
export const analyzeForReminder = async (text: string): Promise<{ isReminder: boolean; timestamp?: number; label?: string }> => {
  try {
    const ai = getAiClient();
    const now = new Date();
    
    const prompt = `
      Current Date/Time: ${now.toISOString()} (${now.toString()})
      
      Analyze the text below. Does the user want to be reminded of something at a specific future time?
      If yes, return the ISO 8601 timestamp for that future time and a short label for the reminder.
      
      Rules for time inference:
      - If the user says "tomorrow", assume 9:00 AM tomorrow if no specific time is given.
      - If the user says "evening", assume 6:00 PM.
      - If the user says "morning", assume 9:00 AM.
      - If the user says "afternoon", assume 2:00 PM.
      - The timestamp MUST be in the future relative to the Current Date/Time provided above.
      
      Text: "${text}"
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            isReminder: { type: Type.BOOLEAN },
            isoTimestamp: { type: Type.STRING },
            label: { type: Type.STRING }
          }
        }
      }
    });

    const result = JSON.parse(response.text || '{}');
    
    if (result.isReminder && result.isoTimestamp) {
      return {
        isReminder: true,
        timestamp: new Date(result.isoTimestamp).getTime(),
        label: result.label
      };
    }
    return { isReminder: false };
  } catch (e) {
    console.error("Reminder analysis failed", e);
    // Return false instead of throwing to avoid breaking the UI flow
    return { isReminder: false };
  }
};

/**
 * Generates an answer based on the user's question and their stored memories.
 */
export const askMemory = async (question: string, memories: Memory[]): Promise<string> => {
  try {
    const ai = getAiClient();
    const personaKey = getStoredPersona();
    const persona = PERSONAS[personaKey] || PERSONAS['default'];
    
    const context = memories
      .slice(0, 100)
      .map(m => `- [${new Date(m.timestamp).toLocaleDateString()}]: ${m.content}`)
      .join('\n');

    const prompt = `
      ${persona.instruction}
      
      The user is asking a question about their past notes/memories.
      
      Here is the database of user memories:
      ${context}

      ---
      User Question: ${question}
      ---
      
      Answer the question strictly based on the provided memories. 
      If the answer is not in the memories, apologize in character and say you don't recall that.
      Maintain the character persona defined above perfectly.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
    });
    return response.text || "I'm having trouble accessing my memory right now.";
  } catch (error: any) {
    console.error("Gemini Error:", error);
    if (error.message.includes("API Key")) {
        return "Please configure your Gemini API Key in Settings.";
    }
    return "Sorry, I couldn't process that request at the moment.";
  }
};
