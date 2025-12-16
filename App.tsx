import React, { useState, useEffect, useMemo } from 'react';
import Sidebar, { FilterType } from './components/Sidebar';
import PromptList from './components/PromptList';
import PromptEditor from './components/PromptEditor';
import { PromptData, ViewState } from './types';
import { getStoredPrompts, savePrompt, deletePrompt, saveAllPrompts } from './services/storageService';
import { DEFAULT_CONFIG } from './constants';

// Simple UUID fallback if package not available in some environments
const generateId = () => Date.now().toString(36) + Math.random().toString(36).substr(2);

const App: React.FC = () => {
  const [view, setView] = useState<ViewState>('LIST');
  const [prompts, setPrompts] = useState<PromptData[]>([]);
  const [selectedPrompt, setSelectedPrompt] = useState<PromptData | null>(null);
  const [currentFilter, setCurrentFilter] = useState<FilterType>('ALL');
  const [selectedTag, setSelectedTag] = useState<string>('');

  // Load prompts on mount
  useEffect(() => {
    setPrompts(getStoredPrompts());
  }, []);

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

  const handleSavePrompt = (updatedPrompt: PromptData) => {
    if (!updatedPrompt.title.trim()) {
      updatedPrompt.title = '未命名提示词';
    }
    savePrompt(updatedPrompt);
    const allPrompts = getStoredPrompts();
    setPrompts(allPrompts);
    
    const savedPrompt = allPrompts.find(p => p.id === updatedPrompt.id);
    if (savedPrompt) {
      setSelectedPrompt(savedPrompt);
    }
  };

  const handleToggleFavorite = (prompt: PromptData) => {
    const updated = { ...prompt, isFavorite: !prompt.isFavorite };
    handleSavePrompt(updated);
  };

  const handleMarkAsUsed = (prompt: PromptData) => {
    const updated = { ...prompt, lastUsedAt: Date.now() };
    // This will trigger a save and re-render
    handleSavePrompt(updated);
  };

  const handleDeletePrompt = (id: string) => {
    if (confirm('确定要删除这个提示词吗？此操作无法撤销。')) {
      deletePrompt(id);
      setPrompts(getStoredPrompts());
      if (selectedPrompt?.id === id) {
        setView('LIST');
        setSelectedPrompt(null);
      }
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
    link.download = `promptmaster_backup_${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleImport = async (file: File) => {
    if (!confirm('导入将合并现有数据。如果 ID 冲突，将覆盖现有提示词。继续吗？')) {
      return;
    }

    try {
      const text = await file.text();
      const importedPrompts = JSON.parse(text);

      if (!Array.isArray(importedPrompts)) {
        alert('文件格式错误：必须是 JSON 数组');
        return;
      }

      // Merge strategy
      const promptMap = new Map<string, PromptData>();
      prompts.forEach(p => promptMap.set(p.id, p));
      
      importedPrompts.forEach((p: any) => {
        if (p.id && p.title && p.template) {
          if (!p.createdAt) p.createdAt = p.updatedAt || Date.now();
          if (!p.history) p.history = [];
          if (typeof p.isFavorite !== 'boolean') p.isFavorite = false;
          promptMap.set(p.id, p as PromptData);
        }
      });

      const mergedPrompts = Array.from(promptMap.values());
      mergedPrompts.sort((a, b) => b.updatedAt - a.updatedAt);

      saveAllPrompts(mergedPrompts);
      setPrompts(mergedPrompts);
      alert(`成功导入 ${importedPrompts.length} 个提示词！`);
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
    // Return tags sorted by frequency (descending)
    return Object.keys(tagCounts).sort((a, b) => tagCounts[b] - tagCounts[a]);
  }, [prompts]);

  const filteredPrompts = useMemo(() => {
    let filtered = prompts;
    if (currentFilter === 'FAVORITES') {
      filtered = prompts.filter(p => p.isFavorite);
    } else if (currentFilter === 'RECENT') {
      filtered = prompts.filter(p => p.lastUsedAt).sort((a, b) => (b.lastUsedAt || 0) - (a.lastUsedAt || 0));
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
        className="shrink-0 z-20"
      />
      
      <main className="flex-1 h-full overflow-hidden relative">
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
      </main>
    </div>
  );
};

export default App;