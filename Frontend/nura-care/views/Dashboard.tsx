import React, { useState, useEffect } from 'react';
import type { PatientProfile } from '../types';
import { 
  Plus, Edit2, ArrowRight, LogOut, Trash2, 
  AlertTriangle, MessageCircle, ShieldAlert, 
  Settings as SettingsIcon 
} from 'lucide-react';
import { Avatar } from '../components/Avatar';

interface DashboardProps {
  reducedMotion: boolean;
  caregiverEmail: string; 
  refreshKey: number; 
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
  reducedMotion,
  caregiverEmail, 
  refreshKey,
  onAddPatient, 
  onEditPatient, 
  onDeletePatient, 
  onDeleteAccount,
  onChat, 
  onLogout,
  setAppPatients,
  onViewLogs,
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

  const fetchDashboardData = async () => {
    try {
      const email = caregiverEmail.toLowerCase().trim();
      const response = await fetch(`http://127.0.0.1:8000/caregiver/init-profile/${encodeURIComponent(email)}`); 
      const data = await response.json();
      
      if (response.ok && data.exists && data.patients) {
        const formattedPatients = data.patients.map((p: any) => ({
          ...p,
          id: p.patient_id || p.id,
          name: p.full_name || p.name,
          avatarType: p.avatarType || 'jellyfish' 
        }));
        setPatients(formattedPatients); 
        setAppPatients(formattedPatients); 
      }
    } catch (err) {
      setError("Could not connect to server.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (caregiverEmail) fetchDashboardData();
  }, [caregiverEmail, refreshKey]);

  const confirmDeletePatient = async () => {
    if (!deleteId) return;
    setIsDeleting(true);
    try {
      const email = caregiverEmail.toLowerCase().trim();
      const response = await fetch(`http://127.0.0.1:8000/patients/delete/${encodeURIComponent(email)}/${deleteId}`, {
        method: 'DELETE'
      });
      if (response.ok) {
        const remaining = patients.filter(p => (p.patient_id || p.id) !== deleteId);
        setPatients(remaining);
        setAppPatients(remaining);
        onDeletePatient(deleteId);
        setDeleteId(null);
      }
    } catch (err) {
      setError("Delete failed.");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleFullAccountDeletion = async () => {
    setIsAccountWiping(true);
    try {
      const response = await fetch("http://127.0.0.1:8000/caregiver/delete-account", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: confirmEmail.toLowerCase().trim(), password: confirmPass }),
      });
      if (response.ok) onDeleteAccount(); 
    } catch (err) {
      onDeleteAccount(); 
    } finally {
      setIsAccountWiping(false);
    }
  };

  if (isLoading) {
    return (
      <div className="w-full h-screen flex flex-col items-center justify-center bg-transparent">
      <div className="w-12 h-12 border-4 border-[var(--nura-accent)] border-t-transparent rounded-full animate-spin"></div>
    </div>
    );
  }

  return (
    <div className="w-full max-w-6xl mx-auto p-6 animate-in fade-in duration-700">
      <header className="mb-8 mt-4 flex items-center justify-between border-b border-white/5 pb-4">
        <div className="flex items-center gap-3">
          <button onClick={onLogout} className="flex items-center gap-2 px-4 py-2 hover:bg-red-500/10 rounded-xl transition-all bg-[var(--nura-card)] border-white/10 group">
            <LogOut size={20} className="text-[var(--nura-dim)] group-hover:text-red-400" />
            <span className="text-[var(--nura-text)] font-bold text-sm group-hover:text-red-300">Log Out</span>
          </button>
          <button onClick={onViewLogs} className="p-2.5 bg-[var(--nura-card)] hover:bg-nura-accent/20 rounded-full border border-white/10 transition-all text-[var(--nura-dim)] hover:text-[var(--nura-text)]">
            <SettingsIcon size={20} />
          </button>
        </div>
        <div className="flex-1 text-center">
          <h1 className="text-3xl font-extrabold text-[var(--nura-text)] tracking-tight">Your Loved Ones</h1>
        </div>
        <button onClick={() => setShowAccountDeleteModal(true)} className="px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 rounded-xl text-xs font-bold flex items-center gap-2">
          <ShieldAlert size={16} /> Delete Account
        </button>
      </header>

      {error && <div className="mb-6 bg-red-500/20 p-4 rounded-2xl text-red-100 font-bold border border-red-500/50 text-center">{error}</div>}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
        {patients.map((patient) => {
          const id = patient.patient_id || patient.id; 
          return (
            <div key={id} className="group bg-[var(--nura-card)] rounded-[2.5rem] relative aspect-square w-full hover:border-[var(--nura-accent)]/40 transition-all flex flex-col overflow-hidden border-white/5 shadow-2xl">
              <div onClick={() => onEditPatient(id)} className="flex-1 flex flex-col items-center justify-center p-8 cursor-pointer relative z-10">
                <div className="mb-4 transform group-hover:scale-110 transition-transform duration-500">
                  <Avatar size="md" type={patient.avatarType || 'jellyfish'} emotion="happy" reducedMotion={reducedMotion} />
                </div>
                <div className="text-center">
                  <h3 className="text-3xl font-black text-[var(--nura-text)] mb-1">{patient.name}</h3>
                  <p className="text-[10px] uppercase text-[var(--nura-accent)] font-black tracking-[0.2em]">{patient.dementia_stage || patient.stage}</p>
                </div>
                <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity z-30 flex gap-2">
                    <button onClick={(e) => { e.stopPropagation(); onEditPatient(id); }} className="p-2.5 bg-black/40 hover:bg-[var(--nura-accent)]/40 rounded-full text-[var(--nura-text)] border border-white/10 transition-all backdrop-blur-md">
                      <Edit2 size={16} />
                    </button>
                    <button onClick={(e) => { e.stopPropagation(); setDeleteId(id); }} className="p-2.5 bg-black/40 hover:bg-red-500/40 rounded-full text-red-400 border border-white/10 transition-all backdrop-blur-md">
                      <Trash2 size={16} />
                    </button>
                </div>
              </div>

              {/* BEGIN SESSION BUTTON */}
              <button onClick={() => setTimeModalPatientId(id)} className="w-full py-6 px-8 border-t border-white/10 bg-nura-card hover:bg-transparent/[0.08] flex justify-between items-center z-20">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-green-500/20 rounded-lg text-green-400"><MessageCircle size={18} /></div>
                  <span className="font-black text-[var(--nura-text)] text-sm tracking-wide">BEGIN SESSION</span>
                </div>
                <ArrowRight size={20} className="text-[var(--nura-accent)]" />
              </button>
            </div>
          );
        })}

        <button onClick={onAddPatient} className="bg-[var(--nura-card)]/80 backdrop-blur-md rounded-[2.5rem] p-8 flex flex-col items-center justify-center gap-6 border-dashed border-2 border-white/10 aspect-square w-full hover:bg-nura-accent/20 transition-all group">
          <div className="w-16 h-16 rounded-full bg-[var(--nura-accent)]/10 flex items-center justify-center group-hover:scale-110 transition-transform">
            <Plus size={40} className="text-[var(--nura-accent)]" />
          </div>
          <span className="font-black text-[var(--nura-text)] opacity-90 text-sm tracking-wide uppercase">Add New Profile</span>
        </button>
      </div>

      {/* FIXED: TIME MODAL BUTTONS */}
      {timeModalPatientId && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
           <div className="bg-[var(--nura-card)] p-8 rounded-3xl max-w-sm w-full text-center border border-white/10 shadow-2xl">
              <h3 className="text-2xl font-black text-[var(--nura-text)] mb-6 tracking-tight">Set Duration</h3>
              <div className="grid grid-cols-3 gap-3 mb-8">
  {[15, 30].map(mins => (
    <button 
      key={mins} 
      type="button"
      /* FIXED: Ensure we are comparing numbers to numbers */
      onClick={() => { 
        setSelectedTime(Number(mins)); 
        setCustomMinutes(''); 
      }} 
      className={`py-4 rounded-xl font-black transition-all border-2 ${
        Number(selectedTime) === Number(mins) 
          ? 'bg-[var(--nura-accent)] border-white/20 text-white shadow-lg scale-105' 
          : 'bg-black/20 text-[var(--nura-dim)] border-transparent hover:bg-nura-accent/20'
      }`}
    >
      {mins}m
    </button>
  ))} 
              
                <button onClick={() => setSelectedTime('custom')} className={`py-4 rounded-xl font-black transition-all ${selectedTime === 'custom' ? 'bg-[var(--nura-accent)] text-white' : 'bg-black/20 text-[var(--nura-dim)] border border-white/5 hover:bg-nura-accent/20'}`}>Custom</button>
              </div>
              {selectedTime === 'custom' && <input type="number" placeholder="Minutes..." value={customMinutes} onChange={(e) => setCustomMinutes(e.target.value)} className="w-full bg-black/40 border border-[var(--nura-accent)]/50 rounded-xl p-4 text-[var(--nura-text)] text-center mb-6" />}
              <div className="flex gap-4">
                <button onClick={() => setTimeModalPatientId(null)} className="flex-1 py-4 text-[var(--nura-text)] font-bold bg-transparent/5 rounded-2xl">Back</button>
                <button 
                  onClick={() => {
                    const mins = selectedTime === 'custom' ? parseInt(customMinutes) || 15 : selectedTime as number;
                    onChat(timeModalPatientId, mins); // TRIGGER APP VIEW CHANGE
                    setTimeModalPatientId(null);
                  }} 
                  className="flex-1 py-4 bg-[var(--nura-accent)] text-white font-black rounded-2xl shadow-lg"
                >
                  Start Chat
                </button>
              </div>
           </div>
        </div>
      )}
      {/* ... Other Modals ... */}
    </div>
  );
};
