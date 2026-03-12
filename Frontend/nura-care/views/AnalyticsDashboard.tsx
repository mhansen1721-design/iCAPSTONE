
import React from 'react';
import { PatientProfile, SessionLog } from '../types';
import { 
  AlertCircle, TrendingUp, Brain, MessageSquare, 
  Clock, Heart, Activity, FileText, Download,
  ChevronLeft, ChevronRight, ChevronDown, ChevronUp
} from 'lucide-react';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, 
  Tooltip, ResponsiveContainer, AreaChart, Area 
} from 'recharts';

interface AnalyticsDashboardProps {
  patient: PatientProfile;
  logs: SessionLog[];
  onNavigateToLogs: (filter?: string) => void;
}

// Mock data for multiple weeks
const EMOTION_WEEKS = [
  [
    { day: 'Mon', score: 65, emotion: 'Content', emoji: '😊' },
    { day: 'Tue', score: 72, emotion: 'Happy', emoji: '😄' },
    { day: 'Wed', score: 58, emotion: 'Confused', emoji: '😕' },
    { day: 'Thu', score: 80, emotion: 'Joyful', emoji: '🌟' },
    { day: 'Fri', score: 68, emotion: 'Calm', emoji: '😌' },
    { day: 'Sat', score: 75, emotion: 'Cheerful', emoji: '🌻' },
    { day: 'Sun', score: 85, emotion: 'Excellent', emoji: '🌈' },
  ],
  [
    { day: 'Mon', score: 60, emotion: 'Tired', emoji: '😴' },
    { day: 'Tue', score: 65, emotion: 'Content', emoji: '😊' },
    { day: 'Wed', score: 70, emotion: 'Happy', emoji: '😄' },
    { day: 'Thu', score: 62, emotion: 'Quiet', emoji: '😶' },
    { day: 'Fri', score: 55, emotion: 'Anxious', emoji: '😟' },
    { day: 'Sat', score: 68, emotion: 'Calm', emoji: '😌' },
    { day: 'Sun', score: 72, emotion: 'Happy', emoji: '😄' },
  ]
];

const ENGAGEMENT_WEEKS = [
  { level: 84, avgTime: 4.2, daily: [45, 30, 60, 20, 50, 40, 35] },
  { level: 78, avgTime: 3.8, daily: [30, 40, 25, 45, 35, 30, 20] }
];

const KEYWORD_WEEKS = [
  [
    { text: 'Piano', count: 42, color: 'text-blue-400' },
    { text: 'Garden', count: 38, color: 'text-emerald-400' },
    { text: 'Roses', count: 35, color: 'text-rose-400' },
    { text: 'Classical', count: 28, color: 'text-indigo-400' },
    { text: 'Spring', count: 22, color: 'text-amber-400' },
    { text: 'Jane', count: 18, color: 'text-purple-400' },
    { text: 'Home', count: 15, color: 'text-slate-400' },
    { text: 'Hospital', count: 5, color: 'text-red-400' },
  ],
  [
    { text: 'Family', count: 30, color: 'text-blue-400' },
    { text: 'Coffee', count: 25, color: 'text-amber-400' },
    { text: 'Books', count: 20, color: 'text-emerald-400' },
    { text: 'Rain', count: 15, color: 'text-indigo-400' },
    { text: 'Winter', count: 12, color: 'text-slate-400' },
  ]
];

const SUMMARY_WEEKS = [
  { range: 'Mar 1 - Mar 7, 2026', engagement: 84, change: '+5%' },
  { range: 'Feb 22 - Feb 28, 2026', engagement: 79, change: '+2%' }
];

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-indigo-950/90 border border-white/10 p-4 rounded-2xl shadow-2xl backdrop-blur-md">
        <p className="text-[var(--nura-dim)] text-xs font-bold uppercase tracking-wider mb-2">{label}</p>
        <div className="flex items-center gap-3">
          <span className="text-3xl">{data.emoji}</span>
          <div>
            <p className="text-[var(--nura-text)] font-black text-lg">{data.emotion}</p>
            <p className="text-indigo-200/60 text-xs">Score: {data.score}%</p>
          </div>
        </div>
      </div>
    );
  }
  return null;
};

export const AnalyticsDashboard: React.FC<AnalyticsDashboardProps> = ({ patient, logs, onNavigateToLogs }) => {
  const [hoveredWord, setHoveredWord] = React.useState<string | null>(null);
  const [emotionWeek, setEmotionWeek] = React.useState(0);
  const [engagementWeek, setEngagementWeek] = React.useState(0);
  const [keywordWeek, setKeywordWeek] = React.useState(0);
  const [summaryWeek, setSummaryWeek] = React.useState(0);
  const [showDailyTime, setShowDailyTime] = React.useState(false);

  const PaginationControls = ({ current, total, onChange }: { current: number, total: number, onChange: (n: number) => void }) => (
    <div className="flex items-center gap-2 bg-[var(--nura-card)] rounded-lg p-1">
      <button 
        disabled={current >= total - 1}
        onClick={(e) => { e.stopPropagation(); onChange(current + 1); }}
        className="p-1 hover:bg-nura-accent/20 rounded disabled:opacity-30 transition-colors"
      >
        <ChevronLeft size={16} />
      </button>
      <span className="text-[10px] font-bold text-[var(--nura-dim)] uppercase tracking-tighter">
        {current === 0 ? 'Current' : `Week -${current}`}
      </span>
      <button 
        disabled={current <= 0}
        onClick={(e) => { e.stopPropagation(); onChange(current - 1); }}
        className="p-1 hover:bg-nura-accent/20 rounded disabled:opacity-30 transition-colors"
      >
        <ChevronRight size={16} />
      </button>
    </div>
  );

  return (
    <div className="space-y-8 pb-20">
      {/* A. Urgent Notifications */}
      <section className="bg-[var(--nura-card)] p-6 rounded-3xl border-red-500/20 bg-red-500/5">
        <h3 className="flex items-center gap-3 text-xl font-bold mb-4 text-red-200">
          <AlertCircle className="text-red-400" /> Urgent Notifications
        </h3>
        <div className="space-y-3">
          <div className="bg-red-500/10 border border-red-500/20 p-4 rounded-2xl flex items-start gap-3">
            <AlertCircle size={20} className="text-red-400 mt-1 shrink-0" />
            <div>
              <p className="font-bold text-red-100">No critical health alerts detected this week.</p>
              <p className="text-sm text-red-200/70">System monitored for signs of distress, self-harm, or medical emergencies.</p>
            </div>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* B. Emotion Log Dashboard */}
        <section className="bg-[var(--nura-card)] p-8 rounded-3xl border-white/10">
          <div className="flex items-center justify-between mb-6">
            <h3 className="flex items-center gap-3 text-xl font-bold text-indigo-100">
              <TrendingUp className="text-indigo-400" /> Emotion & Cognitive Trend
            </h3>
            <PaginationControls current={emotionWeek} total={EMOTION_WEEKS.length} onChange={setEmotionWeek} />
          </div>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={EMOTION_WEEKS[emotionWeek]} margin={{ top: 10, right: 10, left: 0, bottom: 20 }}>
                <defs>
                  <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
                <XAxis 
                  dataKey="day" 
                  stroke="#ffffff40" 
                  fontSize={12} 
                  tickLine={false} 
                  axisLine={false}
                  label={{ value: 'Day of Week', position: 'insideBottom', offset: -10, fill: '#ffffff40', fontSize: 10, fontWeight: 'bold' }}
                />
                <YAxis 
                  stroke="#ffffff40" 
                  fontSize={12} 
                  tickLine={false} 
                  axisLine={false}
                  label={{ value: 'Emotion Score', angle: -90, position: 'insideLeft', fill: '#ffffff40', fontSize: 10, fontWeight: 'bold', offset: 10 }}
                />
                <Tooltip content={<CustomTooltip />} />
                <Area type="monotone" dataKey="score" stroke="#6366f1" fillOpacity={1} fill="url(#colorScore)" strokeWidth={3} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <div className="grid grid-cols-2 gap-4 mt-6">
            <button 
              onClick={() => onNavigateToLogs('confused')}
              className="bg-[var(--nura-card)] p-4 rounded-2xl text-left hover:bg-nura-accent/20 transition-all group border border-transparent hover:border-indigo-500/30"
            >
              <p className="text-xs text-[var(--nura-dim)] uppercase font-bold tracking-wider mb-1 group-hover:text-indigo-200">Confusion Events</p>
              <p className="text-2xl font-black text-[var(--nura-text)]">10 <span className="text-sm font-normal text-[var(--nura-dim)]/50">this week</span></p>
              <p className="text-[10px] text-indigo-400 font-bold mt-2 opacity-0 group-hover:opacity-100 transition-opacity">View Logs →</p>
            </button>
            <button 
              onClick={() => onNavigateToLogs('trigger')}
              className="bg-[var(--nura-card)] p-4 rounded-2xl text-left hover:bg-nura-accent/20 transition-all group border border-transparent hover:border-red-500/30"
            >
              <p className="text-xs text-[var(--nura-dim)] uppercase font-bold tracking-wider mb-1 group-hover:text-indigo-200">Distress Triggers</p>
              <p className="text-2xl font-black text-[var(--nura-text)]">3 <span className="text-sm font-normal text-[var(--nura-dim)]/50">detected</span></p>
              <p className="text-[10px] text-red-400 font-bold mt-2 opacity-0 group-hover:opacity-100 transition-opacity">View Logs →</p>
            </button>
          </div>
        </section>

        {/* C & D. Engagement Progress & Keywords */}
        <div className="space-y-8">
          <section className="bg-[var(--nura-card)] p-8 rounded-3xl border-white/10">
            <div className="flex items-center justify-between mb-4">
              <h3 className="flex items-center gap-3 text-xl font-bold text-indigo-100">
                <Activity className="text-emerald-400" /> Engagement Progress
              </h3>
              <PaginationControls current={engagementWeek} total={ENGAGEMENT_WEEKS.length} onChange={setEngagementWeek} />
            </div>
            <div className="space-y-6">
              <div>
                <div className="flex justify-between mb-2">
                  <span className="text-sm font-bold text-indigo-200">Interaction Level</span>
                  <span className="text-sm font-bold text-emerald-400">{ENGAGEMENT_WEEKS[engagementWeek].level}%</span>
                </div>
                <div className="h-3 bg-nura-card rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-emerald-500 rounded-full shadow-[0_0_10px_rgba(16,185,129,0.5)] transition-all duration-1000" 
                    style={{ width: `${ENGAGEMENT_WEEKS[engagementWeek].level}%` }}
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <button 
                  onClick={() => setShowDailyTime(!showDailyTime)}
                  className="w-full flex items-center justify-between bg-[var(--nura-card)] p-4 rounded-2xl hover:bg-nura-accent/20 transition-all group"
                >
                  <div className="flex items-center gap-3">
                    <Clock className="text-indigo-400" size={20} />
                    <span className="text-sm text-indigo-200 font-medium">Average Time Spent in Chat</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xl font-black text-[var(--nura-text)]">{ENGAGEMENT_WEEKS[engagementWeek].avgTime} <span className="text-xs font-normal text-[var(--nura-dim)]/50">hrs/week</span></span>
                    {showDailyTime ? <ChevronUp size={16} className="text-indigo-400" /> : <ChevronDown size={16} className="text-indigo-400" />}
                  </div>
                </button>
                
                {showDailyTime && (
                  <div className="bg-black/20 rounded-2xl p-4 border border-white/5 animate-in slide-in-from-top-2 duration-300">
                    <p className="text-[10px] font-bold text-[var(--nura-dim)] uppercase tracking-widest mb-3">Daily Breakdown (Minutes)</p>
                    <div className="flex items-end justify-between h-20 gap-1 px-2">
                      {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((day, i) => (
                        <div key={i} className="flex flex-col items-center gap-1 flex-1">
                          <div 
                            className="w-full bg-indigo-500/40 rounded-t-sm transition-all duration-500" 
                            style={{ height: `${(ENGAGEMENT_WEEKS[engagementWeek].daily[i] / 60) * 100}%` }}
                          />
                          <span className="text-[8px] font-bold text-[var(--nura-dim)]/50">{day}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </section>

          <section className="bg-[var(--nura-card)] p-8 rounded-3xl border-white/10">
            <div className="flex items-center justify-between mb-6">
              <h3 className="flex items-center gap-3 text-xl font-bold text-indigo-100">
                <MessageSquare className="text-blue-400" /> Common Keywords
              </h3>
              <PaginationControls current={keywordWeek} total={KEYWORD_WEEKS.length} onChange={setKeywordWeek} />
            </div>
            <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-6 min-h-[160px] relative p-4">
              {KEYWORD_WEEKS[keywordWeek].map((word, idx) => {
                const size = Math.max(0.8, Math.min(2.5, word.count / 15));
                const isHovered = hoveredWord === word.text;
                
                // Simulate a bubble cluster by varying margins and alignment
                const offsetClass = idx % 3 === 0 ? 'mt-4' : idx % 3 === 1 ? 'mb-4' : '';
                
                return (
                  <div 
                    key={word.text}
                    className={`relative group cursor-default ${offsetClass}`}
                    onMouseEnter={() => setHoveredWord(word.text)}
                    onMouseLeave={() => setHoveredWord(null)}
                  >
                    <span 
                      style={{ fontSize: `${size}rem` }}
                      className={`font-black transition-all duration-500 ${word.color} ${isHovered ? 'scale-125 drop-shadow-[0_0_12px_currentColor] z-10' : 'opacity-60 blur-[0.5px] hover:blur-0'}`}
                    >
                      {word.text}
                    </span>
                    
                    {isHovered && (
                      <div className="absolute -top-12 left-1/2 -translate-x-1/2 bg-indigo-950 border border-white/10 px-3 py-1 rounded-lg shadow-xl z-50 whitespace-nowrap animate-in zoom-in-95 duration-200">
                        <p className="text-[10px] font-bold text-[var(--nura-dim)] uppercase tracking-widest">Repeated</p>
                        <p className="text-sm font-black text-[var(--nura-text)]">{word.count} times</p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        </div>
      </div>

      {/* E. Weekly Summary (PDF-like) */}
      <section className="bg-[var(--nura-card)] p-10 rounded-[2.5rem] border-white/10 bg-[var(--nura-card)] relative overflow-hidden">
        <div className="absolute top-0 left-0 p-8">
          <PaginationControls current={summaryWeek} total={SUMMARY_WEEKS.length} onChange={setSummaryWeek} />
        </div>
        <div className="absolute top-0 right-0 p-8">
          <button className="flex items-center gap-2 px-4 py-2 bg-indigo-500 hover:bg-indigo-600 rounded-xl text-sm font-bold transition-all shadow-lg">
            <Download size={16} /> Export PDF
          </button>
        </div>
        
        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-10">
            <h2 className="text-3xl font-black text-[var(--nura-text)] mb-2">Weekly Care Summary</h2>
            <p className="text-[var(--nura-dim)] font-medium">{SUMMARY_WEEKS[summaryWeek].range}</p>
          </div>

          <div className="space-y-8">
            <div className="grid grid-cols-2 gap-8">
              <div className="space-y-4">
                <div className="flex items-center gap-3 text-indigo-200 font-bold">
                  <Clock size={20} className="text-indigo-400" />
                  Responsiveness
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-[var(--nura-dim)]/70">Most Responsive:</span>
                    <span className="text-[var(--nura-text)] font-bold">10:00 AM - 11:30 AM</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-[var(--nura-dim)]/70">Least Responsive:</span>
                    <span className="text-[var(--nura-text)] font-bold">4:00 PM - 6:00 PM</span>
                  </div>
                </div>
              </div>
              
              <div className="space-y-4">
                <div className="flex items-center gap-3 text-indigo-200 font-bold">
                  <Activity size={20} className="text-emerald-400" />
                  Engagement
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-3xl font-black text-[var(--nura-text)]">{SUMMARY_WEEKS[summaryWeek].engagement}%</span>
                  <span className={`text-xs font-bold bg-emerald-500/10 px-2 py-1 rounded-md ${SUMMARY_WEEKS[summaryWeek].change.startsWith('+') ? 'text-emerald-400' : 'text-red-400'}`}>
                    {SUMMARY_WEEKS[summaryWeek].change} from last week
                  </span>
                </div>
              </div>
            </div>

            <div className="border-t border-white/5 pt-8">
              <h4 className="text-sm font-bold text-[var(--nura-dim)] uppercase tracking-widest mb-4">Caregiver Insights</h4>
              <ul className="space-y-3 text-indigo-100 leading-relaxed">
                <li className="flex items-start gap-3">
                  <div className="w-1.5 h-1.5 rounded-full bg-indigo-400 mt-2 shrink-0" />
                  <span>Patient showed increased engagement when discussing <strong>classical music</strong>.</span>
                </li>
                <li className="flex items-start gap-3">
                  <div className="w-1.5 h-1.5 rounded-full bg-indigo-400 mt-2 shrink-0" />
                  <span>Slight distress detected on Wednesday regarding <strong>hospital bills</strong>; AI successfully redirected to gardening topics.</span>
                </li>
                <li className="flex items-start gap-3">
                  <div className="w-1.5 h-1.5 rounded-full bg-indigo-400 mt-2 shrink-0" />
                  <span>Cognitive clarity is highest in the mornings. Recommend scheduling important activities before noon.</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

