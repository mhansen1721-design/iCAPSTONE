import React from 'react';
import { UserCircle, HeartPulse, ChevronLeft } from 'lucide-react';
import { Avatar } from '../components/Avatar';

interface RoleSelectionProps {
  onSelectRole: (role: 'caregiver' | 'patient') => void;
  onBack: () => void;
}

export const RoleSelection: React.FC<RoleSelectionProps> = ({ onSelectRole, onBack }) => {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-6 animate-in fade-in zoom-in duration-700 bg-[#0b0a1a]">
      {/* Top Left Navigation to return to Login */}
      <button 
        onClick={onBack}
        className="absolute top-8 left-8 flex items-center gap-2 text-indigo-300/60 hover:text-white transition-all text-sm font-medium group"
      >
        <ChevronLeft size={18} className="group-hover:-translate-x-1 transition-transform" /> 
        Back to login
      </button>

      <div className="mb-8">
        <Avatar size="xl" type="jellyfish" emotion="happy" />
      </div>
      
      <h1 className="text-5xl font-black mb-2 text-center tracking-tighter text-white">
        Welcome to Nura Care
      </h1>
      <p className="text-indigo-200/50 text-center mb-12 text-lg max-w-md leading-relaxed">
        How would you like to use the app today?
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full max-w-3xl">
        {/* CAREGIVER OPTION */}
        <button 
          onClick={() => onSelectRole('caregiver')}
          className="glass-panel p-10 rounded-[2.5rem] flex flex-col items-center gap-6 border-white/10 shadow-2xl hover:bg-white/10 transition-all group active:scale-95 bg-[#171140]/40"
        >
          <div className="w-20 h-20 rounded-3xl bg-indigo-500/20 flex items-center justify-center group-hover:bg-indigo-500/30 transition-colors">
            <HeartPulse className="w-10 h-10 text-indigo-300" />
          </div>
          <div className="text-center">
            <h2 className="text-3xl font-black text-white mb-2">Caregiver</h2>
            <p className="text-indigo-200/60 text-sm font-medium">Manage profiles and monitor care</p>
          </div>
        </button>

        {/* PATIENT OPTION */}
        <button 
          onClick={() => onSelectRole('patient')}
          className="glass-panel p-10 rounded-[2.5rem] flex flex-col items-center gap-6 border-white/10 shadow-2xl hover:bg-white/10 transition-all group active:scale-95 bg-[#171140]/40"
        >
            <div className="w-20 h-20 rounded-3xl bg-blue-500/20 flex items-center justify-center group-hover:bg-blue-500/30 transition-colors">
              <UserCircle className="w-10 h-10 text-blue-400" />
            </div>
          <div className="text-center">
            <h2 className="text-3xl font-black text-white mb-2">Patient</h2>
            <p className="text-indigo-200/60 text-sm font-medium">Interact with your AI companion</p>
          </div>
        </button>
      </div>
    </div>
  );
};
