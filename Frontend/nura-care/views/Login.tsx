import React, { useState } from 'react'; // Added useState here
import { Avatar } from '../components/Avatar';

interface LoginProps {
  onLogin: () => void;
}

export const Login: React.FC<LoginProps> = ({ onLogin }) => {
  // --- 1. STATE FOR MANUAL TRACKING ---
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // --- 2. MANUAL API CALL LOGIC ---
  const handleManualLogin = async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Direct link to your FastAPI backend
      const url = `http://127.0.0.1:8000/login?email=${encodeURIComponent(email)}&password=${encodeURIComponent(password)}`;
      
      const response = await fetch(url, {
        method: "POST",
        headers: { "Accept": "application/json" }
      });

      const data = await response.json();

      if (response.ok && data.success === true) {
        onLogin(); // Success!
      } else {
        setError(data.detail || "Invalid email or password");
      }
    } catch (err) {
      setError("Failed to connect to backend. Is FastAPI running on port 8000?");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-6 animate-in fade-in zoom-in duration-1000">
      <div className="mb-10">
        <Avatar size="xl" emotion={isLoading ? "thinking" : "happy"} />
      </div>
      
      <h1 className="text-5xl font-extrabold mb-4 text-center tracking-tight bg-clip-text text-transparent bg-gradient-to-br from-white to-indigo-300">
        Nura Care
      </h1>
      <p className="text-indigo-200 text-center mb-12 text-lg max-w-md">
        Compassionate AI companionship designed for peace of mind.
      </p>

      <div className="glass-panel p-8 rounded-3xl w-full max-w-md flex flex-col gap-4 border-white/10 shadow-2xl">
        {/* Show error if it exists */}
        {error && <p className="text-red-400 text-sm text-center font-medium">{error}</p>}

        <input 
          type="email" 
          placeholder="Caregiver Email" 
          value={email} // Link to state
          onChange={(e) => setEmail(e.target.value)} // Update state manually
          className="bg-black/20 border border-white/10 rounded-xl p-4 text-white focus:outline-none focus:border-indigo-400 transition-colors"
        />
        <input 
          type="password" 
          placeholder="Password" 
          value={password} // Link to state
          onChange={(e) => setPassword(e.target.value)} // Update state manually
          className="bg-black/20 border border-white/10 rounded-xl p-4 text-white focus:outline-none focus:border-indigo-400 transition-colors"
        />
        <button 
        type="button"
          onClick={handleManualLogin} // Call the manual login function
          disabled={isLoading}
          className="mt-2 bg-[#715ffa] hover:bg-[#8475ff] text-white font-bold py-4 rounded-xl shadow-lg shadow-indigo-500/15 transition-all active:scale-95 disabled:opacity-50"
        >
          {isLoading ? "Connecting..." : "Sign In"}
        </button>
      </div>
    </div>
  );
};