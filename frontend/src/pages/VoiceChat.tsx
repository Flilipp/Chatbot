import { useState, useRef, useEffect } from 'react';
import Navigation from '@/components/Navigation';

interface Message { role: 'user' | 'assistant'; content: string; }

const VoiceChat = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [error, setError] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const startRecording = async () => {
    // TODO: Jutro podłączymy to do naszego backendu
    setError("Funkcja zostanie dodana jutro!");
  };

  const stopRecording = () => { /* Pusta funkcja na razie */ };

  return (
    <div className="min-h-screen bg-gray-800 flex flex-col">
      <Navigation />
      <div className="flex-1 max-w-4xl mx-auto w-full p-8">
        <h1 className="text-4xl font-bold text-white mb-8">Czat Głosowy z AI</h1>
        <div className="bg-gray-900 rounded-lg p-6 mb-6 h-96 overflow-y-auto">
          {messages.length === 0 ? (
            <div className="text-center text-gray-400 mt-20">Naciśnij przycisk mikrofonu, aby rozpocząć rozmowę (Jutro!)</div>
          ) : (
            messages.map((message, index) => (
              <div key={index} className={`mb-4 ${message.role === 'user' ? 'text-right' : 'text-left'}`}>
                <div className={`inline-block px-4 py-2 rounded-lg ${message.role === 'user' ? 'bg-blue-600 text-white' : 'bg-gray-700 text-white'}`}>{message.content}</div>
              </div>
            ))
          )}
          <div ref={messagesEndRef} />
        </div>
        {error && <div className="p-4 bg-red-900/50 border border-red-500 rounded-lg text-red-200 mb-6">{error}</div>}
        <div className="flex justify-center">
          <button onClick={isRecording ? stopRecording : startRecording} disabled={isSpeaking} className={`w-20 h-20 rounded-full flex items-center justify-center text-white font-bold text-2xl transition-all disabled:opacity-50 ${isRecording ? 'bg-red-600 hover:bg-red-700 animate-pulse' : 'bg-blue-600 hover:bg-blue-700'}`}>
            {isRecording ? '⏹' : '🎤'}
          </button>
        </div>
        <div className="text-center mt-4 text-gray-400 text-sm">
          {isRecording && 'Nagrywanie... Kliknij aby zatrzymać'}
          {isSpeaking && 'AI mówi...'}
          {!isRecording && !isSpeaking && 'Kliknij mikrofon aby nagrać wiadomość'}
        </div>
      </div>
    </div>
  );
};

export default VoiceChat;