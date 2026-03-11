import React, { useState, useMemo, useEffect } from 'react';
import { Background } from '../components/Background';
import { Login } from '../views/Login';
import { RoleSelection } from '../views/RoleSelection';
import { Dashboard } from '../views/Dashboard';
import { ConfigFlow } from '../views/ConfigFlow';
import { ChatView } from '../views/ChatView';
import { PatientDetail } from '../views/PatientDetail';
import { SessionLogs } from '../views/SessionLog'; 
import { History } from 'lucide-react';
import type { PatientProfile, ViewState, SessionLog } from '../types';

export default function App() {
  // --- 1. NAVIGATION & ROLE STATE ---
  const [view, setView] = useState<ViewState>('LOGIN'); 
  const [userRole, setUserRole] = useState<'caregiver' | 'patient' | null>(null);

  // --- 2. DATA STATE ---
  const [patients, setPatients] = useState<PatientProfile[]>([]);
  const [sessionLogs, setSessionLogs] = useState<SessionLog[]>([]);
  const [editingPatientId, setEditingPatientId] = useState<string | null>(null);
  const [activeChatPatientId, setActiveChatPatientId] = useState<string | null>(null);
  
  // --- 3. REFRESH & AUTH STATE ---
  const [refreshKey, setRefreshKey] = useState(0); 
  const [caregiverEmail, setCaregiverEmail] = useState<string>('');
  const [caregiverPassword, setCaregiverPassword] = useState<string>('');
  const [chatDuration, setChatDuration] = useState<number>(15);

  // --- 4. DATA FETCHING (Backend Sync) ---
  useEffect(() => {
    const loadLogs = async () => {
      try {
        const response = await fetch('http://localhost:8000/chat/logs');
        if (!response.ok) throw new Error("Could not fetch log file");
        
        const data = await response.json();
        const flattened: SessionLog[] = [];

        Object.keys(data).forEach(email => {
          const passwords = data[email];
          Object.keys(passwords).forEach(pass => {
            const patientsMap = passwords[pass];
            Object.keys(patientsMap).forEach(pId => {
              const entry = patientsMap[pId];
              if (entry && Array.isArray(entry.sessions)) {
                entry.sessions.forEach((session: any, idx: number) => {
                  const messageArray = session.transcript || [];
                  const time = session.timestamp || session.tinestamp || new Date().toISOString();

                  let transcriptText = messageArray
                    .map((m: any) => `${m.sender}: ${m.text}`)
                    .join(' \n ');

                  if (transcriptText.trim() === "") transcriptText = "No conversation recorded.";

                  flattened.push({
                    id: `${pId}-${idx}-${time}`,
                    patientId: pId,
                    patientName: entry.full_name || "Unknown Patient",
                    timestamp: time,
                    transcript: transcriptText
                  });
                });
              }
            });
          });
        });

        setSessionLogs(flattened);
      } catch (e) {
        console.warn("Log fetch failed:", e);
      }
    };

    loadLogs();
  }, [patients, refreshKey]);

  // --- 5. HANDLERS ---
  const handleLogin = (email: string, password?: string) => {
    setCaregiverEmail(email.toLowerCase().trim());
    if (password) setCaregiverPassword(password);
    setView('ROLE_SELECTION'); 
  };

  const onChatFinished = () => {
    setRefreshKey(old => old + 1);
    setView('PATIENT_DETAIL');
  };

  // --- 6. RENDER LOGIC ---
  return (
    <main className="min-h-screen text-slate-50 relative">
      <Background />
      
      {view === 'LOGIN' && <Login onLogin={handleLogin} />}

      {view === 'ROLE_SELECTION' && (
        <RoleSelection onSelectRole={() => setView('DASHBOARD')} onBack={() => setView('LOGIN')} />
      )}

      {view === 'DASHBOARD' && (
        <Dashboard 
          caregiverEmail={caregiverEmail} 
          caregiverPassword={caregiverPassword}
          onAddPatient={() => { setEditingPatientId(null); setView('CONFIG'); }}
          onEditPatient={(id) => { setEditingPatientId(id); setView('PATIENT_DETAIL'); }}
          onChat={(id, mins) => { setActiveChatPatientId(id); setChatDuration(mins); setView('CHAT'); }}
          onLogout={() => setView('LOGIN')}
          onViewLogs={() => setView('LOGS')} 
          setAppPatients={setPatients}
          onDeletePatient={(id) => setPatients(prev => prev.filter(p => (p.patient_id || p.id) !== id))}
          onDeleteAccount={() => setView('LOGIN')}
        />
      )}

      {view === 'PATIENT_DETAIL' && editingPatientId && (
        <PatientDetail 
          patient={patients.find(p => (p.patient_id || p.id) === editingPatientId)!}
          sessionLogs={sessionLogs.filter(log => {
            const currentPat = patients.find(p => (p.patient_id || p.id) === editingPatientId);
            const safeLogId = String(log.patientId).toLowerCase().trim();
            const safePatId = String(editingPatientId).toLowerCase().trim();
            const safePatName = String(currentPat?.full_name || "").toLowerCase().trim();
            
            return safeLogId === safePatId || safeLogId === safePatName;
          })}
          caregiverEmail={caregiverEmail}
          onBack={() => setView('DASHBOARD')}
          onStartChat={(mins) => { setChatDuration(mins); setActiveChatPatientId(editingPatientId); setView('CHAT'); }}
          onSaveConfig={(updated) => {
             // 1. Update list
             setPatients(prev => prev.map(p => (p.patient_id || p.id) === editingPatientId ? updated : p));
             // 2. Refresh logs
             setRefreshKey(old => old + 1);
             // 3. Reset view to Dashboard (Fixes the 'stuck on save' issue)
             setView('DASHBOARD');
          }}
        />
      )}

      {view === 'LOGS' && (
        <SessionLogs 
          logs={sessionLogs} 
          onBack={() => setView('DASHBOARD')} 
          isSubView={false} 
        />
      )}

      {view === 'CONFIG' && (
        <ConfigFlow 
          caregiverEmail={caregiverEmail} 
          patient={null} 
          onSave={(newPatient) => {
             // 1. Add new patient to state
             setPatients(prev => [...prev, newPatient]);
             // 2. Refresh logs
             setRefreshKey(old => old + 1);
             // 3. Redirect back to Dashboard
             setView('DASHBOARD');
          }} 
          onBack={() => setView('DASHBOARD')} 
        />
      )}

      {view === 'CHAT' && activeChatPatientId && (
        <ChatView
          patient={patients.find(p => (p.patient_id || p.id) === activeChatPatientId)!}
          durationMinutes={chatDuration}
          caregiverEmail={caregiverEmail}
          caregiverPassword={caregiverPassword} 
          onBack={onChatFinished}
          onLogout={() => setView('LOGIN')} 
        />
      )}
    </main>
  );
}
