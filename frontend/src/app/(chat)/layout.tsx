"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { useAuthStore } from "@/store/auth-store";
import { useChatStore } from "@/store/chat-store";
import { useUIStore } from "@/store/ui-store";
import { useSettingsStore } from "@/store/settings-store";
import { conversationsApi, userApi } from "@/lib/api";
import { Sidebar } from "@/components/sidebar/sidebar";
import { Zap } from "lucide-react";

export default function ChatLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { isAuthenticated, isLoading: authLoading } = useAuthStore();
  const { sidebarOpen, isMobile } = useUIStore();
  const setConversations = useChatStore((s) => s.setConversations);
  const loadFromServer = useSettingsStore((s) => s.loadFromServer);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push("/login");
    }
  }, [authLoading, isAuthenticated, router]);

  // Fetch conversations
  const { data: conversations } = useQuery({
    queryKey: ["conversations"],
    queryFn: () => conversationsApi.list(),
    enabled: isAuthenticated,
    refetchInterval: 30000,
  });

  useEffect(() => {
    if (conversations) setConversations(conversations);
  }, [conversations, setConversations]);

  // Fetch user settings
  const { data: settings } = useQuery({
    queryKey: ["settings"],
    queryFn: () => userApi.getSettings(),
    enabled: isAuthenticated,
  });

  useEffect(() => {
    if (settings) {
      loadFromServer({
        aiModel: settings.ai_model,
        temperature: settings.temperature,
        maxTokens: settings.max_tokens,
        sidebarCollapsed: settings.sidebar_collapsed,
      });
      if (settings.theme) {
        useUIStore.getState().setTheme(settings.theme as "dark" | "light" | "system");
      }
    }
  }, [settings, loadFromServer]);

  // Show loading while checking auth
  if (authLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-[var(--bg)]">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
        >
          <Zap className="h-8 w-8 text-[var(--accent)]" />
        </motion.div>
      </div>
    );
  }

  if (!isAuthenticated) return null;

  return (
    <div className="flex h-screen w-full overflow-hidden bg-[var(--bg)]">
      {/* Sidebar */}
      <AnimatePresence mode="wait">
        {sidebarOpen && (
          <motion.div
            initial={isMobile ? { x: -260 } : { width: 0 }}
            animate={isMobile ? { x: 0 } : { width: 260 }}
            exit={isMobile ? { x: -260 } : { width: 0 }}
            transition={{ duration: 0.2, ease: "easeInOut" }}
            className={
              isMobile
                ? "fixed inset-y-0 left-0 z-50 w-[260px]"
                : "relative z-20 shrink-0 overflow-hidden"
            }
          >
            <Sidebar />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Mobile sidebar overlay */}
      {isMobile && sidebarOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={() => useUIStore.getState().setSidebarOpen(false)}
          className="fixed inset-0 z-40 bg-black/60"
        />
      )}

      {/* Main content */}
      <main className="relative flex flex-1 flex-col overflow-hidden">
        {children}
      </main>

      {/* Atmospheric background (subtle) */}
      <div className="pointer-events-none fixed inset-0 z-0 opacity-[0.03]">
        <div className="absolute left-1/3 top-1/4 h-96 w-96 rounded-full bg-[var(--primary)] blur-[150px]" />
        <div className="absolute bottom-1/4 right-1/4 h-64 w-64 rounded-full bg-[var(--accent)] blur-[120px]" />
      </div>
    </div>
  );
}
