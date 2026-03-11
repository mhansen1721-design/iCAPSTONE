import React, { useState, useMemo } from 'react';
import { Background } from '../components/Background';
import { Login } from '../views/Login';
import { RoleSelection } from '../views/RoleSelection';
import { Dashboard } from '../views/Dashboard';
import { ConfigFlow } from '../views/ConfigFlow';
import { ChatView } from '../views/ChatView';
import { PatientDetail } from '../views/PatientDetail';
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
  
  // --- 3. AUTH & SESSION STATE ---
  const [caregiverEmail, setCaregiverEmail] = useState<string>('');
  const [caregiverPassword, setCaregiverPassword] = useState<string>('');
  const [chatDuration, setChatDuration] = useState<number>(15);

  // --- 4. FLOW HANDLERS ---
  
  const handleLogin = (email: string, password?: string) => {
    setCaregiverEmail(email.toLowerCase().trim());
    if (password) setCaregiverPassword(password);
    setView('ROLE_SELECTION'); 
  };

  const handleSelectRole = (role: 'caregiver' | 'patient') => {
    setUserRole(role);
    setView('DASHBOARD');
  };

  const handleViewPatientDetail = (id: string) => {
    setEditingPatientId(id);
    setActiveChatPatientId(null); 
    setView('PATIENT_DETAIL');
  };

  const handleStartChat = (id: string, minutes: number) => {
    setChatDuration(minutes);
    setActiveChatPatientId(id);
    setView('CHAT');
  };

  const handleLogout = () => {
    setCaregiverEmail('');
    setCaregiverPassword('');
    setPatients([]);
    setUserRole(null);
    setEditingPatientId(null);
    setView('LOGIN');
  };

  // --- NEW: DELETION HANDLERS ---
  const onDeletePatient = (id: string) => {
    setPatients(prev => prev.filter(p => (p.patient_id || p.id) !== id));
    if (editingPatientId === id) setEditingPatientId(null);
  };

  const onDeleteAccount = () => {
    // This is the trigger that fixes the "stuck on dashboard after delete" issue
    handleLogout(); // Clears everything and redirects to LOGIN
  };

  const handleSaveConfig = (updatedProfile: PatientProfile) => {
    const syncedProfile = {
      ...updatedProfile,
      name: updatedProfile.name || updatedProfile.full_name || 'Unnamed Patient'
    };

    setPatients(prev => {
      const targetId = syncedProfile.patient_id || syncedProfile.id;
      const exists = prev.find(p => (p.patient_id || p.id) === targetId);
      
      if (exists) {
        return prev.map(p => (p.patient_id || p.id) === targetId ? syncedProfile : p);
      }
      return [...prev, syncedProfile];
    });

    if (view === 'CONFIG') {
      setView('DASHBOARD');
      setEditingPatientId(null);
    } else {
      setView('PATIENT_DETAIL');
    }
  };

  // --- 5. SELECTOR ---
  const currentPatient = useMemo(() => {
    const targetId = editingPatientId || activeChatPatientId;
    if (!targetId) return null;
    return patients.find(p => (p.patient_id || p.id) === targetId) || null;
  }, [editingPatientId, activeChatPatientId, patients]);

  return (
    <main className="min-h-screen text-slate-50 relative">
      <Background />
      
      {view === 'LOGIN' && <Login onLogin={handleLogin} />}

      {view === 'ROLE_SELECTION' && (
        <RoleSelection onSelectRole={handleSelectRole} onBack={() => setView('LOGIN')} />
      )}

      {view === 'DASHBOARD' && (
        <Dashboard 
          caregiverEmail={caregiverEmail} 
          caregiverPassword={caregiverPassword}
          onAddPatient={() => { 
            setEditingPatientId(null);
            setView('CONFIG'); 
          }}
          onEditPatient={handleViewPatientDetail}
          onChat={handleStartChat}
          onLogout={handleLogout}
          setAppPatients={setPatients}
          onDeletePatient={onDeletePatient} // Passed to Dashboard
          onDeleteAccount={onDeleteAccount} // Passed to Dashboard
        />
      )}

      {view === 'PATIENT_DETAIL' && currentPatient && (
        <PatientDetail 
          patient={currentPatient}
          sessionLogs={sessionLogs}
          caregiverEmail={caregiverEmail}
          onBack={() => setView('DASHBOARD')}
          onStartChat={(mins) => handleStartChat(currentPatient.patient_id || currentPatient.id, mins)}
          onSaveConfig={handleSaveConfig}
        />
      )}

      {view === 'CONFIG' && (
        <ConfigFlow 
          caregiverEmail={caregiverEmail} 
          patient={null}
          onSave={handleSaveConfig}
          onBack={() => setView('DASHBOARD')}
        />
      )}

      {view === 'CHAT' && currentPatient && (
        <ChatView
          patient={currentPatient}
          durationMinutes={chatDuration}
          caregiverEmail={caregiverEmail}
          caregiverPassword={caregiverPassword} 
          onBack={() => setView('PATIENT_DETAIL')}
          onLogout={handleLogout} 
        />
      )}
    </main>
  );
}
