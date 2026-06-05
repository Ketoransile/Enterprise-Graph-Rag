"use client";

import React, { useRef, useEffect } from "react";
import { RiArrowUpLine, RiAttachmentLine } from "react-icons/ri";

interface ChatInputProps {
  value: string;
  onChange: (val: string) => void;
  onSubmit: () => void;
  loading: boolean;
}

export function ChatInput({ value, onChange, onSubmit, loading }: ChatInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
    }
  }, [value]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (value.trim() && !loading) {
        onSubmit();
      }
    }
  };

  return (
    <div className="relative flex items-end w-full rounded-[26px] bg-[#f4f4f4] dark:bg-[#2f2f2f] shadow-sm overflow-hidden focus-within:ring-2 focus-within:ring-neutral-300 dark:focus-within:ring-neutral-600 transition-all border border-transparent">
      
      {/* Attach Button */}
      <button className="absolute left-3 bottom-2.5 h-8 w-8 flex items-center justify-center rounded-full text-neutral-500 dark:text-neutral-400 hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors">
        <RiAttachmentLine className="h-5 w-5" />
      </button>

      <textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Message Enterprise Graph Rag..."
        className="w-full max-h-[200px] min-h-[52px] resize-none bg-transparent pl-12 pr-12 py-3.5 text-[15px] leading-relaxed text-black dark:text-white placeholder:text-neutral-500 focus:outline-none"
        rows={1}
      />
      
      <div className="absolute right-2.5 bottom-2.5">
        {loading ? (
          <button
            type="button"
            className="flex h-8 w-8 items-center justify-center rounded-full bg-black text-white dark:bg-white dark:text-black"
            disabled
          >
            <span className="h-2.5 w-2.5 rounded-sm bg-current animate-pulse"></span>
          </button>
        ) : (
          <button
            onClick={onSubmit}
            disabled={!value.trim()}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-black text-white hover:bg-neutral-800 dark:bg-white dark:text-black dark:hover:bg-neutral-200 transition-colors disabled:opacity-30 disabled:hover:bg-black dark:disabled:hover:bg-white"
          >
            <RiArrowUpLine className="h-5 w-5" />
          </button>
        )}
      </div>
    </div>
  );
}
