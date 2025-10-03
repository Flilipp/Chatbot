import { useState } from "react";
import { Plus, Send, Bot, Cpu, HardDrive, Zap } from "lucide-react";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

interface Conversation {
  id: string;
  title: string;
  lastMessage: Date;
}

const Index = () => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      role: "assistant",
      content: "Cześć! Jestem twoim lokalnym asystentem AI. W czym mogę pomóc?",
      timestamp: new Date(),
    },
  ]);
  const [inputValue, setInputValue] = useState("");
  const [activeConversationId, setActiveConversationId] = useState<string>("1");
  const [conversations] = useState<Conversation[]>([
    { id: "1", title: "Planowanie podróży", lastMessage: new Date() },
    { id: "2", title: "Przepis na ciasto", lastMessage: new Date() },
    { id: "3", title: "Pomoc w kodowaniu", lastMessage: new Date() },
    { id: "4", title: "Porady językowe", lastMessage: new Date() },
  ]);

  const handleSendMessage = () => {
    if (!inputValue.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: inputValue,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputValue("");

    // Simulate bot response
    setTimeout(() => {
      const botMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: "Rozumiem twoje pytanie. Pozwól, że się nad tym zastanowię...",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, botMessage]);
    }, 1000);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleNewChat = () => {
    setMessages([
      {
        id: Date.now().toString(),
        role: "assistant",
        content: "Cześć! Jestem twoim lokalnym asystentem AI. W czym mogę pomóc?",
        timestamp: new Date(),
      },
    ]);
  };

  return (
    <div className="flex h-screen w-full overflow-hidden">
      {/* Left Sidebar */}
      <aside
        className="flex flex-col w-[280px] border-r border-border"
        style={{ backgroundColor: "hsl(var(--sidebar-bg))" }}
      >
        {/* New Chat Button */}
        <div className="p-4">
          <button
            onClick={handleNewChat}
            className="flex items-center justify-center gap-2 w-full px-4 py-3 rounded-lg font-medium transition-all hover:scale-[1.02] active:scale-[0.98]"
            style={{
              backgroundColor: "hsl(var(--primary))",
              color: "hsl(var(--primary-foreground))",
            }}
          >
            <Plus className="w-5 h-5" />
            <span>Nowy Czat</span>
          </button>
        </div>

        {/* Conversation History */}
        <div className="flex-1 overflow-y-auto scrollbar-thin px-2">
          <div className="px-2 mb-2">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
              Historia Konwersacji
            </h2>
          </div>
          <div className="space-y-1">
            {conversations.map((conv) => (
              <button
                key={conv.id}
                onClick={() => setActiveConversationId(conv.id)}
                className="w-full text-left px-3 py-2.5 rounded-lg transition-colors text-sm"
                style={{
                  backgroundColor:
                    activeConversationId === conv.id
                      ? "hsl(var(--sidebar-active))"
                      : "transparent",
                  color: "hsl(var(--foreground))",
                }}
                onMouseEnter={(e) => {
                  if (activeConversationId !== conv.id) {
                    e.currentTarget.style.backgroundColor = "hsl(var(--sidebar-hover))";
                  }
                }}
                onMouseLeave={(e) => {
                  if (activeConversationId !== conv.id) {
                    e.currentTarget.style.backgroundColor = "transparent";
                  }
                }}
              >
                {conv.title}
              </button>
            ))}
          </div>
        </div>

        {/* Resource Monitor */}
        <div className="p-4 border-t border-border">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
            Monitor Zasobów
          </h3>
          <div className="space-y-2.5">
            <div className="flex items-center gap-2 text-sm">
              <Cpu className="w-4 h-4 text-primary" />
              <span className="text-foreground">CPU: 15%</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <HardDrive className="w-4 h-4 text-primary" />
              <span className="text-foreground">RAM: 45%</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Zap className="w-4 h-4 text-primary" />
              <span className="text-foreground">VRAM: 60%</span>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Chat Area */}
      <main
        className="flex-1 flex flex-col"
        style={{ backgroundColor: "hsl(var(--chat-bg))" }}
      >
        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto scrollbar-thin p-6 space-y-6">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex gap-3 ${
                message.role === "user" ? "flex-row-reverse" : "flex-row"
              }`}
            >
              {message.role === "assistant" && (
                <div
                  className="flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center"
                  style={{ backgroundColor: "hsl(var(--primary))" }}
                >
                  <Bot className="w-5 h-5" style={{ color: "hsl(var(--primary-foreground))" }} />
                </div>
              )}

              <div
                className={`relative max-w-[70%] px-4 py-3 rounded-2xl ${
                  message.role === "user" ? "rounded-tr-sm" : "rounded-tl-sm"
                }`}
                style={{
                  backgroundColor:
                    message.role === "user"
                      ? "hsl(var(--user-message))"
                      : "hsl(var(--bot-message))",
                  color:
                    message.role === "user"
                      ? "hsl(var(--user-message-text))"
                      : "hsl(var(--bot-message-text))",
                }}
              >
                <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.content}</p>
              </div>

              {message.role === "user" && <div className="flex-shrink-0 w-8" />}
            </div>
          ))}
        </div>

        {/* Input Area */}
        <div className="border-t border-border p-4">
          <div className="max-w-4xl mx-auto flex gap-3 items-end">
            <div className="flex-1 relative">
              <textarea
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Napisz swoją wiadomość..."
                rows={1}
                className="w-full px-4 py-3 rounded-xl resize-none focus:outline-none focus:ring-2 transition-all text-sm"
                style={{
                  backgroundColor: "hsl(var(--input))",
                  color: "hsl(var(--foreground))",
                  borderColor: "hsl(var(--border))",
                  border: "1px solid",
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = "hsl(var(--ring))";
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = "hsl(var(--border))";
                }}
              />
            </div>
            <button
              onClick={handleSendMessage}
              disabled={!inputValue.trim()}
              className="flex items-center justify-center px-5 py-3 rounded-xl font-medium transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
              style={{
                backgroundColor: "hsl(var(--primary))",
                color: "hsl(var(--primary-foreground))",
              }}
            >
              <Send className="w-5 h-5" />
            </button>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Index;
