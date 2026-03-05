import React, { useState, useEffect } from 'react';
import type { PatientProfile } from '../types';
import { Plus, Edit2, ArrowRight, LogOut, Trash2, AlertTriangle, MessageCircle } from 'lucide-react';
import { Avatar } from '../components/Avatar';

interface DashboardProps {
  caregiverEmail: string; 
  onAddPatient: () => void;
  onEditPatient: (id: string) => void;
  onDeletePatient: (id: string) => void;
  onChat: (id: string, minutes: number) => void;
  onLogout: () => void;
  // Syncs backend data back to App.tsx state
  setAppPatients: (patients: PatientProfile[]) => void; 
}

export const Dashboard: React.FC<DashboardProps> = ({ 
  caregiverEmail, 
  onAddPatient, 
  onEditPatient, 
  onDeletePatient, 
  onChat, 
  onLogout,
  setAppPatients
}) => {
  const [patients, setPatients] = useState<any[]>([]); 
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [timeModalPatientId, setTimeModalPatientId] = useState<string | null>(null);
  const [selectedTime, setSelectedTime] = useState<number | 'custom'>(15);
  const [customMinutes, setCustomMinutes] = useState<string>('');

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const email = caregiverEmail.toLowerCase().trim();
        const response = await fetch(`http://127.0.0.1:8000/caregiver/init-profile/${encodeURIComponent(email)}`); 
        const data = await response.json();
        
        if (response.ok && data.exists && data.patients) {
          const formattedPatients = data.patients.map((p: any) => ({
            ...p,
            id: p.patient_id // Normalizes backend ID for frontend use
          }));
          setPatients(formattedPatients); 
          setAppPatients(formattedPatients); // Informs App.tsx of the loaded data
        } else {
          setPatients([]); 
        }
      } catch (err) {
        console.error("Dashboard fetch failed:", err);
      } finally {
        setIsLoading(false);
      }
    };

    if (caregiverEmail) fetchDashboardData();
  }, [caregiverEmail, setAppPatients]);

  const confirmDelete = async () => {
    if (deleteId) {
      setIsDeleting(true);
      setError(null);
      try {
        const email = caregiverEmail.toLowerCase().trim();
        const response = await fetch(`http://127.0.0.1:8000/patients/delete/${encodeURIComponent(email)}/${deleteId}`, {
          method: 'DELETE'
        });
        const data = await response.json();

        if (response.ok && data.success) {
          onDeletePatient(deleteId); 
          const remaining = patients.filter(p => (p.patient_id || p.id) !== deleteId);
          setPatients(remaining);
          setAppPatients(remaining); // Syncs deletion to parent
          setDeleteId(null);
        } else {
          setError(data.detail || "Delete failed.");
        }
      } catch (err) {
        setError("Network error.");
      } finally {
        setIsDeleting(false);
      }
    }
  };

  if (isLoading) {
    return (
      <div className="w-full h-screen flex flex-col items-center justify-center bg-[#171140]">
        <div className="w-12 h-12 border-4 border-indigo-400 border-t-transparent rounded-full animate-spin mb-4"></div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-6xl mx-auto p-6 animate-in fade-in duration-700">
      <header className="mb-8 mt-4 flex items-center justify-between border-b border-white/5 pb-4 relative">
        <button 
          onClick={onLogout}
          className="flex items-center gap-2 px-4 py-2 hover:bg-red-500/10 rounded-xl transition-all glass-panel border-white/10 group"
        >
          <LogOut size={20} className="text-indigo-200 group-hover:text-red-400" />
          <span className="text-indigo-100 font-bold text-sm group-hover:text-red-300">Log Out</span>
        </button>

        <div className="flex-1 text-center">
          <h1 className="text-3xl font-extrabold text-white">Your Loved Ones</h1>
        </div>
        <div className="w-[100px]" />
      </header>

      {error && <div className="mb-6 bg-red-500/20 p-4 rounded-2xl text-red-100">{error}</div>}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
        {patients.map((patient) => {
          const id = patient.patient_id || patient.id; 
          return (
            <div key={id} onClick={() => setTimeModalPatientId(id)} className="group glass-panel rounded-3xl p-8 cursor-pointer relative aspect-square w-full">
              <div className="absolute top-6 right-6 opacity-0 group-hover:opacity-100 transition-opacity z-30 flex gap-2">
                  <button onClick={(e) => { e.stopPropagation(); onEditPatient(id); }} className="p-3 bg-white/20 rounded-full text-white"><Edit2 size={20} /></button>
                  <button onClick={(e) => { e.stopPropagation(); setDeleteId(id); }} className="p-3 bg-red-500/20 rounded-full text-red-300"><Trash2 size={20} /></button>
              </div>
              <div className="flex-1 flex items-center justify-center mt-4"><Avatar size="md" type={patient.avatarType || 'jellyfish'} emotion="happy" /></div>
              <div className="text-center mb-6">
                <h3 className="text-3xl font-bold text-white">{patient.full_name || patient.name}</h3>
                <p className="text-xs uppercase text-indigo-300">{patient.dementia_stage || patient.stage}</p>
              </div>
             <div className="w-full pt-5 border-t border-white/10 flex justify-between items-center text-sm text-indigo-200 group-hover:text-white transition-colors">
                   <span className="flex items-center gap-2 font-bold">
                   <MessageCircle size={18} className="text-green-400" />
                     Start Chat for {patient.full_name || patient.name}
                   </span>
                 <ArrowRight size={20} className="group-hover:translate-x-2 transition-transform duration-300 text-indigo-400 group-hover:text-white" />
              </div>
            </div>
          );
        })}
        <button onClick={onAddPatient} className="glass-panel rounded-3xl p-8 flex flex-col items-center justify-center gap-6 border-dashed border-2 border-white/20 aspect-square w-full">
          <Plus size={40} className="text-indigo-200" />
          <span className="font-bold text-2xl text-indigo-100">Add New Profile</span>
        </button>
      </div>

      {timeModalPatientId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="glass-panel p-8 rounded-3xl max-w-sm w-full text-center border-white/10 shadow-2xl animate-in zoom-in">
            <h3 className="text-2xl font-bold text-white mb-2">Set Chat Time Length</h3>
            <p className="text-indigo-200 mb-6 text-sm">Select duration or enter custom minutes.</p>
            
            <div className="grid grid-cols-3 gap-3 mb-4">
              {[15, 30].map(mins => (
                <button
                  key={mins}
                  onClick={() => { setSelectedTime(mins); setCustomMinutes(''); }}
                  className={`py-3 rounded-xl font-bold transition-all ${selectedTime === mins ? 'bg-[#715ffa] text-white shadow-lg' : 'bg-white/5 text-indigo-200 border border-white/5'}`}
                >
                  {mins}m
                </button>
              ))}
              <button
                onClick={() => setSelectedTime('custom')}
                className={`py-3 rounded-xl font-bold transition-all ${selectedTime === 'custom' ? 'bg-[#715ffa] text-white' : 'bg-white/5 text-indigo-200 border border-white/5'}`}
              >
                Custom
              </button>
            </div>

            {selectedTime === 'custom' && (
              <div className="mb-6 animate-in slide-in-from-top-2">
                <input 
                  type="number"
                  placeholder="Minutes..."
                  value={customMinutes}
                  onChange={(e) => setCustomMinutes(e.target.value)}
                  className="w-full bg-black/20 border border-indigo-400/50 rounded-xl p-3 text-white text-center focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                  autoFocus
                />
              </div>
            )}

            <div className="flex gap-4 pt-2">
              <button 
                onClick={() => { setTimeModalPatientId(null); setSelectedTime(15); setCustomMinutes(''); }} 
                className="flex-1 py-4 text-white font-bold bg-white/5 rounded-2xl hover:bg-white/10"
              >
                Cancel
              </button>
              <button 
                disabled={selectedTime === 'custom' && (!customMinutes || parseInt(customMinutes) <= 0)}
                onClick={() => {
                  const finalMins = selectedTime === 'custom' ? parseInt(customMinutes) : (selectedTime as number);
                  onChat(timeModalPatientId, finalMins); 
                  setTimeModalPatientId(null);
                }} 
                className="flex-1 py-4 bg-[#715ffa] hover:bg-[#8475ff] text-white font-bold rounded-2xl shadow-lg transition-all active:scale-95 disabled:opacity-50"
              >
                Start
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#171140]/80 backdrop-blur-sm">
           <div className="glass-panel p-8 rounded-3xl max-w-md w-full text-center">
              <AlertTriangle size={40} className="mx-auto mb-6 text-red-400" />
              <h3 className="text-2xl font-bold text-white mb-2">Delete Profile?</h3>
              <div className="flex gap-4 mt-8">
                <button disabled={isDeleting} onClick={() => setDeleteId(null)} className="flex-1 py-4 rounded-2xl bg-white/5 text-white">Cancel</button>
                <button disabled={isDeleting} onClick={confirmDelete} className="flex-1 py-4 rounded-2xl bg-red-500 text-white">
                  {isDeleting ? "Deleting..." : "Delete"}
                </button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};
