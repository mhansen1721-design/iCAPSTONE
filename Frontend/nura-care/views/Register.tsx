import React, { useState } from 'react';
import { X, CheckCircle, Key } from 'lucide-react';

interface RegisterModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRegisterComplete?: (email: string, password: string, joinCode?: string) => void;
}

export const RegisterModal: React.FC<RegisterModalProps> = ({ isOpen, onClose, onRegisterComplete }) => {
  const [fullName, setFullName]     = useState('');
  const [email, setEmail]           = useState('');
  const [password, setPassword]     = useState('');
  const [isLoading, setIsLoading]   = useState(false);
  const [error, setError]           = useState<string | null>(null);
  const [isSuccess, setIsSuccess]   = useState(false);

  const [registeredEmail, setRegisteredEmail]       = useState('');
  const [registeredPassword, setRegisteredPassword] = useState('');

  const [joinCode, setJoinCode]         = useState('');
  const [joinError, setJoinError]       = useState<string | null>(null);
  const [isJoining, setIsJoining]       = useState(false);

  if (!isOpen) return null;

  const handleCreateAccount = async () => {
    if (!fullName.trim() || !email.trim() || !password.trim()) {
      setError('Please fill in all fields.');
      return;
    }
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('http://127.0.0.1:8000/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ full_name: fullName, email, password }),
      });

      const data = await response.json();

      if (response.ok && data.success === true) {
        setRegisteredEmail(email.toLowerCase().trim());
        setRegisteredPassword(password);
        setIsSuccess(true);
      } else {
        setError(data.detail || data.message || 'Failed to create account.');
      }
    } catch {
      setError('Cannot connect to server.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLoginDirect = () => {
    resetAndClose();
    onRegisterComplete?.(registeredEmail, registeredPassword);
  };

  const handleJoinAndLogin = async () => {
    const code = joinCode.trim().toUpperCase();
    if (!code) { handleLoginDirect(); return; }
    setIsJoining(true);
    setJoinError(null);

    try {
      const res = await fetch('http://127.0.0.1:8000/patients/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: registeredEmail, access_code: code }),
      });
      const data = await res.json();

      if (res.ok && data.success) {
        resetAndClose();
        onRegisterComplete?.(registeredEmail, registeredPassword, code);
      } else {
        setJoinError(data.detail || 'Invalid code.');
      }
    } catch {
      setJoinError('Could not connect to server.');
    } finally {
      setIsJoining(false);
    }
  };

  const resetAndClose = () => {
    setIsSuccess(false);
    setFullName(''); setEmail(''); setPassword('');
    setJoinCode(''); setJoinError(null); setError(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-300">
      {/* HARDCODED: White background, Black text */}
      <div className="bg-white p-8 rounded-[2.5rem] w-full max-w-md flex flex-col gap-4 border border-gray-200 shadow-2xl relative animate-in zoom-in duration-300 text-black">

        {isSuccess ? (
          <div className="flex flex-col items-center py-4 text-center animate-in fade-in zoom-in duration-500">
            <CheckCircle size={56} className="text-black mb-4" />
            <h2 className="text-3xl font-black mb-1 uppercase tracking-tighter">Account Created!</h2>
            <p className="text-gray-500 text-sm mb-8 max-w-xs leading-relaxed">
              Enter your <strong>care circle code</strong> below or skip to continue.
            </p>

            <div className="w-full mb-3">
              <div className="relative">
                <Key size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  value={joinCode}
                  onChange={e => setJoinCode(e.target.value.toUpperCase().slice(0, 6))}
                  placeholder="CODE"
                  maxLength={6}
                  className="w-full bg-gray-50 border border-gray-200 rounded-2xl pl-10 pr-4 py-4 text-black text-center text-xl font-black tracking-[0.3em] focus:outline-none focus:ring-2 focus:ring-gray-100 transition-all"
                />
              </div>
              {joinError && <p className="text-red-600 text-xs font-bold mt-2">{joinError}</p>}
            </div>

            <button
              onClick={handleJoinAndLogin}
              disabled={isJoining}
              className="w-full bg-gray-800 text-white font-black py-4 rounded-2xl shadow-lg transition-all active:scale-95 hover:bg-black disabled:opacity-20 uppercase tracking-widest"
            >
              {isJoining ? '...' : 'Join Care Circle'}
            </button>

            <button onClick={handleLoginDirect} className="mt-4 text-gray-400 hover:text-black text-xs font-bold uppercase underline underline-offset-4 decoration-1">
              Skip for now
            </button>
          </div>
        ) : (
          <>
            <button onClick={resetAndClose} className="absolute top-6 right-6 text-gray-400 hover:text-black transition-colors">
              <X size={24} />
            </button>

            <h2 className="text-3xl font-black mb-1 uppercase tracking-tighter">Join Nura Care</h2>
            <p className="text-gray-500 text-sm mb-2 font-medium">Create your caregiver account.</p>

            {error && (
              <div className="bg-black text-white p-2 rounded-lg text-[10px] font-black uppercase text-center tracking-widest">
                {error}
              </div>
            )}

            <div className="flex flex-col gap-3">
              <input
                type="text"
                placeholder="Full Name"
                value={fullName}
                onChange={e => setFullName(e.target.value)}
                className="bg-gray-50 border border-gray-200 rounded-xl p-4 text-black focus:outline-none focus:ring-2 focus:ring-gray-100 transition-all placeholder:text-gray-300"
              />
              <input
                type="email"
                placeholder="Email Address"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="bg-gray-50 border border-gray-200 rounded-xl p-4 text-black focus:outline-none focus:ring-2 focus:ring-gray-100 transition-all placeholder:text-gray-300"
              />
              <input
                type="password"
                placeholder="Password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="bg-gray-50 border border-gray-200 rounded-xl p-4 text-black focus:outline-none focus:ring-2 focus:ring-gray-100 transition-all placeholder:text-gray-300"
              />
            </div>

            <button
              onClick={handleCreateAccount}
              disabled={isLoading}
              className="mt-4 bg-gray-800 text-white font-black py-4 rounded-2xl shadow-lg transition-all active:scale-95 hover:bg-black disabled:opacity-20 uppercase tracking-widest"
            >
              {isLoading ? 'Creating...' : 'Create Account'}
            </button>
          </>
        )}
      </div>
    </div>
  );
};
