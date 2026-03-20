import React, { useState, useEffect, useRef, useCallback } from 'react';
import type { PatientProfile, AppSettings } from '../types';
import { Mic, MicOff, Send, XCircle, ChevronRight, X } from 'lucide-react';
import { Avatar } from '../components/Avatar';

interface Message {
  sender: 'patient' | 'ai';
  text: string;
  timestamp: string;
  isAlert?: boolean;
}

interface MemoryPhoto {
  photo_id: string;
  url: string;
  description: string;
}

interface ChatViewProps {
  patient: PatientProfile;
  settings: AppSettings;
  durationMinutes: number;
  caregiverEmail: string;
  caregiverPassword: string;
  onBack: () => void;
  onLogout: () => void;
}

const SpeechRecognition =
  (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

const PHOTO_KEYWORDS = [
  'photo', 'photos', 'picture', 'pictures', 'image', 'images',
  'scrapbook', 'album', 'memories', 'memory box',
  'show me', 'can i see', 'i want to see', 'remember when',
  'do you have a photo', 'look at',
];

function mentionsPhotos(text: string): boolean {
  const lower = text.toLowerCase();
  return PHOTO_KEYWORDS.some(kw => lower.includes(kw));
}

// ── Relevance scoring ─────────────────────────────────────────────────────────
const STOPWORDS = new Set([
  "show","me","some","the","a","an","of","my","i","want","to","see","please",
  "can","you","have","any","photos","pictures","photo","picture","album","memories",
  "memory","look","at","do","with","and","or","but","in","on","for","is","are",
]);

function scorePhoto(photo: MemoryPhoto, query: string): number {
  if (!query) return 0;
  const queryWords = query.toLowerCase()
    .replace(/[^a-z0-9 ]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length >= 3 && !STOPWORDS.has(w));
  if (queryWords.length === 0) return 0;
  const haystack = (photo.description + ' ').toLowerCase();
  let score = 0;
  for (const word of queryWords) {
    if (haystack.includes(word)) score += word.length >= 6 ? 3 : word.length >= 4 ? 2 : 1;
  }
  return score;
}

function sortByRelevance(photos: MemoryPhoto[], query: string): MemoryPhoto[] {
  if (!query) return photos;
  return [...photos].sort((a, b) => scorePhoto(b, query) - scorePhoto(a, query));
}

// ── Pause tolerance map ───────────────────────────────────────────────────────
const PAUSE_TOLERANCE_MS: Record<string, number> = {
  short:  2000,
  medium: 5000,
  long:   10000,
};

// ── Scrapbook ─────────────────────────────────────────────────────────────────
const Scrapbook: React.FC<{
  patientId: string;
  caregiverEmail: string;
  promptText: string;
  onClose: () => void;
}> = ({ patientId, caregiverEmail, promptText, onClose }) => {
  const [photos, setPhotos]   = useState<MemoryPhoto[]>([]);
  const [loading, setLoading] = useState(true);
  const [index, setIndex]     = useState(0);
  const [animDir, setAnimDir] = useState<'in' | 'out'>('in');
  const [visible, setVisible] = useState(false);

  const photosRef  = useRef<MemoryPhoto[]>([]);
  const recRef     = useRef<any>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  const goNextRef  = useRef<() => void>(() => {});
  const closeRef   = useRef<() => void>(() => {});

  const goNext = useCallback(() => {
    if (photosRef.current.length === 0) return;
    setAnimDir('out');
    setTimeout(() => {
      setIndex(i => (i + 1) % photosRef.current.length);
      setAnimDir('in');
    }, 250);
  }, []);

  const handleClose = useCallback(() => {
    try { recRef.current?.stop(); } catch {}
    setVisible(false);
    setTimeout(() => onCloseRef.current(), 350);
  }, []);

  goNextRef.current = goNext;
  closeRef.current  = handleClose;

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(
          `http://127.0.0.1:8000/api/memory-box/${patientId}?email=${encodeURIComponent(caregiverEmail)}`
        );
        if (res.ok) {
          const fetched: MemoryPhoto[] = await res.json();
          const sorted = sortByRelevance(fetched, promptText);
          setPhotos(sorted);
          photosRef.current = sorted;
        }
      } catch {}
      setLoading(false);
      setTimeout(() => setVisible(true), 50);
    })();
  }, []);

  useEffect(() => {
    if (!SpeechRecognition) return;
    const rec = new SpeechRecognition();
    rec.continuous = true; rec.interimResults = false; rec.lang = 'en-US';
    recRef.current = rec;
    rec.onresult = (event: any) => {
      const spoken = event.results[event.results.length - 1][0].transcript.toLowerCase().trim();
      if (/\bnext\b/.test(spoken)) goNextRef.current();
      if (/\b(close|back|done|exit|stop|finish|return|chat)\b/.test(spoken)) closeRef.current();
    };
    rec.onend = () => { try { rec.start(); } catch {} };
    try { rec.start(); } catch {}
    return () => { try { rec.stop(); } catch {} };
  }, []);

  const photo = photos[index];

  return (
    <div className={`fixed inset-0 z-[200] flex flex-col items-center justify-center bg-black transition-opacity duration-300 ${visible ? 'opacity-100' : 'opacity-0'}`}>
      {loading ? (
        <div className="w-12 h-12 border-4 border-white/30 border-t-white rounded-full animate-spin" />
      ) : photos.length === 0 ? (
        <div className="flex flex-col items-center gap-6 text-center px-8">
          <p className="text-white/50 text-2xl font-bold">No photos yet.</p>
          <p className="text-white/30 text-lg">Caregivers can add memories from the Care Center.</p>
          <button onClick={handleClose} className="mt-4 w-20 h-20 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-all active:scale-95">
            <X size={36} className="text-white" />
          </button>
        </div>
      ) : (
        <>
          <button onClick={handleClose}
            className="absolute top-6 left-6 z-10 w-20 h-20 rounded-full bg-white/15 hover:bg-white/30 flex items-center justify-center transition-all active:scale-90 shadow-2xl">
            <X size={42} className="text-white" strokeWidth={2.5} />
          </button>
          <p className="absolute top-10 right-8 text-white/40 text-xl font-black tabular-nums">{index + 1} / {photos.length}</p>
          <p className="absolute top-10 left-1/2 -translate-x-1/2 text-white/50 text-sm md:text-base font-black uppercase tracking-widest whitespace-nowrap select-none">
            Say <span className="text-white">"Next"</span> to see more &nbsp;·&nbsp; <span className="text-white">"Close"</span> to return to chat
          </p>
          <div key={index}
            className={`flex flex-col items-center px-6 transition-all duration-200 ${animDir === 'in' ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-8'}`}
            style={{ maxWidth: '90vw', maxHeight: '80vh' }}>
            {promptText && scorePhoto(photo, promptText) > 0 && (
              <p className="mb-3 text-xs font-black uppercase tracking-widest text-white/30">matched your request</p>
            )}
            <img src={photo.url} alt={photo.description || 'Memory'}
              className="rounded-3xl shadow-2xl object-contain" style={{ maxHeight: '60vh', maxWidth: '85vw' }} />
            {photo.description && (
              <p className="mt-6 text-white text-2xl md:text-3xl font-bold text-center leading-snug max-w-xl">{photo.description}</p>
            )}
          </div>
          {photos.length > 1 && (
            <button onClick={goNext}
              className="absolute bottom-10 right-8 w-28 h-28 rounded-full bg-white/15 hover:bg-white/30 flex items-center justify-center transition-all active:scale-90 shadow-2xl">
              <ChevronRight size={64} className="text-white" strokeWidth={2.5} />
            </button>
          )}
        </>
      )}
    </div>
  );
};

// ── Main ChatView ─────────────────────────────────────────────────────────────
export const ChatView: React.FC<ChatViewProps> = ({
  patient, settings, durationMinutes, caregiverEmail, caregiverPassword, onBack, onLogout,
}) => {
  if (!patient) return null;

  const p = patient as any;

  // ── Listening profile settings ─────────────────────────────────────────────
  const pauseToleranceKey: string = p.pauseTolerance || p.pause_tolerance || 'medium';
  const pauseMs:     number  = PAUSE_TOLERANCE_MS[pauseToleranceKey] ?? 5000;
  const softSpoken:  boolean = p.softSpokenMode  ?? p.soft_spoken_mode  ?? false;
  const interactiveMode: boolean = p.interactiveMode ?? p.interactive_mode ?? true;

  // ── State ──────────────────────────────────────────────────────────────────
  const [messages, setMessages]                   = useState<Message[]>([]);
  const [currentTranscript, setCurrentTranscript] = useState('');
  const [inputText, setInputText]                 = useState('');
  const [isListening, setIsListening]             = useState(false);
  const [isAiTyping, setIsAiTyping]               = useState(false);
  const [showExitConfirm, setShowExitConfirm]     = useState(false);
  const [llmStatus, setLlmStatus]                 = useState<'loading' | 'ready' | 'offline' | 'error'>('loading');
  const [showScrapbook, setShowScrapbook]         = useState(false);
  const [photoPromptText, setPhotoPromptText]     = useState('');

  // ── Interactive mode audio state ───────────────────────────────────────────
  // soundLevel: 0–100, driven by AudioContext analyser
  const [soundLevel, setSoundLevel] = useState(0);

  // ── Refs ───────────────────────────────────────────────────────────────────
  const recognitionRef    = useRef<any>(null);
  const silenceTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const messagesRef       = useRef<Message[]>([]);
  const messagesEndRef    = useRef<HTMLDivElement>(null);
  const alertFiredRef     = useRef(false);
  const sendingRef        = useRef(false);
  const closeScrapbookRef = useRef<() => void>(() => {});
  const audioCtxRef       = useRef<AudioContext | null>(null);
  const animFrameRef      = useRef<number | null>(null);
  const streamRef         = useRef<MediaStream | null>(null);

  const closeScrapbook = useCallback(() => setShowScrapbook(false), []);
  closeScrapbookRef.current = closeScrapbook;

  const patientId   = p.patient_id || p.id;
  const patientName = patient.name || p.full_name || 'Friend';
  const rawTopics   = patient.safeTopics || p.approved_topics || [];
  const topics: string[] = Array.isArray(rawTopics)
    ? rawTopics.map((t: any) => (typeof t === 'string' ? t.trim() : '')).filter((t: string) => t.length > 1 && isNaN(Number(t)))
    : [];

  // ── Scroll on message change ───────────────────────────────────────────────
  useEffect(() => {
    messagesRef.current = messages;
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, currentTranscript, isAiTyping]);

  // ── LLM warmup & status ────────────────────────────────────────────────────
  useEffect(() => { fetch('http://127.0.0.1:8000/llm/warmup').catch(() => {}); }, []);

  useEffect(() => {
    if (llmStatus === 'ready') return;
    const check = async () => {
      try {
        const res = await fetch('http://127.0.0.1:8000/llm/status');
        if (!res.ok) { setLlmStatus('offline'); return; }
        const { status } = await res.json();
        if (status === 'ready')      setLlmStatus('ready');
        else if (status === 'error') setLlmStatus('error');
        else                         setLlmStatus('loading');
      } catch { setLlmStatus('offline'); }
    };
    check();
    const id = setInterval(check, 5_000);
    return () => clearInterval(id);
  }, [llmStatus]);

  // ── Session timer ──────────────────────────────────────────────────────────
  useEffect(() => {
    const id = setTimeout(() => handleFinalExit('completed'), durationMinutes * 60 * 1000);
    return () => clearTimeout(id);
  }, [durationMinutes]);

  // ── Speech recognition setup (created once) ────────────────────────────────
  useEffect(() => {
    if (!SpeechRecognition) return;
    const rec = new SpeechRecognition();
    rec.continuous     = true;
    rec.interimResults = true;
    rec.lang           = 'en-US';
    recognitionRef.current = rec;

    rec.onresult = (event: any) => {
      let transcript = '';
      for (let i = event.resultIndex; i < event.results.length; ++i)
        transcript += event.results[i][0].transcript;
      setCurrentTranscript(transcript);
      if (silenceTimeoutRef.current) clearTimeout(silenceTimeoutRef.current);
      // Use the per-patient pause tolerance instead of hardcoded 4000ms
      silenceTimeoutRef.current = setTimeout(() => {
        if (transcript.trim()) handleSendMessage(transcript);
      }, pauseMs);
    };
    rec.onstart = () => setIsListening(true);
    rec.onend   = () => setIsListening(false);

    return () => {
      try { rec.stop(); } catch {}
      recognitionRef.current = null;
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  // ^ pauseMs intentionally not in deps — keep recognition stable, timeout
  //   value is captured fresh each onresult call via closure over pauseMs

  // ── Pause/resume mic when scrapbook opens ─────────────────────────────────
  useEffect(() => {
    const rec = recognitionRef.current;
    if (!rec) return;
    if (showScrapbook) { try { rec.stop(); } catch {} }
  }, [showScrapbook]);

  // ── Interactive mode + Soft Spoken: AudioContext analyser ──────────────────
  // Started when mic is active, torn down when mic stops or scrapbook opens.
  useEffect(() => {
    if (!isListening || showScrapbook) {
      // Tear down audio context
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      audioCtxRef.current?.close().catch(() => {});
      audioCtxRef.current = null;
      streamRef.current?.getTracks().forEach(t => t.stop());
      streamRef.current = null;
      setSoundLevel(0);
      return;
    }

    // Only spin up AudioContext if at least one feature needs it
    if (!interactiveMode && !softSpoken) return;

    let cancelled = false;

    (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
        if (cancelled) { stream.getTracks().forEach(t => t.stop()); return; }

        streamRef.current = stream;
        const ctx = new AudioContext();
        audioCtxRef.current = ctx;

        const source   = ctx.createMediaStreamSource(stream);
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 512;
        analyser.smoothingTimeConstant = 0.75;

        if (softSpoken) {
          // Boost quiet voices so the analyser detects them reliably
          const gain = ctx.createGain();
          gain.gain.value = 3.5;
          source.connect(gain);
          gain.connect(analyser);
        } else {
          source.connect(analyser);
        }

        if (interactiveMode) {
          const data = new Uint8Array(analyser.frequencyBinCount);
          const tick = () => {
            if (cancelled) return;
            analyser.getByteFrequencyData(data);
            // Average of frequency bins, scaled to 0-100
            const avg = data.reduce((a, b) => a + b, 0) / data.length;
            setSoundLevel(Math.min(100, avg * 2.8));
            animFrameRef.current = requestAnimationFrame(tick);
          };
          tick();
        }
      } catch {
        // Mic permission denied or unavailable — silent fallback
      }
    })();

    return () => {
      cancelled = true;
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      audioCtxRef.current?.close().catch(() => {});
      audioCtxRef.current = null;
      streamRef.current?.getTracks().forEach(t => t.stop());
      streamRef.current = null;
      setSoundLevel(0);
    };
  }, [isListening, showScrapbook, interactiveMode, softSpoken]);

  // ── Helpers ────────────────────────────────────────────────────────────────
  const toggleListening = () => {
    if (!recognitionRef.current) return;
    if (isListening) {
      recognitionRef.current.stop();
      if (silenceTimeoutRef.current) clearTimeout(silenceTimeoutRef.current);
      if (currentTranscript.trim()) handleSendMessage(currentTranscript);
    } else {
      setCurrentTranscript('');
      try { recognitionRef.current.start(); } catch (e) {
        console.warn('Mic start failed:', e);
      }
    }
  };

  const handleFinalExit = async (end_reason: 'completed' | 'early' = 'completed') => {
    try { recognitionRef.current?.stop(); } catch {}
    try {
      await fetch('http://127.0.0.1:8000/chat/save-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: caregiverEmail.toLowerCase().trim(), password: caregiverPassword,
          patient_id: patientId, full_name: patient.name || p.full_name,
          messages: messagesRef.current, end_reason, had_alert: alertFiredRef.current,
        }),
      });
    } catch {}
    onLogout();
  };

  const buildHistory = (current: Message[]) =>
    current.slice(-10).map(m => ({ role: m.sender === 'patient' ? 'user' : 'assistant', content: m.text }));

  const detectTier = (text: string): 1 | 2 | 3 => {
    const lower = text.toLowerCase();
    const t3 = ["i fell","i've fallen","i can't move","chest hurts","chest pain","can't breathe","there's a fire","i smell smoke","kill myself","want to die","end my life","suicide","too many pills","overdose","i'm bleeding","not breathing","call 911","call an ambulance"];
    const t2 = ["scared","afraid","anxious","panic","frustrated","angry","upset","lonely","alone","nobody cares","burden","better off without me","crying","miserable","worried"];
    if (t3.some(kw => lower.includes(kw))) return 3;
    if (t2.some(kw => lower.includes(kw))) return 2;
    return 1;
  };

  const handleSendMessage = useCallback(async (text?: string) => {
    const val = (text ?? inputText).trim();
    if (!val || sendingRef.current) return;
    sendingRef.current = true;

    const patientMsg: Message = { sender: 'patient', text: val, timestamp: new Date().toISOString() };
    setMessages(prev => { const u = [...prev, patientMsg]; messagesRef.current = u; return u; });
    setInputText('');
    setCurrentTranscript('');
    setIsAiTyping(true);

    const wantsPhotos = mentionsPhotos(val);

    try {
      const res = await fetch('http://127.0.0.1:8000/chat/respond', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patient_id: patientId, user_input: val,
          chat_history: buildHistory(messagesRef.current), detected_tier: detectTier(val),
        }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (data.ui_signal === 'ALERT') alertFiredRef.current = true;
      setMessages(prev => [...prev, {
        sender: 'ai', text: data.response_text,
        timestamp: new Date().toISOString(), isAlert: data.ui_signal === 'ALERT',
      }]);
      if (wantsPhotos) { setPhotoPromptText(val); setShowScrapbook(true); }
    } catch {
      setMessages(prev => [...prev, { sender: 'ai', text: getRuleBasedResponse(val), timestamp: new Date().toISOString() }]);
      if (wantsPhotos) { setPhotoPromptText(val); setShowScrapbook(true); }
    } finally {
      setIsAiTyping(false);
      setTimeout(() => { sendingRef.current = false; }, 300);
    }
  }, [inputText, patientId]);

  const fallbackCounterRef = useRef<Record<string, number>>({ confused: 0, distressed: 0, general: 0 });
  const RULE_BASED: Record<string, string[]> = {
    confused:   [`That's completely okay, ${patientName}. You're safe here with me.`, `It's alright not to remember — I'm right here with you.`, `Don't worry about that for now. You're safe.`],
    distressed: [`I hear you, ${patientName}, and what you're feeling really matters.`, `That sounds really hard. Take a slow breath — I'm right here.`, `You're not alone in this, ${patientName}. I'm listening.`],
    general:    [`That's really interesting — tell me more, ${patientName}.`, `I love talking with you. What else is on your mind?`, `Thank you for sharing that with me, ${patientName}.`, topics.length > 0 ? `Do you have a favourite memory of ${topics[0].toLowerCase()}?` : `You're doing wonderfully.`],
  };
  const getRuleBasedResponse = (userText: string): string => {
    const lower  = userText.toLowerCase();
    const bucket = /don't know|confused|lost|where am i|forgot/.test(lower) ? 'confused'
      : /scared|lonely|cry|hurt|frustrated|alone|worried/.test(lower) ? 'distressed' : 'general';
    const pool = RULE_BASED[bucket];
    const idx  = fallbackCounterRef.current[bucket] % pool.length;
    fallbackCounterRef.current[bucket] += 1;
    return pool[idx];
  };

  const msgSize = () => settings.fontSize === 'small' ? 'text-xl md:text-2xl' : settings.fontSize === 'large' ? 'text-4xl md:text-5xl leading-tight' : 'text-2xl md:text-3xl';
  const hdrSize = () => settings.fontSize === 'small' ? 'text-4xl md:text-6xl' : settings.fontSize === 'large' ? 'text-6xl md:text-8xl' : 'text-5xl md:text-7xl';

  // ── Interactive mode visual helpers ────────────────────────────────────────
  // isSounding: true when voice energy is above idle threshold
  const isSounding = interactiveMode && isListening && soundLevel > 12;
  // intensity: 0-1 normalised above the detection threshold
  const intensity  = isSounding ? Math.min(1, (soundLevel - 12) / 60) : 0;

  // Glow ring colour transitions: quiet → indigo, medium → violet, loud → purple
  const ringOpacity  = isSounding ? 0.25 + intensity * 0.55 : 0;
  const ringBlur     = isSounding ? 40 + intensity * 60 : 30;
  const ringScale    = (!settings.reducedMotion && isSounding) ? 1 + intensity * 0.18 : 1;
  const borderOpacity = isSounding ? 0.5 + intensity * 0.5 : isListening ? 0.15 : 0;

  // Avatar emotion: talking when voice detected, happy when AI is responding
  const avatarEmotion = isAiTyping ? 'happy' : isSounding ? 'talking' : 'neutral';

  return (
    <div className="w-full h-screen h-[100dvh] flex flex-col bg-[var(--nura-bg)] text-[var(--nura-text)] overflow-hidden fixed inset-0 z-[100] pointer-events-auto">

      {/* ── SCRAPBOOK ── */}
      {showScrapbook && (
        <Scrapbook patientId={patientId} caregiverEmail={caregiverEmail}
          promptText={photoPromptText} onClose={closeScrapbook} />
      )}

      {/* ── EXIT MODAL ── */}
      {showExitConfirm && (
        <div className="fixed inset-0 z-[110] bg-black/60 backdrop-blur-md flex items-center justify-center p-6 text-center">
          <div className="bg-[var(--nura-bg)] border border-white/10 p-10 rounded-[2.5rem] max-w-sm w-full shadow-2xl">
            <XCircle size={64} className="text-red-400 mx-auto mb-6" />
            <h2 className="text-3xl font-black mb-6">End Session?</h2>
            <div className="flex gap-4">
              <button onClick={() => setShowExitConfirm(false)} className="flex-1 py-4 rounded-2xl bg-[var(--nura-card)] font-bold">No</button>
              <button onClick={() => handleFinalExit('early')} className="flex-1 py-4 rounded-2xl bg-red-500 font-bold text-white">Yes, End</button>
            </div>
          </div>
        </div>
      )}

      {/* ── HEADER ── */}
      <header className="p-6 flex justify-between items-center shrink-0">
        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-black uppercase tracking-widest border ${
          llmStatus === 'ready'   ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
          : llmStatus === 'offline' || llmStatus === 'error' ? 'bg-red-500/10 border-red-500/30 text-red-400'
          : 'bg-amber-500/10 border-amber-500/30 text-amber-400'
        }`}>
          <span className={`w-1.5 h-1.5 rounded-full ${
            llmStatus === 'ready' ? 'bg-emerald-400'
            : llmStatus === 'offline' || llmStatus === 'error' ? 'bg-red-400'
            : 'bg-amber-400 animate-pulse'
          }`} />
          {llmStatus === 'ready' ? 'AI Ready' : llmStatus === 'offline' ? 'AI Offline' : llmStatus === 'error' ? 'AI Error' : 'AI Loading…'}
        </div>
        <button onClick={() => setShowExitConfirm(true)}
          className="px-8 py-3 bg-red-500 hover:bg-red-600 text-white rounded-full font-black text-xs uppercase tracking-widest transition-all active:scale-95">
          End Session
        </button>
      </header>

      {/* ── BODY ── */}
      <div className="flex-1 flex flex-col md:flex-row w-full max-w-7xl mx-auto px-8 gap-8 items-center overflow-hidden">

        {/* Chat Side */}
        <div className="flex-1 flex flex-col h-full justify-center min-h-0">
          <div className={`transition-all duration-700 ${messages.length === 0 ? 'py-10' : 'pb-4'}`}>
            <h1 className={`${hdrSize()} font-black tracking-tighter leading-[0.9] drop-shadow-2xl`}>
              How are you,<br />{patientName}?
            </h1>
          </div>

          <div className={`flex-1 overflow-y-auto flex flex-col gap-5 scrollbar-hide pr-2 ${messages.length === 0 && !currentTranscript ? 'opacity-0' : 'opacity-100'}`}>
            {messages.map((msg, i) => (
              <div key={i} className={`${msgSize()} font-bold tracking-tight ${
                msg.sender === 'patient' ? 'text-[var(--nura-text)]/80 text-right' : 'text-[var(--nura-dim)] text-left'
              }`}>
                {msg.text}
              </div>
            ))}
            {currentTranscript && (
              <div className={`${msgSize()} text-[var(--nura-text)]/30 italic text-right animate-pulse`}>{currentTranscript}</div>
            )}
            {isAiTyping && (
              <div className="flex gap-2 py-4">
                {[0, 150, 300].map(d => <span key={d} className="w-3 h-3 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: `${d}ms` }} />)}
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Avatar Side */}
        <div className="w-full md:w-2/5 flex flex-col items-center justify-center shrink-0 py-6">

          {/* ── Avatar with interactive glow ring ── */}
          <div className="relative mb-8 flex items-center justify-center">

            {/* Outer diffuse glow — colour-only in reduced motion, also scales otherwise */}
            <div
              className="absolute inset-0 rounded-full pointer-events-none"
              style={{
                background: `radial-gradient(circle, rgba(99,102,241,${ringOpacity}) 0%, rgba(139,92,246,${ringOpacity * 0.6}) 45%, transparent 75%)`,
                filter:    `blur(${ringBlur}px)`,
                transform: `scale(${ringScale})`,
                transition: settings.reducedMotion
                  ? 'background 0.15s, opacity 0.15s'
                  : 'background 0.06s, filter 0.06s, transform 0.06s',
              }}
            />

            {/* Sharp border ring — always colour-only (safe for reduced motion) */}
            <div
              className="absolute inset-[-10px] rounded-full pointer-events-none"
              style={{
                border:       `3px solid rgba(99,102,241,${borderOpacity})`,
                boxShadow:    borderOpacity > 0
                  ? `0 0 ${14 + intensity * 20}px rgba(99,102,241,${borderOpacity * 0.7}), inset 0 0 ${8 + intensity * 12}px rgba(139,92,246,${borderOpacity * 0.3})`
                  : 'none',
                transition:   'border-color 0.08s, box-shadow 0.08s',
              }}
            />

            {/* Avatar — scale only when reduced motion is OFF */}
            <div
              className="relative z-10"
              style={{
                transform: !settings.reducedMotion
                  ? `scale(${isAiTyping || isListening ? (isSounding ? 1.05 + intensity * 0.08 : 1.1) : 1})`
                  : undefined,
                transition: !settings.reducedMotion ? 'transform 0.08s' : undefined,
              }}
            >
              <Avatar
                size="2xl"
                type={patient.avatarType}
                emotion={avatarEmotion}
                reducedMotion={settings.reducedMotion}
              />
            </div>

            {/* Soft Spoken indicator badge */}
            {softSpoken && isListening && (
              <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 flex items-center gap-1 px-3 py-1 bg-amber-500/20 border border-amber-500/30 rounded-full backdrop-blur-sm z-20">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                <span className="text-[9px] font-black uppercase tracking-widest text-amber-400">Soft Spoken</span>
              </div>
            )}
          </div>

          {/* Mic button */}
          <button
            onClick={toggleListening}
            className={`px-10 py-6 rounded-full flex items-center justify-center gap-4 border-2 transition-all w-full max-w-sm shadow-2xl active:scale-95 ${
              isListening
                ? 'bg-red-500 border-red-400'
                : 'bg-[var(--nura-accent)] border-[var(--nura-accent)] hover:bg-[var(--nura-accent)]/80'
            }`}
          >
            {isListening
              ? <><MicOff size={32} className="text-white" /><span className="text-xl font-black text-white">FINISH TALKING</span></>
              : <><Mic size={32} className="text-[var(--nura-bg)]" /><span className="text-xl font-black uppercase tracking-tight text-[var(--nura-bg)]">Click me to speak</span></>
            }
          </button>

          {/* Pause tolerance indicator (subtle, for caregiver reference) */}
          <p className="mt-3 text-[9px] font-bold uppercase tracking-widest text-[var(--nura-text)]/20">
            {pauseToleranceKey === 'short' ? '⚡ Quick response' : pauseToleranceKey === 'long' ? '🐢 Extended pause' : ''}
          </p>
        </div>
      </div>

      {/* ── FOOTER ── */}
      <div className="w-full max-w-5xl mx-auto p-8 shrink-0 bg-gradient-to-t from-[var(--nura-bg)] via-[var(--nura-bg)]/80 to-transparent">
        <div className="flex flex-col gap-4">
          <p className="text-[10px] text-[var(--nura-text)]/40 font-black uppercase tracking-widest ml-2">Or type your message:</p>
          {topics.length > 0 && (
            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
              {topics.map((topic, idx) => (
                <button key={idx} onClick={() => handleSendMessage(`Let's talk about ${topic.toLowerCase()}`)}
                  className="whitespace-nowrap px-5 py-2.5 rounded-full bg-[var(--nura-card)] hover:bg-[var(--nura-accent)]/20 text-[var(--nura-text)]/90 border border-[var(--nura-text)]/10 transition-all font-bold text-sm">
                  Let's talk about {topic}
                </button>
              ))}
            </div>
          )}
          <div className="flex items-center gap-4 bg-[var(--nura-card)] p-2 rounded-full border border-white/10 backdrop-blur-xl">
            <input type="text" value={inputText}
              onChange={e => setInputText(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && !isAiTyping && handleSendMessage()}
              placeholder="Type here..."
              className={`flex-1 bg-transparent px-6 py-3 text-[var(--nura-text)] focus:outline-none font-medium ${settings.fontSize === 'large' ? 'text-2xl' : 'text-lg'}`}
            />
            <button onClick={() => handleSendMessage()} disabled={!inputText.trim() || isAiTyping}
              className={`p-3 rounded-full transition-all ${inputText.trim() && !isAiTyping ? 'bg-[var(--nura-accent)] text-[var(--nura-text)]' : 'text-[var(--nura-text)]/20'}`}>
              <Send size={24} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
