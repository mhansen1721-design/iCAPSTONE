import React, { useState } from 'react';
import type { PatientProfile, SessionLog } from '../types';
import { ChevronLeft, LayoutDashboard, Settings, History, Palette, ChevronRight } from 'lucide-react';
import { AnalyticsDashboard } from './AnalyticsDashboard';
import { ConfigFlow } from './ConfigFlow';
import { SessionLogs } from './SessionLog';

interface PatientDetailProps {
  patient: PatientProfile;
  sessionLogs: SessionLog[];
  onBack: () => void;
  onSaveConfig: (updatedProfile: PatientProfile) => void;
  onStartChat: (mins: number) => void;
  onOpenSettings: () => void; // Provided by App.tsx
  caregiverEmail: string; 
}

export const PatientDetail: React.FC<PatientDetailProps> = ({ 
  patient, 
  sessionLogs, 
  onBack, 
  onSaveConfig,
  onOpenSettings,
  caregiverEmail
}) => {
  const [activeTab, setActiveTab] = useState<'analytics' | 'config' | 'logs'>('analytics');
  const [logFilter, setLogFilter] = useState<string | undefined>(undefined);

  const handleNavigateToLogs = (filter?: string) => {
    setLogFilter(filter);
    setActiveTab('logs');
  };

  return (
    <div className="w-full max-w-6xl mx-auto p-6 animate-in fade-in duration-700 pb-32">
      {/* 1. THE SHARED HEADER (Always visible) */}
      <header className="mb-8 mt-4 flex items-center justify-between border-b border-white/5 pb-4">
        <button onClick={onBack} className="p-2 hover:bg-nura-accent/20 rounded-full transition-all bg-[var(--nura-card)] border-white/10">
          <ChevronLeft size={44} className="text-indigo-200" />
        </button>
        <div className="flex-1 text-center">
          <h1 className="text-4xl font-extrabold text-[var(--nura-text)]">{patient.name || patient.full_name}</h1>
          <p className="text-indigo-200/90 text-base font-medium">Care Management & Insights</p>
        </div>
      </header>

      {/* 2. THE TAB SWITCHER (Always visible) */}
      <div className="flex justify-center mb-8">
        <div className="bg-[var(--nura-card)] p-1 rounded-2xl flex gap-1 border-white/10">
          <button onClick={() => setActiveTab('analytics')} className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold transition-all ${activeTab === 'analytics' ? 'bg-indigo-500 text-[var(--nura-text)]' : 'text-indigo-200 hover:bg-[var(--nura-card)]'}`}>
            <LayoutDashboard size={20} /> Analytics
          </button>
          <button onClick={() => setActiveTab('config')} className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold transition-all ${activeTab === 'config' ? 'bg-indigo-500 text-[var(--nura-text)]' : 'text-indigo-200 hover:bg-[var(--nura-card)]'}`}>
            <Settings size={20} /> Configure
          </button>
          <button onClick={() => setActiveTab('logs')} className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold transition-all ${activeTab === 'logs' ? 'bg-indigo-500 text-[var(--nura-text)]' : 'text-indigo-200 hover:bg-[var(--nura-card)]'}`}>
            <History size={20} /> Logs
          </button>
        </div>
      </div>

      {/* 3. THE DYNAMIC CONTENT (Changes based on Tab) */}
      <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 mb-12">
        {activeTab === 'analytics' && (
          <AnalyticsDashboard patient={patient} logs={sessionLogs} onNavigateToLogs={handleNavigateToLogs} />
        )}
        {activeTab === 'config' && (
          <ConfigFlow patient={patient} caregiverEmail={caregiverEmail} onSave={onSaveConfig} onBack={() => setActiveTab('analytics')} isSubView={true} />
        )}
        {activeTab === 'logs' && (
          <SessionLogs logs={sessionLogs} onBack={() => setActiveTab('analytics')} isSubView={true} initialFilter={logFilter} />
        )}
      </div>
    </div>
  );
};
