import React from 'react';
import { UserCircle, HeartPulse } from 'lucide-react';
import { Avatar } from '../components/Avatar';

interface RoleSelectionProps {
  onSelectRole: (role: 'caregiver' | 'patient') => void;
}

export const RoleSelection: React.FC<RoleSelectionProps> = ({ onSelectRole }) => {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-6 animate-in fade-in zoom-in duration-700">
      <div className="mb-8">
        <Avatar size="xl" emotion="happy" />
      </div>
      
      <h1 className="text-4xl font-extrabold mb-2 text-center tracking-tight bg-clip-text text-transparent bg-gradient-to-br from-white to-indigo-300">
        Welcome to Nura Care
      </h1>
      <p className="text-indigo-200 text-center mb-12 text-lg max-w-md">
        How would you like to use the app today?
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-2xl">
        <button 
          onClick={() => onSelectRole('caregiver')}
          className="glass-panel p-8 rounded-3xl flex flex-col items-center gap-4 border-white/10 shadow-xl hover:bg-white/15 transition-all group active:scale-95"
        >
          <div className="w-16 h-16 rounded-2xl bg-indigo-500/20 flex items-center justify-center group-hover:bg-indigo-500/30 transition-colors">
            <HeartPulse className="w-8 h-8 text-indigo-300" />
          </div>
          <div className="text-center">
            <h2 className="text-2xl font-bold text-white mb-1">Caregiver</h2>
            <p className="text-indigo-200/70 text-sm">Manage profiles and monitor care</p>
          </div>
        </button>

        <button 
          onClick={() => onSelectRole('patient')}
          className="glass-panel p-8 rounded-3xl flex flex-col items-center gap-4 border-white/10 shadow-xl hover:bg-white/15 transition-all group active:scale-95"
        >
            <div className="w-16 h-16 rounded-2xl bg-blue-500/20 flex items-center justify-center group-hover:bg-blue-500/30 transition-colors">
              <UserCircle className="w-8 h-8 text-blue-400" />
            </div>
          <div className="text-center">
            <h2 className="text-2xl font-bold text-white mb-1">Patient</h2>
            <p className="text-indigo-200/70 text-sm">Interact with your AI companion</p>
          </div>
        </button>
      </div>
    </div>
  );
};
