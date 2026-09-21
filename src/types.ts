export type MessageRole = 'user' | 'assistant' | 'system';

export interface AttachedFile {
  id: string;
  name: string;
  type: string;
  size: number;
  extractedText: string;
  base64Data?: string;
  isImage?: boolean;
  tokenEstimate?: number;
}

export interface Message {
  id: string;
  role: MessageRole;
  content: string;
  timestamp: number;
  modelUsed?: string;
  attachedFiles?: AttachedFile[];
  isStreaming?: boolean;
  error?: string;
  evalCount?: number;
  evalDuration?: number;
  tokensPerSecond?: number;
}

export interface OllamaOptions {
  temperature: number;
  top_p: number;
  top_k: number;
  num_ctx: number;
  num_predict: number;
  repeat_penalty: number;
}

export interface Conversation {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  selectedModel: string;
  messages: Message[];
  systemPrompt?: string;
  options?: Partial<OllamaOptions>;
}

export interface OllamaModelDetails {
  format?: string;
  family?: string;
  families?: string[];
  parameter_size?: string;
  quantization_level?: string;
}

export interface OllamaModel {
  name: string;
  model?: string;
  modified_at: string;
  size: number;
  digest: string;
  details?: OllamaModelDetails;
}

export interface RAGConfig {
  enabled: boolean;
  provider: 'in-memory' | 'chroma' | 'qdrant';
  serverUrl: string;
  topK: number;
  chunkSize: number;
}

export interface AppSettings {
  ollamaUrl: string;
  connectionMode: 'proxy' | 'direct';
  defaultModel: string;
  systemPrompt: string;
  options: OllamaOptions;
  theme: 'dark' | 'light';
  useSimulatedFallback: boolean;
  ragConfig: RAGConfig;
}

export interface OllamaConnectionStatus {
  connected: boolean;
  checking: boolean;
  version?: string;
  error?: string;
  modelsCount: number;
  latencyMs?: number;
  lastChecked?: number;
}

export interface StreamChatChunk {
  model: string;
  created_at: string;
  message?: {
    role: string;
    content: string;
  };
  done: boolean;
  total_duration?: number;
  load_duration?: number;
  prompt_eval_count?: number;
  prompt_eval_duration?: number;
  eval_count?: number;
  eval_duration?: number;
}
