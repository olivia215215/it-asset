"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { apiFetch } from "@/lib/api-client";
import { Button } from "@/components/ui/button";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

interface ChatResponse {
  ok: boolean;
  data?: {
    intent?: string;
    reply: string;
    needConfirmation?: boolean;
    pendingAction?: {
      type: string;
      description: string;
      params: Record<string, unknown>;
    } | null;
    confirmationToken?: string;
  };
  error?: string;
  reply?: string;
}

export default function ChatPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: "assistant", content: "你好！我是 IT 助手，有什么可以帮助你的吗？你可以查询资产信息、保修状态、工单进度，或提交申领/报修申请。" },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [degraded, setDegraded] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState<{
    description: string;
    actionType: string;
    token: string;
  } | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || loading) return;
    const userMsg: ChatMessage = { role: "user", content: input.trim() };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const history = messages.slice(1).map((m) => ({ role: m.role, content: m.content }));
      const res = await apiFetch<ChatResponse>("/api/ai/chat", {
        method: "POST",
        body: { message: userMsg.content, history },
      });

      if (res.ok && res.data) {
        setDegraded(false);
        const assistantMsg: ChatMessage = {
          role: "assistant",
          content: res.data.reply,
        };
        setMessages((prev) => [...prev, assistantMsg]);

        if (res.data.needConfirmation && res.data.pendingAction && res.data.confirmationToken) {
          setConfirmDialog({
            description: res.data.pendingAction.description,
            actionType: res.data.pendingAction.type,
            token: res.data.confirmationToken,
          });
        }
      } else {
        // Degraded mode or error
        setDegraded(true);
        const reply = res.reply ?? res.data?.reply ?? "AI 助手暂时不可用";
        setMessages((prev) => [...prev, { role: "assistant", content: reply }]);
      }
    } catch (err) {
      setDegraded(true);
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "AI 助手暂时不可用，你可以通过「我的资产」查看资产信息，或通过「申领设备」/「报修」提交申请。" },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = () => {
    if (!confirmDialog) return;
    const { actionType } = confirmDialog;
    setConfirmDialog(null);
    if (actionType === "create_apply") {
      router.push("/apply");
    } else if (actionType === "create_repair") {
      router.push("/tickets");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex flex-1 flex-col h-full max-w-2xl mx-auto w-full p-4">
      <h1 className="text-2xl font-bold mb-4">AI 助手</h1>

      {/* Chat Messages */}
      <div className="flex-1 overflow-y-auto space-y-4 mb-4 min-h-0">
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
            <div
              className={`max-w-[80%] rounded-lg px-4 py-2 ${
                msg.role === "user"
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-foreground"
              }`}
            >
              <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
            </div>
          </div>
        ))}

        {/* Typing Indicator */}
        {loading && (
          <div className="flex justify-start">
            <div className="rounded-lg bg-muted px-4 py-3">
              <div className="flex gap-1">
                <span className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground/40 [animation-delay:0ms]" />
                <span className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground/40 [animation-delay:150ms]" />
                <span className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground/40 [animation-delay:300ms]" />
              </div>
            </div>
          </div>
        )}

        {/* Degraded Hint */}
        {degraded && !loading && (
          <div className="rounded-lg bg-yellow-50 dark:bg-yellow-900/20 px-3 py-2 text-xs text-yellow-800 dark:text-yellow-200">
            AI 服务降级中，部分功能可能不可用
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="flex gap-2">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="输入你的问题..."
          rows={1}
          className="flex-1 rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 resize-none"
        />
        <Button onClick={handleSend} disabled={loading || !input.trim()}>
          发送
        </Button>
      </div>

      {/* Confirmation Dialog */}
      {confirmDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-sm rounded-lg bg-background p-6 space-y-4">
            <h3 className="font-semibold">确认操作</h3>
            <p className="text-sm text-muted-foreground">{confirmDialog.description}</p>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setConfirmDialog(null)}>
                取消
              </Button>
              <Button onClick={handleConfirm}>
                确认
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
