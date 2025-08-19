import React, { useState } from 'react';
import { Lock } from 'lucide-react';

interface LoginModalProps {
  onLogin: (password: string) => Promise<void>;
}

export const LoginModal: React.FC<LoginModalProps> = ({ onLogin }) => {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    
    try {
      await onLogin(password);
    } catch (e: any) {
      setError('Invalid password');
      setPassword('');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className="bg-slate-800 rounded-xl p-8 max-w-md w-full shadow-2xl">
        <div className="flex items-center justify-center mb-6">
          <Lock className="text-blue-500" size={48} />
        </div>
        <h2 className="text-2xl font-bold text-center mb-6 text-white">Admin Login</h2>
        
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-sm font-medium mb-2 text-gray-300">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-2 rounded-lg bg-slate-700 border border-slate-600 focus:border-blue-500 focus:outline-none transition-colors text-white"
              placeholder="Enter admin password"
              autoFocus
              required
            />
          </div>
          
          {error && (
            <div className="mb-4 p-3 rounded-lg bg-red-500/20 text-red-400 text-sm">
              {error}
            </div>
          )}
          
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Logging in...' : 'Login'}
          </button>
        </form>
      </div>
    </div>
  );
};
