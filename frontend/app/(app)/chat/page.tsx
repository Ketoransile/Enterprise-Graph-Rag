"use client";

import React, { useState } from "react";
import { api, API_BASE } from "@/lib/api-client";
import { useAuth } from "@/lib/auth-context";

type SearchResult = {
  text?: string;
  chunk_text?: string;
  doc_id?: string;
  score?: number;
  page_number?: number | null;
  security_level?: string;
  [key: string]: any;
};

export default function ChatPage() {
  const { token } = useAuth();
  const [query, setQuery] = useState("");
  const [history, setHistory] = useState<
    Array<{ role: "user" | "assistant"; content: string; citations?: SearchResult[] }>
  >([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!token || !query.trim()) return;
    
    const userQuery = query;
    setQuery("");
    setLoading(true);
    setError(null);
    
    setHistory((prev) => [
      ...prev,
      { role: "user", content: userQuery },
      { role: "assistant", content: "", citations: [] },
    ]);

    try {
      const response = await fetch(`${API_BASE}/api/v1/chat/stream`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ query: userQuery, limit: 5 }),
      });

      if (!response.ok) {
        throw new Error("Failed to connect to chat stream");
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let done = false;

      while (reader && !done) {
        const { value, done: doneReading } = await reader.read();
        done = doneReading;
        if (value) {
          const chunkString = decoder.decode(value, { stream: true });
          const lines = chunkString.split("\n\n");
          for (const line of lines) {
            if (line.startsWith("data: ")) {
              const dataStr = line.replace("data: ", "");
              try {
                const data = JSON.parse(dataStr);
                if (data.type === "citations") {
                  setHistory((prev) => {
                    const newHistory = [...prev];
                    const lastIdx = newHistory.length - 1;
                    newHistory[lastIdx] = { ...newHistory[lastIdx], citations: data.data };
                    return newHistory;
                  });
                } else if (data.type === "chunk") {
                  setHistory((prev) => {
                    const newHistory = [...prev];
                    const lastIdx = newHistory.length - 1;
                    newHistory[lastIdx] = { ...newHistory[lastIdx], content: newHistory[lastIdx].content + data.text };
                    return newHistory;
                  });
                } else if (data.type === "error") {
                  setError(data.message);
                }
              } catch (e) {
                // ignore parse errors for incomplete chunks
              }
            }
          }
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Chat failed");
    } finally {
      setLoading(false);
    }
  }

  if (!token) {
    return (
      <div className="text-center py-12">
        <h2 className="text-xl font-semibold text-white">
          Authentication Required
        </h2>
        <p className="text-slate-400 mt-2">Please sign in to access chat.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-3xl font-semibold text-slate-50">Chat</h1>
        <p className="text-slate-400 mt-1">
          Ask questions over your organization&apos;s knowledge base.
        </p>
      </header>

      <form onSubmit={handleSearch} className="flex gap-3">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Ask something..."
          className="flex-1 rounded-md border border-slate-700 bg-slate-950 px-4 py-2.5 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button
          type="submit"
          disabled={loading}
          className="bg-white text-slate-950 px-5 py-2.5 rounded-md text-sm font-medium hover:bg-slate-200 transition disabled:opacity-50"
        >
          {loading ? "Searching..." : "Search"}
        </button>
      </form>

      {error && (
        <div className="rounded-md border border-red-800 bg-red-950/30 px-4 py-3 text-sm text-red-300">
          {error}
        </div>
      )}

      {history.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-sm font-medium text-slate-300">Conversation</h3>
          <div className="space-y-3">
            {history.map((msg, idx) => (
              <div
                key={idx}
                className={`rounded-lg border px-4 py-3 text-sm leading-relaxed ${
                  msg.role === "user"
                    ? "border-blue-900/60 bg-blue-950/30 text-slate-100"
                    : "border-slate-800 bg-slate-900/50 text-slate-200"
                }`}
              >
                <span className="text-xs uppercase tracking-[0.2em] text-slate-500 block mb-1">
                  {msg.role === "user" ? "You" : "Assistant"}
                </span>
                <p className="whitespace-pre-wrap">{msg.content}</p>
                
                {msg.citations && msg.citations.length > 0 && (
                  <div className="mt-4 space-y-3 border-t border-slate-700 pt-3">
                    <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Sources</h4>
                    {msg.citations.map((r, i) => (
                      <div key={i} className="rounded-lg border border-slate-700 bg-slate-900/80 p-3 space-y-2">
                        <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400">
                          <span className="text-slate-200 font-semibold">[{i + 1}]</span>
                          {r.score !== undefined && (
                            <span className="rounded-full bg-slate-800 px-2 py-0.5 text-[10px] font-semibold text-slate-200 border border-slate-700">
                              Score {r.score.toFixed ? r.score.toFixed(3) : r.score}
                            </span>
                          )}
                          {r.metadata?.security_level && (
                            <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-200 border border-emerald-500/30">
                              {r.metadata.security_level}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-300 leading-relaxed line-clamp-3">
                          {r.text || r.chunk_text}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
