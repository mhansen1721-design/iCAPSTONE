import React, { useState, useEffect, useRef } from 'react';
import type { PatientProfile } from '../types';
import { ChevronLeft, Mic, MicOff, Send, XCircle, LogOut } from 'lucide-react';
import { Avatar } from '../components/Avatar';

// Define Message internally to ensure no import conflicts
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
  if (!patient) return null;

  const [messages, setMessages] = useState<Message[]>([]);
  const [currentTranscript, setCurrentTranscript] = useState('');
  const [inputText, setInputText] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [isAiTyping, setIsAiTyping] = useState(false);
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const [isSessionOver, setIsSessionOver] = useState(false);
  
  const recognitionRef = useRef<any>(null);
  const silenceTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const messagesRef = useRef<Message[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesRef.current = messages;
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, currentTranscript, isAiTyping]);

  useEffect(() => {
    const totalMs = durationMinutes * 60 * 1000;
    const timer = setTimeout(() => {
      handleFinalExit();
    }, totalMs);
    return () => clearTimeout(timer);
  }, [durationMinutes]);

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
        }, 5000);
      };

      recognitionRef.current.onstart = () => setIsListening(true);
      recognitionRef.current.onend = () => setIsListening(false);
    }

    return () => {
        if (recognitionRef.current) recognitionRef.current.stop();
        if (silenceTimeoutRef.current) clearTimeout(silenceTimeoutRef.current);
    };
  }, []);

  const toggleListening = () => {
    if (!recognitionRef.current) return;
    if (isListening) {
      recognitionRef.current.stop();
      if (currentTranscript.trim()) handleSendMessage(currentTranscript);
    } else {
      setCurrentTranscript('');
      try {
        recognitionRef.current.start();
      } catch (e) {
        console.warn("Recognition already started");
      }
    }
  };

  const handleFinalExit = async () => {
    setIsSessionOver(true);
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
    } catch (e) { 
      console.error("Failed to save session logs:", e); 
    }
    
    onLogout();
  };

  const handleSendMessage = (text?: string) => {
    const val = text || inputText;
    if (!val.trim()) return;

    setMessages(prev => [...prev, { 
        sender: 'patient', 
        text: val, 
        timestamp: new Date().toLocaleString() 
    }]);
    
    setInputText('');
    setCurrentTranscript('');
    setIsAiTyping(true);

    setTimeout(() => {
      setMessages(prev => [...prev, { 
        sender: 'ai', 
        text: `I understand. Can you tell me more about that?`, 
        timestamp: new Date().toLocaleString() 
      }]);
      setIsAiTyping(false);
    }, 1500);
  };

  // Helper to get topics regardless of key name (safeTopics vs approved_topics)
  const topics = (patient as any).approved_topics || patient.safeTopics || [];

  return (
    <div className="w-full h-screen flex flex-col relative bg-[#171140] text-white font-sans overflow-hidden animate-in fade-in duration-700">
      
      {/* ORIGINAL STYLE EXIT CONFIRMATION */}
      {showExitConfirm && (
        <div className="fixed inset-0 z-[110] bg-black/60 backdrop-blur-md flex items-center justify-center p-6">
          <div className="bg-[#171140] border border-white/10 p-10 rounded-[2.5rem] max-w-sm w-full text-center shadow-2xl animate-in zoom-in duration-300">
            <XCircle size={64} className="text-red-400 mx-auto mb-6" />
            <h2 className="text-3xl font-black text-white mb-2 tracking-tighter">End Session?</h2>
            <div className="flex gap-4">
              <button onClick={() => setShowExitConfirm(false)} className="flex-1 py-4 rounded-2xl bg-white/5 text-white font-bold hover:bg-white/10">No</button>
              <button onClick={handleFinalExit} className="flex-1 py-4 rounded-2xl bg-red-500 text-white font-bold hover:bg-red-600 shadow-lg shadow-red-500/20">Yes, End</button>
            </div>
          </div>
        </div>
      )}

      {/* HEADER (AVATAR REMOVED) */}
      <header className="p-8 flex justify-between items-center shrink-0">
        <div className="flex flex-col">
          <h2 className="text-white font-black text-2xl leading-none">{patient.name}</h2>
          <p className="text-[10px] text-indigo-300 font-bold uppercase tracking-widest mt-2">Live Session</p>
        </div>

        <button 
          onClick={() => setShowExitConfirm(true)} 
          className="px-8 py-3 bg-red-500/10 text-red-400 border border-red-500/20 rounded-full font-black text-xs tracking-widest uppercase hover:bg-red-500 hover:text-white transition-all shadow-lg shadow-red-500/5"
        >
          End Session
        </button>
      </header>

      {/* MAIN VIEW */}
      <div className="flex-1 flex flex-col md:flex-row w-full max-w-7xl mx-auto px-12 gap-12 items-center overflow-hidden">
        <div className="flex-1 flex flex-col h-full justify-center py-10">
          <div className={`transition-all duration-1000 ${messages.length === 0 ? 'translate-y-0' : '-translate-y-8'}`}>
            <h1 className="text-6xl md:text-8xl font-black mb-8 leading-tight tracking-tighter drop-shadow-2xl">
              How are you, <br/>{patient.name}?
            </h1>
          </div>
          
          <div className={`overflow-y-auto flex flex-col gap-8 pr-4 scrollbar-hide transition-opacity duration-500 ${messages.length === 0 && !currentTranscript ? 'opacity-0' : 'opacity-100 h-1/2'}`}>
            {messages.map((msg, i) => (
              <div key={i} className={`text-3xl md:text-4xl font-bold tracking-tight ${msg.sender === 'patient' ? 'text-white/90 text-right' : 'text-indigo-300 text-left'}`}>
                {msg.text}
              </div>
            ))}
            {currentTranscript && (
                <div className="text-3xl text-white/40 italic text-right animate-pulse">{currentTranscript}...</div>
            )}
            {isAiTyping && (
                <div className="flex gap-2 py-4"><span className="w-3 h-3 bg-indigo-400 rounded-full animate-bounce" /></div>
            )}
            <div ref={messagesEndRef} />
          </div>
        </div>

        <div className="w-full md:w-2/5 flex flex-col items-center justify-center shrink-0">
          <div className="relative mb-12">
            {isListening && <div className="absolute inset-0 bg-blue-400/20 rounded-full blur-[100px] animate-pulse" />}
            <div className={`transition-transform duration-500 ${isAiTyping || isListening ? 'scale-110' : 'scale-100'}`}>
                <Avatar size="2xl" type={patient.avatarType} emotion={isAiTyping ? 'happy' : 'neutral'} />
            </div>
          </div>
          <button 
            onClick={toggleListening}
            className={`px-12 py-7 rounded-full flex items-center justify-center gap-6 border-2 transition-all w-full max-w-md shadow-2xl active:scale-95 ${
              isListening ? 'bg-red-500 border-red-400 shadow-red-500/40' : 'bg-[#715ffa] border-indigo-400 shadow-indigo-500/40'
            }`}
          >
            {isListening ? (
              <><MicOff size={36} /><span className="text-2xl font-black">FINISH TALKING</span></>
            ) : (
              <><Mic size={36} /><span className="text-2xl font-black uppercase tracking-tight">Click me to speak</span></>
            )}
          </button>
        </div>
      </div>

      {/* BOTTOM AREA (DYNAMIC TOPICS) */}
      <div className="w-full max-w-4xl mx-auto p-12 shrink-0 flex flex-col gap-8 bg-gradient-to-t from-[#171140] to-transparent z-50">
        <div className="flex flex-col gap-4">
          {topics.length > 0 && (
            <>
              <p className="text-sm text-white/40 font-bold ml-4 tracking-wide uppercase">Or type your message:</p>
              <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
                {topics.map((topic: string, idx: number) => (
                  <button 
                    key={idx} 
                    onClick={() => handleSendMessage(`Let's talk about ${topic.toLowerCase()}`)} 
                    className="whitespace-nowrap px-6 py-3 rounded-full bg-white/5 hover:bg-white/10 text-white/90 border border-white/10 transition-all font-medium text-base active:scale-95"
                  >
                    {topic}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        <div className="flex items-center gap-4 bg-white/5 p-2.5 rounded-full border border-white/10 backdrop-blur-xl shadow-2xl">
          <input 
            type="text" 
            value={inputText}
            onChange={e => setInputText(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSendMessage()}
            placeholder="Let's chat :)"
            className="flex-1 bg-transparent px-8 py-4 text-white placeholder:text-white/30 focus:outline-none text-xl font-medium"
            disabled={isSessionOver}
          />
          <button 
            onClick={() => handleSendMessage()}
            disabled={!inputText.trim() || isSessionOver}
            className={`p-4 rounded-full transition-all flex items-center justify-center ${inputText.trim() ? 'bg-[#715ffa] text-white shadow-lg' : 'bg-white/5 text-white/20'}`}
          >
            <Send size={24} />
          </button>
        </div>
      </div>
    </div>
  );
};
