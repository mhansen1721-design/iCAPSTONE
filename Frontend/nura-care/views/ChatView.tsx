import React, { useState, useEffect, useRef } from 'react';
import { PatientProfile } from '../types';
import { ChevronLeft, Mic, Send, LogOut, XCircle, Square } from 'lucide-react';
import { Avatar } from '../components/Avatar';

interface Message {
  sender: 'patient' | 'ai';
  text: string;
  timestamp: string;
}

interface ChatViewProps {
  patient: PatientProfile;
  durationMinutes: number; 
  caregiverEmail: string;
  caregiverPassword: string;
  onBack: () => void;
  onLogout: () => void; 
}

const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

export const ChatView: React.FC<ChatViewProps> = ({ 
  patient, 
  durationMinutes,
  caregiverEmail, 
  caregiverPassword, 
  onBack,
  onLogout
}) => {
  // --- STATE MANAGEMENT ---
  const [isPlaying, setIsPlaying] = useState(false); 
  const [textInput, setTextInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [isSessionOver, setIsSessionOver] = useState(false);
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  
  const recognitionRef = useRef<any>(null);
  const silenceTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const messagesRef = useRef<Message[]>([]);

  const getTimestamp = () => new Date().toLocaleString();

  // --- 1. HIDDEN BACKGROUND SESSION TIMER ---
  useEffect(() => {
    const totalMs = durationMinutes * 60 * 1000;
    const sessionTimer = setTimeout(() => {
      if (!isSessionOver) {
        handleFinalExit(); // Auto-logout when time is up
      }
    }, totalMs);

    return () => clearTimeout(sessionTimer);
  }, [durationMinutes, isSessionOver]);

  useEffect(() => {
    messagesRef.current = messages;
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // --- 2. VOICE LOGIC WITH 10-SECOND SILENCE AUTO-SEND ---
  
  useEffect(() => {
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = true; // Essential to detect silence over time
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onstart = () => setIsRecording(true);
      
      recognition.onresult = (event: any) => {
        let finalTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript;
          }
        }
        
        if (finalTranscript) {
          setTextInput(finalTranscript);

          // RESET SILENCE TIMER: Wait 10 seconds after speech ends before sending
          if (silenceTimeoutRef.current) clearTimeout(silenceTimeoutRef.current);
          
          silenceTimeoutRef.current = setTimeout(() => {
            if (finalTranscript.trim()) {
              handleSendMessage(finalTranscript);
              recognition.stop(); 
            }
          }, 5000); // 5 seconds it waits
        }
      };

      recognition.onerror = (event: any) => {
        console.error("Speech Error:", event.error);
        setIsRecording(false);
      };

      recognition.onend = () => setIsRecording(false);
      recognitionRef.current = recognition;
    }
  }, []);

  const toggleSpeech = () => {
    if (!recognitionRef.current) return;
    if (isRecording) {
      if (silenceTimeoutRef.current) clearTimeout(silenceTimeoutRef.current);
      recognitionRef.current.stop();
    } else {
      setError(null);
      recognitionRef.current.start();
    }
  };

  // --- 3. SESSION LOGIC ---
  const handleFinalExit = async () => {
    setIsSessionOver(true); 
    setShowExitConfirm(false);
    if (silenceTimeoutRef.current) clearTimeout(silenceTimeoutRef.current);
    
    try {
      await fetch("http://127.0.0.1:8000/chat/save-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: caregiverEmail,
          password: caregiverPassword,
          patient_id: patient.patient_id || patient.id,
          full_name: patient.full_name || patient.name, 
          messages: messagesRef.current 
        }),
      });
    } catch (err) {
      console.error("Failed to save session logs:", err);
    }
    setTimeout(() => onLogout(), 2000);
  };

  const handleSendMessage = (overrideText?: string) => {
    const messageText = overrideText || textInput;
    if (!messageText.trim() || isSessionOver) return;
    
    // Clear any pending auto-send if user manually clicks send
    if (silenceTimeoutRef.current) clearTimeout(silenceTimeoutRef.current);

    setMessages(prev => [...prev, { sender: 'patient', text: messageText, timestamp: getTimestamp() }]);
    setTextInput('');
    setIsPlaying(true);
    
    setTimeout(() => {
      setMessages(prev => [...prev, { sender: 'ai', text: `Response to: ${messageText}`, timestamp: getTimestamp() }]);
      setIsPlaying(false);
    }, 1000);
  };

  return (
    <div className="w-full h-screen flex flex-col relative overflow-hidden bg-[#0b0a1a]">
      {/* Exit Overlays */}
      {showExitConfirm && (
        <div className="fixed inset-0 z-[110] bg-black/60 backdrop-blur-md flex items-center justify-center p-6">
          <div className="bg-[#171140] border border-white/10 p-8 rounded-3xl max-w-sm w-full text-center shadow-2xl">
            <XCircle size={48} className="text-red-400 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-white mb-2">End Session?</h2>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowExitConfirm(false)} className="flex-1 py-3 rounded-xl bg-white/5 text-white font-semibold">No</button>
              <button onClick={handleFinalExit} className="flex-1 py-3 rounded-xl bg-red-500 text-white font-semibold">Yes, End</button>
            </div>
          </div>
        </div>
      )}

      {isSessionOver && (
        <div className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-xl flex flex-col items-center justify-center">
            <LogOut size={40} className="text-red-400 mb-4" />
            <h1 className="text-4xl font-black text-white">Session Ended</h1>
        </div>
      )}

      {/* Header (Timer Hidden) */}
      <header className="p-6 z-50 flex items-center justify-between bg-[#171140]/50 backdrop-blur-md border-b border-white/5">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="p-2 hover:bg-white/10 rounded-full text-white transition-all">
            <ChevronLeft size={24} />
          </button>
          <div className="flex items-center gap-3">
            <Avatar size="sm" type={patient.avatarType} emotion={isPlaying ? 'happy' : 'neutral'} />
            <h2 className="text-white font-semibold">{patient.full_name || patient.name}</h2>
          </div>
        </div>
        <button onClick={() => setShowExitConfirm(true)} className="px-6 py-2 bg-red-500/10 text-red-400 border border-red-500/20 rounded-xl text-sm font-bold hover:bg-red-500 hover:text-white transition-all">
          End Session
        </button>
      </header>

      {/* Chat Content */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6 pb-40 scrollbar-hide">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center opacity-40">
            <Avatar size="xl" type={patient.avatarType} emotion="neutral" />
            <h3 className="text-3xl font-bold text-white mt-6 text-center tracking-tight">
              Hello, {patient.full_name || patient.name}.<br/>
              <span className="text-[#715ffa]">Let's Talk!</span>
            </h3>
          </div>
        ) : (
          messages.map((msg, i) => (
            <div key={i} className={`flex ${msg.sender === 'patient' ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-2`}>
               <div className={`max-w-[80%] p-4 rounded-2xl text-white ${msg.sender === 'patient' ? 'bg-[#715ffa]' : 'bg-white/5 border border-white/10'}`}>
                  {msg.text}
               </div>
            </div>
          ))
        )}
        <div ref={scrollRef} />
      </div>

      {/* Interaction Footer */}
      <footer className="absolute bottom-0 left-0 w-full p-6 bg-gradient-to-t from-[#0b0a1a] to-transparent z-50">
        <div className="max-w-4xl mx-auto flex flex-col items-center gap-4">
          {isRecording && (
            <div className="flex items-center gap-2 bg-[#715ffa]/20 px-4 py-2 rounded-full border border-[#715ffa]/30">
              <span className="w-2 h-2 bg-red-500 rounded-full animate-ping" />
              <span className="text-indigo-200 text-xs font-bold uppercase">Listening...</span>
            </div>
          )}

          <div className="w-full flex gap-3 items-center">
            <div className="flex-1 relative flex items-center bg-white/5 border border-white/10 rounded-3xl p-2 backdrop-blur-xl">
              <input 
                type="text"
                value={textInput}
                onChange={(e) => setTextInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                placeholder="Type a message..."
                className="flex-1 bg-transparent py-3 px-4 text-white focus:outline-none"
                disabled={isSessionOver}
              />
              <button 
                onClick={() => handleSendMessage()}
                className={`p-3 rounded-2xl transition-all ${textInput.trim() ? 'bg-[#715ffa] text-white' : 'bg-white/5 text-white/20'}`}
                disabled={!textInput.trim() || isSessionOver}
              >
                <Send size={20} />
              </button>
            </div>

            <button
              onClick={toggleSpeech}
              disabled={isSessionOver}
              className={`flex items-center gap-2 px-6 py-4 rounded-3xl font-bold transition-all shadow-xl active:scale-95 ${
                isRecording ? 'bg-red-500 text-white' : 'bg-white text-[#0b0a1a]'
              }`}
            >
              {isRecording ? <Square size={20} /> : <Mic size={20} className="text-[#715ffa]" />}
              <span>{isRecording ? "Stop" : "Speak"}</span>
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
};
