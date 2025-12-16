import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { PromptData } from '../types';

// Constant ID for single-user mode
const STORAGE_ID = 'global_backup';

// 1. Configuration Resolution
const getSupabaseConfig = () => {
  const envUrl = process.env.SUPABASE_URL;
  const envKey = process.env.SUPABASE_ANON_KEY;
  
  const localUrl = localStorage.getItem('SUPABASE_URL');
  const localKey = localStorage.getItem('SUPABASE_ANON_KEY');

  const url = envUrl || localUrl;
  const key = envKey || localKey;

  return { url, key, isConfigured: !!(url && key) };
};

const config = getSupabaseConfig();
export const isCloudEnabled = config.isConfigured;

// 2. Initialize Client
export const supabase: SupabaseClient | null = isCloudEnabled 
  ? createClient(config.url!, config.key!) 
  : null;

// 3. API - Single User / No Login Strategy
export const api = {
  // Download all data
  downloadData: async (): Promise<PromptData[] | null> => {
    if (!isCloudEnabled || !supabase) return null;
    
    try {
      // No auth check needed, just fetch the global row
      const { data, error } = await supabase
        .from('app_storage')
        .select('data')
        .eq('id', STORAGE_ID)
        .single();

      if (error) {
        // PGRST116 is "The result contains 0 rows", which is fine for first run
        if (error.code === 'PGRST116') return null; 
        console.error("Supabase load error:", error);
        return null;
      }
      
      return data?.data as PromptData[];
    } catch (e) {
      console.error("Download failed", e);
      return null;
    }
  },

  // Upload all data
  uploadData: async (prompts: PromptData[]): Promise<void> => {
    if (!isCloudEnabled || !supabase) return;

    try {
      const { error } = await supabase
        .from('app_storage')
        .upsert({
          id: STORAGE_ID, // Use fixed ID
          data: prompts,
          updated_at: Date.now()
        });

      if (error) throw error;
    } catch (e) {
      console.error("Supabase save error:", e);
    }
  }
};

// Utilities for settings configuration
export const saveCloudConfig = (url: string, key: string) => {
  localStorage.setItem('SUPABASE_URL', url.trim());
  localStorage.setItem('SUPABASE_ANON_KEY', key.trim());
  window.location.reload(); 
};

export const clearCloudConfig = () => {
  localStorage.removeItem('SUPABASE_URL');
  localStorage.removeItem('SUPABASE_ANON_KEY');
  window.location.reload();
};