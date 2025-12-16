import React, { useRef } from 'react';
import { Icons } from './Icon';

export type FilterType = 'ALL' | 'FAVORITES' | 'RECENT' | 'TAG';

interface SidebarProps {
  onNewPrompt: () => void;
  onGoHome: () => void;
  onFilterChange: (filter: FilterType, tag?: string) => void;
  currentFilter: FilterType;
  currentTag?: string;
  tags: string[]; // List of unique tags
  onExport: () => void;
  onImport: (file: File) => void;
  className?: string;
}

const Sidebar: React.FC<SidebarProps> = ({ 
  onNewPrompt, 
  onGoHome, 
  onFilterChange,
  currentFilter,
  currentTag,
  tags,
  onExport, 
  onImport, 
  className 
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      onImport(file);
    }
    // Reset input so the same file can be selected again if needed
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleNavClick = (filter: FilterType) => {
    onGoHome(); // Ensure we are on the list view
    onFilterChange(filter);
  };

  const handleTagClick = (tag: string) => {
    onGoHome();
    onFilterChange('TAG', tag);
  };

  const NavButton = ({ filter, icon: Icon, label }: { filter: FilterType, icon: any, label: string }) => (
    <button 
      onClick={() => handleNavClick(filter)}
      className={`mx-2 p-3 md:px-4 md:py-3 flex items-center gap-3 rounded-lg transition-colors ${
        currentFilter === filter 
          ? 'bg-slate-800 text-white' 
          : 'text-slate-300 hover:bg-slate-800 hover:text-white'
      }`}
      title={label}
    >
      <Icon size={20} />
      <span className="hidden md:block">{label}</span>
    </button>
  );

  return (
    <div className={`w-16 md:w-64 bg-slate-900 text-white flex flex-col border-r border-slate-800 ${className}`}>
      <div className="p-4 flex items-center justify-center md:justify-start gap-3 border-b border-slate-800 h-16">
        <div className="w-8 h-8 bg-indigo-500 rounded-lg flex items-center justify-center shrink-0">
          <Icons.Zap size={20} className="text-white" />
        </div>
        <span className="font-bold text-lg hidden md:block tracking-wide">灵感提示词</span>
      </div>

      <div className="flex-1 py-4 flex flex-col gap-2 overflow-y-auto">
        <button 
          onClick={onNewPrompt}
          className="mx-2 mb-2 p-3 md:px-4 md:py-3 flex items-center gap-3 bg-indigo-600 hover:bg-indigo-500 rounded-lg transition-colors text-white shadow-lg shadow-indigo-900/20"
          title="新建提示词"
        >
          <Icons.Plus size={20} />
          <span className="hidden md:block font-medium">新建提示词</span>
        </button>

        <div className="h-px bg-slate-800 mx-4 my-2"></div>

        <NavButton filter="ALL" icon={Icons.LayoutTemplate} label="所有提示词" />
        <NavButton filter="FAVORITES" icon={Icons.Star} label="我的常用" />
        <NavButton filter="RECENT" icon={Icons.Clock} label="最近使用" />

        {tags.length > 0 && (
          <>
            <div className="h-px bg-slate-800 mx-4 my-3"></div>
            <div className="px-4 mb-1 hidden md:block text-xs font-semibold text-slate-500 uppercase tracking-wider">
              标签分组
            </div>
            <div className="flex flex-col gap-0.5">
              {tags.map(tag => (
                <button
                  key={tag}
                  onClick={() => handleTagClick(tag)}
                  className={`mx-2 px-3 py-2 md:px-4 flex items-center gap-3 rounded-md transition-colors text-sm ${
                    currentFilter === 'TAG' && currentTag === tag
                      ? 'bg-slate-800 text-indigo-400'
                      : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                  }`}
                >
                  <span className="text-slate-600">#</span>
                  <span className="hidden md:block truncate">{tag}</span>
                </button>
              ))}
            </div>
          </>
        )}
      </div>

      <div className="p-2 border-t border-slate-800 flex flex-col gap-1">
        <button 
          onClick={onExport}
          className="p-3 md:px-4 flex items-center gap-3 hover:bg-slate-800 rounded-lg transition-colors text-slate-400 hover:text-white"
          title="导出数据"
        >
          <Icons.Download size={18} />
          <span className="hidden md:block text-sm">导出备份</span>
        </button>
        <button 
          onClick={handleImportClick}
          className="p-3 md:px-4 flex items-center gap-3 hover:bg-slate-800 rounded-lg transition-colors text-slate-400 hover:text-white"
          title="导入数据"
        >
          <Icons.Upload size={18} />
          <span className="hidden md:block text-sm">导入恢复</span>
        </button>
        <input 
          type="file" 
          ref={fileInputRef}
          onChange={handleFileChange}
          accept=".json"
          className="hidden"
        />
      </div>

      <div className="p-4 border-t border-slate-800 text-xs text-slate-500 hidden md:block text-center">
        Designed for Gemini
      </div>
    </div>
  );
};

export default Sidebar;