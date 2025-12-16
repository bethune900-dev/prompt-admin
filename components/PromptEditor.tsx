import React, { useState, useEffect, useCallback } from 'react';
import { PromptData, ModelType } from '../types';
import { Icons } from './Icon';
import { extractVariables, fillTemplate, generateContent } from '../services/geminiService';
import ReactMarkdown from 'react-markdown';

interface PromptEditorProps {
  initialData: PromptData;
  onSave: (data: PromptData) => void;
  onBack: () => void;
  onToggleFavorite: () => void;
  onMarkAsUsed: () => void;
}

const PromptEditor: React.FC<PromptEditorProps> = ({ 
  initialData, 
  onSave, 
  onBack,
  onToggleFavorite,
  onMarkAsUsed
}) => {
  const [prompt, setPrompt] = useState<PromptData>(initialData);
  const [variables, setVariables] = useState<string[]>([]);
  const [variableValues, setVariableValues] = useState<Record<string, string>>({});
  const [testOutput, setTestOutput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'EDIT' | 'TEST'>('EDIT');
  const [showConfig, setShowConfig] = useState(false);
  const [tagsInput, setTagsInput] = useState(prompt.tags.join(', '));
  const [copyFeedback, setCopyFeedback] = useState(false);

  // Sync internal state if initialData changes (e.g. favorite toggle from parent)
  useEffect(() => {
    setPrompt(initialData);
    setTagsInput(initialData.tags.join(', '));
  }, [initialData]);

  // Extract variables when template changes
  useEffect(() => {
    const vars = extractVariables(prompt.template);
    setVariables(vars);
    // Initialize values for new vars without deleting old ones
    setVariableValues(prev => {
      const next = { ...prev };
      vars.forEach(v => {
        if (next[v] === undefined) next[v] = '';
      });
      return next;
    });
  }, [prompt.template]);

  const handleRun = async () => {
    setIsLoading(true);
    setTestOutput('');
    onMarkAsUsed(); // Track usage
    try {
      const filledUserPrompt = fillTemplate(prompt.template, variableValues);
      const result = await generateContent(
        prompt.systemInstruction, 
        filledUserPrompt, 
        prompt.config
      );
      setTestOutput(result);
      setActiveTab('TEST'); // Switch to test view to see result on mobile/small screens
    } catch (error: any) {
      setTestOutput(`Error: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = () => {
    const cleanTags = tagsInput.split(/[,，]/).map(t => t.trim()).filter(Boolean);
    onSave({ ...prompt, tags: cleanTags });
  };

  const handleCopyFullPrompt = () => {
    const filledUserPrompt = fillTemplate(prompt.template, variableValues);
    const parts = [];
    if (prompt.systemInstruction) {
      parts.push(`--- System Instruction ---\n${prompt.systemInstruction}\n`);
    }
    parts.push(`--- User Prompt ---\n${filledUserPrompt}`);
    
    const fullText = parts.join('\n');
    navigator.clipboard.writeText(fullText);
    
    onMarkAsUsed(); // Track usage
    
    setCopyFeedback(true);
    setTimeout(() => setCopyFeedback(false), 2000);
  };

  return (
    <div className="flex flex-col h-full bg-slate-50">
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
          </div>
        </div>
        <div className="flex items-center gap-2">
           <button 
            onClick={handleCopyFullPrompt}
            className="p-2 text-slate-500 hover:bg-slate-100 rounded-lg transition-colors relative group"
            title="复制完整提示词 (包含系统指令与填充后的变量)"
          >
            {copyFeedback ? <Icons.Clipboard className="text-green-500" size={20} /> : <Icons.Copy size={20} />}
             {copyFeedback && (
              <span className="absolute top-full mt-2 left-1/2 -translate-x-1/2 text-[10px] bg-slate-800 text-white px-2 py-1 rounded whitespace-nowrap">
                已复制
              </span>
            )}
          </button>
          <div className="h-6 w-px bg-slate-200 mx-1"></div>
          <button 
            onClick={handleRun}
            disabled={isLoading}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-white transition-all ${isLoading ? 'bg-indigo-400 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-500 shadow-md hover:shadow-lg shadow-indigo-200'}`}
          >
            {isLoading ? (
               <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <Icons.Play size={18} />
            )}
            <span className="hidden sm:inline">运行测试</span>
          </button>
          <button 
            onClick={handleSave}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-lg font-medium transition-colors"
          >
            <Icons.Save size={18} />
            <span className="hidden sm:inline">保存</span>
          </button>
          <button 
            onClick={() => setShowConfig(!showConfig)}
            className={`p-2 rounded-lg transition-colors ${showConfig ? 'bg-indigo-100 text-indigo-600' : 'text-slate-500 hover:bg-slate-100'}`}
          >
            <Icons.Settings size={20} />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-hidden flex flex-col md:flex-row relative">
        
        {/* Editor Column */}
        <div className={`flex-1 flex flex-col h-full overflow-y-auto border-r border-slate-200 bg-white ${activeTab === 'TEST' ? 'hidden md:flex' : 'flex'}`}>
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
                        style={{ backgroundImage: 'none' }} // Hide default arrow if we want to custom style, but keeping it simple for now implies relying on standard select behavior with an icon overlay or just standard select.
                      >
                        <option value="" disabled>Presets</option>
                        <option value={ModelType.FLASH}>Gemini 2.5 Flash</option>
                        <option value={ModelType.PRO}>Gemini 3.0 Pro</option>
                        <option value="gemini-2.0-flash-thinking-exp-1219">Thinking (Exp)</option>
                      </select>
                      {/* Visual Indicator for the select box (since text is transparent or hidden) - actually standard select arrow is fine, but let's make it clearer */}
                      <div className="pointer-events-none absolute ml-[calc(100%-2.5rem)] mt-2.5 text-slate-400">
                        <Icons.ChevronLeft size={14} className="-rotate-90" />
                      </div>
                    </div>
                    <p className="text-[10px] text-slate-400 mt-1">手动输入或从右侧下拉框选择</p>
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

        {/* Test/Preview Column */}
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
              onClick={() => setActiveTab('TEST')}
              className={`flex-1 py-3 text-sm font-medium ${activeTab === 'TEST' ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-slate-500'}`}
            >
              测试与结果
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

            {/* Output Area */}
            <div className="flex flex-col flex-1 min-h-[300px]">
               <h3 className="text-sm font-bold text-slate-700 mb-3 flex items-center justify-between">
                <span className="flex items-center gap-2"><Icons.Zap size={16} className="text-yellow-500"/> 运行结果</span>
                {testOutput && (
                   <button 
                    onClick={() => navigator.clipboard.writeText(testOutput)}
                    className="text-xs text-slate-400 hover:text-indigo-600 flex items-center gap-1"
                   >
                     <Icons.Copy size={12}/> 复制
                   </button>
                )}
              </h3>
              <div className="flex-1 bg-white rounded-xl border border-slate-200 shadow-sm p-4 overflow-y-auto font-sans text-sm leading-relaxed prose prose-slate prose-sm max-w-none">
                {isLoading ? (
                  <div className="space-y-3 animate-pulse">
                    <div className="h-4 bg-slate-100 rounded w-3/4"></div>
                    <div className="h-4 bg-slate-100 rounded w-full"></div>
                    <div className="h-4 bg-slate-100 rounded w-5/6"></div>
                  </div>
                ) : testOutput ? (
                   <ReactMarkdown>{testOutput}</ReactMarkdown>
                ) : (
                  <div className="text-slate-400 italic text-center mt-10">
                    点击右上角的 "运行测试" 查看 Gemini 的回复。
                  </div>
                )}
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
};

export default PromptEditor;