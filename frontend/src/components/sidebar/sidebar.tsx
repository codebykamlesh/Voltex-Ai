"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Zap, Plus, Search, Pin, Trash2, Pencil, MoreHorizontal, BookOpen, Settings, X } from "lucide-react";
import Image from "next/image";
import { useChatStore } from "@/store/chat-store";
import { useUIStore } from "@/store/ui-store";
import { useAuthStore } from "@/store/auth-store";
import { conversationsApi, type ConversationItem } from "@/lib/api";
import { groupConversationsByDate, truncateText } from "@/lib/utils";
import { useQueryClient } from "@tanstack/react-query";
import { UserMenu } from "./user-menu";
import { SettingsDialog } from "@/components/settings/settings-dialog";

export function Sidebar() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { conversations, activeConversationId } = useChatStore();
  const { isMobile, setSidebarOpen } = useUIStore();

  const [search, setSearch] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [contextMenuId, setContextMenuId] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);

  const filtered = conversations.filter(
    (c) => !search || c.title.toLowerCase().includes(search.toLowerCase())
  );
  const grouped = groupConversationsByDate(filtered);

  const handleNewChat = () => {
    router.push("/");
    if (isMobile) setSidebarOpen(false);
  };

  const handleSelectChat = (id: string) => {
    router.push(`/c/${id}`);
    if (isMobile) setSidebarOpen(false);
  };

  const handleRename = async (id: string) => {
    if (!editTitle.trim()) return;
    await conversationsApi.update(id, { title: editTitle.trim() });
    queryClient.invalidateQueries({ queryKey: ["conversations"] });
    setEditingId(null);
  };

  const handlePin = async (conv: ConversationItem) => {
    await conversationsApi.update(conv.id, { is_pinned: !conv.is_pinned });
    queryClient.invalidateQueries({ queryKey: ["conversations"] });
  };

  const handleDelete = async (id: string) => {
    await conversationsApi.delete(id);
    queryClient.invalidateQueries({ queryKey: ["conversations"] });
    if (activeConversationId === id) router.push("/");
  };

  return (
    <>
      <aside className="flex h-full w-[260px] flex-col border-r border-[var(--outline-variant)] bg-[var(--surface-container-low)]">
        {/* Header */}
        <div className="p-4">
          <div className="flex items-center gap-2 text-xl font-bold tracking-tighter text-[var(--primary)]">
            <Image src="/logo.jpg" alt="Voltex AI Logo" width={20} height={20} className="rounded-sm" />
            VOLTEX AI
          </div>
          <div className="mt-1 font-mono text-[10px] font-bold uppercase tracking-[0.1em] text-[var(--on-surface-variant)]">
            Technical Workspace
          </div>
        </div>

        {/* New Chat + Search */}
        <div className="mt-2 px-4">
          <button
            onClick={handleNewChat}
            className="mb-3 flex w-full items-center justify-center gap-2 bg-[var(--primary)] py-2.5 font-bold text-[var(--on-primary)] transition-all active:scale-[0.97]"
          >
            <Plus className="h-4 w-4" />
            New Chat
          </button>

          <div className="relative mb-4">
            <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-[var(--on-surface-variant)]" />
            <input
              type="text"
              placeholder="Search chats..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full border border-[var(--outline-variant)] bg-[var(--bg)] py-2 pl-9 pr-3 text-xs text-[var(--primary)] placeholder-[var(--on-surface-variant)] focus:border-[var(--accent)] focus:outline-none"
            />
          </div>
        </div>

        {/* Chat List */}
        <div className="flex-1 overflow-y-auto custom-scrollbar px-2">
          {Object.entries(grouped).map(([label, convs]) => (
            <div key={label} className="mb-4">
              <div className="mb-1 px-2 font-mono text-[10px] font-bold uppercase tracking-[0.1em] text-[var(--on-surface-variant)]">
                {label}
              </div>
              {(convs as ConversationItem[]).map((conv) => (
                <div
                  key={conv.id}
                  className={`group relative flex cursor-pointer items-center gap-2 px-3 py-2 text-sm transition-colors ${
                    activeConversationId === conv.id
                      ? "border-r-2 border-[var(--primary)] bg-[var(--surface-container-high)] text-[var(--primary)]"
                      : "text-[var(--on-surface-variant)] hover:bg-[var(--surface-container-high)]"
                  }`}
                  onClick={() => handleSelectChat(conv.id)}
                >
                  {conv.is_pinned && <Pin className="h-3 w-3 shrink-0 text-[var(--accent)]" />}

                  {editingId === conv.id ? (
                    <input
                      autoFocus
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleRename(conv.id);
                        if (e.key === "Escape") setEditingId(null);
                      }}
                      onBlur={() => handleRename(conv.id)}
                      onClick={(e) => e.stopPropagation()}
                      className="min-w-0 flex-1 border border-[var(--accent)] bg-transparent px-1 text-xs text-[var(--primary)] outline-none"
                    />
                  ) : (
                    <span className="min-w-0 flex-1 truncate text-xs">
                      {truncateText(conv.title, 30)}
                    </span>
                  )}

                  {/* Context actions */}
                  <div className="flex shrink-0 items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingId(conv.id);
                        setEditTitle(conv.title);
                      }}
                      className="p-0.5 text-[var(--on-surface-variant)] hover:text-[var(--primary)]"
                      title="Rename"
                    >
                      <Pencil className="h-3 w-3" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handlePin(conv);
                      }}
                      className="p-0.5 text-[var(--on-surface-variant)] hover:text-[var(--primary)]"
                      title={conv.is_pinned ? "Unpin" : "Pin"}
                    >
                      <Pin className="h-3 w-3" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(conv.id);
                      }}
                      className="p-0.5 text-[var(--on-surface-variant)] hover:text-[var(--error)]"
                      title="Delete"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ))}

          {filtered.length === 0 && (
            <p className="px-4 py-8 text-center text-xs text-[var(--on-surface-variant)]">
              {search ? "No chats match your search." : "No conversations yet. Start a new chat!"}
            </p>
          )}
        </div>

        {/* Bottom section */}
        <div className="border-t border-[var(--outline-variant)] p-2">
          <button
            onClick={() => setShowSettings(true)}
            className="flex w-full items-center gap-3 px-3 py-2 text-xs text-[var(--on-surface-variant)] transition-colors hover:bg-[var(--surface-container-high)]"
          >
            <Settings className="h-4 w-4" />
            Settings
          </button>
          <UserMenu />
        </div>
      </aside>

      {showSettings && <SettingsDialog onClose={() => setShowSettings(false)} />}
    </>
  );
}
