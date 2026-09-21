import React, { useState } from 'react';
import {
  Menu,
  ChevronDown,
  Sun,
  Moon,
  Sparkles,
  Columns,
  Cpu,
  RefreshCw,
  ShieldCheck,
  Zap,
} from 'lucide-react';
import { OllamaModel, OllamaConnectionStatus } from '../types';

interface ChatHeaderProps {
  selectedModel: string;
  models: OllamaModel[];
  onSelectModel: (modelName: string) => void;
  connectionStatus: OllamaConnectionStatus;
  onRefreshModels: () => void;
  onOpenSettings: () => void;
  onOpenCompare: () => void;
  onToggleMobileSidebar: () => void;
  theme: 'dark' | 'light';
  onToggleTheme: () => void;
}

export const ChatHeader: React.FC<ChatHeaderProps> = ({
  selectedModel,
  models,
  onSelectModel,
  connectionStatus,
  onRefreshModels,
  onOpenSettings,
  onOpenCompare,
  onToggleMobileSidebar,
  theme,
  onToggleTheme,
}) => {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const isDark = theme === 'dark';

  return (
    <header
      id="chat-header"
      className={`relative z-20 flex items-center justify-between px-3.5 sm:px-6 py-2.5 border-b select-none transition-colors ${
        isDark
          ? 'bg-neutral-900/90 backdrop-blur-md border-neutral-800 text-neutral-100'
          : 'bg-white/90 backdrop-blur-md border-neutral-200 text-neutral-900'
      }`}
    >
      {/* Left side: Mobile menu button & Main Title "AI Assistant · {model}" */}
      <div className="flex items-center gap-2 sm:gap-3 min-w-0">
        <button
          id="toggle-sidebar-mobile-btn"
          type="button"
          onClick={onToggleMobileSidebar}
          className={`p-2 rounded-lg md:hidden transition-colors ${
            isDark ? 'hover:bg-neutral-800 text-neutral-300' : 'hover:bg-neutral-100 text-neutral-700'
          }`}
          aria-label="Toggle Sidebar"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Primary Header Title requirement: "AI Assistant · {model}" */}
        <div className="flex items-center gap-2 min-w-0">
          <h1 className="text-sm sm:text-base font-semibold tracking-tight truncate flex items-center gap-1.5">
            <span>AI Assistant</span>
            <span className="text-neutral-400 font-normal">·</span>
            <span className="text-emerald-500 font-mono text-xs sm:text-sm font-medium truncate">
              {selectedModel}
            </span>
          </h1>
        </div>
      </div>

      {/* Right side: Model Selector Dropdown, Compare button, Connection pill, Theme toggle */}
      <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
        {/* Model Selector Dropdown */}
        <div className="relative">
          <button
            id="header-model-dropdown-btn"
            type="button"
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-all shadow-2xs ${
              isDark
                ? 'bg-neutral-800 border-neutral-700/80 text-neutral-200 hover:bg-neutral-700/70'
                : 'bg-neutral-100 border-neutral-300 text-neutral-800 hover:bg-neutral-200/70'
            }`}
          >
            <Cpu className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
            <span className="hidden xs:inline max-w-[120px] sm:max-w-[150px] truncate">
              {selectedModel}
            </span>
            <ChevronDown className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
          </button>

          {dropdownOpen && (
            <div
              className={`absolute right-0 top-full mt-1.5 w-64 sm:w-72 rounded-xl shadow-xl border z-50 p-1.5 ${
                isDark ? 'bg-neutral-800 border-neutral-700 text-neutral-100' : 'bg-white border-neutral-200 text-neutral-900'
              }`}
            >
              <div className="flex items-center justify-between px-2.5 py-1.5 text-[11px] font-semibold text-neutral-400 uppercase tracking-wider border-b border-neutral-700/30">
                <span>Select Ollama Model</span>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onRefreshModels();
                  }}
                  title="Refresh models from Ollama"
                  className="flex items-center gap-1 text-emerald-400 hover:text-emerald-300 normal-case font-normal"
                >
                  <RefreshCw className="w-3 h-3" />
                  <span>Refresh</span>
                </button>
              </div>

              <div className="max-h-60 overflow-y-auto mt-1 space-y-0.5 scrollbar-thin">
                {models.map((m) => {
                  const isSelected = m.name === selectedModel;
                  return (
                    <button
                      key={m.name}
                      type="button"
                      onClick={() => {
                        onSelectModel(m.name);
                        setDropdownOpen(false);
                      }}
                      className={`w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-xs text-left transition-colors ${
                        isSelected
                          ? 'bg-emerald-600/20 text-emerald-400 font-semibold'
                          : isDark
                          ? 'hover:bg-neutral-700/60 text-neutral-200'
                          : 'hover:bg-neutral-100 text-neutral-800'
                      }`}
                    >
                      <div className="flex flex-col truncate">
                        <span className="truncate font-mono">{m.name}</span>
                        {m.details?.family && (
                          <span className="text-[10px] text-neutral-400">
                            {m.details.family} {m.details.parameter_size ? `· ${m.details.parameter_size}` : ''}
                          </span>
                        )}
                      </div>
                      {isSelected && <span className="text-emerald-400 text-xs font-bold">✓</span>}
                    </button>
                  );
                })}
              </div>

              <div className="mt-1.5 pt-1.5 border-t border-neutral-700/30 px-2 py-1 flex items-center justify-between text-[11px] text-neutral-400">
                <span>{models.length} model{models.length !== 1 ? 's' : ''} detected</span>
                <button
                  type="button"
                  onClick={() => {
                    setDropdownOpen(false);
                    onOpenSettings();
                  }}
                  className="text-emerald-400 hover:underline"
                >
                  Model Settings
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Compare Models toggle (Section 24) */}
        <button
          id="header-compare-models-btn"
          type="button"
          onClick={onOpenCompare}
          title="Compare Models Side-by-Side"
          className={`hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
            isDark
              ? 'bg-neutral-800/80 border-neutral-700/70 text-neutral-300 hover:bg-neutral-700/70 hover:text-white'
              : 'bg-neutral-100 border-neutral-300 text-neutral-700 hover:bg-neutral-200/70'
          }`}
        >
          <Columns className="w-3.5 h-3.5 text-neutral-400" />
          <span>Compare</span>
        </button>

        {/* Connection status indicator */}
        <button
          type="button"
          onClick={onOpenSettings}
          title={`Ollama Status: ${connectionStatus.connected ? 'Connected' : 'Offline Mode'}. Click to configure.`}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-all ${
            connectionStatus.connected
              ? isDark
                ? 'bg-emerald-950/40 border-emerald-800/50 text-emerald-300 hover:bg-emerald-950/70'
                : 'bg-emerald-50 border-emerald-200 text-emerald-800 hover:bg-emerald-100'
              : isDark
              ? 'bg-amber-950/40 border-amber-800/50 text-amber-300 hover:bg-amber-950/70'
              : 'bg-amber-50 border-amber-200 text-amber-800 hover:bg-amber-100'
          }`}
        >
          <span
            className={`w-2 h-2 rounded-full ${
              connectionStatus.connected ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'
            }`}
          />
          <span className="hidden sm:inline">
            {connectionStatus.connected ? 'Connected' : 'Offline AI'}
          </span>
        </button>

        {/* Dark/Light mode switcher */}
        <button
          id="header-theme-toggle-btn"
          type="button"
          onClick={onToggleTheme}
          title={`Switch to ${isDark ? 'Light' : 'Dark'} mode`}
          className={`p-1.5 rounded-lg border transition-colors ${
            isDark
              ? 'bg-neutral-800 border-neutral-700 text-neutral-300 hover:text-white hover:bg-neutral-700'
              : 'bg-neutral-100 border-neutral-300 text-neutral-700 hover:text-neutral-900 hover:bg-neutral-200'
          }`}
        >
          {isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-neutral-700" />}
        </button>
      </div>
    </header>
  );
};
