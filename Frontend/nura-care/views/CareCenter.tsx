import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { ArrowLeft, Users, LayoutDashboard, History, RefreshCw, Shield, Copy, Check, ChevronDown } from 'lucide-react';
import type { PatientProfile, AppSettings, SessionLog } from '../types';
import { AnalyticsDashboard } from './AnalyticsDashboard';
import { SessionLogs } from './SessionLog';
import { CareCircleContent } from './CareCircleContent';

interface CareCenterProps {
  userEmail: string;
  patients: PatientProfile[];
  settings: AppSettings;
  initialPatientId?: string;
  onClose: () => void;
  setRefreshKey: React.Dispatch<React.SetStateAction<number>>;
}

export const CareCenter = ({ userEmail, patients, initialPatientId, onClose, setRefreshKey }: CareCenterProps) => {
  const [selectedPatientId, setSelectedPatientId] = useState<string>(() => initialPatientId || String(patients[0]?.id || ''));
  const [patientDropdownOpen, setPatientDropdownOpen] = useState(false);
  const activePatient = patients.find((p: any) => String(p.id) === selectedPatientId);
  const patientId = activePatient?.id || selectedPatientId;

  const [topTab, setTopTab] = useState<'analytics' | 'careCenter' | 'logs'>('careCenter');

  const [data, setData] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [codeCopied, setCodeCopied] = useState(false);

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

  const initials = (name: string) => name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2);

  const handleCopyCode = () => {
    if (data?.access_code) {
      navigator.clipboard.writeText(data.access_code);
      setCodeCopied(true);
      setTimeout(() => setCodeCopied(false), 2000);
    }
  };

  if (isLoading) return <div className="fixed inset-0 z-[300] bg-[var(--nura-bg)] flex items-center justify-center"><div className="w-12 h-12 border-4 border-[var(--nura-accent)] border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="fixed inset-0 z-[300] bg-[var(--nura-bg)] flex flex-col overflow-hidden text-[var(--nura-text)] animate-in fade-in duration-300">
      
      {/* ── HEADER (Single Row Layout) ── */}
      <header className="shrink-0 border-b border-white/5 px-6 py-4">
        <div className="w-full mx-auto flex flex-col xl:flex-row items-center justify-between gap-4">
          
          {/* LEFT SIDE: Back Button & Dropdown */}
          <div className="flex-1 flex items-center justify-start gap-4 w-full xl:w-auto">
            <button onClick={onClose} className="p-3 bg-[var(--nura-card)] hover:bg-white/5 rounded-full transition-all shrink-0 shadow-sm border border-white/10">
              <ArrowLeft size={20} className="text-[var(--nura-dim)]" />
            </button>
            
            <div className="flex min-w-0 items-center">
              {patients.length > 0 ? (
                <div className="relative z-[500]">
                  <button onClick={() => setPatientDropdownOpen(!patientDropdownOpen)} className="group flex items-center gap-3 bg-[var(--nura-card)] hover:bg-white/5 p-2 pr-5 rounded-[2rem] transition-all shadow-sm border border-white/10">
                    <div className="w-10 h-10 rounded-full bg-[var(--nura-accent)]/20 flex items-center justify-center shrink-0">
                      <span className="text-sm font-black text-[var(--nura-accent)]">{initials(activePatient?.name || '?')}</span>
                    </div>
                    <div className="text-left min-w-0 hidden sm:block">
                      <p className="text-[10px] font-black text-[var(--nura-dim)] uppercase tracking-widest leading-tight mb-0.5">Care Circle For</p>
                      <div className="flex items-center gap-2">
                        <h2 className="text-lg font-black tracking-tight text-[var(--nura-text)] leading-none truncate max-w-[150px]">{activePatient?.name || 'Select'}</h2>
                        <ChevronDown size={16} className={`text-[var(--nura-dim)] transition-transform ${patientDropdownOpen ? 'rotate-180' : ''}`} />
                      </div>
                    </div>
                  </button>
                  {patientDropdownOpen && (
                    <>
                      <div className="fixed inset-0" onClick={() => setPatientDropdownOpen(false)} />
                      <div className="absolute left-0 top-full mt-2 w-64 bg-[var(--nura-card)] border border-white/10 shadow-2xl overflow-hidden z-10 rounded-2xl">
                        <p className="px-4 pt-3 pb-1.5 text-[9px] font-black uppercase text-[var(--nura-dim)]">Switch patient</p>
                        {patients.map((p: any) => (
                          <button key={p.id} onClick={() => { setSelectedPatientId(String(p.id)); setData(null); setPatientDropdownOpen(false); }} className="w-full flex items-center gap-3 px-4 py-3 text-sm font-bold hover:bg-white/5 text-[var(--nura-text)] transition-all">
                            <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center"><span className="text-[10px] font-black text-[var(--nura-dim)]">{initials(p.name || '?')}</span></div>
                            <span className="truncate flex-1 text-left">{p.name}</span>
                            {String(p.id) === selectedPatientId && <Check size={14} className="text-[var(--nura-accent)]" />}
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              ) : <h2 className="text-xl font-black text-[var(--nura-text)]">Care Circle Hub</h2>}
            </div>
          </div>

          {/* CENTER SIDE: Pill Nav */}
          <div className="shrink-0 flex bg-black/10 p-1.5 rounded-[1.25rem] border border-white/5 shadow-sm overflow-x-auto max-w-full">
            {[
              { id: 'analytics', label: 'Analytics', icon: LayoutDashboard },
              { id: 'careCenter', label: 'Care Center', icon: Users },
              { id: 'logs', label: 'Logs', icon: History }
            ].map(({ id, label, icon: Icon }) => (
              <button key={id} onClick={() => setTopTab(id as any)} className={`flex items-center gap-2.5 px-6 py-3 rounded-xl font-bold text-[15px] transition-all whitespace-nowrap ${topTab === id ? 'bg-[var(--nura-accent)] text-[var(--nura-bg)] shadow-lg' : 'text-[var(--nura-dim)] hover:text-[var(--nura-text)] hover:bg-white/5'}`}>
                <Icon size={18} />{label}
              </button>
            ))}
          </div>

          {/* RIGHT SIDE: Sync & Access Code */}
          <div className="flex-1 flex items-center justify-end gap-3 w-full xl:w-auto">
            <button onClick={() => fetchData(true)} disabled={isSyncing} className="p-3 bg-[var(--nura-card)] hover:bg-white/5 rounded-full transition-all text-[var(--nura-dim)] disabled:opacity-40 shadow-sm border border-white/10">
              <RefreshCw size={20} className={isSyncing ? 'animate-spin' : ''} />
            </button>
            {data?.access_code && (
              <div className="flex items-center gap-2 px-5 py-3 bg-[var(--nura-card)] rounded-2xl border border-white/10 shadow-sm">
                <Shield size={16} className="text-[var(--nura-accent)] shrink-0" />
                <span className="font-mono font-black text-[var(--nura-accent)] tracking-[0.15em] text-sm">{data.access_code}</span>
                <button onClick={handleCopyCode} className={`p-1.5 rounded-lg ${codeCopied ? 'text-emerald-400' : 'text-[var(--nura-dim)] hover:text-[var(--nura-text)]'}`}>
                  {codeCopied ? <Check size={14} /> : <Copy size={14} />}
                </button>
              </div>
            )}
          </div>

        </div>
      </header>

      {/* ── TAB CONTENT ── */}
      <div className="flex-1 overflow-y-auto bg-[var(--nura-bg)] relative">
        {topTab === 'analytics' && activePatient && <div className="w-full max-w-6xl mx-auto px-6 py-8 pb-20 animate-in fade-in slide-in-from-bottom-4 duration-500"><AnalyticsDashboard patient={activePatient} logs={analyticsLogs} onNavigateToLogs={() => setTopTab('logs')} /></div>}
        {topTab === 'logs' && <div className="w-full max-w-6xl mx-auto px-6 py-8 pb-20 animate-in fade-in slide-in-from-bottom-4 duration-500"><SessionLogs logs={analyticsLogs} onBack={() => setTopTab('analytics')} isSubView={true} /></div>}
        {topTab === 'careCenter' && <div className="w-full max-w-6xl mx-auto p-6 py-8 pb-20 animate-in fade-in slide-in-from-bottom-4 duration-500"><CareCircleContent data={data} setData={setData} patientId={patientId} userEmail={userEmail} onRefresh={() => { fetchData(true); setRefreshKey(k => k + 1); }} /></div>}
      </div>
    </div>
  );
};