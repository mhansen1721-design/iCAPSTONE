import React, { useState, useEffect } from 'react';
import type { PatientProfile } from '../types';
import { Avatar } from '../components/Avatar';
import { ChevronLeft, Play, Clock, Edit3 } from 'lucide-react';

interface PatientPickerProps {
  patients: PatientProfile[];
  onSelect: (patientId: string, minutes: number) => void;
  onBack: () => void;
}

export const PatientPicker: React.FC<PatientPickerProps> = ({ patients, onSelect, onBack }) => {
  // 1. IMPROVED DATA SYNC: Use useEffect to set default ID once patients load
  const [selectedId, setSelectedId] = useState<string>('');
  const [duration, setDuration] = useState<number | 'custom'>(15);
  const [customMinutes, setCustomMinutes] = useState<string>('');

  useEffect(() => {
    if (patients.length > 0 && !selectedId) {
      setSelectedId(patients[0].patient_id || (patients[0] as any).id || '');
    }
  }, [patients, selectedId]);

  const selectedPatient = patients.find(p => (p.patient_id || (p as any).id) === selectedId);

  const handleStart = () => {
    const finalMins = duration === 'custom' ? parseInt(customMinutes) : duration;
    if (selectedId && finalMins > 0) {
      onSelect(selectedId, finalMins);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-6 animate-in fade-in zoom-in duration-700 bg-transparent">
      <button 
        onClick={onBack}
        className="absolute top-8 left-8 flex items-center gap-2 text-[var(--nura-dim)]/60 hover:text-[var(--nura-text)] transition-all text-sm font-medium group"
      >
        <ChevronLeft size={18} className="group-hover:-translate-x-1 transition-transform" /> 
        Back to roles
      </button>

      <div className="mb-8 transform transition-all duration-500 scale-110">
        <Avatar 
          size="xl" 
          type={selectedPatient?.avatarType || 'jellyfish'} 
          emotion="happy" 
        />
      </div>

      <h1 className="text-5xl font-black text-[var(--nura-text)] mb-3 text-center tracking-tighter">Hello there!</h1>
      <p className="text-indigo-200/50 mb-10 text-center max-w-xs leading-relaxed">Ready to talk? Please select your profile.</p>

      <div className="bg-[var(--nura-card)] p-10 rounded-[2.5rem] w-full max-w-md border-white/10 shadow-2xl flex flex-col gap-6 bg-[var(--nura-bg)]/40 backdrop-blur-2xl">
        
        {/* Profile Dropdown */}
        <div className="space-y-2">
          <select 
            value={selectedId}
            onChange={(e) => setSelectedId(e.target.value)}
            className="w-full bg-indigo-500/10 border border-white/10 rounded-2xl p-5 text-[var(--nura-text)] font-bold focus:border-indigo-400 outline-none appearance-none cursor-pointer"
          >
            {patients.length === 0 ? (
              <option value="">No profiles found...</option>
            ) : (
              patients.map(p => (
                <option key={p.patient_id || (p as any).id} value={p.patient_id || (p as any).id} className="bg-[var(--nura-bg)] text-[var(--nura-text)]">
                  {p.name || p.full_name}
                </option>
              ))
            )}
          </select>
        </div>

        {/* Customized Duration Selection */}
        <div className="grid grid-cols-3 gap-3">
          {[15, 30].map(mins => (
            <button 
              key={mins}
              onClick={() => { setDuration(mins); setCustomMinutes(''); }}
              className={`py-4 rounded-2xl font-black transition-all border ${
                duration === mins ? 'bg-indigo-600 border-indigo-400 text-[var(--nura-text)] shadow-lg shadow-indigo-500/20' : 'bg-[var(--nura-card)] border-white/5 text-[var(--nura-dim)]/60'
              }`}
            >
              {mins}m
            </button>
          ))}
          <button 
            onClick={() => setDuration('custom')}
            className={`py-4 rounded-2xl font-black transition-all border ${
              duration === 'custom' ? 'bg-indigo-600 border-indigo-400 text-[var(--nura-text)]' : 'bg-[var(--nura-card)] border-white/5 text-[var(--nura-dim)]/60'
            }`}
          >
            Custom
          </button>
        </div>

        {duration === 'custom' && (
          <div className="animate-in slide-in-from-top-2 duration-300">
             <input 
              type="number" 
              placeholder="Enter minutes..."
              value={customMinutes}
              onChange={(e) => setCustomMinutes(e.target.value)}
              className="w-full bg-black/20 border border-indigo-500/50 rounded-2xl p-4 text-[var(--nura-text)] text-center font-bold focus:border-indigo-400 outline-none"
             />
          </div>
        )}

        <button 
          onClick={handleStart}
          disabled={!selectedId || (duration === 'custom' && !customMinutes)}
          className="w-full bg-[#3b82f6] hover:bg-blue-600 text-[var(--nura-text)] py-6 rounded-[1.5rem] font-black text-xl shadow-xl shadow-blue-500/20 transition-all flex items-center justify-center gap-3 active:scale-95 disabled:opacity-20"
        >
          <Play size={24} fill="currentColor" /> Start Chatting
        </button>
      </div>
    </div>
  );
};
