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

  // --- 1. SAFE FILTERING & SORTING ---
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

  // --- 2. GROUPING BY DATE (Moved from App.tsx) ---
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
    
    // Convert object to array of [date, logs] and maintain sort
    return Object.keys(groups).map(date => ({
      date,
      logs: groups[date]
    }));
  }, [filteredLogs]);

  const highlightTranscript = (text: string) => {
    if (!text || text.trim() === "") return 'No transcript recorded for this session.';

    const positiveWords = ['happy', 'love', 'wonderful', 'good', 'great', 'smile', 'joy', 'remember', 'peaceful'];
    const urgentWords = ['lonely', 'anxious', 'pain', 'hurt', 'scared', 'confused', 'hospital', 'bills', 'where is', 'forgot', 'lost'];

    const allWords = [...positiveWords, ...urgentWords];
    const regex = new RegExp(`(${allWords.join('|')})`, 'gi');
    const parts = text.split(regex);

    return parts.map((part, i) => {
      const lowerPart = part.toLowerCase();
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
          <button 
            onClick={onBack}
            className="p-2 hover:bg-nura-accent/20 rounded-full transition-all active:scale-90 bg-[var(--nura-card)] border-white/10 shadow-lg shadow-indigo-500/10"
          >
            <ChevronLeft size={24} className="text-indigo-200" />
          </button>
          <div className="flex-1 text-center">
            <h1 className="text-3xl font-extrabold mb-1 tracking-tight text-[var(--nura-text)]">Session Logs</h1>
            <p className="text-indigo-200/90 text-base font-medium">Review patient interaction transcripts</p>
          </div>
          <div className="w-[42px]" />
        </header>
      )}

      <div className="mb-8 relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-indigo-400" size={20} />
        <input 
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search transcripts, keywords, or patient names..."
          className="w-full bg-black/20 border border-white/10 rounded-2xl py-4 pl-12 pr-12 text-[var(--nura-text)] focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-400/20 transition-all placeholder:text-[var(--nura-text)]/20"
        />
        {searchQuery && (
          <button onClick={() => setSearchQuery('')} className="absolute right-4 top-1/2 -translate-y-1/2 text-indigo-400 hover:text-[var(--nura-text)] transition-colors">
            <X size={20} />
          </button>
        )}
      </div>

      <div className="space-y-10">
        {groupedLogs.length === 0 ? (
          <div className="bg-[var(--nura-card)] p-12 rounded-3xl text-center border-white/10">
            <History size={48} className="mx-auto mb-4 text-[var(--nura-dim)]/50" />
            <p className="text-indigo-200 text-lg">No session logs found matching your search.</p>
          </div>
        ) : (
          groupedLogs.map(group => (
            <div key={group.date} className="space-y-4">
              <h2 className="text-indigo-400 font-bold text-xs uppercase tracking-widest mb-4 border-l-2 border-indigo-500 pl-4">
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
                    className={`bg-[var(--nura-card)] p-6 rounded-3xl border-white/10 shadow-xl cursor-pointer transition-all duration-300 ${isExpanded ? 'ring-2 ring-indigo-500/30 bg-[var(--nura-card)]' : 'hover:bg-[var(--nura-card)]'}`}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-4 mb-4 pb-4 border-b border-white/5">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-indigo-500/20 flex items-center justify-center">
                          <User size={20} className="text-[var(--nura-dim)]" />
                        </div>
                        <div>
                          <h3 className="font-bold text-[var(--nura-text)]">{log.patientName || "Unknown Patient"}</h3>
                          <div className="flex items-center gap-1 text-xs text-[var(--nura-dim)]/70">
                            <Calendar size={12} />
                            {displayDate}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        {(log as any).endReason === 'early' ? (
                          <div className="px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-bold uppercase tracking-wider">
                            Ended Early
                          </div>
                        ) : (
                          <div className="px-3 py-1 rounded-full bg-green-500/10 border border-green-500/20 text-green-400 text-xs font-bold uppercase tracking-wider">
                            Completed
                          </div>
                        )}
                        {isExpanded ? <ChevronUp size={20} className="text-[var(--nura-dim)]" /> : <ChevronDown size={20} className="text-[var(--nura-dim)]" />}
                      </div>
                    </div>
                    
                    <div className={`bg-black/20 rounded-2xl p-4 border border-white/5 transition-all duration-500 overflow-hidden ${isExpanded ? 'max-h-[1000px] opacity-100' : 'max-h-24 opacity-60'}`}>
                      <div className="flex items-start gap-3">
                        <MessageSquare size={18} className="text-indigo-400 mt-1 shrink-0" />
                        <div className="text-indigo-100 leading-relaxed italic whitespace-pre-wrap">
                          {isExpanded ? (
                            <div className="space-y-2">
                              {highlightTranscript(log.transcript)}
                            </div>
                          ) : (
                            <p className="line-clamp-2">
                              "{log.transcript || 'No transcript recorded for this session.'}"
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    {!isExpanded && log.transcript && log.transcript.length > 100 && (
                      <p className="text-center text-xs text-indigo-400/60 mt-2 font-bold uppercase tracking-widest">Click to view full transcript</p>
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