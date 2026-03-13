import React, { useState } from 'react';
import { X, CheckCircle, Key } from 'lucide-react';

interface RegisterModalProps {
  isOpen: boolean;
  onClose: () => void;
  // Called after successful registration — auto-logs the user in with optional join code
  onRegisterComplete?: (email: string, password: string, joinCode?: string) => void;
}

export const RegisterModal: React.FC<RegisterModalProps> = ({ isOpen, onClose, onRegisterComplete }) => {
  const [fullName, setFullName]     = useState('');
  const [email, setEmail]           = useState('');
  const [password, setPassword]     = useState('');
  const [isLoading, setIsLoading]   = useState(false);
  const [error, setError]           = useState<string | null>(null);
  const [isSuccess, setIsSuccess]   = useState(false);

  // Saved after successful registration for use in the next step
  const [registeredEmail, setRegisteredEmail]       = useState('');
  const [registeredPassword, setRegisteredPassword] = useState('');

  // Step 2 — optional care circle code
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
        setEmail('');
        setPassword('');
      }
    } catch {
      setError('Cannot connect to server.');
    } finally {
      setIsLoading(false);
    }
  };

  // User skips the join step — log them straight in
  const handleLoginDirect = () => {
    resetAndClose();
    onRegisterComplete?.(registeredEmail, registeredPassword);
  };

  // User entered a code — validate it then log in
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
        // Pass the code to App so it can re-fetch the patient list
        resetAndClose();
        onRegisterComplete?.(registeredEmail, registeredPassword, code);
      } else {
        setJoinError(data.detail || 'Invalid code — check with your care team and try again.');
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
    setRegisteredEmail(''); setRegisteredPassword('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="bg-[var(--nura-card)] p-8 rounded-3xl w-full max-w-md flex flex-col gap-4 border border-white/10 shadow-2xl relative animate-in zoom-in duration-300">

        {/* ── SUCCESS / STEP 2 ── */}
        {isSuccess ? (
          <div className="flex flex-col items-center py-4 text-center animate-in fade-in zoom-in duration-500">
            <CheckCircle size={56} className="text-emerald-400 mb-4" />
            <h2 className="text-2xl font-black text-[var(--nura-text)] mb-1">Account Created!</h2>
            <p className="text-[var(--nura-dim)] text-sm mb-8 max-w-xs leading-relaxed">
              Your caregiver profile is ready. If a family member shared a <strong>6-character care circle code</strong> with you, enter it below to see your loved one's profile immediately.
            </p>

            {/* Optional join code */}
            <div className="w-full mb-3">
              <div className="relative">
                <Key size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--nura-dim)]/50" />
                <input
                  type="text"
                  value={joinCode}
                  onChange={e => setJoinCode(e.target.value.toUpperCase().slice(0, 6))}
                  onKeyDown={e => e.key === 'Enter' && handleJoinAndLogin()}
                  placeholder="e.g. AB3X9Q  (optional)"
                  maxLength={6}
                  className="w-full bg-black/20 border border-white/10 focus:border-[var(--nura-accent)] rounded-2xl pl-10 pr-4 py-4 text-[var(--nura-text)] text-center text-xl font-black tracking-[0.3em] uppercase focus:outline-none placeholder:text-[var(--nura-text)]/20 placeholder:font-normal placeholder:tracking-normal placeholder:text-sm transition-all"
                />
              </div>
              {joinError && (
                <p className="text-red-400 text-sm font-bold mt-2 text-center">{joinError}</p>
              )}
            </div>

            <button
              onClick={handleJoinAndLogin}
              disabled={isJoining}
              className="w-full bg-[var(--nura-accent)] text-white font-black py-4 rounded-2xl shadow-lg transition-all active:scale-95 disabled:opacity-50 hover:brightness-110 mb-3"
            >
              {isJoining ? 'Joining...' : joinCode.trim() ? 'Join Circle & Log In' : 'Log In'}
            </button>

            {joinCode.trim() && (
              <button
                onClick={handleLoginDirect}
                className="text-[var(--nura-dim)] text-sm hover:text-[var(--nura-text)] transition-all underline underline-offset-4"
              >
                Skip — I'll join a circle later
              </button>
            )}
          </div>

        ) : (
          /* ── REGISTRATION FORM ── */
          <>
            <button
              onClick={resetAndClose}
              className="absolute top-4 right-4 text-[var(--nura-text)]/50 hover:text-[var(--nura-text)] transition-colors"
            >
              <X size={24} />
            </button>

            <h2 className="text-3xl font-black text-[var(--nura-text)] mb-1">Join Nura Care</h2>
            <p className="text-[var(--nura-dim)] text-sm mb-2">Create an account to start your personalized care journey.</p>

            {error && (
              <p className="text-red-400 text-sm font-bold text-center animate-pulse">{error}</p>
            )}

            <input
              type="text"
              placeholder="Full Name"
              value={fullName}
              onChange={e => setFullName(e.target.value)}
              className="bg-black/20 border border-white/10 rounded-xl p-4 text-[var(--nura-text)] focus:outline-none focus:border-[var(--nura-accent)] transition-all"
            />
            <input
              type="email"
              placeholder="Email Address"
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="bg-black/20 border border-white/10 rounded-xl p-4 text-[var(--nura-text)] focus:outline-none focus:border-[var(--nura-accent)] transition-all"
            />
            <input
              type="password"
              placeholder="Create Password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleCreateAccount()}
              className="bg-black/20 border border-white/10 rounded-xl p-4 text-[var(--nura-text)] focus:outline-none focus:border-[var(--nura-accent)] transition-all"
            />

            <button
              onClick={handleCreateAccount}
              disabled={isLoading}
              className="mt-2 bg-[var(--nura-accent)] text-white font-black py-4 rounded-2xl shadow-lg transition-all active:scale-95 disabled:opacity-50 hover:brightness-110"
            >
              {isLoading ? 'Creating...' : 'Create Account'}
            </button>
          </>
        )}
      </div>
    </div>
  );
};
