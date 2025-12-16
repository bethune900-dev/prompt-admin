import React, { useState, useEffect, useMemo } from 'react';
import Sidebar, { FilterType } from './components/Sidebar';
import PromptList from './components/PromptList';
import PromptEditor from './components/PromptEditor';
import CloudSettings from './components/CloudSettings';
import { PromptData, ViewState } from './types';
import { api, isCloudEnabled } from './services/supabase';
import * as localStore from './services/storageService';
import { DEFAULT_CONFIG } from './constants';

// Simple UUID fallback
const generateId = () => crypto.randomUUID();

const App: React.FC = () => {
  const [view, setView] = useState<ViewState>('LIST');
  // Initialize from LocalStorage immediately for instant load
  const [prompts, setPrompts] = useState<PromptData[]>(() => localStore.getStoredPrompts());
  const [selectedPrompt, setSelectedPrompt] = useState<PromptData | null>(null);
  const [currentFilter, setCurrentFilter] = useState<FilterType>('ALL');
  const [selectedTag, setSelectedTag] = useState<string>('');
  
  const [showCloudSettings, setShowCloudSettings] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  // Sync Logic: If Cloud is enabled, try to download data on mount
  useEffect(() => {
    if (isCloudEnabled) {
      setIsSyncing(true);
      api.downloadData().then(cloudData => {
        if (cloudData && Array.isArray(cloudData) && cloudData.length > 0) {
          // In "Just Me" mode, we trust the cloud data if it exists.
          // You could add logic here to compare 'updatedAt' timestamps if needed.
          // For now, cloud sync overwrites local on startup to ensure consistency across devices.
          setPrompts(cloudData);
          localStore.saveAllPrompts(cloudData);
        }
        setIsSyncing(false);
      });
    }
  }, []);

  // Centralized Data Update Logic
  const updatePromptsState = (newPrompts: PromptData[]) => {
    // 1. Update UI State
    setPrompts(newPrompts);
    
    // 2. Persist to Local Storage (Source of Truth for offline)
    localStore.saveAllPrompts(newPrompts);

    // 3. Sync to Cloud (if enabled)
    if (isCloudEnabled) {
      api.uploadData(newPrompts);
    }
  };

  const handleCreatePrompt = () => {
    const now = Date.now();
    const newPrompt: PromptData = {
      id: generateId(),
      title: '',
      description: '',
      systemInstruction: '',
      template: '',
      tags: [],
      config: DEFAULT_CONFIG,
      updatedAt: now,
      createdAt: now,
      history: [],
      isFavorite: false,
    };
    setSelectedPrompt(newPrompt);
    setView('EDITOR');
  };

  const handleSelectPrompt = (prompt: PromptData) => {
    setSelectedPrompt(prompt);
    setView('EDITOR');
  };

  const handleSavePrompt = async (updatedPrompt: PromptData) => {
    if (!updatedPrompt.title.trim()) {
      updatedPrompt.title = '未命名提示词';
    }

    const newPrompts = [...prompts];
    const index = newPrompts.findIndex(p => p.id === updatedPrompt.id);
    
    if (index >= 0) {
      newPrompts[index] = updatedPrompt;
    } else {
      newPrompts.unshift(updatedPrompt);
    }

    if (selectedPrompt?.id === updatedPrompt.id) {
      setSelectedPrompt(updatedPrompt);
    }

    updatePromptsState(newPrompts);
  };

  const handleToggleFavorite = async (prompt: PromptData) => {
    const updated = { ...prompt, isFavorite: !prompt.isFavorite };
    handleSavePrompt(updated);
  };

  const handleMarkAsUsed = async (prompt: PromptData) => {
    const updated = { ...prompt, lastUsedAt: Date.now() };
    handleSavePrompt(updated);
  };

  const handleDeletePrompt = async (id: string) => {
    if (confirm('确定要删除这个提示词吗？此操作无法撤销。')) {
      const newPrompts = prompts.filter(p => p.id !== id);
      if (selectedPrompt?.id === id) {
        setView('LIST');
        setSelectedPrompt(null);
      }
      updatePromptsState(newPrompts);
    }
  };

  const handleGoHome = () => {
    setView('LIST');
    setSelectedPrompt(null);
  };

  const handleFilterChange = (filter: FilterType, tag?: string) => {
    setCurrentFilter(filter);
    if (tag) {
      setSelectedTag(tag);
    } else {
      setSelectedTag('');
    }
  };

  const handleExport = () => {
    const dataStr = JSON.stringify(prompts, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = `promptmaster_${isCloudEnabled ? 'cloud' : 'local'}_backup_${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleImport = async (file: File) => {
    if (!confirm('导入将覆盖现有数据。继续吗？')) {
      return;
    }

    try {
      const text = await file.text();
      const importedPrompts = JSON.parse(text);

      if (!Array.isArray(importedPrompts)) {
        alert('文件格式错误：必须是 JSON 数组');
        return;
      }

      // Ensure basic validity
      const validPrompts = importedPrompts.filter(p => p.id && p.template);
      
      updatePromptsState(validPrompts);
      alert(`成功导入 ${validPrompts.length} 个提示词！`);
    } catch (error) {
      console.error('Import failed', error);
      alert('导入失败：文件无法解析或格式不正确。');
    }
  };

  const allTags = useMemo(() => {
    const tagCounts: Record<string, number> = {};
    prompts.forEach(p => {
      p.tags.forEach(tag => {
        tagCounts[tag] = (tagCounts[tag] || 0) + 1;
      });
    });
    return Object.keys(tagCounts).sort((a, b) => tagCounts[b] - tagCounts[a]);
  }, [prompts]);

  const filteredPrompts = useMemo(() => {
    let filtered = prompts;
    if (currentFilter === 'FAVORITES') {
      filtered = prompts.filter(p => p.isFavorite);
    } else if (currentFilter === 'RECENT') {
      filtered = [...prompts].sort((a, b) => (b.lastUsedAt || 0) - (a.lastUsedAt || 0));
    } else if (currentFilter === 'TAG' && selectedTag) {
      filtered = prompts.filter(p => p.tags.includes(selectedTag));
    }
    return filtered;
  }, [prompts, currentFilter, selectedTag]);

  const getFilterName = () => {
    switch (currentFilter) {
      case 'ALL': return '所有提示词';
      case 'FAVORITES': return '我的常用';
      case 'RECENT': return '最近使用';
      case 'TAG': return `# ${selectedTag}`;
      default: return '提示词';
    }
  };

  return (
    <div className="flex h-screen bg-slate-50 font-sans text-slate-900">
      <Sidebar 
        onNewPrompt={handleCreatePrompt} 
        onGoHome={handleGoHome}
        onFilterChange={handleFilterChange}
        currentFilter={currentFilter}
        currentTag={selectedTag}
        tags={allTags}
        onExport={handleExport}
        onImport={handleImport}
        onOpenCloudSettings={() => setShowCloudSettings(true)}
        className="shrink-0 z-20"
      />
      
      <main className="flex-1 h-full overflow-hidden relative">
        {isSyncing && prompts.length === 0 && (
           <div className="absolute inset-0 z-50 bg-white/50 flex items-center justify-center">
             <div className="flex flex-col items-center gap-2">
               <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
               <span className="text-xs text-indigo-600 font-medium">同步云端数据...</span>
             </div>
           </div>
        )}

        {view === 'LIST' && (
          <PromptList 
            prompts={filteredPrompts}
            filterName={getFilterName()} 
            onSelectPrompt={handleSelectPrompt} 
            onDeletePrompt={(id, e) => handleDeletePrompt(id)}
            onToggleFavorite={handleToggleFavorite}
            onMarkAsUsed={handleMarkAsUsed}
          />
        )}
        
        {view === 'EDITOR' && selectedPrompt && (
          <PromptEditor 
            initialData={selectedPrompt} 
            onSave={handleSavePrompt}
            onBack={handleGoHome}
            onToggleFavorite={() => handleToggleFavorite(selectedPrompt)}
            onMarkAsUsed={() => handleMarkAsUsed(selectedPrompt)}
          />
        )}

        {showCloudSettings && (
          <CloudSettings onClose={() => setShowCloudSettings(false)} />
        )}
      </main>
    </div>
  );
};

export default App;