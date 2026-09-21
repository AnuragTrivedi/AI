import React from 'react';
import { AlertCircle, RefreshCw, Terminal, Settings, X } from 'lucide-react';
import { OllamaConnectionStatus } from '../types';

interface ConnectionBannerProps {
  connectionStatus: OllamaConnectionStatus;
  onRetry: () => void;
  onOpenSettings: () => void;
  onDismiss: () => void;
  isDismissed: boolean;
  selectedModel: string;
  isModelAvailable: boolean;
  onRefreshModels: () => void;
  theme: 'dark' | 'light';
}

export const ConnectionBanner: React.FC<ConnectionBannerProps> = ({
  connectionStatus,
  onRetry,
  onOpenSettings,
  onDismiss,
  isDismissed,
  selectedModel,
  isModelAvailable,
  onRefreshModels,
  theme,
}) => {
  const isDark = theme === 'dark';

  // If model is not available in installed models
  if (!isModelAvailable && connectionStatus.connected) {
    return (
      <div className="w-full px-4 py-2.5 bg-amber-950/60 border-b border-amber-800/80 text-amber-200 text-xs flex items-center justify-between shadow-xs">
        <div className="flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
          <span>
            The selected model <strong>{selectedModel}</strong> is not available or still downloading.
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onRefreshModels}
            className="px-2.5 py-1 bg-amber-700/60 hover:bg-amber-700 text-white rounded font-medium flex items-center gap-1 text-[11px]"
          >
            <RefreshCw className="w-3 h-3" />
            <span>Refresh Models</span>
          </button>
          <button
            type="button"
            onClick={onOpenSettings}
            className="underline hover:text-white text-[11px]"
          >
            Settings
          </button>
        </div>
      </div>
    );
  }

  // If Ollama is not connected and not dismissed
  if (!connectionStatus.connected && !isDismissed) {
    return (
      <div
        className={`w-full px-4 py-2.5 border-b text-xs flex flex-wrap items-center justify-between gap-2 shadow-xs ${
          isDark
            ? 'bg-neutral-850 border-neutral-800 text-neutral-200'
            : 'bg-neutral-100 border-neutral-300 text-neutral-800'
        }`}
      >
        <div className="flex items-center gap-2.5">
          <span className="w-2.5 h-2.5 rounded-full bg-amber-500 shrink-0" />
          <div>
            <span className="font-semibold text-amber-400">Ollama is not running or cannot be reached.</span>{' '}
            <span className="opacity-90">
              Start Ollama with <code className="px-1.5 py-0.5 rounded bg-black/30 font-mono text-emerald-400">ollama serve</code> and try again.
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={onRetry}
            className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-semibold flex items-center gap-1 text-[11px] transition-colors"
          >
            <RefreshCw className="w-3 h-3" />
            <span>Retry Connection</span>
          </button>
          <button
            type="button"
            onClick={onOpenSettings}
            className="px-2.5 py-1 bg-neutral-700 hover:bg-neutral-600 text-white rounded-lg font-medium flex items-center gap-1 text-[11px] transition-colors"
          >
            <Settings className="w-3 h-3" />
            <span>Setup</span>
          </button>
          <button
            type="button"
            onClick={onDismiss}
            className="p-1 text-neutral-400 hover:text-white"
            title="Dismiss notice"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  return null;
};
