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

  // Default Ollama host from env or fallback to standard localhost:11434
  const getOllamaBaseUrl = (customUrl?: string) => {
    const url = customUrl || process.env.OLLAMA_HOST || "http://localhost:11434";
    return url.replace(/\/+$/, "");
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
    const targetBase = getOllamaBaseUrl(req.query.ollamaUrl as string);
    try {
      const response = await fetch(`${targetBase}/api/version`, {
        signal: AbortSignal.timeout(3000),
      });
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      const data = await response.json();
      res.json({ success: true, version: data.version, host: targetBase });
    } catch (err: any) {
      res.status(503).json({
        success: false,
        error: "Ollama is not running or cannot be reached at " + targetBase,
        details: err.message,
      });
    }
  });

  // Ollama list installed models: GET /api/tags
  app.get("/api/ollama/tags", async (req, res) => {
    const targetBase = getOllamaBaseUrl(req.query.ollamaUrl as string);
    try {
      const response = await fetch(`${targetBase}/api/tags`, {
        signal: AbortSignal.timeout(4000),
      });
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      const data = await response.json();
      res.json(data);
    } catch (err: any) {
      res.status(503).json({
        models: [],
        error: "Failed to fetch models from Ollama at " + targetBase,
        details: err.message,
      });
    }
  });

  // Ollama model info: POST /api/show
  app.post("/api/ollama/show", async (req, res) => {
    const targetBase = getOllamaBaseUrl(req.body.ollamaUrl);
    try {
      const response = await fetch(`${targetBase}/api/show`, {
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
    const targetBase = getOllamaBaseUrl(ollamaUrl);

    try {
      const controller = new AbortController();
      req.on("close", () => {
        controller.abort();
      });

      const ollamaRes = await fetch(`${targetBase}/api/chat`, {
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
        res.status(ollamaRes.status).json({
          error: `Ollama error (${ollamaRes.status}): ${errorText}`,
        });
        return;
      }

      if (!stream) {
        const data = await ollamaRes.json();
        res.json(data);
        return;
      }

      // Set streaming headers for chunked transfer
      res.setHeader("Content-Type", "application/x-ndjson; charset=utf-8");
      res.setHeader("Transfer-Encoding", "chunked");
      res.setHeader("Cache-Control", "no-cache, no-transform");
      res.setHeader("Connection", "keep-alive");

      if (!ollamaRes.body) {
        res.status(500).end("No response body from Ollama");
        return;
      }

      const reader = ollamaRes.body.getReader();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        res.write(value);
      }
      res.end();
    } catch (err: any) {
      if (err.name === "AbortError") {
        res.end();
        return;
      }
      if (!res.headersSent) {
        res.status(503).json({
          error: `Could not connect to Ollama at ${targetBase}: ${err.message}`,
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
    console.log(`Local AI Chatbot server running on http://0.0.0.0:${PORT}`);
    console.log(`Connected Ollama target default: http://localhost:11434`);
  });
}

startServer();
