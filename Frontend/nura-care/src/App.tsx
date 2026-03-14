import React, { useState, useEffect } from 'react';
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
import type { PatientProfile, SessionLog, AppSettings } from '../types';

type ViewState =
  | 'LOGIN'
  | 'ROLE_SELECTION'
  | 'DASHBOARD'
  | 'PATIENT_PICKER'
  | 'PATIENT_DETAIL'
  | 'CONFIG'
  | 'CHAT'
  | 'LOGS'
  | 'SETTINGS'
  | 'CARE_CENTER';

export default function App() {
  // --- 1. STATE MANAGEMENT ---
  const [view, setView] = useState<ViewState>('LOGIN');
  const [userRole, setUserRole] = useState<'caregiver' | 'patient' | null>(null);
  const [patients, setPatients] = useState<PatientProfile[]>([]);
  const [sessionLogs, setSessionLogs] = useState<SessionLog[]>([]);
  const [editingPatientId, setEditingPatientId] = useState<string | null>(null);
  const [activeChatPatientId, setActiveChatPatientId] = useState<string | null>(null);
  const [careCenterPatientId, setCareCenterPatientId] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [caregiverEmail, setCaregiverEmail] = useState<string>('');
  const [caregiverPassword, setCaregiverPassword] = useState<string>('');
  const [chatDuration, setChatDuration] = useState<number>(15);

  // Care Center empty-state join modal
  const [showCareCenterEmptyModal, setShowCareCenterEmptyModal] = useState(false);
  const [emptyModalJoinCode, setEmptyModalJoinCode] = useState('');
  const [emptyModalJoinError, setEmptyModalJoinError] = useState<string | null>(null);
  const [emptyModalJoinLoading, setEmptyModalJoinLoading] = useState(false);

  const [appSettings, setAppSettings] = useState<AppSettings>({
    fontSize: 'medium',
    colorPalette: 'default',
    reducedMotion: false
  });

  // --- THEME SYNC ---
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

  // --- 2. DATA FETCHING ---
  useEffect(() => {
    const fetchPatients = async () => {
      if (!caregiverEmail) return;
      try {
        const email = caregiverEmail.toLowerCase().trim();
        const res = await fetch(
          `http://127.0.0.1:8000/caregiver/${encodeURIComponent(email)}/patients`
        );
        const data = await res.json();
        if (res.ok && data.patients) {
          const formatted = data.patients.map((p: any) => ({
            ...p,
            id: p.patient_id || p.id,
            patient_id: p.patient_id || p.id,
            name: p.full_name || p.name,
            avatarType: p.avatarType || 'jellyfish'
          }));
          setPatients(formatted);
        }
      } catch (err) {
        console.error('Failed to load patients:', err);
      }
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
              flattened.push({
                id: `${patientId}-${idx}-${session.timestamp}`,
                patientId,
                patientName: entry.full_name || 'Unknown Patient',
                timestamp: session.timestamp || new Date().toISOString(),
                endReason: (session.end_reason || 'completed') as 'completed' | 'early',
                transcript: (session.transcript || [])
                  .map((m: any) => `${m.sender}: ${m.text}`)
                  .join(' \n ')
              });
            });
          }
        });
        setSessionLogs(flattened);
      } catch (e) {
        console.warn('Log fetch failed:', e);
      }
    };
    loadLogs();
  }, [refreshKey]);

  // --- 3. HANDLERS ---

  const handleLogin = (email: string, password?: string) => {
    const cleanEmail = email.toLowerCase().trim();
    setCaregiverEmail(cleanEmail);
    if (password) setCaregiverPassword(password);
    const key = `nura-settings:${cleanEmail}`;
    const saved = localStorage.getItem(key);
    if (saved) {
      try { setAppSettings(JSON.parse(saved)); } catch { }
    } else {
      setAppSettings({ fontSize: 'medium', colorPalette: 'default', reducedMotion: false });
    }
    setView('ROLE_SELECTION');
  };

  const handleRegisterComplete = async (email: string, password: string, joinCode?: string) => {
    handleLogin(email, password);
    if (joinCode) {
      setTimeout(async () => {
        try {
          await fetch('http://127.0.0.1:8000/patients/join', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: email.toLowerCase().trim(), access_code: joinCode.toUpperCase() }),
          });
          setRefreshKey(k => k + 1);
        } catch { }
      }, 300);
    }
  };

  const handleStartChat = (id: string, mins: number) => {
    setActiveChatPatientId(id);
    setChatDuration(mins);
    setView('CHAT');
  };

  const onChatFinished = () => {
    setRefreshKey((k) => k + 1);
    setView(userRole === 'patient' ? 'PATIENT_PICKER' : 'DASHBOARD');
  };

  // Opens CareCenter; if no patients exist, shows the empty-state modal instead
  const handleOpenCareCenter = (patientId?: string) => {
    if (patients.length === 0) {
      setEmptyModalJoinCode('');
      setEmptyModalJoinError(null);
      setShowCareCenterEmptyModal(true);
      return;
    }
    setCareCenterPatientId(patientId || null);
    setView('CARE_CENTER');
  };

  // Opens ConfigFlow directly (no Analytics/Logs tabs)
  const handleConfigPatient = (id: string) => {
    setEditingPatientId(id);
    setView('CONFIG');
  };

  const handleJoinSuccess = () => {
    setRefreshKey((k) => k + 1);
  };

  const handleEmptyModalJoin = async () => {
    if (!emptyModalJoinCode.trim() || emptyModalJoinLoading) return;
    setEmptyModalJoinLoading(true);
    setEmptyModalJoinError(null);
    try {
      const res = await fetch('http://127.0.0.1:8000/patients/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: caregiverEmail.toLowerCase().trim(),
          access_code: emptyModalJoinCode.trim().toUpperCase(),
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setShowCareCenterEmptyModal(false);
        setEmptyModalJoinCode('');
        setRefreshKey(k => k + 1);
        // Brief delay so patients state refreshes before navigating
        setTimeout(() => {
          setCareCenterPatientId(data.patient_id || null);
          setView('CARE_CENTER');
        }, 400);
      } else {
        setEmptyModalJoinError(data.detail || 'Invalid code. Please try again.');
      }
    } catch {
      setEmptyModalJoinError('Could not connect to server.');
    } finally {
      setEmptyModalJoinLoading(false);
    }
  };

  // --- 4. RENDER ---
  return (
    <main
      className={`min-h-screen relative overflow-hidden transition-all duration-500 text-[var(--nura-text)] ${
        appSettings.reducedMotion ? 'reduced-motion' : ''
      }`}
      style={{ backgroundColor: 'var(--nura-bg)' }}
    >
      <Background
        palette={appSettings.colorPalette}
        className={appSettings.reducedMotion ? 'animate-none' : 'animate-slow-drift'}
      />

      <div className="relative z-10 w-full h-full">

        {view === 'LOGIN' && <Login onLogin={handleLogin} onRegisterComplete={handleRegisterComplete} />}

        {view === 'ROLE_SELECTION' && (
          <RoleSelection
            onSelectRole={(role) => {
              setUserRole(role);
              setView(role === 'patient' ? 'PATIENT_PICKER' : 'DASHBOARD');
            }}
            onBack={() => setView('LOGIN')}
          />
        )}

        {view === 'PATIENT_PICKER' && (
          <PatientPicker
            patients={patients}
            onSelect={handleStartChat}
            onBack={() => setView('ROLE_SELECTION')}
          />
        )}

        {view === 'DASHBOARD' && (
          <Dashboard
            patients={patients}
            refreshKey={refreshKey}
            reducedMotion={appSettings.reducedMotion}
            caregiverEmail={caregiverEmail}
            onAddPatient={() => { setEditingPatientId(null); setView('CONFIG'); }}
            onEditPatient={(id) => { setEditingPatientId(id); setView('PATIENT_DETAIL'); }}
            onConfigPatient={handleConfigPatient}   // ← patient card click → straight to Configure
            onChat={handleStartChat}
            onLogout={() => setView('LOGIN')}
            onViewLogs={() => setView('SETTINGS')}
            onOpenCareCenter={handleOpenCareCenter} // ← Care Center tile (no id needed)
            onJoinSuccess={handleJoinSuccess}
            setAppPatients={setPatients}
            onDeletePatient={(id) =>
              setPatients((prev) => prev.filter((p) => String(p.id) !== String(id)))
            }
            onDeleteAccount={() => setView('LOGIN')}
          />
        )}

        {view === 'SETTINGS' && (
          <Settings
            caregiverEmail={caregiverEmail}
            currentSettings={appSettings}
            onBack={() => setView('DASHBOARD')}
            onSave={(s) => { setAppSettings(s); setView('DASHBOARD'); }}
          />
        )}

        {view === 'PATIENT_DETAIL' && editingPatientId && (() => {
          const currentPatient = patients.find(
            (p) => String(p.id) === String(editingPatientId)
          );
          if (!currentPatient) return null;
          return (
            <PatientDetail
              patient={currentPatient}
              sessionLogs={sessionLogs.filter(
                (log) => String(log.patientId) === String(editingPatientId)
              )}
              caregiverEmail={caregiverEmail}
              onBack={() => { setEditingPatientId(null); setView('DASHBOARD'); }}
              onStartChat={handleStartChat}
              onSaveConfig={(updated) => {
                setPatients((prev) =>
                  prev.map((p) => String(p.id) === String(updated.id) ? updated : p)
                );
                setRefreshKey((k) => k + 1);
                setView('DASHBOARD');
              }}
              onOpenSettings={() => setView('SETTINGS')}
            />
          );
        })()}

        {view === 'CONFIG' && (
          <ConfigFlow
            caregiverEmail={caregiverEmail}
            patient={
              editingPatientId
                ? patients.find((p) => String(p.id) === String(editingPatientId)) || null
                : null
            }
            onSave={(updated) => {
              const clean = {
                ...updated,
                id: updated.patient_id || updated.id,
                name: updated.full_name || updated.name
              };
              setPatients((prev) => {
                const exists = prev.some((p) => String(p.id) === String(clean.id));
                return exists
                  ? prev.map((p) => String(p.id) === String(clean.id) ? clean : p)
                  : [...prev, clean];
              });
              setRefreshKey((k) => k + 1);
              setView('DASHBOARD');
            }}
            onBack={() => setView('DASHBOARD')}
          />
        )}

        {view === 'CHAT' && activeChatPatientId && (() => {
          const chatPatient = patients.find(
            (p) => String(p.id) === String(activeChatPatientId)
          );
          if (!chatPatient) return null;
          return (
            <ChatView
              patient={chatPatient}
              settings={appSettings}
              durationMinutes={chatDuration}
              caregiverEmail={caregiverEmail}
              caregiverPassword={caregiverPassword}
              onBack={onChatFinished}
              onLogout={() => setView('LOGIN')}
            />
          );
        })()}

        {view === 'CARE_CENTER' && patients.length > 0 && (
          <CareCenter
            userEmail={caregiverEmail}
            patients={patients}
            settings={appSettings}
            initialPatientId={careCenterPatientId || undefined}
            onClose={() => setView('DASHBOARD')}
            setRefreshKey={setRefreshKey}
          />
        )}

        {/* ── CARE CENTER EMPTY-STATE MODAL ── */}
        {/* Shown when a caregiver with no patients clicks Care Center */}
        {showCareCenterEmptyModal && (
          <div className="fixed inset-0 z-[200] bg-black/70 backdrop-blur-md flex items-center justify-center p-6">
            <div className="bg-[var(--nura-bg)] border border-white/10 rounded-[2.5rem] max-w-md w-full shadow-2xl p-10 flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-4 duration-300">

              {/* Header */}
              <div className="text-center">
                <div className="w-16 h-16 rounded-full bg-[var(--nura-accent)]/15 border border-[var(--nura-accent)]/30 flex items-center justify-center mx-auto mb-4">
                  <span className="text-3xl">🏥</span>
                </div>
                <h2 className="text-3xl font-black tracking-tight text-[var(--nura-text)]">
                  Welcome to Care Center
                </h2>
                <p className="text-sm text-[var(--nura-text)]/50 mt-2 font-medium">
                  You don't have any patients yet. Get started below.
                </p>
              </div>

              {/* Option 1 — Create profile */}
              <button
                onClick={() => {
                  setShowCareCenterEmptyModal(false);
                  setEditingPatientId(null);
                  setView('CONFIG');
                }}
                className="w-full py-5 px-6 rounded-2xl bg-[var(--nura-accent)] hover:opacity-90 active:scale-95 transition-all flex items-center justify-between group shadow-lg"
              >
                <div className="text-left">
                  <p className="font-black text-[var(--nura-bg)] text-base tracking-tight">Create Patient Profile</p>
                  <p className="text-xs text-[var(--nura-bg)]/70 font-medium mt-0.5">Set up a new patient from scratch</p>
                </div>
                <span className="text-2xl group-hover:translate-x-1 transition-transform">→</span>
              </button>

              {/* Option 2 — Join via code */}
              <div className="flex flex-col gap-3">
                <p className="text-xs font-black uppercase tracking-widest text-[var(--nura-text)]/40 text-center">
                  — or join an existing care circle —
                </p>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={emptyModalJoinCode}
                    onChange={e => { setEmptyModalJoinCode(e.target.value.toUpperCase()); setEmptyModalJoinError(null); }}
                    onKeyDown={e => e.key === 'Enter' && handleEmptyModalJoin()}
                    placeholder="Enter 6-digit code"
                    maxLength={6}
                    className="flex-1 bg-[var(--nura-card)] border border-white/10 rounded-2xl px-5 py-4 text-[var(--nura-text)] font-black text-lg tracking-[0.3em] text-center placeholder:tracking-normal placeholder:font-medium placeholder:text-sm focus:outline-none focus:border-[var(--nura-accent)]/50"
                  />
                  <button
                    onClick={handleEmptyModalJoin}
                    disabled={emptyModalJoinCode.length < 4 || emptyModalJoinLoading}
                    className="px-6 py-4 rounded-2xl bg-[var(--nura-card)] border border-white/10 hover:bg-[var(--nura-accent)]/20 disabled:opacity-30 transition-all font-black text-[var(--nura-text)]"
                  >
                    {emptyModalJoinLoading ? '…' : 'Join'}
                  </button>
                </div>
                {emptyModalJoinError && (
                  <p className="text-red-400 text-xs font-bold text-center">{emptyModalJoinError}</p>
                )}
              </div>

              {/* Close */}
              <button
                onClick={() => setShowCareCenterEmptyModal(false)}
                className="text-xs text-[var(--nura-text)]/30 hover:text-[var(--nura-text)]/60 font-bold uppercase tracking-widest transition-colors text-center"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {view === 'LOGS' && (
          <SessionLogs logs={sessionLogs} onBack={() => setView('DASHBOARD')} isSubView={false} />
        )}
      </div>
    </main>
  );
}

