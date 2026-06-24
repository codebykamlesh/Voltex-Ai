"use client";

import { useState } from "react";
import { Copy, Check, RefreshCw, Pencil, ThumbsUp, ThumbsDown } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { MessageItem } from "@/lib/api";
import { CodeBlock } from "./code-block";

type Props = {
  message: MessageItem;
};

export function MessageBubble({ message }: Props) {
  const [copied, setCopied] = useState(false);
  const isUser = message.role === "user";

  const handleCopy = async () => {
    await navigator.clipboard.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (isUser) {
    return (
      <div className="flex flex-col items-end gap-2">
        <div className="font-mono text-[10px] font-bold uppercase tracking-[0.1em] text-[var(--on-surface-variant)]">
          USER
        </div>
        <div className="max-w-[90%] border border-[var(--outline-variant)] bg-[var(--surface-container-high)] p-3 text-sm text-[var(--primary)] sm:p-4">
          {message.content}
        </div>
        <div className="flex items-center gap-1 opacity-100 transition-opacity sm:opacity-0 sm:hover:opacity-100 [div:hover>&]:opacity-100">
          <button
            onClick={handleCopy}
            className="p-1 text-[var(--on-surface-variant)] hover:text-[var(--primary)]"
            title="Copy"
          >
            {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="group flex flex-col gap-2">
      <div className="flex items-center gap-2 font-mono text-[10px] font-bold uppercase tracking-[0.1em] text-[var(--on-surface-variant)]">
        <span className="inline-block h-3.5 w-3.5 rounded-sm bg-[var(--accent)]" />
        VOLTEX
      </div>
      <div className="prose-voltex text-sm leading-relaxed text-[var(--on-surface)]">
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
          {message.content}
        </ReactMarkdown>
      </div>

      {/* Action buttons */}
      <div className="flex items-center gap-1 opacity-100 transition-opacity sm:opacity-0 sm:group-hover:opacity-100">
        <button
          onClick={handleCopy}
          className="flex items-center gap-1 p-1 text-[var(--on-surface-variant)] hover:text-[var(--primary)]"
          title="Copy"
        >
          {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
          <span className="text-[10px]">{copied ? "Copied" : "Copy"}</span>
        </button>
        {message.tokens_used && (
          <span className="ml-2 font-mono text-[10px] text-[var(--on-surface-variant)]">
            {message.tokens_used} tokens
          </span>
        )}
      </div>
    </div>
  );
}
