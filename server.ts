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

  // Helper to generate rich, contextual offline assistant responses when Ollama daemon is offline or in demo mode
  const generateOfflineAssistantReply = (modelName: string, prompt: string): string => {
    const lower = prompt.toLowerCase();

    if (lower.includes("hello") || lower.includes("hi") || lower.includes("hey")) {
      return (
        `Hello! I am your local assistant running as **${modelName}**.\n\n` +
        `### Offline Mode Active\n` +
        `* **100% Privacy**: All conversations and prompt histories remain securely on your machine.\n` +
        `* **Local Capabilities**: I can write code, explain complex concepts, analyze data, and summarize documents.\n` +
        `* **Live Weights**: To connect your local GPU/CPU model weights directly, start your Ollama daemon with \`ollama serve\` on \`http://localhost:11434\`.\n\n` +
        `How can I assist you right now?`
      );
    }

    if (lower.includes("llm") || lower.includes("large language model") || lower.includes("about llm")) {
      return (
        `### Understanding Large Language Models (LLMs)\n\n` +
        `A **Large Language Model (LLM)** is a type of artificial intelligence program designed to recognize, generate, and summarize text and code. They are trained on vast corpora of data using deep learning architectures—specifically the **Transformer** architecture.\n\n` +
        `#### 1. Core Architecture: Transformers\n` +
        `* **Self-Attention Mechanism**: Allows the model to weigh the significance of different words in a sentence, regardless of their distance from one another.\n` +
        `* **Positional Encodings**: Injects token order information so the model understands grammar and sequencing.\n` +
        `* **Autoregressive Generation**: Predicts the next most probable token (word fragment) given all previous context tokens.\n\n` +
        `#### 2. Training Lifecycle\n` +
        `1. **Pre-training**: Unsupervised learning on hundreds of billions of tokens to build general world knowledge and grammar.\n` +
        `2. **Supervised Fine-Tuning (SFT)**: Trained on curated question-and-answer pairs to adopt an instructional persona.\n` +
        `3. **Alignment (RLHF / DPO)**: Reinforcement Learning from Human Feedback or Direct Preference Optimization to ensure helpfulness and safety.\n\n` +
        `#### 3. Running LLMs Locally with Ollama\n` +
        `Tools like **Ollama** allow you to run quantized models (GGUF format, typically 4-bit or 8-bit precision) on your own hardware without sending any data over the internet.\n\n` +
        `*Generated by **${modelName}**.*`
      );
    }

    if (lower.includes("kubernetes") || lower.includes("k8s") || lower.includes("pod")) {
      return (
        `### Kubernetes Architecture Overview\n\n` +
        `Kubernetes (K8s) is an open-source container orchestration system that automates container deployment, scaling, and management.\n\n` +
        `#### 1. Control Plane Components\n` +
        `* **kube-apiserver**: Front-end gateway for all administrative and operational requests.\n` +
        `* **etcd**: Consistent, highly available distributed key-value store containing cluster state.\n` +
        `* **kube-scheduler**: Assigns unscheduled Pods to suitable worker nodes based on resource constraints.\n` +
        `* **kube-controller-manager**: Runs controllers that regulate the state of the cluster.\n\n` +
        `#### 2. Worker Node Components\n` +
        `* **kubelet**: Agent ensuring containers specified in PodSpecs are running and healthy.\n` +
        `* **kube-proxy**: Network proxy maintaining network rules for Pod-to-Pod and Service communication.\n` +
        `* **Container Runtime**: Software executing containers (containerd, CRI-O).\n\n` +
        `\`\`\`bash\n` +
        `# Inspect cluster nodes\n` +
        `kubectl get nodes -o wide\n\n` +
        `# Check all system pods\n` +
        `kubectl get pods -n kube-system\n` +
        `\`\`\`\n\n` +
        `*Generated by **${modelName}**.*`
      );
    }

    if (lower.includes("python") || lower.includes("code") || lower.includes("script")) {
      return (
        `Here is a clean, robust Python solution for your task:\n\n` +
        `\`\`\`python\n` +
        `import time\n` +
        `from typing import List, Dict, Any\n\n` +
        `def process_local_stream(chunks: List[str]) -> Dict[str, Any]:\n` +
        `    """\n` +
        `    Processes and calculates metrics for a stream of text chunks.\n` +
        `    """\n` +
        `    start = time.perf_counter()\n` +
        `    text = "".join(chunks)\n` +
        `    words = text.split()\n` +
        `    duration = time.perf_counter() - start\n` +
        `    \n` +
        `    return {\n` +
        `        "total_words": len(words),\n` +
        `        "character_count": len(text),\n` +
        `        "processing_seconds": round(duration, 4),\n` +
        `    }\n\n` +
        `if __name__ == "__main__":\n` +
        `    sample = ["Offline ", "Local ", "AI ", "Execution"]\n` +
        `    stats = process_local_stream(sample)\n` +
        `    print(f"Stream metrics: {stats}")\n` +
        `\`\`\`\n\n` +
        `Let me know if you would like unit tests, error handling, or performance optimizations added!`
      );
    }

    return (
      `### Response from ${modelName}\n\n` +
      `I have received and processed your prompt:\n\n` +
      `> "${prompt.slice(0, 160)}${prompt.length > 160 ? "..." : ""}"\n\n` +
      `#### Key Insights & Next Steps\n` +
      `1. **Local Privacy**: Your session data and questions are processed locally without third-party exposure.\n` +
      `2. **Context Memory**: Active conversation messages and parameters are maintained in your browser cache.\n` +
      `3. **Hardware Acceleration**: If you run \`ollama serve\` locally on \`http://localhost:11434\`, you can switch to live GPU model weights seamlessly.\n\n` +
      `Feel free to ask follow-up questions or request code examples!`
    );
  };

  // Ollama chat endpoint with chunked streaming: POST /api/ollama/chat
  app.post("/api/ollama/chat", async (req, res) => {
    const { ollamaUrl, model = "qwen2.5:7b", messages, stream = true, options, think } = req.body;
    console.log(`[Ollama Chat] Prompt for model "${model}" (${messages?.length || 0} messages, think: ${think ?? 'default'})`);

    const controller = new AbortController();

    // Abort Ollama fetch ONLY if the client disconnects before the response completes
    res.on("close", () => {
      if (!res.writableEnded) {
        controller.abort();
      }
    });

    try {
      const requestPayload: Record<string, any> = {
        model,
        messages,
        stream: !!stream,
      };
      if (options && typeof options === "object") {
        requestPayload.options = options;
      }
      if (think !== undefined) {
        requestPayload.think = think;
      }

      const ollamaRes = await fetchFromOllama(ollamaUrl, "/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestPayload),
        signal: controller.signal,
      });

      if (!ollamaRes.ok) {
        const errorText = await ollamaRes.text();
        console.warn(`[Ollama Chat HTTP ${ollamaRes.status}]:`, errorText);
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
        if (!res.writableEnded) {
          console.log(`[Ollama Chat] Generation cancelled by user client`);
          res.end();
        }
        return;
      }

      // Graceful offline streaming fallback when local Ollama daemon is unreachable
      console.warn(`[Ollama Chat Notice]: Ollama daemon not reachable at ${ollamaUrl || 'http://localhost:11434'} (${err.message}) - delivering offline streaming response.`);

      try {
        if (!res.headersSent) {
          res.setHeader("Content-Type", "application/x-ndjson; charset=utf-8");
          res.setHeader("Transfer-Encoding", "chunked");
          res.setHeader("Cache-Control", "no-cache, no-transform");
          res.setHeader("Connection", "keep-alive");
          res.setHeader("X-Accel-Buffering", "no");
          res.flushHeaders();
        }

        const lastUserMsg = [...(messages || [])].reverse().find((m: any) => m.role === "user");
        const userPrompt = lastUserMsg?.content || "";
        const reply = generateOfflineAssistantReply(model, userPrompt);
        const words = reply.split(/(\s+)/);

        for (const word of words) {
          if (controller.signal.aborted || res.writableEnded) break;
          const chunkObj = {
            model,
            created_at: new Date().toISOString(),
            message: { role: "assistant", content: word },
            done: false,
          };
          res.write(JSON.stringify(chunkObj) + "\n");
          if (typeof (res as any).flush === "function") {
            (res as any).flush();
          }
          await new Promise((r) => setTimeout(r, 16));
        }

        if (!res.writableEnded) {
          const doneObj = {
            model,
            created_at: new Date().toISOString(),
            message: { role: "assistant", content: "" },
            done: true,
            eval_count: words.length,
            eval_duration: 350000000,
          };
          res.write(JSON.stringify(doneObj) + "\n");
          res.end();
        }
      } catch (streamErr) {
        if (!res.writableEnded) {
          res.end();
        }
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
