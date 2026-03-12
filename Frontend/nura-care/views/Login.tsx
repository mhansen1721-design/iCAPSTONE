import React, { useState } from 'react';
import { Avatar } from '../components/Avatar';
import { RegisterModal } from '../views/Register'; 

interface LoginProps {
  // FIXED: Now expects both email and password
  onLogin: (email: string, password: string) => void;
}

export const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isRegisterOpen, setIsRegisterOpen] = useState(false);

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
      const response = await fetch(url, { 
        method: "POST", 
        headers: { "Accept": "application/json" } 
      });
      
      const data = await response.json();

      if (response.ok && data.success === true) {
        // FIXED: Passing both credentials to the parent App
        onLogin(email.toLowerCase().trim(), password); 
      } else {
        setError(data.message || "Invalid email or password");
      }
    } catch (err) {
      console.error("Login Error:", err);
      setError("Connection failed. Is the backend running?");
    } finally {
      setIsLoading(false);
    }
  };

return (
  <div className="flex flex-col items-center justify-center min-h-screen p-6 animate-in fade-in zoom-in duration-1000">
    <RegisterModal isOpen={isRegisterOpen} onClose={() => setIsRegisterOpen(false)} />

    <div className="mb-8">
      <Avatar size="xl" emotion={isLoading ? "neutral" : "happy"} />
    </div>
    
    <h1 className="text-5xl font-extrabold mb-4 text-center text-[var(--nura-text)]">
      Nura Care
    </h1>
    
    <p className="text-[var(--nura-dim)] text-center mb-10 text-lg max-w-md font-medium">
      Compassionate AI companionship designed for peace of mind.
    </p>

    {/* --- THE CARD CONTAINER --- */}
    <div 
      className="w-full max-w-sm p-8 rounded-[2.5rem] shadow-2xl backdrop-blur-md" 
      style={{ 
        /* Try card variable, fallback to dark translucent if empty */
        backgroundColor: 'var(--nura-card, rgba(255, 255, 255, 0.05))', 
        border: '1px solid rgba(255,255,255,0.1)' 
      }}
    >
      <form onSubmit={handleManualLogin} className="flex flex-col gap-6">
        <div className="flex flex-col gap-4">
          <input 
            type="email" 
            placeholder="Caregiver Email" 
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full bg-black/20 border border-white/10 rounded-xl p-4 text-[var(--nura-text)] focus:outline-none focus:border-[var(--nura-accent)] transition-all"
            required
          />
          <input 
            type="password" 
            placeholder="Password" 
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full bg-black/20 border border-white/10 rounded-xl p-4 text-[var(--nura-text)] focus:outline-none focus:border-[var(--nura-accent)] transition-all"
            required
          />
        </div>
        
        {/* --- THE SIGN IN BUTTON (With Fallback) --- */}
        <button 
          type="submit"
          disabled={isLoading}
          style={{ 
            /* Try accent variable, fallback to solid purple so it NEVER disappears */
            backgroundColor: 'var(--nura-accent, #715ffa)', 
            color: 'white',
            minHeight: '60px',
            width: '100%',
            display: 'block'
          }}
          className="font-black rounded-2xl shadow-xl hover:brightness-110 active:scale-95 transition-all text-xl"
        >
          {isLoading ? "Connecting..." : "Sign In"}
        </button>
      </form>
    </div>

    <button 
      type="button"
      onClick={() => setIsRegisterOpen(true)}
      className="mt-8 text-[var(--nura-dim)] hover:text-[var(--nura-text)] font-bold transition-all underline underline-offset-8 decoration-2"
    >
      Need an account? Register
    </button>
  </div>
);
};