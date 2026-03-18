import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  ArrowLeft, Users, BookOpen, MessageSquare, Copy, Check,
  Plus, X, ChevronDown, ChevronUp, Send, Clock, Calendar,
  Shield, RefreshCw, ClipboardList, Pill, Image as ImageIcon,
  CheckCircle2, UserCheck, AlertCircle, Zap, Trash2,
  UploadCloud, Eye, LayoutDashboard, History, ChevronRight
} from 'lucide-react';
import type { PatientProfile, AppSettings, SessionLog } from '../types';
import { AnalyticsDashboard } from './AnalyticsDashboard';
import { SessionLogs } from './SessionLog';

// ─── Types ────────────────────────────────────────────────────────────────────
interface JournalPost {
  entry_id: string;
  author_name: string;
  author_email: string;
  content: string;
  type: 'update' | 'medication' | 'problem' | 'milestone';
  timestamp: string;
}

interface HelpRequest {
  request_id: string;
  author_name: string;
  author_email: string;
  title: string;
  description: string;
  status: 'open' | 'claimed' | 'done';
  claimed_by: string | null;
  claimed_name: string | null;
  timestamp: string;
}

interface MemoryPhoto {
  photo_id: string;
  filename: string;
  url: string;
  description: string;
  uploaded_by_email: string;
  uploaded_by_name: string;
  timestamp: string;
}

interface SessionEntry {
  timestamp: string;
  logged_by: string;
  transcript: { sender: string; text: string; timestamp: string }[];
}

interface CaregiverInfo {
  email: string;
  full_name: string;
}

interface CareCenterData {
  patient: PatientProfile;
  access_code: string;
  journal: JournalPost[];
  sessions: SessionEntry[];
  help_requests: HelpRequest[];
  memory_box: MemoryPhoto[];
  caregivers: CaregiverInfo[];
}

interface CareCenterProps {
  userEmail: string;
  patients: PatientProfile[];
  settings: AppSettings;
  initialPatientId?: string;
  onClose: () => void;
  setRefreshKey: React.Dispatch<React.SetStateAction<number>>;
}

// ─── Config ───────────────────────────────────────────────────────────────────
const JOURNAL_TYPES = {
  update:     { label: 'Update',     icon: Zap,          color: 'text-blue-400',    bg: 'bg-blue-500/15',    border: 'border-blue-500/30' },
  medication: { label: 'Medication', icon: Pill,         color: 'text-amber-400',   bg: 'bg-amber-500/15',   border: 'border-amber-500/30' },
  problem:    { label: 'Problem',    icon: AlertCircle,  color: 'text-red-400',     bg: 'bg-red-500/15',     border: 'border-red-500/30' },
  milestone:  { label: 'Milestone',  icon: CheckCircle2, color: 'text-emerald-400', bg: 'bg-emerald-500/15', border: 'border-emerald-500/30' },
} as const;

const STATUS_CONFIG = {
  open:    { label: 'Open',    color: 'text-amber-400',   bg: 'bg-amber-500/15',   border: 'border-amber-500/30' },
  claimed: { label: 'Claimed', color: 'text-blue-400',    bg: 'bg-blue-500/15',    border: 'border-blue-500/30' },
  done:    { label: 'Done',    color: 'text-emerald-400', bg: 'bg-emerald-500/15', border: 'border-emerald-500/30' },
};

// ─────────────────────────────────────────────────────────────────────────────
export const CareCenter: React.FC<CareCenterProps> = ({
  userEmail, patients, settings, initialPatientId, onClose, setRefreshKey
}) => {
  // ── Patient Selection ─────────────────────────────────────────────────────
  const [selectedPatientId, setSelectedPatientId] = useState<string>(() => {
    if (initialPatientId) {
      const match = patients.find(p => {
        const id = (p as any).patient_id || (p as any).id;
        return String(id) === String(initialPatientId);
      });
      if (match) return String((match as any).patient_id || (match as any).id);
    }
    return String((patients[0] as any)?.patient_id || (patients[0] as any)?.id || '');
  });
  const [patientDropdownOpen, setPatientDropdownOpen] = useState(false);

  // ── Top-level navigation ──────────────────────────────────────────────────
  const [topTab, setTopTab] = useState<'analytics' | 'careCenter' | 'logs'>('analytics');

  // ── Data ─────────────────────────────────────────────────────────────────
  const [data, setData]           = useState<CareCenterData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isInitializing, setIsInitializing] = useState(false);
  const [error, setError]         = useState<string | null>(null);
  const [codeCopied, setCodeCopied] = useState(false);

  // ── Journal state ─────────────────────────────────────────────────────────
  const [newContent, setNewContent] = useState('');
  const [newType, setNewType]       = useState<JournalPost['type']>('update');
  const [isPosting, setIsPosting]   = useState(false);

  // ── Help request state ────────────────────────────────────────────────────
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [newReqTitle, setNewReqTitle]           = useState('');
  const [newReqDesc, setNewReqDesc]             = useState('');
  const [isCreatingReq, setIsCreatingReq]       = useState(false);

  // ── Memory box state ──────────────────────────────────────────────────────
  const fileInputRef                              = useRef<HTMLInputElement>(null);
  const [uploadDescription, setUploadDescription] = useState('');
  const [uploadPreview, setUploadPreview]         = useState<string | null>(null);
  const [uploadFile, setUploadFile]               = useState<File | null>(null);
  const [isUploading, setIsUploading]             = useState(false);
  const [uploadError, setUploadError]             = useState<string | null>(null);
  const [lightboxPhoto, setLightboxPhoto]         = useState<MemoryPhoto | null>(null);

  // ── Sessions state ────────────────────────────────────────────────────────
  const [expandedSession, setExpandedSession] = useState<number | null>(null);

  // ── Help requests view state ──────────────────────────────────────────────
  // Default: hide "done" tasks. "all" view shows every status + filter pills.
  const [showAllTasks, setShowAllTasks]           = useState(false);
  const [taskFilter, setTaskFilter]               = useState<'all' | 'open' | 'claimed' | 'done'>('all');

  // ── Journal view state ────────────────────────────────────────────────────
  // Default: last 7 days only. "all" view adds search + category filter.
  const [showAllJournal, setShowAllJournal]       = useState(false);
  const [journalSearch, setJournalSearch]         = useState('');
  const [journalTypeFilter, setJournalTypeFilter] = useState<JournalPost['type'] | 'all'>('all');

  // ── Derived ───────────────────────────────────────────────────────────────
  const activePatient = patients.find(p => {
    const id = (p as any).patient_id || (p as any).id;
    return String(id) === String(selectedPatientId);
  });
  const patientId      = (activePatient as any)?.patient_id || (activePatient as any)?.id || selectedPatientId;
  const isCircleActive = !!(data?.access_code || (activePatient as any)?.access_code);
  const accessCode     = data?.access_code || (activePatient as any)?.access_code;

  // Convert CareCenter sessions → SessionLog[] for Analytics + Logs tabs
  const analyticsLogs = useMemo<SessionLog[]>(() => {
    return (data?.sessions || []).map((s, idx) => ({
      id: `session-${idx}`,
      patientId: String(patientId),
      patientName: activePatient?.name || (activePatient as any)?.full_name || 'Unknown',
      timestamp: s.timestamp,
      endReason: 'completed' as const,
      transcript: (s.transcript || []).map(m => `${m.sender}: ${m.text}`).join('\n'),
    }));
  }, [data?.sessions, patientId, activePatient]);

  // ── Fetch ─────────────────────────────────────────────────────────────────
  const fetchData = useCallback(async (silent = false) => {
    if (!patientId || !userEmail) return;
    if (!silent) setIsLoading(true);
    else setIsSyncing(true);
    setError(null);
    try {
      const res = await fetch(
        `http://127.0.0.1:8000/patients/${patientId}/care-center?email=${encodeURIComponent(userEmail)}`
      );
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || 'Failed to load care center.');
      }
      setData(await res.json());
    } catch (e: any) {
      setError(e.message || 'Could not connect to server.');
    } finally {
      setIsLoading(false);
      setIsSyncing(false);
    }
  }, [patientId, userEmail]);

  useEffect(() => { fetchData(); }, [fetchData]);

  useEffect(() => {
    if (!isCircleActive) return;
    const interval = setInterval(() => fetchData(true), 30_000);
    return () => clearInterval(interval);
  }, [fetchData, isCircleActive]);

  // ── Actions ───────────────────────────────────────────────────────────────
  const handleInitialize = async () => {
    setIsInitializing(true);
    try {
      const res = await fetch(`http://127.0.0.1:8000/patients/activate-circle/${patientId}`, { method: 'POST' });
      if (res.ok) { setRefreshKey(k => k + 1); await fetchData(); }
    } catch { } finally { setIsInitializing(false); }
  };

  const handleCopyCode = () => {
    if (accessCode) {
      navigator.clipboard.writeText(accessCode);
      setCodeCopied(true);
      setTimeout(() => setCodeCopied(false), 2000);
    }
  };

  const handlePostJournal = async () => {
    if (!newContent.trim()) return;
    setIsPosting(true);
    try {
      const res = await fetch('http://127.0.0.1:8000/api/journal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ patient_id: patientId, author_email: userEmail, content: newContent.trim(), type: newType }),
      });
      if (res.ok) {
        const saved: JournalPost = await res.json();
        setData(prev => prev ? { ...prev, journal: [saved, ...prev.journal] } : prev);
        setNewContent(''); setNewType('update');
      }
    } catch { } finally { setIsPosting(false); }
  };

  const handleCreateRequest = async () => {
    if (!newReqTitle.trim()) return;
    setIsCreatingReq(true);
    try {
      const res = await fetch('http://127.0.0.1:8000/api/help-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ patient_id: patientId, author_email: userEmail, title: newReqTitle.trim(), description: newReqDesc.trim() }),
      });
      if (res.ok) {
        const saved: HelpRequest = await res.json();
        setData(prev => prev ? { ...prev, help_requests: [saved, ...prev.help_requests] } : prev);
        setNewReqTitle(''); setNewReqDesc(''); setShowRequestModal(false);
      }
    } catch { } finally { setIsCreatingReq(false); }
  };

  const handleClaimRequest = async (requestId: string) => {
    const res = await fetch(`http://127.0.0.1:8000/api/help-requests/${requestId}/claim`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ claimer_email: userEmail }),
    }).catch(() => null);
    if (res?.ok) {
      const updated: HelpRequest = await res.json();
      setData(prev => prev ? { ...prev, help_requests: prev.help_requests.map(r => r.request_id === requestId ? updated : r) } : prev);
    }
  };

  const handleCompleteRequest = async (requestId: string) => {
    const res = await fetch(`http://127.0.0.1:8000/api/help-requests/${requestId}/complete`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ claimer_email: userEmail }),
    }).catch(() => null);
    if (res?.ok) {
      const updated: HelpRequest = await res.json();
      setData(prev => prev ? { ...prev, help_requests: prev.help_requests.map(r => r.request_id === requestId ? updated : r) } : prev);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadFile(file);
    setUploadError(null);
    const reader = new FileReader();
    reader.onload = ev => setUploadPreview(ev.target?.result as string);
    reader.readAsDataURL(file);
  };

  const handleUploadPhoto = async () => {
    if (!uploadFile) return;
    setIsUploading(true);
    setUploadError(null);
    try {
      const form = new FormData();
      form.append('patient_id', patientId);
      form.append('author_email', userEmail);
      form.append('description', uploadDescription.trim());
      form.append('file', uploadFile);
      const res = await fetch('http://127.0.0.1:8000/api/memory-box/upload', { method: 'POST', body: form });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || 'Upload failed.');
      }
      const saved: MemoryPhoto = await res.json();
      setData(prev => prev ? { ...prev, memory_box: [saved, ...prev.memory_box] } : prev);
      setUploadFile(null); setUploadPreview(null); setUploadDescription('');
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (e: any) {
      setUploadError(e.message || 'Upload failed. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleDeletePhoto = async (photoId: string) => {
    const res = await fetch(
      `http://127.0.0.1:8000/api/memory-box/${photoId}?email=${encodeURIComponent(userEmail)}`,
      { method: 'DELETE' }
    ).catch(() => null);
    if (res?.ok) {
      setData(prev => prev ? { ...prev, memory_box: prev.memory_box.filter(p => p.photo_id !== photoId) } : prev);
      if (lightboxPhoto?.photo_id === photoId) setLightboxPhoto(null);
    }
  };

  // ── Helpers ───────────────────────────────────────────────────────────────
  const fmt = (ts: string) => {
    const d = new Date(String(ts).replace(/-/g, '/'));
    if (isNaN(d.getTime())) return ts;
    return d.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  };
  const initials = (name: string) =>
    name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

  // ── Loading state ─────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="fixed inset-0 z-[300] bg-[var(--nura-bg)] flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-[var(--nura-accent)] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // ── Top-level tab definitions ─────────────────────────────────────────────
  const TOP_TABS = [
    { id: 'analytics'  as const, label: 'Analytics',    icon: LayoutDashboard },
    { id: 'careCenter' as const, label: 'Care Center',  icon: Users },
    { id: 'logs'       as const, label: 'Logs',         icon: History },
  ];

  return (
    <div className="fixed inset-0 z-[300] bg-[var(--nura-bg)] flex flex-col overflow-hidden text-[var(--nura-text)]">

      {/* ── Lightbox ── */}
      {lightboxPhoto && (
        <div className="fixed inset-0 z-[500] bg-black/90 backdrop-blur-xl flex flex-col items-center justify-center p-6" onClick={() => setLightboxPhoto(null)}>
          <button className="absolute top-6 right-6 p-2 bg-white/10 rounded-full hover:bg-white/20 transition-all" onClick={() => setLightboxPhoto(null)}>
            <X size={24} className="text-white" />
          </button>
          <img src={lightboxPhoto.url} alt={lightboxPhoto.description || 'Memory photo'}
            className="max-h-[75vh] max-w-full object-contain rounded-2xl shadow-2xl" onClick={e => e.stopPropagation()} />
          {lightboxPhoto.description && <p className="mt-4 text-white/80 text-center max-w-md text-sm">{lightboxPhoto.description}</p>}
          <p className="mt-2 text-white/40 text-xs">Uploaded by {lightboxPhoto.uploaded_by_name} · {fmt(lightboxPhoto.timestamp)}</p>
        </div>
      )}

      {/* ── Header ── */}
      <header className="shrink-0 border-b border-white/5 px-6 py-5">
        <div className="w-full max-w-6xl mx-auto flex items-center gap-4">
          {/* Back */}
          <button onClick={onClose} className="p-2.5 bg-[var(--nura-card)] hover:bg-white/5 rounded-full border border-white/10 transition-all shrink-0">
            <ArrowLeft size={20} className="text-[var(--nura-dim)]" />
          </button>

          {/* Prominent Patient Selector (Replaces static title) */}
          <div className="flex-1 min-w-0 flex items-center">
            {patients.length > 0 ? (
              <div className="relative">
                <button
                  onClick={() => setPatientDropdownOpen(prev => !prev)}
                  className="group flex items-center gap-3 bg-[var(--nura-card)] hover:bg-white/5 border border-white/10 hover:border-[var(--nura-accent)]/40 p-2 pr-5 rounded-[2rem] transition-all shadow-sm"
                >
                  <div className="w-10 h-10 rounded-full bg-[var(--nura-accent)]/20 flex items-center justify-center shrink-0">
                    <span className="text-sm font-black text-[var(--nura-accent)]">
                      {initials(activePatient?.name || (activePatient as any)?.full_name || '?')}
                    </span>
                  </div>
                  <div className="text-left min-w-0">
                    <p className="text-[10px] font-black text-[var(--nura-dim)] uppercase tracking-widest leading-tight mb-0.5">
                      Care Circle For
                    </p>
                    <div className="flex items-center gap-2">
                      <h2 className="text-lg font-black tracking-tight text-[var(--nura-text)] leading-none truncate max-w-[200px] sm:max-w-[300px]">
                        {activePatient?.name || (activePatient as any)?.full_name || 'Select Patient'}
                      </h2>
                      <ChevronDown size={16} className={`text-[var(--nura-dim)] group-hover:text-[var(--nura-accent)] transition-transform duration-200 ${patientDropdownOpen ? 'rotate-180' : ''}`} />
                    </div>
                  </div>
                </button>

                {/* Dropdown Menu */}
                {patientDropdownOpen && (
                  <>
                    <div className="fixed inset-0 z-[400]" onClick={() => setPatientDropdownOpen(false)} />
                    <div className="absolute left-0 top-full mt-2 w-64 bg-[var(--nura-card)] rounded-2xl border border-white/10 shadow-2xl overflow-hidden z-[410] animate-in fade-in slide-in-from-top-2 duration-150">
                      <p className="px-4 pt-3 pb-1.5 text-[9px] font-black uppercase tracking-widest text-[var(--nura-dim)]/60">
                        Switch patient
                      </p>
                      {patients.map(p => {
                        const pid = (p as any).patient_id || (p as any).id;
                        const isSelected = String(pid) === String(selectedPatientId);
                        return (
                          <button
                            key={pid}
                            onClick={() => { setSelectedPatientId(String(pid)); setData(null); setPatientDropdownOpen(false); }}
                            className={`w-full flex items-center gap-3 text-left px-4 py-3 text-sm font-bold transition-all ${
                              isSelected
                                ? 'bg-[var(--nura-accent)]/15 text-[var(--nura-accent)]'
                                : 'text-[var(--nura-dim)] hover:bg-white/5 hover:text-[var(--nura-text)]'
                            }`}
                          >
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${isSelected ? 'bg-[var(--nura-accent)]/30' : 'bg-white/10'}`}>
                              <span className={`text-[10px] font-black ${isSelected ? 'text-[var(--nura-accent)]' : 'text-[var(--nura-dim)]'}`}>
                                {initials(p.name || (p as any).full_name || '?')}
                              </span>
                            </div>
                            <span className="truncate flex-1">{p.name || (p as any).full_name}</span>
                            {isSelected && <Check size={14} className="shrink-0 text-[var(--nura-accent)]" />}
                          </button>
                        );
                      })}
                    </div>
                  </>
                )}
              </div>
            ) : (
              <div className="flex-1 min-w-0">
                <h2 className="text-xl font-black tracking-tight">Care Circle Hub</h2>
                <p className="text-[10px] font-bold text-[var(--nura-dim)] uppercase tracking-widest">
                  Collaborative Care
                </p>
              </div>
            )}
          </div>

          {/* Right side actions (Sync & Access Code) */}
          <div className="flex items-center gap-3 shrink-0">
            {/* Sync button */}
            <button onClick={() => fetchData(true)} disabled={isSyncing}
              className="p-2.5 bg-[var(--nura-card)] hover:bg-white/5 rounded-full border border-white/10 transition-all disabled:opacity-40" title="Sync latest data">
              <RefreshCw size={16} className={`text-[var(--nura-dim)] ${isSyncing ? 'animate-spin' : ''}`} />
            </button>

            {/* Access code badge */}
            {accessCode && (
              <div className="hidden sm:flex items-center gap-2 px-4 py-2.5 bg-[var(--nura-card)] rounded-2xl border border-[var(--nura-accent)]/20">
                <Shield size={14} className="text-[var(--nura-accent)] shrink-0" />
                <span className="text-[10px] font-black text-[var(--nura-dim)] uppercase tracking-widest hidden md:inline">Code</span>
                <span className="font-mono font-black text-[var(--nura-accent)] tracking-[0.15em]">{accessCode}</span>
                <button onClick={handleCopyCode} className="ml-1 p-1 hover:bg-white/10 rounded-lg transition-all">
                  {codeCopied ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} className="text-[var(--nura-dim)]" />}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* ── Top-level Tab Bar (centered) ── */}
        <div className="w-full max-w-6xl mx-auto mt-5 flex justify-center">
          <div className="flex gap-1 bg-black/20 p-1 rounded-2xl">
            {TOP_TABS.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setTopTab(id)}
                className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-sm transition-all whitespace-nowrap ${
                  topTab === id
                    ? 'bg-[var(--nura-accent)] text-white shadow-lg shadow-[var(--nura-accent)]/30'
                    : 'text-[var(--nura-dim)] hover:text-[var(--nura-text)] hover:bg-white/5'
                }`}
              >
                <Icon size={16} />
                {label}
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* ── Not Initialized (shown in Care Center tab only) ── */}
      {topTab === 'careCenter' && !isCircleActive && !isLoading && (
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="max-w-md w-full bg-[var(--nura-card)] p-12 rounded-[3rem] border border-white/10 text-center shadow-2xl">
            <Users size={48} className="text-[var(--nura-accent)] mx-auto mb-6" />
            <h2 className="text-3xl font-black mb-3 tracking-tight">Start Care Circle</h2>
            <p className="text-[var(--nura-dim)] text-sm leading-relaxed mb-8">
              Invite family members and co-caregivers to share photos, updates, and tasks in one place.
            </p>
            {error && <p className="text-red-400 text-sm font-bold mb-4">{error}</p>}
            <button onClick={handleInitialize} disabled={isInitializing}
              className="px-10 py-5 bg-[var(--nura-accent)] text-white rounded-2xl font-black text-lg hover:brightness-110 transition-all active:scale-95 shadow-2xl disabled:opacity-50">
              {isInitializing ? 'Starting...' : 'Initialize Circle'}
            </button>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          TAB: ANALYTICS
      ══════════════════════════════════════════════════════════════════════ */}
      {topTab === 'analytics' && activePatient && (
        <div className="flex-1 overflow-y-auto">
          <div className="w-full max-w-6xl mx-auto px-6 pb-20">
            <AnalyticsDashboard
              patient={activePatient}
              logs={analyticsLogs}
              onNavigateToLogs={() => setTopTab('logs')}
            />
          </div>
        </div>
      )}

      {topTab === 'analytics' && !activePatient && (
        <div className="flex-1 flex items-center justify-center">
          <EmptyState icon={LayoutDashboard} message="No patient selected." sub="Use the patient selector above to choose a patient." />
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          TAB: CARE CENTER (Unified Two-Column Layout)
      ══════════════════════════════════════════════════════════════════════ */}
      {topTab === 'careCenter' && isCircleActive && (
        <div className="flex-1 overflow-y-auto">
          <div className="w-full max-w-6xl mx-auto p-6 pb-20">

            {/* ── Top row: two columns ── */}
            <div className="grid grid-cols-1 lg:grid-cols-[340px_1fr] gap-6 mb-6">

              {/* ── LEFT COLUMN: Care Circle + Help Requests ── */}
              <div className="space-y-5">

                {/* Care Circle card */}
                <div className="bg-[var(--nura-card)] rounded-3xl border border-white/5 overflow-hidden">
                  {/* Card header */}
                  <div className="flex items-center gap-3 px-5 pt-5 pb-4 border-b border-white/5">
                    <div className="w-9 h-9 rounded-xl bg-[var(--nura-accent)]/20 flex items-center justify-center">
                      <Users size={18} className="text-[var(--nura-accent)]" />
                    </div>
                    <h2 className="font-black text-base text-[var(--nura-text)]">Care Circle</h2>
                    <span className="ml-auto text-[10px] font-black text-[var(--nura-dim)] uppercase tracking-widest">
                      {data?.caregivers.length ?? 0} member{(data?.caregivers.length ?? 0) !== 1 ? 's' : ''}
                    </span>
                  </div>

                  {/* Members list */}
                  <div className="divide-y divide-white/5">
                    {(data?.caregivers ?? []).map(cg => {
                      const isYou = cg.email === userEmail;
                      return (
                        <div key={cg.email} className="flex items-center gap-3 px-5 py-3.5">
                          <div className="w-10 h-10 rounded-full bg-[var(--nura-accent)]/20 flex items-center justify-center shrink-0">
                            <span className="text-sm font-black text-[var(--nura-accent)]">{initials(cg.full_name)}</span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-bold text-[var(--nura-text)] text-sm truncate">
                              {isYou ? 'You' : cg.full_name}
                            </p>
                            <p className="text-[10px] text-[var(--nura-dim)] truncate">{cg.email}</p>
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0">
                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                            <span className="text-[9px] text-[var(--nura-dim)] font-bold uppercase tracking-widest">Active</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Invite via access code */}
                  {accessCode && (
                    <div className="px-5 pb-5 pt-4 border-t border-white/5">
                      <p className="text-[9px] font-black uppercase tracking-[0.15em] text-[var(--nura-dim)]/60 mb-2">
                        Invite Supporters
                      </p>
                      <div className="flex items-center gap-2 bg-[var(--nura-bg)]/60 rounded-2xl px-4 py-3 border border-[var(--nura-accent)]/20">
                        <Shield size={13} className="text-[var(--nura-accent)] shrink-0" />
                        <span className="font-mono font-black text-[var(--nura-accent)] tracking-[0.25em] text-sm flex-1">
                          {accessCode}
                        </span>
                        <button onClick={handleCopyCode}
                          className={`p-1.5 rounded-lg transition-all ${codeCopied ? 'text-emerald-400' : 'text-[var(--nura-dim)] hover:text-[var(--nura-text)]'}`}>
                          {codeCopied ? <Check size={14} /> : <Copy size={14} />}
                        </button>
                      </div>
                      <p className="text-[9px] text-[var(--nura-dim)]/50 mt-2 leading-relaxed">
                        Share this code via "Join Circle" on the Dashboard.
                      </p>
                    </div>
                  )}
                </div>

                {/* Help Requests card */}
                <div className="bg-[var(--nura-card)] rounded-3xl border border-white/5 overflow-hidden">
                  <div className="flex items-center gap-3 px-5 pt-5 pb-4 border-b border-white/5">
                    <div className="w-9 h-9 rounded-xl bg-amber-500/15 flex items-center justify-center">
                      <ClipboardList size={18} className="text-amber-400" />
                    </div>
                    <h2 className="font-black text-base text-[var(--nura-text)]">Help Requests</h2>
                    {!!data?.help_requests.filter(r => r.status === 'open').length && (
                      <span className="ml-auto text-[10px] font-black px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/25">
                        {data!.help_requests.filter(r => r.status === 'open').length} open
                      </span>
                    )}
                  </div>

                  <div className="p-4">
                    <button onClick={() => setShowRequestModal(true)}
                      className="w-full py-3 mb-3 bg-[var(--nura-bg)]/50 hover:bg-[var(--nura-accent)]/10 border border-dashed border-[var(--nura-accent)]/30 rounded-2xl flex items-center justify-center gap-2 text-[var(--nura-accent)] font-bold text-sm transition-all">
                      <Plus size={16} />Post a Request
                    </button>

                    {/* "View All" toggle — shows filter pills when expanded */}
                    {!!data?.help_requests.length && (
                      <div className="mb-3">
                        <button
                          onClick={() => { setShowAllTasks(v => !v); setTaskFilter('all'); }}
                          className="w-full flex items-center justify-between px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-[var(--nura-dim)] text-xs font-black uppercase tracking-widest transition-all"
                        >
                          <span>{showAllTasks ? 'Showing All Tasks' : 'Active Tasks Only'}</span>
                          <ChevronDown size={13} className={`transition-transform duration-200 ${showAllTasks ? 'rotate-180' : ''}`} />
                        </button>

                        {showAllTasks && (
                          <div className="flex gap-1.5 mt-2 flex-wrap">
                            {(['all', 'open', 'claimed', 'done'] as const).map(f => (
                              <button
                                key={f}
                                onClick={() => setTaskFilter(f)}
                                className={`px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border transition-all ${
                                  taskFilter === f
                                    ? f === 'done'    ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400'
                                    : f === 'claimed' ? 'bg-blue-500/20 border-blue-500/40 text-blue-400'
                                    : f === 'open'    ? 'bg-amber-500/20 border-amber-500/40 text-amber-400'
                                    : 'bg-white/15 border-white/20 text-[var(--nura-text)]'
                                    : 'bg-white/5 border-white/10 text-[var(--nura-dim)] hover:bg-white/10'
                                }`}
                              >
                                {f === 'all' ? 'All' : STATUS_CONFIG[f].label}
                                {' '}
                                <span className="opacity-60">
                                  ({f === 'all' ? data!.help_requests.length : data!.help_requests.filter(r => r.status === f).length})
                                </span>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {!data?.help_requests.length ? (
                      <p className="text-center text-xs text-[var(--nura-dim)]/50 py-4">No requests yet</p>
                    ) : (() => {
                      // Filter logic: default hides "done"; "all" view uses taskFilter pill
                      const visible = showAllTasks
                        ? (taskFilter === 'all' ? data!.help_requests : data!.help_requests.filter(r => r.status === taskFilter))
                        : data!.help_requests.filter(r => r.status !== 'done');

                      if (!visible.length) return (
                        <p className="text-center text-xs text-[var(--nura-dim)]/50 py-4">No tasks match this filter</p>
                      );

                      return (
                        <div className="space-y-2">
                          {visible.map(req => {
                            const sc = STATUS_CONFIG[req.status];
                            const isAuthor = req.author_email === userEmail;
                            const isClaimer = req.claimed_by === userEmail;
                            return (
                              <div key={req.request_id} className={`bg-[var(--nura-bg)]/40 rounded-2xl border p-3.5 transition-all ${req.status === 'done' ? 'border-emerald-500/10 opacity-70' : 'border-white/5'}`}>
                                <div className="flex items-start justify-between gap-2 mb-2">
                                  <p className={`font-bold text-sm leading-tight ${req.status === 'done' ? 'line-through text-[var(--nura-dim)]' : 'text-[var(--nura-text)]'}`}>
                                    {req.title}
                                  </p>
                                  <span className={`shrink-0 text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full border ${sc.bg} ${sc.border} ${sc.color}`}>{sc.label}</span>
                                </div>
                                {req.description && <p className="text-[var(--nura-dim)] text-xs mb-2 leading-relaxed">{req.description}</p>}
                                <div className="flex items-center justify-between gap-2">
                                  <p className="text-[9px] text-[var(--nura-dim)]/50 font-bold">
                                    {isAuthor ? 'You' : req.author_name} · {fmt(req.timestamp)}
                                  </p>
                                  <div className="flex gap-1.5">
                                    {req.status === 'open' && !isAuthor && (
                                      <button onClick={() => handleClaimRequest(req.request_id)}
                                        className="flex items-center gap-1 px-2.5 py-1 bg-[var(--nura-accent)]/15 hover:bg-[var(--nura-accent)]/25 text-[var(--nura-accent)] text-[9px] font-black uppercase tracking-widest rounded-lg transition-all border border-[var(--nura-accent)]/20">
                                        <UserCheck size={10} />Claim
                                      </button>
                                    )}
                                    {req.status === 'claimed' && (isClaimer || isAuthor) && (
                                      <button onClick={() => handleCompleteRequest(req.request_id)}
                                        className="flex items-center gap-1 px-2.5 py-1 bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-400 text-[9px] font-black uppercase tracking-widest rounded-lg transition-all border border-emerald-500/20">
                                        <CheckCircle2 size={10} />Done
                                      </button>
                                    )}
                                    {req.status === 'done' && <span className="text-[9px] text-emerald-400/70 font-bold">✓ Completed</span>}
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      );
                    })()}
                  </div>
                </div>
              </div>

              {/* ── RIGHT COLUMN: Shared Care Journal ── */}
              <div className="bg-[var(--nura-card)] rounded-3xl border border-white/5 flex flex-col overflow-hidden">
                {/* Journal header */}
                <div className="flex items-center gap-3 px-6 pt-5 pb-4 border-b border-white/5 shrink-0">
                  <div className="w-9 h-9 rounded-xl bg-[var(--nura-accent)]/20 flex items-center justify-center">
                    <BookOpen size={18} className="text-[var(--nura-accent)]" />
                  </div>
                  <h2 className="font-black text-base text-[var(--nura-text)]">Shared Care Journal</h2>
                  {!!data?.journal.length && (
                    <span className="ml-auto text-[10px] font-black text-[var(--nura-dim)] uppercase tracking-widest">
                      {data.journal.length} {data.journal.length === 1 ? 'entry' : 'entries'}
                    </span>
                  )}
                </div>

                {/* Compose area */}
                <div className="px-6 py-4 border-b border-white/5 shrink-0">
                  {/* Type pills */}
                  <div className="flex gap-2 flex-wrap mb-3">
                    {(Object.entries(JOURNAL_TYPES) as [JournalPost['type'], typeof JOURNAL_TYPES[keyof typeof JOURNAL_TYPES]][]).map(([key, cfg]) => {
                      const Icon = cfg.icon;
                      const isActive = newType === key;
                      return (
                        <button key={key} onClick={() => setNewType(key)}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border transition-all ${
                            isActive ? `${cfg.bg} ${cfg.border} ${cfg.color}` : 'bg-white/5 border-white/10 text-[var(--nura-dim)] hover:bg-white/10'
                          }`}>
                          <Icon size={11} />{cfg.label}
                        </button>
                      );
                    })}
                  </div>
                  <div className="flex gap-3 items-end">
                    <textarea value={newContent} onChange={e => setNewContent(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter' && e.metaKey) handlePostJournal(); }}
                      placeholder="Post a quick update for the circle..."
                      rows={3}
                      className="flex-1 bg-[var(--nura-bg)]/60 border border-white/10 focus:border-[var(--nura-accent)] rounded-2xl p-4 text-[var(--nura-text)] text-sm resize-none focus:outline-none placeholder:text-[var(--nura-text)]/25 transition-all" />
                    <button onClick={handlePostJournal} disabled={!newContent.trim() || isPosting}
                      className="p-3.5 bg-[var(--nura-accent)] text-white rounded-2xl shadow-lg disabled:opacity-30 hover:brightness-110 transition-all active:scale-95 shrink-0">
                      <Send size={18} />
                    </button>
                  </div>
                </div>

                {/* Journal feed */}
                <div className="flex-1 overflow-y-auto px-6 py-4">
                  {!data?.journal.length ? (
                    <div className="flex flex-col items-center justify-center h-32 text-center">
                      <BookOpen size={28} className="text-[var(--nura-dim)]/20 mb-2" />
                      <p className="text-[var(--nura-dim)] text-sm font-bold">No journal entries yet.</p>
                      <p className="text-[var(--nura-dim)]/50 text-xs mt-1">Post the first update above.</p>
                    </div>
                  ) : (() => {
                    const ONE_WEEK_MS = 7 * 24 * 60 * 60 * 1000;
                    const now = Date.now();

                    // Build the filtered list depending on mode
                    let filtered = data.journal;

                    if (!showAllJournal) {
                      // Default: last 7 days only
                      filtered = filtered.filter(p => {
                        const d = new Date(String(p.timestamp).replace(/-/g, '/'));
                        return !isNaN(d.getTime()) && now - d.getTime() <= ONE_WEEK_MS;
                      });
                    } else {
                      // All-entries mode: apply search + type filter
                      if (journalTypeFilter !== 'all') {
                        filtered = filtered.filter(p => p.type === journalTypeFilter);
                      }
                      if (journalSearch.trim()) {
                        const q = journalSearch.toLowerCase();
                        filtered = filtered.filter(p =>
                          p.content.toLowerCase().includes(q) ||
                          p.author_name.toLowerCase().includes(q)
                        );
                      }
                    }

                    const hiddenCount = showAllJournal ? 0 : data.journal.length - filtered.length;

                    return (
                      <>
                        {/* Toggle + controls row */}
                        <div className="mb-4 space-y-2">
                          <button
                            onClick={() => { setShowAllJournal(v => !v); setJournalSearch(''); setJournalTypeFilter('all'); }}
                            className="w-full flex items-center justify-between px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-[var(--nura-dim)] text-xs font-black uppercase tracking-widest transition-all"
                          >
                            <span>{showAllJournal ? 'All Entries' : 'Last 7 Days'}</span>
                            <div className="flex items-center gap-2">
                              {!showAllJournal && hiddenCount > 0 && (
                                <span className="text-[9px] font-black px-2 py-0.5 rounded-full bg-white/10 text-[var(--nura-dim)]">
                                  +{hiddenCount} older
                                </span>
                              )}
                              <ChevronDown size={13} className={`transition-transform duration-200 ${showAllJournal ? 'rotate-180' : ''}`} />
                            </div>
                          </button>

                          {showAllJournal && (
                            <>
                              {/* Search bar */}
                              <div className="relative">
                                <input
                                  type="text"
                                  value={journalSearch}
                                  onChange={e => setJournalSearch(e.target.value)}
                                  placeholder="Search entries or authors…"
                                  className="w-full bg-[var(--nura-bg)]/60 border border-white/10 focus:border-[var(--nura-accent)] rounded-xl px-4 py-2.5 text-[var(--nura-text)] text-xs focus:outline-none placeholder:text-[var(--nura-text)]/25 transition-all pr-8"
                                />
                                {journalSearch && (
                                  <button onClick={() => setJournalSearch('')}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--nura-dim)]/50 hover:text-[var(--nura-dim)] transition-all">
                                    <X size={12} />
                                  </button>
                                )}
                              </div>

                              {/* Category filter pills */}
                              <div className="flex gap-1.5 flex-wrap">
                                <button
                                  onClick={() => setJournalTypeFilter('all')}
                                  className={`px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border transition-all ${
                                    journalTypeFilter === 'all'
                                      ? 'bg-white/15 border-white/20 text-[var(--nura-text)]'
                                      : 'bg-white/5 border-white/10 text-[var(--nura-dim)] hover:bg-white/10'
                                  }`}
                                >
                                  All ({data.journal.length})
                                </button>
                                {(Object.entries(JOURNAL_TYPES) as [JournalPost['type'], typeof JOURNAL_TYPES[keyof typeof JOURNAL_TYPES]][]).map(([key, cfg]) => (
                                  <button
                                    key={key}
                                    onClick={() => setJournalTypeFilter(key)}
                                    className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border transition-all ${
                                      journalTypeFilter === key
                                        ? `${cfg.bg} ${cfg.border} ${cfg.color}`
                                        : 'bg-white/5 border-white/10 text-[var(--nura-dim)] hover:bg-white/10'
                                    }`}
                                  >
                                    <cfg.icon size={8} />
                                    {cfg.label} ({data.journal.filter(p => p.type === key).length})
                                  </button>
                                ))}
                              </div>
                            </>
                          )}
                        </div>

                        {/* Timeline */}
                        {!filtered.length ? (
                          <div className="text-center py-8">
                            <p className="text-[var(--nura-dim)] text-xs font-bold">
                              {showAllJournal ? 'No entries match your search.' : 'No entries in the last 7 days.'}
                            </p>
                            {!showAllJournal && (
                              <button onClick={() => setShowAllJournal(true)}
                                className="mt-2 text-[var(--nura-accent)] text-xs font-black hover:underline">
                                View all entries →
                              </button>
                            )}
                          </div>
                        ) : (
                          <div className="relative">
                            <div className="absolute left-4 top-0 bottom-0 w-px bg-white/5" />
                            <div className="space-y-4 pl-10">
                              {filtered.map(post => {
                                const cfg = JOURNAL_TYPES[post.type] || JOURNAL_TYPES.update;
                                const Icon = cfg.icon;
                                const isYou = post.author_email === userEmail;
                                return (
                                  <div key={post.entry_id} className="relative">
                                    <div className={`absolute -left-[1.75rem] top-4 w-2.5 h-2.5 rounded-full border-2 border-[var(--nura-card)] ${cfg.bg}`} />
                                    <div className="bg-[var(--nura-bg)]/40 rounded-2xl border border-white/5 p-4">
                                      <div className="flex items-start justify-between gap-2 mb-2">
                                        <div className="flex items-center gap-2.5">
                                          <div className="w-7 h-7 rounded-full bg-[var(--nura-accent)]/20 flex items-center justify-center shrink-0">
                                            <span className="text-[10px] font-black text-[var(--nura-accent)]">{initials(post.author_name)}</span>
                                          </div>
                                          <div>
                                            <p className="font-bold text-[var(--nura-text)] text-sm leading-tight">
                                              {post.author_name}
                                              {isYou && <span className="ml-1 text-[9px] font-black text-[var(--nura-accent)]/70">(you)</span>}
                                            </p>
                                            <div className="flex items-center gap-1 text-[9px] text-[var(--nura-dim)]/50">
                                              <Clock size={8} />{fmt(post.timestamp)}
                                            </div>
                                          </div>
                                        </div>
                                        <div className={`flex items-center gap-1 px-2 py-0.5 rounded-full border text-[9px] font-black uppercase tracking-widest shrink-0 ${cfg.bg} ${cfg.border} ${cfg.color}`}>
                                          <Icon size={9} />{cfg.label}
                                        </div>
                                      </div>
                                      <p className="text-[var(--nura-text)]/80 text-sm leading-relaxed">{post.content}</p>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </>
                    );
                  })()}
                </div>
              </div>
            </div>

            {/* ── MEMORY BOX (Full Width Below) ── */}
            <section>
              <SectionHeader icon={ImageIcon} label="Memory Box" count={data?.memory_box.length} color="text-purple-400" />

              <div className="bg-[var(--nura-card)] rounded-3xl border border-white/10 p-6 mb-5">
                <p className="text-[10px] font-black uppercase tracking-widest text-[var(--nura-dim)] mb-4">Add a Photo</p>
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className={`relative rounded-2xl border-2 border-dashed transition-all cursor-pointer overflow-hidden ${
                    uploadPreview ? 'border-[var(--nura-accent)]/40' : 'border-white/10 hover:border-[var(--nura-accent)]/40'
                  }`}
                >
                  {uploadPreview ? (
                    <div className="relative">
                      <img src={uploadPreview} alt="Preview" className="w-full max-h-56 object-cover" />
                      <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                        <p className="text-white text-sm font-bold">Click to change</p>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-10 gap-3">
                      <UploadCloud size={32} className="text-[var(--nura-dim)]/40" />
                      <p className="text-[var(--nura-dim)] text-sm font-bold">Click to select a photo</p>
                      <p className="text-[var(--nura-dim)]/50 text-xs">JPG, PNG, GIF, WEBP, HEIC</p>
                    </div>
                  )}
                </div>
                <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileSelect} className="hidden" />

                {uploadFile && (
                  <div className="mt-4 space-y-3">
                    <input type="text" value={uploadDescription} onChange={e => setUploadDescription(e.target.value)}
                      placeholder="Add a caption (optional)..."
                      className="w-full bg-[var(--nura-bg)]/60 border border-white/10 focus:border-[var(--nura-accent)] rounded-2xl px-4 py-3 text-[var(--nura-text)] text-sm focus:outline-none placeholder:text-[var(--nura-text)]/25 transition-all" />
                    {uploadError && <p className="text-red-400 text-xs font-bold">{uploadError}</p>}
                    <div className="flex gap-3">
                      <button onClick={() => { setUploadFile(null); setUploadPreview(null); setUploadDescription(''); setUploadError(null); if (fileInputRef.current) fileInputRef.current.value = ''; }}
                        className="flex-1 py-3 rounded-2xl bg-white/5 text-[var(--nura-dim)] font-bold text-sm">Cancel</button>
                      <button onClick={handleUploadPhoto} disabled={isUploading}
                        className="flex-1 py-3 rounded-2xl bg-[var(--nura-accent)] text-white font-black text-sm disabled:opacity-40 hover:brightness-110 transition-all active:scale-95">
                        {isUploading ? 'Uploading...' : 'Upload Photo'}
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {!data?.memory_box.length ? (
                <EmptyState icon={ImageIcon} message="No photos yet." sub="Upload the first memory above — the whole care circle will see it." />
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                  {data.memory_box.map(photo => {
                    const isYours = photo.uploaded_by_email === userEmail;
                    return (
                      <div key={photo.photo_id} className="group relative rounded-3xl overflow-hidden bg-[var(--nura-card)] border border-white/5 aspect-square">
                        <img src={photo.url} alt={photo.description || 'Memory'}
                          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" loading="lazy" />
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/60 transition-all duration-300 flex flex-col items-center justify-center gap-3 opacity-0 group-hover:opacity-100">
                          <button onClick={() => setLightboxPhoto(photo)}
                            className="flex items-center gap-1.5 px-3 py-2 bg-white/20 hover:bg-white/30 backdrop-blur-sm rounded-xl text-white text-xs font-black transition-all">
                            <Eye size={13} />View
                          </button>
                          {isYours && (
                            <button onClick={() => handleDeletePhoto(photo.photo_id)}
                              className="flex items-center gap-1.5 px-3 py-2 bg-red-500/40 hover:bg-red-500/60 backdrop-blur-sm rounded-xl text-white text-xs font-black transition-all">
                              <Trash2 size={13} />Delete
                            </button>
                          )}
                        </div>
                        {photo.description && (
                          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-3 translate-y-full group-hover:translate-y-0 transition-transform duration-300">
                            <p className="text-white text-xs leading-tight line-clamp-2">{photo.description}</p>
                          </div>
                        )}
                        <div className="absolute top-2.5 left-2.5">
                          <div className="w-6 h-6 rounded-full bg-[var(--nura-accent)] flex items-center justify-center shadow-lg" title={photo.uploaded_by_name}>
                            <span className="text-[9px] font-black text-white">{initials(photo.uploaded_by_name)}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>

          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          TAB: LOGS
      ══════════════════════════════════════════════════════════════════════ */}
      {topTab === 'logs' && (
        <div className="flex-1 overflow-y-auto">
          <div className="w-full max-w-6xl mx-auto px-6 pt-6 pb-20">
            <SessionLogs
              logs={analyticsLogs}
              onBack={() => setTopTab('careCenter')}
              isSubView={true}
            />
          </div>
        </div>
      )}

      {/* ── Help Request Modal ── */}
      {showRequestModal && (
        <div className="fixed inset-0 z-[400] bg-black/70 backdrop-blur-xl flex items-center justify-center p-6">
          <div className="bg-[var(--nura-card)] border border-white/10 rounded-[2.5rem] p-8 w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-black text-[var(--nura-text)]">Post Help Request</h2>
              <button onClick={() => { setShowRequestModal(false); setNewReqTitle(''); setNewReqDesc(''); }}
                className="p-2 hover:bg-white/10 rounded-full transition-all">
                <X size={20} className="text-[var(--nura-dim)]" />
              </button>
            </div>
            <div className="space-y-4">
              <input type="text" value={newReqTitle} onChange={e => setNewReqTitle(e.target.value)}
                placeholder="Title (e.g. 'Drive to appointment Fri 3pm')"
                className="w-full bg-[var(--nura-bg)]/60 border border-white/10 focus:border-[var(--nura-accent)] rounded-2xl px-4 py-3.5 text-[var(--nura-text)] text-sm focus:outline-none placeholder:text-[var(--nura-text)]/25 transition-all" />
              <textarea value={newReqDesc} onChange={e => setNewReqDesc(e.target.value)}
                placeholder="Additional details (optional)" rows={3}
                className="w-full bg-[var(--nura-bg)]/60 border border-white/10 focus:border-[var(--nura-accent)] rounded-2xl px-4 py-3.5 text-[var(--nura-text)] text-sm resize-none focus:outline-none placeholder:text-[var(--nura-text)]/25 transition-all" />
              <div className="flex gap-3 pt-2">
                <button onClick={() => { setShowRequestModal(false); setNewReqTitle(''); setNewReqDesc(''); }}
                  className="flex-1 py-4 rounded-2xl bg-white/5 text-[var(--nura-text)] font-bold text-sm">Cancel</button>
                <button onClick={handleCreateRequest} disabled={!newReqTitle.trim() || isCreatingReq}
                  className="flex-1 py-4 rounded-2xl bg-[var(--nura-accent)] text-white font-black text-sm disabled:opacity-40 hover:brightness-110 transition-all active:scale-95">
                  {isCreatingReq ? 'Posting...' : 'Post Request'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ─── Sub-components ───────────────────────────────────────────────────────────

const SectionHeader: React.FC<{
  icon: React.ElementType;
  label: string;
  count?: number;
  countLabel?: string;
  color?: string;
}> = ({ icon: Icon, label, count, countLabel, color = 'text-[var(--nura-accent)]' }) => (
  <div className="flex items-center gap-3 mb-5">
    <div className={`w-8 h-8 rounded-xl bg-white/5 flex items-center justify-center`}>
      <Icon size={16} className={color} />
    </div>
    <h2 className="text-base font-black text-[var(--nura-text)] tracking-tight">{label}</h2>
    {count !== undefined && count > 0 && (
      <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-white/10 text-[var(--nura-dim)] uppercase tracking-widest">
        {count} {countLabel || ''}
      </span>
    )}
    <div className="flex-1 h-px bg-white/5" />
  </div>
);

const EmptyState: React.FC<{ icon: React.ElementType; message: string; sub: string }> = ({ icon: Icon, message, sub }) => (
  <div className="bg-[var(--nura-card)] rounded-3xl p-12 text-center border border-white/5">
    <Icon size={40} className="mx-auto mb-4 text-[var(--nura-dim)]/30" />
    <p className="text-[var(--nura-dim)] text-sm font-bold">{message}</p>
    <p className="text-[var(--nura-dim)]/50 text-xs mt-1">{sub}</p>
  </div>
);
