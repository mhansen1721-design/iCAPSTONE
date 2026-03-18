import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { ArrowLeft, Users, LayoutDashboard, History, Settings as SettingsIcon, RefreshCw } from 'lucide-react';
import type { PatientProfile, AppSettings, SessionLog } from '../types';
import { AnalyticsDashboard } from './AnalyticsDashboard';
import { SessionLogs } from './SessionLog';
import { CareCircleContent } from './CareCircleContent';
import { ConfigFlow } from './ConfigFlow'; // <-- Imported ConfigFlow

interface PatientHubProps {
  userEmail: string;
  patients: PatientProfile[];
  settings: AppSettings;
  initialPatientId?: string;
  onClose: () => void;
  onSaveConfig: (updated: PatientProfile) => void; // <-- Pass onSaveConfig instead of onEditPatient
  setRefreshKey: React.Dispatch<React.SetStateAction<number>>;
}

export const PatientHub = ({ userEmail, patients, settings, initialPatientId, onClose, onSaveConfig, setRefreshKey }: PatientHubProps) => {
  const [selectedPatientId] = useState<string>(() => initialPatientId || String(patients[0]?.id || ''));
  const activePatient = patients.find((p: any) => String(p.id) === selectedPatientId);
  const patientId = activePatient?.id || selectedPatientId;

  // Defaults to Analytics!
  const [topTab, setTopTab] = useState<'analytics' | 'configure' | 'logs' | 'careCircle'>('analytics');

  const [data, setData] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);

  const fetchData = useCallback(async (silent = false) => {
    if (!patientId || !userEmail) return;
    if (!silent) setIsLoading(true);
    else setIsSyncing(true);
    try {
      const res = await fetch(`http://127.0.0.1:8000/patients/${patientId}/care-center?email=${encodeURIComponent(userEmail)}`);
      if (res.ok) setData(await res.json());
    } catch (e) {} finally { setIsLoading(false); setIsSyncing(false); }
  }, [patientId, userEmail]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const analyticsLogs = useMemo<SessionLog[]>(() => {
    return (data?.sessions || []).map((s: any, idx: number) => ({
      id: `session-${idx}`, patientId: String(patientId), patientName: activePatient?.name || 'Unknown',
      timestamp: s.timestamp, endReason: 'completed' as const, transcript: (s.transcript || []).map((m: any) => `${m.sender}: ${m.text}`).join('\n'),
    }));
  }, [data?.sessions, patientId, activePatient]);

  if (isLoading) return <div className="fixed inset-0 z-[300] bg-[var(--nura-bg)] flex items-center justify-center"><div className="w-12 h-12 border-4 border-[var(--nura-accent)] border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="fixed inset-0 z-[300] bg-[var(--nura-bg)] flex flex-col overflow-hidden text-[var(--nura-text)] animate-in fade-in duration-300">
      
      {/* ── HEADER (Sleek, 1-Row, No Shade, No Big Title) ── */}
      <header className="shrink-0 px-6 py-6 flex items-center justify-between border-b border-white/5">
        
        {/* Left: Back Button */}
        <div className="flex-1 flex justify-start">
          <button onClick={onClose} className="p-3 bg-[var(--nura-card)] hover:bg-white/5 rounded-full border border-white/10 text-[var(--nura-dim)] hover:text-[var(--nura-text)] shadow-sm transition-all">
            <ArrowLeft size={20} />
          </button>
        </div>
        
        {/* Center: Pill Navigation */}
        <div className="flex bg-black/10 p-1.5 rounded-[1.25rem] border border-white/5 shadow-sm overflow-x-auto">
          <button onClick={() => setTopTab('analytics')} className={`flex items-center gap-2.5 px-6 py-3 rounded-xl font-bold text-[15px] transition-all whitespace-nowrap ${topTab === 'analytics' ? 'bg-[var(--nura-accent)] text-[var(--nura-bg)] shadow-lg' : 'text-[var(--nura-dim)] hover:text-[var(--nura-text)] hover:bg-white/5'}`}><LayoutDashboard size={18} /> Analytics</button>
          {/* Notice we simply change the tab state here now instead of navigating away! */}
          <button onClick={() => setTopTab('configure')} className={`flex items-center gap-2.5 px-6 py-3 rounded-xl font-bold text-[15px] transition-all whitespace-nowrap ${topTab === 'configure' ? 'bg-[var(--nura-accent)] text-[var(--nura-bg)] shadow-lg' : 'text-[var(--nura-dim)] hover:text-[var(--nura-text)] hover:bg-white/5'}`}><SettingsIcon size={18} /> Configure</button>
          <button onClick={() => setTopTab('logs')} className={`flex items-center gap-2.5 px-6 py-3 rounded-xl font-bold text-[15px] transition-all whitespace-nowrap ${topTab === 'logs' ? 'bg-[var(--nura-accent)] text-[var(--nura-bg)] shadow-lg' : 'text-[var(--nura-dim)] hover:text-[var(--nura-text)] hover:bg-white/5'}`}><History size={18} /> Logs</button>
          <button onClick={() => setTopTab('careCircle')} className={`flex items-center gap-2.5 px-6 py-3 rounded-xl font-bold text-[15px] transition-all whitespace-nowrap ${topTab === 'careCircle' ? 'bg-[var(--nura-accent)] text-[var(--nura-bg)] shadow-lg' : 'text-[var(--nura-dim)] hover:text-[var(--nura-text)] hover:bg-white/5'}`}><Users size={18} /> Care Circle</button>
        </div>

        {/* Right: Sync Button */}
        <div className="flex-1 flex justify-end">
          <button onClick={() => fetchData(true)} disabled={isSyncing} className="p-3 bg-[var(--nura-card)] hover:bg-white/5 rounded-full border border-white/10 text-[var(--nura-dim)] hover:text-[var(--nura-text)] disabled:opacity-40 shadow-sm transition-all">
            <RefreshCw size={20} className={isSyncing ? 'animate-spin' : ''} />
          </button>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto bg-[var(--nura-bg)] relative">
        {topTab === 'analytics' && activePatient && <div className="w-full max-w-6xl mx-auto px-6 py-8 pb-20 animate-in fade-in slide-in-from-bottom-4 duration-500"><AnalyticsDashboard patient={activePatient} logs={analyticsLogs} onNavigateToLogs={() => setTopTab('logs')} /></div>}
        
        {/* Render ConfigFlow inside the Hub! */}
        {topTab === 'configure' && activePatient && (
          <div className="w-full h-full animate-in fade-in slide-in-from-bottom-4 duration-500">
             <ConfigFlow
               caregiverEmail={userEmail}
               patient={activePatient}
               onSave={(updated) => {
                 onSaveConfig(updated); // Updates global app state
                 setTopTab('analytics'); // Go back to analytics after saving
               }}
               onBack={() => {}} // Won't be called because isEmbedded hides the Cancel button
               isEmbedded={true}
             />
          </div>
        )}
        
        {topTab === 'logs' && <div className="w-full max-w-6xl mx-auto px-6 py-8 pb-20 animate-in fade-in slide-in-from-bottom-4 duration-500"><SessionLogs logs={analyticsLogs} onBack={() => setTopTab('analytics')} isSubView={true} /></div>}
        {topTab === 'careCircle' && <div className="w-full max-w-6xl mx-auto p-6 py-8 pb-20 animate-in fade-in slide-in-from-bottom-4 duration-500"><CareCircleContent data={data} setData={setData} patientId={patientId} userEmail={userEmail} onRefresh={() => { fetchData(true); setRefreshKey(k => k + 1); }} /></div>}
      </div>
    </div>
  );
};