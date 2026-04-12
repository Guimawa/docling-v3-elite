import { useState, useRef, useEffect } from 'react';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

export default function PilotChat() {
  const [messages, setMessages] = useState<Message[]>([
    { id: '1', role: 'assistant', content: "Bonjour Sophie, je suis votre Pilot. Je connais parfaitement vos documents. Comment puis-je vous aider ?" }
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const sendMessage = async () => {
    if (!input.trim()) return;

    const userMsg: Message = { id: Date.now().toString(), role: 'user', content: input };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsTyping(true);

    try {
      const response = await fetch('https://docling-api.guimawa.workers.dev/api/v1/pilot/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }, // TODO: Add auth token
        body: JSON.stringify({ message: input })
      });
      
      const data = await response.json();
      
      const resp: Message = { 
        id: (Date.now() + 1).toString(), 
        role: 'assistant', 
        content: data.response || "Désolé Sophie, je rencontre une petite turbulence technique." 
      };
      setMessages(prev => [...prev, resp]);
    } catch (err) {
      console.error("Erreur Pilot:", err);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <div className="pilot-chat-container animate-in slide-in-from-right duration-500">
      <div className="chat-header">
         <div className="flex-row items-center">
            <div className="status-dot-active"></div>
            <h3 className="font-black text-white ml-2">Pilot Assistant</h3>
         </div>
         <span className="text-xs text-silver opacity-50">Powered by Gemini Pro</span>
      </div>

      <div className="chat-body" ref={scrollRef}>
        {messages.map(m => (
          <div key={m.id} className={`message-wrapper ${m.role}`}>
            <div className="message-bubble">
              {m.content}
            </div>
          </div>
        ))}
        {isTyping && (
           <div className="message-wrapper assistant">
              <div className="message-bubble typing">
                 <div className="typing-dot"></div>
                 <div className="typing-dot"></div>
                 <div className="typing-dot"></div>
              </div>
           </div>
        )}
      </div>

      <div className="chat-footer">
        <input 
          type="text" 
          placeholder="Demander au Pilot..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
        />
        <button onClick={sendMessage} className="btn-send">🚀</button>
      </div>

      <style>{`
        .pilot-chat-container {
          background: rgba(15, 23, 42, 0.8);
          backdrop-filter: blur(20px);
          border-left: 1px solid rgba(255,255,255,0.1);
          width: 350px;
          height: 100vh;
          display: flex;
          flex-direction: column;
          position: fixed;
          right: 0;
          top: 0;
          z-index: 1000;
        }
        .chat-header {
          padding: 30px;
          border-bottom: 1px solid rgba(255,255,255,0.05);
        }
        .status-dot-active {
          width: 8px;
          height: 8px;
          background: #10B981;
          border-radius: 50%;
          box-shadow: 0 0 10px #10B981;
        }
        .chat-body {
          flex: 1;
          overflow-y: auto;
          padding: 20px;
          display: flex;
          flex-direction: column;
          gap: 20px;
        }
        .message-wrapper {
          display: flex;
          width: 100%;
        }
        .message-wrapper.user { justify-content: flex-end; }
        .message-bubble {
          max-width: 80%;
          padding: 12px 18px;
          border-radius: 20px;
          font-size: 14px;
          line-height: 1.5;
        }
        .user .message-bubble {
          background: var(--accent-pronto);
          color: white;
          border-bottom-right-radius: 5px;
        }
        .assistant .message-bubble {
          background: rgba(255,255,255,0.05);
          color: #E2E8F0;
          border-bottom-left-radius: 5px;
          border: 1px solid rgba(255,255,255,0.05);
        }
        .chat-footer {
          padding: 30px;
          border-top: 1px solid rgba(255,255,255,0.05);
          display: flex;
          gap: 10px;
        }
        .chat-footer input {
          flex: 1;
          background: rgba(255,255,255,0.05);
          border: none;
          border-radius: 12px;
          padding: 12px 15px;
          color: white;
          font-size: 14px;
          outline: none;
        }
        .btn-send {
          background: var(--accent-pronto);
          border: none;
          width: 40px;
          height: 40px;
          border-radius: 12px;
          cursor: pointer;
        }
        .typing { display: flex; gap: 4px; padding: 10px 15px !important; }
        .typing-dot {
          width: 6px;
          height: 6px;
          background: #94A3B8;
          border-radius: 50%;
          animation: typing-bounce 1.4s infinite ease-in-out;
        }
        .typing-dot:nth-child(2) { animation-delay: 0.2s; }
        .typing-dot:nth-child(3) { animation-delay: 0.4s; }
        @keyframes typing-bounce {
          0%, 80%, 100% { transform: scale(0); }
          40% { transform: scale(1); }
        }
      `}</style>
    </div>
  );
}
