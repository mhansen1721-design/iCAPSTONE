import React, { useState, useEffect, useRef } from 'react';
import type { PatientProfile } from '../types';
import { Avatar } from '../components/Avatar';
import { ChevronLeft, Play, User } from 'lucide-react';

interface PatientPickerProps {
  patients: PatientProfile[];
  onSelect: (patientId: string, minutes: number) => void;
  onBack: () => void;
}

export const PatientPicker: React.FC<PatientPickerProps> = ({ patients, onSelect, onBack }) => {
  const [selectedId, setSelectedId] = useState<string>('');
  const [isOpen, setIsOpen] = useState(false);
  const [duration, setDuration] = useState<number | 'custom'>(15);
  const [customMinutes, setCustomMinutes] = useState<string>('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Set default patient on load
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
    <div className="flex flex-col items-center min-h-screen bg-transparent relative overflow-x-hidden">
      
      {/* BACK BUTTON - Absolute so it doesn't shift anything */}
      <button 
        onClick={onBack}
        className="absolute top-8 left-8 flex items-center gap-2 text-[var(--nura-dim)] hover:text-[var(--nura-text)] transition-all text-sm font-black uppercase tracking-widest z-50 group"
      >
        <ChevronLeft size={18} className="group-hover:-translate-x-1 transition-transform" /> 
        Back
      </button>

      {/* LAYOUT ENGINE: 
          We use mt-[12vh] to push the avatar down from the top.
          We use a negative margin bottom (-mb-8) to pull the "Hello" text closer 
          to the avatar without increasing the total page length.
      */}
      <div className="w-full flex flex-col items-center mt-[12vh]">
        
        {/* AVATAR */}
        <div className="relative inline-flex mb-2">
          <div className="absolute inset-0 bg-[var(--nura-accent)]/10 rounded-full blur-[60px]" />
          <div className="relative z-10 scale-110">
            <Avatar 
              size="xl" 
              type={selectedPatient?.avatarType || 'jellyfish'} 
              emotion="happy" 
            />
          </div>
        </div>

        {/* TEXT SECTION - Pulled up slightly to look integrated with Avatar */}
        <div className="text-center z-10 -mt-2 mb-10">
          <h1 className="text-6xl font-black text-[var(--nura-text)] tracking-tighter mb-2">
            Hello!
          </h1>
          <p className="text-[var(--nura-dim)] text-lg font-medium">
            Ready to talk? Select a profile below.
          </p>
        </div>

        {/* MAIN THEME CARD */}
        <div className="bg-[var(--nura-card)] p-8 md:p-10 rounded-[3rem] w-full max-w-md border-2 border-[var(--nura-accent)]/10 shadow-2xl flex flex-col gap-6 backdrop-blur-3xl relative z-40 mx-4">
          
          {/* CUSTOM DROPDOWN */}
          <div className="relative" ref={dropdownRef}>
            <label className="text-[10px] text-[var(--nura-accent)] font-black uppercase tracking-[0.2em] ml-4 mb-2 block">
              Current Profile
            </label>
            
            <button 
              type="button"
              onClick={() => setIsOpen(!isOpen)}
              className="w-full bg-[var(--nura-bg)]/40 border-2 border-[var(--nura-accent)]/20 rounded-2xl p-5 flex items-center justify-between hover:border-[var(--nura-accent)] transition-all group"
            >
              <div className="flex items-center gap-3">
                <User size={20} className="text-[var(--nura-accent)]" />
                <span className="text-[var(--nura-text)] text-xl font-black truncate">
                  {selectedPatient ? (selectedPatient.name || selectedPatient.full_name) : "Select Profile"}
                </span>
              </div>
              <ChevronLeft size={24} className={`transition-transform duration-300 text-[var(--nura-accent)] ${isOpen ? 'rotate-90' : '-rotate-90'}`} />
            </button>

            {/* EXPANDED LIST */}
            {isOpen && (
              <div className="absolute top-[105%] left-0 right-0 bg-[#1a1a2e] border-2 border-[var(--nura-accent)]/40 rounded-2xl overflow-hidden z-[60] shadow-2xl animate-in fade-in slide-in-from-top-2">
                <div className="max-h-56 overflow-y-auto scrollbar-hide">
                  {patients.map((p) => {
                    const id = p.patient_id || (p as any).id;
                    const isMatch = id === selectedId;
                    return (
                      <button
                        key={id}
                        onClick={() => { setSelectedId(id); setIsOpen(false); }}
                        className={`w-full p-5 text-left font-black text-lg transition-all flex items-center justify-between border-b border-white/5 last:border-0 ${
                          isMatch ? 'bg-[var(--nura-accent)] text-[#0f172a]' : 'text-white hover:bg-white/5'
                        }`}
                      >
                        {p.name || p.full_name}
                        {isMatch && <div className="w-2 h-2 rounded-full bg-[#0f172a]" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* DURATION SELECTION */}
          <div className="grid grid-cols-3 gap-3">
            {[15, 30].map(mins => (
              <button 
                key={mins}
                onClick={() => { setDuration(mins); setCustomMinutes(''); }}
                className={`py-4 rounded-2xl font-black transition-all border-2 ${
                  duration === mins 
                    ? 'bg-[var(--nura-accent)] border-[var(--nura-accent)] text-[#0f172a] shadow-lg shadow-[var(--nura-accent)]/20' 
                    : 'bg-white/5 border-[var(--nura-text)]/10 text-[var(--nura-dim)] hover:border-[var(--nura-accent)]/40'
                }`}
              >
                {mins}m
              </button>
            ))}
            <button 
              onClick={() => setDuration('custom')}
              className={`py-4 rounded-2xl font-black transition-all border-2 ${
                duration === 'custom' 
                  ? 'bg-[var(--nura-accent)] border-[var(--nura-accent)] text-[#0f172a]' 
                  : 'bg-white/5 border-[var(--nura-text)]/10 text-[var(--nura-dim)]'
              }`}
            >
              Custom
            </button>
          </div>

          {/* CUSTOM MINUTES INPUT */}
          {duration === 'custom' && (
            <div className="animate-in slide-in-from-top-2 duration-300">
               <input 
                type="number" 
                placeholder="Minutes..."
                value={customMinutes}
                onChange={(e) => setCustomMinutes(e.target.value)}
                className="w-full bg-white border-2 border-[var(--nura-accent)]/30 rounded-2xl p-4 text-[#0f172a] text-center font-black text-xl focus:border-[var(--nura-accent)] outline-none placeholder:text-slate-400"
               />
            </div>
          )}

          {/* START BUTTON */}
          <button 
            onClick={handleStart}
            disabled={!selectedId || (duration === 'custom' && !customMinutes)}
            className="w-full bg-[var(--nura-accent)] hover:brightness-110 text-[#0f172a] py-6 rounded-2xl font-black text-2xl shadow-xl shadow-[var(--nura-accent)]/30 transition-all flex items-center justify-center gap-3 active:scale-95 disabled:opacity-30"
          >
            <Play size={28} fill="currentColor" /> Let's Go
          </button>
        </div>
      </div>
    </div>
  );
};
