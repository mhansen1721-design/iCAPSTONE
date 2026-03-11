
import React, { useState } from 'react';
import { SessionLog } from '../types';
import { ChevronLeft, History, Calendar, User, MessageSquare, ChevronDown, ChevronUp, Search, X } from 'lucide-react';

interface SessionLogsProps {
  logs: SessionLog[];
  onBack: () => void;
  isSubView?: boolean;
  initialFilter?: string;
}

export const SessionLogs: React.FC<SessionLogsProps> = ({ logs, onBack, isSubView, initialFilter }) => {
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState(initialFilter || '');

  const toggleExpand = (id: string) => {
    setExpandedLogId(expandedLogId === id ? null : id);
  };

  const filteredLogs = logs
    .filter(log => 
      log.transcript.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.patientName.toLowerCase().includes(searchQuery.toLowerCase())
    )
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  const highlightTranscript = (text: string) => {
    if (!text) return 'No transcript recorded for this session.';

    const positiveWords = ['happy', 'love', 'wonderful', 'good', 'great', 'smile', 'joy', 'remember', 'peaceful'];
    const urgentWords = ['lonely', 'anxious', 'pain', 'hurt', 'scared', 'confused', 'hospital', 'bills', 'where is', 'forgot', 'lost'];

    // Create a regex that matches any of the words (case insensitive)
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
    <div className="w-full max-w-4xl mx-auto p-6 animate-in fade-in duration-700">
      {!isSubView && (
        <header className="mb-8 mt-4 flex items-center justify-between border-b border-white/5 pb-4 relative">
          <button 
            onClick={onBack}
            className="p-2 hover:bg-white/10 rounded-full transition-all active:scale-90 glass-panel border-white/10 shadow-lg shadow-indigo-500/10"
            aria-label="Go back to dashboard"
          >
            <ChevronLeft size={24} className="text-indigo-200" />
          </button>

          <div className="flex-1 text-center">
            <h1 className="text-3xl font-extrabold mb-1 tracking-tight text-white">Session Logs</h1>
            <p className="text-indigo-200/90 text-base font-medium">Review patient interaction transcripts</p>
          </div>
          
          <div className="w-[42px]" aria-hidden="true" />
        </header>
      )}

      <div className="mb-8 relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-indigo-400" size={20} />
        <input 
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search transcripts, keywords, or patient names..."
          className="w-full bg-black/20 border border-white/10 rounded-2xl py-4 pl-12 pr-12 text-white focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-400/20 transition-all placeholder:text-white/20"
        />
        {searchQuery && (
          <button 
            onClick={() => setSearchQuery('')}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-indigo-400 hover:text-white transition-colors"
          >
            <X size={20} />
          </button>
        )}
      </div>

      <div className="space-y-6">
        {filteredLogs.length === 0 ? (
          <div className="glass-panel p-12 rounded-3xl text-center border-white/10">
            <History size={48} className="mx-auto mb-4 text-indigo-300/50" />
            <p className="text-indigo-200 text-lg">No session logs found matching your search.</p>
          </div>
        ) : (
          filteredLogs.map((log) => {
            const isExpanded = expandedLogId === log.id;
            return (
              <div 
                key={log.id} 
                onClick={() => toggleExpand(log.id)}
                className={`glass-panel p-6 rounded-3xl border-white/10 shadow-xl cursor-pointer transition-all duration-300 ${isExpanded ? 'ring-2 ring-indigo-500/30 bg-white/5' : 'hover:bg-white/5'}`}
              >
                <div className="flex flex-wrap items-center justify-between gap-4 mb-4 pb-4 border-b border-white/5">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-indigo-500/20 flex items-center justify-center">
                      <User size={20} className="text-indigo-300" />
                    </div>
                    <div>
                      <h3 className="font-bold text-white">{log.patientName}</h3>
                      <div className="flex items-center gap-1 text-xs text-indigo-300/70">
                        <Calendar size={12} />
                        {new Date(log.timestamp).toLocaleString()}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="px-3 py-1 rounded-full bg-green-500/10 border border-green-500/20 text-green-400 text-xs font-bold uppercase tracking-wider">
                      Completed
                    </div>
                    {isExpanded ? <ChevronUp size={20} className="text-indigo-300" /> : <ChevronDown size={20} className="text-indigo-300" />}
                  </div>
                </div>
                
                <div className={`bg-black/20 rounded-2xl p-4 border border-white/5 transition-all duration-500 overflow-hidden ${isExpanded ? 'max-h-[1000px] opacity-100' : 'max-h-24 opacity-60'}`}>
                  <div className="flex items-start gap-3">
                    <MessageSquare size={18} className="text-indigo-400 mt-1 shrink-0" />
                    <div className="text-indigo-100 leading-relaxed italic">
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
          })
        )}
      </div>
    </div>
  );
};
