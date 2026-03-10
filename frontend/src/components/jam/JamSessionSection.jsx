import { Zap, Users, Share2, LogOut, Pen, Trash2, Heart, Flame, Music4, Sparkles, PartyPopper } from "lucide-react";

export function JamSessionSection({
  isJoined,
  isTripMode,
  isDarkMode,
  setIsTripMode,
  handleSendReaction,
  handleCreateSession,
  handleJoinSession,
  joinId,
  setJoinId,
  isHost,
  setIsChatOpen,
  handleLeaveSession,
  sessionId,
  participants,
  onSendNudge,
  isDoodling,
  setIsDoodling,
  onClearSketch,
}) {
  const dark = isDarkMode && !isTripMode;

  return (
    <>
      <div className="flex flex-col items-center space-y-6 w-full">
        {isJoined && (
          <div className={`flex items-center space-x-4 p-2 px-4 rounded-2xl border relative z-100 ${
            isTripMode ? 'bg-white/5 border-white/10' : dark ? 'bg-zinc-800 border-zinc-700' : 'bg-zinc-50 border-zinc-100'
          }`}>
            {[
              { type: 'heart', Icon: Heart, color: 'text-rose-500' },
              { type: 'fire', Icon: Flame, color: 'text-orange-500' },
              { type: 'music', Icon: Music4, color: 'text-purple-500' },
              { type: 'sparkle', Icon: Sparkles, color: 'text-yellow-500' },
              { type: 'party', Icon: PartyPopper, color: 'text-blue-500' }
            ].map(({ type, Icon, color }) => (
              <button
                key={type}
                onClick={() => handleSendReaction(type)}
                className={`p-1 rounded-lg transition-all hover:scale-125 active:scale-90 group relative`}
              >
                <Icon className={`w-5 h-5 transition-all ${
                  isTripMode ? 'text-white/40 group-hover:text-white' : `text-zinc-400 group-hover:${color}`
                }`} />
              </button>
            ))}
            <div className="w-px h-4 bg-zinc-200/20 mx-1" />
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setIsDoodling(!isDoodling)}
                className={`p-1.5 rounded-full transition-all hover:scale-125 active:scale-90 ${
                  isDoodling 
                    ? (isTripMode ? 'bg-white text-black' : 'bg-rose-500 text-white shadow-lg shadow-rose-500/30') 
                    : (isTripMode ? 'bg-white/10 text-white' : 'bg-white border border-zinc-200 text-zinc-400')
                }`}
                title={isDoodling ? "Stop Doodling" : "Start Doodling"}
              >
                <Pen className="w-3.5 h-3.5" />
              </button>
              
              {isDoodling && (
                <button
                  onClick={onClearSketch}
                  className={`p-1.5 rounded-full transition-all hover:scale-125 active:scale-90 ${
                    isTripMode ? 'bg-white/10 text-white hover:bg-white/20' : 'bg-zinc-100 text-zinc-400 hover:text-rose-500'
                  }`}
                  title="Clear All Doodles"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}

              <button
                onClick={onSendNudge}
                className={`p-1.5 rounded-full transition-all hover:scale-125 active:scale-90 ${
                  isTripMode ? 'bg-white/10 text-white' : 'bg-rose-500 text-white shadow-lg shadow-rose-500/30'
                }`}
                title="Send Vibe"
              >
                <Zap className="w-3.5 h-3.5 fill-current" />
              </button>
            </div>
          </div>
        )}

        <button
          onClick={() => setIsTripMode(!isTripMode)}
          className={`flex items-center space-x-2 px-6 py-2 rounded-full border transition-all duration-300 group relative z-100 ${
            isTripMode
              ? 'bg-white/20 border-white/40 text-white hover:bg-white/30'
              : dark
              ? 'bg-zinc-800 border-zinc-700 text-zinc-300 hover:bg-zinc-700'
              : 'bg-zinc-100 border-zinc-200 text-zinc-600 hover:bg-zinc-200 hover:border-zinc-300'
          }`}
        >
          <Zap className={`w-4 h-4 ${isTripMode ? 'fill-white animate-pulse' : dark ? 'text-zinc-500 group-hover:text-zinc-300' : 'text-zinc-400 group-hover:text-zinc-600'}`} />
          <span className="text-[10px] font-bold tracking-widest uppercase">Trip Mode</span>
        </button>
      </div>

      <div className={`w-full pt-6 border-t ${isTripMode ? 'border-white/10' : dark ? 'border-zinc-800' : 'border-zinc-100'}`}>
        {!isJoined ? (
          <div className="space-y-4">
            <button
              onClick={handleCreateSession}
              className={`w-full flex items-center justify-center space-x-2 py-3 rounded-xl transition-all font-medium text-sm relative z-100 ${
                dark ? 'bg-white text-zinc-900 hover:bg-zinc-200' : 'bg-zinc-900 text-white hover:bg-zinc-800'
              }`}
            >
              <Users className="w-4 h-4" />
              <span>Start Jam Session</span>
            </button>

            <form onSubmit={handleJoinSession} className="relative z-100">
              <span className={`absolute left-4 top-1/2 -translate-y-1/2 text-[10px] font-mono tracking-tighter ${
                isTripMode ? 'text-zinc-400' : dark ? 'text-zinc-500' : 'text-zinc-400'
              }`}>
                jam.new/
              </span>
              <input
                type="text"
                placeholder="Paste Jam Code..."
                value={joinId}
                onChange={(e) => setJoinId(e.target.value)}
                className={`w-full px-4 py-3 rounded-xl text-sm border focus:ring-1 focus:outline-none transition-all ${
                  isTripMode
                    ? 'bg-white/5 border-white/10 text-white focus:ring-white/30 placeholder:text-zinc-500 pl-20'
                    : dark
                    ? 'bg-zinc-800 border-zinc-700 text-zinc-100 focus:ring-zinc-500 placeholder:text-zinc-500'
                    : 'bg-zinc-50 border-zinc-200 text-zinc-900 focus:ring-zinc-400 placeholder:text-zinc-400'
                }`}
              />
              <button
                type="submit"
                className={`absolute right-2 top-1/2 -translate-y-1/2 px-3 py-1.5 rounded-lg font-bold text-[10px] uppercase transition-all ${
                  dark ? 'bg-zinc-700 text-zinc-100 hover:bg-zinc-600' : 'bg-zinc-200 text-zinc-900 hover:bg-zinc-300'
                }`}
              >
                Join
              </button>
            </form>
          </div>
        ) : (
          <div className="space-y-4">
            <div className={`p-4 rounded-xl border flex flex-col space-y-3 transition-all duration-700 ${
              isTripMode ? 'bg-white/5 border-white/10' : dark ? 'bg-zinc-800 border-zinc-700' : 'bg-zinc-50 border-zinc-200'
            }`}
            style={{ filter: isTripMode ? 'blur(6px)' : 'none' }}>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                  <span className={`text-[11px] font-bold uppercase tracking-wider ${isTripMode ? 'text-white' : dark ? 'text-zinc-100' : 'text-zinc-900'}`}>
                    {isHost ? 'Hosting Jam' : 'Joined Jam'}
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => setIsChatOpen(true)}
                    className={`p-1.5 rounded-md transition-all ${isTripMode ? 'hover:bg-white/10' : dark ? 'hover:bg-zinc-700 text-zinc-400 hover:text-zinc-100' : 'hover:bg-zinc-200'}`}
                    title="Open Chat"
                  >
                    <Share2 className="w-4 h-4 rotate-90" />
                  </button>
                  <button
                    onClick={handleLeaveSession}
                    className="p-1 rounded-md hover:bg-red-500/10 text-red-500 transition-all"
                    title="Leave Session"
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <code className={`text-xs font-mono font-bold ${isTripMode ? 'text-zinc-300' : dark ? 'text-zinc-400' : 'text-zinc-600'}`}>
                  {sessionId}
                </code>
                <button
                  onClick={() => navigator.clipboard.writeText(sessionId || '')}
                  className={`flex items-center space-x-1 px-2 py-1 rounded text-[9px] font-bold uppercase hover:opacity-80 transition-all ${
                    dark ? 'bg-zinc-700 text-zinc-100' : 'bg-zinc-900 text-white'
                  }`}
                >
                  <Share2 className="w-3 h-3" />
                  <span>Copy</span>
                </button>
              </div>

              <div className="flex items-center -space-x-2">
                {participants.slice(0, 5).map((p, i) => (
                  <div
                    key={p.socketId}
                    className={`w-7 h-7 rounded-full border-2 flex items-center justify-center text-[10px] font-bold text-white shadow-sm bg-zinc-800 ${dark ? 'border-zinc-700' : 'border-zinc-50'}`}
                    title={p.username}
                    style={{ zIndex: participants.length - i }}
                  >
                    {p.username?.[0]?.toUpperCase() ?? '?'}
                  </div>
                ))}
                {participants.length > 5 && (
                  <div className={`pl-3 text-[10px] font-bold ${dark ? 'text-zinc-500' : 'text-zinc-400'}`}>
                    +{participants.length - 5} others
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

