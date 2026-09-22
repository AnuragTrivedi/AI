import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Conversation, Message, OllamaModel, AppSettings, OllamaConnectionStatus, AttachedFile } from './types';
import { storageService, DEFAULT_SETTINGS } from './services/storageService';
import { ollamaService, DEFAULT_FALLBACK_MODELS } from './services/ollamaService';
import { ragService } from './services/ragService';
import { generateConversationTitle } from './utils/dateUtils';
import { Sidebar } from './components/Sidebar';
import { ChatHeader } from './components/ChatHeader';
import { MessageList } from './components/MessageList';
import { MessageInput } from './components/MessageInput';
import { SettingsModal } from './components/SettingsModal';
import { ModelCompareModal } from './components/ModelCompareModal';
import { ConnectionBanner } from './components/ConnectionBanner';

export default function App() {
  // Settings & Theme
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');

  // Conversations & Active Selection
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Ollama Models & Connection
  const [models, setModels] = useState<OllamaModel[]>(DEFAULT_FALLBACK_MODELS);
  const [selectedModel, setSelectedModel] = useState<string>('qwen2.5:7b');
  const [connectionStatus, setConnectionStatus] = useState<OllamaConnectionStatus>({
    connected: false,
    checking: true,
    modelsCount: 0,
  });

  // UI state
  const [isGenerating, setIsGenerating] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isCompareOpen, setIsCompareOpen] = useState(false);
  const [isBannerDismissed, setIsBannerDismissed] = useState(false);

  // Synchronous references to prevent race-condition double creation
  const isSendingMessageRef = React.useRef(false);
  const activeConversationIdRef = React.useRef<string | null>(null);

  useEffect(() => {
    activeConversationIdRef.current = activeConversationId;
  }, [activeConversationId]);

  // Initialize Settings & Apply Theme
  useEffect(() => {
    async function loadInitial() {
      const loadedSettings = await storageService.getSettings();
      setSettings(loadedSettings);
      setTheme(loadedSettings.theme || 'dark');
      if (loadedSettings.defaultModel && loadedSettings.defaultModel !== 'ollama2.5:7b') {
        setSelectedModel(loadedSettings.defaultModel);
      } else {
        setSelectedModel('qwen2.5:7b');
      }
    }
    loadInitial();
  }, []);

  // Sync theme class to document body
  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
      document.body.classList.remove('bg-neutral-50', 'text-neutral-900');
      document.body.classList.add('bg-neutral-900', 'text-neutral-100');
    } else {
      root.classList.remove('dark');
      document.body.classList.remove('bg-neutral-900', 'text-neutral-100');
      document.body.classList.add('bg-neutral-50', 'text-neutral-900');
    }
  }, [theme]);

  // Load Conversations from IndexedDB on initial mount only
  useEffect(() => {
    let mounted = true;
    const initConversations = async () => {
      const list = await storageService.getAllConversations();
      if (!mounted) return;
      setConversations(list);
      if (list.length > 0) {
        setActiveConversationId((prev) => (prev ? prev : list[0].id));
      }
    };
    initConversations();
    return () => {
      mounted = false;
    };
  }, []);

  // Check Ollama Connection and Refresh Models dynamically
  const checkConnectionAndModels = useCallback(async (customUrl?: string, mode?: 'proxy' | 'direct') => {
    const targetUrl = customUrl || settings.ollamaUrl;
    const targetMode = mode || settings.connectionMode;

    setConnectionStatus((prev) => ({ ...prev, checking: true }));
    const status = await ollamaService.checkOllamaConnection(targetUrl, targetMode);
    setConnectionStatus(status);

    const { models: detectedModels } = await ollamaService.getOllamaModels(targetUrl, targetMode);
    if (detectedModels && detectedModels.length > 0) {
      setModels(detectedModels);
      // If currently selected model is not in detected models, keep or update
      setSelectedModel((prev) => {
        const match = detectedModels.find((m) => m.name === prev);
        return match ? prev : detectedModels[0].name;
      });
    }
  }, [settings.ollamaUrl, settings.connectionMode]);

  useEffect(() => {
    checkConnectionAndModels();
  }, [checkConnectionAndModels]);

  // Periodic subtle connection check (every 30 seconds)
  useEffect(() => {
    const interval = setInterval(() => {
      checkConnectionAndModels();
    }, 30000);
    return () => clearInterval(interval);
  }, [checkConnectionAndModels]);

  // Keyboard shortcut: Cmd+N or Ctrl+N to start New Chat
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'n') {
        e.preventDefault();
        handleNewChat();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Filter conversations based on sidebar search query
  const filteredConversations = useMemo(() => {
    if (!searchQuery.trim()) return conversations;
    const q = searchQuery.toLowerCase();
    return conversations.filter((c) => {
      if (c.title.toLowerCase().includes(q)) return true;
      return c.messages.some((m) => m.content.toLowerCase().includes(q));
    });
  }, [conversations, searchQuery]);

  // Current active conversation
  const activeConversation = useMemo(() => {
    return conversations.find((c) => c.id === activeConversationId) || null;
  }, [conversations, activeConversationId]);

  // Handle Model Selection
  const handleSelectModel = (modelName: string) => {
    setSelectedModel(modelName);
    const updatedSettings = { ...settings, defaultModel: modelName };
    setSettings(updatedSettings);
    storageService.saveSettings(updatedSettings);

    // Also update selectedModel in active conversation if active
    if (activeConversation) {
      const updated = { ...activeConversation, selectedModel: modelName, updatedAt: Date.now() };
      storageService.saveConversation(updated);
      setConversations((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
    }
  };

  // Start New Chat
  const handleNewChat = () => {
    ollamaService.stopGeneration();
    setIsGenerating(false);
    isSendingMessageRef.current = false;
    activeConversationIdRef.current = null;
    setActiveConversationId(null);
  };

  // Select existing conversation
  const handleSelectConversation = (id: string) => {
    if (id === activeConversationId) return;
    ollamaService.stopGeneration();
    setIsGenerating(false);
    isSendingMessageRef.current = false;
    activeConversationIdRef.current = id;
    setActiveConversationId(id);
  };

  // Rename conversation
  const handleRenameConversation = async (id: string, newTitle: string) => {
    const conv = conversations.find((c) => c.id === id);
    if (!conv) return;
    const updated: Conversation = { ...conv, title: newTitle, updatedAt: Date.now() };
    await storageService.saveConversation(updated);
    setConversations((prev) => prev.map((c) => (c.id === id ? updated : c)));
  };

  // Delete conversation
  const handleDeleteConversation = async (id: string) => {
    await storageService.deleteConversation(id);
    const remaining = conversations.filter((c) => c.id !== id);
    setConversations(remaining);
    if (activeConversationId === id) {
      setActiveConversationId(remaining.length > 0 ? remaining[0].id : null);
    }
  };

  // Clear all conversations
  const handleClearAll = async () => {
    await storageService.clearAllConversations();
    setConversations([]);
    setActiveConversationId(null);
  };

  // Send message flow
  const handleSendMessage = async (content: string, files: AttachedFile[] = []) => {
    if (isSendingMessageRef.current || isGenerating) return;
    isSendingMessageRef.current = true;
    setIsGenerating(true);

    const currentActiveId = activeConversationIdRef.current;
    let targetConv = currentActiveId
      ? conversations.find((c) => c.id === currentActiveId) || null
      : null;
    const isNew = !targetConv;

    // Auto-generate title if this is a new conversation
    const title = targetConv ? targetConv.title : generateConversationTitle(content);

    const userMessage: Message = {
      id: 'msg_' + Math.random().toString(36).substring(2, 9),
      role: 'user',
      content,
      timestamp: Date.now(),
      attachedFiles: files.length > 0 ? files : undefined,
    };

    const assistantPlaceholderId = 'msg_' + Math.random().toString(36).substring(2, 9);
    const assistantMessage: Message = {
      id: assistantPlaceholderId,
      role: 'assistant',
      content: '',
      timestamp: Date.now(),
      modelUsed: selectedModel,
      isStreaming: true,
    };

    let updatedConv: Conversation;
    if (isNew) {
      const newId = 'conv_' + Date.now().toString(36) + Math.random().toString(36).substring(2, 7);
      updatedConv = {
        id: newId,
        title,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        selectedModel,
        messages: [userMessage, assistantMessage],
        systemPrompt: settings.systemPrompt,
        options: settings.options,
      };
      activeConversationIdRef.current = newId;
      setActiveConversationId(newId);
      setConversations((prev) => {
        if (prev.some((c) => c.id === updatedConv.id)) {
          return prev.map((c) => (c.id === updatedConv.id ? updatedConv : c));
        }
        return [updatedConv, ...prev];
      });
      storageService.saveConversation(updatedConv);
    } else {
      updatedConv = {
        ...targetConv!,
        updatedAt: Date.now(),
        selectedModel,
        messages: [...targetConv!.messages, userMessage, assistantMessage],
      };
      setConversations((prev) =>
        prev.map((c) => (c.id === updatedConv.id ? updatedConv : c))
      );
      storageService.saveConversation(updatedConv);
    }

    // Index files into local RAG if enabled
    if (settings.ragConfig.enabled && files.length > 0) {
      const store = ragService.getStore(settings.ragConfig);
      for (const file of files) {
        if (file.extractedText) {
          await store.indexDocument(file.name, file.extractedText);
        }
      }
    }

    // Retrieve RAG context if enabled
    let ragContext = '';
    if (settings.ragConfig.enabled) {
      ragContext = await ragService.retrieveContext(content, settings.ragConfig);
    }

    // Prepare context messages including past memory
    const contextMessages = updatedConv.messages
      .slice(0, -1) // omit the empty streaming assistant placeholder
      .map((m) => {
        if (m.id === userMessage.id && ragContext) {
          return {
            ...m,
            content: `${ragContext}\n\n${m.content}`,
          };
        }
        return m;
      });

    // Stream response from Ollama
    try {
      await ollamaService.streamChatResponse(
        {
          model: selectedModel,
          messages: contextMessages,
          systemPrompt: settings.systemPrompt,
          options: settings.options,
          ollamaUrl: settings.ollamaUrl,
          mode: settings.connectionMode,
          useSimulatedFallback: settings.useSimulatedFallback,
        },
        {
          onChunk: (chunk) => {
            setConversations((prev) =>
              prev.map((c) => {
                if (c.id !== updatedConv.id) return c;
                return {
                  ...c,
                  messages: c.messages.map((m) => {
                    if (m.id !== assistantPlaceholderId) return m;
                    return {
                      ...m,
                      content: m.content + chunk,
                      isStreaming: true,
                    };
                  }),
                };
              })
            );
          },
          onThinkingChunk: (thinkingChunk) => {
            setConversations((prev) =>
              prev.map((c) => {
                if (c.id !== updatedConv.id) return c;
                return {
                  ...c,
                  messages: c.messages.map((m) => {
                    if (m.id !== assistantPlaceholderId) return m;
                    return {
                      ...m,
                      thinking: (m.thinking || '') + thinkingChunk,
                      isStreaming: true,
                    };
                  }),
                };
              })
            );
          },
          onError: (err) => {
            setIsGenerating(false);
            isSendingMessageRef.current = false;
            setConversations((prev) => {
              const nextList = prev.map((c) => {
                if (c.id !== updatedConv.id) return c;
                return {
                  ...c,
                  messages: c.messages.map((m) => {
                    if (m.id !== assistantPlaceholderId) return m;
                    return {
                      ...m,
                      isStreaming: false,
                      error: err.message,
                    };
                  }),
                };
              });
              const saved = nextList.find((c) => c.id === updatedConv.id);
              if (saved) storageService.saveConversation(saved);
              return nextList;
            });
          },
          onFinish: (fullText, stats, fullThinking) => {
            setIsGenerating(false);
            isSendingMessageRef.current = false;
            setConversations((prev) => {
              const nextList = prev.map((c) => {
                if (c.id !== updatedConv.id) return c;
                const finalMessages = c.messages.map((m) => {
                  if (m.id !== assistantPlaceholderId) return m;
                  const resolvedThinking = fullThinking || m.thinking;
                  const finalContent =
                    fullText ||
                    m.content ||
                    (resolvedThinking
                      ? ''
                      : `*(No response tokens returned by model. If running Gemma locally, check your Ollama VRAM/memory or try switching models.)*`);
                  return {
                    ...m,
                    content: finalContent,
                    thinking: resolvedThinking,
                    isStreaming: false,
                    evalCount: stats?.evalCount,
                    evalDuration: stats?.evalDuration,
                    tokensPerSecond: stats?.tokensPerSecond,
                  };
                });
                const saved = { ...c, messages: finalMessages, updatedAt: Date.now() };
                storageService.saveConversation(saved);
                return saved;
              });
              return nextList;
            });
          },
        }
      );
    } catch (unexpectedErr: any) {
      console.error('Unexpected error during chat stream:', unexpectedErr);
      setIsGenerating(false);
      isSendingMessageRef.current = false;
      setConversations((prev) => {
        const nextList = prev.map((c) => {
          if (c.id !== updatedConv.id) return c;
          return {
            ...c,
            messages: c.messages.map((m) => {
              if (m.id !== assistantPlaceholderId) return m;
              return {
                ...m,
                isStreaming: false,
                error: unexpectedErr.message || 'An unexpected error occurred while communicating with Ollama.',
              };
            }),
          };
        });
        const saved = nextList.find((c) => c.id === updatedConv.id);
        if (saved) storageService.saveConversation(saved);
        return nextList;
      });
    } finally {
      isSendingMessageRef.current = false;
    }
  };

  // Regenerate response
  const handleRegenerate = async (messageId: string) => {
    if (!activeConversation || isGenerating) return;

    const msgIndex = activeConversation.messages.findIndex((m) => m.id === messageId);
    if (msgIndex < 0) return;

    const targetMsg = activeConversation.messages[msgIndex];

    // If target is user message, cut messages after and re-run
    let truncated: Message[] = [];
    if (targetMsg.role === 'user') {
      truncated = activeConversation.messages.slice(0, msgIndex + 1);
    } else {
      // If target is assistant message, cut up to the preceding user message
      truncated = activeConversation.messages.slice(0, msgIndex);
    }

    const lastUserMsg = [...truncated].reverse().find((m: Message) => m.role === 'user');
    if (!lastUserMsg) return;

    const assistantId = 'msg_' + Math.random().toString(36).substring(2, 9);
    const newAssistantMsg: Message = {
      id: assistantId,
      role: 'assistant',
      content: '',
      timestamp: Date.now(),
      modelUsed: selectedModel,
      isStreaming: true,
    };

    const updatedConv: Conversation = {
      ...activeConversation,
      messages: [...truncated, newAssistantMsg],
      updatedAt: Date.now(),
    };

    setConversations((prev) =>
      prev.map((c) => (c.id === updatedConv.id ? updatedConv : c))
    );
    storageService.saveConversation(updatedConv);
    setIsGenerating(true);

    await ollamaService.streamChatResponse(
      {
        model: selectedModel,
        messages: truncated,
        systemPrompt: settings.systemPrompt,
        options: settings.options,
        ollamaUrl: settings.ollamaUrl,
        mode: settings.connectionMode,
        useSimulatedFallback: settings.useSimulatedFallback,
      },
      {
        onChunk: (chunk) => {
          setConversations((prev) =>
            prev.map((c) => {
              if (c.id !== updatedConv.id) return c;
              return {
                ...c,
                messages: c.messages.map((m) => {
                  if (m.id !== assistantId) return m;
                  return { ...m, content: m.content + chunk, isStreaming: true };
                }),
              };
            })
          );
        },
        onThinkingChunk: (thinkingChunk) => {
          setConversations((prev) =>
            prev.map((c) => {
              if (c.id !== updatedConv.id) return c;
              return {
                ...c,
                messages: c.messages.map((m) => {
                  if (m.id !== assistantId) return m;
                  return { ...m, thinking: (m.thinking || '') + thinkingChunk, isStreaming: true };
                }),
              };
            })
          );
        },
        onError: (err) => {
          setIsGenerating(false);
          setConversations((prev) =>
            prev.map((c) => {
              if (c.id !== updatedConv.id) return c;
              return {
                ...c,
                messages: c.messages.map((m) => {
                  if (m.id !== assistantId) return m;
                  return { ...m, isStreaming: false, error: err.message };
                }),
              };
            })
          );
        },
        onFinish: (fullText, stats, fullThinking) => {
          setIsGenerating(false);
          setConversations((prev) => {
            const nextList = prev.map((c) => {
              if (c.id !== updatedConv.id) return c;
              const finalMessages = c.messages.map((m) => {
                if (m.id !== assistantId) return m;
                const resolvedThinking = fullThinking || m.thinking;
                const finalContent =
                  fullText ||
                  m.content ||
                  (resolvedThinking
                    ? ''
                    : `*(No response tokens returned by model. If running Gemma locally, check your Ollama VRAM/memory or try switching models.)*`);
                return {
                  ...m,
                  content: finalContent,
                  thinking: resolvedThinking,
                  isStreaming: false,
                  evalCount: stats?.evalCount,
                  tokensPerSecond: stats?.tokensPerSecond,
                };
              });
              const saved = { ...c, messages: finalMessages, updatedAt: Date.now() };
              storageService.saveConversation(saved);
              return saved;
            });
            return nextList;
          });
        },
      }
    );
  };

  // Edit user message and re-generate answer
  const handleEditMessage = async (messageId: string, newContent: string) => {
    if (!activeConversation || isGenerating) return;
    const msgIndex = activeConversation.messages.findIndex((m) => m.id === messageId);
    if (msgIndex < 0) return;

    const editedUserMsg: Message = {
      ...activeConversation.messages[msgIndex],
      content: newContent,
      timestamp: Date.now(),
    };

    const truncated = [...activeConversation.messages.slice(0, msgIndex), editedUserMsg];

    const assistantId = 'msg_' + Math.random().toString(36).substring(2, 9);
    const newAssistantMsg: Message = {
      id: assistantId,
      role: 'assistant',
      content: '',
      timestamp: Date.now(),
      modelUsed: selectedModel,
      isStreaming: true,
    };

    const updatedConv: Conversation = {
      ...activeConversation,
      messages: [...truncated, newAssistantMsg],
      updatedAt: Date.now(),
    };

    setConversations((prev) =>
      prev.map((c) => (c.id === updatedConv.id ? updatedConv : c))
    );
    storageService.saveConversation(updatedConv);
    setIsGenerating(true);

    await ollamaService.streamChatResponse(
      {
        model: selectedModel,
        messages: truncated,
        systemPrompt: settings.systemPrompt,
        options: settings.options,
        ollamaUrl: settings.ollamaUrl,
        mode: settings.connectionMode,
        useSimulatedFallback: settings.useSimulatedFallback,
      },
      {
        onChunk: (chunk) => {
          setConversations((prev) =>
            prev.map((c) => {
              if (c.id !== updatedConv.id) return c;
              return {
                ...c,
                messages: c.messages.map((m) => {
                  if (m.id !== assistantId) return m;
                  return { ...m, content: m.content + chunk, isStreaming: true };
                }),
              };
            })
          );
        },
        onThinkingChunk: (thinkingChunk) => {
          setConversations((prev) =>
            prev.map((c) => {
              if (c.id !== updatedConv.id) return c;
              return {
                ...c,
                messages: c.messages.map((m) => {
                  if (m.id !== assistantId) return m;
                  return { ...m, thinking: (m.thinking || '') + thinkingChunk, isStreaming: true };
                }),
              };
            })
          );
        },
        onError: (err) => {
          setIsGenerating(false);
          setConversations((prev) =>
            prev.map((c) => {
              if (c.id !== updatedConv.id) return c;
              return {
                ...c,
                messages: c.messages.map((m) => {
                  if (m.id !== assistantId) return m;
                  return { ...m, isStreaming: false, error: err.message };
                }),
              };
            })
          );
        },
        onFinish: (fullText, stats, fullThinking) => {
          setIsGenerating(false);
          setConversations((prev) => {
            const nextList = prev.map((c) => {
              if (c.id !== updatedConv.id) return c;
              const finalMessages = c.messages.map((m) => {
                if (m.id !== assistantId) return m;
                const resolvedThinking = fullThinking || m.thinking;
                const finalContent =
                  fullText ||
                  m.content ||
                  (resolvedThinking
                    ? ''
                    : `*(No response tokens returned by model. If running Gemma locally, check your Ollama VRAM/memory or try switching models.)*`);
                return {
                  ...m,
                  content: finalContent,
                  thinking: resolvedThinking,
                  isStreaming: false,
                  evalCount: stats?.evalCount,
                  tokensPerSecond: stats?.tokensPerSecond,
                };
              });
              const saved = { ...c, messages: finalMessages, updatedAt: Date.now() };
              storageService.saveConversation(saved);
              return saved;
            });
            return nextList;
          });
        },
      }
    );
  };

  // Continue generating
  const handleContinueGenerating = (messageId: string) => {
    handleSendMessage('Please continue generating from where you left off.');
  };

  // Stop generation
  const handleStopGeneration = () => {
    ollamaService.stopGeneration();
    setIsGenerating(false);
    if (activeConversationId) {
      setConversations((prev) => {
        const nextList = prev.map((c) => {
          if (c.id !== activeConversationId) return c;
          return {
            ...c,
            messages: c.messages.map((m) => (m.isStreaming ? { ...m, isStreaming: false } : m)),
          };
        });
        const saved = nextList.find((c) => c.id === activeConversationId);
        if (saved) storageService.saveConversation(saved);
        return nextList;
      });
    }
  };

  // Toggle Theme
  const handleToggleTheme = () => {
    const nextTheme: 'dark' | 'light' = theme === 'dark' ? 'light' : 'dark';
    setTheme(nextTheme);
    const updatedSettings: AppSettings = { ...settings, theme: nextTheme };
    setSettings(updatedSettings);
    storageService.saveSettings(updatedSettings);
  };

  // Save Settings
  const handleSaveSettings = async (newSettings: AppSettings) => {
    setSettings(newSettings);
    await storageService.saveSettings(newSettings);
    checkConnectionAndModels(newSettings.ollamaUrl, newSettings.connectionMode);
  };

  // Test Connection helper for modal
  const handleTestConnection = async (url: string, mode: 'proxy' | 'direct') => {
    await checkConnectionAndModels(url, mode);
  };

  const isModelAvailable = models.some((m) => m.name === selectedModel);

  return (
    <div
      id="app-container"
      className={`flex h-screen w-screen overflow-hidden ${
        theme === 'dark' ? 'bg-neutral-900 text-neutral-100' : 'bg-neutral-50 text-neutral-900'
      }`}
    >
      {/* Left Sidebar */}
      <Sidebar
        conversations={filteredConversations}
        activeConversationId={activeConversationId}
        onSelectConversation={handleSelectConversation}
        onNewChat={handleNewChat}
        onDeleteConversation={handleDeleteConversation}
        onRenameConversation={handleRenameConversation}
        onClearAll={handleClearAll}
        models={models}
        selectedModel={selectedModel}
        onSelectModel={handleSelectModel}
        onOpenSettings={() => setIsSettingsOpen(true)}
        connectionStatus={connectionStatus}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        isOpenMobile={isMobileSidebarOpen}
        onCloseMobile={() => setIsMobileSidebarOpen(false)}
        theme={theme}
      />

      {/* Main Chat Interface */}
      <div className="flex-1 flex flex-col min-w-0 h-full relative">
        {/* Header */}
        <ChatHeader
          selectedModel={selectedModel}
          models={models}
          onSelectModel={handleSelectModel}
          connectionStatus={connectionStatus}
          onRefreshModels={() => checkConnectionAndModels()}
          onOpenSettings={() => setIsSettingsOpen(true)}
          onOpenCompare={() => setIsCompareOpen(true)}
          onToggleMobileSidebar={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)}
          theme={theme}
          onToggleTheme={handleToggleTheme}
        />

        {/* Connection Notice / Model Missing Banner */}
        <ConnectionBanner
          connectionStatus={connectionStatus}
          onRetry={() => checkConnectionAndModels()}
          onOpenSettings={() => setIsSettingsOpen(true)}
          onDismiss={() => setIsBannerDismissed(true)}
          isDismissed={isBannerDismissed}
          selectedModel={selectedModel}
          isModelAvailable={isModelAvailable}
          onRefreshModels={() => checkConnectionAndModels()}
          theme={theme}
        />

        {/* Message View (Welcome Screen if empty, or Bubble list) */}
        <MessageList
          messages={activeConversation?.messages || []}
          selectedModel={selectedModel}
          onRegenerate={handleRegenerate}
          onEdit={handleEditMessage}
          onContinueGenerating={handleContinueGenerating}
          onSelectPrompt={(prompt) => handleSendMessage(prompt)}
          theme={theme}
        />

        {/* Composer Input fixed at bottom */}
        <MessageInput
          onSendMessage={handleSendMessage}
          isGenerating={isGenerating}
          onStopGeneration={handleStopGeneration}
          selectedModel={selectedModel}
          theme={theme}
        />
      </div>

      {/* Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        settings={settings}
        onSaveSettings={handleSaveSettings}
        models={models}
        onRefreshModels={async () => {
          await checkConnectionAndModels();
        }}
        connectionStatus={connectionStatus}
        onTestConnection={handleTestConnection}
        theme={theme}
      />

      {/* Multiple Model Comparison Modal (Section 24) */}
      <ModelCompareModal
        isOpen={isCompareOpen}
        onClose={() => setIsCompareOpen(false)}
        models={models}
        settings={settings}
        theme={theme}
      />
    </div>
  );
}
