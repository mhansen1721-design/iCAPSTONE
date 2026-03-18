import React, { useState, useRef } from 'react';
import { Users, BookOpen, Copy, Check, Plus, X, Send, Clock, Shield, ClipboardList, Pill, Image as ImageIcon, CheckCircle2, UserCheck, AlertCircle, Zap, Trash2, UploadCloud, Eye } from 'lucide-react';

const JOURNAL_TYPES = {
  update: { label: 'Update', icon: Zap, color: 'text-blue-400', bg: 'bg-blue-500/15', border: 'border-blue-500/30' },
  medication: { label: 'Medication', icon: Pill, color: 'text-amber-400', bg: 'bg-amber-500/15', border: 'border-amber-500/30' },
  problem: { label: 'Problem', icon: AlertCircle, color: 'text-red-400', bg: 'bg-red-500/15', border: 'border-red-500/30' },
  milestone: { label: 'Milestone', icon: CheckCircle2, color: 'text-emerald-400', bg: 'bg-emerald-500/15', border: 'border-emerald-500/30' },
} as const;

const STATUS_CONFIG = {
  open: { label: 'Open', color: 'text-amber-400', bg: 'bg-amber-500/15', border: 'border-amber-500/30' },
  claimed: { label: 'Claimed', color: 'text-blue-400', bg: 'bg-blue-500/15', border: 'border-blue-500/30' },
  done: { label: 'Done', color: 'text-emerald-400', bg: 'bg-emerald-500/15', border: 'border-emerald-500/30' },
};

interface CareCircleContentProps {
  data: any | null;
  setData: React.Dispatch<React.SetStateAction<any | null>>;
  patientId: string;
  userEmail: string;
  onRefresh: () => void;
}

export const CareCircleContent = ({ data, setData, patientId, userEmail, onRefresh }: CareCircleContentProps) => {
  const [isInitializing, setIsInitializing] = useState(false);
  const [initError, setInitError] = useState<string | null>(null);
  const [codeCopied, setCodeCopied] = useState(false);

  const [newContent, setNewContent] = useState('');
  const [newType, setNewType] = useState<keyof typeof JOURNAL_TYPES>('update');
  const [isPosting, setIsPosting] = useState(false);
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [newReqTitle, setNewReqTitle] = useState('');
  const [newReqDesc, setNewReqDesc] = useState('');
  const [isCreatingReq, setIsCreatingReq] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadDescription, setUploadDescription] = useState('');
  const [uploadPreview, setUploadPreview] = useState<string | null>(null);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [lightboxPhoto, setLightboxPhoto] = useState<any | null>(null);

  const isCircleActive = !!data?.access_code;
  const accessCode = data?.access_code;

  const handleInitialize = async () => {
    setIsInitializing(true); setInitError(null);
    try {
      const res = await fetch(`http://127.0.0.1:8000/patients/activate-circle/${patientId}`, { method: 'POST' });
      if (res.ok) onRefresh();
    } catch (e) { setInitError('Failed to initialize circle.'); } 
    finally { setIsInitializing(false); }
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
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ patient_id: patientId, author_email: userEmail, content: newContent.trim(), type: newType }),
      });
      if (res.ok) {
        const saved = await res.json();
        setData((prev: any) => prev ? { ...prev, journal: [saved, ...prev.journal] } : prev);
        setNewContent(''); setNewType('update');
      }
    } catch {} finally { setIsPosting(false); }
  };

  const handleCreateRequest = async () => {
    if (!newReqTitle.trim()) return;
    setIsCreatingReq(true);
    try {
      const res = await fetch('http://127.0.0.1:8000/api/help-requests', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ patient_id: patientId, author_email: userEmail, title: newReqTitle.trim(), description: newReqDesc.trim() }),
      });
      if (res.ok) {
        const saved = await res.json();
        setData((prev: any) => prev ? { ...prev, help_requests: [saved, ...prev.help_requests] } : prev);
        setNewReqTitle(''); setNewReqDesc(''); setShowRequestModal(false);
      }
    } catch {} finally { setIsCreatingReq(false); }
  };

  const handleTaskAction = async (endpoint: string, requestId: string) => {
    const res = await fetch(`http://127.0.0.1:8000/api/help-requests/${requestId}/${endpoint}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ claimer_email: userEmail }),
    }).catch(() => null);
    if (res?.ok) {
      const updated = await res.json();
      setData((prev: any) => prev ? { ...prev, help_requests: prev.help_requests.map((r: any) => r.request_id === requestId ? updated : r) } : prev);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadFile(file);
    const reader = new FileReader();
    reader.onload = ev => setUploadPreview(ev.target?.result as string);
    reader.readAsDataURL(file);
  };

  const handleUploadPhoto = async () => {
    if (!uploadFile) return;
    setIsUploading(true);
    try {
      const form = new FormData();
      form.append('patient_id', patientId);
      form.append('author_email', userEmail);
      form.append('description', uploadDescription.trim());
      form.append('file', uploadFile);
      const res = await fetch('http://127.0.0.1:8000/api/memory-box/upload', { method: 'POST', body: form });
      if (res.ok) {
        const saved = await res.json();
        setData((prev: any) => prev ? { ...prev, memory_box: [saved, ...prev.memory_box] } : prev);
        setUploadFile(null); setUploadPreview(null); setUploadDescription('');
      }
    } catch {} finally { setIsUploading(false); }
  };

  const handleDeletePhoto = async (photoId: string) => {
    const res = await fetch(`http://127.0.0.1:8000/api/memory-box/${photoId}?email=${encodeURIComponent(userEmail)}`, { method: 'DELETE' }).catch(() => null);
    if (res?.ok) {
      setData((prev: any) => prev ? { ...prev, memory_box: prev.memory_box.filter((p: any) => p.photo_id !== photoId) } : prev);
      if (lightboxPhoto?.photo_id === photoId) setLightboxPhoto(null);
    }
  };

  const fmt = (ts: string) => new Date(String(ts).replace(/-/g, '/')).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  const initials = (name: string) => name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

  if (!isCircleActive) {
    return (
      <div className="flex items-center justify-center p-6 mt-10">
        <div className="max-w-md w-full bg-[var(--nura-card)] border border-white/10 p-12 rounded-[3rem] text-center shadow-2xl">
          <Users size={48} className="text-[var(--nura-accent)] mx-auto mb-6" />
          <h2 className="text-3xl font-black mb-3 tracking-tight text-[var(--nura-text)]">Start Care Circle</h2>
          <p className="text-[var(--nura-dim)] text-sm mb-8">Invite family members to share photos and updates.</p>
          {initError && <p className="text-red-400 text-sm font-bold mb-4">{initError}</p>}
          <button onClick={handleInitialize} disabled={isInitializing} className="px-10 py-5 bg-[var(--nura-accent)] text-[var(--nura-bg)] rounded-2xl font-black shadow-2xl disabled:opacity-50">{isInitializing ? 'Starting...' : 'Initialize Circle'}</button>
        </div>
      </div>
    );
  }

  return (
    <>
      {lightboxPhoto && (
        <div className="fixed inset-0 z-[500] bg-black/90 backdrop-blur-xl flex flex-col items-center justify-center p-6" onClick={() => setLightboxPhoto(null)}>
          <button className="absolute top-6 right-6 p-2 bg-white/10 rounded-full"><X size={24} className="text-white" /></button>
          <img src={lightboxPhoto.url} alt="Memory" className="max-h-[75vh] max-w-full object-contain rounded-2xl shadow-2xl" onClick={e => e.stopPropagation()} />
          {lightboxPhoto.description && <p className="mt-4 text-white/80 text-center max-w-md text-sm">{lightboxPhoto.description}</p>}
          <p className="mt-2 text-white/40 text-xs">Uploaded by {lightboxPhoto.uploaded_by_name} · {fmt(lightboxPhoto.timestamp)}</p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-[340px_1fr] gap-6 mb-6">
        <div className="space-y-5">
          {/* Care Circle Roster */}
          <div className="bg-[var(--nura-card)] rounded-3xl border border-white/5 overflow-hidden">
            <div className="flex items-center gap-3 px-5 pt-5 pb-4 border-b border-white/5">
              <div className="w-9 h-9 rounded-xl bg-[var(--nura-accent)]/20 flex items-center justify-center"><Users size={18} className="text-[var(--nura-accent)]" /></div>
              <h2 className="font-black text-base text-[var(--nura-text)]">Care Circle</h2>
              <span className="ml-auto text-[10px] font-black text-[var(--nura-dim)] uppercase">{data?.caregivers.length} members</span>
            </div>
            <div className="divide-y divide-white/5">
              {(data?.caregivers ?? []).map((cg: any) => (
                <div key={cg.email} className="flex items-center gap-3 px-5 py-3.5">
                  <div className="w-10 h-10 rounded-full bg-[var(--nura-accent)]/20 flex items-center justify-center shrink-0">
                    <span className="text-sm font-black text-[var(--nura-accent)]">{initials(cg.full_name)}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-[var(--nura-text)] text-sm truncate">{cg.email === userEmail ? 'You' : cg.full_name}</p>
                    <p className="text-[10px] text-[var(--nura-dim)] truncate">{cg.email}</p>
                  </div>
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
                </div>
              ))}
            </div>
            {accessCode && (
              <div className="px-5 pb-5 pt-4 border-t border-white/5">
                <p className="text-[9px] font-black uppercase tracking-[0.15em] text-[var(--nura-dim)]/60 mb-2">Invite Supporters</p>
                <div className="flex items-center gap-2 bg-[var(--nura-bg)]/40 rounded-2xl px-4 py-3 border border-white/10">
                  <Shield size={13} className="text-[var(--nura-accent)] shrink-0" />
                  <span className="font-mono font-black text-[var(--nura-accent)] tracking-[0.25em] text-sm flex-1">{accessCode}</span>
                  <button onClick={handleCopyCode} className={`p-1.5 rounded-lg ${codeCopied ? 'text-emerald-400' : 'text-[var(--nura-dim)] hover:text-[var(--nura-text)]'}`}>
                    {codeCopied ? <Check size={14} /> : <Copy size={14} />}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Help Requests */}
          <div className="bg-[var(--nura-card)] rounded-3xl border border-white/5 overflow-hidden">
            <div className="flex items-center gap-3 px-5 pt-5 pb-4 border-b border-white/5">
              <div className="w-9 h-9 rounded-xl bg-amber-500/15 flex items-center justify-center"><ClipboardList size={18} className="text-amber-400" /></div>
              <h2 className="font-black text-base text-[var(--nura-text)]">Help Requests</h2>
            </div>
            <div className="p-4">
              <button onClick={() => setShowRequestModal(true)} className="w-full py-3 mb-3 bg-[var(--nura-bg)]/50 hover:bg-[var(--nura-accent)]/10 border border-dashed border-[var(--nura-accent)]/30 rounded-2xl flex items-center justify-center gap-2 text-[var(--nura-accent)] font-bold text-sm transition-all"><Plus size={16} />Post Request</button>
              {!data?.help_requests.length ? <p className="text-center text-xs text-[var(--nura-dim)]/50 py-4">No requests yet</p> : (
                <div className="space-y-2">
                  {data.help_requests.filter((r: any) => r.status !== 'done').map((req: any) => {
                    const sc = STATUS_CONFIG[req.status as keyof typeof STATUS_CONFIG];
                    const isAuthor = req.author_email === userEmail;
                    return (
                      <div key={req.request_id} className="bg-[var(--nura-bg)]/40 rounded-2xl border border-white/5 p-3.5">
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <p className="font-bold text-sm leading-tight text-[var(--nura-text)]">{req.title}</p>
                          <span className={`shrink-0 text-[9px] font-black uppercase px-2 py-0.5 rounded-full border ${sc.bg} ${sc.border} ${sc.color}`}>{sc.label}</span>
                        </div>
                        {req.description && <p className="text-[var(--nura-dim)] text-xs mb-2">{req.description}</p>}
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-[9px] text-[var(--nura-dim)]/50 font-bold">{isAuthor ? 'You' : req.author_name} · {fmt(req.timestamp)}</p>
                          <div className="flex gap-1.5">
                            {req.status === 'open' && !isAuthor && <button onClick={() => handleTaskAction('claim', req.request_id)} className="flex items-center gap-1 px-2 py-1 bg-[var(--nura-accent)]/15 text-[var(--nura-accent)] text-[9px] font-black uppercase rounded-lg border border-[var(--nura-accent)]/20"><UserCheck size={10} />Claim</button>}
                            {req.status === 'claimed' && (req.claimed_by === userEmail || isAuthor) && <button onClick={() => handleTaskAction('complete', req.request_id)} className="flex items-center gap-1 px-2 py-1 bg-emerald-500/15 text-emerald-400 text-[9px] font-black uppercase rounded-lg border border-emerald-500/20"><CheckCircle2 size={10} />Done</button>}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Shared Care Journal */}
        <div className="bg-[var(--nura-card)] rounded-3xl border border-white/5 flex flex-col overflow-hidden max-h-[800px]">
          <div className="flex items-center gap-3 px-6 pt-5 pb-4 border-b border-white/5 shrink-0">
            <div className="w-9 h-9 rounded-xl bg-[var(--nura-accent)]/20 flex items-center justify-center"><BookOpen size={18} className="text-[var(--nura-accent)]" /></div>
            <h2 className="font-black text-base text-[var(--nura-text)]">Shared Care Journal</h2>
          </div>
          <div className="px-6 py-4 border-b border-white/5 shrink-0 bg-[var(--nura-bg)]/20">
            <div className="flex gap-2 flex-wrap mb-3">
              {(Object.entries(JOURNAL_TYPES) as [keyof typeof JOURNAL_TYPES, any][]).map(([key, cfg]) => (
                <button key={key} onClick={() => setNewType(key)} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-black uppercase border ${newType === key ? `${cfg.bg} ${cfg.border} ${cfg.color}` : 'bg-white/5 border-white/10 text-[var(--nura-dim)]'}`}>
                  <cfg.icon size={11} />{cfg.label}
                </button>
              ))}
            </div>
            <div className="flex gap-3 items-end">
              <textarea value={newContent} onChange={e => setNewContent(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && e.metaKey) handlePostJournal(); }} placeholder="Post update..." rows={3} className="flex-1 bg-[var(--nura-bg)]/60 border border-white/10 focus:border-[var(--nura-accent)]/50 rounded-2xl p-4 text-sm resize-none focus:outline-none text-[var(--nura-text)]" />
              <button onClick={handlePostJournal} disabled={!newContent.trim() || isPosting} className="p-3.5 bg-[var(--nura-accent)] text-[var(--nura-bg)] rounded-2xl shadow-lg disabled:opacity-30"><Send size={18} /></button>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto px-6 py-4">
            {!data?.journal.length ? (
              <div className="flex flex-col items-center justify-center h-32 text-center text-[var(--nura-dim)]/40">
                <BookOpen size={28} className="mb-2 opacity-30" />
                <p className="text-sm font-bold">No entries yet.</p>
              </div>
            ) : (
              <div className="relative">
                <div className="absolute left-4 top-0 bottom-0 w-px bg-white/5" />
                <div className="space-y-4 pl-10">
                  {data.journal.map((post: any) => {
                    const cfg = JOURNAL_TYPES[post.type as keyof typeof JOURNAL_TYPES] || JOURNAL_TYPES.update;
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
                                <p className="font-bold text-[var(--nura-text)] text-sm">{post.author_name} {post.author_email === userEmail && <span className="ml-1 text-[9px] text-[var(--nura-accent)]/70">(you)</span>}</p>
                                <p className="text-[9px] text-[var(--nura-dim)]/50 font-bold"><Clock size={8} className="inline mr-1"/>{fmt(post.timestamp)}</p>
                              </div>
                            </div>
                            <div className={`flex items-center gap-1 px-2 py-0.5 rounded-full border text-[9px] font-black uppercase shrink-0 ${cfg.bg} ${cfg.border} ${cfg.color}`}><cfg.icon size={9} />{cfg.label}</div>
                          </div>
                          <p className="text-[var(--nura-text)]/80 text-sm">{post.content}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Memory Box */}
      <section>
        <div className="flex items-center gap-3 mb-5">
          <div className="w-8 h-8 rounded-xl bg-white/5 flex items-center justify-center"><ImageIcon size={16} className="text-purple-400" /></div>
          <h2 className="text-base font-black text-[var(--nura-text)] tracking-tight">Memory Box</h2>
          <div className="flex-1 h-px bg-white/5" />
        </div>
        
        <div className="bg-[var(--nura-card)] rounded-3xl border border-white/5 p-6 mb-5">
          <p className="text-[10px] font-black uppercase tracking-widest text-[var(--nura-dim)] mb-4">Add a Photo</p>
          <div onClick={() => fileInputRef.current?.click()} className="relative rounded-2xl border-2 border-dashed border-white/10 hover:border-purple-500/40 transition-all cursor-pointer overflow-hidden bg-[var(--nura-bg)]/40">
            {uploadPreview ? <img src={uploadPreview} alt="Preview" className="w-full max-h-56 object-cover" /> : <div className="flex flex-col items-center justify-center py-10 gap-3 text-[var(--nura-dim)]/40"><UploadCloud size={32} /><p className="text-sm font-bold">Select a photo</p></div>}
          </div>
          <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileSelect} className="hidden" />
          {uploadFile && (
            <div className="mt-4 space-y-3 flex gap-3 items-end">
              <input type="text" value={uploadDescription} onChange={e => setUploadDescription(e.target.value)} placeholder="Caption..." className="flex-1 bg-[var(--nura-bg)]/60 border border-white/10 rounded-2xl px-4 py-3 text-sm text-[var(--nura-text)] focus:outline-none" />
              <button onClick={() => { setUploadFile(null); setUploadPreview(null); }} className="px-6 py-3 rounded-2xl bg-white/5 font-bold text-sm text-[var(--nura-text)]">Cancel</button>
              <button onClick={handleUploadPhoto} disabled={isUploading} className="px-6 py-3 rounded-2xl bg-purple-500 text-white font-black text-sm">Upload</button>
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {data?.memory_box.map((photo: any) => (
            <div key={photo.photo_id} className="group relative rounded-3xl overflow-hidden bg-[var(--nura-card)] border border-white/5 aspect-square">
              <img src={photo.url} alt="Memory" className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/60 transition-all duration-300 flex flex-col items-center justify-center gap-3 opacity-0 group-hover:opacity-100">
                <button onClick={() => setLightboxPhoto(photo)} className="px-3 py-2 bg-white/20 backdrop-blur-sm rounded-xl text-white text-xs font-black"><Eye size={13} className="inline mr-1" />View</button>
                {photo.uploaded_by_email === userEmail && <button onClick={() => handleDeletePhoto(photo.photo_id)} className="px-3 py-2 bg-red-500/40 backdrop-blur-sm rounded-xl text-white text-xs font-black"><Trash2 size={13} className="inline mr-1" />Delete</button>}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Help Request Modal */}
      {showRequestModal && (
        <div className="fixed inset-0 z-[400] bg-black/70 backdrop-blur-xl flex items-center justify-center p-6">
          <div className="bg-[var(--nura-card)] border border-white/10 rounded-[2.5rem] p-8 w-full max-w-md shadow-2xl">
            <h2 className="text-xl font-black text-[var(--nura-text)] mb-6">Post Help Request</h2>
            <div className="space-y-4">
              <input type="text" value={newReqTitle} onChange={e => setNewReqTitle(e.target.value)} placeholder="Title" className="w-full bg-[var(--nura-bg)]/60 border border-white/10 rounded-2xl px-4 py-3.5 text-sm text-[var(--nura-text)] focus:outline-none" />
              <textarea value={newReqDesc} onChange={e => setNewReqDesc(e.target.value)} placeholder="Details..." rows={3} className="w-full bg-[var(--nura-bg)]/60 border border-white/10 rounded-2xl px-4 py-3.5 text-sm resize-none text-[var(--nura-text)] focus:outline-none" />
              <div className="flex gap-3 pt-2">
                <button onClick={() => setShowRequestModal(false)} className="flex-1 py-4 rounded-2xl bg-white/5 font-bold text-sm text-[var(--nura-text)]">Cancel</button>
                <button onClick={handleCreateRequest} disabled={!newReqTitle.trim() || isCreatingReq} className="flex-1 py-4 rounded-2xl bg-[var(--nura-accent)] font-black text-sm text-[var(--nura-bg)] disabled:opacity-50">Post</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};