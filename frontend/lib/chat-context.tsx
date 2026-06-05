"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { Citation } from "@/components/chat/ChatMessage";

export type Message = {
  role: "user" | "assistant";
  content: string;
  citations?: Citation[];
};

export type ChatSession = {
  id: string;
  title: string;
  updatedAt: number;
  messages: Message[];
};

interface ChatContextType {
  sessions: ChatSession[];
  currentSessionId: string | null;
  setCurrentSessionId: (id: string | null) => void;
  createSession: (firstMessage: string) => ChatSession;
  updateSession: (id: string, messages: Message[]) => void;
  deleteSession: (id: string) => void;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

export function ChatProvider({ children }: { children: React.ReactNode }) {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem("chat-sessions");
    if (saved) {
      try {
        setSessions(JSON.parse(saved));
      } catch (e) {}
    }
  }, []);

  const saveSessions = (next: ChatSession[]) => {
    setSessions(next);
    localStorage.setItem("chat-sessions", JSON.stringify(next));
  };

  const createSession = (firstMessage: string) => {
    const newSession: ChatSession = {
      id: Date.now().toString(),
      title: firstMessage.length > 30 ? firstMessage.substring(0, 30) + "..." : firstMessage,
      updatedAt: Date.now(),
      messages: [],
    };
    saveSessions([newSession, ...sessions]);
    setCurrentSessionId(newSession.id);
    return newSession;
  };

  const updateSession = (id: string, messages: Message[]) => {
    setSessions((prev) => {
      const idx = prev.findIndex((s) => s.id === id);
      if (idx === -1) return prev;
      const next = [...prev];
      next[idx] = { ...next[idx], messages, updatedAt: Date.now() };
      // Move to top
      const [updated] = next.splice(idx, 1);
      next.unshift(updated);
      localStorage.setItem("chat-sessions", JSON.stringify(next));
      return next;
    });
  };

  const deleteSession = (id: string) => {
    setSessions((prev) => {
      const next = prev.filter((s) => s.id !== id);
      localStorage.setItem("chat-sessions", JSON.stringify(next));
      return next;
    });
    if (currentSessionId === id) setCurrentSessionId(null);
  };

  return (
    <ChatContext.Provider value={{ sessions, currentSessionId, setCurrentSessionId, createSession, updateSession, deleteSession }}>
      {children}
    </ChatContext.Provider>
  );
}

export function useChat() {
  const context = useContext(ChatContext);
  if (!context) throw new Error("useChat must be used within ChatProvider");
  return context;
}
