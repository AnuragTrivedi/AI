import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { X, Columns, Play, Square, Zap, Bot } from 'lucide-react';
import { OllamaModel, AppSettings } from '../types';
import { ollamaService } from '../services/ollamaService';

interface ModelCompareModalProps {
  isOpen: boolean;
  onClose: () => void;
  models: OllamaModel[];
  settings: AppSettings;
  theme: 'dark' | 'light';
}

export const ModelCompareModal: React.FC<ModelCompareModalProps> = ({
  isOpen,
  onClose,
  models,
  settings,
  theme,
}) => {
  const [modelA, setModelA] = useState<string>(models[0]?.name || 'qwen2.5:7b');
  const [modelB, setModelB] = useState<string>(models[1]?.name || models[0]?.name || 'gemma4');
  const [prompt, setPrompt] = useState('Explain quantum computing and quantum superposition in 2 paragraphs.');

  const [responseA, setResponseA] = useState('');
  const [responseB, setResponseB] = useState('');
  const [isRunning, setIsRunning] = useState(false);
  const [statsA, setStatsA] = useState<{ tps?: number; duration?: number }>({});
  const [statsB, setStatsB] = useState<{ tps?: number; duration?: number }>({});

  if (!isOpen) return null;
  const isDark = theme === 'dark';

  const handleRunCompare = async () => {
    if (!prompt.trim() || isRunning) return;
    setIsRunning(true);
    setResponseA('');
    setResponseB('');
    setStatsA({});
    setStatsB({});

    const runA = ollamaService.streamChatResponse(
      {
        model: modelA,
        messages: [{ id: 'm1', role: 'user', content: prompt, timestamp: Date.now() }],
        systemPrompt: settings.systemPrompt,
        options: settings.options,
        ollamaUrl: settings.ollamaUrl,
        mode: settings.connectionMode,
        useSimulatedFallback: settings.useSimulatedFallback,
      },
      {
        onChunk: (chunk) => setResponseA((prev) => prev + chunk),
        onError: (err) => setResponseA((prev) => prev + `\n[Error: ${err.message}]`),
        onFinish: (_full, stats) => {
          setStatsA({ tps: stats?.tokensPerSecond });
        },
      }
    );

    const runB = ollamaService.streamChatResponse(
      {
        model: modelB,
        messages: [{ id: 'm2', role: 'user', content: prompt, timestamp: Date.now() }],
        systemPrompt: settings.systemPrompt,
        options: settings.options,
        ollamaUrl: settings.ollamaUrl,
        mode: settings.connectionMode,
        useSimulatedFallback: settings.useSimulatedFallback,
      },
      {
        onChunk: (chunk) => setResponseB((prev) => prev + chunk),
        onError: (err) => setResponseB((prev) => prev + `\n[Error: ${err.message}]`),
        onFinish: (_full, stats) => {
          setStatsB({ tps: stats?.tokensPerSecond });
        },
      }
    );

    await Promise.allSettled([runA, runB]);
    setIsRunning(false);
  };

  const handleStop = () => {
    ollamaService.stopGeneration();
    setIsRunning(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/70 backdrop-blur-xs">
      <div
        id="model-compare-modal"
        className={`w-full max-w-5xl h-[85vh] flex flex-col rounded-2xl border shadow-2xl overflow-hidden ${
          isDark ? 'bg-neutral-900 border-neutral-800 text-neutral-100' : 'bg-white border-neutral-200 text-neutral-900'
        }`}
      >
        {/* Header */}
        <div
          className={`flex items-center justify-between px-5 py-3.5 border-b ${
            isDark ? 'border-neutral-800' : 'border-neutral-200'
          }`}
        >
          <div className="flex items-center gap-2">
            <Columns className="w-5 h-5 text-emerald-500" />
            <h2 className="text-base font-semibold">Compare Local Models Side-by-Side</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-neutral-400 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Prompt Input & Model Selection controls */}
        <div
          className={`p-4 border-b space-y-3 shrink-0 ${
            isDark ? 'bg-neutral-850/60 border-neutral-800' : 'bg-neutral-50 border-neutral-200'
          }`}
        >
          <div className="flex flex-col sm:flex-row gap-3">
            {/* Model A Selector */}
            <div className="flex-1 space-y-1">
              <label className="text-xs font-semibold text-emerald-400">Model A</label>
              <select
                value={modelA}
                onChange={(e) => setModelA(e.target.value)}
                className={`w-full p-2 rounded-lg text-xs font-mono border ${
                  isDark ? 'bg-neutral-800 border-neutral-700 text-white' : 'bg-white border-neutral-300'
                }`}
              >
                {models.map((m) => (
                  <option key={m.name} value={m.name}>
                    {m.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Model B Selector */}
            <div className="flex-1 space-y-1">
              <label className="text-xs font-semibold text-blue-400">Model B</label>
              <select
                value={modelB}
                onChange={(e) => setModelB(e.target.value)}
                className={`w-full p-2 rounded-lg text-xs font-mono border ${
                  isDark ? 'bg-neutral-800 border-neutral-700 text-white' : 'bg-white border-neutral-300'
                }`}
              >
                {models.map((m) => (
                  <option key={m.name} value={m.name}>
                    {m.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Prompt bar */}
          <div className="flex gap-2">
            <input
              type="text"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Enter comparison prompt..."
              className={`flex-1 px-3.5 py-2 rounded-xl text-xs sm:text-sm border outline-none ${
                isDark ? 'bg-neutral-800 border-neutral-700 text-white' : 'bg-white border-neutral-300'
              }`}
            />
            {isRunning ? (
              <button
                type="button"
                onClick={handleStop}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shrink-0"
              >
                <Square className="w-3.5 h-3.5 fill-current" />
                <span>Stop</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={handleRunCompare}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shrink-0"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Run Comparison</span>
              </button>
            )}
          </div>
        </div>

        {/* Side-by-side Response Columns */}
        <div className="flex-1 grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x overflow-hidden border-neutral-800">
          {/* Column A */}
          <div className="flex flex-col h-full overflow-hidden p-4">
            <div className="flex items-center justify-between pb-2 mb-2 border-b border-neutral-700/30">
              <div className="flex items-center gap-2 font-mono font-semibold text-xs text-emerald-400">
                <Bot className="w-4 h-4" />
                <span>{modelA}</span>
              </div>
              {statsA.tps && (
                <div className="flex items-center gap-1 text-[11px] font-mono text-neutral-400">
                  <Zap className="w-3 h-3 text-amber-400" />
                  <span>{statsA.tps} tok/s</span>
                </div>
              )}
            </div>
            <div className="flex-1 overflow-y-auto text-xs sm:text-sm leading-relaxed prose scrollbar-thin">
              {responseA ? (
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{responseA}</ReactMarkdown>
              ) : (
                <span className="text-neutral-500 italic">Awaiting prompt execution...</span>
              )}
            </div>
          </div>

          {/* Column B */}
          <div className="flex flex-col h-full overflow-hidden p-4">
            <div className="flex items-center justify-between pb-2 mb-2 border-b border-neutral-700/30">
              <div className="flex items-center gap-2 font-mono font-semibold text-xs text-blue-400">
                <Bot className="w-4 h-4" />
                <span>{modelB}</span>
              </div>
              {statsB.tps && (
                <div className="flex items-center gap-1 text-[11px] font-mono text-neutral-400">
                  <Zap className="w-3 h-3 text-amber-400" />
                  <span>{statsB.tps} tok/s</span>
                </div>
              )}
            </div>
            <div className="flex-1 overflow-y-auto text-xs sm:text-sm leading-relaxed prose scrollbar-thin">
              {responseB ? (
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{responseB}</ReactMarkdown>
              ) : (
                <span className="text-neutral-500 italic">Awaiting prompt execution...</span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
