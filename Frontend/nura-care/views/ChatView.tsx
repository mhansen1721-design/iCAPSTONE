
import React, { useState, useEffect } from 'react';
import { PatientProfile } from '../types';
import { ChevronLeft, Activity } from 'lucide-react';
import { Avatar } from '../components/Avatar';

interface ChatViewProps {
  patient: PatientProfile;
  onBack: () => void;
}

export const ChatView: React.FC<ChatViewProps> = ({ patient, onBack }) => {
  const [isActive, setIsActive] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false); // Used to animate avatar

  // Simulate conversation state when active
  useEffect(() => {
    let timeout: NodeJS.Timeout;
    
    if (isActive) {
      // Simple simulation loop: Listen -> Speak -> Listen
      const simulateConversation = () => {
        // Random duration for state
        const duration = Math.random() * 3000 + 2000; 
        
        timeout = setTimeout(() => {
          setIsPlaying(prev => !prev);
          simulateConversation();
        }, duration);
      };

      simulateConversation();
    } else {
      setIsPlaying(false);
      clearTimeout(timeout!);
    }

    return () => clearTimeout(timeout);
  }, [isActive]);

  const toggleSession = () => {
    setIsActive(!isActive);
  };

  return (
    <div className="w-full h-screen flex flex-col relative overflow-hidden animate-in fade-in duration-700">
      
      {/* Header */}
      <header className="absolute top-0 left-0 w-full p-6 z-50 flex justify-between items-center">
        <button 
          onClick={onBack}
          className="p-3 bg-white/10 hover:bg-white/20 rounded-full backdrop-blur-md transition-all text-white border border-white/10"
        >
          <ChevronLeft size={24} />
        </button>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex flex-col items-center justify-center p-8 z-10">
        
        <div className="text-center mb-12 animate-in slide-in-from-top-10 duration-700">
          <h1 className="text-5xl font-bold text-white tracking-tight drop-shadow-lg">
            How are you, {patient.name}?
          </h1>
        </div>

        <div className="relative mb-24">
            {/* Ambient Glow */}
            {isActive && (
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-indigo-500/20 rounded-full blur-[100px] animate-pulse pointer-events-none" />
            )}
            
            <div className={`transition-transform duration-500 ${isPlaying ? 'scale-110' : 'scale-100'}`}>
                <Avatar 
                  size="2xl" 
                  type={patient.avatarType} 
                  emotion={isPlaying ? 'happy' : 'neutral'} 
                />
            </div>
        </div>

        {/* Control Button */}
        <button
          onClick={toggleSession}
          className={`
            relative group flex items-center gap-4 px-8 py-5 rounded-full text-xl font-bold transition-all duration-300 shadow-2xl backdrop-blur-md border
            ${isActive 
              ? 'bg-red-500/20 border-red-500/50 text-red-100 hover:bg-red-500/30' 
              : 'bg-white/10 border-white/20 text-white hover:bg-white/20 hover:scale-105'
            }
          `}
        >
          {isActive ? (
            <>
               <span className="relative flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
               </span>
               <span>End Chat</span>
            </>
          ) : (
            <>
               <span>Click on me to chat!</span>
               <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
                 <Activity size={18} />
               </div>
            </>
          )}
        </button>
        
        {isActive && (
           <p className="mt-4 text-indigo-200/50 text-sm font-medium animate-pulse">
             {isPlaying ? 'Speaking...' : 'Listening...'}
           </p>
        )}

      </div>
    </div>
  );
};
