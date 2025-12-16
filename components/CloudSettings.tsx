import React, { useState, useEffect } from 'react';
import { Icons } from './Icon';
import { saveCloudConfig, clearCloudConfig, isCloudEnabled } from '../services/supabase';

interface CloudSettingsProps {
  onClose: () => void;
}

const CloudSettings: React.FC<CloudSettingsProps> = ({ onClose }) => {
  const [url, setUrl] = useState('');
  const [key, setKey] = useState('');

  useEffect(() => {
    setUrl(localStorage.getItem('SUPABASE_URL') || '');
    setKey(localStorage.getItem('SUPABASE_ANON_KEY') || '');
  }, []);

  const handleSave = () => {
    if (!url || !key) {
      alert("请输入完整的 URL 和 Key");
      return;
    }
    saveCloudConfig(url, key);
  };

  const handleClear = () => {
    if (confirm("确定要断开云端连接吗？应用将切换回本地存储模式。")) {
      clearCloudConfig();
    }
  };

  return (
    <div className="absolute inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
          <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2">
            <Icons.Cloud size={20} className="text-indigo-600"/>
            云端同步配置 (Supabase)
          </h3>
          <button onClick={onClose} className="p-1 hover:bg-slate-200 rounded-full text-slate-500">
            <Icons.X size={20} />
          </button>
        </div>
        
        <div className="p-6 space-y-4">
          <div className="bg-indigo-50 border border-indigo-100 p-3 rounded-lg text-xs text-indigo-700 leading-relaxed">
            配置 Supabase 后，您的提示词将同步到云端数据库，实现多设备共享。
            <br/>
            <strong>注意：</strong> 切换模式不会自动迁移本地数据到云端。
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Project URL</label>
            <input 
              type="text" 
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://xyz.supabase.co"
              className="w-full p-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none text-sm font-mono"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Anon / Public Key</label>
            <input 
              type="password" 
              value={key}
              onChange={(e) => setKey(e.target.value)}
              placeholder="eyJhbGciOiJIUzI1NiIsInR..."
              className="w-full p-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none text-sm font-mono"
            />
          </div>
        </div>

        <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-3">
          {isCloudEnabled && (
            <button 
              onClick={handleClear}
              className="px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg text-sm font-medium transition-colors mr-auto"
            >
              断开连接
            </button>
          )}
          <button 
            onClick={onClose}
            className="px-4 py-2 text-slate-600 hover:bg-slate-200 rounded-lg text-sm font-medium transition-colors"
          >
            取消
          </button>
          <button 
            onClick={handleSave}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm font-medium shadow-md shadow-indigo-200 transition-colors flex items-center gap-2"
          >
            <Icons.Check size={16} />
            保存并重启
          </button>
        </div>
      </div>
    </div>
  );
};

export default CloudSettings;