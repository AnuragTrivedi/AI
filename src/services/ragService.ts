import { RAGConfig } from '../types';

export interface DocumentChunk {
  id: string;
  documentName: string;
  text: string;
  chunkIndex: number;
  embedding?: number[];
  score?: number;
}

export interface VectorStoreInterface {
  name: string;
  isAvailable(): Promise<boolean>;
  indexDocument(documentName: string, text: string): Promise<DocumentChunk[]>;
  search(query: string, topK: number): Promise<DocumentChunk[]>;
  clear(): Promise<void>;
}

/**
 * Lightweight in-memory vector store with TF-IDF / keyword similarity for local offline retrieval
 */
export class InMemoryVectorStore implements VectorStoreInterface {
  name = 'In-Memory Local Vector Store';
  private chunks: DocumentChunk[] = [];

  async isAvailable(): Promise<boolean> {
    return true;
  }

  async indexDocument(documentName: string, text: string): Promise<DocumentChunk[]> {
    const rawChunks = this.splitIntoChunks(text, 400, 50);
    const newChunks: DocumentChunk[] = rawChunks.map((chunkText, idx) => ({
      id: `${documentName}_chunk_${idx}_${Date.now()}`,
      documentName,
      text: chunkText,
      chunkIndex: idx,
    }));
    this.chunks.push(...newChunks);
    return newChunks;
  }

  async search(query: string, topK: number = 3): Promise<DocumentChunk[]> {
    if (this.chunks.length === 0) return [];
    const queryTokens = query.toLowerCase().split(/\W+/).filter(Boolean);

    const scored = this.chunks.map((chunk) => {
      const chunkTokens = chunk.text.toLowerCase().split(/\W+/).filter(Boolean);
      let matchCount = 0;
      for (const token of queryTokens) {
        if (chunkTokens.includes(token)) matchCount++;
      }
      const score = matchCount / Math.max(1, queryTokens.length);
      return { ...chunk, score };
    });

    return scored
      .filter((c) => (c.score || 0) > 0)
      .sort((a, b) => (b.score || 0) - (a.score || 0))
      .slice(0, topK);
  }

  async clear(): Promise<void> {
    this.chunks = [];
  }

  private splitIntoChunks(text: string, chunkSize: number = 400, overlap: number = 50): string[] {
    const words = text.split(/\s+/);
    const chunks: string[] = [];
    let i = 0;
    while (i < words.length) {
      const chunk = words.slice(i, i + chunkSize).join(' ');
      if (chunk.trim()) chunks.push(chunk);
      i += chunkSize - overlap;
      if (i <= 0) break;
    }
    return chunks.length > 0 ? chunks : [text];
  }
}

/**
 * ChromaDB Interface Adapter (Future-ready local Chroma instance on localhost:8000)
 */
export class ChromaDBStore implements VectorStoreInterface {
  name = 'ChromaDB Local';
  private serverUrl: string;

  constructor(serverUrl: string = 'http://localhost:8000') {
    this.serverUrl = serverUrl;
  }

  async isAvailable(): Promise<boolean> {
    try {
      const res = await fetch(`${this.serverUrl}/api/v1/heartbeat`, {
        signal: AbortSignal.timeout(2000),
      });
      return res.ok;
    } catch {
      return false;
    }
  }

  async indexDocument(documentName: string, text: string): Promise<DocumentChunk[]> {
    // Adapter calls Chroma collection API
    return [];
  }

  async search(query: string, topK: number): Promise<DocumentChunk[]> {
    return [];
  }

  async clear(): Promise<void> {}
}

/**
 * Qdrant Interface Adapter (Future-ready local Qdrant instance on localhost:6333)
 */
export class QdrantStore implements VectorStoreInterface {
  name = 'Qdrant Local';
  private serverUrl: string;

  constructor(serverUrl: string = 'http://localhost:6333') {
    this.serverUrl = serverUrl;
  }

  async isAvailable(): Promise<boolean> {
    try {
      const res = await fetch(`${this.serverUrl}/healthz`, {
        signal: AbortSignal.timeout(2000),
      });
      return res.ok;
    } catch {
      return false;
    }
  }

  async indexDocument(documentName: string, text: string): Promise<DocumentChunk[]> {
    return [];
  }

  async search(query: string, topK: number): Promise<DocumentChunk[]> {
    return [];
  }

  async clear(): Promise<void> {}
}

class LocalRAGService {
  private inMemoryStore = new InMemoryVectorStore();
  private chromaStore = new ChromaDBStore();
  private qdrantStore = new QdrantStore();

  getStore(config: RAGConfig): VectorStoreInterface {
    switch (config.provider) {
      case 'chroma':
        return this.chromaStore;
      case 'qdrant':
        return this.qdrantStore;
      default:
        return this.inMemoryStore;
    }
  }

  async retrieveContext(query: string, config: RAGConfig): Promise<string> {
    if (!config.enabled) return '';
    try {
      const store = this.getStore(config);
      const results = await store.search(query, config.topK || 3);
      if (results.length === 0) return '';

      return results
        .map(
          (r, idx) =>
            `[Local Document Context #${idx + 1} from "${r.documentName}"]:\n${r.text}`
        )
        .join('\n\n');
    } catch (e) {
      console.warn('RAG retrieval failed', e);
      return '';
    }
  }
}

export const ragService = new LocalRAGService();
