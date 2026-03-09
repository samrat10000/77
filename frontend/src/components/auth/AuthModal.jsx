import { useState } from 'react';
import { User } from 'lucide-react';
import { apiAuth, LS_TOKEN, LS_USERNAME } from '@/lib/auth';

export function AuthModal({ onSuccess }) {
  const [mode, setMode] = useState('login'); // 'login' | 'register'
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { token, username: name } = await apiAuth(mode, { username, password });
      localStorage.setItem(LS_TOKEN, token);
      localStorage.setItem(LS_USERNAME, name);
      onSuccess(name);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-white">
      <div className="w-full max-w-xs p-8 flex flex-col space-y-6">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-zinc-900 rounded-full flex items-center justify-center">
            <User className="w-4 h-4 text-white" />
          </div>
          <h1 className="text-lg font-bold text-zinc-900 tracking-tight">
            {mode === 'login' ? 'Welcome back' : 'Create account'}
          </h1>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col space-y-3">
          <input
            type="text"
            placeholder="Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="w-full px-4 py-3 rounded-xl text-sm border border-zinc-200 bg-zinc-50 text-zinc-900 focus:ring-1 focus:ring-zinc-400 focus:outline-none"
            required
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-4 py-3 rounded-xl text-sm border border-zinc-200 bg-zinc-50 text-zinc-900 focus:ring-1 focus:ring-zinc-400 focus:outline-none"
            required
          />
          {error && <p className="text-xs text-red-500 font-medium">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-xl bg-zinc-900 text-white font-semibold text-sm hover:bg-zinc-700 transition-all disabled:opacity-50"
          >
            {loading ? '...' : mode === 'login' ? 'Sign in' : 'Register'}
          </button>
        </form>

        <button
          onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError(''); }}
          className="text-[11px] text-zinc-400 hover:text-zinc-700 transition-colors text-center"
        >
          {mode === 'login' ? "Don't have an account? Register" : 'Already have an account? Sign in'}
        </button>
      </div>
    </div>
  );
}
