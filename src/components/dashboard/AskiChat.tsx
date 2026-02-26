import { useState, useEffect, useRef, useCallback } from "react";
import { Plus, Send, Pencil, Trash2, MessageSquare, Menu, X, Check } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";

interface Chat {
  id: string;
  title: string;
  updated_at: string;
  is_archived: boolean;
}

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  created_at: string;
}

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/aski-chat`;

export function AskiChat() {
  const [chats, setChats] = useState<Chat[]>([]);
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [questionsUsed, setQuestionsUsed] = useState(0);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const questionsLimit = 200;

  // Load chats
  const loadChats = useCallback(async () => {
    const { data } = await supabase
      .from("aski_chats")
      .select("*")
      .eq("is_archived", false)
      .order("updated_at", { ascending: false });
    if (data) setChats(data as Chat[]);
  }, []);

  // Load monthly count
  const loadMonthlyCount = useCallback(async () => {
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);
    const { count } = await supabase
      .from("aski_messages")
      .select("*", { count: "exact", head: true })
      .eq("role", "user")
      .gte("created_at", startOfMonth.toISOString());
    setQuestionsUsed(count ?? 0);
  }, []);

  useEffect(() => {
    loadChats();
    loadMonthlyCount();
  }, [loadChats, loadMonthlyCount]);

  // Load messages for selected chat
  const loadMessages = useCallback(async (chatId: string) => {
    const { data } = await supabase
      .from("aski_messages")
      .select("*")
      .eq("chat_id", chatId)
      .order("created_at", { ascending: true });
    if (data) setMessages(data as Message[]);
  }, []);

  useEffect(() => {
    if (selectedChatId) loadMessages(selectedChatId);
    else setMessages([]);
  }, [selectedChatId, loadMessages]);

  // Auto-scroll only when there are messages
  useEffect(() => {
    if (messages.length > 0 || isLoading) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isLoading]);

  const handleNewChat = () => {
    setSelectedChatId(null);
    setMessages([]);
    setSidebarOpen(false);
    setTimeout(() => inputRef.current?.focus(), 100);
  };

  const handleSelectChat = (chatId: string) => {
    setSelectedChatId(chatId);
    setSidebarOpen(false);
  };

  const handleSend = async () => {
    const text = input.trim();
    if (!text || isLoading || questionsUsed >= questionsLimit) return;

    setInput("");
    setIsLoading(true);

    // Optimistic user message
    const tempId = "temp-" + Date.now();
    setMessages(prev => [...prev, { id: tempId, role: "user", content: text, created_at: new Date().toISOString() }]);

    try {
      const res = await fetch(CHAT_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ chatId: selectedChatId, userMessage: text }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (data.error === "limit_reached") {
          toast({ title: "Limite atteinte", description: data.message, variant: "destructive" });
          setMessages(prev => prev.filter(m => m.id !== tempId));
          setInput(text);
          setIsLoading(false);
          return;
        }
        throw new Error(data.error ?? "Erreur inconnue");
      }

      // Update chat id if new
      if (!selectedChatId) {
        setSelectedChatId(data.chat_id);
        await loadChats();
      } else {
        // Refresh chat title in sidebar if auto-renamed
        setChats(prev => prev.map(c => c.id === data.chat_id ? { ...c, title: data.chat_title, updated_at: new Date().toISOString() } : c));
      }

      setQuestionsUsed(data.questions_used);

      // Reload messages to get real IDs
      await loadMessages(data.chat_id);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Aski est temporairement indisponible.";
      setMessages(prev => [
        ...prev.filter(m => m.id !== tempId),
        { id: "err-" + Date.now(), role: "assistant", content: `❌ ${msg}`, created_at: new Date().toISOString() },
      ]);
      toast({ title: "Erreur", description: msg, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleRenameStart = (chat: Chat) => {
    setRenamingId(chat.id);
    setRenameValue(chat.title);
  };

  const handleRenameConfirm = async (chatId: string) => {
    if (!renameValue.trim()) return;
    await supabase.from("aski_chats").update({ title: renameValue.trim() }).eq("id", chatId);
    setChats(prev => prev.map(c => c.id === chatId ? { ...c, title: renameValue.trim() } : c));
    setRenamingId(null);
  };

  const handleDelete = async (chatId: string) => {
    await supabase.from("aski_chats").update({ is_archived: true }).eq("id", chatId);
    setChats(prev => prev.filter(c => c.id !== chatId));
    if (selectedChatId === chatId) {
      setSelectedChatId(null);
      setMessages([]);
    }
    setDeleteConfirmId(null);
  };

  const counterColor = questionsUsed >= questionsLimit
    ? "#EF4444"
    : questionsUsed >= 180
    ? "#F59E0B"
    : "#9CA3AF";

  const nextMonth = new Date();
  nextMonth.setMonth(nextMonth.getMonth() + 1);
  nextMonth.setDate(1);
  const nextMonthStr = nextMonth.toLocaleDateString("fr-FR", { month: "long" });

  return (
    <div className="flex h-[calc(100vh-220px)] min-h-[600px] rounded-xl overflow-hidden border border-border shadow-md bg-white">
      {/* Sidebar Overlay on mobile */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-20 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          flex flex-col bg-[#F9FAFB] border-r border-[#E5E7EB] w-60 shrink-0
          md:relative md:translate-x-0 md:z-auto
          fixed inset-y-0 left-0 z-30 transition-transform duration-200
          ${sidebarOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"}
        `}
      >
        {/* New chat button */}
        <div className="p-3 border-b border-[#E5E7EB]">
          <button
            onClick={handleNewChat}
            className="flex items-center gap-2 w-full px-3 py-2.5 rounded-lg border border-[#E5E7EB] bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors duration-150"
          >
            <Plus className="w-4 h-4 text-[#E63946]" />
            Nouvelle conversation
          </button>
        </div>

        {/* Chat list */}
        <div className="flex-1 overflow-y-auto py-2">
          {chats.length === 0 ? (
            <p className="text-xs text-gray-400 text-center px-4 py-6">Aucune conversation</p>
          ) : (
            chats.map(chat => (
              <div
                key={chat.id}
                className={`
                  group relative flex items-start px-3 py-2.5 cursor-pointer transition-colors duration-150
                  ${selectedChatId === chat.id ? "bg-[#FEE2E2]/60" : "hover:bg-gray-100"}
                `}
                onClick={() => handleSelectChat(chat.id)}
              >
                <div className="flex-1 min-w-0 pr-2">
                  {renamingId === chat.id ? (
                    <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                      <input
                        autoFocus
                        value={renameValue}
                        onChange={e => setRenameValue(e.target.value)}
                        onKeyDown={e => { if (e.key === "Enter") handleRenameConfirm(chat.id); if (e.key === "Escape") setRenamingId(null); }}
                        className="flex-1 text-xs border border-[#E63946] rounded px-1.5 py-0.5 outline-none"
                      />
                      <button onClick={() => handleRenameConfirm(chat.id)} className="text-[#E63946] hover:opacity-80">
                        <Check className="w-3 h-3" />
                      </button>
                    </div>
                  ) : (
                    <>
                      <p className="text-sm font-medium text-gray-800 truncate leading-tight">{chat.title}</p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {formatDistanceToNow(new Date(chat.updated_at), { addSuffix: true, locale: fr })}
                      </p>
                    </>
                  )}
                </div>

                {/* Actions on hover */}
                {renamingId !== chat.id && (
                  <div
                    className="absolute right-2 top-2 hidden group-hover:flex items-center gap-1"
                    onClick={e => e.stopPropagation()}
                  >
                    <button
                      onClick={() => handleRenameStart(chat)}
                      className="p-1 rounded hover:bg-gray-200 transition-colors"
                      title="Renommer"
                    >
                      <Pencil className="w-3 h-3 text-gray-500" />
                    </button>
                    {deleteConfirmId === chat.id ? (
                      <div className="flex items-center gap-1 bg-white border border-red-200 rounded px-2 py-1 shadow-sm">
                        <span className="text-xs text-red-600 whitespace-nowrap">Supprimer ?</span>
                        <button onClick={() => handleDelete(chat.id)} className="text-xs font-medium text-red-600 hover:text-red-800 ml-1">Oui</button>
                        <button onClick={() => setDeleteConfirmId(null)} className="text-xs text-gray-500 hover:text-gray-700 ml-1">Non</button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setDeleteConfirmId(chat.id)}
                        className="p-1 rounded hover:bg-red-100 transition-colors"
                        title="Supprimer"
                      >
                        <Trash2 className="w-3 h-3 text-gray-500" />
                      </button>
                    )}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </aside>

      {/* Main area */}
      <div className="flex flex-col flex-1 min-w-0 bg-white">
        {/* Compteur mensuel + bouton mobile */}
        <div className="flex items-center justify-between px-4 py-2 border-b border-[#E5E7EB] shrink-0">
          <button
            className="md:hidden p-2 rounded-lg hover:bg-gray-100"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="w-5 h-5 text-gray-600" />
          </button>
          <p className="text-xs ml-auto" style={{ color: counterColor }}>
            {questionsUsed >= questionsLimit
              ? `Limite atteinte — réinitialisation le 1er ${nextMonthStr}`
              : `${questionsUsed}/${questionsLimit} questions ce mois-ci`}
          </p>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
          {messages.length === 0 && !isLoading && (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <MessageSquare className="w-10 h-10 text-gray-200 mb-3" />
              <p className="text-sm text-gray-400">Posez votre première question à Aski…</p>
            </div>
          )}

          {messages.map(msg => (
            <div
              key={msg.id}
              className={`flex items-end gap-2 ${msg.role === "user" ? "justify-end" : "justify-start"}`}
            >
              {msg.role === "assistant" && (
                <div className="shrink-0 w-7 h-7 rounded-full bg-gradient-to-br from-[#E63946] to-[#c1121f] flex items-center justify-center text-white text-xs font-bold shadow-sm">
                  A
                </div>
              )}
              <div
                className={`
                  max-w-[75%] px-4 py-3 text-sm leading-relaxed
                  ${msg.role === "user"
                    ? "bg-[#FEE2E2] text-[#1A1A2E] rounded-[16px_16px_4px_16px]"
                    : "bg-[#F3F4F6] text-[#1A1A2E] rounded-[16px_16px_16px_4px]"
                  }
                `}
              >
                {msg.role === "assistant" ? (
                  <div className="prose prose-sm max-w-none prose-headings:text-[#1A1A2E] prose-p:text-[#1A1A2E] prose-li:text-[#1A1A2E] prose-strong:text-[#1A1A2E]">
                    <ReactMarkdown>{msg.content}</ReactMarkdown>
                  </div>
                ) : (
                  <span style={{ whiteSpace: "pre-wrap" }}>{msg.content}</span>
                )}
              </div>
            </div>
          ))}

          {/* Typing indicator */}
          {isLoading && (
            <div className="flex items-end gap-2 justify-start">
              <div className="shrink-0 w-7 h-7 rounded-full bg-gradient-to-br from-[#E63946] to-[#c1121f] flex items-center justify-center text-white text-xs font-bold shadow-sm">
                A
              </div>
              <div className="bg-[#F3F4F6] px-4 py-3 rounded-[16px_16px_16px_4px]">
                <div className="flex gap-1.5 items-center h-4">
                  {[0, 1, 2].map(i => (
                    <div
                      key={i}
                      className="w-2 h-2 rounded-full bg-gray-400"
                      style={{ animation: `pulse 1.2s ease-in-out ${i * 0.2}s infinite` }}
                    />
                  ))}
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="shrink-0 px-4 py-3 border-t border-[#E5E7EB]">
          <div className="relative flex items-center">
            <input
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
              placeholder={questionsUsed >= questionsLimit ? "Limite mensuelle atteinte" : "Posez votre question à Aski…"}
              disabled={isLoading || questionsUsed >= questionsLimit}
              className="w-full pr-12 pl-4 py-3 rounded-xl border border-[#E5E7EB] text-sm outline-none transition-all
                focus:border-[#E63946] focus:ring-2 focus:ring-[#E63946]/20
                disabled:opacity-50 disabled:cursor-not-allowed bg-white"
            />
            <button
              onClick={handleSend}
              disabled={isLoading || !input.trim() || questionsUsed >= questionsLimit}
              className="absolute right-3 p-1.5 rounded-lg bg-[#E63946] text-white hover:bg-[#c1121f] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              title="Envoyer"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
