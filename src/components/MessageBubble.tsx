import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {
  Copy,
  Check,
  RotateCw,
  Edit3,
  Bot,
  User,
  FileText,
  Image as ImageIcon,
  Play,
  Clock,
  Zap,
  AlertTriangle,
  FileSpreadsheet,
} from 'lucide-react';
import { Message, AttachedFile } from '../types';

interface MessageBubbleProps {
  message: Message;
  selectedModel: string;
  onRegenerate: (messageId: string) => void;
  onEdit: (messageId: string, newContent: string) => void;
  onContinueGenerating?: (messageId: string) => void;
  theme: 'dark' | 'light';
}

export const MessageBubble: React.FC<MessageBubbleProps> = ({
  message,
  selectedModel,
  onRegenerate,
  onEdit,
  onContinueGenerating,
  theme,
}) => {
  const [copied, setCopied] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(message.content);

  const isUser = message.role === 'user';
  const isDark = theme === 'dark';

  const handleCopy = async (textToCopy: string) => {
    try {
      await navigator.clipboard.writeText(textToCopy);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy', err);
    }
  };

  const handleSaveEdit = () => {
    if (editContent.trim()) {
      onEdit(message.id, editContent.trim());
      setIsEditing(false);
    }
  };

  const renderFileAttachment = (file: AttachedFile) => {
    return (
      <div
        key={file.id}
        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs border max-w-xs ${
          isDark
            ? 'bg-neutral-800/90 border-neutral-700/80 text-neutral-200'
            : 'bg-white border-neutral-300 text-neutral-800'
        }`}
      >
        {file.isImage ? (
          <ImageIcon className="w-4 h-4 text-emerald-500 shrink-0" />
        ) : file.name.endsWith('.csv') || file.name.endsWith('.xlsx') ? (
          <FileSpreadsheet className="w-4 h-4 text-emerald-500 shrink-0" />
        ) : (
          <FileText className="w-4 h-4 text-blue-500 shrink-0" />
        )}
        <div className="flex flex-col min-w-0">
          <span className="truncate font-medium">{file.name}</span>
          <span className={`text-[10px] ${isDark ? 'text-neutral-400' : 'text-neutral-500'}`}>
            {Math.round(file.size / 1024)} KB · {file.tokenEstimate || 0} tokens
          </span>
        </div>
        {file.isImage && file.base64Data && (
          <img
            src={`data:${file.type || 'image/png'};base64,${file.base64Data}`}
            alt={file.name}
            referrerPolicy="no-referrer"
            className="w-8 h-8 rounded object-cover ml-auto shrink-0 border border-neutral-700"
          />
        )}
      </div>
    );
  };

  return (
    <div
      id={`message-${message.id}`}
      className={`group w-full py-4 sm:py-6 px-3 sm:px-6 transition-colors ${
        isUser
          ? isDark
            ? 'bg-neutral-900/50'
            : 'bg-neutral-50/50'
          : isDark
          ? 'bg-neutral-850/60 border-y border-neutral-800/40'
          : 'bg-white border-y border-neutral-100'
      }`}
    >
      <div className="max-w-3xl mx-auto flex gap-3 sm:gap-4">
        {/* Avatar */}
        <div className="shrink-0 mt-0.5">
          {isUser ? (
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-neutral-700 text-white flex items-center justify-center text-xs font-semibold shadow-xs">
              <User className="w-4 h-4" />
            </div>
          ) : (
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-emerald-600 text-white flex items-center justify-center text-xs font-semibold shadow-xs">
              <Bot className="w-4 h-4" />
            </div>
          )}
        </div>

        {/* Message Content & Actions Container */}
        <div className="flex-1 min-w-0 space-y-2">
          {/* Header row with Role & Model info */}
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <span className="font-semibold">{isUser ? 'You' : 'AI Assistant'}</span>
              {!isUser && (
                <span
                  className={`text-[11px] font-mono px-1.5 py-0.5 rounded ${
                    isDark ? 'bg-neutral-800 text-emerald-400' : 'bg-neutral-100 text-emerald-700'
                  }`}
                >
                  {message.modelUsed || selectedModel}
                </span>
              )}
            </div>

            {/* Performance Stats badge if available */}
            {!isUser && message.tokensPerSecond && (
              <div
                className={`flex items-center gap-2 text-[11px] font-mono ${
                  isDark ? 'text-neutral-400' : 'text-neutral-500'
                }`}
              >
                <span className="flex items-center gap-1">
                  <Zap className="w-3 h-3 text-amber-400" />
                  {message.tokensPerSecond} tok/s
                </span>
                {message.evalCount && (
                  <span>· {message.evalCount} tokens</span>
                )}
              </div>
            )}
          </div>

          {/* Attached Files display */}
          {message.attachedFiles && message.attachedFiles.length > 0 && (
            <div className="flex flex-wrap gap-2 pt-1 pb-1.5">
              {message.attachedFiles.map(renderFileAttachment)}
            </div>
          )}

          {/* Main Body */}
          {isEditing ? (
            <div className="space-y-2 pt-1">
              <textarea
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                rows={3}
                className={`w-full p-2.5 rounded-lg text-sm outline-none ring-1 transition-all ${
                  isDark
                    ? 'bg-neutral-800 text-neutral-100 ring-neutral-700 focus:ring-emerald-500'
                    : 'bg-white text-neutral-900 ring-neutral-300 focus:ring-emerald-600'
                }`}
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleSaveEdit}
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold transition-colors"
                >
                  Save & Regenerate
                </button>
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium ${
                    isDark ? 'bg-neutral-800 text-neutral-300' : 'bg-neutral-200 text-neutral-700'
                  }`}
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div
              className={`prose text-sm sm:text-base leading-relaxed break-words ${
                isDark ? 'text-neutral-200' : 'text-neutral-800'
              }`}
            >
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                  h1: ({ children }) => (
                    <h1 className="text-xl sm:text-2xl font-bold mt-4 mb-2 pb-1 border-b border-neutral-700/40">
                      {children}
                    </h1>
                  ),
                  h2: ({ children }) => (
                    <h2 className="text-lg sm:text-xl font-bold mt-3 mb-1.5">{children}</h2>
                  ),
                  h3: ({ children }) => (
                    <h3 className="text-base sm:text-lg font-semibold mt-2.5 mb-1">{children}</h3>
                  ),
                  p: ({ children }) => <p className="mb-2.5 last:mb-0">{children}</p>,
                  ul: ({ children }) => <ul className="list-disc pl-5 mb-2.5 space-y-1">{children}</ul>,
                  ol: ({ children }) => <ol className="list-decimal pl-5 mb-2.5 space-y-1">{children}</ol>,
                  li: ({ children }) => <li className="pl-1">{children}</li>,
                  blockquote: ({ children }) => (
                    <blockquote
                      className={`border-l-4 border-emerald-500 pl-3 py-1 my-2 italic ${
                        isDark ? 'text-neutral-300 bg-neutral-800/40' : 'text-neutral-700 bg-neutral-100'
                      }`}
                    >
                      {children}
                    </blockquote>
                  ),
                  table: ({ children }) => (
                    <div className="overflow-x-auto my-3 rounded-lg border border-neutral-700/60">
                      <table className="w-full text-xs sm:text-sm text-left border-collapse">
                        {children}
                      </table>
                    </div>
                  ),
                  th: ({ children }) => (
                    <th
                      className={`px-3 py-2 font-semibold border-b ${
                        isDark ? 'bg-neutral-800 border-neutral-700 text-neutral-200' : 'bg-neutral-100 border-neutral-300 text-neutral-800'
                      }`}
                    >
                      {children}
                    </th>
                  ),
                  td: ({ children }) => (
                    <td
                      className={`px-3 py-2 border-b ${
                        isDark ? 'border-neutral-800/70 text-neutral-300' : 'border-neutral-200 text-neutral-700'
                      }`}
                    >
                      {children}
                    </td>
                  ),
                  // Render Code Blocks with Language Header & Copy Button
                  code: ({ inline, className, children, ...props }: any) => {
                    const match = /language-(\w+)/.exec(className || '');
                    const codeString = String(children).replace(/\n$/, '');

                    if (!inline && (match || codeString.includes('\n'))) {
                      const language = match ? match[1] : 'code';
                      return (
                        <CodeBlock
                          code={codeString}
                          language={language}
                          isDark={isDark}
                        />
                      );
                    }

                    return (
                      <code
                        className={`px-1.5 py-0.5 rounded font-mono text-xs ${
                          isDark
                            ? 'bg-neutral-800 text-emerald-400 border border-neutral-700/60'
                            : 'bg-neutral-100 text-emerald-700 border border-neutral-200'
                        }`}
                        {...props}
                      >
                        {children}
                      </code>
                    );
                  },
                }}
              >
                {message.content}
              </ReactMarkdown>

              {/* Streaming Indicator */}
              {message.isStreaming && (
                <span className="inline-flex items-center gap-1.5 ml-1 text-emerald-500 font-semibold">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping inline-block" />
                  <span className="text-xs font-mono">Generating response...</span>
                </span>
              )}
            </div>
          )}

          {/* Error notification if message failed */}
          {message.error && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-rose-950/40 border border-rose-800/60 text-rose-300 text-xs">
              <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
              <div className="flex-1">{message.error}</div>
              <button
                type="button"
                onClick={() => onRegenerate(message.id)}
                className="px-2.5 py-1 bg-rose-600 hover:bg-rose-500 text-white rounded text-xs font-medium"
              >
                Retry
              </button>
            </div>
          )}

          {/* Bottom Action Buttons (Section 23: Copy, Edit, Regenerate, Continue) */}
          {!message.isStreaming && !isEditing && (
            <div
              className={`flex items-center gap-1 pt-1 opacity-80 group-hover:opacity-100 transition-opacity ${
                isDark ? 'text-neutral-400' : 'text-neutral-600'
              }`}
            >
              {/* Copy message or response */}
              <button
                type="button"
                onClick={() => handleCopy(message.content)}
                title={isUser ? 'Copy message' : 'Copy response'}
                className={`flex items-center gap-1 px-2 py-1 rounded text-xs transition-colors ${
                  isDark ? 'hover:bg-neutral-800 hover:text-white' : 'hover:bg-neutral-200 hover:text-neutral-900'
                }`}
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-emerald-400 text-[11px]">Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span className="text-[11px]">{isUser ? 'Copy' : 'Copy response'}</span>
                  </>
                )}
              </button>

              {/* User Edit option */}
              {isUser && (
                <button
                  type="button"
                  onClick={() => setIsEditing(true)}
                  title="Edit message"
                  className={`flex items-center gap-1 px-2 py-1 rounded text-xs transition-colors ${
                    isDark ? 'hover:bg-neutral-800 hover:text-white' : 'hover:bg-neutral-200 hover:text-neutral-900'
                  }`}
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span className="text-[11px]">Edit</span>
                </button>
              )}

              {/* Regenerate option */}
              <button
                type="button"
                onClick={() => onRegenerate(message.id)}
                title="Regenerate response"
                className={`flex items-center gap-1 px-2 py-1 rounded text-xs transition-colors ${
                  isDark ? 'hover:bg-neutral-800 hover:text-white' : 'hover:bg-neutral-200 hover:text-neutral-900'
                }`}
              >
                <RotateCw className="w-3.5 h-3.5" />
                <span className="text-[11px]">Regenerate</span>
              </button>

              {/* Assistant Continue Generating option */}
              {!isUser && onContinueGenerating && (
                <button
                  type="button"
                  onClick={() => onContinueGenerating(message.id)}
                  title="Continue generating answer"
                  className={`flex items-center gap-1 px-2 py-1 rounded text-xs transition-colors ${
                    isDark ? 'hover:bg-neutral-800 hover:text-white' : 'hover:bg-neutral-200 hover:text-neutral-900'
                  }`}
                >
                  <Play className="w-3 h-3" />
                  <span className="text-[11px]">Continue</span>
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// Subcomponent for Code Block with Language Tag and Copy Button
interface CodeBlockProps {
  code: string;
  language: string;
  isDark: boolean;
}

const CodeBlock: React.FC<CodeBlockProps> = ({ code, language, isDark }) => {
  const [copied, setCopied] = useState(false);

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="relative my-3 rounded-xl overflow-hidden border border-neutral-700/70 bg-neutral-950 shadow-md">
      {/* Code Header Bar */}
      <div className="flex items-center justify-between px-3.5 py-1.5 bg-neutral-900 border-b border-neutral-800 text-neutral-400 text-xs font-mono">
        <span className="text-[11px] font-semibold text-emerald-400 lowercase">{language}</span>
        <button
          type="button"
          onClick={handleCopyCode}
          className="flex items-center gap-1 px-2 py-0.5 rounded text-[11px] hover:bg-neutral-800 text-neutral-300 hover:text-white transition-colors"
        >
          {copied ? (
            <>
              <Check className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-emerald-400 font-medium">Copied!</span>
            </>
          ) : (
            <>
              <Copy className="w-3.5 h-3.5" />
              <span>Copy code</span>
            </>
          )}
        </button>
      </div>

      {/* Code Content */}
      <div className="p-3.5 overflow-x-auto text-xs sm:text-sm font-mono text-neutral-200 leading-relaxed scrollbar-thin">
        <pre className="m-0 whitespace-pre">
          <code>{code}</code>
        </pre>
      </div>
    </div>
  );
};
