import React, { useState, useEffect, useRef } from 'react';
import { PatientProfile } from '../types';
import { ChevronLeft, Mic, Send, LogOut } from 'lucide-react';
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
  const [secondsLeft, setSecondsLeft] = useState(durationMinutes * 60);
  
  const scrollRef = useRef<HTMLDivElement>(null);
  // Ref to track the latest messages for the save-session API call
  const messagesRef = useRef<Message[]>([]);

  const getTimestamp = () => new Date().toLocaleString();

  // Keep messagesRef in sync with the state
  useEffect(() => {
    messagesRef.current = messages;
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleFinalExit = async () => {
    setIsSessionOver(true); 
    
    try {
      await fetch("http://127.0.0.1:8000/chat/save-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: caregiverEmail,
          password: caregiverPassword,
          patient_id: patient.patient_id || patient.id,
          patient_name: patient.full_name || patient.name,
          messages: messagesRef.current // Uses Ref to get current transcript
        }),
      });
    } catch (err) {
      console.error("Failed to save session logs:", err);
    }

    // Auto log out after 3 seconds
    setTimeout(() => {
      onLogout();
    }, 3000);
  };

  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    // Timer starts immediately on mount
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
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [secondsLeft, isSessionOver]);


  const handleSendMessage = () => {
    if (!textInput.trim() || isSessionOver) return;

    const userText = textInput;
    const userMsg: Message = {
      sender: 'patient',
      text: userText,
      timestamp: getTimestamp()
    };

    setMessages(prev => [...prev, userMsg]);
    setTextInput('');
    setIsPlaying(true);

    setTimeout(() => {
      const aiMsg: Message = {
        sender: 'ai',
        text: userText, // Echo logic
        timestamp: getTimestamp()
      };
      setMessages(prev => [...prev, aiMsg]);
      setIsPlaying(false);
    }, 1000);
  };

  return (
    <div className="w-full h-screen flex flex-col relative overflow-hidden bg-[#0b0a1a]">
      
      {/* Session Over Overlay */}
      {isSessionOver && (
        <div className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-xl flex flex-col items-center justify-center animate-in fade-in duration-500">
          <div className="text-center space-y-6">
            <div className="w-20 h-20 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4 border border-red-500/50">
               <LogOut size={40} className="text-red-400" />
            </div>
            <h1 className="text-6xl font-black text-white tracking-tighter">Session Ended</h1>
            <p className="text-indigo-200 text-xl opacity-60">Saving conversation and logging out...</p>
          </div>
        </div>
      )}

      {/* Header */}
      <header className="p-6 z-50 flex items-center gap-4 bg-[#171140]/50 backdrop-blur-md border-b border-white/5">
        <button onClick={onBack} className="p-2 hover:bg-white/10 rounded-full text-white transition-all">
          <ChevronLeft size={24} />
        </button>
        <div className="flex items-center gap-3">
          <Avatar size="sm" type={patient.avatarType} emotion={isPlaying ? 'happy' : 'neutral'} />
          <h2 className="text-white font-semibold">{patient.full_name || patient.name}</h2>
        </div>
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
