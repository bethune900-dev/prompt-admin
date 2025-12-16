export enum ModelType {
  FLASH = 'gemini-2.5-flash',
  PRO = 'gemini-3-pro-preview',
  FLASH_THINKING = 'gemini-2.5-flash-thinking-preview-1219' // Fallback for thinking logic if needed, though usually handled via config
}

export interface PromptVariable {
  name: string;
  value: string;
}

export interface PromptConfig {
  model: string;
  temperature: number;
  topP: number;
  topK: number;
  maxOutputTokens?: number;
}

export interface PromptData {
  id: string;
  title: string;
  description: string;
  systemInstruction: string;
  template: string; // The user prompt with {{variables}}
  tags: string[];
  config: PromptConfig;
  updatedAt: number;
  createdAt: number;
  history: Omit<PromptData, 'history'>[]; // Stores past versions
  isFavorite: boolean;
  lastUsedAt?: number;
}

export type ViewState = 'LIST' | 'EDITOR';

export interface Toast {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info';
}