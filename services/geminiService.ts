import { GoogleGenAI } from "@google/genai";
import { PromptConfig } from '../types';

// Helper to fill template variables
export const fillTemplate = (template: string, variables: Record<string, string>): string => {
  let result = template;
  Object.entries(variables).forEach(([key, value]) => {
    // Regex matches {{key}} globally
    const regex = new RegExp(`{{\\s*${key}\\s*}}`, 'g');
    result = result.replace(regex, value);
  });
  return result;
};

// Helper to extract variable names from template: {{varName}}
export const extractVariables = (template: string): string[] => {
  const regex = /{{\s*([a-zA-Z0-9_]+)\s*}}/g;
  const matches = template.matchAll(regex);
  const vars = new Set<string>();
  for (const match of matches) {
    vars.add(match[1]);
  }
  return Array.from(vars);
};

export const generateContent = async (
  systemInstruction: string,
  userPrompt: string,
  config: PromptConfig
): Promise<string> => {
  if (!process.env.API_KEY) {
    throw new Error("未检测到 API Key。请确保环境变量中配置了 API_KEY。");
  }

  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  try {
    const response = await ai.models.generateContent({
      model: config.model,
      contents: userPrompt,
      config: {
        systemInstruction: systemInstruction ? systemInstruction : undefined,
        temperature: config.temperature,
        topP: config.topP,
        topK: config.topK,
        maxOutputTokens: config.maxOutputTokens,
      },
    });

    return response.text || "No response text generated.";
  } catch (error: any) {
    console.error("Gemini API Error:", error);
    throw new Error(error.message || "调用 Gemini API 时发生未知错误");
  }
};