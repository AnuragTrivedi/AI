import React, { useState } from 'react';
import {
  X,
  RefreshCw,
  Cpu,
  Sliders,
  Terminal,
  Database,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  RotateCcw,
  Shield,
  HelpCircle,
  ExternalLink,
} from 'lucide-react';
import { AppSettings, OllamaModel, OllamaConnectionStatus } from '../types';
import { DEFAULT_SETTINGS } from '../services/storageService';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: AppSettings;
  onSaveSettings: (newSettings: AppSettings) => void;
  models: OllamaModel[];
  onRefreshModels: () => Promise<void>;
  connectionStatus: OllamaConnectionStatus;
  onTestConnection: (url: string, mode: 'proxy' | 'direct') => Promise<void>;
  theme: 'dark' | 'light';
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  onSaveSettings,
  models,
  onRefreshModels,
  connectionStatus,
  onTestConnection,
  theme,
}) => {
  const [activeTab, setActiveTab] = useState<'ollama' | 'parameters' | 'prompt' | 'rag' | 'guide'>('ollama');
  const [formData, setFormData] = useState<AppSettings>({ ...settings });
  const [isTesting, setIsTesting] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [savedAlert, setSavedAlert] = useState(false);

  if (!isOpen) return null;

  const isDark = theme === 'dark';

  const handleSave = () => {
    onSaveSettings(formData);
    setSavedAlert(true);
    setTimeout(() => {
      setSavedAlert(false);
      onClose();
    }, 600);
  };

  const handleResetDefaults = () => {
    setFormData({ ...DEFAULT_SETTINGS, theme: formData.theme });
  };

  const runConnectionTest = async () => {
    setIsTesting(true);
    try {
      await onTestConnection(formData.ollamaUrl, formData.connectionMode);
    } finally {
      setIsTesting(false);
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await onRefreshModels();
    } finally {
      setIsRefreshing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/60 backdrop-blur-xs">
      <div
        id="settings-modal"
        className={`w-full max-w-2xl max-h-[90vh] flex flex-col rounded-2xl border shadow-2xl overflow-hidden transition-all ${
          isDark
            ? 'bg-neutral-900 border-neutral-800 text-neutral-100'
            : 'bg-white border-neutral-200 text-neutral-900'
        }`}
      >
        {/* Header */}
        <div
          className={`flex items-center justify-between px-5 py-4 border-b ${
            isDark ? 'border-neutral-800' : 'border-neutral-200'
          }`}
        >
          <div className="flex items-center gap-2">
            <Cpu className="w-5 h-5 text-emerald-500" />
            <h2 className="text-base font-semibold">Settings & Configuration</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className={`p-1.5 rounded-lg transition-colors ${
              isDark ? 'hover:bg-neutral-800 text-neutral-400' : 'hover:bg-neutral-100 text-neutral-600'
            }`}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div
          className={`flex border-b px-5 text-xs font-medium gap-2 sm:gap-4 overflow-x-auto scrollbar-none ${
            isDark ? 'border-neutral-800 bg-neutral-900/50' : 'border-neutral-200 bg-neutral-50'
          }`}
        >
          <button
            type="button"
            onClick={() => setActiveTab('ollama')}
            className={`py-3 border-b-2 whitespace-nowrap transition-colors ${
              activeTab === 'ollama'
                ? 'border-emerald-500 text-emerald-500 font-semibold'
                : 'border-transparent text-neutral-400 hover:text-neutral-200'
            }`}
          >
            Ollama Server
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('parameters')}
            className={`py-3 border-b-2 whitespace-nowrap transition-colors ${
              activeTab === 'parameters'
                ? 'border-emerald-500 text-emerald-500 font-semibold'
                : 'border-transparent text-neutral-400 hover:text-neutral-200'
            }`}
          >
            Model Parameters
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('prompt')}
            className={`py-3 border-b-2 whitespace-nowrap transition-colors ${
              activeTab === 'prompt'
                ? 'border-emerald-500 text-emerald-500 font-semibold'
                : 'border-transparent text-neutral-400 hover:text-neutral-200'
            }`}
          >
            System Prompt
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('rag')}
            className={`py-3 border-b-2 whitespace-nowrap transition-colors ${
              activeTab === 'rag'
                ? 'border-emerald-500 text-emerald-500 font-semibold'
                : 'border-transparent text-neutral-400 hover:text-neutral-200'
            }`}
          >
            Local RAG
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('guide')}
            className={`py-3 border-b-2 whitespace-nowrap transition-colors ${
              activeTab === 'guide'
                ? 'border-emerald-500 text-emerald-500 font-semibold'
                : 'border-transparent text-neutral-400 hover:text-neutral-200'
            }`}
          >
            Ollama Setup Guide
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5 scrollbar-thin">
          {/* TAB 1: Ollama Configuration */}
          {activeTab === 'ollama' && (
            <div className="space-y-4 text-sm">
              {/* Connection Status Banner */}
              <div
                className={`p-4 rounded-xl border flex items-center justify-between ${
                  connectionStatus.connected
                    ? isDark
                      ? 'bg-emerald-950/30 border-emerald-800/60 text-emerald-200'
                      : 'bg-emerald-50 border-emerald-200 text-emerald-800'
                    : isDark
                    ? 'bg-rose-950/30 border-rose-800/60 text-rose-200'
                    : 'bg-rose-50 border-rose-200 text-rose-800'
                }`}
              >
                <div className="flex items-center gap-3">
                  {connectionStatus.connected ? (
                    <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
                  ) : (
                    <XCircle className="w-5 h-5 text-rose-500 shrink-0" />
                  )}
                  <div>
                    <div className="font-semibold text-sm">
                      {connectionStatus.connected ? '🟢 Ollama Connected' : '🔴 Ollama Not Connected'}
                    </div>
                    <div className="text-xs opacity-90 mt-0.5">
                      {connectionStatus.connected
                        ? `Ollama v${connectionStatus.version || '0.5.x'} · ${models.length} installed models detected · ${connectionStatus.latencyMs || 0}ms latency`
                        : connectionStatus.error || 'Ollama is not running or cannot be reached at this URL.'}
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={runConnectionTest}
                  disabled={isTesting}
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold shrink-0 transition-colors"
                >
                  {isTesting ? 'Testing...' : 'Test Connection'}
                </button>
              </div>

              {/* Ollama Server URL */}
              <div className="space-y-1.5">
                <label className="block text-xs font-medium">Ollama Server URL</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={formData.ollamaUrl}
                    onChange={(e) => setFormData({ ...formData, ollamaUrl: e.target.value })}
                    placeholder="http://localhost:11434"
                    className={`flex-1 px-3 py-2 rounded-lg text-xs font-mono border outline-none ${
                      isDark
                        ? 'bg-neutral-800 border-neutral-700 text-white focus:border-emerald-500'
                        : 'bg-white border-neutral-300 text-neutral-900 focus:border-emerald-600'
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, ollamaUrl: 'http://localhost:11434' })}
                    className={`px-3 py-2 rounded-lg text-xs font-medium border ${
                      isDark ? 'border-neutral-700 hover:bg-neutral-800' : 'border-neutral-300 hover:bg-neutral-100'
                    }`}
                  >
                    Reset URL
                  </button>
                </div>
                <p className={`text-[11px] ${isDark ? 'text-neutral-400' : 'text-neutral-500'}`}>
                  Standard default endpoint for Ollama is <code>http://localhost:11434</code>.
                </p>
              </div>

              {/* Connection Mode (Local Proxy vs Direct Browser) */}
              <div className="space-y-1.5">
                <label className="block text-xs font-medium">Connection Routing</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, connectionMode: 'proxy' })}
                    className={`p-3 rounded-xl border text-left text-xs transition-all ${
                      formData.connectionMode === 'proxy'
                        ? 'border-emerald-500 bg-emerald-600/10 text-emerald-400 font-semibold'
                        : isDark
                        ? 'border-neutral-800 hover:bg-neutral-800/50 text-neutral-300'
                        : 'border-neutral-300 hover:bg-neutral-100 text-neutral-700'
                    }`}
                  >
                    <div className="font-semibold mb-0.5">Local Backend Proxy</div>
                    <div className="text-[11px] text-neutral-400 font-normal">
                      Routes requests via local Node.js proxy to completely eliminate browser CORS restrictions.
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, connectionMode: 'direct' })}
                    className={`p-3 rounded-xl border text-left text-xs transition-all ${
                      formData.connectionMode === 'direct'
                        ? 'border-emerald-500 bg-emerald-600/10 text-emerald-400 font-semibold'
                        : isDark
                        ? 'border-neutral-800 hover:bg-neutral-800/50 text-neutral-300'
                        : 'border-neutral-300 hover:bg-neutral-100 text-neutral-700'
                    }`}
                  >
                    <div className="font-semibold mb-0.5">Direct Browser Fetch</div>
                    <div className="text-[11px] text-neutral-400 font-normal">
                      Direct HTTP requests from browser to <code>http://localhost:11434</code> (requires OLLAMA_ORIGINS="*" if cross-origin).
                    </div>
                  </button>
                </div>
              </div>

              {/* Installed / Available Models list */}
              <div className="space-y-2 pt-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold uppercase tracking-wider text-neutral-400">
                    Available Models ({models.length})
                  </label>
                  <button
                    type="button"
                    onClick={handleRefresh}
                    disabled={isRefreshing}
                    className="flex items-center gap-1.5 text-xs text-emerald-400 hover:text-emerald-300"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
                    <span>Refresh from Ollama</span>
                  </button>
                </div>

                <div
                  className={`rounded-xl border divide-y overflow-hidden max-h-48 overflow-y-auto scrollbar-thin ${
                    isDark ? 'border-neutral-800 divide-neutral-800 bg-neutral-850' : 'border-neutral-200 divide-neutral-200 bg-neutral-50'
                  }`}
                >
                  {models.map((m) => (
                    <div
                      key={m.name}
                      className="p-2.5 flex items-center justify-between text-xs hover:bg-black/5"
                    >
                      <div className="flex flex-col">
                        <span className="font-mono font-semibold">{m.name}</span>
                        <span className={`text-[10px] ${isDark ? 'text-neutral-400' : 'text-neutral-500'}`}>
                          {m.details?.parameter_size ? `${m.details.parameter_size} params` : ''}{' '}
                          {m.details?.quantization_level ? `· ${m.details.quantization_level}` : ''}
                        </span>
                      </div>
                      <span className="text-[10px] text-neutral-400 font-mono">
                        {Math.round(m.size / (1024 * 1024))} MB
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: Model Parameters (Section 14) */}
          {activeTab === 'parameters' && (
            <div className="space-y-4 text-xs">
              <p className={`text-xs ${isDark ? 'text-neutral-400' : 'text-neutral-600'}`}>
                Fine-tune generation parameters sent in the <code>options</code> payload to your local Ollama model.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Temperature */}
                <div className="space-y-1.5 p-3 rounded-xl border border-neutral-800 bg-neutral-850/40">
                  <div className="flex justify-between font-medium">
                    <span>Temperature</span>
                    <span className="font-mono text-emerald-400">{formData.options.temperature}</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="2"
                    step="0.05"
                    value={formData.options.temperature}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        options: { ...formData.options, temperature: parseFloat(e.target.value) },
                      })
                    }
                    className="w-full accent-emerald-500"
                  />
                  <span className="text-[11px] text-neutral-400 block">
                    Lower is focused & deterministic; higher is creative.
                  </span>
                </div>

                {/* Top P */}
                <div className="space-y-1.5 p-3 rounded-xl border border-neutral-800 bg-neutral-850/40">
                  <div className="flex justify-between font-medium">
                    <span>Top P (Nucleus Sampling)</span>
                    <span className="font-mono text-emerald-400">{formData.options.top_p}</span>
                  </div>
                  <input
                    type="range"
                    min="0.1"
                    max="1.0"
                    step="0.05"
                    value={formData.options.top_p}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        options: { ...formData.options, top_p: parseFloat(e.target.value) },
                      })
                    }
                    className="w-full accent-emerald-500"
                  />
                  <span className="text-[11px] text-neutral-400 block">
                    Cumulative probability cutoff for tokens.
                  </span>
                </div>

                {/* Top K */}
                <div className="space-y-1.5 p-3 rounded-xl border border-neutral-800 bg-neutral-850/40">
                  <div className="flex justify-between font-medium">
                    <span>Top K</span>
                    <span className="font-mono text-emerald-400">{formData.options.top_k}</span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="100"
                    step="1"
                    value={formData.options.top_k}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        options: { ...formData.options, top_k: parseInt(e.target.value) },
                      })
                    }
                    className="w-full accent-emerald-500"
                  />
                  <span className="text-[11px] text-neutral-400 block">
                    Reduces probability of generating nonsense tokens.
                  </span>
                </div>

                {/* Repeat Penalty */}
                <div className="space-y-1.5 p-3 rounded-xl border border-neutral-800 bg-neutral-850/40">
                  <div className="flex justify-between font-medium">
                    <span>Repeat Penalty</span>
                    <span className="font-mono text-emerald-400">{formData.options.repeat_penalty}</span>
                  </div>
                  <input
                    type="range"
                    min="1.0"
                    max="2.0"
                    step="0.05"
                    value={formData.options.repeat_penalty}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        options: { ...formData.options, repeat_penalty: parseFloat(e.target.value) },
                      })
                    }
                    className="w-full accent-emerald-500"
                  />
                  <span className="text-[11px] text-neutral-400 block">
                    Penalizes repeated phrases and loops.
                  </span>
                </div>

                {/* Context Length (num_ctx) */}
                <div className="space-y-1.5 p-3 rounded-xl border border-neutral-800 bg-neutral-850/40">
                  <div className="flex justify-between font-medium">
                    <span>Context Length (num_ctx)</span>
                    <span className="font-mono text-emerald-400">{formData.options.num_ctx}</span>
                  </div>
                  <select
                    value={formData.options.num_ctx}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        options: { ...formData.options, num_ctx: parseInt(e.target.value) },
                      })
                    }
                    className={`w-full p-1.5 rounded-lg border font-mono text-xs ${
                      isDark ? 'bg-neutral-800 border-neutral-700 text-white' : 'bg-white border-neutral-300'
                    }`}
                  >
                    <option value={2048}>2048 tokens</option>
                    <option value={4096}>4096 tokens (Default)</option>
                    <option value={8192}>8192 tokens</option>
                    <option value={16384}>16384 tokens</option>
                    <option value={32768}>32768 tokens</option>
                  </select>
                  <span className="text-[11px] text-neutral-400 block">
                    Larger context requires more VRAM / RAM.
                  </span>
                </div>

                {/* Max Tokens (num_predict) */}
                <div className="space-y-1.5 p-3 rounded-xl border border-neutral-800 bg-neutral-850/40">
                  <div className="flex justify-between font-medium">
                    <span>Max Tokens (num_predict)</span>
                    <span className="font-mono text-emerald-400">{formData.options.num_predict}</span>
                  </div>
                  <select
                    value={formData.options.num_predict}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        options: { ...formData.options, num_predict: parseInt(e.target.value) },
                      })
                    }
                    className={`w-full p-1.5 rounded-lg border font-mono text-xs ${
                      isDark ? 'bg-neutral-800 border-neutral-700 text-white' : 'bg-white border-neutral-300'
                    }`}
                  >
                    <option value={512}>512 tokens</option>
                    <option value={1024}>1024 tokens</option>
                    <option value={2048}>2048 tokens (Default)</option>
                    <option value={4096}>4096 tokens</option>
                  </select>
                  <span className="text-[11px] text-neutral-400 block">
                    Maximum length of generated response.
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: System Prompt (Section 15) */}
          {activeTab === 'prompt' && (
            <div className="space-y-3 text-xs">
              <div className="flex items-center justify-between">
                <label className="font-semibold text-neutral-300">System Prompt Directive</label>
                <button
                  type="button"
                  onClick={() =>
                    setFormData({
                      ...formData,
                      systemPrompt: DEFAULT_SETTINGS.systemPrompt,
                    })
                  }
                  className="flex items-center gap-1 text-neutral-400 hover:text-white text-xs"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Reset to default</span>
                </button>
              </div>

              <textarea
                rows={5}
                value={formData.systemPrompt}
                onChange={(e) => setFormData({ ...formData, systemPrompt: e.target.value })}
                placeholder="Enter system prompt for Ollama..."
                className={`w-full p-3 rounded-xl border outline-none font-sans text-xs leading-relaxed ${
                  isDark
                    ? 'bg-neutral-800 border-neutral-700 text-white focus:border-emerald-500'
                    : 'bg-white border-neutral-300 text-neutral-900 focus:border-emerald-600'
                }`}
              />

              <p className={`text-[11px] ${isDark ? 'text-neutral-400' : 'text-neutral-500'}`}>
                This prompt is prepended as a <code>system</code> role message to your conversations and controls the persona, tone, and formatting of Ollama's outputs.
              </p>
            </div>
          )}

          {/* TAB 4: Local RAG Architecture (Section 17) */}
          {activeTab === 'rag' && (
            <div className="space-y-4 text-xs">
              <div className="flex items-center justify-between p-3.5 rounded-xl border border-neutral-800 bg-neutral-850/40">
                <div className="space-y-0.5">
                  <div className="font-semibold text-sm">Enable Local Document RAG</div>
                  <div className={`text-[11px] ${isDark ? 'text-neutral-400' : 'text-neutral-500'}`}>
                    Automatically retrieves semantic context from uploaded documents into model prompts.
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={formData.ragConfig.enabled}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      ragConfig: { ...formData.ragConfig, enabled: e.target.checked },
                    })
                  }
                  className="w-5 h-5 accent-emerald-500 rounded cursor-pointer"
                />
              </div>

              <div className="space-y-2">
                <label className="font-medium">Vector Store Engine</label>
                <div className="grid grid-cols-3 gap-2">
                  {(['in-memory', 'chroma', 'qdrant'] as const).map((store) => (
                    <button
                      key={store}
                      type="button"
                      onClick={() =>
                        setFormData({
                          ...formData,
                          ragConfig: { ...formData.ragConfig, provider: store },
                        })
                      }
                      className={`p-3 rounded-xl border text-left transition-all ${
                        formData.ragConfig.provider === store
                          ? 'border-emerald-500 bg-emerald-600/10 text-emerald-400 font-semibold'
                          : isDark
                          ? 'border-neutral-800 hover:bg-neutral-800 text-neutral-300'
                          : 'border-neutral-300 hover:bg-neutral-100 text-neutral-700'
                      }`}
                    >
                      <div className="capitalize font-semibold">{store}</div>
                      <div className="text-[10px] text-neutral-400">
                        {store === 'in-memory'
                          ? 'Built-in local'
                          : store === 'chroma'
                          ? 'ChromaDB instance'
                          : 'Qdrant vector engine'}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-medium">Vector Store URL</label>
                  <input
                    type="text"
                    value={formData.ragConfig.serverUrl}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        ragConfig: { ...formData.ragConfig, serverUrl: e.target.value },
                      })
                    }
                    className={`w-full p-2 rounded-lg border font-mono text-xs ${
                      isDark ? 'bg-neutral-800 border-neutral-700 text-white' : 'bg-white border-neutral-300'
                    }`}
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-medium">Top-K Context Chunks</label>
                  <input
                    type="number"
                    min="1"
                    max="10"
                    value={formData.ragConfig.topK}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        ragConfig: { ...formData.ragConfig, topK: parseInt(e.target.value) || 3 },
                      })
                    }
                    className={`w-full p-2 rounded-lg border font-mono text-xs ${
                      isDark ? 'bg-neutral-800 border-neutral-700 text-white' : 'bg-white border-neutral-300'
                    }`}
                  />
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: Ollama Setup Guide (Sections 18, 19, 20) */}
          {activeTab === 'guide' && (
            <div className="space-y-4 text-xs leading-relaxed">
              <div
                className={`p-3.5 rounded-xl border ${
                  isDark ? 'bg-neutral-850/70 border-neutral-800' : 'bg-neutral-50 border-neutral-200'
                }`}
              >
                <h4 className="font-semibold text-sm mb-1.5 flex items-center gap-1.5 text-emerald-400">
                  <Terminal className="w-4 h-4" />
                  <span>How to launch Ollama on your computer</span>
                </h4>
                <p className="text-neutral-400 mb-2">
                  Open your terminal and make sure Ollama is installed and running:
                </p>
                <div className="bg-neutral-950 p-3 rounded-lg font-mono text-emerald-400 text-xs space-y-1 select-all border border-neutral-800">
                  <div># 1. Start Ollama server</div>
                  <div>ollama serve</div>
                  <div className="mt-2 text-neutral-500"># 2. Allow browser cross-origin requests (if using Direct Mode)</div>
                  <div>OLLAMA_ORIGINS="*" ollama serve</div>
                </div>
              </div>

              <div
                className={`p-3.5 rounded-xl border ${
                  isDark ? 'bg-neutral-850/70 border-neutral-800' : 'bg-neutral-50 border-neutral-200'
                }`}
              >
                <h4 className="font-semibold text-sm mb-1.5 flex items-center gap-1.5 text-blue-400">
                  <Cpu className="w-4 h-4" />
                  <span>Download / Pull Models</span>
                </h4>
                <p className="text-neutral-400 mb-2">
                  Pull your preferred local models into Ollama:
                </p>
                <div className="bg-neutral-950 p-3 rounded-lg font-mono text-neutral-300 text-xs space-y-1 select-all border border-neutral-800">
                  <div>ollama pull qwen2.5:7b</div>
                  <div>ollama pull gemma4</div>
                  <div>ollama pull llama3:8b</div>
                  <div>ollama pull mistral</div>
                  <div className="text-emerald-400"># For vision & image understanding:</div>
                  <div>ollama pull llava</div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div
          className={`flex items-center justify-between px-5 py-3.5 border-t ${
            isDark ? 'border-neutral-800 bg-neutral-900' : 'border-neutral-200 bg-neutral-50'
          }`}
        >
          <button
            type="button"
            onClick={handleResetDefaults}
            className={`text-xs px-3 py-1.5 rounded-lg border transition-colors ${
              isDark ? 'border-neutral-700 text-neutral-400 hover:text-white' : 'border-neutral-300 text-neutral-600 hover:text-black'
            }`}
          >
            Reset All Defaults
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className={`text-xs px-3.5 py-2 rounded-lg font-medium transition-colors ${
                isDark ? 'hover:bg-neutral-800 text-neutral-300' : 'hover:bg-neutral-200 text-neutral-700'
              }`}
            >
              Cancel
            </button>
            <button
              id="settings-save-btn"
              type="button"
              onClick={handleSave}
              className="text-xs px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold shadow-xs transition-colors"
            >
              {savedAlert ? 'Saved ✓' : 'Save Changes'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
