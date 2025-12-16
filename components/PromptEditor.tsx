import React, { useState, useEffect, useCallback, useRef } from 'react';
import { PromptData, ModelType } from '../types';
import { Icons } from './Icon';
import { extractVariables, fillTemplate } from '../services/geminiService';
import { saveDraft, getDraft, removeDraft } from '../services/storageService';
import { DEFAULT_CONFIG } from '../constants';

interface PromptEditorProps {
  initialData: PromptData;
  onSave: (data: PromptData) => void;
  onBack: () => void;
  onToggleFavorite: () => void;
  onMarkAsUsed: () => void;
}

type SaveStatus = 'SAVED' | 'SAVING' | 'DRAFT_SAVED';

const PromptEditor: React.FC<PromptEditorProps> = ({ 
  initialData, 
  onSave, 
  onBack,
  onToggleFavorite,
  onMarkAsUsed
}) => {
  // Check for draft immediately
  const draft = getDraft(initialData.id);
  
  // Decide what data to show:
  // Since we force remount on updates via key, if initialData is newer than draft, use initialData.
  const startData = (draft && draft.updatedAt > initialData.updatedAt) ? draft : initialData;

  const [prompt, setPrompt] = useState<PromptData>(startData);
  const [variables, setVariables] = useState<string[]>([]);
  const [variableValues, setVariableValues] = useState<Record<string, string>>({});
  const [activeTab, setActiveTab] = useState<'EDIT' | 'PREVIEW'>('EDIT');
  const [showConfig, setShowConfig] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [tagsInput, setTagsInput] = useState(prompt.tags.join(', '));
  const [copyFeedback, setCopyFeedback] = useState(false);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>(
    (draft && draft.updatedAt > initialData.updatedAt) ? 'DRAFT_SAVED' : 'SAVED'
  );
  
  const [historyCopyFeedbackId, setHistoryCopyFeedbackId] = useState<number | null>(null);
  
  const isFirstRender = useRef(true);
  const autoSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Extract variables when template changes
  useEffect(() => {
    const vars = extractVariables(prompt.template);
    setVariables(vars);
    setVariableValues(prev => {
      const next = { ...prev };
      vars.forEach(v => {
        if (next[v] === undefined) next[v] = '';
      });
      return next;
    });
  }, [prompt.template]);

  // Auto-save logic (Debounced)
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }

    setSaveStatus('SAVING');
    
    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
    }

    autoSaveTimerRef.current = setTimeout(() => {
      saveDraft(prompt);
      setSaveStatus('DRAFT_SAVED');
    }, 1000); 

    return () => {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
      }
    };
  }, [prompt]);

  const handleSave = () => {
    const cleanTags = tagsInput.split(/[,，]/).map(t => t.trim()).filter(Boolean);
    const updatedPrompt = { ...prompt, tags: cleanTags };
    
    onSave(updatedPrompt); 
    removeDraft(updatedPrompt.id); 
    setSaveStatus('SAVED');
  };

  const getFullPreviewText = () => {
    const filledUserPrompt = fillTemplate(prompt.template, variableValues);
    const parts = [];
    if (prompt.systemInstruction) {
      parts.push(`--- System Instruction ---\n${prompt.systemInstruction}\n`);
    }
    parts.push(`--- User Prompt ---\n${filledUserPrompt}`);
    return parts.join('\n');
  };

  const handleCopyFullPrompt = () => {
    const fullText = getFullPreviewText();
    navigator.clipboard.writeText(fullText);
    onMarkAsUsed();
    setCopyFeedback(true);
    setTimeout(() => setCopyFeedback(false), 2000);
  };

  const handleCopyHistoryContent = (version: Omit<PromptData, 'history'>, index: number) => {
    navigator.clipboard.writeText(version.template || '');
    setHistoryCopyFeedbackId(index);
    setTimeout(() => setHistoryCopyFeedbackId(null), 1500);
  };

  const getStatusText = () => {
    switch(saveStatus) {
      case 'SAVING': return '保存中...';
      case 'DRAFT_SAVED': return '草稿已保存';
      case 'SAVED': return '已保存';
      default: return '';
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-50 relative">
      {/* Header */}
      <div className="h-16 border-b border-slate-200 bg-white px-4 md:px-6 flex items-center justify-between shrink-0 z-10">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="p-2 hover:bg-slate-100 rounded-full text-slate-500">
            <Icons.ChevronLeft size={20} />
          </button>
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <input 
                type="text" 
                value={prompt.title}
                onChange={(e) => setPrompt({...prompt, title: e.target.value})}
                className="font-bold text-lg text-slate-900 focus:outline-none focus:bg-slate-50 rounded px-1"
                placeholder="未命名提示词"
              />
              <button 
                onClick={onToggleFavorite}
                className={`p-1 rounded-full transition-colors ${prompt.isFavorite ? 'text-yellow-400' : 'text-slate-300 hover:text-yellow-400'}`}
                title={prompt.isFavorite ? "取消常用" : "设为常用"}
              >
                <Icons.Star size={18} fill={prompt.isFavorite ? "currentColor" : "none"} />
              </button>
            </div>
            <span className={`text-[10px] ml-1 transition-colors ${
              saveStatus === 'SAVING' ? 'text-indigo-500' : 
              saveStatus === 'DRAFT_SAVED' ? 'text-amber-500' : 'text-slate-400'
            }`}>
              {getStatusText()}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={() => setShowHistory(true)}
            className={`p-2 rounded-lg transition-colors ${showHistory ? 'bg-indigo-100 text-indigo-600' : 'text-slate-500 hover:bg-slate-100'}`}
            title="版本历史"
          >
            <Icons.History size={20} />
          </button>

          <button 
            onClick={() => setShowConfig(!showConfig)}
            className={`p-2 rounded-lg transition-colors ${showConfig ? 'bg-indigo-100 text-indigo-600' : 'text-slate-500 hover:bg-slate-100'}`}
            title="模型配置"
          >
            <Icons.Settings size={20} />
          </button>

          <div className="h-6 w-px bg-slate-200 mx-1"></div>

           <button 
            onClick={handleCopyFullPrompt}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-medium transition-all shadow-md hover:shadow-lg shadow-indigo-200 relative group"
            title="复制完整提示词"
          >
            {copyFeedback ? <Icons.Clipboard size={18} /> : <Icons.Copy size={18} />}
            <span className="hidden sm:inline">{copyFeedback ? '已复制' : '复制提示词'}</span>
          </button>

          <button 
            onClick={handleSave}
            className={`flex items-center gap-2 px-4 py-2 border rounded-lg font-medium transition-colors ${
              saveStatus === 'DRAFT_SAVED' 
                ? 'bg-amber-50 border-amber-200 text-amber-700 hover:bg-amber-100' 
                : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
            }`}
          >
            <Icons.Save size={18} />
            <span className="hidden sm:inline">保存</span>
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-hidden flex flex-col md:flex-row relative">
        
        {/* Editor Column */}
        <div className={`flex-1 flex flex-col h-full overflow-y-auto border-r border-slate-200 bg-white ${activeTab === 'PREVIEW' ? 'hidden md:flex' : 'flex'}`}>
          <div className="p-6 max-w-3xl mx-auto w-full space-y-6">
            
            {/* Model Config Panel (Collapsible) */}
            {showConfig && (
              <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 space-y-4 animate-in slide-in-from-top-2 duration-200">
                <div className="flex justify-between items-center">
                  <h4 className="font-semibold text-slate-700 text-sm flex items-center gap-2">
                    <Icons.Settings size={14} /> 模型配置
                  </h4>
                  <button onClick={() => setShowConfig(false)} className="text-slate-400 hover:text-slate-600"><Icons.X size={14} /></button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">模型 (Model)</label>
                    <div className="flex gap-2">
                      <input 
                        type="text"
                        value={prompt.config.model}
                        onChange={(e) => setPrompt({...prompt, config: {...prompt.config, model: e.target.value}})}
                        className="flex-1 text-sm p-2 border border-slate-200 rounded-lg bg-white focus:ring-2 focus:ring-indigo-500 outline-none"
                        placeholder="输入模型名称..."
                      />
                      <select 
                        onChange={(e) => {
                          if (e.target.value) {
                             setPrompt({...prompt, config: {...prompt.config, model: e.target.value}});
                          }
                        }}
                        value=""
                        className="w-8 text-sm p-2 border border-slate-200 rounded-lg bg-slate-50 focus:ring-2 focus:ring-indigo-500 outline-none text-transparent"
                        title="选择预设模型"
                        style={{ backgroundImage: 'none' }} 
                      >
                        <option value="" disabled>Presets</option>
                        <option value={ModelType.FLASH}>Gemini 2.5 Flash</option>
                        <option value={ModelType.PRO}>Gemini 3.0 Pro</option>
                        <option value="gemini-2.0-flash-thinking-exp-1219">Thinking (Exp)</option>
                      </select>
                      <div className="pointer-events-none absolute ml-[calc(100%-2.5rem)] mt-2.5 text-slate-400">
                        <Icons.ChevronLeft size={14} className="-rotate-90" />
                      </div>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">温度 (Temperature): {prompt.config.temperature}</label>
                    <input 
                      type="range" min="0" max="2" step="0.1"
                      value={prompt.config.temperature}
                      onChange={(e) => setPrompt({...prompt, config: {...prompt.config, temperature: parseFloat(e.target.value)}})}
                      className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                    />
                  </div>
                </div>
              </div>
            )}

            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">系统指令 (System Instruction)</label>
              <textarea 
                className="w-full h-32 p-3 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none font-mono"
                placeholder="定义 AI 的角色、风格和限制..."
                value={prompt.systemInstruction}
                onChange={(e) => setPrompt({...prompt, systemInstruction: e.target.value})}
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider flex justify-between">
                <span>用户提示词模板 (Prompt Template)</span>
                <span className="normal-case font-normal text-slate-400">使用 {"{{variable}}"} 插入变量</span>
              </label>
              <textarea 
                className="w-full h-64 p-3 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none font-mono leading-relaxed"
                placeholder="在此输入提示词模板..."
                value={prompt.template}
                onChange={(e) => setPrompt({...prompt, template: e.target.value})}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">标签 (Tags)</label>
                <input 
                  type="text" 
                  className="w-full p-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="翻译, 写作, 工具..."
                  value={tagsInput}
                  onChange={(e) => setTagsInput(e.target.value)}
                />
              </div>
               <div className="space-y-2">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">描述 (Description)</label>
                <input 
                  type="text" 
                  className="w-full p-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="简短描述该提示词的用途..."
                  value={prompt.description}
                  onChange={(e) => setPrompt({...prompt, description: e.target.value})}
                />
              </div>
            </div>

          </div>
        </div>

        {/* Preview Column */}
        <div className={`w-full md:w-[45%] lg:w-[40%] flex flex-col bg-slate-50 h-full overflow-hidden ${activeTab === 'EDIT' ? 'hidden md:flex' : 'flex'}`}>
          
          {/* Mobile Tabs */}
          <div className="flex md:hidden border-b border-slate-200 bg-white">
            <button 
              onClick={() => setActiveTab('EDIT')}
              className={`flex-1 py-3 text-sm font-medium ${activeTab === 'EDIT' ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-slate-500'}`}
            >
              编辑
            </button>
            <button 
              onClick={() => setActiveTab('PREVIEW')}
              className={`flex-1 py-3 text-sm font-medium ${activeTab === 'PREVIEW' ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-slate-500'}`}
            >
              预览与变量
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6">
            
            {/* Variable Inputs */}
            {variables.length > 0 ? (
              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                <h3 className="text-sm font-bold text-slate-700 mb-3 flex items-center gap-2">
                  <Icons.Terminal size={16} className="text-indigo-500"/> 变量填充
                </h3>
                <div className="space-y-3">
                  {variables.map(v => (
                    <div key={v}>
                      <label className="block text-xs font-medium text-slate-500 mb-1">{v}</label>
                      <textarea
                        value={variableValues[v]}
                        onChange={(e) => setVariableValues({...variableValues, [v]: e.target.value})}
                        className="w-full p-2 text-sm border border-slate-200 rounded bg-slate-50 focus:bg-white focus:ring-1 focus:ring-indigo-500 outline-none resize-y min-h-[60px]"
                        placeholder={`输入 ${v} 的内容...`}
                      />
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 text-blue-700 text-sm flex items-start gap-2">
                <Icons.Zap size={16} className="mt-0.5 shrink-0" />
                <p>在左侧模板中使用 <code>{"{{变量名}}"}</code> 来创建动态输入框。</p>
              </div>
            )}

            {/* Preview Area */}
            <div className="flex flex-col flex-1 min-h-[300px]">
               <h3 className="text-sm font-bold text-slate-700 mb-3 flex items-center justify-between">
                <span className="flex items-center gap-2"><Icons.LayoutTemplate size={16} className="text-slate-500"/> 预览 (复制内容)</span>
              </h3>
              <div className="flex-1 bg-white rounded-xl border border-slate-200 shadow-sm p-4 overflow-y-auto font-mono text-sm leading-relaxed text-slate-700">
                <div className="whitespace-pre-wrap">
                  {getFullPreviewText()}
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>

      {/* History Modal/Drawer */}
      {showHistory && (
        <div className="absolute inset-0 z-50 bg-black/20 backdrop-blur-sm flex justify-end animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-white h-full shadow-2xl border-l border-slate-200 flex flex-col animate-in slide-in-from-right duration-300">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2">
                <Icons.History size={20} className="text-indigo-600" />
                版本历史
              </h3>
              <button 
                onClick={() => setShowHistory(false)}
                className="p-2 hover:bg-slate-200 rounded-full text-slate-500 transition-colors"
              >
                <Icons.X size={20} />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/30">
              {(!prompt.history || prompt.history.length === 0) ? (
                <div className="text-center py-10 text-slate-400">
                  <Icons.History size={48} className="mx-auto mb-3 opacity-20" />
                  <p>暂无历史版本</p>
                  <p className="text-xs mt-1">每次保存都会生成一个新版本</p>
                </div>
              ) : (
                prompt.history.map((version, index) => (
                  <div key={index} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow group">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <div className="text-sm font-semibold text-slate-700">
                          {new Date(version.updatedAt).toLocaleString('zh-CN')}
                        </div>
                        <div className="text-xs text-slate-400 mt-0.5">
                           版本 {prompt.history.length - index}
                        </div>
                      </div>
                    </div>
                    
                    <div className="text-xs text-slate-500 bg-slate-50 p-2 rounded border border-slate-100 mb-3 font-mono line-clamp-3">
                      {version.template || "(空模板)"}
                    </div>
                    
                    <button 
                      onClick={() => handleCopyHistoryContent(version, index)}
                      className={`w-full py-2 px-3 rounded-lg text-xs font-medium flex items-center justify-center gap-1.5 transition-colors ${
                        historyCopyFeedbackId === index 
                          ? 'bg-green-50 text-green-600' 
                          : 'bg-indigo-50 text-indigo-600 hover:bg-indigo-100'
                      }`}
                    >
                      {historyCopyFeedbackId === index ? <Icons.Check size={14} /> : <Icons.Copy size={14} />}
                      {historyCopyFeedbackId === index ? '已复制到剪贴板' : '复制模板内容 (手动粘贴)'}
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PromptEditor;