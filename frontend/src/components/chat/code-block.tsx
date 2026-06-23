"use client";

import { useState } from "react";
import { Copy, Check } from "lucide-react";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism";

type Props = {
  language: string;
  code: string;
};

export function CodeBlock({ language, code }: Props) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="my-3 border border-[var(--outline-variant)] bg-[var(--surface-container-lowest)]">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[var(--outline-variant)] px-4 py-2">
        <span className="font-mono text-[10px] font-bold uppercase tracking-[0.1em] text-[var(--on-surface-variant)]">
          {language}
        </span>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1.5 text-[var(--on-surface-variant)] transition-colors hover:text-[var(--primary)]"
        >
          {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
          <span className="text-[10px]">{copied ? "Copied" : "Copy"}</span>
        </button>
      </div>

      {/* Code */}
      <SyntaxHighlighter
        language={language}
        style={oneDark}
        customStyle={{
          margin: 0,
          padding: "16px",
          background: "var(--surface-container-lowest)",
          fontSize: "13px",
          lineHeight: "1.7",
          borderRadius: 0,
        }}
        codeTagProps={{
          style: {
            fontFamily: '"JetBrains Mono", monospace',
          },
        }}
      >
        {code}
      </SyntaxHighlighter>
    </div>
  );
}
