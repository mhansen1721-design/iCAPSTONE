import React, { useState } from 'react';
import { Avatar } from '../components/Avatar';

// Import from views/Register as per your updated file structure
import { RegisterModal } from '../views/Register'; 

interface LoginProps {
  onLogin: () => void;
}

export const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // State to track if the Register popup is open
  const [isRegisterOpen, setIsRegisterOpen] = useState(false);

  const handleManualLogin = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const url = `http://127.0.0.1:8000/login?email=${encodeURIComponent(email)}&password=${encodeURIComponent(password)}`;
      const response = await fetch(url, { method: "POST", headers: { "Accept": "application/json" } });
      const data = await response.json();

      if (response.ok && data.success === true) {
        onLogin();
      } else {
        setError(data.message || "Invalid email or password");
      }
    } catch (err) {
      setError("Connection failed. Is the backend running?");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-6 animate-in fade-in zoom-in duration-1000">
      
      {/* The Modal component from Register.tsx */}
      <RegisterModal 
        isOpen={isRegisterOpen} 
        onClose={() => setIsRegisterOpen(false)} 
      />

      <div className="mb-10">
        <Avatar size="xl" emotion={isLoading ? "neutral" : "happy"} />
      </div>
      
      <h1 className="text-5xl font-extrabold mb-4 text-center tracking-tight bg-clip-text text-transparent bg-gradient-to-br from-white to-indigo-300">
        Nura Care
      </h1>
      <p className="text-indigo-200 text-center mb-12 text-lg max-w-md">
        Compassionate AI companionship designed for peace of mind.
      </p>

      <div className="glass-panel p-8 rounded-3xl w-full max-w-md flex flex-col gap-4 border-white/10 shadow-2xl">
        {/* FIXED: We only show the login error if the register modal is CLOSED.
          This prevents registration errors from showing up on the background login screen.
        */}
        {error && !isRegisterOpen && (
          <p className="text-red-400 text-sm text-center font-medium">{error}</p>
        )}

        <input 
          type="email" 
          placeholder="Caregiver Email" 
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="bg-black/20 border border-white/10 rounded-xl p-4 text-white focus:outline-none focus:border-indigo-400 transition-colors"
        />
        <input 
          type="password" 
          placeholder="Password" 
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="bg-black/20 border border-white/10 rounded-xl p-4 text-white focus:outline-none focus:border-indigo-400 transition-colors"
        />
        
        <button 
          type="button"
          onClick={handleManualLogin}
          disabled={isLoading}
          className="mt-2 bg-[#715ffa] hover:bg-[#8475ff] text-white font-bold py-4 rounded-xl shadow-lg shadow-indigo-500/15 transition-all active:scale-95 disabled:opacity-50"
        >
          {isLoading ? "Connecting..." : "Sign In"}
        </button>

        <button 
          type="button"
          onClick={() => {
            setError(null); // Clear any old login errors when opening register
            setIsRegisterOpen(true);
          }}
          className="bg-white/5 hover:bg-white/10 border border-white/10 text-white font-bold py-4 rounded-xl transition-all active:scale-95"
        >
          Register
        </button>
      </div>
    </div>
  );
};