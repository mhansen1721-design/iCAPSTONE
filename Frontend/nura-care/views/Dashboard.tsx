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
  // --- STATE ---
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

  // --- INITIAL DATA FETCH ---
  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const email = caregiverEmail.toLowerCase().trim();
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
      } finally {
        setIsLoading(false);
      }
    };

    if (caregiverEmail) fetchDashboardData();
  }, [caregiverEmail, setAppPatients]);

  // --- LOGIC: DELETE PATIENT ---
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
      // Optimistic fix for server restarts
      console.warn("Connection lost during delete, updating UI anyway.");
      handleSuccessfulPatientDelete(deleteId);
    }
  };

  // --- LOGIC: DELETE ACCOUNT ---
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
        const result = await response.json().catch(() => ({}));
        setError(result.detail || "Verification failed.");
        setIsAccountWiping(false);
      }
    } catch (err) {
      // Optimistic fix for server restarts
      console.warn("Account wipe connection lost, redirecting to login.");
      setShowAccountDeleteModal(false);
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
      <header className="mb-8 mt-4 flex items-center justify-between border-b border-white/5 pb-4 relative">
        <button onClick={onLogout} className="flex items-center gap-2 px-4 py-2 hover:bg-red-500/10 rounded-xl transition-all glass-panel border-white/10 group">
          <LogOut size={20} className="text-indigo-200 group-hover:text-red-400" />
          <span className="text-indigo-100 font-bold text-sm group-hover:text-red-300">Log Out</span>
        </button>
        <div className="flex-1 text-center"><h1 className="text-3xl font-extrabold text-white">Your Loved Ones</h1></div>
        <button onClick={() => setShowAccountDeleteModal(true)} className="px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 rounded-xl text-xs font-bold transition-all flex items-center gap-2">
          <ShieldAlert size={16} /> Delete Account
        </button>
      </header>

      {error && <div className="mb-6 bg-red-500/20 p-4 rounded-2xl text-red-100 font-bold border border-red-500/50 text-center">{error}</div>}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
        {patients.map((patient) => {
          const id = patient.patient_id || patient.id; 
          return (
            <div key={id} onClick={() => setTimeModalPatientId(id)} className="group glass-panel rounded-3xl p-8 cursor-pointer relative aspect-square w-full hover:border-indigo-400/30 transition-all flex flex-col items-center justify-between">
              <div className="absolute top-6 right-6 opacity-0 group-hover:opacity-100 transition-opacity z-30 flex gap-2">
                  <button onClick={(e) => { e.stopPropagation(); onEditPatient(id); }} className="p-3 bg-white/10 hover:bg-white/20 rounded-full text-white border border-white/10 transition-colors"><Edit2 size={20} /></button>
                  <button onClick={(e) => { e.stopPropagation(); setDeleteId(id); }} className="p-3 bg-red-500/10 hover:bg-red-500/20 rounded-full text-red-400 border border-red-500/10 transition-colors"><Trash2 size={20} /></button>
              </div>
              <div className="mt-4"><Avatar size="md" type={patient.avatarType || 'jellyfish'} emotion="happy" /></div>
              <div className="text-center">
                <h3 className="text-3xl font-bold text-white">{patient.name}</h3>
                <p className="text-xs uppercase text-indigo-300 tracking-widest">{patient.dementia_stage || patient.stage}</p>
              </div>
              <div className="w-full pt-5 border-t border-white/10 flex justify-between items-center text-sm text-indigo-200 group-hover:text-white transition-colors">
                 <span className="flex items-center gap-2 font-bold"><MessageCircle size={18} className="text-green-400" /> Begin Session</span>
                 <ArrowRight size={20} className="group-hover:translate-x-2 transition-transform duration-300 text-indigo-400" />
              </div>
            </div>
          );
        })}
        <button onClick={onAddPatient} className="glass-panel rounded-3xl p-8 flex flex-col items-center justify-center gap-6 border-dashed border-2 border-white/20 aspect-square w-full hover:bg-white/5 transition-all">
          <Plus size={40} className="text-indigo-200" /><span className="font-bold text-2xl text-indigo-100">Add New Profile</span>
        </button>
      </div>

      {/* --- MODAL 1: PATIENT DELETE --- */}
      {deleteId && (
        <div className="fixed inset-0 z-[150] bg-black/70 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-300">
          <div className="glass-panel p-8 rounded-3xl max-w-sm w-full text-center border-white/10 shadow-2xl animate-in zoom-in duration-300">
            <AlertTriangle size={48} className="text-red-400 mx-auto mb-4" />
            <h3 className="text-2xl font-bold text-white mb-2">Delete Profile?</h3>
            <p className="text-indigo-200/60 text-sm mb-8">This will remove this profile permanently.</p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteId(null)} className="flex-1 py-4 bg-white/5 text-white font-bold rounded-2xl hover:bg-white/10 transition-all">Cancel</button>
              <button onClick={confirmDeletePatient} className="flex-1 py-4 bg-red-500 text-white font-bold rounded-2xl hover:bg-red-600 transition-all shadow-lg shadow-red-500/20" disabled={isDeleting}>
                {isDeleting ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- MODAL 2: ACCOUNT DELETE (SIZE FIXED) --- */}
      {showAccountDeleteModal && (
        <div className="fixed inset-0 z-[200] bg-black/80 backdrop-blur-xl flex items-center justify-center p-6 animate-in fade-in duration-300">
          <div className="glass-panel p-8 rounded-3xl w-full max-w-md border border-red-500/30 shadow-2xl animate-in zoom-in duration-300">
            <div className="text-center mb-6">
              <ShieldAlert size={48} className="text-red-500 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-white">Delete Account?</h2>
              <p className="text-indigo-200/60 text-sm mt-2">Enter credentials to confirm permanent deletion.</p>
            </div>
            <div className="space-y-4">
              <input type="email" placeholder="Confirm Email" value={confirmEmail} onChange={(e) => setConfirmEmail(e.target.value)} className="w-full bg-black/20 border border-white/10 rounded-xl p-4 text-white focus:border-red-500/50 outline-none transition-all" />
              <input type="password" placeholder="Confirm Password" value={confirmPass} onChange={(e) => setConfirmPass(e.target.value)} className="w-full bg-black/20 border border-white/10 rounded-xl p-4 text-white focus:border-red-500/50 outline-none transition-all" />
              <div className="flex gap-3 pt-2">
                <button onClick={() => { setShowAccountDeleteModal(false); setConfirmEmail(''); setConfirmPass(''); }} className="flex-1 py-4 bg-white/5 text-white font-bold rounded-2xl hover:bg-white/10 transition-all">Cancel</button>
                <button disabled={isAccountWiping || !confirmEmail || !confirmPass} onClick={handleFullAccountDeletion} className="flex-1 py-4 bg-red-600 hover:bg-red-700 text-white font-bold rounded-2xl transition-all disabled:opacity-50 shadow-lg shadow-red-900/20">
                  {isAccountWiping ? "Wiping..." : "Delete Everything"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* --- MODAL 3: TIME SELECTION --- */}
      {timeModalPatientId && !deleteId && !showAccountDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
           <div className="glass-panel p-8 rounded-3xl max-w-sm w-full text-center animate-in zoom-in duration-300">
              <h3 className="text-2xl font-bold text-white mb-6">Chat Duration</h3>
              <div className="grid grid-cols-3 gap-3 mb-8">
                {[15, 30].map(mins => (
                  <button key={mins} onClick={() => { setSelectedTime(mins); setCustomMinutes(''); }} className={`py-3 rounded-xl font-bold transition-all ${selectedTime === mins ? 'bg-[#715ffa] text-white shadow-lg' : 'bg-white/5 text-indigo-200 border border-white/5 hover:bg-white/10'}`}>{mins}m</button>
                ))}
                <button onClick={() => setSelectedTime('custom')} className={`py-3 rounded-xl font-bold transition-all ${selectedTime === 'custom' ? 'bg-[#715ffa] text-white' : 'bg-white/5 text-indigo-200 border border-white/5 hover:bg-white/10'}`}>Custom</button>
              </div>
              {selectedTime === 'custom' && <input type="number" placeholder="Minutes..." value={customMinutes} onChange={(e) => setCustomMinutes(e.target.value)} className="w-full bg-black/20 border border-indigo-400/50 rounded-xl p-3 text-white text-center mb-6 animate-in slide-in-from-top-2" />}
              <div className="flex gap-4">
                <button onClick={() => setTimeModalPatientId(null)} className="flex-1 py-4 text-white font-bold bg-white/5 rounded-2xl hover:bg-white/10 transition-all">Back</button>
                <button onClick={() => onChat(timeModalPatientId!, selectedTime === 'custom' ? parseInt(customMinutes) : selectedTime as number)} className="flex-1 py-4 bg-[#715ffa] text-white font-bold rounded-2xl hover:bg-[#5d4cdb] transition-all shadow-lg shadow-indigo-500/20">Start</button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};
