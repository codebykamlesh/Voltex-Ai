"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { motion } from "framer-motion";
import { X, Monitor, Moon, Sun, Download } from "lucide-react";
import { useSettingsStore } from "@/store/settings-store";
import { useUIStore } from "@/store/ui-store";
import { userApi, chatApi, conversationsApi } from "@/lib/api";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { downloadJSON } from "@/lib/utils";
import { useChatStore } from "@/store/chat-store";

type Props = {
  onClose: () => void;
};

export function SettingsDialog({ onClose }: Props) {
  const { aiModel, temperature, maxTokens, setAiModel, setTemperature, setMaxTokens } = useSettingsStore();
  const { theme, setTheme } = useUIStore();
  const conversations = useChatStore((s) => s.conversations);
  const queryClient = useQueryClient();

  const [originalTheme] = useState(theme);
  const [localModel, setLocalModel] = useState(aiModel);
  const [localTemp, setLocalTemp] = useState(temperature);
  const [localTokens, setLocalTokens] = useState(maxTokens);
  const [localTheme, setLocalTheme] = useState(theme);
  const [saving, setSaving] = useState(false);
  const [mounted, setMounted] = useState(false);

  const handleClose = () => {
    setTheme(originalTheme);
    onClose();
  };

  useEffect(() => {
    setMounted(true);
  }, []);

  const { data: modelsData } = useQuery({
    queryKey: ["models"],
    queryFn: () => chatApi.getModels(),
  });

  const handleSave = async () => {
    setSaving(true);
    try {
      await userApi.updateSettings({
        theme: localTheme,
        ai_model: localModel,
        temperature: localTemp,
        max_tokens: localTokens,
      });
      setAiModel(localModel);
      setTemperature(localTemp);
      setMaxTokens(localTokens);
      setTheme(localTheme);
      
      // Invalidate query to sync server settings with react-query cache
      await queryClient.invalidateQueries({ queryKey: ["settings"] });
      
      onClose();
    } catch (err) {
      console.error("Failed to save settings:", err);
    } finally {
      setSaving(false);
    }
  };

  const handleExportAll = async () => {
    const results = await Promise.allSettled(
      conversations.map((conv) => conversationsApi.export(conv.id))
    );
    const allData = results
      .filter((r): r is PromiseFulfilledResult<unknown> => r.status === "fulfilled")
      .map((r) => r.value);
    downloadJSON(allData, "voltex-ai-conversations.json");
  };

  if (!mounted) return null;

  return createPortal(
    <div 
      className="fixed inset-0 z-[99999] flex items-end justify-center bg-black/60 sm:items-center sm:p-4"
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="relative z-[100000] flex max-h-[100dvh] w-full flex-col border border-outline-variant bg-surface-container shadow-2xl sm:max-h-[85vh] sm:max-w-lg sm:rounded-none"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-outline-variant px-6 py-4">
          <h2 className="text-lg font-bold text-[var(--primary)]">Settings</h2>
          <button onClick={handleClose} className="text-[var(--on-surface-variant)] hover:text-[var(--primary)]">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="min-h-0 flex-1 space-y-6 overflow-y-auto p-4 sm:p-6">
          {/* Theme */}
          <div>
            <label className="mb-2 block font-mono text-[10px] font-bold uppercase tracking-[0.1em] text-[var(--on-surface-variant)]">
              Theme
            </label>
            <div className="flex gap-2">
              {[
                { value: "dark" as const, icon: Moon, label: "Dark" },
                { value: "light" as const, icon: Sun, label: "Light" },
                { value: "system" as const, icon: Monitor, label: "System" },
              ].map((t) => (
                <button
                  key={t.value}
                  onClick={() => {
                    setLocalTheme(t.value);
                    setTheme(t.value);
                  }}
                  className={`flex flex-1 items-center justify-center gap-2 border py-2.5 text-xs font-semibold transition-colors ${
                    localTheme === t.value
                      ? "border-[var(--accent)] text-[var(--primary)]"
                      : "border-outline-variant text-[var(--on-surface-variant)] hover:bg-surface-container-high"
                  }`}
                  style={{
                    backgroundColor: localTheme === t.value ? "var(--surface-container-high)" : "transparent"
                  }}
                >
                  <t.icon className="h-4 w-4" />
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* AI Model */}
          <div>
            <label className="mb-2 block font-mono text-[10px] font-bold uppercase tracking-[0.1em] text-[var(--on-surface-variant)]">
              AI Model
            </label>
            <select
              value={localModel}
              onChange={(e) => setLocalModel(e.target.value)}
              className="w-full border border-outline-variant px-3 py-2.5 text-sm text-[var(--primary)] focus:border-[var(--accent)] focus:outline-none"
              style={{ backgroundColor: "var(--bg)" }}
            >
              {modelsData?.models?.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name} (ctx: {(m.context_window / 1000).toFixed(0)}k)
                </option>
              )) || (
                <option value={localModel}>{localModel}</option>
              )}
            </select>
          </div>

          {/* Temperature */}
          <div>
            <label className="mb-2 flex items-center justify-between">
              <span className="font-mono text-[10px] font-bold uppercase tracking-[0.1em] text-[var(--on-surface-variant)]">
                Temperature
              </span>
              <span className="font-mono text-xs text-[var(--primary)]">{localTemp.toFixed(1)}</span>
            </label>
            <input
              type="range"
              min="0"
              max="2"
              step="0.1"
              value={localTemp}
              onChange={(e) => setLocalTemp(parseFloat(e.target.value))}
              className="w-full accent-[var(--accent)]"
            />
            <div className="mt-1 flex justify-between text-[10px] text-[var(--on-surface-variant)]">
              <span>Precise</span>
              <span>Creative</span>
            </div>
          </div>

          {/* Max Tokens */}
          <div>
            <label className="mb-2 block font-mono text-[10px] font-bold uppercase tracking-[0.1em] text-[var(--on-surface-variant)]">
              Max Tokens
            </label>
            <input
              type="number"
              min={256}
              max={32768}
              value={localTokens}
              onChange={(e) => setLocalTokens(parseInt(e.target.value) || 4096)}
              className="w-full border border-outline-variant px-3 py-2.5 text-sm text-[var(--primary)] focus:border-[var(--accent)] focus:outline-none"
              style={{ backgroundColor: "var(--bg)" }}
            />
          </div>

          {/* Export */}
          <div>
            <button
              onClick={handleExportAll}
              className="flex items-center gap-2 border border-outline-variant px-4 py-2.5 text-xs font-semibold text-[var(--on-surface-variant)] transition-colors hover:bg-surface-container-high hover:text-[var(--primary)]"
            >
              <Download className="h-4 w-4" />
              Export All Conversations
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 border-t border-outline-variant px-4 py-3 sm:px-6 sm:py-4">
          <button
            onClick={handleClose}
            className="border border-outline-variant px-6 py-2.5 text-sm text-[var(--on-surface-variant)] transition-colors hover:bg-surface-container-high"
            style={{ backgroundColor: "transparent" }}
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="bg-[var(--primary)] px-6 py-2.5 text-sm font-bold text-[var(--on-primary)] transition-all hover:opacity-90 active:scale-[0.98] disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save"}
          </button>
        </div>
      </motion.div>
    </div>,
    document.body
  );
}
