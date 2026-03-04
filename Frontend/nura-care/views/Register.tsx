import React, { useState } from 'react';
import { X, CheckCircle } from 'lucide-react';

interface RegisterModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const RegisterModal: React.FC<RegisterModalProps> = ({ isOpen, onClose }) => {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false); // New state for success view

  if (!isOpen) return null;

  const handleCreateAccount = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch("http://127.0.0.1:8000/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json",
        },
        body: JSON.stringify({
          full_name: fullName,
          email: email,
          password: password,
        }),
      });

      const data = await response.json();

      if (response.ok && data.success === true) {
        setIsSuccess(true); // Switch to success view instead of alert
      } else {
        setError(data.detail || data.message || "Failed to create account.");
        setEmail('');
        setPassword('');
      }
    } catch (err) {
      setError("Cannot connect to server");
    } finally {
      setIsLoading(false);
    }
  };

  // Helper to reset and close
  const handleClose = () => {
    setIsSuccess(false);
    setFullName('');
    setEmail('');
    setPassword('');
    setError(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="glass-panel p-8 rounded-3xl w-full max-w-md flex flex-col gap-4 border-white/10 shadow-2xl relative animate-in zoom-in duration-300">
        
        {/* Success View */}
        {isSuccess ? (
          <div className="flex flex-col items-center py-6 text-center animate-in fade-in zoom-in duration-500">
            <CheckCircle size={64} className="text-green-400 mb-4" />
            <h2 className="text-3xl font-bold text-white mb-2">Account Successfully Created</h2>
            <p className="text-indigo-200 mb-8 text-sm">
              Your caregiver profile is ready. You can now login and start your personalized care journey with Nura Care.
            </p>
            <button 
              onClick={handleClose}
              className="w-full bg-[#715ffa] hover:bg-[#8475ff] text-white font-bold py-4 rounded-xl shadow-lg transition-all active:scale-95"
            >
              Log In
            </button>
          </div>
        ) : (
          /* Original Registration Form */
          <>
            <button 
              onClick={handleClose}
              className="absolute top-4 right-4 text-white/50 hover:text-white transition-colors"
            >
              <X size={24} />
            </button>

            <h2 className="text-3xl font-bold text-white mb-2">Join Nura Care</h2>
            <p className="text-indigo-200 mb-4 text-sm">Create an account to start your personalized care journey.</p>

            {error && (
              <p className="text-red-500 text-xl text-center font-bold mb-2 animate-pulse">
                {error}
              </p>
            )}

            <input 
              type="text" 
              placeholder="Full Name" 
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="bg-black/20 border border-white/10 rounded-xl p-4 text-white focus:outline-none focus:border-indigo-400 transition-colors"
            />

            <input 
              type="email" 
              placeholder="Email Address" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="bg-black/20 border border-white/10 rounded-xl p-4 text-white focus:outline-none focus:border-indigo-400 transition-colors"
            />
            
            <input 
              type="password" 
              placeholder="Create Password" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="bg-black/20 border border-white/10 rounded-xl p-4 text-white focus:outline-none focus:border-indigo-400 transition-colors"
            />

            <button 
              onClick={handleCreateAccount}
              disabled={isLoading}
              className="mt-4 bg-[#715ffa] hover:bg-[#8475ff] text-white font-bold py-4 rounded-xl shadow-lg transition-all active:scale-95 disabled:opacity-50"
            >
              {isLoading ? "Creating..." : "Create Account"}
            </button>
          </>
        )}
      </div>
    </div>
  );
};
