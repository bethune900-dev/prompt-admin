import React, { useState, useRef } from 'react';
import { PromptData } from '../types';
import { Icons } from './Icon';

interface PromptListProps {
  prompts: PromptData[];
  filterName: string;
  onSelectPrompt: (prompt: PromptData) => void;
  onDeletePrompt: (id: string, e: React.MouseEvent) => void;
  onToggleFavorite: (prompt: PromptData) => void;
  onMarkAsUsed: (prompt: PromptData) => void;
  onDuplicatePrompt: (prompt: PromptData) => void;
  isSortable?: boolean;
  onReorder?: (newOrder: PromptData[]) => void;
}

const getTagStyle = (tag: string) => {
  const styles = [
    'bg-blue-50 text-blue-700 border-blue-200',
    'bg-emerald-50 text-emerald-700 border-emerald-200',
    'bg-amber-50 text-amber-700 border-amber-200',
    'bg-purple-50 text-purple-700 border-purple-200',
    'bg-rose-50 text-rose-700 border-rose-200',
    'bg-cyan-50 text-cyan-700 border-cyan-200',
    'bg-indigo-50 text-indigo-700 border-indigo-200',
    'bg-fuchsia-50 text-fuchsia-700 border-fuchsia-200',
  ];
  let hash = 0;
  for (let i = 0; i < tag.length; i++) {
    hash = tag.charCodeAt(i) + ((hash << 5) - hash);
  }
  return styles[Math.abs(hash) % styles.length];
};

const PromptList: React.FC<PromptListProps> = ({ 
  prompts, 
  filterName,
  onSelectPrompt, 
  onDeletePrompt,
  onToggleFavorite,
  onMarkAsUsed,
  onDuplicatePrompt,
  isSortable = false,
  onReorder
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Drag and Drop Refs
  const dragItem = useRef<number | null>(null);
  const dragOverItem = useRef<number | null>(null);

  const filteredPrompts = prompts.filter(p => 
    p.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
    p.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const handleCopyText = (e: React.MouseEvent, prompt: PromptData) => {
    e.stopPropagation();
    
    const parts = [];
    if (prompt.systemInstruction) {
      parts.push(`--- System Instruction ---\n${prompt.systemInstruction}\n`);
    }
    parts.push(`--- Prompt Template ---\n${prompt.template}`);
    
    const text = parts.join('\n');
    navigator.clipboard.writeText(text);
    
    onMarkAsUsed(prompt);

    setCopiedId(prompt.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleDuplicate = (e: React.MouseEvent, prompt: PromptData) => {
    e.stopPropagation();
    onDuplicatePrompt(prompt);
  };

  const handleFavoriteClick = (e: React.MouseEvent, prompt: PromptData) => {
    e.stopPropagation();
    onToggleFavorite(prompt);
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'numeric',
      day: 'numeric'
    });
  };

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    const month = date.getMonth() + 1;
    const day = date.getDate();
    const hour = date.getHours().toString().padStart(2, '0');
    const minute = date.getMinutes().toString().padStart(2, '0');
    return `${month}/${day} ${hour}:${minute}`;
  };

  // --- Drag and Drop Handlers ---
  
  const handleDragStart = (e: React.DragEvent<HTMLDivElement>, position: number) => {
    dragItem.current = position;
    // Set transparent image or effect if desired
    e.currentTarget.style.opacity = '0.4';
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragEnter = (e: React.DragEvent<HTMLDivElement>, position: number) => {
    dragOverItem.current = position;
  };

  const handleDragEnd = (e: React.DragEvent<HTMLDivElement>) => {
    e.currentTarget.style.opacity = '1';
    
    if (dragItem.current !== null && dragOverItem.current !== null && dragItem.current !== dragOverItem.current) {
      // Create a copy and reorder
      const listCopy = [...filteredPrompts];
      const draggedItemContent = listCopy[dragItem.current];
      
      listCopy.splice(dragItem.current, 1);
      listCopy.splice(dragOverItem.current, 0, draggedItemContent);
      
      if (onReorder) {
        onReorder(listCopy);
      }
    }
    
    dragItem.current = null;
    dragOverItem.current = null;
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    // Essential to allow dropping
    e.preventDefault();
  };

  return (
    <div className="flex flex-col h-full overflow-hidden bg-slate-50">
      {/* Header */}
      <div className="h-16 border-b border-slate-200 bg-white px-6 flex items-center justify-between shrink-0">
        <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
          {filterName} 
          <span className="text-slate-400 font-normal text-sm">({prompts.length})</span>
          {isSortable && (
            <span className="text-[10px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded border border-slate-200 font-normal ml-2">
              可拖拽排序
            </span>
          )}
        </h2>
        <div className="relative">
          <Icons.Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input 
            type="text" 
            placeholder="搜索提示词..." 
            className="pl-10 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 w-64 transition-all"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* Grid */}
      <div className="flex-1 overflow-y-auto p-6">
        {filteredPrompts.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-slate-400">
            <Icons.Search size={48} className="mb-4 opacity-20" />
            <p>没有找到相关提示词</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredPrompts.map((prompt, index) => (
              <div 
                key={prompt.id} 
                draggable={isSortable && !searchTerm} // Only allow drag when sorting is active and NOT searching
                onDragStart={(e) => isSortable && !searchTerm && handleDragStart(e, index)}
                onDragEnter={(e) => isSortable && !searchTerm && handleDragEnter(e, index)}
                onDragEnd={(e) => isSortable && !searchTerm && handleDragEnd(e)}
                onDragOver={(e) => isSortable && !searchTerm && handleDragOver(e)}
                onClick={() => onSelectPrompt(prompt)}
                className={`group bg-white rounded-xl border border-slate-200 hover:border-indigo-300 hover:shadow-lg transition-all cursor-pointer flex flex-col h-48 relative ${isSortable && !searchTerm ? 'cursor-move active:cursor-grabbing' : ''}`}
              >
                <div className="p-5 flex-1 overflow-hidden flex flex-col">
                  <div className="flex justify-between items-start gap-3 mb-2">
                    {/* Title & Grip Container */}
                    <div className="flex items-start gap-2 min-w-0 flex-1">
                      {isSortable && !searchTerm && (
                         <Icons.GripVertical size={18} className="text-slate-300 shrink-0 mt-0.5 cursor-grab active:cursor-grabbing" />
                      )}
                      <h3 
                        className="font-bold text-lg text-slate-800 leading-tight break-words line-clamp-2" 
                        title={prompt.title}
                      >
                        {prompt.title}
                      </h3>
                    </div>

                    {/* Actions Container */}
                    <div className="flex items-center gap-0.5 shrink-0 pl-1">
                      <button 
                        onClick={(e) => handleFavoriteClick(e, prompt)}
                        className={`p-1.5 rounded-md transition-colors ${prompt.isFavorite ? 'text-yellow-400 hover:bg-yellow-50' : 'text-slate-300 hover:text-yellow-400 hover:bg-slate-100 opacity-0 group-hover:opacity-100'}`}
                        title={prompt.isFavorite ? "取消常用" : "设为常用"}
                      >
                        <Icons.Star size={18} fill={prompt.isFavorite ? "currentColor" : "none"} />
                      </button>

                      <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button 
                          onClick={(e) => handleDuplicate(e, prompt)}
                          className="text-slate-400 hover:text-indigo-600 hover:bg-slate-100 p-1.5 rounded-md transition-colors"
                          title="创建副本"
                        >
                          <Icons.GitFork size={16} />
                        </button>

                        <button 
                          onClick={(e) => handleCopyText(e, prompt)}
                          className="text-slate-400 hover:text-indigo-600 hover:bg-slate-100 p-1.5 rounded-md transition-colors"
                          title="复制文本"
                        >
                          {copiedId === prompt.id ? <Icons.Check size={16} className="text-green-500"/> : <Icons.Copy size={16} />}
                        </button>
                        
                        <button 
                          onClick={(e) => { e.stopPropagation(); onDeletePrompt(prompt.id, e); }}
                          className="text-slate-400 hover:text-red-500 hover:bg-slate-100 p-1.5 rounded-md transition-colors"
                          title="删除"
                        >
                          <Icons.Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  </div>
                  
                  <p className="text-sm text-slate-500 line-clamp-3 flex-1 break-words">
                    {prompt.description || "暂无描述..."}
                  </p>
                  
                </div>

                <div className="px-4 py-3 border-t border-slate-100 bg-slate-50/30 rounded-b-xl flex items-center justify-between shrink-0 gap-3">
                  <div className="flex gap-1.5 overflow-hidden items-center flex-1 min-w-0">
                    {prompt.tags.length > 0 ? (
                       <>
                        {prompt.tags.slice(0, 3).map(tag => (
                          <span 
                            key={tag} 
                            className={`text-[10px] px-2.5 py-0.5 rounded-full font-medium whitespace-nowrap border shadow-sm ${getTagStyle(tag)}`}
                          >
                            {tag}
                          </span>
                        ))}
                        {prompt.tags.length > 3 && (
                          <span className="text-[10px] text-slate-500 font-medium px-1.5 py-0.5 bg-slate-100 rounded-full border border-slate-200 shrink-0">
                            +{prompt.tags.length - 3}
                          </span>
                        )}
                       </>
                    ) : (
                      <span className="text-[10px] text-slate-400 font-medium ml-1">{formatDate(prompt.createdAt)}</span>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-1 shrink-0">
                     <Icons.Clock size={12} className="text-slate-300" />
                     <span className="text-[10px] text-slate-400 font-medium">
                       {formatTime(prompt.updatedAt)}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default PromptList;