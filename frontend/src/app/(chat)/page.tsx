"use client";

import { WelcomeScreen } from "@/components/chat/welcome-screen";
import { ChatInput } from "@/components/chat/chat-input";

export default function ChatPage() {
  return (
    <div className="flex h-full flex-col bg-[var(--bg)]">
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        <WelcomeScreen />
      </div>
      <ChatInput />
    </div>
  );
}
