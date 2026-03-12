import React from 'react';
import { AvatarType } from '../types';

interface AvatarProps {
  size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  emotion?: 'neutral' | 'happy' | 'talking';
  type?: AvatarType;
  reducedMotion?: boolean; // ADDED PROP
}

export const Avatar: React.FC<AvatarProps> = ({ 
  size = 'md', 
  emotion = 'neutral', 
  type = 'jellyfish',
  reducedMotion = false // Default to false
}) => {
  const sizeClasses = {
    sm: 'w-10 h-14',
    md: 'w-20 h-28',
    lg: 'w-28 h-40',
    xl: 'w-40 h-56',
    '2xl': 'w-64 h-80',
  };

  const eyeSize = {
    sm: 'w-1 h-1',
    md: 'w-2 h-2',
    lg: 'w-3 h-3',
    xl: 'w-4 h-4',
    '2xl': 'w-6 h-6',
  };

  const renderFace = () => (
    <div className={`flex items-center gap-4 z-30`}>
      {/* Eyes only pulse if reducedMotion is false */}
      <div className={`${eyeSize[size]} bg-slate-800 rounded-full shadow-sm ${!reducedMotion ? 'animate-pulse' : ''}`} />
      <div className="flex items-center justify-center min-w-[10px]">
        {emotion === 'happy' ? (
          <svg width="14" height="7" viewBox="0 0 24 12" fill="none" className="text-slate-800 stroke-current stroke-[4]">
            <path d="M7 4C10 8 14 8 17 4" strokeLinecap="round" />
          </svg>
        ) : emotion === 'talking' ? (
          <div className={`w-4 h-4 bg-slate-800 rounded-full opacity-60 ${!reducedMotion ? 'animate-ping' : ''}`} />
        ) : (
          <div className="w-2 h-0.5 bg-slate-800 rounded-full opacity-60" />
        )}
      </div>
      <div className={`${eyeSize[size]} bg-slate-800 rounded-full shadow-sm ${!reducedMotion ? 'animate-pulse' : ''}`} />
    </div>
  );

  const renderAnimal = () => {
    switch (type) {
      case 'panda':
        return (
          <div className="w-full h-[70%] bg-gradient-to-b from-white to-slate-100 rounded-full shadow-[inset_0_-4px_12px_rgba(0,0,0,0.1),0_8px_24px_rgba(0,0,0,0.2)] border border-white flex flex-col items-center justify-center relative overflow-visible">
             <div className="absolute -top-2 -left-1 w-[35%] h-[35%] bg-slate-800 rounded-full z-0" />
             <div className="absolute -top-2 -right-1 w-[35%] h-[35%] bg-slate-800 rounded-full z-0" />
             <div className="z-30">{renderFace()}</div>
             <div className="absolute top-[38%] left-[8%] w-[30%] h-[30%] bg-slate-800/50 rounded-full blur-[2px] z-10" />
             <div className="absolute top-[38%] right-[8%] w-[30%] h-[30%] bg-slate-800/50 rounded-full blur-[2px] z-10" />
          </div>
        );
      case 'axolotl':
        return (
          <div className="w-full h-[70%] relative flex items-center justify-center">
             <div className="absolute -left-3 top-1/4 flex flex-col gap-1.5 z-0">
               <div className="w-5 h-2 bg-[#ff8fab] rounded-full rotate-[-15deg] shadow-sm" />
               <div className="w-7 h-2 bg-[#ff8fab] rounded-full shadow-sm" />
               <div className="w-5 h-2 bg-[#ff8fab] rounded-full rotate-[15deg] shadow-sm" />
             </div>
             <div className="absolute -right-3 top-1/4 flex flex-col gap-1.5 z-0">
               <div className="w-5 h-2 bg-[#ff8fab] rounded-full rotate-[15deg] shadow-sm" />
               <div className="w-7 h-2 bg-[#ff8fab] rounded-full shadow-sm" />
               <div className="w-5 h-2 bg-[#ff8fab] rounded-full rotate-[-15deg] shadow-sm" />
             </div>
             <div className="w-full h-full bg-gradient-to-b from-[#ffd1dc] to-[#ffb7c5] rounded-full shadow-[inset_0_-4px_12px_rgba(255,255,255,0.4),0_8px_24px_rgba(0,0,0,0.2)] border border-white/40 flex items-center justify-center relative z-10 overflow-hidden">
               <div className="absolute top-2 left-1/4 w-1/4 h-1/6 bg-white/40 rounded-full blur-sm rotate-[-15deg]" />
               {renderFace()}
             </div>
          </div>
        );
      default: // Jellyfish
        return (
          <>
            <div className="relative w-full h-[58%] bg-gradient-to-b from-white/80 via-[#a4c0fc] to-[#7ba4f7] rounded-t-[65%] rounded-b-[40%] shadow-[inset_0_-4px_12px_rgba(255,255,255,0.4),inset_0_-8px_16px_rgba(0,0,0,0.1),0_8px_24px_rgba(0,0,0,0.2)] flex flex-col items-center justify-center border border-white/40 z-20 overflow-hidden">
              <div className="absolute top-2 left-1/4 w-1/4 h-1/6 bg-white/40 rounded-full blur-sm rotate-[-15deg]" />
              <div className="absolute top-[58%] left-[15%] w-[15%] h-[15%] bg-rose-300/40 blur-md rounded-full" />
              <div className="absolute top-[58%] right-[15%] w-[15%] h-[15%] bg-rose-300/40 blur-md rounded-full" />
              <div className="mt-3">{renderFace()}</div>
            </div>
            <div className="w-[75%] h-[28%] -mt-2 relative z-10">
              <svg viewBox="0 0 100 40" className="w-full h-full drop-shadow-[0_2px_4px_rgba(164,192,252,0.5)]" preserveAspectRatio="none">
                <path d="M 25 0 Q 20 10, 25 20 T 25 35" fill="none" stroke="rgba(164, 192, 252, 0.8)" strokeWidth="9" strokeLinecap="round" className={!reducedMotion ? 'tentacle-path' : ''} />
                <path d="M 50 0 Q 55 10, 50 20 T 50 40" fill="none" stroke="rgba(164, 192, 252, 0.6)" strokeWidth="9" strokeLinecap="round" className={!reducedMotion ? 'tentacle-path' : ''} />
                <path d="M 75 0 Q 70 10, 75 20 T 75 35" fill="none" stroke="rgba(164, 192, 252, 0.8)" strokeWidth="9" strokeLinecap="round" className={!reducedMotion ? 'tentacle-path' : ''} />
              </svg>
            </div>
          </>
        );
    }
  };

return (
  <div className={`${sizeClasses[size]} relative flex flex-col items-center group transition-transform duration-500 hover:scale-110`}>
    {/* 1. hover:scale-110 is now on the outer container so it always works.
       2. floating-anim is only applied if reducedMotion is false.
    */}
    <div className={`w-full h-full relative flex flex-col items-center ${!reducedMotion ? 'floating-anim' : ''}`}>
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[130%] h-[70%] bg-indigo-500/5 rounded-full blur-3xl -z-10" />
      {renderAnimal()}
    </div>

    <style>{`
      .tentacle-path {
        animation: squiggle 3.5s ease-in-out infinite alternate;
        transform-origin: top center;
      }
      @keyframes squiggle {
        0% { stroke-dashoffset: 0; transform: scaleY(0.85) translateX(-3px); opacity: 0.7; }
        100% { stroke-dashoffset: 2; transform: scaleY(1.15) translateX(3px); opacity: 0.9; }
      }
      .floating-anim {
        animation: float 5s ease-in-out infinite;
      }
      @keyframes float {
        0%, 100% { transform: translateY(0); }
        50% { transform: translateY(-12px); }
      }
    `}</style>
  </div>
);
};
