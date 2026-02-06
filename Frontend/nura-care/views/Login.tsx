import React from 'react';
import { Avatar } from '../components/Avatar';

interface LoginProps {
  onLogin: () => void;
}

export const Login: React.FC<LoginProps> = ({ onLogin }) => {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-6 animate-in fade-in zoom-in duration-1000">
      <div className="mb-10">
        <Avatar size="xl" emotion="happy" />
      </div>
      
      <h1 className="text-5xl font-extrabold mb-4 text-center tracking-tight bg-clip-text text-transparent bg-gradient-to-br from-white to-indigo-300">
        Nura Care
      </h1>
      <p className="text-indigo-200 text-center mb-12 text-lg max-w-md">
        Compassionate AI companionship designed for peace of mind.
      </p>

      <div className="glass-panel p-8 rounded-3xl w-full max-w-md flex flex-col gap-4 border-white/10 shadow-2xl">
        <input 
          type="email" 
          placeholder="Caregiver Email" 
          className="bg-black/20 border border-white/10 rounded-xl p-4 text-white focus:outline-none focus:border-indigo-400 transition-colors"
        />
        <input 
          type="password" 
          placeholder="Password" 
          className="bg-black/20 border border-white/10 rounded-xl p-4 text-white focus:outline-none focus:border-indigo-400 transition-colors"
        />
        <button 
          onClick={onLogin}
          className="mt-2 bg-[#715ffa] hover:bg-[#8475ff] text-white font-bold py-4 rounded-xl shadow-lg shadow-indigo-500/15 transition-all active:scale-95"
        >
          Sign In
        </button>
      </div>
    </div>
  );
};