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
import type { PatientProfile, ViewState, SessionLog, AppSettings } from '../types';


export default function App() {
  // --- 1. STATE MANAGEMENT ---
  const [view, setView] = useState<ViewState>('LOGIN'); 
  const [userRole, setUserRole] = useState<'caregiver' | 'patient' | null>(null);
  const [patients, setPatients] = useState<PatientProfile[]>([]);
  const [sessionLogs, setSessionLogs] = useState<SessionLog[]>([]);
  const [editingPatientId, setEditingPatientId] = useState<string | null>(null);
  const [activeChatPatientId, setActiveChatPatientId] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0); 
  const [caregiverEmail, setCaregiverEmail] = useState<string>('');
  const [caregiverPassword, setCaregiverPassword] = useState<string>('');
  const [chatDuration, setChatDuration] = useState<number>(15);
  
  const [appSettings, setAppSettings] = useState<AppSettings>(() => {
    const saved = localStorage.getItem('nura-settings');
    return saved ? JSON.parse(saved) : {
      fontSize: 'medium',
      colorPalette: 'deep-space',
      reducedMotion: false
    };
  });

  // CRITICAL FIX: Direct DOM injection for Theme Classes
  useEffect(() => {
    const themeClass = `theme-${appSettings.colorPalette}`;
    
    // 1. Update HTML and Body classes
    document.documentElement.className = themeClass;
    document.body.className = themeClass;

    // 2. Persist to LocalStorage
    localStorage.setItem('nura-settings', JSON.stringify(appSettings));
  }, [appSettings]);

  // --- 2. DATA FETCHING ---
  useEffect(() => {
    const fetchPatients = async () => {
      if (!caregiverEmail) return;
      try {
        const email = caregiverEmail.toLowerCase().trim();
        const response = await fetch(`http://127.0.0.1:8000/caregiver/init-profile/${encodeURIComponent(email)}`);
        const data = await response.json();
        
        if (response.ok && data.exists && data.patients) {
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
        console.error("Failed to pre-load patients:", err);
      }
    };
    fetchPatients();
  }, [caregiverEmail, refreshKey]);

  useEffect(() => {
    const loadLogs = async () => {
      try {
        const response = await fetch('http://127.0.0.1:8000/chat/logs');
        if (!response.ok) throw new Error("Could not fetch log file");
        const data = await response.json();
        const flattened: SessionLog[] = [];

        Object.keys(data).forEach(email => {
          const passwords = data[email];
          Object.keys(passwords).forEach(pass => {
            const patientsMap = passwords[pass];
            Object.keys(patientsMap).forEach(pId => {
              const entry = patientsMap[pId];
              if (entry?.sessions) {
                entry.sessions.forEach((session: any, idx: number) => {
                  flattened.push({
                    id: `${pId}-${idx}-${session.timestamp}`,
                    patientId: pId,
                    patientName: entry.full_name || "Unknown Patient",
                    timestamp: session.timestamp || new Date().toISOString(),
                    transcript: (session.transcript || []).map((m: any) => `${m.sender}: ${m.text}`).join(' \n ')
                  });
                });
              }
            });
          });
        });
        setSessionLogs(flattened);
      } catch (e) { console.warn("Log fetch failed:", e); }
    };
    loadLogs();
  }, [refreshKey]);

  // --- 3. HANDLERS ---
  const handleLogin = (email: string, password?: string) => {
    setCaregiverEmail(email.toLowerCase().trim());
    if (password) setCaregiverPassword(password);
    setView('ROLE_SELECTION'); 
  };

  const handleStartChat = (id: string, mins: number) => {
    setActiveChatPatientId(id);
    setChatDuration(mins);
    setView('CHAT');
  };

  const onChatFinished = () => {
    setRefreshKey(old => old + 1);
    setView(userRole === 'patient' ? 'PATIENT_PICKER' : 'PATIENT_DETAIL');
  };

  // --- 4. RENDER LOGIC ---
  return (
    <main 
      className={`min-h-screen relative overflow-hidden transition-all duration-500 text-[var(--nura-text)] ${appSettings.reducedMotion ? 'reduced-motion' : ''}`}
      style={{ backgroundColor: 'var(--nura-bg)' }} // Direct style binding for safety
    >      
      <Background 
        palette={appSettings.colorPalette}
        className={appSettings.reducedMotion ? 'animate-none' : 'animate-slow-drift'} 
      />
      
      <div className="relative z-10 w-full h-full">
        {view === 'LOGIN' && <Login onLogin={handleLogin} />}

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
          <PatientPicker patients={patients} onSelect={handleStartChat} onBack={() => setView('ROLE_SELECTION')} />
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
            setAppPatients={setPatients}
            onDeletePatient={(id) => setPatients(prev => prev.filter(p => String(p.id) !== String(id)))}
            onDeleteAccount={() => setView('LOGIN')}
          />
        )}

        {view === 'SETTINGS' && (
          <Settings 
            caregiverEmail={caregiverEmail} 
            currentSettings={appSettings} 
            onBack={() => setView('DASHBOARD')} 
            onSave={(s) => { 
              setAppSettings(s); 
              setView('DASHBOARD'); 
            }} 
          />
        )}

        {view === 'PATIENT_DETAIL' && editingPatientId && (
          (() => {
            const currentPatient = patients.find(p => String(p.id) === String(editingPatientId));
            if (!currentPatient) return null;
            return (
              <PatientDetail 
                patient={currentPatient}
                sessionLogs={sessionLogs.filter(log => String(log.patientId) === String(editingPatientId))}
                caregiverEmail={caregiverEmail}
                onBack={() => { setEditingPatientId(null); setView('DASHBOARD'); }}
                onStartChat={handleStartChat}
                onSaveConfig={(updated) => {
                  setPatients(prev => prev.map(p => String(p.id) === String(updated.id) ? updated : p));
                  setRefreshKey(old => old + 1);
                  setView('DASHBOARD');
                }}
                onOpenSettings={() => setView('SETTINGS')}
              />
            );
          })()
        )}

        {view === 'CONFIG' && (
          <ConfigFlow 
            caregiverEmail={caregiverEmail} 
            patient={editingPatientId ? patients.find(p => String(p.id) === String(editingPatientId)) || null : null} 
            onSave={(updated) => {
              const cleanPatient = { ...updated, id: updated.patient_id || updated.id, name: updated.full_name || updated.name };
              setPatients(prev => {
                  const exists = prev.some(p => String(p.id) === String(cleanPatient.id));
                  return exists ? prev.map(p => String(p.id) === String(cleanPatient.id) ? cleanPatient : p) : [...prev, cleanPatient];
              });
              setRefreshKey(old => old + 1); 
              setView('DASHBOARD');
            }} 
            onBack={() => setView('DASHBOARD')} 
          />
        )}

        {view === 'CHAT' && activeChatPatientId && (
          (() => {
            const chatPatient = patients.find(p => String(p.id) === String(activeChatPatientId));
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
          })()
        )}

        {view === 'LOGS' && <SessionLogs logs={sessionLogs} onBack={() => setView('DASHBOARD')} isSubView={false} />}
      </div>
    </main>
  );
}
