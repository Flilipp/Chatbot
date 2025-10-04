import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Send, Bot, Cpu, HardDrive, Zap, Trash2 } from 'lucide-react';
import Navigation from '@/components/Navigation';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

interface Conversation {
  id: string;
  title: string;
}

const Index = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Sprawdzenie "sesji" i wczytanie danych
  useEffect(() => {
    if (!localStorage.getItem('auth-session')) {
      navigate('/auth');
    } else {
      fetchConversations();
      handleNewChat(); // Rozpocznij z czystą kartą
      setLoading(false);
    }
  }, [navigate]);

  // Automatyczne przewijanie
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Pobierz listę konwersacji z naszego API
  const fetchConversations = async () => {
    try {
        const response = await fetch("http://127.0.0.1:8000/api/conversations");
        if (!response.ok) throw new Error("Błąd sieci");
        const data = await response.json();
        setConversations(data);
    } catch (error) {
        console.error("Nie udało się wczytać konwersacji:", error);
    }
  };

  const handleSendMessage = async () => {
    if (!inputValue.trim()) return;

    const userMessage: Message = { id: Date.now().toString(), role: 'user', content: inputValue };
    const currentMessages = [...messages, userMessage];
    setMessages(currentMessages);
    setInputValue('');

    const botMessageId = (Date.now() + 1).toString();
    setMessages((prev) => [...prev, { id: botMessageId, role: "assistant", content: "" }]);

    let fullResponse = "";
    try {
        const response = await fetch("http://127.0.0.1:8000/api/chat", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ messages: currentMessages.map(({ id, ...rest }) => rest) }),
        });

        if (!response.body) throw new Error("Brak ciała odpowiedzi");

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            const chunk = decoder.decode(value, { stream: true });
            const jsonChunks = chunk.split('\n').filter(Boolean);
            for(const jsonChunk of jsonChunks) {
                try {
                    const parsed = JSON.parse(jsonChunk);
                    if(parsed.message?.content) {
                        fullResponse += parsed.message.content;
                        setMessages((prev) => prev.map((msg) => msg.id === botMessageId ? { ...msg, content: fullResponse } : msg));
                    }
                } catch(e) {
                    console.error("Błąd parsowania JSON:", e, jsonChunk);
                }
            }
        }

        const finalMessages = [...currentMessages, { id: botMessageId, role: 'assistant', content: fullResponse }];
        const saveResponse = await fetch("http://127.0.0.1:8000/api/conversations", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id: activeConversationId || "new", messages: finalMessages.map(({ id, ...rest }) => rest) }),
        });
        const data = await saveResponse.json();
        if (activeConversationId === null) {
            setActiveConversationId(data.conversation_id);
        }
        await fetchConversations();

    } catch (error) {
        console.error("Błąd wysyłania wiadomości:", error);
        setMessages(prev => prev.map(msg => msg.id === botMessageId ? {...msg, content: "Wystąpił błąd."} : msg));
    }
  };

  const handleSelectConversation = async (conversationId: string) => {
    try {
        const response = await fetch(`http://127.0.0.1:8000/api/conversations/${conversationId}`);
        const data = await response.json();
        setMessages(data.messages.map((msg: any) => ({ ...msg, id: Math.random().toString() })));
        setActiveConversationId(conversationId);
    } catch(error) {
        console.error("Nie udało się wczytać konwersacji:", error);
    }
  };

  const handleDeleteConversation = async (e: React.MouseEvent, conversationId: string) => {
    e.stopPropagation();
    if (window.confirm("Na pewno usunąć tę konwersację?")) {
        try {
            await fetch(`http://127.0.0.1:8000/api/conversations/${conversationId}`, { method: 'DELETE' });
            if (activeConversationId === conversationId) {
                handleNewChat();
            }
            await fetchConversations();
        } catch (error) {
            console.error("Błąd usuwania:", error);
        }
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleNewChat = () => {
    setMessages([]);
    setActiveConversationId(null);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-800 flex items-center justify-center">
        <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-gray-800 text-white font-sans">
      <Navigation />
      <div className="flex flex-1 overflow-hidden">
        <aside className="flex flex-col w-[280px] border-r border-gray-700 bg-gray-900">
          <div className="p-4">
            <button
              onClick={handleNewChat}
              className="flex items-center justify-center gap-2 w-full px-4 py-3 rounded-lg font-medium transition-all bg-blue-600 hover:bg-blue-700"
            >
              <Plus className="w-5 h-5" />
              <span>Nowy Czat</span>
            </button>
          </div>

          <div className="flex-1 overflow-y-auto scrollbar-thin px-2">
            <div className="px-2 mb-2">
              <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">
                Historia Konwersacji
              </h2>
            </div>
            <div className="space-y-1">
              {conversations.map((conv) => (
                <div key={conv.id} className={`group flex items-center justify-between w-full rounded-lg transition-colors ${activeConversationId === conv.id ? "bg-gray-700" : "hover:bg-gray-800"}`}>
                    <button
                        onClick={() => handleSelectConversation(conv.id)}
                        className="flex-1 text-left px-3 py-2.5 text-sm truncate"
                    >
                        {conv.title}
                    </button>
                    <button onClick={(e) => handleDeleteConversation(e, conv.id)} className="p-2 rounded-md opacity-0 group-hover:opacity-100 transition-opacity text-gray-400 hover:text-red-500">
                        <Trash2 className="w-4 h-4" />
                    </button>
                </div>
              ))}
            </div>
          </div>

          <div className="p-4 border-t border-gray-700">
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
              Monitor Zasobów (placeholder)
            </h3>
            <div className="space-y-2.5">
              <div className="flex items-center gap-2 text-sm"><Cpu className="w-4 h-4 text-blue-500" /><span>CPU: --%</span></div>
              <div className="flex items-center gap-2 text-sm"><HardDrive className="w-4 h-4 text-blue-500" /><span>RAM: --%</span></div>
              <div className="flex items-center gap-2 text-sm"><Zap className="w-4 h-4 text-blue-500" /><span>VRAM: --%</span></div>
            </div>
          </div>
        </aside>

        <main className="flex-1 flex flex-col bg-gray-800">
          <div className="flex-1 overflow-y-auto scrollbar-thin p-6 space-y-6">
            {messages.map((message) => (
              <div key={message.id} className={`flex gap-3 ${message.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                {message.role === 'assistant' && (
                  <div className="flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center bg-blue-600">
                    <Bot className="w-5 h-5 text-white" />
                  </div>
                )}
                <div className={`relative max-w-[70%] px-4 py-3 rounded-2xl ${message.role === 'user' ? 'rounded-tr-sm bg-blue-600' : 'rounded-tl-sm bg-gray-700'}`}>
                  <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.content}</p>
                </div>
                {message.role === 'user' && <div className="flex-shrink-0 w-8" />}
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          <div className="border-t border-gray-700 p-4">
            <div className="max-w-4xl mx-auto flex gap-3 items-end">
              <textarea
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Napisz swoją wiadomość..."
                rows={1}
                className="w-full px-4 py-3 rounded-xl resize-none bg-gray-700 border border-gray-600 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all text-sm"
              />
              <button
                onClick={handleSendMessage}
                disabled={!inputValue.trim()}
                className="flex items-center justify-center px-5 py-3 rounded-xl font-medium transition-all bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
              >
                <Send className="w-5 h-5" />
              </button>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default Index;