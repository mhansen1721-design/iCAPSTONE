import React, { useState, useEffect } from 'react';
import type { PatientProfile } from '../types';
import { Plus, Edit2, ArrowRight, LogOut, Trash2, AlertTriangle, MessageCircle, ShieldAlert, Settings as SettingsIcon, Users, KeyRound, Check, X, BookOpen, ClipboardList, Image as ImageIcon } from 'lucide-react';
import { Avatar } from '../components/Avatar';

interface DashboardProps {
  reducedMotion: boolean;
  caregiverEmail: string;
  refreshKey: number;
  onAddPatient: () => void;
  onEditPatient: (id: string) => void;
  onConfigPatient: (id: string) => void; 
  onDeletePatient: (id: string) => void;
  onDeleteAccount: () => void;
  onChat: (id: string, minutes: number) => void;
  onLogout: () => void;
  onBack: () => void;
  onOpenCareCenter: () => void;
  onOpenPatientHub: (id: string) => void;
  onJoinSuccess: () => void;
  setAppPatients: (patients: PatientProfile[]) => void;
  onViewLogs: () => void;
  patients?: PatientProfile[];
}

export const Dashboard: React.FC<DashboardProps> = ({
  reducedMotion, caregiverEmail, refreshKey, onAddPatient, onEditPatient, onConfigPatient, onDeletePatient, onDeleteAccount, onChat, onLogout, onBack, onOpenCareCenter, onOpenPatientHub, onJoinSuccess, setAppPatients, onViewLogs,
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

  const [showJoinModal, setShowJoinModal] = useState(false);
  const [joinCode, setJoinCode] = useState('');
  const [isJoining, setIsJoining] = useState(false);
  const [joinError, setJoinError] = useState<string | null>(null);
  const [joinSuccess, setJoinSuccess] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [addModalTab, setAddModalTab] = useState<'new' | 'join'>('new');

  const fetchDashboardData = async () => {
    try {
      const email = caregiverEmail.toLowerCase().trim();
      const response = await fetch(`http://127.0.0.1:8000/caregiver/${encodeURIComponent(email)}/patients`);
      const data = await response.json();
      if (response.ok && data.patients) {
        const formatted = data.patients.map((p: any) => ({ ...p, id: p.patient_id || p.id, name: p.full_name || p.name, avatarType: p.avatarType || 'jellyfish' }));
        setPatients(formatted); setAppPatients(formatted);
      }
    } catch (err) { setError('Could not connect to server.'); } 
    finally { setIsLoading(false); }
  };

  useEffect(() => { if (caregiverEmail) fetchDashboardData(); }, [caregiverEmail, refreshKey]);

  const confirmDeletePatient = async () => {
    if (!deleteId) return;
    setIsDeleting(true);
    try {
      const email = caregiverEmail.toLowerCase().trim();
      const response = await fetch(`http://127.0.0.1:8000/patients/delete/${encodeURIComponent(email)}/${deleteId}`, { method: 'DELETE' });
      if (response.ok) {
        const remaining = patients.filter((p) => (p.patient_id || p.id) !== deleteId);
        setPatients(remaining); setAppPatients(remaining); onDeletePatient(deleteId); setDeleteId(null);
      }
    } catch { setError('Delete failed.'); } finally { setIsDeleting(false); }
  };

  const handleFullAccountDeletion = async () => {
    setIsAccountWiping(true);
    try {
      await fetch('http://127.0.0.1:8000/caregiver/delete-account', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: confirmEmail.toLowerCase().trim(), password: confirmPass }) });
      onDeleteAccount();
    } catch { onDeleteAccount(); } finally { setIsAccountWiping(false); }
  };

  const handleJoinCareCircle = async () => {
    if (!joinCode.trim()) return;
    setIsJoining(true); setJoinError(null);
    try {
      const res = await fetch('/api/patients/join', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ code: joinCode.toUpperCase(), email: caregiverEmail }) });
      if (!res.ok) { const err = await res.json(); throw new Error(err.error || 'Failed to join circle'); }
      await fetchDashboardData(); setShowJoinModal(false); setJoinCode(''); onJoinSuccess();
    } catch (err: any) { setJoinError(err.message); } finally { setIsJoining(false); }
  };

  if (isLoading) return <div className="w-full h-screen flex items-center justify-center"><div className="w-12 h-12 border-4 border-[var(--nura-accent)] border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="w-full max-w-6xl mx-auto p-6 animate-in fade-in duration-700">

      {deleteId && (
        <div className="fixed inset-0 z-[150] bg-black/60 backdrop-blur-md flex items-center justify-center p-6 text-center">
          <div className="bg-[var(--nura-bg)] border border-white/10 p-10 rounded-[2.5rem] max-w-sm w-full shadow-2xl">
            <AlertTriangle size={56} className="text-amber-400 mx-auto mb-6" />
            <h2 className="text-2xl font-black mb-2 text-[var(--nura-text)]">Remove from Circle?</h2>
            <p className="text-[var(--nura-dim)] text-sm mb-6">This will remove you from this patient's care circle. Other caregivers will still have access.</p>
            <div className="flex gap-4">
              <button onClick={() => setDeleteId(null)} className="flex-1 py-4 rounded-2xl bg-[var(--nura-card)] font-bold text-[var(--nura-text)]">Cancel</button>
              <button onClick={confirmDeletePatient} disabled={isDeleting} className="flex-1 py-4 rounded-2xl bg-red-500 font-bold text-white">{isDeleting ? 'Removing...' : 'Remove'}</button>
            </div>
          </div>
        </div>
      )}

      {showAccountDeleteModal && (
        <div className="fixed inset-0 z-[150] bg-black/60 backdrop-blur-md flex items-center justify-center p-6">
          <div className="bg-[var(--nura-bg)] border border-[var(--nura-text)]/10 p-8 rounded-[2.5rem] max-w-sm w-full shadow-2xl animate-in zoom-in duration-300">
            <ShieldAlert size={48} className="text-red-400 mx-auto mb-4" />
            <h2 className="text-2xl font-black text-[var(--nura-text)] text-center mb-6">Delete Account</h2>
            <div className="space-y-3 mb-6">
              <input type="email" placeholder="Confirm email" value={confirmEmail} onChange={(e) => setConfirmEmail(e.target.value)} className="w-full bg-[var(--nura-text)]/[0.05] border border-[var(--nura-text)]/10 rounded-xl p-4 text-[var(--nura-text)] focus:outline-none focus:border-red-400/50 transition-all placeholder:text-[var(--nura-text)]/30" />
              <input type="password" placeholder="Confirm password" value={confirmPass} onChange={(e) => setConfirmPass(e.target.value)} className="w-full bg-[var(--nura-text)]/[0.05] border border-[var(--nura-text)]/10 rounded-xl p-4 text-[var(--nura-text)] focus:outline-none focus:border-red-400/50 transition-all placeholder:text-[var(--nura-text)]/30" />
            </div>
            <div className="flex gap-4">
              <button onClick={() => setShowAccountDeleteModal(false)} className="flex-1 py-4 rounded-2xl bg-[var(--nura-text)]/5 hover:bg-[var(--nura-text)]/10 font-bold text-[var(--nura-text)] transition-colors">Cancel</button>
              <button onClick={handleFullAccountDeletion} disabled={isAccountWiping} className="flex-1 py-4 rounded-2xl bg-red-500 hover:bg-red-600 font-black text-white shadow-lg shadow-red-500/20 transition-all active:scale-95 disabled:opacity-50">{isAccountWiping ? 'Deleting...' : 'Delete'}</button>
            </div>
          </div>
        </div>
      )}

      {showJoinModal && (
        <div className="fixed inset-0 z-[150] bg-black/60 backdrop-blur-md flex items-center justify-center p-6">
          <div className="bg-[var(--nura-bg)] border border-white/10 p-8 rounded-[2.5rem] max-w-sm w-full shadow-2xl animate-in zoom-in duration-300">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-[var(--nura-accent)]/20 flex items-center justify-center"><KeyRound size={20} className="text-[var(--nura-accent)]" /></div>
                <h2 className="text-xl font-black text-[var(--nura-text)]">Join a Care Circle</h2>
              </div>
              <button onClick={() => { setShowJoinModal(false); setJoinCode(''); setJoinError(null); setJoinSuccess(null); }} className="p-2 hover:bg-white/10 rounded-full transition-all"><X size={20} className="text-[var(--nura-dim)]" /></button>
            </div>
            <p className="text-[var(--nura-dim)] text-sm mb-6 leading-relaxed">Enter the 6-character access code shared by the primary caregiver.</p>
            <input type="text" placeholder="e.g. AB3X9Q" value={joinCode} onChange={(e) => setJoinCode(e.target.value.toUpperCase())} maxLength={6} className="w-full bg-black/20 border-2 border-[var(--nura-accent)]/30 focus:border-[var(--nura-accent)] rounded-2xl p-4 text-[var(--nura-text)] text-center text-2xl font-black tracking-[0.3em] focus:outline-none transition-all mb-4" />
            {joinError && <p className="text-red-400 text-sm font-bold text-center mb-4 animate-pulse">{joinError}</p>}
            {joinSuccess && <p className="text-emerald-400 text-sm font-bold text-center mb-4">{joinSuccess}</p>}
            <button onClick={handleJoinCareCircle} disabled={joinCode.length < 6 || isJoining} className="w-full py-4 bg-[var(--nura-accent)] rounded-2xl font-black text-white disabled:opacity-40 transition-all">{isJoining ? 'Joining...' : 'Join Circle'}</button>
          </div>
        </div>
      )}

      <header className="mb-8 mt-4 flex items-center justify-between border-b border-white/5 pb-4">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="flex items-center gap-2 px-4 py-2 hover:bg-[var(--nura-accent)]/10 rounded-xl transition-all bg-[var(--nura-card)] border border-white/10 group"><ArrowRight size={18} className="text-[var(--nura-dim)] group-hover:text-[var(--nura-accent)] rotate-180" /><span className="text-[var(--nura-text)] font-bold text-sm">Back</span></button>
          <button onClick={onViewLogs} className="p-2.5 bg-[var(--nura-card)] hover:bg-[var(--nura-accent)]/20 rounded-full border border-white/10 transition-all text-[var(--nura-dim)] hover:text-[var(--nura-text)]"><SettingsIcon size={20} /></button>
        </div>
        <div className="flex-1 text-center"><h1 className="text-3xl font-extrabold text-[var(--nura-text)] tracking-tight">Your Loved Ones</h1></div>
        <div className="flex items-center gap-3">
          <button onClick={() => setShowAccountDeleteModal(true)} className="px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 rounded-xl text-xs font-bold flex items-center gap-2"><ShieldAlert size={16} /> Delete Account</button>
          <button onClick={onLogout} className="flex items-center gap-2 px-4 py-2 hover:bg-red-500/10 rounded-xl transition-all bg-[var(--nura-card)] border border-white/10 group"><LogOut size={20} className="text-[var(--nura-dim)] group-hover:text-red-400" /><span className="text-[var(--nura-text)] font-bold text-sm group-hover:text-red-300">Log Out</span></button>
        </div>
      </header>

      {error && <div className="mb-6 bg-red-500/20 p-4 rounded-2xl text-red-100 font-bold border border-red-500/50 text-center">{error}</div>}

      {/* Add Profile / Join by Code modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-[150] bg-black/60 backdrop-blur-md flex items-center justify-center p-6">
          <div className="bg-[var(--nura-bg)] border border-white/10 rounded-[2.5rem] max-w-sm w-full shadow-2xl animate-in zoom-in duration-300 overflow-hidden">
            <div className="flex items-center justify-between p-8 pb-0">
              <h2 className="text-2xl font-black text-[var(--nura-text)]">Add a Patient</h2>
              <button onClick={() => { setShowAddModal(false); setJoinCode(''); setJoinError(null); setAddModalTab('new'); }} className="p-2 hover:bg-white/10 rounded-full transition-all"><X size={20} className="text-[var(--nura-dim)]" /></button>
            </div>

            {/* Tab switcher */}
            <div className="flex gap-2 mx-8 mt-6 bg-[var(--nura-card)] p-1 rounded-2xl">
              <button onClick={() => setAddModalTab('new')} className={`flex-1 py-2.5 rounded-xl font-black text-sm transition-all ${addModalTab === 'new' ? 'bg-[var(--nura-accent)] text-[var(--nura-bg)] shadow' : 'text-[var(--nura-dim)] hover:text-[var(--nura-text)]'}`}>
                <Plus size={14} className="inline mr-1.5 -mt-0.5" />New Profile
              </button>
              <button onClick={() => setAddModalTab('join')} className={`flex-1 py-2.5 rounded-xl font-black text-sm transition-all ${addModalTab === 'join' ? 'bg-[var(--nura-accent)] text-[var(--nura-bg)] shadow' : 'text-[var(--nura-dim)] hover:text-[var(--nura-text)]'}`}>
                <KeyRound size={14} className="inline mr-1.5 -mt-0.5" />Join by Code
              </button>
            </div>

            <div className="p-8 pt-6">
              {addModalTab === 'new' ? (
                <div className="flex flex-col gap-4">
                  <p className="text-[var(--nura-dim)] text-sm leading-relaxed">Create a new patient profile and configure Nura for their needs.</p>
                  <button onClick={() => { setShowAddModal(false); onAddPatient(); }} className="w-full py-5 rounded-2xl bg-[var(--nura-accent)] text-[var(--nura-bg)] font-black text-lg shadow-lg shadow-[var(--nura-accent)]/30 flex items-center justify-center gap-2 active:scale-95 transition-all">
                    <Plus size={22} /> Configure New Patient
                  </button>
                </div>
              ) : (
                <div className="flex flex-col gap-4">
                  <p className="text-[var(--nura-dim)] text-sm leading-relaxed">Enter the 6-character access code shared by the patient's primary caregiver.</p>
                  <input
                    type="text"
                    placeholder="e.g. AB3X9Q"
                    value={joinCode}
                    onChange={(e) => { setJoinCode(e.target.value.toUpperCase()); setJoinError(null); }}
                    maxLength={6}
                    className="w-full bg-[var(--nura-card)] border-2 border-[var(--nura-accent)]/30 focus:border-[var(--nura-accent)] rounded-2xl p-4 text-[var(--nura-text)] text-center text-2xl font-black tracking-[0.3em] focus:outline-none transition-all"
                  />
                  {joinError && <p className="text-red-400 text-sm font-bold text-center animate-pulse">{joinError}</p>}
                  {joinSuccess && <p className="text-emerald-400 text-sm font-bold text-center">{joinSuccess}</p>}
                  <button
                    onClick={async () => {
                      if (!joinCode.trim() || isJoining) return;
                      setIsJoining(true); setJoinError(null);
                      try {
                        const res = await fetch('http://127.0.0.1:8000/patients/join', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: caregiverEmail.toLowerCase().trim(), access_code: joinCode.trim().toUpperCase() }) });
                        const data = await res.json();
                        if (res.ok && data.success) {
                          setJoinSuccess('Joined! Refreshing...');
                          setTimeout(() => { setShowAddModal(false); setJoinCode(''); setJoinSuccess(null); onJoinSuccess(); fetchDashboardData(); }, 800);
                        } else { setJoinError(data.detail || 'Invalid code.'); }
                      } catch { setJoinError('Could not connect to server.'); } 
                      finally { setIsJoining(false); }
                    }}
                    disabled={joinCode.length < 4 || isJoining}
                    className="w-full py-5 rounded-2xl bg-[var(--nura-accent)] text-[var(--nura-bg)] font-black text-lg shadow-lg shadow-[var(--nura-accent)]/30 flex items-center justify-center gap-2 active:scale-95 transition-all disabled:opacity-30"
                  >
                    <KeyRound size={20} /> {isJoining ? 'Joining...' : 'Join Care Circle'}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">

        {/* Global Care Center Button */}
        <button type="button" onClick={() => onOpenCareCenter()} className="group relative w-full bg-[var(--nura-card)] rounded-[2.5rem] border border-[var(--nura-accent)]/25 hover:border-[var(--nura-accent)]/60 transition-all flex flex-col overflow-hidden shadow-2xl cursor-pointer min-h-[340px] text-left">
          <div className="absolute inset-0 bg-gradient-to-br from-[var(--nura-accent)]/8 via-transparent to-purple-600/8 pointer-events-none rounded-[2.5rem]" />
          <div className="h-1 w-full bg-gradient-to-r from-[var(--nura-accent)]/60 via-purple-500/60 to-[var(--nura-accent)]/60" />
          <div className="flex-1 flex flex-col items-center justify-center p-8 relative">
            <div className="relative mb-5">
              <div className="w-20 h-20 rounded-full bg-[var(--nura-accent)]/15 border border-[var(--nura-accent)]/30 flex items-center justify-center group-hover:scale-110 transition-transform duration-500 shadow-lg shadow-[var(--nura-accent)]/10"><Users size={36} className="text-[var(--nura-accent)]" /></div>
              <div className="absolute -top-1 -right-2 w-7 h-7 rounded-full bg-blue-500/20 border border-blue-500/30 flex items-center justify-center"><BookOpen size={12} className="text-blue-400" /></div>
              <div className="absolute -bottom-1 -right-2 w-7 h-7 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center"><ImageIcon size={12} className="text-emerald-400" /></div>
              <div className="absolute -bottom-1 -left-2 w-7 h-7 rounded-full bg-amber-500/20 border border-amber-500/30 flex items-center justify-center"><ClipboardList size={12} className="text-amber-400" /></div>
            </div>
            <h3 className="text-3xl font-black text-[var(--nura-text)] mb-1">Care Center</h3>
            <p className="text-[10px] uppercase text-[var(--nura-accent)] font-black tracking-[0.2em]">Collaborative Hub</p>
            {patients.length > 0 && (
              <div className="mt-4 flex items-center gap-2">
                <div className="flex items-center gap-1.5 px-3 py-1.5 bg-[var(--nura-accent)]/10 rounded-full border border-[var(--nura-accent)]/20"><Users size={11} className="text-[var(--nura-accent)]" /><span className="text-[10px] font-black text-[var(--nura-accent)] uppercase tracking-widest">{patients.length} patient{patients.length !== 1 ? 's' : ''}</span></div>
              </div>
            )}
          </div>
          <div className="border-t border-[var(--nura-accent)]/15 py-5 px-4 flex items-center justify-center gap-2 hover:bg-[var(--nura-accent)]/10 transition-all">
            <span className="font-black text-[var(--nura-accent)] text-xs tracking-widest uppercase">Open Care Center</span><ArrowRight size={14} className="text-[var(--nura-accent)] group-hover:translate-x-1 transition-transform duration-300" />
          </div>
        </button>

        {patients.map((patient) => {
          const id = patient.patient_id || patient.id;
          const caregiverCount = (patient.authorized_users || []).length;

          return (
            <div key={id} className="group bg-[var(--nura-card)] rounded-[2.5rem] relative w-full hover:border-[var(--nura-accent)]/40 transition-all flex flex-col overflow-hidden border border-white/5 shadow-2xl">
              
              {/* CARD CLICK -> Goes to Patient Hub (Pill Nav view) */}
              <div onClick={() => onOpenPatientHub(id)} className="flex-1 flex flex-col items-center justify-center p-8 cursor-pointer relative">
                <div className="mb-4 transform group-hover:scale-110 transition-transform duration-500">
                  <Avatar size="md" type={patient.avatarType || 'jellyfish'} emotion="happy" reducedMotion={reducedMotion} />
                </div>
                <div className="text-center">
                  <h3 className="text-3xl font-black text-[var(--nura-text)] mb-1">{patient.name}</h3>
                  <p className="text-[10px] uppercase text-[var(--nura-accent)] font-black tracking-[0.2em]">{patient.dementia_stage || patient.stage}</p>
                </div>
                {caregiverCount > 0 && (
                  <div className="mt-3 flex items-center gap-1.5 px-3 py-1.5 bg-[var(--nura-accent)]/10 rounded-full border border-[var(--nura-accent)]/20">
                    <Users size={11} className="text-[var(--nura-accent)]" /><span className="text-[10px] font-black text-[var(--nura-accent)] uppercase tracking-widest">{caregiverCount} caregiver{caregiverCount !== 1 ? 's' : ''}</span>
                  </div>
                )}
                
                {/* ACTION ICONS (Edit / Delete) */}
                <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity z-30 flex gap-2">
                  <button onClick={(e) => { e.stopPropagation(); onConfigPatient(id); }} className="p-2.5 bg-black/40 hover:bg-[var(--nura-accent)]/40 rounded-full text-[var(--nura-text)] border border-white/10 transition-all backdrop-blur-md">
                    <Edit2 size={16} />
                  </button>
                  <button onClick={(e) => { e.stopPropagation(); setDeleteId(id); }} className="p-2.5 bg-black/40 hover:bg-red-500/40 rounded-full text-red-400 border border-white/10 transition-all backdrop-blur-md">
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>

              {/* BOTTOM CTA: START CHAT */}
              <div className="border-t border-white/10">
                <button onClick={(e) => { e.stopPropagation(); setTimeModalPatientId(id); }} className="w-full py-5 px-4 flex items-center justify-center gap-2 hover:bg-green-500/10 transition-all">
                  <MessageCircle size={16} className="text-green-400" /><span className="font-black text-[var(--nura-text)] text-xs tracking-wide">START CHAT</span>
                </button>
              </div>
            </div>
          );
        })}

        <button onClick={() => { setShowAddModal(true); setAddModalTab('new'); setJoinError(null); setJoinCode(''); }} className="bg-[var(--nura-card)]/80 rounded-[2.5rem] p-8 flex flex-col items-center justify-center gap-4 border-dashed border-2 border-white/10 w-full hover:bg-[var(--nura-accent)]/10 hover:border-[var(--nura-accent)]/30 transition-all group min-h-[340px]">
          <div className="w-16 h-16 rounded-full bg-[var(--nura-accent)]/10 flex items-center justify-center group-hover:scale-110 transition-transform"><Plus size={40} className="text-[var(--nura-accent)]" /></div>
          <span className="font-black text-[var(--nura-text)] opacity-90 text-sm tracking-wide uppercase">Add New Profile</span>
          <div className="flex items-center gap-4 w-full px-4">
            <div className="flex-1 h-px bg-white/10" />
            <span className="text-[var(--nura-dim)] text-xs font-bold">or</span>
            <div className="flex-1 h-px bg-white/10" />
          </div>
          <div className="flex items-center gap-2 text-[var(--nura-dim)] group-hover:text-[var(--nura-accent)] transition-colors">
            <KeyRound size={15} />
            <span className="text-xs font-black uppercase tracking-widest">Join with Code</span>
          </div>
        </button>

      </div>

      {timeModalPatientId && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-[var(--nura-card)] p-8 rounded-3xl max-w-sm w-full text-center border border-white/10 shadow-2xl">
            <h3 className="text-2xl font-black text-[var(--nura-text)] mb-6 tracking-tight">Set Duration</h3>
            <div className="grid grid-cols-3 gap-3 mb-8">
              {[15, 30].map((mins) => (
                <button key={mins} type="button" onClick={() => { setSelectedTime(Number(mins)); setCustomMinutes(''); }} className={`py-4 rounded-xl font-black transition-all border-2 ${Number(selectedTime) === Number(mins) ? 'bg-[var(--nura-accent)] border-white/20 text-white shadow-lg scale-105' : 'bg-black/20 text-[var(--nura-dim)] border-transparent hover:bg-[var(--nura-accent)]/20'}`}>{mins}m</button>
              ))}
              <button onClick={() => setSelectedTime('custom')} className={`py-4 rounded-xl font-black transition-all ${selectedTime === 'custom' ? 'bg-[var(--nura-accent)] text-white' : 'bg-black/20 text-[var(--nura-dim)] border border-white/5 hover:bg-[var(--nura-accent)]/20'}`}>Custom</button>
            </div>
            {selectedTime === 'custom' && <input type="number" placeholder="Minutes..." value={customMinutes} onChange={(e) => setCustomMinutes(e.target.value)} className="w-full bg-black/40 border border-[var(--nura-accent)]/50 rounded-xl p-4 text-[var(--nura-text)] text-center mb-6" />}
            <div className="flex gap-4">
              <button onClick={() => setTimeModalPatientId(null)} className="flex-1 py-4 text-[var(--nura-text)] font-bold bg-white/5 rounded-2xl">Back</button>
              <button onClick={() => { const mins = selectedTime === 'custom' ? parseInt(customMinutes) || 15 : selectedTime as number; onChat(timeModalPatientId, mins); setTimeModalPatientId(null); }} className="flex-1 py-4 bg-[var(--nura-accent)] text-white font-black rounded-2xl shadow-lg">Start Chat</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
