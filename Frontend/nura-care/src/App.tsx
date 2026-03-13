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

// Extend ViewState to include CARE_CENTER
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

  const [appSettings, setAppSettings] = useState<AppSettings>({
    fontSize: 'medium',
    colorPalette: 'deep-space',
    reducedMotion: false
  });

  // --- THEME SYNC ---
  // Apply theme to DOM on every settings change
  useEffect(() => {
    const themeClass = `theme-${appSettings.colorPalette}`;
    document.documentElement.className = themeClass;
    document.body.className = themeClass;
  }, [appSettings]);

  // Persist settings under a per-user key so each caregiver has independent preferences
  useEffect(() => {
    if (!caregiverEmail) return;
    const key = `nura-settings:${caregiverEmail.toLowerCase().trim()}`;
    localStorage.setItem(key, JSON.stringify(appSettings));
  }, [appSettings, caregiverEmail]);

  // --- 2. DATA FETCHING ---

  // Load patients whenever email or refreshKey changes
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

  // Load session logs (new patient-centric structure)
  useEffect(() => {
    const loadLogs = async () => {
      try {
        const res = await fetch('http://127.0.0.1:8000/chat/logs');
        if (!res.ok) return;
        const data = await res.json();

        // New structure: { patient_id: { full_name, sessions: [] } }
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

    // Load this user's saved settings — each caregiver gets their own preferences
    const key = `nura-settings:${cleanEmail}`;
    const saved = localStorage.getItem(key);
    if (saved) {
      try { setAppSettings(JSON.parse(saved)); } catch { /* ignore corrupt data */ }
    } else {
      setAppSettings({ fontSize: 'medium', colorPalette: 'deep-space', reducedMotion: false });
    }

    setView('ROLE_SELECTION');
  };

  // Called when user finishes registration — auto-logs them in and optionally joins a circle
  const handleRegisterComplete = async (email: string, password: string, joinCode?: string) => {
    // Re-use the normal login flow (loads per-user settings etc.)
    handleLogin(email, password);

    // If they entered a join code, join the circle immediately after login
    // We use a short delay to let the caregiverEmail state settle before the patient fetch fires
    if (joinCode) {
      setTimeout(async () => {
        try {
          await fetch('http://127.0.0.1:8000/patients/join', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: email.toLowerCase().trim(), access_code: joinCode.toUpperCase() }),
          });
          // Trigger patient list refresh so the joined patient appears on Dashboard
          setRefreshKey(k => k + 1);
        } catch { /* silent — they can always join from Dashboard later */ }
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

  const handleOpenCareCenter = (patientId: string) => {
    setCareCenterPatientId(patientId);
    setView('CARE_CENTER');
  };

  // Called after a caregiver joins a care circle — refresh patients
  const handleJoinSuccess = () => {
    setRefreshKey((k) => k + 1);
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
            onChat={handleStartChat}
            onLogout={() => setView('LOGIN')}
            onViewLogs={() => setView('SETTINGS')}
            onOpenCareCenter={handleOpenCareCenter}
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

        {view === 'LOGS' && (
          <SessionLogs logs={sessionLogs} onBack={() => setView('DASHBOARD')} isSubView={false} />
        )}
      </div>
    </main>
  );
}
