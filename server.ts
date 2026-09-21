import express from "express";
import path from "path";
import http from "http";
import { createServer as createViteServer } from "vite";

async function startServer() {
  const app = express();
  const PORT = 3000;

  // JSON and raw body parsing
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ extended: true, limit: "50mb" }));

  // CORS headers for local versatility
  app.use((req, res, next) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS, PUT, DELETE");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
    if (req.method === "OPTIONS") {
      res.sendStatus(204);
      return;
    }
    next();
  });

  // Default Ollama host from env or fallback to standard 127.0.0.1:11434
  const getOllamaBaseUrls = (customUrl?: string): string[] => {
    const raw = customUrl || process.env.OLLAMA_HOST || "http://127.0.0.1:11434";
    const cleaned = raw.replace(/\/+$/, "");
    const list: string[] = [];

    // Prioritize 127.0.0.1 to avoid Node.js undici IPv6 (::1) ECONNREFUSED issues on local machines
    if (cleaned.includes("://localhost")) {
      list.push(cleaned.replace("://localhost", "://127.0.0.1"));
      list.push(cleaned);
    } else if (cleaned.includes("://127.0.0.1")) {
      list.push(cleaned);
      list.push(cleaned.replace("://127.0.0.1", "://localhost"));
    } else {
      list.push(cleaned);
    }
    return list;
  };

  // Helper to fetch Ollama with automatic loopback fallback (127.0.0.1 <-> localhost)
  const fetchFromOllama = async (
    customUrl: string | undefined,
    endpoint: string,
    options?: RequestInit
  ): Promise<Response> => {
    const candidateUrls = getOllamaBaseUrls(customUrl);
    let lastError: any = null;

    for (const baseUrl of candidateUrls) {
      const fullUrl = `${baseUrl}${endpoint}`;
      try {
        const res = await fetch(fullUrl, options);
        return res;
      } catch (err: any) {
        lastError = err;
        // If aborted by client, break immediately
        if (err.name === "AbortError") throw err;
      }
    }
    throw lastError || new Error(`Could not connect to Ollama at ${candidateUrls[0]}`);
  };

  // Health check endpoint
  app.get("/api/health", (_req, res) => {
    res.json({
      status: "ok",
      mode: "OFFLINE_AI_OLLAMA",
      timestamp: new Date().toISOString(),
    });
  });

  // Ollama connection & version check
  app.get("/api/ollama/version", async (req, res) => {
    try {
      const response = await fetchFromOllama(req.query.ollamaUrl as string, "/api/version", {
        signal: AbortSignal.timeout(3500),
      });
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      const data = await response.json();
      res.json({ success: true, version: data.version, host: req.query.ollamaUrl || "http://127.0.0.1:11434" });
    } catch (err: any) {
      res.status(503).json({
        success: false,
        error: "Ollama is not running or cannot be reached at " + (req.query.ollamaUrl || "http://localhost:11434"),
        details: err.message,
      });
    }
  });

  // Ollama list installed models: GET /api/tags
  app.get("/api/ollama/tags", async (req, res) => {
    try {
      const response = await fetchFromOllama(req.query.ollamaUrl as string, "/api/tags", {
        signal: AbortSignal.timeout(4500),
      });
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      const data = await response.json();
      res.json(data);
    } catch (err: any) {
      res.status(503).json({
        models: [],
        error: "Failed to fetch models from Ollama. Make sure 'ollama serve' is running.",
        details: err.message,
      });
    }
  });

  // Ollama model info: POST /api/show
  app.post("/api/ollama/show", async (req, res) => {
    try {
      const response = await fetchFromOllama(req.body.ollamaUrl, "/api/show", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: req.body.name }),
        signal: AbortSignal.timeout(5000),
      });
      const data = await response.json();
      res.json(data);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Ollama chat endpoint with chunked streaming: POST /api/ollama/chat
  app.post("/api/ollama/chat", async (req, res) => {
    const { ollamaUrl, model, messages, stream = true, options } = req.body;
    console.log(`[Ollama Chat] Prompt for model "${model}" (${messages?.length || 0} messages)`);

    try {
      const controller = new AbortController();
      req.on("close", () => {
        controller.abort();
      });

      const ollamaRes = await fetchFromOllama(ollamaUrl, "/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model,
          messages,
          stream: !!stream,
          options,
        }),
        signal: controller.signal,
      });

      if (!ollamaRes.ok) {
        const errorText = await ollamaRes.text();
        console.error(`[Ollama Chat HTTP ${ollamaRes.status}]:`, errorText);
        let parsedMessage = errorText;
        try {
          const jsonErr = JSON.parse(errorText);
          parsedMessage = jsonErr.error || errorText;
        } catch {}

        if (ollamaRes.status === 404) {
          parsedMessage = `Model "${model}" not found in your local Ollama. Please run "ollama pull ${model}" in your terminal or switch models from the top menu.`;
        }

        res.status(ollamaRes.status).json({
          error: parsedMessage,
        });
        return;
      }

      if (!stream) {
        const data = await ollamaRes.json();
        res.json(data);
        return;
      }

      // Set streaming headers for real-time chunked transfer
      res.setHeader("Content-Type", "application/x-ndjson; charset=utf-8");
      res.setHeader("Transfer-Encoding", "chunked");
      res.setHeader("Cache-Control", "no-cache, no-transform");
      res.setHeader("Connection", "keep-alive");
      res.setHeader("X-Accel-Buffering", "no");
      res.flushHeaders();

      if (!ollamaRes.body) {
        res.status(500).end("No response body from Ollama");
        return;
      }

      const reader = ollamaRes.body.getReader();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        res.write(value);
        if (typeof (res as any).flush === "function") {
          (res as any).flush();
        }
      }
      res.end();
    } catch (err: any) {
      if (err.name === "AbortError") {
        console.log(`[Ollama Chat] Generation cancelled by user`);
        res.end();
        return;
      }
      console.error(`[Ollama Chat Connection Error]:`, err.message);
      if (!res.headersSent) {
        res.status(503).json({
          error: `Could not connect to Ollama (${err.message}). Please ensure Ollama is running with "ollama serve".`,
        });
      } else {
        res.end();
      }
    }
  });

  // Local RAG Architecture stub endpoint (Section 17: Local RAG Architecture)
  app.get("/api/rag/status", (req, res) => {
    res.json({
      configured: true,
      engine: "Local Document Parser & In-Memory / Vector Storage",
      supportedStores: ["ChromaDB", "Qdrant", "In-Memory Local Vector"],
      activeStore: "In-Memory Local Vector",
      indexedDocumentsCount: 0,
    });
  });

  // Vite middleware for development vs Static serving in production
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`\n  🚀 Local AI Chatbot server is running!`);
    console.log(`  ➜ Local:   http://localhost:${PORT}/`);
    console.log(`  ➜ Loopback: http://127.0.0.1:${PORT}/`);
    console.log(`  ➜ Ollama target default: http://localhost:11434\n`);
  });
}

startServer();
