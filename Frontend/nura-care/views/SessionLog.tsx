import React, { useState, useMemo } from 'react';
import type { SessionLog } from '../types';
import { ChevronLeft, History, Calendar, User, MessageSquare, ChevronDown, ChevronUp, Search, X } from 'lucide-react';

interface SessionLogsProps {
  logs: SessionLog[];
  onBack: () => void;
  isSubView?: boolean;
  initialFilter?: string;
}

export const SessionLogs: React.FC<SessionLogsProps> = ({ logs = [], onBack, isSubView, initialFilter }) => {
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState(initialFilter || '');

  const toggleExpand = (id: string) => {
    setExpandedLogId(expandedLogId === id ? null : id);
  };

  // --- 1. FILTERING & SORTING ---
  const filteredLogs = useMemo(() => {
    if (!Array.isArray(logs)) return [];

    return logs
      .filter(log => {
        const query = searchQuery.toLowerCase().trim();
        const transcript = String(log.transcript || "").toLowerCase();
        const patientName = String(log.patientName || "").toLowerCase();
        
        return !query || transcript.includes(query) || patientName.includes(query);
      })
      .sort((a, b) => {
        const parseDate = (dateStr: any) => {
          if (!dateStr) return 0;
          return new Date(String(dateStr).replace(/-/g, '/')).getTime();
        };
        return parseDate(b.timestamp) - parseDate(a.timestamp);
      });
  }, [logs, searchQuery]);

  // --- 2. GROUPING BY DATE ---
  const groupedLogs = useMemo(() => {
    const groups: Record<string, SessionLog[]> = {};
    filteredLogs.forEach(log => {
      const dateParts = log.timestamp.split(' ')[0].replace(/-/g, '/');
      const dateObj = new Date(dateParts);
      const dateKey = isNaN(dateObj.getTime()) ? "History" : dateObj.toLocaleDateString(undefined, {
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
      });
      if (!groups[dateKey]) groups[dateKey] = [];
      groups[dateKey].push(log);
    });
    
    return Object.keys(groups).map(date => ({
      date,
      logs: groups[date]
    }));
  }, [filteredLogs]);

  // --- 3. TRANSCRIPT FORMATTING (The Fix) ---
  const highlightTranscript = (text: string) => {
    if (!text || text.trim() === "") return 'No transcript recorded for this session.';

    // Swapping "ai:" for "Chat Response:" and "patient:" for "Patient:"
    const processedText = text
      .replace(/ai:/gi, 'Chat Response:')
      .replace(/patient:/gi, 'Patient:');

    const positiveWords = ['happy', 'love', 'wonderful', 'good', 'great', 'smile', 'joy', 'remember', 'peaceful'];
    const urgentWords = ['lonely', 'anxious', 'pain', 'hurt', 'scared', 'confused', 'hospital', 'bills', 'where is', 'forgot', 'lost'];

    const allWords = [...positiveWords, ...urgentWords, 'Chat Response:', 'Patient:'];
    const regex = new RegExp(`(${allWords.join('|')})`, 'gi');
    const parts = processedText.split(regex);

    return parts.map((part, i) => {
      const lowerPart = part.toLowerCase();
      
      // Style Speaker Labels
      if (part === 'Chat Response:') {
        return <strong key={i} className="text-[var(--nura-accent)] font-black uppercase text-[10px] tracking-widest">{part} </strong>;
      }
      if (part === 'Patient:') {
        return <strong key={i} className="text-[var(--nura-text)] font-black uppercase text-[10px] tracking-widest">{part} </strong>;
      }

      // Highlight Emotion Keywords
      if (positiveWords.includes(lowerPart)) {
        return (
          <span key={i} className="bg-emerald-500/20 text-emerald-300 px-1 rounded border-b-2 border-emerald-500/50 font-bold">
            {part}
          </span>
        );
      }
      if (urgentWords.some(word => lowerPart.includes(word))) {
        return (
          <span key={i} className="bg-red-500/20 text-red-300 px-1 rounded border-b-2 border-red-500/50 font-bold underline decoration-red-500/50 underline-offset-4">
            {part}
          </span>
        );
      }
      return part;
    });
  };

  return (
    <div className={`w-full max-w-4xl mx-auto ${isSubView ? '' : 'p-6'} animate-in fade-in duration-700`}>
      {!isSubView && (
        <header className="mb-8 mt-4 flex items-center justify-between border-b border-white/5 pb-4 relative">
          <button onClick={onBack} className="p-2.5 bg-[var(--nura-card)] hover:bg-white/5 rounded-full border border-white/10 transition-all">
            <ChevronLeft size={22} className="text-[var(--nura-dim)]" />
          </button>
          <div className="flex-1 text-center">
            <h1 className="text-3xl font-black mb-1 tracking-tight text-[var(--nura-text)]">Session Logs</h1>
            <p className="text-[var(--nura-dim)] text-sm font-medium">Review patient interaction transcripts</p>
          </div>
          <div className="w-[42px]" />
        </header>
      )}

      {/* Search */}
      <div className="mb-8 relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--nura-dim)]/50" size={20} />
        <input 
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search transcripts or patient names..."
          className="w-full bg-black/10 border border-white/5 rounded-2xl py-4 pl-12 pr-12 text-[var(--nura-text)] focus:outline-none focus:border-[var(--nura-accent)]/50 transition-all placeholder:text-[var(--nura-dim)]/30"
        />
        {searchQuery && (
          <button onClick={() => setSearchQuery('')} className="absolute right-4 top-1/2 -translate-y-1/2 text-[var(--nura-dim)] hover:text-[var(--nura-text)]">
            <X size={20} />
          </button>
        )}
      </div>

      <div className="space-y-8">
        {groupedLogs.length === 0 ? (
          <div className="bg-[var(--nura-card)] p-12 rounded-3xl text-center border border-white/5">
            <History size={48} className="mx-auto mb-4 text-[var(--nura-dim)]/20" />
            <p className="text-[var(--nura-dim)] text-lg font-bold">No sessions found.</p>
          </div>
        ) : (
          groupedLogs.map(group => (
            <div key={group.date} className="space-y-4">
              <h2 className="text-[var(--nura-accent)] font-black text-[10px] uppercase tracking-[0.2em] mb-4 border-l-2 border-[var(--nura-accent)] pl-4">
                {group.date}
              </h2>
              
              {group.logs.map((log) => {
                const isExpanded = expandedLogId === log.id;
                const displayDate = log.timestamp 
                  ? new Date(String(log.timestamp).replace(/-/g, '/')).toLocaleString()
                  : 'Unknown Date';

                return (
                  <div 
                    key={log.id} 
                    onClick={() => toggleExpand(log.id)}
                    className={`bg-[var(--nura-card)] p-6 rounded-[2rem] border border-white/5 shadow-xl cursor-pointer transition-all duration-300 ${isExpanded ? 'ring-2 ring-[var(--nura-accent)]/30 bg-[var(--nura-card)]' : 'hover:bg-white/5'}`}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-4 mb-4 pb-4 border-b border-white/5">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-[var(--nura-accent)]/10 flex items-center justify-center">
                          <User size={20} className="text-[var(--nura-accent)]" />
                        </div>
                        <div>
                          {/* FIX: Shows Actual Patient Name or Fallback */}
                          <h3 className="font-black text-[var(--nura-text)] text-lg tracking-tight leading-tight">
                            {log.patientName && log.patientName !== "Care Circle" ? log.patientName : "Patient Profile"}
                          </h3>
                          <div className="flex items-center gap-1.5 text-[10px] font-bold text-[var(--nura-dim)] uppercase tracking-wider">
                            <Calendar size={10} />
                            {displayDate}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className={`px-3 py-1 rounded-full border text-[10px] font-black uppercase tracking-widest ${
                          (log as any).endReason === 'early' 
                            ? 'bg-amber-500/10 border-amber-500/20 text-amber-400' 
                            : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                        }`}>
                          {(log as any).endReason === 'early' ? 'Early End' : 'Completed'}
                        </div>
                        {isExpanded ? <ChevronUp size={20} className="text-[var(--nura-dim)]" /> : <ChevronDown size={20} className="text-[var(--nura-dim)]" />}
                      </div>
                    </div>
                    
                    <div className={`bg-black/20 rounded-2xl p-5 border border-white/5 transition-all duration-500 overflow-hidden ${isExpanded ? 'max-h-[1500px] opacity-100' : 'max-h-24 opacity-60'}`}>
                      <div className="flex items-start gap-4">
                        <MessageSquare size={18} className="text-[var(--nura-accent)] mt-1 shrink-0" />
                        <div className="text-[var(--nura-text)]/90 leading-relaxed text-sm whitespace-pre-wrap">
                          {isExpanded ? (
                            <div className="space-y-3">
                              {highlightTranscript(log.transcript)}
                            </div>
                          ) : (
                            <p className="line-clamp-2 italic text-[var(--nura-dim)]">
                              "{log.transcript.replace(/ai:/gi, 'Chat Response:').replace(/patient:/gi, 'Patient:')}"
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    {!isExpanded && log.transcript && log.transcript.length > 50 && (
                      <p className="text-center text-[9px] text-[var(--nura-dim)]/40 mt-3 font-black uppercase tracking-[0.2em]">
                        Click to expand transcript
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          ))
        )}
      </div>
    </div>
  );
};
