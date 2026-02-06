
import React, { useState } from 'react';
import { Background } from '../components/Background';
import { Login } from '../views/Login';
import { Dashboard } from '../views/Dashboard';
import { ConfigFlow } from '../views/ConfigFlow';
import { ChatView } from '../views/ChatView';
import { DementiaStage } from '../types';
import type { PatientProfile, ViewState } from '../types';


// Mock Data
const INITIAL_PATIENTS: PatientProfile[] = [
  {
    id: '1',
    name: 'Jane Doe',
    avatarType: 'jellyfish',
    age: 78,
    stage: DementiaStage.MIDDLE,
    description: "She's a retired piano teacher who loves classical music and gardening. She has a gentle personality but can get anxious in the late afternoons.",
    familyMembers: [],
    lifestyles: ['Gardening', 'Piano Teacher'],
    triggers: ['Where is husband?', 'Hospital bills'],
    safeTopics: ['Roses', 'Classical Music', 'Spring Weather'],
    mediaDocs: [],
    aiSuggestionsLoaded: true
  }
];

export default function App() {
  const [view, setView] = useState<ViewState>('LOGIN');
  const [patients, setPatients] = useState<PatientProfile[]>(INITIAL_PATIENTS);
  const [editingPatientId, setEditingPatientId] = useState<string | null>(null);
  const [activeChatPatientId, setActiveChatPatientId] = useState<string | null>(null);

  const handleLogin = () => {
    setView('DASHBOARD');
  };

  const handleLogout = () => {
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
    setPatients(prev => prev.filter(p => p.id !== id));
  };

  const handleChat = (id: string) => {
    setActiveChatPatientId(id);
    setView('CHAT');
  };

  const handleSaveConfig = (updatedProfile: PatientProfile) => {
    setPatients(prev => {
      const exists = prev.find(p => p.id === updatedProfile.id);
      if (exists) {
        return prev.map(p => p.id === updatedProfile.id ? updatedProfile : p);
      }
      return [...prev, updatedProfile];
    });
    setView('DASHBOARD');
  };

  const currentPatientToEdit = editingPatientId 
    ? patients.find(p => p.id === editingPatientId) || null 
    : null;
    
  const currentChatPatient = activeChatPatientId
    ? patients.find(p => p.id === activeChatPatientId) || null
    : null;

  return (
    <main className="min-h-screen text-slate-50 relative">
      <Background />
      
      {view === 'LOGIN' && (
        <Login onLogin={handleLogin} />
      )}

      {view === 'DASHBOARD' && (
        <Dashboard 
          patients={patients} 
          onAddPatient={handleAddPatient}
          onEditPatient={handleEditPatient}
          onDeletePatient={handleDeletePatient}
          onChat={handleChat}
          onLogout={handleLogout}
        />
      )}

      {view === 'CONFIG' && (
        <ConfigFlow 
          patient={currentPatientToEdit}
          onSave={handleSaveConfig}
          onBack={() => setView('DASHBOARD')}
        />
      )}

      {view === 'CHAT' && currentChatPatient && (
        <ChatView
          patient={currentChatPatient}
          onBack={() => setView('DASHBOARD')}
        />
      )}
    </main>
  );
}
