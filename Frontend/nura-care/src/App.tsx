import React, { useState } from 'react';
import { Background } from '../components/Background';
import { Login } from '../views/Login';
import { Dashboard } from '../views/Dashboard';
import { ConfigFlow } from '../views/ConfigFlow';
import { ChatView } from '../views/ChatView';
import { DementiaStage } from '../types';
import type { PatientProfile, ViewState } from '../types';

export default function App() {
  const [view, setView] = useState<ViewState>('LOGIN');
  const [patients, setPatients] = useState<PatientProfile[]>([]);
  const [editingPatientId, setEditingPatientId] = useState<string | null>(null);
  const [activeChatPatientId, setActiveChatPatientId] = useState<string | null>(null);
  const [caregiverEmail, setCaregiverEmail] = useState<string>('');
  
  // Captures password for the new db_chat_logs.json organization
  const [caregiverPassword, setCaregiverPassword] = useState<string>('');
  const [chatDuration, setChatDuration] = useState<number>(15);

  const handleLogin = (email: string, password?: string) => {
    setCaregiverEmail(email);
    // Store password if provided by Login component to use for session saving
    if (password) setCaregiverPassword(password);
    setView('DASHBOARD');
  };

  const handleLogout = () => {
    // Completely reset all local states for security
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
    setPatients(prev => prev.filter(p => p.id !== id && p.patient_id !== id));
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

  const currentPatientToEdit = editingPatientId 
    ? patients.find(p => p.id === editingPatientId || p.patient_id === editingPatientId) || null 
    : null;
    
  const currentChatPatient = activeChatPatientId
    ? patients.find(p => p.id === activeChatPatientId || p.patient_id === activeChatPatientId) || null
    : null;

  return (
    <main className="min-h-screen text-slate-50 relative">
      <Background />
      
      {view === 'LOGIN' && (
        <Login onLogin={handleLogin} />
      )}

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

      {view === 'CONFIG' && (
        <ConfigFlow 
          caregiverEmail={caregiverEmail} 
          patient={currentPatientToEdit}
          onSave={handleSaveConfig}
          onBack={() => setView('DASHBOARD')}
        />
      )}

      {view === 'CHAT' && currentChatPatient && (
        <ChatView
          patient={currentChatPatient}
          durationMinutes={chatDuration}
          caregiverEmail={caregiverEmail}
          caregiverPassword={caregiverPassword} // Passed for log verification
          onBack={() => setView('DASHBOARD')}
          onLogout={handleLogout} // Passed to trigger auto-logout after session
        />
      )}
    </main>
  );
}
