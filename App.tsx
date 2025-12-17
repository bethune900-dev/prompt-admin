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

  // Generic save handler (Add/Update)
  const handleSavePrompt = async (updatedPrompt: PromptData) => {
    if (!updatedPrompt.title.trim()) {
      updatedPrompt.title = '未命名提示词';
    }

    const newPrompts = [...prompts];
    const index = newPrompts.findIndex(p => p.id === updatedPrompt.id);
    
    if (index >= 0) {
      // Existing prompt: Generate History Snapshot logic
      const existingPrompt = newPrompts[index];
      
      // Create a snapshot of the current version before updating
      // We exclude 'history' from the snapshot to avoid recursion
      const { history: _ignored, ...snapshot } = existingPrompt;
      
      // Add snapshot to the FRONT of history, keep max 20
      const newHistory = [snapshot, ...(existingPrompt.history || [])].slice(0, 20);

      const promptToSave = {
        ...updatedPrompt,
        history: newHistory,
        updatedAt: Date.now()
      };

      newPrompts[index] = promptToSave;

      if (selectedPrompt?.id === updatedPrompt.id) {
        setSelectedPrompt(promptToSave);
      }
    } else {
      // New prompt
      newPrompts.unshift(updatedPrompt);
      // Auto-select the new prompt
      setSelectedPrompt(updatedPrompt);
    }

    updatePromptsState(newPrompts);
  };

  // Duplicate entire prompt (Card Copy)
  const handleDuplicatePrompt = (prompt: PromptData) => {
    const newId = generateId();
    const now = Date.now();
    
    const newPrompt: PromptData = {
      ...prompt,
      id: newId,
      title: `${prompt.title} (副本)`,
      updatedAt: now,
      createdAt: now,
      history: [], // Reset history for the copy
      isFavorite: false, // Reset favorite
      lastUsedAt: undefined,
      tags: [...prompt.tags], // Shallow copy tags
      config: { ...prompt.config }, // Shallow copy config
      order: undefined // Reset order
    };

    const newPrompts = [newPrompt, ...prompts];
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

  // Logic to handle reordering from the UI (drag and drop)
  const handleReorderPrompts = (reorderedSubset: PromptData[]) => {
    // Create a map of IDs to their new index (order)
    const orderMap = new Map<string, number>();
    reorderedSubset.forEach((p, index) => {
      orderMap.set(p.id, index);
    });

    // Merge the new order into the master prompt list
    const newPrompts = prompts.map(p => {
      if (orderMap.has(p.id)) {
        return { ...p, order: orderMap.get(p.id) };
      }
      return p;
    });

    updatePromptsState(newPrompts);
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
    const warningMessage = isCloudEnabled
      ? '【严重警告】\n\n您即将导入备份文件。\n此操作将「强制覆盖」云端数据库及本地的所有现有提示词！\n\n一旦替换，原有的云端数据将永久丢失无法找回。\n\n是否确认要替换云端数据库？'
      : '警告：导入将覆盖本地所有现有数据。此操作无法撤销。继续吗？';

    if (!confirm(warningMessage)) {
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
      
      if (isCloudEnabled) {
        setIsSyncing(true);
        try {
          // Explicitly wait for cloud upload to succeed before considering it done
          await api.uploadData(validPrompts);
          
          // Then update local
          setPrompts(validPrompts);
          localStore.saveAllPrompts(validPrompts);
          
          alert(`恢复成功！\n\n云端数据库已强制替换，共导入 ${validPrompts.length} 个提示词。`);
        } catch (e) {
          console.error("Cloud import failed", e);
          alert('云端同步失败，仅恢复了本地数据。请检查网络连接。');
          setPrompts(validPrompts);
          localStore.saveAllPrompts(validPrompts);
        } finally {
          setIsSyncing(false);
        }
      } else {
        updatePromptsState(validPrompts);
        alert(`成功导入 ${validPrompts.length} 个提示词！`);
      }
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
    let filtered = [...prompts]; // Clone first to safely sort
    
    if (currentFilter === 'FAVORITES') {
      filtered = filtered.filter(p => p.isFavorite);
      // Sort favorites by manual order first, then by updated time
      filtered.sort((a, b) => {
        const orderA = a.order ?? Number.MAX_SAFE_INTEGER;
        const orderB = b.order ?? Number.MAX_SAFE_INTEGER;
        
        if (orderA !== orderB) {
          return orderA - orderB;
        }
        return b.updatedAt - a.updatedAt;
      });
    } else if (currentFilter === 'RECENT') {
      filtered.sort((a, b) => (b.lastUsedAt || 0) - (a.lastUsedAt || 0));
    } else if (currentFilter === 'TAG' && selectedTag) {
      filtered = filtered.filter(p => p.tags.includes(selectedTag));
      // Keep default sort (by creation or whatever prompts state is) or sort by updated
      filtered.sort((a, b) => b.updatedAt - a.updatedAt);
    } else {
      // ALL: Default sort by updatedAt
      filtered.sort((a, b) => b.updatedAt - a.updatedAt);
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
        {isSyncing && (
           <div className="absolute inset-0 z-50 bg-white/50 flex items-center justify-center backdrop-blur-[2px]">
             <div className="flex flex-col items-center gap-3 bg-white p-6 rounded-xl shadow-xl border border-indigo-100">
               <div className="w-8 h-8 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
               <span className="text-sm text-indigo-700 font-semibold">正在同步云端数据...</span>
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
            onDuplicatePrompt={handleDuplicatePrompt}
            isSortable={currentFilter === 'FAVORITES'}
            onReorder={handleReorderPrompts}
          />
        )}
        
        {view === 'EDITOR' && selectedPrompt && (
          <PromptEditor 
            key={`${selectedPrompt.id}_${selectedPrompt.updatedAt}`}
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