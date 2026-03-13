import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  ArrowLeft, Users, BookOpen, MessageSquare, Copy, Check,
  Plus, X, ChevronDown, ChevronUp, Send, Clock, Calendar,
  Shield, RefreshCw, ClipboardList, Pill, Image as ImageIcon,
  CheckCircle2, UserCheck, AlertCircle, Zap, Trash2,
  UploadCloud, Eye
} from 'lucide-react';
import type { PatientProfile, AppSettings } from '../types';

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
  const [selectedPatientId, setSelectedPatientId] = useState<string>(() => {
    // Pre-select the patient the user clicked on, falling back to the first patient
    if (initialPatientId) {
      const match = patients.find(p => {
        const id = (p as any).patient_id || (p as any).id;
        return String(id) === String(initialPatientId);
      });
      if (match) return String((match as any).patient_id || (match as any).id);
    }
    return String((patients[0] as any)?.patient_id || (patients[0] as any)?.id || '');
  });

  const [data, setData]           = useState<CareCenterData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isInitializing, setIsInitializing] = useState(false);
  const [error, setError]         = useState<string | null>(null);
  const [codeCopied, setCodeCopied] = useState(false);

  const [activeTab, setActiveTab] = useState<'journal' | 'requests' | 'memory' | 'sessions' | 'circle'>('journal');

  // Journal
  const [newContent, setNewContent] = useState('');
  const [newType, setNewType]       = useState<JournalPost['type']>('update');
  const [isPosting, setIsPosting]   = useState(false);

  // Help requests
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [newReqTitle, setNewReqTitle]           = useState('');
  const [newReqDesc, setNewReqDesc]             = useState('');
  const [isCreatingReq, setIsCreatingReq]       = useState(false);

  // Memory box
  const fileInputRef                              = useRef<HTMLInputElement>(null);
  const [uploadDescription, setUploadDescription] = useState('');
  const [uploadPreview, setUploadPreview]         = useState<string | null>(null);
  const [uploadFile, setUploadFile]               = useState<File | null>(null);
  const [isUploading, setIsUploading]             = useState(false);
  const [uploadError, setUploadError]             = useState<string | null>(null);
  const [lightboxPhoto, setLightboxPhoto]         = useState<MemoryPhoto | null>(null);

  // Sessions
  const [expandedSession, setExpandedSession] = useState<number | null>(null);

  // ── Derived ──────────────────────────────────────────────────────────────
  const activePatient = patients.find(p => {
    const id = (p as any).patient_id || (p as any).id;
    return String(id) === String(selectedPatientId);
  });
  const patientId = (activePatient as any)?.patient_id || (activePatient as any)?.id || selectedPatientId;
  const isCircleActive = !!(data?.access_code || (activePatient as any)?.access_code);
  const accessCode = data?.access_code || (activePatient as any)?.access_code;

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
        setNewContent('');
        setNewType('update');
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

  // ── Memory Box actions ────────────────────────────────────────────────────
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

      const res = await fetch('http://127.0.0.1:8000/api/memory-box/upload', {
        method: 'POST',
        body: form,
        // NOTE: do NOT set Content-Type — browser sets it automatically with the correct boundary for multipart
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || 'Upload failed.');
      }

      const saved: MemoryPhoto = await res.json();
      setData(prev => prev ? { ...prev, memory_box: [saved, ...prev.memory_box] } : prev);
      setUploadFile(null);
      setUploadPreview(null);
      setUploadDescription('');
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

  // ── Loading ───────────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="fixed inset-0 z-[300] bg-[var(--nura-bg)] flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-[var(--nura-accent)] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const tabs = [
    { id: 'journal'  as const, label: 'Journal',      icon: BookOpen,      count: data?.journal.length },
    { id: 'requests' as const, label: 'Help',          icon: ClipboardList, count: data?.help_requests.filter(r => r.status === 'open').length },
    { id: 'memory'   as const, label: 'Memory Box',   icon: ImageIcon,     count: data?.memory_box.length },
    { id: 'sessions' as const, label: 'Sessions',      icon: MessageSquare, count: data?.sessions.length },
    { id: 'circle'   as const, label: 'Circle',        icon: Users,         count: data?.caregivers.length },
  ];

  return (
    <div className="fixed inset-0 z-[300] bg-[var(--nura-bg)] flex flex-col overflow-hidden text-[var(--nura-text)]">

      {/* ── Lightbox ── */}
      {lightboxPhoto && (
        <div
          className="fixed inset-0 z-[500] bg-black/90 backdrop-blur-xl flex flex-col items-center justify-center p-6"
          onClick={() => setLightboxPhoto(null)}
        >
          <button className="absolute top-6 right-6 p-2 bg-white/10 rounded-full hover:bg-white/20 transition-all" onClick={() => setLightboxPhoto(null)}>
            <X size={24} className="text-white" />
          </button>
          <img
            src={lightboxPhoto.url}
            alt={lightboxPhoto.description || 'Memory photo'}
            className="max-h-[75vh] max-w-full object-contain rounded-2xl shadow-2xl"
            onClick={e => e.stopPropagation()}
          />
          {lightboxPhoto.description && (
            <p className="mt-4 text-white/80 text-center max-w-md text-sm">{lightboxPhoto.description}</p>
          )}
          <p className="mt-2 text-white/40 text-xs">
            Uploaded by {lightboxPhoto.uploaded_by_name} · {fmt(lightboxPhoto.timestamp)}
          </p>
        </div>
      )}

      {/* ── Header ── */}
      <header className="shrink-0 border-b border-white/5 px-6 py-5">
        <div className="w-full max-w-6xl mx-auto flex items-center gap-4">
          <button onClick={onClose} className="p-2.5 bg-[var(--nura-card)] hover:bg-white/5 rounded-full border border-white/10 transition-all shrink-0">
            <ArrowLeft size={20} className="text-[var(--nura-dim)]" />
          </button>
          <div className="flex-1 min-w-0">
            <h2 className="text-xl font-black tracking-tight">Care Circle Hub</h2>
            <p className="text-[10px] font-bold text-[var(--nura-dim)] uppercase tracking-widest">
              {activePatient?.full_name || activePatient?.name || 'Collaborative Care'}
            </p>
          </div>
          <button onClick={() => fetchData(true)} disabled={isSyncing}
            className="p-2.5 bg-[var(--nura-card)] hover:bg-white/5 rounded-full border border-white/10 transition-all disabled:opacity-40"
            title="Sync latest data">
            <RefreshCw size={16} className={`text-[var(--nura-dim)] ${isSyncing ? 'animate-spin' : ''}`} />
          </button>
          {accessCode && (
            <div className="flex items-center gap-2 px-4 py-2.5 bg-[var(--nura-card)] rounded-2xl border border-[var(--nura-accent)]/20 shrink-0">
              <Shield size={14} className="text-[var(--nura-accent)]" />
              <span className="text-[10px] font-black text-[var(--nura-dim)] uppercase tracking-widest">Code</span>
              <span className="font-mono font-black text-[var(--nura-accent)] tracking-[0.15em]">{accessCode}</span>
              <button onClick={handleCopyCode} className="ml-1 p-1 hover:bg-white/10 rounded-lg transition-all">
                {codeCopied ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} className="text-[var(--nura-dim)]" />}
              </button>
            </div>
          )}
        </div>

        {patients.length > 1 && (
          <div className="w-full max-w-6xl mx-auto mt-4 flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
            {patients.map(p => {
              const id = (p as any).patient_id || (p as any).id;
              const isSelected = String(id) === String(selectedPatientId);
              return (
                <button key={id} onClick={() => { setSelectedPatientId(String(id)); setData(null); }}
                  className={`flex items-center gap-2 px-5 py-2.5 rounded-2xl border text-sm font-bold whitespace-nowrap transition-all ${
                    isSelected ? 'bg-[var(--nura-accent)] text-white border-[var(--nura-accent)]' : 'bg-[var(--nura-card)] border-white/10 text-[var(--nura-dim)]'
                  }`}>
                  {p.name || p.full_name}
                </button>
              );
            })}
          </div>
        )}
      </header>

      {/* ── Not Initialized ── */}
      {!isCircleActive && !isLoading && (
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

      {/* ── Main Content ── */}
      {isCircleActive && (
        <div className="flex-1 flex flex-col overflow-hidden">

          {/* Tab Bar */}
          <div className="shrink-0 border-b border-white/5 px-6">
            <div className="w-full max-w-6xl mx-auto flex gap-1 pt-3 overflow-x-auto scrollbar-hide">
              {tabs.map(({ id, label, icon: Icon, count }) => (
                <button key={id} onClick={() => setActiveTab(id)}
                  className={`flex items-center gap-2 px-4 py-3 rounded-t-xl font-bold text-sm transition-all whitespace-nowrap border-b-2 ${
                    activeTab === id
                      ? 'text-[var(--nura-accent)] border-[var(--nura-accent)] bg-[var(--nura-accent)]/5'
                      : 'text-[var(--nura-dim)] border-transparent hover:text-[var(--nura-text)]'
                  }`}>
                  <Icon size={15} />
                  {label}
                  {!!count && count > 0 && (
                    <span className={`text-[10px] font-black px-1.5 py-0.5 rounded-full ${activeTab === id ? 'bg-[var(--nura-accent)] text-white' : 'bg-white/10 text-[var(--nura-dim)]'}`}>
                      {count}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            <div className="w-full max-w-6xl mx-auto p-6 pb-20">

              {/* ════ JOURNAL ════ */}
              {activeTab === 'journal' && (
                <div className="space-y-5">
                  <div className="bg-[var(--nura-card)] rounded-3xl border border-white/10 p-6">
                    <p className="text-[10px] font-black uppercase tracking-widest text-[var(--nura-dim)] mb-4">Post Update</p>
                    <div className="flex gap-2 flex-wrap mb-4">
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
                        placeholder="Share an update with the care team..."
                        rows={3}
                        className="flex-1 bg-[var(--nura-bg)]/60 border border-white/10 focus:border-[var(--nura-accent)] rounded-2xl p-4 text-[var(--nura-text)] text-sm resize-none focus:outline-none placeholder:text-[var(--nura-text)]/25 transition-all" />
                      <button onClick={handlePostJournal} disabled={!newContent.trim() || isPosting}
                        className="p-4 bg-[var(--nura-accent)] text-white rounded-2xl shadow-lg disabled:opacity-30 hover:brightness-110 transition-all active:scale-95 shrink-0">
                        <Send size={18} />
                      </button>
                    </div>
                  </div>

                  {!data?.journal.length ? (
                    <EmptyState icon={BookOpen} message="No journal entries yet." sub="Post the first update above." />
                  ) : (
                    <div className="relative">
                      <div className="absolute left-5 top-0 bottom-0 w-px bg-white/5" />
                      <div className="space-y-4 pl-12">
                        {data.journal.map(post => {
                          const cfg = JOURNAL_TYPES[post.type] || JOURNAL_TYPES.update;
                          const Icon = cfg.icon;
                          const isYou = post.author_email === userEmail;
                          return (
                            <div key={post.entry_id} className="relative">
                              <div className={`absolute -left-[2.15rem] top-4 w-3 h-3 rounded-full border-2 border-[var(--nura-bg)] ${cfg.bg}`} />
                              <div className="bg-[var(--nura-card)] rounded-3xl border border-white/5 p-5">
                                <div className="flex items-start justify-between gap-3 mb-3">
                                  <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-full bg-[var(--nura-accent)]/20 flex items-center justify-center shrink-0">
                                      <span className="text-[11px] font-black text-[var(--nura-accent)]">{initials(post.author_name)}</span>
                                    </div>
                                    <div>
                                      <p className="font-bold text-[var(--nura-text)] text-sm">
                                        {post.author_name}
                                        {isYou && <span className="ml-1.5 text-[9px] font-black uppercase tracking-widest text-[var(--nura-accent)]/70">(you)</span>}
                                      </p>
                                      <div className="flex items-center gap-1 text-[10px] text-[var(--nura-dim)]/50 mt-0.5">
                                        <Clock size={9} />{fmt(post.timestamp)}
                                      </div>
                                    </div>
                                  </div>
                                  <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[10px] font-black uppercase tracking-widest shrink-0 ${cfg.bg} ${cfg.border} ${cfg.color}`}>
                                    <Icon size={10} />{cfg.label}
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
                </div>
              )}

              {/* ════ HELP REQUESTS ════ */}
              {activeTab === 'requests' && (
                <div className="space-y-4">
                  <button onClick={() => setShowRequestModal(true)}
                    className="w-full py-4 bg-[var(--nura-card)] hover:bg-[var(--nura-accent)]/10 border border-dashed border-[var(--nura-accent)]/30 rounded-3xl flex items-center justify-center gap-3 text-[var(--nura-accent)] font-bold transition-all">
                    <Plus size={18} />Post a Help Request
                  </button>

                  {!data?.help_requests.length ? (
                    <EmptyState icon={ClipboardList} message="No help requests yet." sub="Post one above so the team knows where to pitch in." />
                  ) : (
                    data.help_requests.map(req => {
                      const sc = STATUS_CONFIG[req.status];
                      const isAuthor = req.author_email === userEmail;
                      const isClaimer = req.claimed_by === userEmail;
                      return (
                        <div key={req.request_id} className="bg-[var(--nura-card)] rounded-3xl border border-white/5 p-5">
                          <div className="flex items-start justify-between gap-3 mb-3">
                            <div>
                              <h3 className="font-black text-[var(--nura-text)] text-base">{req.title}</h3>
                              {req.description && <p className="text-[var(--nura-dim)] text-xs mt-1 leading-relaxed">{req.description}</p>}
                            </div>
                            <span className={`shrink-0 text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full border ${sc.bg} ${sc.border} ${sc.color}`}>{sc.label}</span>
                          </div>
                          <div className="flex items-center justify-between gap-3 pt-3 border-t border-white/5">
                            <div className="text-[10px] text-[var(--nura-dim)]/60">
                              <span className="font-bold">{isAuthor ? 'You' : req.author_name}</span> · {fmt(req.timestamp)}
                              {req.claimed_name && <span className="ml-2 text-blue-400 font-bold">→ {isClaimer ? 'You claimed this' : `Claimed by ${req.claimed_name}`}</span>}
                            </div>
                            <div className="flex gap-2">
                              {req.status === 'open' && !isAuthor && (
                                <button onClick={() => handleClaimRequest(req.request_id)}
                                  className="flex items-center gap-1.5 px-3 py-1.5 bg-[var(--nura-accent)]/15 hover:bg-[var(--nura-accent)]/25 text-[var(--nura-accent)] text-[10px] font-black uppercase tracking-widest rounded-xl transition-all border border-[var(--nura-accent)]/20">
                                  <UserCheck size={11} />Claim
                                </button>
                              )}
                              {req.status === 'claimed' && (isClaimer || isAuthor) && (
                                <button onClick={() => handleCompleteRequest(req.request_id)}
                                  className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-400 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all border border-emerald-500/20">
                                  <CheckCircle2 size={11} />Mark Done
                                </button>
                              )}
                              {req.status === 'done' && <span className="text-[10px] text-emerald-400/70 font-bold">✓ Completed</span>}
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              )}

              {/* ════ MEMORY BOX ════ */}
              {activeTab === 'memory' && (
                <div className="space-y-6">

                  {/* Upload card */}
                  <div className="bg-[var(--nura-card)] rounded-3xl border border-white/10 p-6">
                    <p className="text-[10px] font-black uppercase tracking-widest text-[var(--nura-dim)] mb-4">Add a Photo</p>

                    {/* Drop zone / file picker */}
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
                        <input
                          type="text"
                          value={uploadDescription}
                          onChange={e => setUploadDescription(e.target.value)}
                          placeholder="Add a caption (optional)..."
                          className="w-full bg-[var(--nura-bg)]/60 border border-white/10 focus:border-[var(--nura-accent)] rounded-2xl px-4 py-3 text-[var(--nura-text)] text-sm focus:outline-none placeholder:text-[var(--nura-text)]/25 transition-all"
                        />
                        {uploadError && <p className="text-red-400 text-xs font-bold">{uploadError}</p>}
                        <div className="flex gap-3">
                          <button
                            onClick={() => { setUploadFile(null); setUploadPreview(null); setUploadDescription(''); setUploadError(null); if (fileInputRef.current) fileInputRef.current.value = ''; }}
                            className="flex-1 py-3 rounded-2xl bg-white/5 text-[var(--nura-dim)] font-bold text-sm"
                          >
                            Cancel
                          </button>
                          <button onClick={handleUploadPhoto} disabled={isUploading}
                            className="flex-1 py-3 rounded-2xl bg-[var(--nura-accent)] text-white font-black text-sm disabled:opacity-40 hover:brightness-110 transition-all active:scale-95">
                            {isUploading ? 'Uploading...' : 'Upload Photo'}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Photo grid */}
                  {!data?.memory_box.length ? (
                    <EmptyState icon={ImageIcon} message="No photos yet." sub="Upload the first memory above — the whole care circle will see it." />
                  ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                      {data.memory_box.map(photo => {
                        const isYours = photo.uploaded_by_email === userEmail;
                        return (
                          <div key={photo.photo_id} className="group relative rounded-3xl overflow-hidden bg-[var(--nura-card)] border border-white/5 aspect-square">
                            <img
                              src={photo.url}
                              alt={photo.description || 'Memory'}
                              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                              loading="lazy"
                            />
                            {/* Hover overlay */}
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
                            {/* Caption strip */}
                            {photo.description && (
                              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-3 translate-y-full group-hover:translate-y-0 transition-transform duration-300">
                                <p className="text-white text-xs leading-tight line-clamp-2">{photo.description}</p>
                              </div>
                            )}
                            {/* Uploader badge */}
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
                </div>
              )}

              {/* ════ SESSIONS ════ */}
              {activeTab === 'sessions' && (
                <div className="space-y-3">
                  {!data?.sessions.length ? (
                    <EmptyState icon={MessageSquare} message="No AI sessions recorded yet." sub="Sessions appear here after the patient uses the chat." />
                  ) : (
                    data.sessions.map((session, idx) => {
                      const isExpanded = expandedSession === idx;
                      const msgCount = session.transcript?.length ?? 0;
                      const isYou = session.logged_by === userEmail;
                      return (
                        <div key={idx} onClick={() => setExpandedSession(isExpanded ? null : idx)}
                          className={`bg-[var(--nura-card)] rounded-3xl border border-white/5 p-5 cursor-pointer transition-all ${isExpanded ? 'ring-2 ring-[var(--nura-accent)]/20' : 'hover:bg-white/[0.03]'}`}>
                          <div className="flex items-center justify-between gap-3">
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 rounded-full bg-indigo-500/15 flex items-center justify-center shrink-0">
                                <MessageSquare size={15} className="text-indigo-400" />
                              </div>
                              <div>
                                <p className="font-bold text-[var(--nura-text)] text-sm">{msgCount} message{msgCount !== 1 ? 's' : ''}</p>
                                <div className="flex items-center gap-2 mt-0.5">
                                  <div className="flex items-center gap-1 text-[10px] text-[var(--nura-dim)]/60"><Calendar size={9} />{fmt(session.timestamp)}</div>
                                  {session.logged_by && <span className="text-[9px] text-[var(--nura-dim)]/40">by {isYou ? 'you' : session.logged_by}</span>}
                                </div>
                              </div>
                            </div>
                            {isExpanded ? <ChevronUp size={16} className="text-[var(--nura-dim)] shrink-0" /> : <ChevronDown size={16} className="text-[var(--nura-dim)] shrink-0" />}
                          </div>
                          {isExpanded && session.transcript?.length > 0 && (
                            <div className="mt-4 pt-4 border-t border-white/5 space-y-2">
                              {session.transcript.map((msg, mIdx) => (
                                <div key={mIdx} className={`flex ${msg.sender === 'patient' ? 'justify-end' : 'justify-start'}`}>
                                  <div className={`max-w-[80%] px-4 py-2.5 rounded-2xl text-sm ${msg.sender === 'patient' ? 'bg-[var(--nura-accent)]/20 text-[var(--nura-text)]' : 'bg-white/5 text-[var(--nura-dim)]'}`}>
                                    {msg.text}
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              )}

              {/* ════ CIRCLE ════ */}
              {activeTab === 'circle' && (
                <div className="space-y-4">
                  <div className="bg-[var(--nura-accent)]/5 border border-[var(--nura-accent)]/15 rounded-3xl p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-widest text-[var(--nura-accent)] mb-1">Invite to this circle</p>
                      <p className="text-[var(--nura-text)]/60 text-xs leading-relaxed max-w-xs">
                        Share the code with another caregiver — they enter it via "Join Circle" on their Dashboard.
                      </p>
                    </div>
                    {accessCode && (
                      <div className="flex items-center gap-3 shrink-0">
                        <div className="px-5 py-2.5 bg-[var(--nura-bg)] rounded-2xl border border-[var(--nura-accent)]/30">
                          <span className="text-xl font-black tracking-[0.3em] text-[var(--nura-accent)]">{accessCode}</span>
                        </div>
                        <button onClick={handleCopyCode}
                          className={`p-2.5 rounded-2xl border transition-all ${codeCopied ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400' : 'bg-[var(--nura-bg)] border-white/10 text-[var(--nura-dim)] hover:text-[var(--nura-text)]'}`}>
                          {codeCopied ? <Check size={16} /> : <Copy size={16} />}
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="bg-[var(--nura-card)] rounded-3xl border border-white/5 overflow-hidden">
                    <div className="p-5 border-b border-white/5">
                      <h2 className="text-xs font-black uppercase tracking-widest text-[var(--nura-dim)]">
                        Authorized Caregivers — {data?.caregivers.length ?? 0}
                      </h2>
                    </div>
                    <div className="divide-y divide-white/5">
                      {(data?.caregivers ?? []).map(cg => {
                        const isYou = cg.email === userEmail;
                        return (
                          <div key={cg.email} className="flex items-center justify-between p-5">
                            <div className="flex items-center gap-4">
                              <div className="w-10 h-10 rounded-full bg-[var(--nura-accent)]/20 flex items-center justify-center">
                                <span className="text-sm font-black text-[var(--nura-accent)]">{initials(cg.full_name)}</span>
                              </div>
                              <div>
                                <p className="font-bold text-[var(--nura-text)] text-sm">
                                  {cg.full_name}
                                  {isYou && <span className="ml-2 text-[9px] font-black uppercase tracking-widest text-[var(--nura-accent)] bg-[var(--nura-accent)]/10 px-1.5 py-0.5 rounded-full">You</span>}
                                </p>
                                <p className="text-[10px] text-[var(--nura-dim)] mt-0.5">{cg.email}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <div className="w-2 h-2 rounded-full bg-emerald-400" />
                              <span className="text-[10px] text-[var(--nura-dim)] font-medium">Active</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

            </div>
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

const EmptyState: React.FC<{ icon: React.ElementType; message: string; sub: string }> = ({ icon: Icon, message, sub }) => (
  <div className="bg-[var(--nura-card)] rounded-3xl p-12 text-center border border-white/5">
    <Icon size={40} className="mx-auto mb-4 text-[var(--nura-dim)]/30" />
    <p className="text-[var(--nura-dim)] text-sm font-bold">{message}</p>
    <p className="text-[var(--nura-dim)]/50 text-xs mt-1">{sub}</p>
  </div>
);
