import React, { useState } from 'react';
import {
  MessageSquarePlus,
  Search,
  Settings,
  Trash2,
  Edit2,
  Check,
  X,
  Bot,
  Layers,
  ChevronDown,
  Cpu,
  ShieldCheck,
  AlertCircle,
} from 'lucide-react';
import { Conversation, OllamaModel, OllamaConnectionStatus } from '../types';
import { groupConversationsByDate, formatTimeAgo } from '../utils/dateUtils';

interface SidebarProps {
  conversations: Conversation[];
  activeConversationId: string | null;
  onSelectConversation: (id: string) => void;
  onNewChat: () => void;
  onDeleteConversation: (id: string) => void;
  onRenameConversation: (id: string, newTitle: string) => void;
  onClearAll: () => void;
  models: OllamaModel[];
  selectedModel: string;
  onSelectModel: (modelName: string) => void;
  onOpenSettings: () => void;
  connectionStatus: OllamaConnectionStatus;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  isOpenMobile: boolean;
  onCloseMobile: () => void;
  theme: 'dark' | 'light';
}

export const Sidebar: React.FC<SidebarProps> = ({
  conversations,
  activeConversationId,
  onSelectConversation,
  onNewChat,
  onDeleteConversation,
  onRenameConversation,
  onClearAll,
  models,
  selectedModel,
  onSelectModel,
  onOpenSettings,
  connectionStatus,
  searchQuery,
  onSearchChange,
  isOpenMobile,
  onCloseMobile,
  theme,
}) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [showModelDropdown, setShowModelDropdown] = useState(false);

  // Group conversations by time period
  const grouped = groupConversationsByDate(conversations);

  const startEditing = (conv: Conversation, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingId(conv.id);
    setEditTitle(conv.title);
  };

  const handleSaveRename = (id: string, e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (editTitle.trim()) {
      onRenameConversation(id, editTitle.trim());
    }
    setEditingId(null);
  };

  const cancelEditing = (e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingId(null);
  };

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    onDeleteConversation(id);
  };

  const isDark = theme === 'dark';

  const renderGroup = (title: string, list: Conversation[]) => {
    if (list.length === 0) return null;

    return (
      <div key={title} className="mb-4">
        <div
          className={`px-3 py-1 text-xs font-semibold uppercase tracking-wider ${
            isDark ? 'text-neutral-400' : 'text-neutral-500'
          }`}
        >
          {title}
        </div>
        <div className="mt-1 space-y-1">
          {list.map((conv) => {
            const isActive = conv.id === activeConversationId;
            const isEditingThis = editingId === conv.id;

            return (
              <div
                key={conv.id}
                id={`conversation-item-${conv.id}`}
                onClick={() => {
                  if (!isEditingThis) {
                    onSelectConversation(conv.id);
                    onCloseMobile();
                  }
                }}
                className={`group relative flex items-center justify-between rounded-lg px-3 py-2.5 text-sm cursor-pointer transition-colors ${
                  isActive
                    ? isDark
                      ? 'bg-neutral-800 text-white font-medium shadow-xs'
                      : 'bg-neutral-200/80 text-neutral-900 font-medium shadow-xs'
                    : isDark
                    ? 'text-neutral-300 hover:bg-neutral-800/60 hover:text-white'
                    : 'text-neutral-700 hover:bg-neutral-200/50 hover:text-neutral-900'
                }`}
              >
                {isEditingThis ? (
                  <form
                    onSubmit={(e) => handleSaveRename(conv.id, e)}
                    className="flex items-center gap-1.5 w-full"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <input
                      type="text"
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      autoFocus
                      className={`w-full rounded px-2 py-0.5 text-xs outline-none ring-1 ${
                        isDark
                          ? 'bg-neutral-700 text-white ring-blue-500'
                          : 'bg-white text-neutral-900 ring-blue-600'
                      }`}
                    />
                    <button
                      type="submit"
                      className="p-1 text-emerald-400 hover:text-emerald-300"
                      title="Save"
                    >
                      <Check className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={cancelEditing}
                      className="p-1 text-neutral-400 hover:text-neutral-300"
                      title="Cancel"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </form>
                ) : (
                  <>
                    <div className="flex flex-col min-w-0 pr-2">
                      <span className="truncate text-sm">{conv.title || 'Untitled Chat'}</span>
                      <span
                        className={`text-[11px] ${
                          isDark ? 'text-neutral-400' : 'text-neutral-500'
                        }`}
                      >
                        {formatTimeAgo(conv.updatedAt)}
                      </span>
                    </div>

                    {/* Action buttons (Rename / Delete) visible on hover or active */}
                    <div
                      className={`flex items-center gap-1 shrink-0 ${
                        isActive ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                      } transition-opacity`}
                    >
                      <button
                        type="button"
                        onClick={(e) => startEditing(conv, e)}
                        title="Rename conversation"
                        className={`p-1 rounded hover:bg-black/10 transition-colors ${
                          isDark ? 'text-neutral-400 hover:text-neutral-200' : 'text-neutral-500 hover:text-neutral-800'
                        }`}
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => handleDelete(conv.id, e)}
                        title="Delete conversation"
                        className={`p-1 rounded hover:bg-rose-500/10 transition-colors ${
                          isDark ? 'text-neutral-400 hover:text-rose-400' : 'text-neutral-500 hover:text-rose-600'
                        }`}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <>
      {/* Mobile backdrop overlay */}
      {isOpenMobile && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-xs md:hidden"
          onClick={onCloseMobile}
        />
      )}

      <aside
        id="app-sidebar"
        className={`fixed md:static inset-y-0 left-0 z-50 flex flex-col w-72 md:w-80 h-full select-none transition-transform duration-200 ease-in-out border-r ${
          isDark
            ? 'bg-neutral-900 border-neutral-800 text-neutral-100'
            : 'bg-neutral-100 border-neutral-200 text-neutral-800'
        } ${isOpenMobile ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}
      >
        {/* Top Header: Brand & New Chat */}
        <div className="p-3.5 space-y-3 shrink-0">
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-2">
              <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-emerald-600 text-white font-semibold shadow-xs">
                <Bot className="w-4 h-4" />
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-semibold tracking-tight leading-tight">
                  Local AI Chat
                </span>
                <span className="text-[10px] text-emerald-500 font-medium">
                  OFFLINE OLLAMA
                </span>
              </div>
            </div>

            {/* Mobile close button */}
            <button
              onClick={onCloseMobile}
              className="p-1 rounded-md md:hidden hover:bg-neutral-800 text-neutral-400"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* New Chat Button */}
          <button
            id="sidebar-new-chat-btn"
            onClick={() => {
              onNewChat();
              onCloseMobile();
            }}
            className={`w-full flex items-center justify-between gap-2 px-3.5 py-2.5 rounded-xl font-medium text-sm transition-all shadow-xs ${
              isDark
                ? 'bg-neutral-800 hover:bg-neutral-700/80 text-white border border-neutral-700/60'
                : 'bg-white hover:bg-neutral-50 text-neutral-900 border border-neutral-300'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <MessageSquarePlus className="w-4 h-4 text-emerald-500" />
              <span>New Chat</span>
            </div>
            <span
              className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${
                isDark ? 'bg-neutral-700 text-neutral-300' : 'bg-neutral-100 text-neutral-600'
              }`}
            >
              ⌘N
            </span>
          </button>

          {/* Search Conversations Box */}
          <div className="relative">
            <Search
              className={`absolute left-3 top-2.5 w-4 h-4 ${
                isDark ? 'text-neutral-400' : 'text-neutral-500'
              }`}
            />
            <input
              id="sidebar-search-input"
              type="text"
              placeholder="Search conversations..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className={`w-full pl-9 pr-8 py-2 rounded-lg text-xs outline-none transition-colors border ${
                isDark
                  ? 'bg-neutral-800/60 border-neutral-700/50 text-neutral-200 placeholder-neutral-400 focus:border-neutral-500 focus:bg-neutral-800'
                  : 'bg-white border-neutral-300 text-neutral-900 placeholder-neutral-500 focus:border-neutral-400 focus:bg-white'
              }`}
            />
            {searchQuery && (
              <button
                onClick={() => onSearchChange('')}
                className="absolute right-2.5 top-2.5 text-neutral-400 hover:text-neutral-200"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Middle: Conversation List grouped by Today, Yesterday, Previous 7 Days, Older */}
        <div className="flex-1 overflow-y-auto px-2 py-1 scrollbar-thin">
          {conversations.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 text-center px-4">
              <Layers className="w-8 h-8 text-neutral-400 mb-2" />
              <p className={`text-xs ${isDark ? 'text-neutral-400' : 'text-neutral-500'}`}>
                {searchQuery ? 'No conversations match search' : 'No conversation history yet'}
              </p>
            </div>
          ) : (
            <>
              {renderGroup('Today', grouped.today)}
              {renderGroup('Yesterday', grouped.yesterday)}
              {renderGroup('Previous 7 Days', grouped.previous7Days)}
              {renderGroup('Older', grouped.older)}
            </>
          )}
        </div>

        {/* Bottom Section: Model selector, Settings, Offline Status */}
        <div
          className={`p-3 border-t shrink-0 space-y-2 ${
            isDark ? 'border-neutral-800 bg-neutral-900/90' : 'border-neutral-200 bg-neutral-100/90'
          }`}
        >
          {/* Quick Model Selector in Sidebar */}
          <div className="relative">
            <button
              id="sidebar-model-selector-btn"
              type="button"
              onClick={() => setShowModelDropdown(!showModelDropdown)}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium border transition-colors ${
                isDark
                  ? 'bg-neutral-800/80 border-neutral-700/60 text-neutral-200 hover:bg-neutral-700/60'
                  : 'bg-white border-neutral-300 text-neutral-800 hover:bg-neutral-50'
              }`}
            >
              <div className="flex items-center gap-2 truncate">
                <Cpu className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                <span className="truncate">{selectedModel || 'Select Model'}</span>
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-neutral-400 shrink-0 ml-1" />
            </button>

            {/* Dropdown menu */}
            {showModelDropdown && (
              <div
                className={`absolute bottom-full left-0 mb-1.5 w-full max-h-56 overflow-y-auto rounded-xl shadow-xl border z-50 p-1 ${
                  isDark ? 'bg-neutral-800 border-neutral-700 text-neutral-100' : 'bg-white border-neutral-200 text-neutral-800'
                }`}
              >
                <div className="px-2 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-neutral-400">
                  Installed Local Models ({models.length})
                </div>
                {models.map((m) => (
                  <button
                    key={m.name}
                    type="button"
                    onClick={() => {
                      onSelectModel(m.name);
                      setShowModelDropdown(false);
                    }}
                    className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs text-left transition-colors ${
                      m.name === selectedModel
                        ? 'bg-emerald-600/20 text-emerald-400 font-semibold'
                        : isDark
                        ? 'hover:bg-neutral-700/70 text-neutral-300'
                        : 'hover:bg-neutral-100 text-neutral-700'
                    }`}
                  >
                    <span className="truncate">{m.name}</span>
                    {m.details?.parameter_size && (
                      <span className="text-[10px] text-neutral-400 ml-1 font-mono">
                        {m.details.parameter_size}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Settings & Clear Conversations Actions */}
          <div className="flex items-center gap-1.5">
            <button
              id="sidebar-settings-btn"
              type="button"
              onClick={onOpenSettings}
              className={`flex-1 flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                isDark
                  ? 'bg-neutral-800/60 hover:bg-neutral-800 text-neutral-300 hover:text-white'
                  : 'bg-white hover:bg-neutral-50 text-neutral-700 border border-neutral-300'
              }`}
            >
              <Settings className="w-3.5 h-3.5 text-neutral-400" />
              <span>Settings</span>
            </button>

            {conversations.length > 0 && (
              <button
                type="button"
                onClick={() => setShowClearConfirm(true)}
                title="Clear all conversations"
                className={`p-2 rounded-lg text-xs transition-colors ${
                  isDark
                    ? 'bg-neutral-800/60 hover:bg-rose-500/20 text-neutral-400 hover:text-rose-400'
                    : 'bg-white hover:bg-rose-50 text-neutral-600 hover:text-rose-600 border border-neutral-300'
                }`}
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Clear confirmation alert */}
          {showClearConfirm && (
            <div
              className={`p-2.5 rounded-lg border text-xs space-y-2 ${
                isDark ? 'bg-rose-950/40 border-rose-800 text-rose-200' : 'bg-rose-50 border-rose-200 text-rose-800'
              }`}
            >
              <p className="font-medium">Delete all local chats?</p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    onClearAll();
                    setShowClearConfirm(false);
                  }}
                  className="px-2 py-1 bg-rose-600 text-white rounded text-[11px] font-semibold hover:bg-rose-500"
                >
                  Yes, Clear All
                </button>
                <button
                  type="button"
                  onClick={() => setShowClearConfirm(false)}
                  className={`px-2 py-1 rounded text-[11px] ${
                    isDark ? 'bg-neutral-800 text-neutral-300' : 'bg-white border text-neutral-700'
                  }`}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Connection & Offline Mode status pill */}
          <div
            onClick={onOpenSettings}
            className={`flex items-center justify-between px-3 py-2 rounded-lg text-[11px] cursor-pointer transition-colors ${
              connectionStatus.connected
                ? isDark
                  ? 'bg-emerald-950/30 text-emerald-300 border border-emerald-800/40 hover:bg-emerald-950/50'
                  : 'bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100'
                : isDark
                ? 'bg-amber-950/30 text-amber-300 border border-amber-800/40 hover:bg-amber-950/50'
                : 'bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100'
            }`}
          >
            <div className="flex items-center gap-1.5 truncate">
              {connectionStatus.connected ? (
                <>
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                  <span className="font-semibold truncate">OFFLINE AI · Ollama</span>
                </>
              ) : (
                <>
                  <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0" />
                  <span className="font-medium truncate">Offline Mode (Local)</span>
                </>
              )}
            </div>
            <span className="text-[10px] opacity-80 shrink-0 ml-1">
              {connectionStatus.connected ? `${connectionStatus.modelsCount} models` : 'Configure'}
            </span>
          </div>
        </div>
      </aside>
    </>
  );
};
