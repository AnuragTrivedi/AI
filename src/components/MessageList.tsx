import React, { useEffect, useRef } from 'react';
import {
  Sparkles,
  Code,
  FileText,
  FileSpreadsheet,
  Mail,
  Cpu,
  Terminal,
  ShieldCheck,
} from 'lucide-react';
import { Message, AttachedFile } from '../types';
import { MessageBubble } from './MessageBubble';

interface MessageListProps {
  messages: Message[];
  selectedModel: string;
  onRegenerate: (messageId: string) => void;
  onEdit: (messageId: string, newContent: string) => void;
  onContinueGenerating?: (messageId: string) => void;
  onSelectPrompt: (prompt: string) => void;
  theme: 'dark' | 'light';
}

export const MessageList: React.FC<MessageListProps> = ({
  messages,
  selectedModel,
  onRegenerate,
  onEdit,
  onContinueGenerating,
  onSelectPrompt,
  theme,
}) => {
  const bottomRef = useRef<HTMLDivElement>(null);
  const isDark = theme === 'dark';

  // Auto-scroll to bottom as messages stream or change
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, messages[messages.length - 1]?.content]);

  // Section 31: Welcome Screen when conversation has no messages
  if (messages.length === 0) {
    const exampleCards = [
      {
        icon: Cpu,
        title: 'Explain complex topics',
        prompt: 'Explain Kubernetes architecture, pod lifecycle, and control plane components clearly.',
      },
      {
        icon: Code,
        title: 'Write clean code',
        prompt: 'Write a Python script to process streaming text and calculate word metrics with typing.',
      },
      {
        icon: FileText,
        title: 'Summarize a document',
        prompt: 'How do I extract and summarize key takeaways from a technical design specification?',
      },
      {
        icon: FileSpreadsheet,
        title: 'Analyze CSV data',
        prompt: 'What are best practices for parsing and visualizing CSV sales data locally?',
      },
      {
        icon: Mail,
        title: 'Draft professional email',
        prompt: 'Draft a polite and concise status update email to project stakeholders regarding release progress.',
      },
      {
        icon: Terminal,
        title: 'Debugging assistance',
        prompt: 'Help me debug a high-CPU memory leak in a Node.js microservice architecture.',
      },
    ];

    return (
      <div className="flex-1 flex flex-col items-center justify-center p-4 sm:p-8 overflow-y-auto">
        <div className="max-w-2xl w-full text-center space-y-6">
          {/* Logo & Headline */}
          <div className="flex flex-col items-center space-y-3">
            <div className="w-14 h-14 rounded-2xl bg-emerald-600/20 text-emerald-500 border border-emerald-500/30 flex items-center justify-center shadow-lg">
              <Sparkles className="w-7 h-7" />
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">
              Welcome to Local AI
            </h2>
            <p
              className={`text-sm sm:text-base max-w-md ${
                isDark ? 'text-neutral-400' : 'text-neutral-600'
              }`}
            >
              Your private AI assistant powered by Ollama.
            </p>

            {/* Active Model pill */}
            <div
              className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-mono font-medium border ${
                isDark
                  ? 'bg-neutral-800/80 border-neutral-700 text-emerald-400'
                  : 'bg-neutral-100 border-neutral-300 text-emerald-700'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>Active Model: {selectedModel}</span>
            </div>
          </div>

          {/* 6 Example Prompt Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 text-left">
            {exampleCards.map((card, idx) => {
              const Icon = card.icon;
              return (
                <button
                  key={idx}
                  id={`welcome-prompt-${idx}`}
                  type="button"
                  onClick={() => onSelectPrompt(card.prompt)}
                  className={`flex items-start gap-3 p-3.5 rounded-xl border text-left transition-all hover:scale-[1.01] ${
                    isDark
                      ? 'bg-neutral-850/60 border-neutral-800 hover:border-neutral-700 hover:bg-neutral-800 text-neutral-200'
                      : 'bg-white border-neutral-200 hover:border-neutral-300 hover:bg-neutral-50 text-neutral-800 shadow-xs'
                  }`}
                >
                  <div
                    className={`p-2 rounded-lg shrink-0 mt-0.5 ${
                      isDark ? 'bg-neutral-800 text-emerald-400' : 'bg-neutral-100 text-emerald-600'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="text-xs font-semibold">{card.title}</span>
                    <span
                      className={`text-xs mt-0.5 line-clamp-2 ${
                        isDark ? 'text-neutral-400' : 'text-neutral-500'
                      }`}
                    >
                      {card.prompt}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>

          <div
            className={`flex items-center justify-center gap-2 text-xs pt-4 ${
              isDark ? 'text-neutral-400' : 'text-neutral-500'
            }`}
          >
            <ShieldCheck className="w-4 h-4 text-emerald-500" />
            <span>100% offline & local · No cloud API keys needed</span>
          </div>
        </div>
      </div>
    );
  }

  // Conversation with messages
  return (
    <div className="flex-1 overflow-y-auto scrollbar-thin flex flex-col">
      <div className="flex-1 pb-4">
        {messages.map((message) => (
          <MessageBubble
            key={message.id}
            message={message}
            selectedModel={selectedModel}
            onRegenerate={onRegenerate}
            onEdit={onEdit}
            onContinueGenerating={onContinueGenerating}
            theme={theme}
          />
        ))}
        <div ref={bottomRef} />
      </div>
    </div>
  );
};
