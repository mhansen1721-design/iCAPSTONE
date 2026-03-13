import React, { useState, useEffect } from 'react';
import { Avatar } from '../components/Avatar';
import { RegisterModal } from '../views/Register';

interface LoginProps {
  onLogin: (email: string, password: string) => void;
}

export const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isRegisterOpen, setIsRegisterOpen] = useState(false);

  useEffect(() => {
    if (error) setError(null);
  }, [email, password]);

  const handleManualLogin = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!email.trim() || !password.trim()) {
      setError("Please enter both email and password.");
      return;
    }
    setIsLoading(true);
    setError(null);

    try {
      const url = `http://127.0.0.1:8000/login?email=${encodeURIComponent(email.trim())}&password=${encodeURIComponent(password)}`;
      const response = await fetch(url, { method: "POST" });
      const data = await response.json();

      if (response.ok && data.success === true) {
        onLogin(email.toLowerCase().trim(), password); 
      } else {
        setError(data.detail || data.message || "Invalid email or password");
      }
    } catch (err) {
      setError("Connection failed. Check backend.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-6 bg-white text-black animate-in fade-in duration-700">
      <RegisterModal isOpen={isRegisterOpen} onClose={() => setIsRegisterOpen(false)} />

      <div className="mb-8">
        <Avatar size="xl" emotion={isLoading ? "neutral" : (error ? "sad" : "happy")} />
      </div>
      
      <h1 className="text-5xl font-black mb-2 text-center tracking-tighter uppercase">
        Nura Care
      </h1>
      
      <p className="text-gray-500 text-center mb-10 text-lg font-medium">
        Compassionate AI companionship.
      </p>

      {/* --- CARD --- */}
      <div className="w-full max-w-sm p-8 rounded-3xl bg-gray-50 border border-gray-200 shadow-sm">
        <form onSubmit={handleManualLogin} className="flex flex-col gap-5">
          
          {error && (
            <div className="bg-black text-white p-3 rounded-xl text-center text-xs font-bold uppercase tracking-widest animate-bounce">
              {error}
            </div>
          )}

          <div className="flex flex-col gap-3">
            <label className="text-[10px] font-black uppercase ml-1 text-gray-400">Credentials</label>
            <input 
              type="email" 
              placeholder="Email Address" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-white border border-gray-200 rounded-xl p-4 text-black focus:outline-none focus:ring-2 focus:ring-gray-200 transition-all placeholder:text-gray-300"
              required
            />
            <input 
              type="password" 
              placeholder="Password" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-white border border-gray-200 rounded-xl p-4 text-black focus:outline-none focus:ring-2 focus:ring-gray-200 transition-all placeholder:text-gray-300"
              required
            />
          </div>
          
          <button 
            type="submit"
            disabled={isLoading}
            className="bg-gray-800 text-white font-bold rounded-xl h-[55px] w-full hover:bg-black active:scale-[0.98] transition-all text-lg uppercase tracking-tight disabled:opacity-20"
          >
            {isLoading ? "Checking..." : "Sign In"}
          </button>
        </form>
      </div>

      {/* --- RE-STYLED REGISTER LINK --- */}
      <button 
        type="button"
        onClick={() => setIsRegisterOpen(true)}
        className="mt-10 text-gray-900 hover:text-black font-black text-base uppercase tracking-widest underline underline-offset-8 decoration-2 decoration-gray-300 hover:decoration-black transition-all"
      >
        Need an account? Register Now
      </button>
    </div>
  );
};
