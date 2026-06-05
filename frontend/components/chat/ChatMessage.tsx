"use client";

import React, { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { vscDarkPlus } from "react-syntax-highlighter/dist/esm/styles/prism";
import { RiFileCopyLine, RiCheckLine } from "react-icons/ri";
import { TypingIndicator } from "./TypingIndicator";

export type Citation = {
  text?: string;
  chunk_text?: string;
  doc_id?: string;
  score?: number;
  security_level?: string;
  metadata?: any;
  [key: string]: any;
};

interface ChatMessageProps {
  role: "user" | "assistant";
  content: string;
  citations?: Citation[];
  isStreaming?: boolean;
}

export function ChatMessage({ role, content, citations, isStreaming }: ChatMessageProps) {
  const isUser = role === "user";
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const handleCopyCode = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCode(text);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  return (
    <div className={`flex w-full ${isUser ? "justify-end" : "justify-start"} mb-8`}>
      <div className={`flex gap-4 max-w-[85%] ${isUser ? "flex-row-reverse" : "flex-row"}`}>
        
        {/* Avatar - Only for Assistant */}
        {!isUser && (
          <div className="flex-shrink-0 mt-0.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-black dark:bg-white text-white dark:text-black shadow-sm">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" className="stroke-current" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="3"/>
                <circle cx="19" cy="5" r="2"/>
                <circle cx="5" cy="19" r="2"/>
                <line x1="14.5" y1="10" x2="17.5" y2="6.5"/>
                <line x1="9.5" y1="14" x2="6.5" y2="17.5"/>
              </svg>
            </div>
          </div>
        )}

        {/* Message Content */}
        <div className={`flex flex-col min-w-0 w-full ${isUser ? "items-end" : "items-start"}`}>
          <div
            className={`${
              isUser
                ? "px-5 py-3.5 rounded-[24px] rounded-br-[8px] bg-[#f4f4f4] dark:bg-[#2f2f2f] text-black dark:text-white text-[15px] leading-relaxed shadow-sm inline-block max-w-full"
                : "bg-transparent text-black dark:text-white w-full text-[15px] leading-relaxed pt-1"
            }`}
          >
            {content === "" && isStreaming ? (
              <TypingIndicator />
            ) : (
              <div className={`prose dark:prose-invert max-w-none break-words ${isUser ? "prose-p:m-0" : ""}`}>
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  components={{
                    code({ node, inline, className, children, ...props }: any) {
                      const match = /language-(\w+)/.exec(className || "");
                      const codeString = String(children).replace(/\n$/, "");
                      const isCopied = copiedCode === codeString;

                      if (!inline && match) {
                        return (
                          <div className="relative group my-4 rounded-[12px] overflow-hidden bg-[#1E1E1E] border border-neutral-800 shadow-sm">
                            <div className="flex items-center justify-between px-4 py-2 bg-[#2D2D2D] text-xs font-medium text-neutral-400">
                              <span className="uppercase">{match[1]}</span>
                              <button
                                onClick={() => handleCopyCode(codeString)}
                                className="flex items-center gap-1.5 hover:text-white transition-colors"
                              >
                                {isCopied ? <RiCheckLine /> : <RiFileCopyLine />}
                                {isCopied ? "Copied!" : "Copy"}
                              </button>
                            </div>
                            <SyntaxHighlighter
                              style={vscDarkPlus as any}
                              language={match[1]}
                              PreTag="div"
                              customStyle={{ margin: 0, padding: '1rem', background: 'transparent', fontSize: '13px' }}
                              {...props}
                            >
                              {codeString}
                            </SyntaxHighlighter>
                          </div>
                        );
                      }
                      return (
                        <code className="bg-neutral-100 dark:bg-neutral-800 px-1.5 py-0.5 rounded-md text-[13px] font-mono text-pink-600 dark:text-pink-400" {...props}>
                          {children}
                        </code>
                      );
                    },
                    table({ children, ...props }) {
                      return (
                        <div className="overflow-x-auto my-4 border border-neutral-200 dark:border-neutral-800 rounded-[12px] shadow-sm">
                          <table className="w-full text-sm text-left" {...props}>
                            {children}
                          </table>
                        </div>
                      );
                    },
                    th({ children, ...props }) {
                      return <th className="bg-neutral-50 dark:bg-[#111] px-4 py-3 font-semibold border-b border-neutral-200 dark:border-neutral-800" {...props}>{children}</th>;
                    },
                    td({ children, ...props }) {
                      return <td className="px-4 py-3 border-b last:border-b-0 border-neutral-100 dark:border-neutral-800/50" {...props}>{children}</td>;
                    },
                    a({ children, ...props }) {
                      return <a className="text-blue-600 dark:text-blue-400 hover:underline underline-offset-2" {...props}>{children}</a>;
                    }
                  }}
                >
                  {content}
                </ReactMarkdown>
              </div>
            )}
          </div>

          {/* Citations Grid */}
          {!isUser && citations && citations.length > 0 && (
            <div className="mt-4 w-full">
              <p className="text-xs font-semibold text-neutral-400 dark:text-neutral-500 uppercase tracking-widest mb-3">
                Sources
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {citations.map((cite, i) => (
                  <div key={i} className="flex flex-col gap-2 p-3.5 rounded-[16px] border border-neutral-200 bg-white dark:border-neutral-800/60 dark:bg-[#111] hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors cursor-pointer group shadow-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-black dark:text-white bg-neutral-100 dark:bg-neutral-800 px-2.5 py-1 rounded-md">
                        {i + 1}
                      </span>
                      <div className="flex items-center gap-1.5">
                        {cite.score !== undefined && (
                          <span className="text-[10px] text-neutral-400 font-medium">
                            {cite.score.toFixed(3)}
                          </span>
                        )}
                        {cite.metadata?.security_level && (
                          <span className="text-[10px] bg-neutral-100 dark:bg-neutral-800 text-neutral-500 px-2 py-0.5 rounded-md font-medium">
                            {cite.metadata.security_level}
                          </span>
                        )}
                      </div>
                    </div>
                    <p className="text-[13px] text-neutral-600 dark:text-neutral-300 line-clamp-2 leading-relaxed group-hover:text-black dark:group-hover:text-white transition-colors">
                      {cite.text || cite.chunk_text}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
