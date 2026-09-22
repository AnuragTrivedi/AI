import { Conversation, AppSettings } from '../types';

const DB_NAME = 'LocalAIChatDB';
const DB_VERSION = 1;
const STORE_CONVERSATIONS = 'conversations';
const STORE_SETTINGS = 'settings';

export const DEFAULT_SETTINGS: AppSettings = {
  ollamaUrl: 'http://localhost:11434',
  connectionMode: 'proxy',
  defaultModel: 'qwen2.5:7b',
  systemPrompt: 'You are a helpful AI assistant. Provide accurate, clear and concise answers.',
  options: {
    temperature: 0.7,
    top_p: 0.9,
    top_k: 40,
    num_ctx: 4096,
    num_predict: 2048,
    repeat_penalty: 1.1,
  },
  theme: 'dark',
  useSimulatedFallback: true,
  ragConfig: {
    enabled: false,
    provider: 'in-memory',
    serverUrl: 'http://localhost:8000',
    topK: 3,
    chunkSize: 500,
  },
};

class StorageService {
  private dbPromise: Promise<IDBDatabase> | null = null;
  private memoryCacheConversations: Conversation[] = [];
  private fallbackToLocalStorage: boolean = false;

  constructor() {
    this.initDB();
  }

  private initDB(): Promise<IDBDatabase> {
    if (this.dbPromise) return this.dbPromise;

    if (typeof window === 'undefined' || !window.indexedDB) {
      this.fallbackToLocalStorage = true;
      return Promise.reject(new Error('IndexedDB not supported'));
    }

    this.dbPromise = new Promise((resolve, reject) => {
      try {
        const request = window.indexedDB.open(DB_NAME, DB_VERSION);

        request.onupgradeneeded = (event) => {
          const db = (event.target as IDBOpenDBRequest).result;
          if (!db.objectStoreNames.contains(STORE_CONVERSATIONS)) {
            const convStore = db.createObjectStore(STORE_CONVERSATIONS, { keyPath: 'id' });
            convStore.createIndex('updatedAt', 'updatedAt', { unique: false });
          }
          if (!db.objectStoreNames.contains(STORE_SETTINGS)) {
            db.createObjectStore(STORE_SETTINGS, { keyPath: 'key' });
          }
        };

        request.onsuccess = () => {
          resolve(request.result);
        };

        request.onerror = () => {
          console.warn('IndexedDB failed to open, using LocalStorage fallback');
          this.fallbackToLocalStorage = true;
          reject(request.error);
        };
      } catch (e) {
        console.warn('IndexedDB exception, using LocalStorage fallback', e);
        this.fallbackToLocalStorage = true;
        reject(e);
      }
    });

    return this.dbPromise;
  }

  // Deduplicate conversations list and remove duplicate twins from storage
  deduplicateList(list: Conversation[]): { cleaned: Conversation[]; removedIds: string[] } {
    const seenIds = new Set<string>();
    const cleaned: Conversation[] = [];
    const removedIds: string[] = [];

    for (const conv of list) {
      if (!conv || !conv.id) continue;

      if (seenIds.has(conv.id)) {
        removedIds.push(conv.id);
        continue;
      }

      // Check if there is an existing conversation in cleaned that is an identical rapid twin:
      // (same title, created within 15 seconds of each other, identical first user message)
      const firstUserMsg = conv.messages.find((m) => m.role === 'user')?.content.trim();
      const twinIdx = cleaned.findIndex((other) => {
        if (other.title !== conv.title) return false;
        const timeDiff = Math.abs((other.createdAt || 0) - (conv.createdAt || 0));
        if (timeDiff > 15000) return false;
        const otherUserMsg = other.messages.find((m) => m.role === 'user')?.content.trim();
        return firstUserMsg && otherUserMsg && firstUserMsg === otherUserMsg;
      });

      if (twinIdx >= 0) {
        // Identified rapid duplicate twin
        const twin = cleaned[twinIdx];
        const convAssistantLength = conv.messages
          .filter((m) => m.role === 'assistant' && m.content)
          .reduce((acc, m) => acc + m.content.length, 0);
        const twinAssistantLength = twin.messages
          .filter((m) => m.role === 'assistant' && m.content)
          .reduce((acc, m) => acc + m.content.length, 0);

        if (convAssistantLength > twinAssistantLength) {
          // Replace twin with conv because conv has more response tokens
          removedIds.push(twin.id);
          seenIds.delete(twin.id);
          cleaned[twinIdx] = conv;
          seenIds.add(conv.id);
        } else {
          // Keep existing twin, mark conv for removal
          removedIds.push(conv.id);
        }
        continue;
      }

      seenIds.add(conv.id);
      cleaned.push(conv);
    }

    return { cleaned, removedIds };
  }

  // Retrieve all conversations sorted by updatedAt descending
  async getAllConversations(): Promise<Conversation[]> {
    try {
      const db = await this.initDB();
      return new Promise((resolve) => {
        const tx = db.transaction(STORE_CONVERSATIONS, 'readonly');
        const store = tx.objectStore(STORE_CONVERSATIONS);
        const req = store.getAll();

        req.onsuccess = () => {
          const rawResults: Conversation[] = req.result || [];
          rawResults.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
          const { cleaned, removedIds } = this.deduplicateList(rawResults);
          this.memoryCacheConversations = cleaned;

          // Asynchronously prune orphaned duplicates from storage
          if (removedIds.length > 0) {
            removedIds.forEach((id) => this.deleteConversation(id));
          }

          resolve(cleaned);
        };

        req.onerror = () => {
          const fallback = this.getConversationsFromLocalStorage();
          const { cleaned, removedIds } = this.deduplicateList(fallback);
          if (removedIds.length > 0) {
            this.saveConversationsToLocalStorage(cleaned);
          }
          resolve(cleaned);
        };
      });
    } catch {
      const fallback = this.getConversationsFromLocalStorage();
      const { cleaned, removedIds } = this.deduplicateList(fallback);
      if (removedIds.length > 0) {
        this.saveConversationsToLocalStorage(cleaned);
      }
      return cleaned;
    }
  }

  // Get a specific conversation by ID
  async getConversation(id: string): Promise<Conversation | null> {
    try {
      const db = await this.initDB();
      return new Promise((resolve) => {
        const tx = db.transaction(STORE_CONVERSATIONS, 'readonly');
        const store = tx.objectStore(STORE_CONVERSATIONS);
        const req = store.get(id);

        req.onsuccess = () => {
          resolve(req.result || null);
        };

        req.onerror = () => {
          const list = this.getConversationsFromLocalStorage();
          resolve(list.find((c) => c.id === id) || null);
        };
      });
    } catch {
      const list = this.getConversationsFromLocalStorage();
      return list.find((c) => c.id === id) || null;
    }
  }

  // Save or update a conversation
  async saveConversation(conv: Conversation): Promise<void> {
    // Update local cache
    const existingIdx = this.memoryCacheConversations.findIndex((c) => c.id === conv.id);
    if (existingIdx >= 0) {
      this.memoryCacheConversations[existingIdx] = conv;
    } else {
      this.memoryCacheConversations.unshift(conv);
    }
    this.memoryCacheConversations.sort((a, b) => b.updatedAt - a.updatedAt);

    // Save to LocalStorage as safety backup
    this.saveConversationsToLocalStorage(this.memoryCacheConversations);

    try {
      const db = await this.initDB();
      return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_CONVERSATIONS, 'readwrite');
        const store = tx.objectStore(STORE_CONVERSATIONS);
        const req = store.put(conv);

        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
      });
    } catch (e) {
      // already saved in localStorage backup
    }
  }

  // Delete a conversation
  async deleteConversation(id: string): Promise<void> {
    this.memoryCacheConversations = this.memoryCacheConversations.filter((c) => c.id !== id);
    this.saveConversationsToLocalStorage(this.memoryCacheConversations);

    try {
      const db = await this.initDB();
      return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_CONVERSATIONS, 'readwrite');
        const store = tx.objectStore(STORE_CONVERSATIONS);
        const req = store.delete(id);

        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
      });
    } catch {
      // Handled via local storage
    }
  }

  // Clear all conversations
  async clearAllConversations(): Promise<void> {
    this.memoryCacheConversations = [];
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem('local_ai_conversations');
    }

    try {
      const db = await this.initDB();
      return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_CONVERSATIONS, 'readwrite');
        const store = tx.objectStore(STORE_CONVERSATIONS);
        const req = store.clear();

        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
      });
    } catch {
      // LocalStorage already cleared
    }
  }

  // App settings management
  async getSettings(): Promise<AppSettings> {
    if (typeof window === 'undefined') return DEFAULT_SETTINGS;

    try {
      const saved = window.localStorage.getItem('local_ai_settings');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.defaultModel === 'ollama2.5:7b') {
          parsed.defaultModel = 'qwen2.5:7b';
        }
        return { ...DEFAULT_SETTINGS, ...parsed };
      }
    } catch (e) {
      console.error('Failed to parse settings from localStorage', e);
    }

    return DEFAULT_SETTINGS;
  }

  async saveSettings(settings: AppSettings): Promise<void> {
    if (typeof window === 'undefined') return;
    try {
      window.localStorage.setItem('local_ai_settings', JSON.stringify(settings));
    } catch (e) {
      console.error('Failed to save settings to localStorage', e);
    }
  }

  // Search conversations locally across title, user message, and assistant response
  async searchConversations(query: string): Promise<Conversation[]> {
    const list = await this.getAllConversations();
    const cleanQuery = query.trim().toLowerCase();
    if (!cleanQuery) return list;

    return list.filter((conv) => {
      if (conv.title.toLowerCase().includes(cleanQuery)) return true;
      return conv.messages.some((msg) =>
        msg.content.toLowerCase().includes(cleanQuery)
      );
    });
  }

  // Fallback storage helpers
  private getConversationsFromLocalStorage(): Conversation[] {
    if (typeof window === 'undefined') return [];
    try {
      const raw = window.localStorage.getItem('local_ai_conversations');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          this.memoryCacheConversations = parsed;
          return parsed;
        }
      }
    } catch (e) {
      console.error('Error reading localStorage', e);
    }
    return [];
  }

  private saveConversationsToLocalStorage(list: Conversation[]) {
    if (typeof window === 'undefined') return;
    try {
      window.localStorage.setItem('local_ai_conversations', JSON.stringify(list));
    } catch (e) {
      console.warn('LocalStorage quota or storage issue', e);
    }
  }
}

export const storageService = new StorageService();
