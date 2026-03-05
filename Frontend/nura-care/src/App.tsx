import React, { useState } from 'react';
import { Background } from '../components/Background';
import { Login } from '../views/Login';
import { Dashboard } from '../views/Dashboard';
import { ConfigFlow } from '../views/ConfigFlow';
import { ChatView } from '../views/ChatView';
import type { PatientProfile, ViewState } from '../types';

export default function App() {
  const [view, setView] = useState<ViewState>('LOGIN');
  const [patients, setPatients] = useState<PatientProfile[]>([]);
  const [editingPatientId, setEditingPatientId] = useState<string | null>(null);
  const [activeChatPatientId, setActiveChatPatientId] = useState<string | null>(null);
  const [caregiverEmail, setCaregiverEmail] = useState<string>('');
  
  // REQUIRED: To satisfy backend organization (Email > Password > Patient)
  const [caregiverPassword, setCaregiverPassword] = useState<string>('');
  const [chatDuration, setChatDuration] = useState<number>(15);

  /**
   * Captures credentials from the Login component. 
   * Ensure your Login.tsx calls this with both arguments: onLogin(email, password)
   */
  const handleLogin = (email: string, password?: string) => {
    setCaregiverEmail(email.toLowerCase().trim());
    if (password) {
      setCaregiverPassword(password);
    }
    setView('DASHBOARD');
  };

  /**
   * Resets all session data and returns to login
   */
  const handleLogout = () => {
    setCaregiverEmail('');
    setCaregiverPassword('');
    setActiveChatPatientId(null);
    setEditingPatientId(null);
    setView('LOGIN');
  };

  const handleAddPatient = () => {
    setEditingPatientId(null);
    setView('CONFIG');
  };

  const handleEditPatient = (id: string) => {
    setEditingPatientId(id);
    setView('CONFIG');
  };

  const handleDeletePatient = (id: string) => {
    setPatients(prev => prev.filter(p => (p.patient_id || p.id) !== id));
  };

  const handleStartChatWithTimer = (id: string, minutes: number) => {
    setChatDuration(minutes);
    setActiveChatPatientId(id);
    setView('CHAT');
  };

  const handleSaveConfig = (updatedProfile: PatientProfile) => {
    setPatients(prev => {
      const targetId = updatedProfile.patient_id || updatedProfile.id;
      const exists = prev.find(p => (p.patient_id || p.id) === targetId);
      
      if (exists) {
        return prev.map(p => (p.patient_id || p.id) === targetId ? updatedProfile : p);
      }
      return [...prev, updatedProfile];
    });
    setView('DASHBOARD');
  };

  // Helper to find current active profiles
  const currentPatientToEdit = React.useMemo(() => {
  if (!editingPatientId) return null;
  return patients.find(p => 
    p.patient_id === editingPatientId || 
    p.id === editingPatientId || 
    String(p.patient_id) === String(editingPatientId)
  ) || null;
}, [editingPatientId, patients]);
    
  const currentChatPatient = activeChatPatientId
    ? patients.find(p => (p.patient_id || p.id) === activeChatPatientId) || null
    : null;

  return (
    <main className="min-h-screen text-slate-50 relative">
      <Background />
      
      {/* 1. Login View */}
      {view === 'LOGIN' && (
        <Login onLogin={handleLogin} />
      )}

      {/* 2. Dashboard View */}
      {view === 'DASHBOARD' && (
        <Dashboard 
          caregiverEmail={caregiverEmail} 
          onAddPatient={handleAddPatient}
          onEditPatient={handleEditPatient}
          onDeletePatient={handleDeletePatient}
          onChat={handleStartChatWithTimer}
          onLogout={handleLogout}
          setAppPatients={setPatients}
        />
      )}

      {/* 3. Patient Configuration Flow */}
      {view === 'CONFIG' && (
        <ConfigFlow 
          caregiverEmail={caregiverEmail} 
          patient={currentPatientToEdit}
          onSave={handleSaveConfig}
          onBack={() => setView('DASHBOARD')}
        />
      )}

      {/* 4. Live Chat View (Auto-saves on end) */}
      {view === 'CHAT' && currentChatPatient && (
        <ChatView
          patient={currentChatPatient}
          durationMinutes={chatDuration}
          caregiverEmail={caregiverEmail}
          caregiverPassword={caregiverPassword} 
          onBack={() => setView('DASHBOARD')}
          onLogout={handleLogout} 
        />
      )}
    </main>
  );
}
