import { useState, useRef, useEffect } from 'react';
import { Send } from 'lucide-react';
import { motion } from 'framer-motion';

export function ChatPanel({ messages, onSendMessage, onClose, isTripMode, username }) {
  const [text, setText] = useState('');
  const scrollRef = useRef(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (text.trim()) {
      onSendMessage(text.trim());
      setText('');
    }
  };

  return (
    <motion.div
      initial={{ x: '100%' }}
      animate={{ x: 0 }}
      exit={{ x: '100%' }}
      className={`fixed top-0 right-0 w-80 h-full z-40 flex flex-col border-l shadow-2xl backdrop-blur-xl ${
        isTripMode ? 'bg-black/60 border-white/10' : 'bg-white/80 border-zinc-200'
      }`}
    >
      <div className="p-4 border-b border-zinc-100 flex items-center justify-between">
        <h2 className={`font-bold text-sm uppercase tracking-widest ${isTripMode ? 'text-white' : 'text-zinc-900'}`}>
          Jam Chat
        </h2>
        <button onClick={onClose} className="text-zinc-400 hover:text-zinc-600">✕</button>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.map((m, i) => (
          <div key={i} className={`flex flex-col ${m.type === 'system' ? 'items-center' : m.username === username ? 'items-end' : 'items-start'}`}>
            {m.type === 'system' ? (
              <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-tighter bg-zinc-100/50 px-2 py-0.5 rounded-full mb-1">
                {m.text}
              </span>
            ) : (
              <>
                <span className="text-[10px] font-bold text-zinc-400 mb-1 px-1">{m.username}</span>
                <div className={`px-3 py-2 rounded-2xl text-xs max-w-[90%] wrap-break-word ${
                  m.username === username 
                    ? 'bg-zinc-900 text-white rounded-tr-none' 
                    : isTripMode ? 'bg-white/10 text-white rounded-tl-none' : 'bg-zinc-100 text-zinc-900 rounded-tl-none'
                }`}>
                  {m.text}
                </div>
              </>
            )}
          </div>
        ))}
      </div>

      <form onSubmit={handleSubmit} className="p-4 border-t border-zinc-100 flex space-x-2">
        <input
          type="text"
          placeholder="Say something..."
          value={text}
          onChange={(e) => setText(e.target.value)}
          className={`flex-1 px-4 py-2.5 rounded-xl text-xs border focus:ring-1 focus:outline-none transition-all ${
            isTripMode
              ? 'bg-white/5 border-white/10 text-white focus:ring-white/30 placeholder:text-zinc-500'
              : 'bg-zinc-50 border-zinc-200 text-zinc-900 focus:ring-zinc-400 placeholder:text-zinc-400'
          }`}
        />
        <button type="submit" className="p-2.5 bg-zinc-900 text-white rounded-xl hover:scale-105 active:scale-95 transition-all">
          <Send className="w-4 h-4" />
        </button>
      </form>
    </motion.div>
  );
}
