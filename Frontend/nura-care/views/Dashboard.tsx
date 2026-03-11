import React, { useState, useEffect } from 'react';
import type { PatientProfile } from '../types';
import { Plus, Edit2, ArrowRight, LogOut, Trash2, AlertTriangle, MessageCircle, ShieldAlert } from 'lucide-react';
import { Avatar } from '../components/Avatar';

interface DashboardProps {
  caregiverEmail: string; 
  caregiverPassword: string; 
  onAddPatient: () => void;
  onEditPatient: (id: string) => void;
  onDeletePatient: (id: string) => void;
  onDeleteAccount: () => void; 
  onChat: (id: string, minutes: number) => void;
  onLogout: () => void;
  setAppPatients: (patients: PatientProfile[]) => void; 
  onViewLogs: () => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ 
  caregiverEmail, 
  caregiverPassword,
  onAddPatient, 
  onEditPatient, 
  onDeletePatient, 
  onDeleteAccount,
  onChat, 
  onLogout,
  setAppPatients
}) => {
  const [patients, setPatients] = useState<any[]>([]); 
  const [deleteId, setDeleteId] = useState<string | null>(null); 
  const [isLoading, setIsLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [showAccountDeleteModal, setShowAccountDeleteModal] = useState(false);
  const [confirmEmail, setConfirmEmail] = useState('');
  const [confirmPass, setConfirmPass] = useState('');
  const [isAccountWiping, setIsAccountWiping] = useState(false);

  const [timeModalPatientId, setTimeModalPatientId] = useState<string | null>(null);
  const [selectedTime, setSelectedTime] = useState<number | 'custom'>(15);
  const [customMinutes, setCustomMinutes] = useState<string>('');

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const email = caregiverEmail.toLowerCase().trim();
        // Updated to use 127.0.0.1 for consistency with your backend change
        const response = await fetch(`http://127.0.0.1:8000/caregiver/init-profile/${encodeURIComponent(email)}`); 
        const data = await response.json();
        
        if (response.ok && data.exists && data.patients) {
          const formattedPatients = data.patients.map((p: any) => ({
            ...p,
            id: p.patient_id,
            name: p.full_name || p.name 
          }));
          setPatients(formattedPatients); 
          setAppPatients(formattedPatients); 
        } else {
          setPatients([]); 
        }
      } catch (err) {
        console.error("Dashboard fetch failed:", err);
        setError("Could not connect to server.");
      } finally {
        setIsLoading(false);
      }
    };

    if (caregiverEmail) fetchDashboardData();
  }, [caregiverEmail, setAppPatients]);

  const handleSuccessfulPatientDelete = (idToRemove: string) => {
    setDeleteId(null); 
    setIsDeleting(false);
    const remaining = patients.filter(p => (p.patient_id || p.id) !== idToRemove);
    setPatients(remaining);
    setAppPatients(remaining);
    onDeletePatient(idToRemove);
  };

  const confirmDeletePatient = async () => {
    if (!deleteId) return;
    setIsDeleting(true);
    setError(null);
    
    try {
      const email = caregiverEmail.toLowerCase().trim();
      const response = await fetch(`http://127.0.0.1:8000/patients/delete/${encodeURIComponent(email)}/${deleteId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        handleSuccessfulPatientDelete(deleteId);
      } else {
        const data = await response.json().catch(() => ({}));
        setError(data.detail || "Server rejected deletion.");
        setIsDeleting(false);
      }
    } catch (err) {
      handleSuccessfulPatientDelete(deleteId);
    }
  };

  const handleFullAccountDeletion = async () => {
    setError(null);
    setIsAccountWiping(true);
    try {
      const response = await fetch("http://127.0.0.1:8000/caregiver/delete-account", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          email: confirmEmail.toLowerCase().trim(), 
          password: confirmPass 
        }),
      });
      if (response.ok) {
        setShowAccountDeleteModal(false);
        onDeleteAccount(); 
      } else {
        const result = await response.json();
        setError(result.detail || "Verification failed.");
        setIsAccountWiping(false);
      }
    } catch (err) {
      onDeleteAccount(); 
    }
  };

  if (isLoading) {
    return (
      <div className="w-full h-screen flex flex-col items-center justify-center">
        <div className="w-12 h-12 border-4 border-indigo-400 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-6xl mx-auto p-6 animate-in fade-in duration-700">
      <header className="mb-8 mt-4 flex items-center justify-between border-b border-white/5 pb-4">
        <button onClick={onLogout} className="flex items-center gap-2 px-4 py-2 hover:bg-red-500/10 rounded-xl transition-all glass-panel border-white/10 group">
          <LogOut size={20} className="text-indigo-200 group-hover:text-red-400" />
          <span className="text-indigo-100 font-bold text-sm group-hover:text-red-300">Log Out</span>
        </button>
        <div className="flex-1 text-center"><h1 className="text-3xl font-extrabold text-white tracking-tight">Your Loved Ones</h1></div>
        <button onClick={() => setShowAccountDeleteModal(true)} className="px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 rounded-xl text-xs font-bold transition-all flex items-center gap-2">
          <ShieldAlert size={16} /> Delete Account
        </button>
      </header>

      {error && <div className="mb-6 bg-red-500/20 p-4 rounded-2xl text-red-100 font-bold border border-red-500/50 text-center">{error}</div>}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
        {patients.map((patient) => {
          const id = patient.patient_id || patient.id; 
          return (
            <div key={id} className="group glass-panel rounded-[2.5rem] relative aspect-square w-full hover:border-indigo-400/40 transition-all flex flex-col overflow-hidden border-white/5 shadow-2xl">
              
              {/* --- TOP SECTION: CLICK TO VIEW ANALYTICS --- */}
              <div 
                onClick={() => onEditPatient(id)}
                className="flex-1 flex flex-col items-center justify-center p-8 cursor-pointer hover:bg-white/[0.02] transition-colors relative"
              >
                <div className="mb-4 transform group-hover:scale-110 transition-transform duration-500">
                  <Avatar size="md" type={patient.avatarType || 'jellyfish'} emotion="happy" />
                </div>
                <div className="text-center">
                  <h3 className="text-3xl font-black text-white mb-1">{patient.name}</h3>
                  <p className="text-[10px] uppercase text-indigo-400 font-black tracking-[0.2em]">{patient.dementia_stage || patient.stage}</p>
                </div>

                {/* Inline Action Buttons (Edit/Trash) */}
                <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity z-30 flex gap-2">
                    <button onClick={(e) => { e.stopPropagation(); onEditPatient(id); }} className="p-2.5 bg-black/40 hover:bg-indigo-500/40 rounded-full text-white border border-white/10 transition-all backdrop-blur-md" title="Settings"><Edit2 size={16} /></button>
                    <button onClick={(e) => { e.stopPropagation(); setDeleteId(id); }} className="p-2.5 bg-black/40 hover:bg-red-500/40 rounded-full text-red-400 border border-white/10 transition-all backdrop-blur-md" title="Delete"><Trash2 size={16} /></button>
                </div>
              </div>

              {/* --- BOTTOM SECTION: CLICK TO BEGIN SESSION --- */}
              <button 
                onClick={() => setTimeModalPatientId(id)}
                className="w-full py-6 px-8 border-t border-white/10 bg-white/[0.03] hover:bg-white/[0.08] flex justify-between items-center transition-all group/btn"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-green-500/20 rounded-lg text-green-400">
                    <MessageCircle size={18} />
                  </div>
                  <span className="font-black text-indigo-100 text-sm tracking-wide">BEGIN SESSION</span>
                </div>
                <ArrowRight size={20} className="text-indigo-400 group-hover/btn:translate-x-2 transition-transform" />
              </button>
            </div>
          );
        })}

        <button onClick={onAddPatient} className="glass-panel rounded-[2.5rem] p-8 flex flex-col items-center justify-center gap-6 border-dashed border-2 border-white/10 aspect-square w-full hover:bg-white/5 hover:border-indigo-400/50 transition-all group">
          <div className="w-16 h-16 rounded-full bg-indigo-500/10 flex items-center justify-center group-hover:scale-110 transition-transform">
            <Plus size={40} className="text-indigo-300" />
          </div>
          <span className="font-black text-xl text-indigo-100">Add New Profile</span>
        </button>
      </div>

      {/* --- MODALS (Unchanged Logic) --- */}
      {deleteId && (
        <div className="fixed inset-0 z-[150] bg-black/70 backdrop-blur-md flex items-center justify-center p-4">
          <div className="glass-panel p-8 rounded-3xl max-w-sm w-full text-center border-white/10">
            <AlertTriangle size={48} className="text-red-400 mx-auto mb-4" />
            <h3 className="text-2xl font-bold text-white mb-2">Delete Profile?</h3>
            <p className="text-indigo-200/60 text-sm mb-8">This will remove this profile permanently.</p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteId(null)} className="flex-1 py-4 bg-white/5 text-white font-bold rounded-2xl hover:bg-white/10 transition-all">Cancel</button>
              <button onClick={confirmDeletePatient} className="flex-1 py-4 bg-red-500 text-white font-bold rounded-2xl hover:bg-red-600 transition-all">
                {isDeleting ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}

      {showAccountDeleteModal && (
        <div className="fixed inset-0 z-[200] bg-black/80 backdrop-blur-xl flex items-center justify-center p-6">
          <div className="glass-panel p-8 rounded-3xl w-full max-w-md border border-red-500/30">
            <div className="text-center mb-6">
              <ShieldAlert size={48} className="text-red-500 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-white">Delete Account?</h2>
              <p className="text-indigo-200/60 text-sm mt-2">This cannot be undone.</p>
            </div>
            <div className="space-y-4">
              <input type="email" placeholder="Confirm Email" value={confirmEmail} onChange={(e) => setConfirmEmail(e.target.value)} className="w-full bg-black/20 border border-white/10 rounded-xl p-4 text-white" />
              <input type="password" placeholder="Confirm Password" value={confirmPass} onChange={(e) => setConfirmPass(e.target.value)} className="w-full bg-black/20 border border-white/10 rounded-xl p-4 text-white" />
              <div className="flex gap-3 pt-2">
                <button onClick={() => setShowAccountDeleteModal(false)} className="flex-1 py-4 bg-white/5 text-white font-bold rounded-2xl">Cancel</button>
                <button disabled={isAccountWiping} onClick={handleFullAccountDeletion} className="flex-1 py-4 bg-red-600 text-white font-bold rounded-2xl">
                  {isAccountWiping ? "Wiping..." : "Confirm"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {timeModalPatientId && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
           <div className="glass-panel p-8 rounded-3xl max-w-sm w-full text-center">
              <h3 className="text-2xl font-black text-white mb-6 tracking-tight">Set Duration</h3>
              <div className="grid grid-cols-3 gap-3 mb-8">
                {[15, 30].map(mins => (
                  <button key={mins} onClick={() => { setSelectedTime(mins); setCustomMinutes(''); }} className={`py-4 rounded-xl font-black transition-all ${selectedTime === mins ? 'bg-indigo-500 text-white' : 'bg-white/5 text-indigo-200 border border-white/5 hover:bg-white/10'}`}>{mins}m</button>
                ))}
                <button onClick={() => setSelectedTime('custom')} className={`py-4 rounded-xl font-black transition-all ${selectedTime === 'custom' ? 'bg-indigo-500 text-white' : 'bg-white/5 text-indigo-200 border border-white/5 hover:bg-white/10'}`}>Custom</button>
              </div>
              {selectedTime === 'custom' && <input type="number" placeholder="Minutes..." value={customMinutes} onChange={(e) => setCustomMinutes(e.target.value)} className="w-full bg-black/20 border border-indigo-500/50 rounded-xl p-4 text-white text-center mb-6" />}
              <div className="flex gap-4">
                <button onClick={() => setTimeModalPatientId(null)} className="flex-1 py-4 text-white font-bold bg-white/5 rounded-2xl">Back</button>
                <button onClick={() => onChat(timeModalPatientId!, selectedTime === 'custom' ? parseInt(customMinutes) : selectedTime as number)} className="flex-1 py-4 bg-indigo-500 text-white font-black rounded-2xl shadow-lg shadow-indigo-500/20">Start Chat</button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};
