
import React, { useState } from 'react';
import type { PatientProfile } from '../types';
import { Plus, Edit2, ArrowRight, ChevronLeft, Trash2, AlertTriangle, MessageCircle } from 'lucide-react';
import { Avatar } from '../components/Avatar';

interface DashboardProps {
  patients: PatientProfile[];
  onAddPatient: () => void;
  onEditPatient: (id: string) => void;
  onDeletePatient: (id: string) => void;
  onChat: (id: string) => void;
  onLogout: () => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ patients, onAddPatient, onEditPatient, onDeletePatient, onChat, onLogout }) => {
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const confirmDelete = () => {
    if (deleteId) {
      onDeletePatient(deleteId);
      setDeleteId(null);
    }
  };

  return (
    <div className="w-full max-w-6xl mx-auto p-6 animate-in fade-in duration-700">
      <header className="mb-8 mt-4 flex items-center justify-between border-b border-white/5 pb-4 relative">
        <button 
          onClick={onLogout}
          className="p-2 hover:bg-white/10 rounded-full transition-all active:scale-90 glass-panel border-white/10 shadow-lg shadow-indigo-500/10"
          aria-label="Go back to login"
        >
          <ChevronLeft size={24} className="text-indigo-200" />
        </button>

        <div className="flex-1 text-center">
          <h1 className="text-3xl font-extrabold mb-1 tracking-tight text-white">Your Loved Ones</h1>
          <p className="text-indigo-200/90 text-base font-medium">Select a profile to start a conversation</p>
        </div>
        
        <div className="w-[42px]" aria-hidden="true" />
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
        {patients.map((patient) => (
          <div 
            key={patient.id} 
            onClick={() => onChat(patient.id)}
            className="group glass-panel rounded-3xl p-8 cursor-pointer hover:bg-white/10 transition-all duration-500 border-white/10 hover:border-indigo-400/40 flex flex-col items-center relative overflow-hidden shadow-2xl shadow-indigo-500/15 hover:shadow-indigo-500/30 aspect-square w-full"
          >
            <div className="absolute top-6 right-6 opacity-0 group-hover:opacity-100 transition-opacity z-30 flex gap-2">
                <button 
                  onClick={(e) => { e.stopPropagation(); onEditPatient(patient.id); }}
                  className="p-3 bg-white/20 rounded-full backdrop-blur-md hover:bg-white/30 transition-colors text-white"
                  title="Edit Profile"
                >
                    <Edit2 size={20} />
                </button>
                <button 
                  onClick={(e) => { e.stopPropagation(); setDeleteId(patient.id); }}
                  className="p-3 bg-red-500/20 rounded-full backdrop-blur-md hover:bg-red-500 hover:text-white transition-colors text-red-300"
                  title="Delete Profile"
                >
                    <Trash2 size={20} />
                </button>
            </div>
            
            <div className="flex-1 flex items-center justify-center mt-4">
              <Avatar size="md" type={patient.avatarType} emotion="happy" />
            </div>
            
            <div className="text-center z-10 mb-6">
              <h3 className="text-3xl font-bold mb-1">{patient.name}</h3>
              <p className="text-xs uppercase tracking-[0.2em] text-indigo-300 font-black opacity-80">{patient.stage}</p>
            </div>

            <div className="w-full pt-5 border-t border-white/10 flex justify-between items-center text-sm text-indigo-200 group-hover:text-white transition-colors">
                <span className="flex items-center gap-2 font-bold">
                  <MessageCircle size={18} className="text-green-400" />
                  Chat with Companion
                </span>
                <ArrowRight size={20} className="group-hover:translate-x-2 transition-transform duration-300 text-indigo-400 group-hover:text-white" />
            </div>
          </div>
        ))}

        <button 
          onClick={onAddPatient}
          className="glass-panel rounded-3xl p-8 flex flex-col items-center justify-center gap-6 hover:bg-indigo-500/10 transition-all border-dashed border-2 border-white/20 hover:border-indigo-400/50 group shadow-xl hover:shadow-indigo-500/15 aspect-square w-full"
        >
          <div className="w-20 h-20 rounded-full bg-white/5 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform duration-300">
            <Plus size={40} className="text-indigo-200" />
          </div>
          <span className="font-bold text-2xl text-indigo-100">Add New Profile</span>
        </button>
      </div>

      {/* Delete Confirmation Modal */}
      {deleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#171140]/80 backdrop-blur-sm animate-in fade-in duration-200">
           <div className="glass-panel p-8 rounded-3xl max-w-md w-full text-center border-red-500/30 shadow-[0_0_50px_rgba(239,68,68,0.2)] animate-in zoom-in-95 duration-200 scale-100">
              <div className="w-20 h-20 bg-red-500/20 text-red-400 rounded-full flex items-center justify-center mx-auto mb-6 ring-4 ring-red-500/10">
                <AlertTriangle size={40} />
              </div>
              <h3 className="text-2xl font-bold text-white mb-2">Delete Profile?</h3>
              <p className="text-indigo-200 mb-8 leading-relaxed">
                Are you sure you want to delete this profile? All configuration, memories, and personalization will be <span className="text-red-300 font-bold">permanently lost</span>.
              </p>
              <div className="flex gap-4">
                <button 
                  onClick={() => setDeleteId(null)} 
                  className="flex-1 py-4 px-6 rounded-2xl bg-white/5 hover:bg-white/10 text-white font-bold transition-all border border-white/5"
                >
                  Cancel
                </button>
                <button 
                  onClick={confirmDelete} 
                  className="flex-1 py-4 px-6 rounded-2xl bg-red-500 hover:bg-red-600 text-white font-bold transition-all shadow-lg shadow-red-500/20 active:scale-95 flex items-center justify-center gap-2"
                >
                  <Trash2 size={18} />
                  Delete
                </button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};
