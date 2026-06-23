"use client";

import { useRef, useEffect } from "react";
import { motion } from "framer-motion";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useChatStore } from "@/store/chat-store";
import { MessageBubble } from "./message-bubble";
import { CodeBlock } from "./code-block";
import { Menu } from "lucide-react";
import { useUIStore } from "@/store/ui-store";

type Props = {
  isLoading?: boolean;
};

export function ChatMessages({ isLoading }: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const { messages, isStreaming, streamingContent } = useChatStore();
  const toggleSidebar = useUIStore((s) => s.toggleSidebar);

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, streamingContent]);

  return (
    <div className="flex h-full flex-col">
      {/* Top bar */}
      <header className="flex h-12 shrink-0 items-center justify-between border-b border-[var(--outline-variant)] bg-[var(--surface)] px-4">
        <div className="flex items-center gap-4">
          <button
            onClick={toggleSidebar}
            className="text-[var(--on-surface-variant)] hover:text-[var(--primary)]"
          >
            <Menu className="h-5 w-5" />
          </button>
          <span className="font-mono text-[10px] font-bold uppercase tracking-[0.1em] text-[var(--primary)]">
            CHAT
          </span>
        </div>
      </header>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto custom-scrollbar p-4 pb-4">
        <div className="mx-auto flex max-w-[800px] flex-col gap-8">
          {isLoading ? (
            // Skeleton loading
            Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex flex-col gap-2">
                <div className="skeleton h-3 w-16" />
                <div className="skeleton h-4 w-3/4" />
                <div className="skeleton h-4 w-1/2" />
              </div>
            ))
          ) : (
            messages.map((msg) => (
              <MessageBubble key={msg.id} message={msg} />
            ))
          )}

          {/* Streaming message */}
          {isStreaming && streamingContent && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col gap-2"
            >
              <div className="flex items-center gap-2 font-mono text-[10px] font-bold uppercase tracking-[0.1em] text-[var(--on-surface-variant)]">
                <span className="inline-block h-3.5 w-3.5 rounded-sm bg-[var(--accent)]" />
                VOLTEX
              </div>
              <div className="prose-voltex text-sm text-[var(--on-surface)]">
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  components={{
                    code({ className, children, ...props }) {
                      const match = /language-(\w+)/.exec(className || "");
                      const codeString = String(children).replace(/\n$/, "");
                      if (match) {
                        return <CodeBlock language={match[1]} code={codeString} />;
                      }
                      return (
                        <code className="rounded bg-[var(--surface-container-high)] px-1.5 py-0.5 font-mono text-[13px]" {...props}>
                          {children}
                        </code>
                      );
                    },
                    pre({ children }) {
                      return <>{children}</>;
                    },
                  }}
                >
                  {streamingContent}
                </ReactMarkdown>
                <span className="streaming-cursor" />
              </div>
            </motion.div>
          )}

          {/* Typing indicator */}
          {isStreaming && !streamingContent && (
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2 font-mono text-[10px] font-bold uppercase tracking-[0.1em] text-[var(--on-surface-variant)]">
                <span className="inline-block h-3.5 w-3.5 rounded-sm bg-[var(--accent)]" />
                VOLTEX
              </div>
              <div className="flex items-center gap-1">
                <span className="typing-dot" />
                <span className="typing-dot" />
                <span className="typing-dot" />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
