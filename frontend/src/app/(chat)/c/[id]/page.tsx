"use client";

import { useEffect } from "react";
import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { conversationsApi } from "@/lib/api";
import { useChatStore } from "@/store/chat-store";
import { ChatMessages } from "@/components/chat/chat-messages";
import { ChatInput } from "@/components/chat/chat-input";

export default function ConversationPage() {
  const params = useParams();
  const id = params.id as string;
  const { setActiveConversation, setMessages, setStreamingContent, setStreaming } = useChatStore();

  const { data, isLoading } = useQuery({
    queryKey: ["conversation", id],
    queryFn: () => conversationsApi.get(id),
    enabled: !!id,
  });

  useEffect(() => {
    setActiveConversation(id);
    setStreamingContent("");
    setStreaming(false);
    return () => setActiveConversation(null);
  }, [id, setActiveConversation, setStreamingContent, setStreaming]);

  useEffect(() => {
    if (data?.messages) {
      setMessages(data.messages);
    }
  }, [data, setMessages]);

  return (
    <div className="flex h-full flex-col bg-[var(--bg)]">
      <div className="flex-1 overflow-hidden">
        <ChatMessages isLoading={isLoading} />
      </div>
      <ChatInput conversationId={id} />
    </div>
  );
}
