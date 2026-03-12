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
  settings: AppSettings; // <--- ADD THIS LINE
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
  
  const recognitionRef = useRef<any>(null);
  const silenceTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const messagesRef = useRef<Message[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // --- FONT SIZE LOGIC ---
  const getMessageSizeClass = () => {
    switch (settings.fontSize) {
      case 'small': return 'text-xl md:text-2xl';
      case 'large': return 'text-4xl md:text-5xl leading-tight';
      default: return 'text-2xl md:text-3xl';
    }
  };

  const getHeaderSizeClass = () => {
    switch (settings.fontSize) {
      case 'small': return 'text-4xl md:text-6xl';
      case 'large': return 'text-6xl md:text-8xl';
      default: return 'text-5xl md:text-7xl';
    }
  };

  // Sync ref for the final exit payload
  useEffect(() => {
    messagesRef.current = messages;
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, currentTranscript, isAiTyping]);

  // Session timer
  useEffect(() => {
    const timer = setTimeout(() => handleFinalExit(), durationMinutes * 60 * 1000);
    return () => clearTimeout(timer);
  }, [durationMinutes]);

  // Speech Recognition Setup
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
      recognitionRef.current.onend = () => setIsListening(false);
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

  const handleFinalExit = async () => {
    if (recognitionRef.current) recognitionRef.current.stop();

    const payload = {
      email: caregiverEmail.toLowerCase().trim(),
      password: caregiverPassword,
      patient_id: patient.patient_id || (patient as any).id,
      full_name: patient.full_name || patient.name,
      messages: messagesRef.current
    };

    try {
      await fetch("http://127.0.0.1:8000/chat/save-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    } catch (e) { console.error("Save failed", e); }
    
    onLogout();
  };

  const handleSendMessage = (text?: string) => {
    const val = text || inputText;
    if (!val.trim()) return;

    setMessages(prev => [...prev, { 
        sender: 'patient', 
        text: val, 
        timestamp: new Date().toISOString() 
    }]);
    
    setInputText('');
    setCurrentTranscript('');
    setIsAiTyping(true);

    setTimeout(() => {
      setMessages(prev => [...prev, { 
        sender: 'ai', 
        text: `I understand. Can you tell me more about that?`, 
        timestamp: new Date().toISOString() 
      }]);
      setIsAiTyping(false);
    }, 1500);
  };

  const topics = patient.safeTopics || (patient as any).approved_topics || [];

  return (
<div className="w-full h-screen h-[100dvh] flex flex-col bg-[var(--nura-bg)] text-[var(--nura-text)] overflow-hidden fixed inset-0 z-[100] pointer-events-auto">        
      {/* EXIT MODAL */}
      {showExitConfirm && (
        <div className="fixed inset-0 z-[110] bg-black/60 backdrop-blur-md flex items-center justify-center p-6 text-center">
          <div className="bg-[var(--nura-bg)] border border-white/10 p-10 rounded-[2.5rem] max-w-sm w-full shadow-2xl">
            <XCircle size={64} className="text-red-400 mx-auto mb-6" />
            <h2 className="text-3xl font-black mb-6">End Session?</h2>
            <div className="flex gap-4">
              <button onClick={() => setShowExitConfirm(false)} className="flex-1 py-4 rounded-2xl bg-[var(--nura-card)] font-bold">No</button>
              <button onClick={handleFinalExit} className="flex-1 py-4 rounded-2xl bg-red-500 font-bold">Yes, End</button>
            </div>
          </div>
        </div>
      )}

      {/* HEADER */}
      <header className="p-6 flex justify-between items-center shrink-0">
        <div>
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
              How are you, <br/>{patient.name}?
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
    
    {/* Topics area */}
    <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
      {topics.map((topic: string, idx: number) => (
        <button 
          key={idx} 
          onClick={() => handleSendMessage(`Let's talk about ${topic.toLowerCase()}`)} 
          className="whitespace-nowrap px-5 py-2.5 rounded-full bg-[var(--nura-card)] hover:bg-nura-accent/20 text-[var(--nura-text)]/90 border border-[var(--nura-text)]/10 transition-all font-bold text-sm"
        >
          {topic}
        </button>
      ))}
    </div>
          
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
