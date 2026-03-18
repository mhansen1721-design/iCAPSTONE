import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  ArrowLeft, Users, LayoutDashboard, History, Settings as SettingsIcon, Edit3, RefreshCw
} from 'lucide-react';
import type { PatientProfile, AppSettings, SessionLog } from '../types';
import { AnalyticsDashboard } from './AnalyticsDashboard';
import { SessionLogs } from './SessionLog';
import { CareCenter } from './CareCenter';

// ─── Types ────────────────────────────────────────────────────────────────────
// (You should ideally move these to your types.ts file eventually, but they are here for now)
export interface CareCenterData {
  patient: PatientProfile;
  access_code: string;
  journal: any[];
  sessions: any[];
  help_requests: any[];
  memory_box: any[];
  caregivers: any[];
}

interface PatientHubProps {
  userEmail: string;
  patients: PatientProfile[];
  settings: AppSettings;
  initialPatientId?: string;
  onClose: () => void;
  onEditPatient?: (id: string) => void;
  setRefreshKey: React.Dispatch<React.SetStateAction<number>>;
}

export const PatientHub: React.FC<PatientHubProps> = ({
  userEmail, patients, settings, initialPatientId, onClose, onEditPatient, setRefreshKey
}) => {
  // ── Patient Selection ──
  const [selectedPatientId] = useState<string>(() => {
    if (initialPatientId) return initialPatientId;
    return String(patients[0]?.id || '');
  });

  const activePatient = patients.find(p => p.id === selectedPatientId);
  const patientId = activePatient?.id || selectedPatientId;

  // ── Navigation State (Defaults to careCircle now!) ──
  const [topTab, setTopTab] = useState<'analytics' | 'configure' | 'logs' | 'careCircle'>('careCircle');

  // ── Master Data State ──
  const [data, setData] = useState<CareCenterData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);

  // ── Fetch Logic ──
  const fetchData = useCallback(async (silent = false) => {
    if (!patientId || !userEmail) return;
    if (!silent) setIsLoading(true);
    else setIsSyncing(true);
    try {
      const res = await fetch(`http://127.0.0.1:8000/patients/${patientId}/care-center?email=${encodeURIComponent(userEmail)}`);
      if (res.ok) setData(await res.json());
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
      setIsSyncing(false);
    }
  }, [patientId, userEmail]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Auto-refresh Care Circle
  useEffect(() => {
    if (!data?.access_code) return;
    const interval = setInterval(() => fetchData(true), 30_000);
    return () => clearInterval(interval);
  }, [fetchData, data?.access_code]);

  // Derived Logs for Analytics/Logs tabs
  const analyticsLogs = useMemo<SessionLog[]>(() => {
    return (data?.sessions || []).map((s, idx) => ({
      id: `session-${idx}`,
      patientId: String(patientId),
      patientName: activePatient?.name || 'Unknown',
      timestamp: s.timestamp,
      endReason: 'completed' as const,
      transcript: (s.transcript || []).map((m: any) => `${m.sender}: ${m.text}`).join('\n'),
    }));
  }, [data?.sessions, patientId, activePatient]);

  if (isLoading) {
    return (
      <div className="fixed inset-0 z-[300] bg-[var(--bg-app)] flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-[#7064ff] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[300] bg-[var(--bg-app)] flex flex-col overflow-hidden text-white animate-in fade-in duration-300">
      
      {/* ── Master Header ── */}
      <header className="shrink-0 px-6 pt-12 pb-8 flex flex-col items-center border-b border-white/5 relative bg-black/10">
        <button onClick={onClose} className="absolute left-6 top-10 p-3 bg-white/5 hover:bg-white/10 rounded-full border border-white/10 transition-all text-white/60 hover:text-white backdrop-blur-md">
          <ArrowLeft size={20} />
        </button>
        <button onClick={() => fetchData(true)} disabled={isSyncing} className="absolute right-6 top-10 p-3 bg-white/5 hover:bg-white/10 rounded-full border border-white/10 transition-all text-white/60 hover:text-white backdrop-blur-md disabled:opacity-40">
          <RefreshCw size={20} className={isSyncing ? 'animate-spin' : ''} />
        </button>

        <div className="text-center mb-8">
          <h1 className="text-[2.5rem] font-extrabold tracking-tight text-white mb-2 leading-none">
            {activePatient?.name || 'Select Patient'}
          </h1>
          <p className="text-blue-300/80 text-lg font-medium tracking-wide">Care Management & Insights</p>
        </div>

        <div className="flex bg-[#1a1a24] p-1.5 rounded-[1.25rem] border border-white/5 shadow-2xl overflow-x-auto max-w-full">
          <button onClick={() => setTopTab('analytics')} className={`flex items-center gap-2.5 px-6 py-3.5 rounded-xl font-bold text-[15px] transition-all whitespace-nowrap ${topTab === 'analytics' ? 'bg-[#7064ff] text-white shadow-lg' : 'text-white/70 hover:text-white hover:bg-white/5'}`}>
            <LayoutDashboard size={18} /> Analytics
          </button>
          <button onClick={() => { setTopTab('configure'); if (onEditPatient && patientId) onEditPatient(patientId); }} className={`flex items-center gap-2.5 px-6 py-3.5 rounded-xl font-bold text-[15px] transition-all whitespace-nowrap ${topTab === 'configure' ? 'bg-[#7064ff] text-white shadow-lg' : 'text-white/70 hover:text-white hover:bg-white/5'}`}>
            <SettingsIcon size={18} /> Configure
          </button>
          <button onClick={() => setTopTab('logs')} className={`flex items-center gap-2.5 px-6 py-3.5 rounded-xl font-bold text-[15px] transition-all whitespace-nowrap ${topTab === 'logs' ? 'bg-[#7064ff] text-white shadow-lg' : 'text-white/70 hover:text-white hover:bg-white/5'}`}>
            <History size={18} /> Logs
          </button>
          <button onClick={() => setTopTab('careCircle')} className={`flex items-center gap-2.5 px-6 py-3.5 rounded-xl font-bold text-[15px] transition-all whitespace-nowrap ${topTab === 'careCircle' ? 'bg-[#7064ff] text-white shadow-lg' : 'text-white/70 hover:text-white hover:bg-white/5'}`}>
            <Users size={18} /> Care Circle
          </button>
        </div>
      </header>

      {/* ── Tab Content Routing ── */}
      <div className="flex-1 overflow-y-auto bg-[var(--bg-app)]">
        {topTab === 'analytics' && activePatient && (
          <div className="w-full max-w-6xl mx-auto px-6 py-8 pb-20 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <AnalyticsDashboard patient={activePatient} logs={analyticsLogs} onNavigateToLogs={() => setTopTab('logs')} />
          </div>
        )}

        {topTab === 'configure' && (
          <div className="w-full max-w-2xl mx-auto px-6 py-16 pb-20 animate-in fade-in slide-in-from-bottom-4 duration-500 flex flex-col items-center text-center">
             <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mb-6">
               <SettingsIcon size={32} className="text-[#7064ff]" />
             </div>
             <h2 className="text-2xl font-bold mb-3">Configuration Panel</h2>
             <button onClick={() => onEditPatient && patientId && onEditPatient(patientId)} className="px-8 py-4 bg-[#7064ff] rounded-2xl font-bold shadow-lg mt-4 hover:brightness-110 active:scale-95 transition-all flex items-center gap-2">
                <Edit3 size={18} /> Open Standard Edit Menu
             </button>
          </div>
        )}

        {topTab === 'logs' && (
          <div className="w-full max-w-6xl mx-auto px-6 py-8 pb-20 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <SessionLogs logs={analyticsLogs} onBack={() => setTopTab('analytics')} isSubView={true} />
          </div>
        )}

        {topTab === 'careCircle' && (
          <div className="w-full max-w-6xl mx-auto p-6 py-8 pb-20 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <CareCenter 
              data={data} 
              setData={setData} 
              patientId={patientId} 
              userEmail={userEmail} 
              onRefresh={() => { fetchData(true); setRefreshKey(k => k + 1); }} 
            />
          </div>
        )}
      </div>
    </div>
  );
};