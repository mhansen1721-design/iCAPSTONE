import React, { useState, useEffect } from 'react';
import type { PatientProfile } from '../types';
import { Plus, Edit2, ArrowRight, ChevronLeft, Trash2, AlertTriangle, MessageCircle } from 'lucide-react';
import { Avatar } from '../components/Avatar';

interface DashboardProps {
  caregiverEmail: string; // Used to fetch specific caregiver data
  onAddPatient: () => void;
  onEditPatient: (id: string) => void;
  onDeletePatient: (id: string) => void;
  onChat: (id: string) => void;
  onLogout: () => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ 
  caregiverEmail, 
  onAddPatient, 
  onEditPatient, 
  onDeletePatient, 
  onChat, 
  onLogout 
}) => {
  // Initialize with an EMPTY array to remove "Jane Doe" mock data
  const [patients, setPatients] = useState<any[]>([]); 
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch data from backend on mount or when email changes
  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        // Normalize email to match backend storage
        const email = caregiverEmail.toLowerCase().trim();
        const response = await fetch(`http://127.0.0.1:8000/caregiver/init-profile/${encodeURIComponent(email)}`);
        
        const data = await response.json();
        
        // If profile exists, set state; otherwise, keep it empty []
        if (response.ok && data.exists && data.patient) {
          setPatients([data.patient]); 
        } else {
          setPatients([]); 
        }
      } catch (err) {
        console.error("Dashboard fetch failed");
        setPatients([]); 
      } finally {
        // Always stop loading to show the "Add New Profile" button
        setIsLoading(false);
      }
    };

    if (caregiverEmail) {
      fetchDashboardData();
    } else {
      setIsLoading(false);
    }
  }, [caregiverEmail]);

  const confirmDelete = () => {
    if (deleteId) {
      onDeletePatient(deleteId);
      setDeleteId(null);
      setPatients([]); // Clear local state after deletion
    }
  };

  if (isLoading) {
    return (
      <div className="w-full h-screen flex flex-col items-center justify-center bg-[#171140]">
        <div className="w-12 h-12 border-4 border-indigo-400 border-t-transparent rounded-full animate-spin mb-4"></div>
        <div className="animate-pulse text-indigo-300 font-bold text-xl">Connecting to Nura Care...</div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-6xl mx-auto p-6 animate-in fade-in duration-700">
      <header className="mb-8 mt-4 flex items-center justify-between border-b border-white/5 pb-4 relative">
        <button 
          onClick={onLogout}
          className="p-2 hover:bg-white/10 rounded-full transition-all active:scale-90 glass-panel border-white/10 shadow-lg shadow-indigo-500/10"
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
        {patients.map((patient) => {
          // Map backend 'patient_id' to satisfy key requirements
          const id = patient.patient_id || patient.id; 
          
          return (
            <div 
              key={id} 
              onClick={() => onChat(id)}
              className="group glass-panel rounded-3xl p-8 cursor-pointer hover:bg-white/10 transition-all duration-500 border-white/10 hover:border-indigo-400/40 flex flex-col items-center relative overflow-hidden shadow-2xl shadow-indigo-500/15 hover:shadow-indigo-500/30 aspect-square w-full"
            >
              <div className="absolute top-6 right-6 opacity-0 group-hover:opacity-100 transition-opacity z-30 flex gap-2">
                  <button 
                    onClick={(e) => { e.stopPropagation(); onEditPatient(id); }}
                    className="p-3 bg-white/20 rounded-full backdrop-blur-md hover:bg-white/30 transition-colors text-white"
                    title="Edit Profile"
                  >
                      <Edit2 size={20} />
                  </button>
                  <button 
                    onClick={(e) => { e.stopPropagation(); setDeleteId(id); }}
                    className="p-3 bg-red-500/20 rounded-full backdrop-blur-md hover:bg-red-500 hover:text-white transition-colors text-red-300"
                    title="Delete Profile"
                  >
                      <Trash2 size={20} />
                  </button>
              </div>
              
              <div className="flex-1 flex items-center justify-center mt-4">
                <Avatar size="md" type={patient.avatarType || 'jellyfish'} emotion="happy" />
              </div>
              
              <div className="text-center z-10 mb-6">
                {/* Use backend 'full_name' and 'dementia_stage' keys */}
                <h3 className="text-3xl font-bold mb-1">{patient.full_name || patient.name}</h3>
                <p className="text-xs uppercase tracking-[0.2em] text-indigo-300 font-black opacity-80">
                    {patient.dementia_stage || patient.stage}
                </p>
              </div>

              <div className="w-full pt-5 border-t border-white/10 flex justify-between items-center text-sm text-indigo-200 group-hover:text-white transition-colors">
                  <span className="flex items-center gap-2 font-bold">
                    <MessageCircle size={18} className="text-green-400" />
                    Chat with Companion
                  </span>
                  <ArrowRight size={20} className="group-hover:translate-x-2 transition-transform duration-300 text-indigo-400 group-hover:text-white" />
              </div>
            </div>
          );
        })}

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
           <div className="glass-panel p-8 rounded-3xl max-w-md w-full text-center border-red-500/30 shadow-2xl animate-in zoom-in-95 duration-200">
              <div className="w-20 h-20 bg-red-500/20 text-red-400 rounded-full flex items-center justify-center mx-auto mb-6 ring-4 ring-red-500/10">
                <AlertTriangle size={40} />
              </div>
              <h3 className="text-2xl font-bold text-white mb-2">Delete Profile?</h3>
              <p className="text-indigo-200 mb-8 leading-relaxed">
                Are you sure you want to delete this profile? All configuration and memories will be <span className="text-red-300 font-bold">permanently lost</span>.
              </p>
              <div className="flex gap-4">
                <button onClick={() => setDeleteId(null)} className="flex-1 py-4 px-6 rounded-2xl bg-white/5 hover:bg-white/10 text-white font-bold border border-white/5 transition-all">Cancel</button>
                <button onClick={confirmDelete} className="flex-1 py-4 px-6 rounded-2xl bg-red-500 hover:bg-red-600 text-white font-bold transition-all shadow-lg shadow-red-500/20 active:scale-95 flex items-center justify-center gap-2">
                  <Trash2 size={18} /> Delete
                </button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};
