import { useState, useEffect } from 'react';
import { Background } from '../components/Background';
import { Login } from '../views/Login';
import { RoleSelection } from '../views/RoleSelection';
import { Dashboard } from '../views/Dashboard';
import { ConfigFlow } from '../views/ConfigFlow';
import { ChatView } from '../views/ChatView';
import { PatientDetail } from '../views/PatientDetail';
import { SessionLogs } from '../views/SessionLog';
import { PatientPicker } from '../views/PatientPicker';
import { Settings } from '../views/Settings';
import { CareCenter } from '../views/CareCenter';
import { PatientHub } from '../views/PatientHub';
import type { PatientProfile, SessionLog, AppSettings } from './types';

type ViewState = 'LOGIN' | 'ROLE_SELECTION' | 'DASHBOARD' | 'PATIENT_PICKER' | 'PATIENT_DETAIL' | 'CONFIG' | 'CHAT' | 'LOGS' | 'SETTINGS' | 'CARE_CENTER' | 'PATIENT_HUB';

export default function App() {
  const [view, setView] = useState<ViewState>('LOGIN');
  const [userRole, setUserRole] = useState<'caregiver' | 'patient' | null>(null);
  const [patients, setPatients] = useState<PatientProfile[]>([]);
  const [sessionLogs, setSessionLogs] = useState<SessionLog[]>([]);
  const [editingPatientId, setEditingPatientId] = useState<string | null>(null);
  const [activeChatPatientId, setActiveChatPatientId] = useState<string | null>(null);
  const [careCenterPatientId, setCareCenterPatientId] = useState<string | null>(null);
  const [patientHubId, setPatientHubId] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [caregiverEmail, setCaregiverEmail] = useState<string>('');
  const [caregiverPassword, setCaregiverPassword] = useState<string>('');
  const [chatDuration, setChatDuration] = useState<number>(15);

  const [showCareCenterEmptyModal, setShowCareCenterEmptyModal] = useState(false);
  const [emptyModalJoinCode, setEmptyModalJoinCode] = useState('');
  const [emptyModalJoinError, setEmptyModalJoinError] = useState<string | null>(null);
  const [emptyModalJoinLoading, setEmptyModalJoinLoading] = useState(false);

  const [appSettings, setAppSettings] = useState<AppSettings>({ fontSize: 'medium', colorPalette: 'default', reducedMotion: false });

  useEffect(() => {
    const themeClass = `theme-${appSettings.colorPalette}`;
    document.documentElement.className = themeClass;
    document.body.className = themeClass;
  }, [appSettings]);

  useEffect(() => {
    if (!caregiverEmail) return;
    const key = `nura-settings:${caregiverEmail.toLowerCase().trim()}`;
    localStorage.setItem(key, JSON.stringify(appSettings));
  }, [appSettings, caregiverEmail]);

  useEffect(() => {
    const fetchPatients = async () => {
      if (!caregiverEmail) return;
      try {
        const email = caregiverEmail.toLowerCase().trim();
        const res = await fetch(`http://127.0.0.1:8000/caregiver/${encodeURIComponent(email)}/patients`);
        const data = await res.json();
        if (res.ok && data.patients) {
          const formatted = data.patients.map((p: any) => ({ ...p, id: p.patient_id || p.id, patient_id: p.patient_id || p.id, name: p.full_name || p.name, avatarType: p.avatarType || 'jellyfish' }));
          setPatients(formatted);
        }
      } catch (err) {}
    };
    fetchPatients();
  }, [caregiverEmail, refreshKey]);

  useEffect(() => {
    const loadLogs = async () => {
      try {
        const res = await fetch('http://127.0.0.1:8000/chat/logs');
        if (!res.ok) return;
        const data = await res.json();
        const flattened: SessionLog[] = [];
        Object.keys(data).forEach((patientId) => {
          const entry = data[patientId];
          if (entry?.sessions) {
            entry.sessions.forEach((session: any, idx: number) => {
              flattened.push({ id: `${patientId}-${idx}-${session.timestamp}`, patientId, patientName: entry.full_name || 'Unknown Patient', timestamp: session.timestamp || new Date().toISOString(), endReason: (session.end_reason || 'completed') as 'completed' | 'early', transcript: (session.transcript || []).map((m: any) => `${m.sender}: ${m.text}`).join(' \n ') });
            });
          }
        });
        setSessionLogs(flattened);
      } catch (e) {}
    };
    loadLogs();
  }, [refreshKey]);

  const handleLogin = (email: string, password?: string) => {
    const cleanEmail = email.toLowerCase().trim();
    setCaregiverEmail(cleanEmail);
    if (password) setCaregiverPassword(password);
    const key = `nura-settings:${cleanEmail}`;
    const saved = localStorage.getItem(key);
    if (saved) { try { setAppSettings(JSON.parse(saved)); } catch {} } 
    else { setAppSettings({ fontSize: 'medium', colorPalette: 'default', reducedMotion: false }); }
    setView('ROLE_SELECTION');
  };

  const handleRegisterComplete = async (email: string, password: string, joinCode?: string) => {
    handleLogin(email, password);
    if (joinCode) {
      setTimeout(async () => {
        try {
          await fetch('http://127.0.0.1:8000/patients/join', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: email.toLowerCase().trim(), access_code: joinCode.toUpperCase() }) });
          setRefreshKey(k => k + 1);
        } catch {}
      }, 300);
    }
  };

  const handleStartChat = (id: string, mins?: number) => {
    setActiveChatPatientId(id); setChatDuration(mins || 15); setView('CHAT');
  };

  const handleOpenCareCenter = () => {
    if (patients.length === 0) { setEmptyModalJoinCode(''); setEmptyModalJoinError(null); setShowCareCenterEmptyModal(true); return; }
    setCareCenterPatientId(null); setView('CARE_CENTER');
  };

  const handleOpenPatientHub = (id: string) => {
    setPatientHubId(id); setView('PATIENT_HUB');
  };

  const handleEmptyModalJoin = async () => {
    if (!emptyModalJoinCode.trim() || emptyModalJoinLoading) return;
    setEmptyModalJoinLoading(true); setEmptyModalJoinError(null);
    try {
      const res = await fetch('http://127.0.0.1:8000/patients/join', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: caregiverEmail.toLowerCase().trim(), access_code: emptyModalJoinCode.trim().toUpperCase() }) });
      const data = await res.json();
      if (res.ok && data.success) {
        setShowCareCenterEmptyModal(false); setEmptyModalJoinCode(''); setRefreshKey(k => k + 1);
        setTimeout(() => { setCareCenterPatientId(data.patient_id || null); setView('CARE_CENTER'); }, 400);
      } else { setEmptyModalJoinError(data.detail || 'Invalid code.'); }
    } catch { setEmptyModalJoinError('Could not connect.'); } 
    finally { setEmptyModalJoinLoading(false); }
  };

  return (
    <main className={`min-h-screen relative overflow-hidden transition-all duration-500 text-[var(--nura-text)] ${appSettings.reducedMotion ? 'reduced-motion' : ''}`} style={{ backgroundColor: 'var(--nura-bg)' }}>
      <Background palette={appSettings.colorPalette} className={appSettings.reducedMotion ? 'animate-none' : 'animate-slow-drift'} />
      <div className="relative z-10 w-full h-full">
        {view === 'LOGIN' && <Login onLogin={handleLogin} onRegisterComplete={handleRegisterComplete} />}
        {view === 'ROLE_SELECTION' && <RoleSelection onSelectRole={(role) => { setUserRole(role); setView(role === 'patient' ? 'PATIENT_PICKER' : 'DASHBOARD'); }} onBack={() => setView('LOGIN')} />}
        {view === 'PATIENT_PICKER' && <PatientPicker patients={patients} onSelect={(id, mins) => handleStartChat(id, mins)} onBack={() => setView('ROLE_SELECTION')} />}
        
        {view === 'DASHBOARD' && (
          <Dashboard
            patients={patients} refreshKey={refreshKey} reducedMotion={appSettings.reducedMotion}
            caregiverEmail={caregiverEmail} setAppPatients={setPatients}
            onAddPatient={() => { setEditingPatientId(null); setView('CONFIG'); }}
            onEditPatient={(id) => { setEditingPatientId(id); setView('PATIENT_DETAIL'); }}
            onConfigPatient={(id) => { setEditingPatientId(id); setView('CONFIG'); }}
            onChat={(id, mins) => handleStartChat(id, mins)}
            onBack={() => setView('ROLE_SELECTION')}
            onLogout={() => setView('LOGIN')}
            onViewLogs={() => setView('SETTINGS')}
            onJoinSuccess={() => setRefreshKey(k => k + 1)}
            onDeletePatient={(id) => setPatients(prev => prev.filter(p => String(p.id) !== String(id)))}
            onDeleteAccount={() => setView('LOGIN')}
            onOpenCareCenter={handleOpenCareCenter}
            onOpenPatientHub={handleOpenPatientHub}
          />
        )}

        {view === 'SETTINGS' && <Settings caregiverEmail={caregiverEmail} currentSettings={appSettings} onBack={() => setView('DASHBOARD')} onSave={(s) => { setAppSettings(s); setView('DASHBOARD'); }} />}

        {view === 'CONFIG' && <ConfigFlow caregiverEmail={caregiverEmail} patient={editingPatientId ? patients.find(p => String(p.id) === String(editingPatientId)) || null : null} onBack={() => setView('DASHBOARD')} onSave={(updated) => { const clean = { ...updated, id: updated.patient_id || updated.id, name: updated.full_name || updated.name }; setPatients(prev => prev.some(p => String(p.id) === String(clean.id)) ? prev.map(p => String(p.id) === String(clean.id) ? clean : p) : [...prev, clean]); setRefreshKey(k => k + 1); setView('DASHBOARD'); }} />}

        {view === 'CHAT' && activeChatPatientId && (() => {
          const chatPatient = patients.find(p => String(p.id) === String(activeChatPatientId));
          if (!chatPatient) return null;
          return <ChatView patient={chatPatient} settings={appSettings} durationMinutes={chatDuration} caregiverEmail={caregiverEmail} caregiverPassword={caregiverPassword} onBack={() => { setRefreshKey(k => k + 1); setView(userRole === 'patient' ? 'PATIENT_PICKER' : 'DASHBOARD'); }} onLogout={() => setView('LOGIN')} />;
        })()}

        {/* --- WRAPPER 1: GLOBAL CARE CENTER --- */}
        {view === 'CARE_CENTER' && patients.length > 0 && <CareCenter userEmail={caregiverEmail} patients={patients} settings={appSettings} initialPatientId={careCenterPatientId || undefined} onClose={() => setView('DASHBOARD')} setRefreshKey={setRefreshKey} />}
        
        {/* --- WRAPPER 2: PATIENT PILL HUB --- */}
        {view === 'PATIENT_HUB' && patientHubId && patients.length > 0 && (
          <PatientHub 
            userEmail={caregiverEmail} 
            patients={patients} 
            settings={appSettings} 
            initialPatientId={patientHubId} 
            onClose={() => setView('DASHBOARD')} 
            onSaveConfig={(updated) => { 
              const clean = { ...updated, id: updated.patient_id || updated.id, name: updated.full_name || updated.name }; 
              setPatients(prev => prev.some(p => String(p.id) === String(clean.id)) ? prev.map(p => String(p.id) === String(clean.id) ? clean : p) : [...prev, clean]); 
              setRefreshKey(k => k + 1); 
            }} 
            setRefreshKey={setRefreshKey} 
          />
        )}
        
        {view === 'LOGS' && <SessionLogs logs={sessionLogs} onBack={() => setView('DASHBOARD')} isSubView={false} />}

        {showCareCenterEmptyModal && (
          <div className="fixed inset-0 z-[200] bg-black/70 backdrop-blur-md flex items-center justify-center p-6">
            <div className="bg-[var(--nura-bg)] border border-white/10 rounded-[2.5rem] max-w-md w-full shadow-2xl p-10 flex flex-col gap-6">
              <h2 className="text-3xl font-black text-center text-[var(--nura-text)]">Welcome to Care Center</h2>
              <button onClick={() => { setShowCareCenterEmptyModal(false); setEditingPatientId(null); setView('CONFIG'); }} className="w-full py-5 rounded-2xl bg-[var(--nura-accent)] text-[var(--nura-bg)] font-black">Create Patient Profile</button>
              <input type="text" value={emptyModalJoinCode} onChange={e => { setEmptyModalJoinCode(e.target.value.toUpperCase()); setEmptyModalJoinError(null); }} placeholder="Enter 6-digit code" maxLength={6} className="bg-[var(--nura-card)] border border-white/10 rounded-2xl px-5 py-4 text-center font-black" />
              <button onClick={handleEmptyModalJoin} disabled={emptyModalJoinCode.length < 4 || emptyModalJoinLoading} className="bg-[var(--nura-card)] py-4 rounded-2xl font-black disabled:opacity-30">Join</button>
              <button onClick={() => setShowCareCenterEmptyModal(false)} className="text-xs text-[var(--nura-text)]/30 font-bold uppercase tracking-widest text-center">Cancel</button>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
