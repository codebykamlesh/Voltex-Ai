"use client";

import { useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Send, Square, Paperclip, X, Loader2 } from "lucide-react";
import { useChatStore } from "@/store/chat-store";
import { useSettingsStore } from "@/store/settings-store";
import { streamChat, chatApi, uploadApi, type MessageItem } from "@/lib/api";
import { useQueryClient } from "@tanstack/react-query";

type Props = {
  conversationId?: string;
};

export function ChatInput({ conversationId }: Props) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const [input, setInput] = useState("");
  const [uploadedFiles, setUploadedFiles] = useState<Array<{ id: string; name: string }>>([]);
  const [isUploading, setIsUploading] = useState(false);

  const {
    isStreaming,
    setStreaming,
    setStreamingContent,
    appendStreamingContent,
    addMessage,
    setAbortController,
    abortController,
    setActiveConversation,
  } = useChatStore();

  const { aiModel, temperature, maxTokens } = useSettingsStore();

  const handleSubmit = useCallback(async () => {
    const message = input.trim();
    if (!message || isStreaming) return;

    setInput("");
    setStreaming(true);
    setStreamingContent("");

    // Add user message to UI immediately
    const userMsg: MessageItem = {
      id: `temp-${Date.now()}`,
      role: "user",
      content: message,
      model_used: null,
      tokens_used: null,
      is_edited: false,
      created_at: new Date().toISOString(),
    };
    addMessage(userMsg);

    const controller = new AbortController();
    setAbortController(controller);

    const fileIds = uploadedFiles.map((f) => f.id);
    setUploadedFiles([]);

    try {
      let newConvId = conversationId || null;

      for await (const event of streamChat(
        message,
        newConvId,
        aiModel,
        temperature,
        maxTokens,
        fileIds.length > 0 ? fileIds : undefined,
        controller.signal,
      )) {
        switch (event.type) {
          case "meta":
            newConvId = event.conversation_id;
            if (!conversationId) {
              setActiveConversation(newConvId);
              router.replace(`/c/${newConvId}`);
            }
            break;
          case "content":
            appendStreamingContent(event.content);
            break;
          case "done": {
            const streamingContent = useChatStore.getState().streamingContent;
            const assistantMsg: MessageItem = {
              id: `assistant-${Date.now()}`,
              role: "assistant",
              content: streamingContent || "No response generated.",
              model_used: aiModel,
              tokens_used: event.usage?.total_tokens || null,
              is_edited: false,
              created_at: new Date().toISOString(),
            };
            addMessage(assistantMsg);
            break;
          }
          case "error":
            const errorMsg: MessageItem = {
              id: `error-${Date.now()}`,
              role: "assistant",
              content: "I apologize, but an error occurred while generating the response. Please try again.",
              model_used: null,
              tokens_used: null,
              is_edited: false,
              created_at: new Date().toISOString(),
            };
            addMessage(errorMsg);
            break;
        }
      }

      // Refresh conversations list
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
    } catch (err) {
      if (!(err instanceof DOMException && err.name === "AbortError")) {
        const errorMsg: MessageItem = {
          id: `error-${Date.now()}`,
          role: "assistant",
          content: "Something went wrong. Please check your connection and try again.",
          model_used: null,
          tokens_used: null,
          is_edited: false,
          created_at: new Date().toISOString(),
        };
        addMessage(errorMsg);
      }
    } finally {
      setStreaming(false);
      setStreamingContent("");
      setAbortController(null);
    }
  }, [input, isStreaming, conversationId, aiModel, temperature, maxTokens, uploadedFiles, addMessage, appendStreamingContent, queryClient, setAbortController, setActiveConversation, setStreaming, setStreamingContent]);

  const handleStop = () => {
    abortController?.abort();
    if (conversationId) {
      chatApi.stop(conversationId);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files?.length) return;

    setIsUploading(true);
    try {
      for (const file of Array.from(files)) {
        const result = await uploadApi.upload(file, conversationId);
        setUploadedFiles((prev) => [...prev, { id: result.id, name: result.filename }]);
      }
    } catch (err) {
      console.error("Upload failed:", err);
    } finally {
      setIsUploading(false);
      e.target.value = "";
    }
  };

  const removeFile = (id: string) => {
    setUploadedFiles((prev) => prev.filter((f) => f.id !== id));
  };

  // Auto-resize textarea
  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    const el = e.target;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 200) + "px";
  };

  return (
    <div className="border-t border-[var(--outline-variant)] bg-gradient-to-t from-[var(--bg)] via-[var(--bg)] to-transparent p-2 sm:p-4">
      {/* Uploaded files */}
      {uploadedFiles.length > 0 && (
        <div className="mb-3 flex flex-wrap gap-2">
          {uploadedFiles.map((file) => (
            <div
              key={file.id}
              className="flex items-center gap-2 border border-[var(--outline-variant)] bg-[var(--surface-container)] px-3 py-1.5 text-xs text-[var(--on-surface-variant)]"
            >
              <Paperclip className="h-3 w-3" />
              {file.name}
              <button onClick={() => removeFile(file.id)} className="hover:text-[var(--error)]">
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="mx-auto max-w-[800px]">
        <div className="group relative">
          <div className="absolute -inset-0.5 bg-[var(--accent)] opacity-0 blur-xl transition-opacity duration-500 group-focus-within:opacity-[0.07]" />
          <div className="relative flex items-end gap-2 border border-[var(--outline-variant)] bg-[var(--surface-container)] p-2">
            {/* File upload */}
            <label className="flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center text-[var(--on-surface-variant)] transition-colors hover:text-[var(--primary)]">
              {isUploading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <Paperclip className="h-5 w-5" />
              )}
              <input
                type="file"
                accept=".pdf,.docx,.txt,.png,.jpg,.jpeg"
                multiple
                onChange={handleFileUpload}
                className="hidden"
              />
            </label>

            {/* Textarea */}
            <textarea
              ref={textareaRef}
              value={input}
              onChange={handleInput}
              onKeyDown={handleKeyDown}
              placeholder="Type a technical command or ask a question..."
              rows={1}
              disabled={isStreaming}
              className="flex-1 resize-none bg-transparent py-3 text-sm text-[var(--primary)] placeholder-[var(--on-surface-variant)] focus:outline-none disabled:opacity-50"
              style={{ height: "46px", overflow: "hidden" }}
            />

            {/* Send / Stop */}
            <div className="flex shrink-0 items-center gap-2">
              <span className="hidden text-[10px] font-mono uppercase tracking-[0.1em] text-[var(--outline-variant)] sm:block">
                {isStreaming ? "" : "ENTER"}
              </span>
              {isStreaming ? (
                <button
                  onClick={handleStop}
                  className="flex h-10 w-10 items-center justify-center bg-[var(--error)] text-white transition-all active:scale-90"
                  title="Stop generation"
                >
                  <Square className="h-4 w-4" fill="currentColor" />
                </button>
              ) : (
                <button
                  onClick={handleSubmit}
                  disabled={!input.trim()}
                  className="flex h-10 w-10 items-center justify-center bg-[var(--primary)] text-[var(--on-primary)] transition-all hover:shadow-[0_0_15px_rgba(255,255,255,0.2)] active:scale-90 disabled:opacity-30"
                  title="Send message"
                >
                  <Send className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
