import React, { useState, useEffect, useRef } from 'react';
import { PatientProfile } from '../types';
import { ChevronLeft, Mic, Send, LogOut, XCircle } from 'lucide-react';
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

export const ChatView: React.FC<ChatViewProps> = ({ 
  patient, 
  durationMinutes, 
  caregiverEmail, 
  caregiverPassword, 
  onBack,
  onLogout
}) => {
  const [isActive, setIsActive] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false); 
  const [textInput, setTextInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [isSessionOver, setIsSessionOver] = useState(false);
  const [showExitConfirm, setShowExitConfirm] = useState(false); // NEW: Popup state
  const [secondsLeft, setSecondsLeft] = useState(durationMinutes * 60);
  
  const scrollRef = useRef<HTMLDivElement>(null);
  const messagesRef = useRef<Message[]>([]);

  const getTimestamp = () => new Date().toLocaleString();

  useEffect(() => {
    messagesRef.current = messages;
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleFinalExit = async () => {
    setIsSessionOver(true); 
    setShowExitConfirm(false); // Close popup if open
    
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

    setTimeout(() => {
      onLogout();
    }, 3000);
  };

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (secondsLeft > 0 && !isSessionOver) {
      interval = setInterval(() => {
        setSecondsLeft((prev) => {
          if (prev <= 1) {
            clearInterval(interval);
            handleFinalExit(); 
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => { if (interval) clearInterval(interval); };
  }, [secondsLeft, isSessionOver]);

  const handleSendMessage = () => {
    if (!textInput.trim() || isSessionOver) return;
    const userText = textInput;
    setMessages(prev => [...prev, { sender: 'patient', text: userText, timestamp: getTimestamp() }]);
    setTextInput('');
    setIsPlaying(true);
    setTimeout(() => {
      setMessages(prev => [...prev, { sender: 'ai', text: userText, timestamp: getTimestamp() }]);
      setIsPlaying(false);
    }, 1000);
  };

  return (
    <div className="w-full h-screen flex flex-col relative overflow-hidden bg-[#0b0a1a]">
      
      {/* 1. Confirmation Modal Popup */}
      {showExitConfirm && (
        <div className="fixed inset-0 z-[110] bg-black/60 backdrop-blur-md flex items-center justify-center p-6">
          <div className="bg-[#171140] border border-white/10 p-8 rounded-3xl max-w-sm w-full text-center shadow-2xl animate-in zoom-in duration-300">
            <XCircle size={48} className="text-red-400 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-white mb-2">End Session?</h2>
            <p className="text-indigo-200/60 mb-8">Are you sure you want to end the session?</p>
            <div className="flex gap-3">
              <button 
                onClick={() => setShowExitConfirm(false)}
                className="flex-1 py-3 rounded-xl bg-white/5 text-white font-semibold hover:bg-white/10 transition-all"
              >
                No, Stay
              </button>
              <button 
                onClick={handleFinalExit}
                className="flex-1 py-3 rounded-xl bg-red-500 text-white font-semibold hover:bg-red-600 transition-all shadow-lg shadow-red-500/20"
              >
                Yes, End
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. Session Over Overlay */}
      {isSessionOver && (
        <div className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-xl flex flex-col items-center justify-center animate-in fade-in duration-500">
          <div className="text-center space-y-6">
            <div className="w-20 h-20 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4 border border-red-500/50">
               <LogOut size={40} className="text-red-400" />
            </div>
            <h1 className="text-6xl font-black text-white tracking-tighter">Session Ended</h1>
            <p className="text-indigo-200 text-xl opacity-60">logging out...</p>
          </div>
        </div>
      )}

      {/* 3. Header with End Button */}
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

        {/* Manual End Session Button */}
        <button 
          onClick={() => setShowExitConfirm(true)}
          className="px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 rounded-xl text-sm font-bold transition-all flex items-center gap-2"
        >
          <LogOut size={16} />
          End Session
        </button>
      </header>

      {/* Chat History Area */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6 pb-40 scrollbar-hide">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center opacity-40 text-center space-y-4">
            <Avatar size="xl" type={patient.avatarType} emotion="neutral" />
            <h3 className="text-2xl font-medium text-white">How are you, {patient.full_name || patient.name}?</h3>
          </div>
        ) : (
          messages.map((msg, i) => (
            <div key={i} className={`flex ${msg.sender === 'patient' ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-2`}>
              <div className={`flex gap-3 max-w-[85%] ${msg.sender === 'patient' ? 'flex-row-reverse' : ''}`}>
                <div className={`p-4 rounded-2xl text-white ${
                  msg.sender === 'patient' 
                    ? 'bg-[#715ffa] rounded-tr-none shadow-lg shadow-indigo-500/10' 
                    : 'bg-white/5 border border-white/10 rounded-tl-none'
                }`}>
                  {msg.text}
                </div>
              </div>
            </div>
          ))
        )}
        <div ref={scrollRef} />
      </div>

      {/* Interaction Footer */}
      <footer className="absolute bottom-0 left-0 w-full p-6 bg-gradient-to-t from-[#0b0a1a] via-[#0b0a1a] to-transparent z-50">
        <div className="max-w-4xl mx-auto flex gap-3 items-center">
          <div className="flex-1 relative flex items-center bg-white/5 border border-white/10 rounded-3xl p-2 focus-within:border-[#715ffa] transition-all backdrop-blur-xl">
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
              onClick={handleSendMessage}
              className={`p-3 rounded-2xl transition-all ${textInput.trim() ? 'bg-[#715ffa] text-white' : 'bg-white/5 text-white/20'}`}
              disabled={!textInput.trim() || isSessionOver}
            >
              <Send size={20} />
            </button>
          </div>

          <button
            onClick={() => setIsActive(true)}
            disabled={isSessionOver}
            className="flex items-center gap-2 px-6 py-4 bg-white text-[#0b0a1a] rounded-3xl font-bold hover:scale-105 transition-all shadow-xl active:scale-95 disabled:opacity-50"
          >
            <Mic size={20} className="text-[#715ffa]" />
            <span>Speak</span>
          </button>
        </div>
      </footer>
    </div>
  );
};
