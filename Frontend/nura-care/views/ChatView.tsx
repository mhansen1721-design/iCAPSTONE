import React, { useState, useEffect, useRef } from 'react';
import type { PatientProfile, AppSettings } from '../types';
import { ChevronLeft, Mic, MicOff, Send, XCircle } from 'lucide-react';
import { Avatar } from '../components/Avatar';

// Internal message structure for backend consistency
interface Message {
  sender: 'patient' | 'ai';
  text: string;
  timestamp: string;
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

const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

export const ChatView: React.FC<ChatViewProps> = ({ 
  patient, 
  settings,
  durationMinutes, 
  caregiverEmail, 
  caregiverPassword, 
  onBack, 
  onLogout 
}) => {
  if (!patient) return null;

  const [messages, setMessages] = useState<Message[]>([]);
  const [currentTranscript, setCurrentTranscript] = useState('');
  const [inputText, setInputText] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [isAiTyping, setIsAiTyping] = useState(false);
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const [llmStatus, setLlmStatus] = useState<'loading' | 'ready' | 'offline'>('loading');

  // Alert state — set when LLM returns ui_signal "ALERT"
  const [emergencyAlert, setEmergencyAlert] = useState<string | null>(null);
  
  const recognitionRef = useRef<any>(null);
  const silenceTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const messagesRef = useRef<Message[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Keep messagesRef current for the save-session payload
  useEffect(() => {
    messagesRef.current = messages;
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, currentTranscript, isAiTyping]);

  // Warm-up ping — triggers model loading on the server immediately
  useEffect(() => {
    const warmUp = async () => {
      try {
        const res = await fetch('http://127.0.0.1:8000/chat/respond', {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            patient_id:   patient.patient_id || (patient as any).id || 'warmup',
            user_input:   'hello',
            chat_history: [],
          }),
        });
        if (res.ok) {
          const data = await res.json();
          // If we got a real LLM response (not a template fallback), mark as ready
          // Template fallbacks contain "I'm right here" or similar fixed phrases
          const isTemplate = !data.response_text || data.log_entry?.includes('fallback') || data.log_entry?.includes('error');
          setLlmStatus(isTemplate ? 'loading' : 'ready');
        } else {
          setLlmStatus('offline');
        }
      } catch {
        setLlmStatus('offline');
      }
    };
    warmUp();
    // Re-check every 30s until LLM is ready
    const interval = setInterval(async () => {
      if (llmStatus === 'ready') { clearInterval(interval); return; }
      await warmUp();
    }, 30_000);
    return () => clearInterval(interval);
  }, []);

  // Session timer — fires handleFinalExit with "completed" when clock runs out
  useEffect(() => {
    const timer = setTimeout(() => handleFinalExit('completed'), durationMinutes * 60 * 1000);
    return () => clearTimeout(timer);
  }, [durationMinutes]);

  // Speech Recognition setup
  useEffect(() => {
    if (SpeechRecognition) {
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = true;
      recognitionRef.current.lang = 'en-US';

      recognitionRef.current.onresult = (event: any) => {
        let transcript = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          transcript += event.results[i][0].transcript;
        }
        setCurrentTranscript(transcript);
        if (silenceTimeoutRef.current) clearTimeout(silenceTimeoutRef.current);
        silenceTimeoutRef.current = setTimeout(() => {
          if (transcript.trim()) handleSendMessage(transcript);
        }, 4000);
      };

      recognitionRef.current.onstart = () => setIsListening(true);
      recognitionRef.current.onend   = () => setIsListening(false);
    }
    return () => recognitionRef.current?.stop();
  }, []);

  const toggleListening = () => {
    if (!recognitionRef.current) return;
    if (isListening) {
      recognitionRef.current.stop();
      if (currentTranscript.trim()) handleSendMessage(currentTranscript);
    } else {
      setCurrentTranscript('');
      try { recognitionRef.current.start(); } catch (e) {}
    }
  };

  const handleFinalExit = async (end_reason: 'completed' | 'early' = 'completed') => {
    if (recognitionRef.current) recognitionRef.current.stop();

    const payload = {
      email:      caregiverEmail.toLowerCase().trim(),
      password:   caregiverPassword,
      patient_id: patient.patient_id || (patient as any).id,
      full_name:  patient.full_name || patient.name,
      messages:   messagesRef.current,
      end_reason,
    };

    try {
      await fetch('http://127.0.0.1:8000/chat/save-session', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(payload),
      });
    } catch (e) { console.error('Save failed', e); }

    onLogout();
  };

  /**
   * Build a compact chat history for the LLM payload (last 10 turns).
   * Maps our internal Message[] format to {role, content} dicts.
   */
  const buildHistoryPayload = (current: Message[]) =>
    current.slice(-10).map(m => ({
      role:    m.sender === 'patient' ? 'user' : 'assistant',
      content: m.text,
    }));

  const handleSendMessage = async (text?: string) => {
    const val = (text || inputText).trim();
    if (!val) return;

    const patientMsg: Message = {
      sender:    'patient',
      text:      val,
      timestamp: new Date().toISOString(),
    };

    // Optimistically add patient message
    setMessages(prev => {
      const updated = [...prev, patientMsg];
      messagesRef.current = updated;
      return updated;
    });

    setInputText('');
    setCurrentTranscript('');
    setIsAiTyping(true);

    try {
      const res = await fetch('http://127.0.0.1:8000/chat/respond', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patient_id:   patient.patient_id || (patient as any).id,
          user_input:   val,
          chat_history: buildHistoryPayload(messagesRef.current),
        }),
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const data = await res.json();
      const { response_text, ui_signal } = data;

      // Add AI reply to conversation
      setMessages(prev => [
        ...prev,
        { sender: 'ai', text: response_text, timestamp: new Date().toISOString() },
      ]);

      // Handle ui_signal
      if (ui_signal === 'ALERT') {
        setEmergencyAlert(
          '🚨 Emergency detected — please check on your loved one immediately!'
        );
      }
      // REDIRECT is handled purely by the LLM weaving in safe topics naturally
      // (no extra UI action needed beyond the spoken response)

    } catch (err) {
      console.error('[ChatView] /chat/respond error:', err);
      setMessages(prev => [
        ...prev,
        {
          sender:    'ai',
          text:      getRuleBasedResponse(val),
          timestamp: new Date().toISOString(),
        },
      ]);
    } finally {
      setIsAiTyping(false);
    }
  };

  // ── Safe patient name ──────────────────────────────────────────────────
  const patientName = patient.name || (patient as any).full_name || 'Friend';

  // ── Safe topics: must be real words, not numbers or empty strings ──────
  const rawTopics = patient.safeTopics || (patient as any).approved_topics || [];
  const topics: string[] = Array.isArray(rawTopics)
    ? rawTopics
        .map((t: any) => (typeof t === 'string' ? t : ''))
        .map((t: string) => t.trim())
        .filter((t: string) => t.length > 1 && isNaN(Number(t)))  // reject "" and "2" etc.
    : [];

  // ── Rule-based responses used while LLM model is loading ─────────────
  // These rotate so the patient never hears the same line twice
  const RULE_BASED: Record<string, string[]> = {
    confused: [
      `That's completely okay, ${patientName}. You're safe here with me.`,
      `It's alright not to remember everything — I'm right here with you.`,
      `Don't worry about that for now. You're safe, and I'm not going anywhere.`,
    ],
    distressed: [
      `I hear you, ${patientName}, and what you're feeling really matters.`,
      `That sounds really hard. Take a slow breath — I'm right here with you.`,
      `You're not alone in this, ${patientName}. I'm listening.`,
    ],
    general: [
      `That's really interesting — tell me more, ${patientName}.`,
      `I love talking with you. What else is on your mind?`,
      `Thank you for sharing that with me. How does that make you feel?`,
      topics.length > 0
        ? `Speaking of good things — do you have a favourite memory of ${topics[0].toLowerCase()}?`
        : `You're doing wonderfully. I enjoy our time together.`,
      `I'm all ears, ${patientName}. Go on whenever you're ready.`,
    ],
  };

  const fallbackCounterRef = useRef<Record<string, number>>({ confused: 0, distressed: 0, general: 0 });

  const getRuleBasedResponse = (userText: string): string => {
    const lower = userText.toLowerCase();
    const isConfused = /don't know|confused|lost|where am i|what is this|who are you|what year|forgot/.test(lower);
    const isDistressed = /scared|lonely|cry|hurt|frustrated|alone|angry|worried|miserable|burden/.test(lower);

    let bucket: 'confused' | 'distressed' | 'general' = 'general';
    if (isConfused) bucket = 'confused';
    else if (isDistressed) bucket = 'distressed';

    const pool = RULE_BASED[bucket];
    const idx = fallbackCounterRef.current[bucket] % pool.length;
    fallbackCounterRef.current[bucket] += 1;
    return pool[idx];
  };

  // ── Font size helpers ────────────────────────────────────────────────────
  const getMessageSizeClass = () => {
    switch (settings.fontSize) {
      case 'small': return 'text-xl md:text-2xl';
      case 'large': return 'text-4xl md:text-5xl leading-tight';
      default:      return 'text-2xl md:text-3xl';
    }
  };

  const getHeaderSizeClass = () => {
    switch (settings.fontSize) {
      case 'small': return 'text-4xl md:text-6xl';
      case 'large': return 'text-6xl md:text-8xl';
      default:      return 'text-5xl md:text-7xl';
    }
  };

  return (
<div className="w-full h-screen h-[100dvh] flex flex-col bg-[var(--nura-bg)] text-[var(--nura-text)] overflow-hidden fixed inset-0 z-[100] pointer-events-auto">        
      {/* ── EMERGENCY ALERT BANNER ── */}
      {emergencyAlert && (
        <div className="fixed top-0 left-0 right-0 z-[200] bg-red-600 text-white px-6 py-4 flex items-center justify-between shadow-2xl animate-in slide-in-from-top duration-300">
          <div className="flex items-center gap-3">
            <span className="text-2xl animate-pulse">🚨</span>
            <div>
              <p className="font-black text-base tracking-tight">Emergency Detected</p>
              <p className="text-sm text-red-100 font-medium">{emergencyAlert}</p>
            </div>
          </div>
          <button
            onClick={() => setEmergencyAlert(null)}
            className="p-2 hover:bg-red-700 rounded-full transition-all font-black text-lg"
          >
            ✕
          </button>
        </div>
      )}
      {/* EXIT MODAL */}
      {showExitConfirm && (
        <div className="fixed inset-0 z-[110] bg-black/60 backdrop-blur-md flex items-center justify-center p-6 text-center">
          <div className="bg-[var(--nura-bg)] border border-white/10 p-10 rounded-[2.5rem] max-w-sm w-full shadow-2xl">
            <XCircle size={64} className="text-red-400 mx-auto mb-6" />
            <h2 className="text-3xl font-black mb-6">End Session?</h2>
            <div className="flex gap-4">
              <button onClick={() => setShowExitConfirm(false)} className="flex-1 py-4 rounded-2xl bg-[var(--nura-card)] font-bold">No</button>
              <button onClick={() => handleFinalExit('early')} className="flex-1 py-4 rounded-2xl bg-red-500 font-bold">Yes, End</button>
            </div>
          </div>
        </div>
      )}

      {/* HEADER */}
      <header className="p-6 flex justify-between items-center shrink-0">
        {/* LLM status pill */}
        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-black uppercase tracking-widest border ${
          llmStatus === 'ready'
            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
            : llmStatus === 'offline'
            ? 'bg-red-500/10 border-red-500/30 text-red-400'
            : 'bg-amber-500/10 border-amber-500/30 text-amber-400'
        }`}>
          <span className={`w-1.5 h-1.5 rounded-full ${
            llmStatus === 'ready' ? 'bg-emerald-400' : llmStatus === 'offline' ? 'bg-red-400' : 'bg-amber-400 animate-pulse'
          }`} />
          {llmStatus === 'ready' ? 'AI Ready' : llmStatus === 'offline' ? 'AI Offline' : 'AI Loading…'}
        </div>
        <button 
          onClick={() => setShowExitConfirm(true)} 
          className="px-8 py-3 bg-red-500 hover:bg-red-600 text-white rounded-full font-black text-xs uppercase tracking-widest shadow-lg shadow-red-500/20 transition-all active:scale-95"
        >
          End Session
        </button>
      </header>

      {/* BODY - Changed from h-screen/h-1/2 to flex-1 to prevent cutoff */}
      <div className="flex-1 flex flex-col md:flex-row w-full max-w-7xl mx-auto px-8 gap-8 items-center overflow-hidden">
        {/* Chat Side */}
        <div className="flex-1 flex flex-col h-full justify-center min-h-0">
          <div className={`transition-all duration-700 ${messages.length === 0 ? 'py-10' : 'pb-4'}`}>
            <h1 className={`${getHeaderSizeClass()} font-black tracking-tighter leading-[0.9] drop-shadow-2xl`}>
              How are you, <br/>{patientName}?
            </h1>
          </div>
          
          {/* Scrollable Message Area */}
          <div className={`flex-1 overflow-y-auto flex flex-col gap-6 scrollbar-hide pr-2 ${messages.length === 0 && !currentTranscript ? 'opacity-0' : 'opacity-100'}`}>
            {messages.map((msg, i) => (
              <div key={i} className={`${getMessageSizeClass()} font-bold tracking-tight ${msg.sender === 'patient' ? 'text-[var(--nura-text)]/80 text-right' : 'text-[var(--nura-dim)] text-left'}`}>
                {msg.text}
              </div>
            ))}
            {currentTranscript && (
              <div className={`${getMessageSizeClass()} text-[var(--nura-text)]/30 italic text-right animate-pulse`}>{currentTranscript}</div>
            )}
            {isAiTyping && (
              <div className="flex gap-2 py-4"><span className="w-3 h-3 bg-indigo-500 rounded-full animate-bounce" /></div>
            )}
            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Avatar Side */}
        <div className="w-full md:w-2/5 flex flex-col items-center justify-center shrink-0 py-6">
          <div className="relative mb-8">
            {isListening && <div className="absolute inset-0 bg-blue-500/20 rounded-full blur-[80px] animate-pulse" />}
            <div className={`transition-transform duration-500 ${isAiTyping || isListening ? 'scale-110' : 'scale-100'}`}>
                <Avatar size="2xl" type={patient.avatarType} emotion={isAiTyping ? 'happy' : 'neutral'}
                reducedMotion={settings.reducedMotion} />{/* Pass reducedMotion to Avatar */}
            </div>
          </div>
          <button 
            onClick={toggleListening}
            className={`px-10 py-6 rounded-full flex items-center justify-center gap-4 border-2 transition-all w-full max-w-sm shadow-2xl active:scale-95 ${
              isListening ? 'bg-red-500 border-red-400' : 'bg-[var(--nura-accent)] border-[var(--nura-accent)] hover:bg-[var(--nura-accent)]/80'
            }`}
          >
            {isListening ? (
  <>
    <MicOff size={32} className="text-white" />
    <span className="text-xl font-black text-white">FINISH TALKING</span>
  </>
) : (
  <>
    <Mic size={32} className="text-[var(--nura-bg)]" />
    <span className="text-xl font-black uppercase tracking-tight text-[var(--nura-bg)]">
      Click me to speak
    </span>
  </>
)}
          </button>
        </div>
      </div>

      {/* FOOTER - Now using a transparent gradient that matches the theme */}
<div className="w-full max-w-5xl mx-auto p-8 shrink-0 bg-gradient-to-t from-[var(--nura-bg)] via-[var(--nura-bg)]/80 to-transparent">
  <div className="flex flex-col gap-4">
    <p className="text-[10px] text-[var(--nura-text)]/40 font-black uppercase tracking-widest ml-2">
      Or type your message:
    </p>
    
    {/* Topics area — only render if there are valid string topics */}
    {topics.length > 0 && (
      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
        {topics.map((topic, idx) => (
          <button
            key={idx}
            onClick={() => handleSendMessage(`Let's talk about ${topic.toLowerCase()}`)}
            className="whitespace-nowrap px-5 py-2.5 rounded-full bg-[var(--nura-card)] hover:bg-nura-accent/20 text-[var(--nura-text)]/90 border border-[var(--nura-text)]/10 transition-all font-bold text-sm"
          >
            Let's talk about {topic}
          </button>
        ))}
      </div>
    )}
          
          <div className="flex items-center gap-4 bg-[var(--nura-card)] p-2 rounded-full border border-white/10 backdrop-blur-xl">
            <input 
              type="text" 
              value={inputText}
              onChange={e => setInputText(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSendMessage()}
              placeholder="Type here..."
              className={`flex-1 bg-transparent px-6 py-3 text-[var(--nura-text)] focus:outline-none font-medium ${settings.fontSize === 'large' ? 'text-2xl' : 'text-lg'}`}
            />
            <button 
              onClick={() => handleSendMessage()}
              disabled={!inputText.trim()}
              className={`p-3 rounded-full transition-all ${inputText.trim() ? 'bg-[var(--nura-accent)] text-[var(--nura-text)]' : 'text-[var(--nura-text)]/20'}`}
            >
              <Send size={24} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};