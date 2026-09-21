import React, { useRef, useEffect, useState } from 'react';
import {
  ArrowUp,
  Square,
  Paperclip,
  X,
  FileText,
  Image as ImageIcon,
  AlertCircle,
  Trash2,
  FileSpreadsheet,
} from 'lucide-react';
import { AttachedFile } from '../types';
import { fileService } from '../services/fileService';
import { ollamaService } from '../services/ollamaService';

interface MessageInputProps {
  onSendMessage: (content: string, files: AttachedFile[]) => void;
  isGenerating: boolean;
  onStopGeneration: () => void;
  selectedModel: string;
  theme: 'dark' | 'light';
}

export const MessageInput: React.FC<MessageInputProps> = ({
  onSendMessage,
  isGenerating,
  onStopGeneration,
  selectedModel,
  theme,
}) => {
  const [content, setContent] = useState('');
  const [attachedFiles, setAttachedFiles] = useState<AttachedFile[]>([]);
  const [visionWarning, setVisionWarning] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isDark = theme === 'dark';

  // Auto-resize textarea height
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      const scrollHeight = textareaRef.current.scrollHeight;
      const maxHeight = 180;
      textareaRef.current.style.height = `${Math.min(scrollHeight, maxHeight)}px`;
    }
  }, [content]);

  // Handle keyboard submit
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleSend = () => {
    if (isGenerating) return;
    if (!content.trim() && attachedFiles.length === 0) return;

    onSendMessage(content.trim(), attachedFiles);
    setContent('');
    setAttachedFiles([]);
    setVisionWarning(null);

    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  const handleClear = () => {
    setContent('');
    setAttachedFiles([]);
    setVisionWarning(null);
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  // Process files selected via file input or drag-and-drop
  const handleFiles = async (files: FileList | File[]) => {
    setVisionWarning(null);
    const newAttached: AttachedFile[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      try {
        const processed = await fileService.processFile(file);

        // Check if file is image and model lacks vision capability
        if (processed.isImage && !ollamaService.isVisionModel(selectedModel)) {
          setVisionWarning(
            `The selected model "${selectedModel}" does not support image understanding. Use a vision model like llava or llama3.2-vision to analyze images.`
          );
        }

        newAttached.push(processed);
      } catch (err) {
        console.error('File parsing error', err);
      }
    }

    setAttachedFiles((prev) => [...prev, ...newAttached]);
  };

  const removeFile = (id: string) => {
    setAttachedFiles((prev) => prev.filter((f) => f.id !== id));
  };

  // Drag and drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFiles(e.dataTransfer.files);
    }
  };

  const canSend = (content.trim().length > 0 || attachedFiles.length > 0) && !isGenerating;

  return (
    <div
      id="message-composer"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`w-full border-t transition-colors ${
        isDark ? 'bg-neutral-900 border-neutral-800' : 'bg-white border-neutral-200'
      } ${isDragging ? 'ring-2 ring-emerald-500 bg-emerald-950/20' : ''}`}
    >
      <div className="max-w-3xl mx-auto px-3 sm:px-6 py-3 space-y-2">
        {/* Vision capability warning notification (Section 16 requirement) */}
        {visionWarning && (
          <div className="flex items-center justify-between p-2 rounded-lg bg-amber-950/40 border border-amber-800/60 text-amber-300 text-xs">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-amber-400" />
              <span>{visionWarning}</span>
            </div>
            <button
              type="button"
              onClick={() => setVisionWarning(null)}
              className="p-0.5 text-amber-400 hover:text-amber-200"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Attached files previews */}
        {attachedFiles.length > 0 && (
          <div className="flex flex-wrap gap-2 pb-1">
            {attachedFiles.map((file) => (
              <div
                key={file.id}
                className={`flex items-center gap-2 pl-2.5 pr-1.5 py-1 rounded-lg text-xs border ${
                  isDark
                    ? 'bg-neutral-800 border-neutral-700 text-neutral-200'
                    : 'bg-neutral-100 border-neutral-300 text-neutral-800'
                }`}
              >
                {file.isImage ? (
                  <ImageIcon className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                ) : file.name.endsWith('.csv') ? (
                  <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                ) : (
                  <FileText className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                )}
                <span className="truncate max-w-[140px] font-medium">{file.name}</span>
                <span className={`text-[10px] ${isDark ? 'text-neutral-400' : 'text-neutral-500'}`}>
                  ({Math.round(file.size / 1024)} KB)
                </span>
                <button
                  type="button"
                  onClick={() => removeFile(file.id)}
                  className="p-1 rounded hover:bg-black/20 text-neutral-400 hover:text-rose-400"
                  title="Remove file"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Input box rounded container */}
        <div
          className={`relative flex flex-col rounded-2xl border transition-all shadow-xs ${
            isDark
              ? 'bg-neutral-800/80 border-neutral-700 focus-within:border-neutral-500 focus-within:bg-neutral-800'
              : 'bg-neutral-50 border-neutral-300 focus-within:border-neutral-400 focus-within:bg-white'
          }`}
        >
          {/* Textarea */}
          <textarea
            id="message-textarea"
            ref={textareaRef}
            rows={1}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={`Message ${selectedModel} (offline)...`}
            className={`w-full px-4 pt-3 pb-2 bg-transparent text-sm sm:text-base outline-none resize-none leading-relaxed placeholder-neutral-500 ${
              isDark ? 'text-neutral-100' : 'text-neutral-900'
            }`}
          />

          {/* Action toolbar inside bottom of composer */}
          <div className="flex items-center justify-between px-3 py-2 border-t border-transparent">
            {/* Left toolbar items: Attach File, Clear Input */}
            <div className="flex items-center gap-1">
              {/* Hidden file input supporting PDF, TXT, DOCX, CSV, XLSX, Images */}
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept=".pdf,.txt,.docx,.csv,.tsv,.json,.md,.py,.js,.ts,.html,.png,.jpg,.jpeg,.webp"
                onChange={(e) => {
                  if (e.target.files) handleFiles(e.target.files);
                  e.target.value = '';
                }}
                className="hidden"
              />

              {/* Attach File Button */}
              <button
                id="composer-attach-btn"
                type="button"
                onClick={() => fileInputRef.current?.click()}
                title="Attach local file (PDF, TXT, DOCX, CSV, Image)"
                className={`p-1.5 rounded-lg text-xs flex items-center gap-1.5 transition-colors ${
                  isDark
                    ? 'hover:bg-neutral-700 text-neutral-400 hover:text-neutral-200'
                    : 'hover:bg-neutral-200 text-neutral-600 hover:text-neutral-900'
                }`}
              >
                <Paperclip className="w-4 h-4" />
                <span className="text-xs hidden sm:inline">Attach file</span>
              </button>

              {/* Clear Input Button (Section 6) */}
              {(content || attachedFiles.length > 0) && (
                <button
                  type="button"
                  onClick={handleClear}
                  title="Clear input"
                  className={`p-1.5 rounded-lg text-xs flex items-center gap-1 transition-colors ${
                    isDark
                      ? 'hover:bg-neutral-700 text-neutral-400 hover:text-neutral-200'
                      : 'hover:bg-neutral-200 text-neutral-600 hover:text-neutral-900'
                  }`}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span className="text-xs hidden sm:inline">Clear</span>
                </button>
              )}
            </div>

            {/* Right toolbar items: Stop Generating OR Send Button */}
            <div className="flex items-center gap-2">
              <span
                className={`hidden md:inline text-[11px] font-mono ${
                  isDark ? 'text-neutral-400' : 'text-neutral-500'
                }`}
              >
                Enter ↵ to send
              </span>

              {isGenerating ? (
                /* Stop generating button (Section 7) */
                <button
                  id="composer-stop-btn"
                  type="button"
                  onClick={onStopGeneration}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold shadow-xs transition-all animate-pulse"
                  title="Stop generating"
                >
                  <Square className="w-3.5 h-3.5 fill-current" />
                  <span>Stop generating</span>
                </button>
              ) : (
                /* Send button (Section 6) */
                <button
                  id="composer-send-btn"
                  type="button"
                  onClick={handleSend}
                  disabled={!canSend}
                  title="Send message"
                  className={`p-2 rounded-xl text-white transition-all shadow-xs ${
                    canSend
                      ? 'bg-emerald-600 hover:bg-emerald-500 cursor-pointer scale-100'
                      : isDark
                      ? 'bg-neutral-700 text-neutral-500 cursor-not-allowed'
                      : 'bg-neutral-300 text-neutral-400 cursor-not-allowed'
                  }`}
                >
                  <ArrowUp className="w-4 h-4 stroke-[2.5]" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Footer info: Local Offline Privacy assurance */}
        <div className="flex items-center justify-between text-[11px] px-1 text-neutral-500">
          <span>Private & offline · Prompts never leave your computer</span>
          <span className="font-mono text-[10px]">Ollama Local AI</span>
        </div>
      </div>
    </div>
  );
};
