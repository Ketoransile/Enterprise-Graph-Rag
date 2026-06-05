"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  RiAddLine,
  RiChat3Line,
  RiCloseLine,
  RiDeleteBinLine,
  RiHistoryLine,
  RiSearchLine,
} from "react-icons/ri";
import { API_BASE } from "@/lib/api-client";
import { useAuth } from "@/lib/auth-context";
import { ChatSession, useChat } from "@/lib/chat-context";
import { ChatMessage } from "@/components/chat/ChatMessage";
import { ChatInput } from "@/components/chat/ChatInput";
import { toast } from "sonner";

const CHAT_ERROR_TITLE = "Chat response unavailable";
const CHAT_ERROR_MESSAGE = "I couldn't generate a response right now. Please try again in a moment.";

function showChatError(details?: unknown) {
  if (details) {
    console.error("Chat stream error:", details);
  }
  toast.error(CHAT_ERROR_TITLE, {
    description: CHAT_ERROR_MESSAGE,
  });
}

function formatSessionTime(timestamp: number) {
  const date = new Date(timestamp);
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const startOfDate = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
  const oneDay = 24 * 60 * 60 * 1000;

  if (startOfDate === startOfToday) {
    return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  }

  if (startOfDate === startOfToday - oneDay) {
    return "Yesterday";
  }

  return date.toLocaleDateString([], { month: "short", day: "numeric" });
}

function getSessionPreview(session: ChatSession) {
  const latestMessage = [...session.messages].reverse().find((message) => message.content.trim());
  return latestMessage?.content.trim() || "New conversation";
}

function groupSessions(sessions: ChatSession[]) {
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const oneDay = 24 * 60 * 60 * 1000;

  return [
    {
      label: "Today",
      sessions: sessions.filter((session) => session.updatedAt >= startOfToday),
    },
    {
      label: "Previous 7 days",
      sessions: sessions.filter(
        (session) => session.updatedAt < startOfToday && session.updatedAt >= startOfToday - 7 * oneDay,
      ),
    },
    {
      label: "Earlier",
      sessions: sessions.filter((session) => session.updatedAt < startOfToday - 7 * oneDay),
    },
  ].filter((group) => group.sessions.length > 0);
}

function ChatHistoryRail({
  sessions,
  currentSessionId,
  search,
  onSearchChange,
  onStartNewChat,
  onSelectSession,
  onDeleteSession,
}: {
  sessions: ChatSession[];
  currentSessionId: string | null;
  search: string;
  onSearchChange: (value: string) => void;
  onStartNewChat: () => void;
  onSelectSession: (id: string) => void;
  onDeleteSession: (id: string) => void;
}) {
  const normalizedSearch = search.trim().toLowerCase();
  const filteredSessions = useMemo(
    () =>
      sessions.filter((session) => {
        if (!normalizedSearch) return true;
        const preview = getSessionPreview(session);
        return `${session.title} ${preview}`.toLowerCase().includes(normalizedSearch);
      }),
    [normalizedSearch, sessions],
  );
  const groupedSessions = useMemo(() => groupSessions(filteredSessions), [filteredSessions]);

  return (
    <div className="flex h-full flex-col border-r border-neutral-200 bg-neutral-50/80 text-black dark:border-neutral-900 dark:bg-[#050505] dark:text-white">
      <div className="shrink-0 border-b border-neutral-200 p-3 dark:border-neutral-900">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onStartNewChat}
            className="inline-flex h-9 flex-1 items-center justify-center gap-2 rounded-lg bg-black px-3 text-sm font-semibold text-white transition hover:bg-neutral-800 dark:bg-white dark:text-black dark:hover:bg-neutral-200"
          >
            <RiAddLine className="h-4 w-4" />
            New chat
          </button>
        </div>

        <label className="mt-3 flex h-9 items-center gap-2 rounded-lg border border-neutral-200 bg-white px-3 text-neutral-500 transition focus-within:border-neutral-400 dark:border-neutral-800 dark:bg-neutral-950 dark:focus-within:border-neutral-600">
          <RiSearchLine className="h-4 w-4 shrink-0" />
          <input
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="Search chats"
            className="min-w-0 flex-1 bg-transparent text-sm text-neutral-900 outline-none placeholder:text-neutral-400 dark:text-neutral-100"
          />
        </label>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-2 py-3">
        {sessions.length === 0 ? (
          <div className="px-3 py-10 text-center">
            <div className="mx-auto grid h-9 w-9 place-items-center rounded-lg border border-neutral-200 bg-white text-neutral-500 dark:border-neutral-800 dark:bg-neutral-950 dark:text-neutral-400">
              <RiHistoryLine className="h-4 w-4" />
            </div>
            <p className="mt-3 text-sm font-medium text-neutral-800 dark:text-neutral-200">No chats yet</p>
            <p className="mt-1 text-xs leading-5 text-neutral-500">Start a conversation and it will appear here.</p>
          </div>
        ) : filteredSessions.length === 0 ? (
          <div className="px-3 py-10 text-center text-sm text-neutral-500">No matching chats.</div>
        ) : (
          <div className="space-y-5">
            {groupedSessions.map((group) => (
              <section key={group.label}>
                <h2 className="mb-1.5 px-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-neutral-500">
                  {group.label}
                </h2>
                <div className="space-y-1">
                  {group.sessions.map((session) => {
                    const active = currentSessionId === session.id;
                    const preview = getSessionPreview(session);

                    return (
                      <div
                        key={session.id}
                        className={`group relative rounded-lg border transition ${
                          active
                            ? "border-neutral-300 bg-white shadow-sm dark:border-neutral-700 dark:bg-neutral-900"
                            : "border-transparent hover:border-neutral-200 hover:bg-white dark:hover:border-neutral-800 dark:hover:bg-neutral-950"
                        }`}
                      >
                        <button
                          type="button"
                          onClick={() => onSelectSession(session.id)}
                          className="flex w-full min-w-0 items-start gap-2.5 rounded-lg px-2.5 py-2.5 text-left"
                        >
                          <span
                            className={`mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-md ${
                              active
                                ? "bg-black text-white dark:bg-white dark:text-black"
                                : "bg-neutral-100 text-neutral-500 dark:bg-neutral-900 dark:text-neutral-400"
                            }`}
                          >
                            <RiChat3Line className="h-4 w-4" />
                          </span>
                          <span className="min-w-0 flex-1 pr-7">
                            <span className="block truncate text-sm font-medium text-neutral-900 dark:text-neutral-100">
                              {session.title}
                            </span>
                            <span className="mt-0.5 block truncate text-xs text-neutral-500">{preview}</span>
                            <span className="mt-1 block text-[11px] text-neutral-400">
                              {formatSessionTime(session.updatedAt)} - {session.messages.length} messages
                            </span>
                          </span>
                        </button>
                        <button
                          type="button"
                          onClick={(event) => {
                            event.preventDefault();
                            event.stopPropagation();
                            onDeleteSession(session.id);
                          }}
                          className="absolute right-2 top-2 grid h-7 w-7 place-items-center rounded-md text-neutral-400 opacity-0 transition hover:bg-red-50 hover:text-red-600 group-hover:opacity-100 dark:hover:bg-red-950 dark:hover:text-red-300"
                          aria-label="Delete chat"
                        >
                          <RiDeleteBinLine className="h-4 w-4" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </section>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function ChatPage() {
  const { token } = useAuth();
  const { sessions, currentSessionId, setCurrentSessionId, createSession, updateSession, deleteSession } = useChat();
  const [query, setQuery] = useState("");
  const [historySearch, setHistorySearch] = useState("");
  const [mobileHistoryOpen, setMobileHistoryOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const currentSession = useMemo(
    () => sessions.find((s) => s.id === currentSessionId),
    [currentSessionId, sessions],
  );
  const history = useMemo(() => currentSession?.messages ?? [], [currentSession]);
  const conversationTitle = currentSession?.title || "New chat";
  const conversationSubtitle =
    currentSession && currentSession.messages.length > 0
      ? `${currentSession.messages.length} messages - Updated ${formatSessionTime(currentSession.updatedAt)}`
      : "Ready for a new question";

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [history, loading]);

  function handleStartNewChat() {
    setCurrentSessionId(null);
    setQuery("");
    setMobileHistoryOpen(false);
  }

  function handleSelectSession(id: string) {
    setCurrentSessionId(id);
    setMobileHistoryOpen(false);
  }

  function handleDeleteSession(id: string) {
    deleteSession(id);
  }

  async function handleSearch() {
    if (!token || !query.trim()) return;
    
    const userQuery = query;
    setQuery("");
    setLoading(true);
    
    // Create session if it doesn't exist
    let sessionId = currentSessionId;
    let currentHistory = [...history];

    if (!sessionId) {
      const newSession = createSession(userQuery);
      sessionId = newSession.id;
    }

    // Optimistically update history
    currentHistory.push({ role: "user", content: userQuery });
    currentHistory.push({ role: "assistant", content: "", citations: [] });
    updateSession(sessionId!, currentHistory);

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
        if (response.status === 401) {
          toast.error("Chat access denied", {
            description: "Your session is still saved. Refresh or sign in again if this continues.",
          });
          throw new Error("Chat request was not authorized");
        }

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
                const lastIdx = currentHistory.length - 1;

                if (data.type === "citations") {
                  currentHistory[lastIdx] = { ...currentHistory[lastIdx], citations: data.data };
                  updateSession(sessionId!, [...currentHistory]);
                } else if (data.type === "chunk") {
                  currentHistory[lastIdx] = { ...currentHistory[lastIdx], content: currentHistory[lastIdx].content + data.text };
                  updateSession(sessionId!, [...currentHistory]);
                } else if (data.type === "error") {
                  showChatError(data.message);
                  if (currentHistory[lastIdx]?.role === "assistant" && !currentHistory[lastIdx].content.trim()) {
                    currentHistory = currentHistory.slice(0, lastIdx);
                    updateSession(sessionId!, [...currentHistory]);
                  }
                  done = true;
                  break;
                }
              } catch (e) {
                // ignore parse errors for incomplete chunks
              }
            }
          }
        }
      }
    } catch (err) {
      showChatError(err);
      const lastIdx = currentHistory.length - 1;
      if (
        sessionId &&
        currentHistory[lastIdx]?.role === "assistant" &&
        !currentHistory[lastIdx].content.trim()
      ) {
        currentHistory = currentHistory.slice(0, lastIdx);
        updateSession(sessionId, [...currentHistory]);
      }
    } finally {
      setLoading(false);
    }
  }

  if (!token) {
    return (
      <div className="flex h-full items-center justify-center bg-white dark:bg-[#000000]">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-black dark:text-white">
            Authentication Required
          </h2>
          <p className="mt-2 text-sm text-neutral-500">Please sign in to access chat.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full w-full bg-white text-black dark:bg-[#000000] dark:text-white">
      <div className="hidden h-full w-[304px] shrink-0 lg:block">
        <ChatHistoryRail
          sessions={sessions}
          currentSessionId={currentSessionId}
          search={historySearch}
          onSearchChange={setHistorySearch}
          onStartNewChat={handleStartNewChat}
          onSelectSession={handleSelectSession}
          onDeleteSession={handleDeleteSession}
        />
      </div>

      {mobileHistoryOpen ? (
        <div className="fixed inset-0 z-40 lg:hidden">
          <button
            type="button"
            aria-label="Close chat history"
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setMobileHistoryOpen(false)}
          />
          <div className="absolute inset-y-0 left-0 w-[min(86vw,320px)] shadow-2xl shadow-black/20">
            <div className="absolute right-3 top-3 z-10">
              <button
                type="button"
                onClick={() => setMobileHistoryOpen(false)}
                className="grid h-8 w-8 place-items-center rounded-lg text-neutral-500 transition hover:bg-neutral-100 hover:text-neutral-900 dark:hover:bg-neutral-900 dark:hover:text-white"
                aria-label="Close chat history"
              >
                <RiCloseLine className="h-4 w-4" />
              </button>
            </div>
            <ChatHistoryRail
              sessions={sessions}
              currentSessionId={currentSessionId}
              search={historySearch}
              onSearchChange={setHistorySearch}
              onStartNewChat={handleStartNewChat}
              onSelectSession={handleSelectSession}
              onDeleteSession={handleDeleteSession}
            />
          </div>
        </div>
      ) : null}

      <section className="relative flex min-w-0 flex-1 flex-col">
        <header className="absolute left-0 right-0 top-0 z-20 border-b border-neutral-200 bg-white/88 px-4 py-3 backdrop-blur-xl dark:border-neutral-900 dark:bg-black/78 md:px-6">
          <div className="mx-auto flex max-w-[900px] items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-2.5">
              <button
                type="button"
                onClick={() => setMobileHistoryOpen(true)}
                className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-neutral-200 text-neutral-600 transition hover:bg-neutral-100 dark:border-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-900 lg:hidden"
                aria-label="Open chat history"
              >
                <RiHistoryLine className="h-4 w-4" />
              </button>
              <div className="min-w-0">
                <h1 className="truncate text-sm font-semibold text-neutral-950 dark:text-neutral-50">
                  {conversationTitle}
                </h1>
                <p className="truncate text-xs text-neutral-500">{conversationSubtitle}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleStartNewChat}
              className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-black text-white transition hover:bg-neutral-800 dark:bg-white dark:text-black dark:hover:bg-neutral-200"
              aria-label="New chat"
            >
              <RiAddLine className="h-5 w-5" />
            </button>
          </div>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto">
          {history.length === 0 ? (
            <div className="flex h-full w-full flex-col items-center justify-center px-6 pb-32 pt-24 animate-fade-in-up">
              <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-lg bg-black text-white shadow-sm dark:bg-white dark:text-black">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="stroke-current" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="3"/>
                  <circle cx="19" cy="5" r="2"/>
                  <circle cx="5" cy="19" r="2"/>
                  <line x1="14.5" y1="10" x2="17.5" y2="6.5"/>
                  <line x1="9.5" y1="14" x2="6.5" y2="17.5"/>
                </svg>
              </div>
              <h2 className="mb-2 text-center text-2xl font-semibold tracking-tight md:text-3xl">How can I help you today?</h2>
              <p className="mb-10 max-w-md text-center text-[15px] text-neutral-500">
                Query your enterprise knowledge graph securely.
              </p>
              <div className="grid w-full max-w-3xl grid-cols-1 gap-3 md:grid-cols-2">
                {[
                  "Summarize the latest compliance guidelines",
                  "How does the ingestion worker process PDFs?",
                  "List all documents marked CONFIDENTIAL",
                  "Explain the RBAC security levels",
                ].map((suggestion) => (
                  <button
                    key={suggestion}
                    type="button"
                    onClick={() => setQuery(suggestion)}
                    className="rounded-lg border border-neutral-200 bg-white p-4 text-left text-[14px] text-neutral-700 shadow-sm transition-colors hover:bg-neutral-50 dark:border-neutral-800 dark:bg-[#000000] dark:text-neutral-300 dark:hover:bg-[#111]"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="mx-auto flex w-full max-w-[900px] flex-col px-4 pb-40 pt-24 md:px-6">
              {history.map((msg, idx) => (
                <ChatMessage
                  key={idx}
                  role={msg.role}
                  content={msg.content}
                  citations={msg.citations}
                  isStreaming={loading && idx === history.length - 1 && msg.role === "assistant"}
                />
              ))}
              <div ref={messagesEndRef} className="h-1" />
            </div>
          )}
        </div>

        <div className="pointer-events-none absolute bottom-0 left-0 right-0 bg-gradient-to-t from-white via-white to-transparent px-4 pb-6 pt-10 dark:from-[#000000] dark:via-[#000000] dark:to-transparent md:px-6">
          <div className="pointer-events-auto relative mx-auto w-full max-w-[900px]">
            <ChatInput
              value={query}
              onChange={setQuery}
              onSubmit={handleSearch}
              loading={loading}
            />
            <p className="mt-3 hidden text-center text-xs text-neutral-400 sm:block">
              Enterprise Graph Rag can make mistakes. Consider verifying important information.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
