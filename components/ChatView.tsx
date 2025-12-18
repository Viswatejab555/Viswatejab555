import React, { useState, useRef, useEffect } from 'react';
import { ChatMessage, Memory } from '../types';
import { getMemories } from '../services/storageService';
import { askMemory } from '../services/geminiService';
import { useSpeechRecognition } from '../hooks/useSpeechRecognition';

const ChatView: React.FC = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    { id: 'init', role: 'model', text: 'Ask me anything about your saved memories.' }
  ]);
  const [input, setInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const { 
    isListening, 
    transcript, 
    interimTranscript,
    startListening, 
    stopListening,
    resetTranscript 
  } = useSpeechRecognition();

  // Sync speech transcript to input field
  useEffect(() => {
    if (isListening) {
      setInput(transcript + (interimTranscript ? ' ' + interimTranscript : ''));
    }
  }, [transcript, interimTranscript, isListening]);

  // Auto-scroll
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isProcessing]);

  const handleSend = async () => {
    const text = input.trim();
    if (!text || isProcessing) return;

    // Reset speech state if it was used
    if (isListening) stopListening();
    resetTranscript();

    const userMsg: ChatMessage = { id: Date.now().toString(), role: 'user', text };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsProcessing(true);

    try {
      const memories = getMemories();
      const answer = await askMemory(text, memories);
      
      const aiMsg: ChatMessage = { 
        id: (Date.now() + 1).toString(), 
        role: 'model', 
        text: answer 
      };
      setMessages(prev => [...prev, aiMsg]);
    } catch (e) {
      console.error(e);
      setMessages(prev => [...prev, { id: Date.now().toString(), role: 'model', text: "Something went wrong retrieving that memory." }]);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex flex-col h-full bg-zinc-950">
       <div className="px-6 pt-6 pb-4 bg-zinc-950 border-b border-zinc-900 sticky top-0 z-10">
        <h1 className="text-2xl font-bold text-white tracking-tight">Ask AI</h1>
        <p className="text-zinc-500 text-sm mt-1">Powered by Gemini 3 Flash</p>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4" ref={scrollRef}>
        {messages.map((msg) => (
          <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`
              max-w-[85%] rounded-2xl px-5 py-3 text-sm leading-relaxed
              ${msg.role === 'user' 
                ? 'bg-blue-600 text-white rounded-br-none' 
                : 'bg-zinc-800 text-zinc-200 rounded-bl-none border border-zinc-700'}
            `}>
              {msg.text}
            </div>
          </div>
        ))}
        {isProcessing && (
           <div className="flex justify-start">
             <div className="bg-zinc-800 rounded-2xl rounded-bl-none px-5 py-4 flex gap-1 items-center border border-zinc-700">
               <div className="w-2 h-2 bg-zinc-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
               <div className="w-2 h-2 bg-zinc-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
               <div className="w-2 h-2 bg-zinc-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
             </div>
           </div>
        )}
      </div>

      <div className="p-4 bg-zinc-950 border-t border-zinc-900 pb-24">
        <div className="flex gap-2 items-end bg-zinc-900 p-2 rounded-3xl border border-zinc-800 focus-within:border-blue-500/50 transition-colors">
            <button
              onClick={isListening ? stopListening : startListening}
              className={`p-3 rounded-full transition-all ${isListening ? 'bg-red-500/20 text-red-500 animate-pulse' : 'text-zinc-400 hover:text-white'}`}
            >
               <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
               </svg>
            </button>
            <textarea
              rows={1}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyPress}
              placeholder="Ask me something..."
              className="flex-1 bg-transparent text-white placeholder-zinc-500 focus:outline-none py-3 px-2 resize-none max-h-24"
            />
            <button
              onClick={handleSend}
              disabled={!input.trim() || isProcessing}
              className="p-3 bg-blue-600 rounded-full text-white disabled:opacity-50 disabled:bg-zinc-700 transition-all hover:bg-blue-500"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 rotate-90" viewBox="0 0 20 20" fill="currentColor">
                <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
              </svg>
            </button>
        </div>
      </div>
    </div>
  );
};

export default ChatView;