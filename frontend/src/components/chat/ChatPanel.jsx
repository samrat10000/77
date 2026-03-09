import { useState, useRef, useEffect } from 'react';
import { Send, X, MessageSquare } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

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
      initial={{ x: '100%', opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: '100%', opacity: 0 }}
      transition={{ type: 'spring', damping: 30, stiffness: 250 }}
      className={`fixed top-0 right-0 w-80 md:w-[22rem] h-full z-40 flex flex-col shadow-2xl backdrop-blur-3xl ${
        isTripMode ? 'bg-black/60 border-l border-white/5' : 'bg-white/80 border-l border-zinc-200/50'
      }`}
    >
      {/* Header */}
      <div className={`p-6 flex items-center justify-between border-b ${
        isTripMode ? 'border-white/5' : 'border-zinc-200/50'
      }`}>
        <div className="flex items-center space-x-3">
          <div className={`flex items-center justify-center w-8 h-8 rounded-full ${isTripMode ? 'bg-white/10' : 'bg-zinc-100'}`}>
            <MessageSquare className={`w-3.5 h-3.5 ${isTripMode ? 'text-white' : 'text-zinc-900'}`} />
          </div>
          <div className="flex flex-col">
            <h2 className={`font-serif text-sm tracking-tight ${isTripMode ? 'text-white' : 'text-zinc-900'}`}>
              Session Chat
            </h2>
            <p className="text-[10px] font-mono text-zinc-400">
              {messages.length} message{messages.length !== 1 && 's'}
            </p>
          </div>
        </div>
        <button 
          onClick={onClose} 
          className={`p-2 rounded-full transition-colors duration-200 ${
            isTripMode ? 'hover:bg-white/10 text-zinc-500 hover:text-zinc-300' : 'hover:bg-zinc-100 text-zinc-400 hover:text-zinc-600'
          }`}
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Messages Area */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-6 scroll-smooth">
        <AnimatePresence initial={false}>
          {messages.map((m, i) => {
            const isMe = m.username === username;
            const isSystem = m.type === 'system';

            if (isSystem) {
              return (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex justify-center my-6"
                >
                  <span className={`text-[10px] font-mono tracking-wider px-4 py-1.5 rounded-full border ${
                    isTripMode ? 'bg-white/5 border-white/10 text-zinc-400' : 'bg-zinc-50 border-zinc-200 text-zinc-500'
                  }`}>
                    {m.text}
                  </span>
                </motion.div>
              );
            }

            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
              >
                {!isMe && (
                  <span className="text-[10px] font-mono text-zinc-400 mb-2 ml-1">
                    {m.username}
                  </span>
                )}
                <div 
                  className={`px-4 py-3 text-sm max-w-[85%] wrap-break-word font-light leading-relaxed ${
                    isMe 
                      ? isTripMode ? 'bg-white text-black rounded-2xl rounded-tr-sm' : 'bg-zinc-900 text-white rounded-2xl rounded-tr-sm'
                      : isTripMode ? 'bg-white/10 text-white rounded-2xl rounded-tl-sm' : 'bg-zinc-100 text-zinc-800 rounded-2xl rounded-tl-sm'
                  }`}
                >
                  {m.text}
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {/* Input Area */}
      <div className={`p-5 ${isTripMode ? 'bg-black/40' : 'bg-zinc-50/50'}`}>
        <form onSubmit={handleSubmit} className="relative flex items-center group">
          <input
            type="text"
            placeholder="Type a message..."
            value={text}
            onChange={(e) => setText(e.target.value)}
            className={`w-full pl-5 pr-12 py-3 rounded-2xl text-sm font-light focus:outline-none transition-all ${
              isTripMode
                ? 'bg-white/5 border border-white/10 text-white focus:bg-white/10 placeholder:text-zinc-600'
                : 'bg-white border border-zinc-200 text-zinc-900 focus:border-zinc-300 placeholder:text-zinc-400'
            }`}
          />
          <button 
            type="submit" 
            disabled={!text.trim()}
            className={`absolute right-2 p-1.5 rounded-xl transition-all duration-200 ${
              text.trim() ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2 pointer-events-none'
            } ${
              isTripMode ? 'bg-white text-black hover:bg-zinc-200' : 'bg-zinc-900 text-white hover:bg-zinc-700'
            }`}
          >
            <Send className="w-3.5 h-3.5 ml-0.5" />
          </button>
        </form>
      </div>
    </motion.div>
  );
}

