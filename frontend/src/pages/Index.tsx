import { useState, useEffect, useRef } from "react";
import { Plus, Send, Bot, Cpu, HardDrive, Zap, Trash2, Copy, Settings } from "lucide-react";
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';

// --- Definicje typów ---
interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
}
interface Conversation {
  id: string;
  title: string;
}
interface SystemStats {
  cpu: number | string;
  ram: number | string;
  vram: number | string;
}

// --- Komponent do podświetlania kodu ---
const CodeBlock = ({ node, inline, className, children, ...props }: any) => {
  const match = /language-(\w+)/.exec(className || '');
  return !inline && match ? (
    <SyntaxHighlighter style={vscDarkPlus} language={match[1]} PreTag="div" {...props}>
      {String(children).replace(/\n$/, '')}
    </SyntaxHighlighter>
  ) : (
    <code className={className} {...props}>
      {children}
    </code>
  );
};

// --- Główny komponent aplikacji ---
const Index = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>("new");
  const [systemStats, setSystemStats] = useState<SystemStats>({ cpu: 0, ram: 0, vram: "N/A" });
  const [systemPrompt, setSystemPrompt] = useState("");
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const chatEndRef = useRef<HTMLDivElement>(null);

  const fetchConversations = async () => {
    try {
      const response = await fetch("http://127.0.0.1:8000/api/conversations");
      const data: Conversation[] = await response.json();
      setConversations(data);
    } catch (error) { console.error("Błąd podczas wczytywania listy konwersacji:", error); }
  };

  const fetchStats = async () => {
    try {
      const response = await fetch("http://127.0.0.1:8000/api/stats");
      const data = await response.json();
      setSystemStats(data);
    } catch (error) { console.error("Błąd pobierania statystyk:", error); }
  };

  useEffect(() => {
    fetchConversations();
    const statsInterval = setInterval(fetchStats, 3000);
    return () => clearInterval(statsInterval);
  }, []);

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  const handleSendMessage = async () => {
    if (!inputValue.trim()) return;
    const userMessage: Message = { id: Date.now().toString(), role: "user", content: inputValue };
    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setInputValue("");
    const botMessageId = (Date.now() + 1).toString();
    setMessages((prev) => [...prev, { id: botMessageId, role: "assistant", content: "" }]);
    let finalMessages = [...updatedMessages];
    let fullResponse = "";
    try {
      const response = await fetch("http://127.0.0.1:8000/api/chat", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: updatedMessages.map(({ id, ...rest }) => rest), system_prompt: systemPrompt }),
      });
      if (!response.body) return;
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        const jsonChunks = chunk.split('\n').filter(Boolean);
        for (const jsonChunk of jsonChunks) {
          const parsed = JSON.parse(jsonChunk);
          if (parsed.message?.content) {
            fullResponse += parsed.message.content;
            setMessages((prev) => prev.map((msg) => msg.id === botMessageId ? { ...msg, content: fullResponse } : msg));
          }
        }
      }
    } catch (error) {
      console.error("Błąd połączenia z API:", error);
      setMessages((prev) => prev.map((msg) => msg.id === botMessageId ? { ...msg, content: "Błąd połączenia z serwerem." } : msg));
    } finally {
      finalMessages.push({ id: botMessageId, role: "assistant", content: fullResponse });
      const currentConvId = activeConversationId || "new";
      const response = await fetch("http://127.0.0.1:8000/api/conversations", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: currentConvId, messages: finalMessages.map(({ id, ...rest }) => rest), system_prompt: systemPrompt }),
      });
      const data = await response.json();
      if(currentConvId === "new"){ setActiveConversationId(data.conversation_id); }
      fetchConversations();
    }
  };

  const handleSelectConversation = async (conversationId: string) => {
    try {
        const response = await fetch(`http://127.0.0.1:8000/api/conversations/${conversationId}`);
        const data = await response.json();
        const messagesWithIds = data.messages.map((msg: Omit<Message, 'id'>) => ({...msg, id: Math.random().toString()}));
        setMessages(messagesWithIds);
        setSystemPrompt(data.system_prompt || "");
        setActiveConversationId(conversationId);
    } catch (error) { console.error("Błąd wczytywania konwersacji:", error); }
  };

  const handleDeleteConversation = async (conversationId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm("Czy na pewno chcesz usunąć tę rozmowę?")) return;
    try {
      await fetch(`http://127.0.0.1:8000/api/conversations/${conversationId}`, { method: 'DELETE' });
      if (activeConversationId === conversationId) { handleNewChat(); }
      fetchConversations();
    } catch (error) { console.error("Błąd podczas usuwania konwersacji:", error); }
  };

  const handleNewChat = () => { setActiveConversationId("new"); setMessages([]); setSystemPrompt(""); };
  const handleKeyPress = (e: React.KeyboardEvent) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSendMessage(); } };
  const handleCopy = (text: string) => { navigator.clipboard.writeText(text); };

  return (
    <div className="flex h-screen w-full overflow-hidden bg-[hsl(var(--chat-bg))] text-[hsl(var(--foreground))]">
      <aside className="flex flex-col w-[280px] border-r border-border bg-[hsl(var(--sidebar-bg))]">
        <div className="p-4 flex gap-2">
          <button onClick={handleNewChat} className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-medium transition-all hover:scale-[1.02] active:scale-[0.98] bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))]"><Plus className="w-5 h-5" /> <span>Nowy Czat</span></button>
          <button onClick={() => setIsSettingsOpen(!isSettingsOpen)} className="p-3 rounded-lg transition-colors hover:bg-[hsl(var(--sidebar-hover))]"><Settings className="w-5 h-5" /></button>
        </div>
        {isSettingsOpen && (
          <div className="p-4 border-y border-border">
            <label className="text-sm font-semibold text-muted-foreground">Własny prompt systemowy</label>
            <textarea value={systemPrompt} onChange={(e) => setSystemPrompt(e.target.value)} placeholder="np. Jesteś sarkastycznym piratem..." rows={3} className="mt-2 w-full p-2 rounded-md resize-none text-sm bg-[hsl(var(--input))] border border-[hsl(var(--border))]" />
          </div>
        )}
        <div className="flex-1 overflow-y-auto scrollbar-thin px-2">
          <div className="px-2 mb-2"><h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Historia Konwersacji</h2></div>
          <div className="space-y-1">
            {conversations.map((conv) => (
              <div key={conv.id} className={`group flex items-center justify-between w-full rounded-lg transition-colors ${activeConversationId === conv.id ? "bg-[hsl(var(--sidebar-active))]" : "hover:bg-[hsl(var(--sidebar-hover))]"}`}>
                <button onClick={() => handleSelectConversation(conv.id)} className="flex-1 text-left px-3 py-2.5 text-sm">{conv.title}</button>
                <button onClick={(e) => handleDeleteConversation(conv.id, e)} className="p-2 rounded-md opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-red-500 hover:bg-red-500/10"><Trash2 className="w-4 h-4" /></button>
              </div>
            ))}
          </div>
        </div>
        <div className="p-4 border-t border-border"><h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Monitor Zasobów</h3><div className="space-y-2.5 text-sm">
            <div className="flex items-center gap-2"><Cpu className="w-4 h-4 text-primary" /><span>CPU: {systemStats.cpu}%</span></div>
            <div className="flex items-center gap-2"><HardDrive className="w-4 h-4 text-primary" /><span>RAM: {systemStats.ram}%</span></div>
            <div className="flex items-center gap-2"><Zap className="w-4 h-4 text-primary" /><span>VRAM: {systemStats.vram === "N/A" ? "N/A" : `${systemStats.vram}%`}</span></div>
        </div></div>
      </aside>
      <main className="flex-1 flex flex-col">
        {messages.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-4">
            <div className="w-16 h-16 mb-4 flex items-center justify-center rounded-2xl bg-[hsl(var(--primary))]"><Bot className="w-8 h-8 text-[hsl(var(--primary-foreground))]" /></div>
            <h2 className="text-2xl font-bold">Lokalny Asystent AI</h2>
            <p className="text-muted-foreground max-w-sm mt-2">Zacznij rozmowę wpisując wiadomość poniżej lub wybierz konwersację z historii.</p>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto scrollbar-thin p-6 space-y-6">
            {messages.map((message) => (
              <div key={message.id} className={`group flex gap-3 ${message.role === "user" ? "flex-row-reverse" : "flex-row"}`}>
                {message.role === "assistant" && <div className="flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center bg-[hsl(var(--primary))]"><Bot className="w-5 h-5 text-[hsl(var(--primary-foreground))]" /></div>}
                <div className={`relative max-w-[70%] px-4 py-3 rounded-2xl ${message.role === "user" ? "rounded-tr-sm bg-[hsl(var(--user-message))] text-[hsl(var(--user-message-text))]" : "rounded-tl-sm bg-[hsl(var(--bot-message))] text-[hsl(var(--bot-message-text))]"}`}>
                  <ReactMarkdown components={{ code: CodeBlock }}>{message.content}</ReactMarkdown>
                  {message.role === 'assistant' && message.content && (
                    <button onClick={() => handleCopy(message.content)} className="absolute top-1 right-1 p-1 rounded-md opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:bg-white/10"><Copy className="w-3 h-3" /></button>
                  )}
                </div>
              </div>
            ))}
             <div ref={chatEndRef} />
          </div>
        )}
        <div className="border-t border-border p-4">
            <div className="max-w-4xl mx-auto flex gap-3 items-end">
                <textarea value={inputValue} onChange={(e) => setInputValue(e.target.value)} onKeyPress={handleKeyPress} placeholder="Napisz swoją wiadomość..." rows={1} className="flex-1 w-full px-4 py-3 rounded-xl resize-none focus:outline-none focus:ring-2 transition-all text-sm bg-[hsl(var(--input))] border border-[hsl(var(--border))] focus:border-[hsl(var(--ring))]" />
                <button onClick={handleSendMessage} disabled={!inputValue.trim()} className="flex items-center justify-center px-5 py-3 rounded-xl font-medium transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))]"><Send className="w-5 h-5" /></button>
            </div>
        </div>
      </main>
    </div>
  );
};

export default Index;