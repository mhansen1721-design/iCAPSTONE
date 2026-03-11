import React, { useState } from 'react';
import { PatientProfile, SessionLog } from '../types';
import { ChevronLeft, LayoutDashboard, Settings, History } from 'lucide-react';
import { AnalyticsDashboard } from './AnalyticsDashboard';
import { ConfigFlow } from './ConfigFlow';
import { SessionLogs } from './SessionLog';

interface PatientDetailProps {
  patient: PatientProfile;
  sessionLogs: SessionLog[];
  onBack: () => void;
  onSaveConfig: (updatedProfile: PatientProfile) => void;
  onStartChat: (mins: number) => void;
  caregiverEmail: string; 
}

export const PatientDetail: React.FC<PatientDetailProps> = ({ 
  patient, 
  sessionLogs, // These are already perfectly filtered by App.tsx!
  onBack, 
  onSaveConfig,
  onStartChat,
  caregiverEmail
}) => {
  const [activeTab, setActiveTab] = useState<'analytics' | 'config' | 'logs'>('analytics');
  const [logFilter, setLogFilter] = useState<string | undefined>(undefined);

  const handleNavigateToLogs = (filter?: string) => {
    setLogFilter(filter);
    setActiveTab('logs');
  };

  return (
    <div className="w-full max-w-6xl mx-auto p-6 animate-in fade-in duration-700">
      <header className="mb-8 mt-4 flex items-center justify-between border-b border-white/5 pb-4 relative">
        <button 
          onClick={onBack}
          className="p-2 hover:bg-white/10 rounded-full transition-all active:scale-90 glass-panel border-white/10 shadow-lg shadow-indigo-500/10"
          aria-label="Go back to dashboard"
        >
          <ChevronLeft size={44} className="text-indigo-200" />
        </button>

        <div className="flex-1 text-center">
          <h1 className="text-4xl font-extrabold mb-1 tracking-tight text-white"> {patient.name || patient.full_name || "Valued Patient"} </h1>
          <p className="text-2xl text-indigo-200/90 text-base font-medium">Care Management & Insights</p>
        </div>
        
        <div className="w-[42px]" aria-hidden="true" />
      </header>

      {/* Tabs */}
      <div className="flex justify-center mb-8">
        <div className="glass-panel p-1 rounded-2xl flex gap-1 border-white/10">
          <button
            onClick={() => { setActiveTab('analytics'); setLogFilter(undefined); }}
            className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold transition-all ${activeTab === 'analytics' ? 'bg-indigo-500 text-white shadow-lg' : 'text-indigo-200 hover:bg-white/5'}`}
          >
            <LayoutDashboard size={20} />
            Analytics
          </button>
          <button
            onClick={() => { setActiveTab('config'); setLogFilter(undefined); }}
            className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold transition-all ${activeTab === 'config' ? 'bg-indigo-500 text-white shadow-lg' : 'text-indigo-200 hover:bg-white/5'}`}
          >
            <Settings size={20} />
            Configure
          </button>
          <button
            onClick={() => { setActiveTab('logs'); setLogFilter(undefined); }}
            className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold transition-all ${activeTab === 'logs' ? 'bg-indigo-500 text-white shadow-lg' : 'text-indigo-200 hover:bg-white/5'}`}
          >
            <History size={20} />
            Logs
          </button>
        </div>
      </div>

      <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
        {activeTab === 'analytics' && (
          <AnalyticsDashboard 
            patient={patient} 
            logs={sessionLogs} // Swapped filteredLogs for sessionLogs
            onNavigateToLogs={handleNavigateToLogs}
          />
        )}
        {activeTab === 'config' && (
          <ConfigFlow 
            patient={patient} 
            onSave={onSaveConfig} 
            onBack={() => setActiveTab('analytics')} 
            isSubView={true}
          />
        )}
        {activeTab === 'logs' && (
          <SessionLogs 
            logs={sessionLogs} // Swapped filteredLogs for sessionLogs
            onBack={() => setActiveTab('analytics')} 
            isSubView={true}
            initialFilter={logFilter}
          />
        )}
      </div>
    </div>
  );
};
