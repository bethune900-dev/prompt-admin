import React, { useState } from 'react';
import { PromptData } from '../types';
import { Icons } from './Icon';

interface PromptListProps {
  prompts: PromptData[];
  filterName: string;
  onSelectPrompt: (prompt: PromptData) => void;
  onDeletePrompt: (id: string, e: React.MouseEvent) => void;
  onToggleFavorite: (prompt: PromptData) => void;
  onMarkAsUsed: (prompt: PromptData) => void;
}

const PromptList: React.FC<PromptListProps> = ({ 
  prompts, 
  filterName,
  onSelectPrompt, 
  onDeletePrompt,
  onToggleFavorite,
  onMarkAsUsed
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const filteredPrompts = prompts.filter(p => 
    p.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
    p.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const handleCopy = (e: React.MouseEvent, prompt: PromptData) => {
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

  return (
    <div className="flex flex-col h-full overflow-hidden bg-slate-50">
      {/* Header */}
      <div className="h-16 border-b border-slate-200 bg-white px-6 flex items-center justify-between shrink-0">
        <h2 className="text-xl font-bold text-slate-800">{filterName} <span className="text-slate-400 font-normal text-sm ml-2">({prompts.length})</span></h2>
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredPrompts.map(prompt => (
              <div 
                key={prompt.id} 
                onClick={() => onSelectPrompt(prompt)}
                className="group bg-white rounded-xl border border-slate-200 hover:border-indigo-300 hover:shadow-lg transition-all cursor-pointer flex flex-col h-56 relative"
              >
                <div className="p-5 flex-1 overflow-hidden">
                  <div className="flex justify-between items-start mb-2 gap-2">
                    <h3 className="font-bold text-lg text-slate-800 truncate flex-1 pr-8">{prompt.title}</h3>
                  </div>
                  
                  {/* Absolute positioned actions for cleaner layout */}
                  <div className="absolute top-4 right-4 flex items-center gap-1">
                     <button 
                        onClick={(e) => handleFavoriteClick(e, prompt)}
                        className={`p-1.5 rounded-md transition-colors ${prompt.isFavorite ? 'text-yellow-400 hover:bg-yellow-50' : 'text-slate-300 hover:text-yellow-400 hover:bg-slate-100 opacity-0 group-hover:opacity-100'}`}
                        title={prompt.isFavorite ? "取消常用" : "设为常用"}
                      >
                        <Icons.Star size={18} fill={prompt.isFavorite ? "currentColor" : "none"} />
                      </button>

                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button 
                          onClick={(e) => handleCopy(e, prompt)}
                          className="text-slate-400 hover:text-indigo-600 hover:bg-slate-100 p-1.5 rounded-md transition-colors"
                          title="复制并标记为已使用"
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

                  <p className="text-sm text-slate-500 line-clamp-2 mb-4 h-10">
                    {prompt.description || "暂无描述..."}
                  </p>
                  
                  <div className="text-xs font-mono bg-slate-50 p-2 rounded text-slate-600 line-clamp-2 border border-slate-100">
                    {prompt.template.substring(0, 80)}...
                  </div>
                </div>

                <div className="px-5 py-3 border-t border-slate-100 bg-slate-50/50 rounded-b-xl flex items-center justify-between">
                  <div className="flex gap-2 overflow-hidden items-center">
                    {prompt.tags.length > 0 ? (
                       <>
                        {prompt.tags.slice(0, 2).map(tag => (
                          <span key={tag} className="text-xs bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-full font-medium whitespace-nowrap">
                            {tag}
                          </span>
                        ))}
                        {prompt.tags.length > 2 && (
                          <span className="text-xs text-slate-400 px-1 py-0.5">+ {prompt.tags.length - 2}</span>
                        )}
                       </>
                    ) : (
                      <span className="text-[10px] text-slate-400">{formatDate(prompt.createdAt)}</span>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-2">
                    {prompt.lastUsedAt && (
                      <span className="text-[10px] text-slate-400 flex items-center gap-1" title="上次使用时间">
                         <Icons.Clock size={10} />
                         {new Date(prompt.lastUsedAt).getMonth() + 1}/{new Date(prompt.lastUsedAt).getDate()}
                      </span>
                    )}
                    <span className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold border-l border-slate-200 pl-2">
                      {prompt.config.model.replace('gemini-', '').replace('-preview', '').replace('-001', '').split('-')[0]}
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