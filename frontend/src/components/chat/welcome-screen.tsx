"use client";

import { motion } from "framer-motion";
import { Zap, Code, Lightbulb, FileText, Sparkles, Menu } from "lucide-react";
import Image from "next/image";
import { useUIStore } from "@/store/ui-store";

const suggestions = [
  {
    icon: Code,
    title: "Write code",
    prompt: "Write a Python async web scraper with rate limiting and error handling",
  },
  {
    icon: Lightbulb,
    title: "Explain concepts",
    prompt: "Explain how transformer attention mechanisms work with a visual analogy",
  },
  {
    icon: FileText,
    title: "Analyze documents",
    prompt: "Upload a document and ask me to summarize the key points",
  },
  {
    icon: Sparkles,
    title: "Creative ideas",
    prompt: "Design a microservices architecture for a real-time trading platform",
  },
];

export function WelcomeScreen() {
  const toggleSidebar = useUIStore((s) => s.toggleSidebar);

  return (
    <div className="flex h-full flex-col">
      {/* Top bar */}
      <header className="flex h-12 shrink-0 items-center border-b border-[var(--outline-variant)] bg-[var(--surface)] px-4">
        <button
          onClick={toggleSidebar}
          className="text-[var(--on-surface-variant)] hover:text-[var(--primary)]"
        >
          <Menu className="h-5 w-5" />
        </button>
        <span className="ml-4 font-mono text-[10px] font-bold uppercase tracking-[0.1em] text-[var(--primary)]">
          VOLTEX
        </span>
      </header>

      <div className="flex flex-1 flex-col items-center justify-center p-4 sm:p-8">
        {/* Logo animation */}
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 200, delay: 0.1 }}
          className="mb-6 flex items-center gap-3"
        >
          <Image src="/logo.jpg" alt="Voltex AI Logo" width={40} height={40} className="rounded-[4px]" />
          <span className="text-xl font-black tracking-widest text-[var(--primary)] sm:text-3xl">VOLTEX AI</span>
        </motion.div>

        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mb-6 text-center text-xs text-[var(--on-surface-variant)] sm:mb-12 sm:text-sm"
        >
          High-performance AI assistant for developers and power users.
        </motion.p>

        {/* Suggestion cards */}
        <div className="grid w-full max-w-[700px] grid-cols-1 gap-3 sm:grid-cols-2">
          {suggestions.map((s, i) => (
            <motion.button
              key={s.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 + i * 0.1 }}
              className="group flex items-start gap-3 border border-[var(--outline-variant)] bg-[var(--surface-container)] p-4 text-left transition-all hover:border-[var(--accent)] hover:bg-[var(--surface-container-high)]"
              onClick={() => {
                const input = document.querySelector("textarea");
                if (input) {
                  const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
                    window.HTMLTextAreaElement.prototype, "value"
                  )?.set;
                  nativeInputValueSetter?.call(input, s.prompt);
                  input.dispatchEvent(new Event("input", { bubbles: true }));
                  input.focus();
                }
              }}
            >
              <s.icon className="mt-0.5 h-4 w-4 shrink-0 text-[var(--accent)] transition-colors group-hover:text-[var(--primary)]" />
              <div>
                <p className="text-xs font-bold text-[var(--primary)]">{s.title}</p>
                <p className="mt-1 text-xs text-[var(--on-surface-variant)]">{s.prompt}</p>
              </div>
            </motion.button>
          ))}
        </div>
      </div>
    </div>
  );
}
