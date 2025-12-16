import { PromptData } from '../types';
import { INITIAL_PROMPTS } from '../constants';

const STORAGE_KEY = 'promptmaster_prompts_v1';

export const getStoredPrompts = (): PromptData[] => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) {
      // Initialize with default data if empty
      localStorage.setItem(STORAGE_KEY, JSON.stringify(INITIAL_PROMPTS));
      return INITIAL_PROMPTS;
    }
    const parsed = JSON.parse(stored);
    
    // Migration: Ensure all prompts have new fields
    let needsUpdate = false;
    const migrated = parsed.map((p: any) => {
      let changed = false;
      if (!p.createdAt) {
        p.createdAt = p.updatedAt || Date.now();
        changed = true;
      }
      if (!p.history) {
        p.history = [];
        changed = true;
      }
      if (typeof p.isFavorite !== 'boolean') {
        p.isFavorite = false;
        changed = true;
      }
      // lastUsedAt is optional, no need to force init
      
      if (changed) needsUpdate = true;
      return p;
    });

    if (needsUpdate) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(migrated));
    }

    return migrated;
  } catch (error) {
    console.error("Failed to load prompts", error);
    return INITIAL_PROMPTS;
  }
};

export const savePrompt = (prompt: PromptData): void => {
  const prompts = getStoredPrompts();
  const index = prompts.findIndex(p => p.id === prompt.id);
  
  let newPrompts;
  if (index >= 0) {
    const currentStored = prompts[index];
    
    // Create a snapshot of the current version before updating
    // We strictly exclude 'history' from the snapshot to avoid infinite recursion/nesting
    const { history: _ignoredHistory, ...snapshot } = currentStored;
    
    // Add snapshot to the FRONT of history, keep max 10
    const updatedHistory = [snapshot, ...(currentStored.history || [])].slice(0, 10);

    newPrompts = [...prompts];
    newPrompts[index] = { 
      ...prompt, 
      history: updatedHistory,
      updatedAt: Date.now() 
    };
  } else {
    // New prompt
    newPrompts = [prompt, ...prompts];
  }
  
  localStorage.setItem(STORAGE_KEY, JSON.stringify(newPrompts));
};

export const deletePrompt = (id: string): void => {
  const prompts = getStoredPrompts();
  const newPrompts = prompts.filter(p => p.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(newPrompts));
};

// New function to overwrite/merge all prompts (for Import)
export const saveAllPrompts = (prompts: PromptData[]): void => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(prompts));
};