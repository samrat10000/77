import { useState } from 'react';
import { Link, X } from 'lucide-react';
import { detectMediaType } from '@/lib/detectMediaType';

export function MediaInput({ onLoad, isTripMode }) {
  const [value, setValue] = useState('');
  const [error, setError] = useState('');

  const handleLoad = () => {
    const type = detectMediaType(value.trim());
    if (!type) {
      setError('Paste a YouTube, video, or audio URL');
      return;
    }
    setError('');
    onLoad({ url: value.trim(), type });
    setValue('');
  };

  const handleKey = (e) => {
    if (e.key === 'Enter') handleLoad();
  };

  return (
    <div className="w-full space-y-2">
      <div className={`flex items-center rounded-xl border overflow-hidden transition-all ${
        isTripMode ? 'bg-white/5 border-white/10' : 'bg-zinc-50 border-zinc-200'
      }`}>
        <Link className={`ml-3 w-4 h-4 shrink-0 ${isTripMode ? 'text-zinc-400' : 'text-zinc-400'}`} />
        <input
          type="text"
          value={value}
          onChange={(e) => { setValue(e.target.value); setError(''); }}
          onKeyDown={handleKey}
          placeholder="Paste YouTube or media URL..."
          className={`flex-1 px-3 py-2.5 text-xs bg-transparent focus:outline-none ${
            isTripMode ? 'text-white placeholder:text-zinc-500' : 'text-zinc-900 placeholder:text-zinc-400'
          }`}
        />
        {value && (
          <button onClick={() => { setValue(''); setError(''); }} className="pr-2 text-zinc-400 hover:text-zinc-500">
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
      {error && <p className="text-[10px] text-red-400 font-medium px-1">{error}</p>}
      <button
        onClick={handleLoad}
        disabled={!value.trim()}
        className={`w-full py-2 rounded-xl text-[11px] font-bold uppercase tracking-widest transition-all disabled:opacity-30 ${
          isTripMode
            ? 'bg-white/10 text-white hover:bg-white/20'
            : 'bg-zinc-900 text-white hover:bg-zinc-700'
        }`}
      >
        Load Media
      </button>
    </div>
  );
}
