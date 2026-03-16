import React, { useState, useEffect, useMemo } from 'react';
import { PatientProfile, SessionLog } from '../types';
import {
  AlertCircle, TrendingUp, MessageSquare,
  Clock, Activity, Download,
  ChevronLeft, ChevronRight, ChevronDown, ChevronUp,
  Sparkles, Loader2, TriangleAlert, ShieldCheck
} from 'lucide-react';
import {
  XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, AreaChart, Area
} from 'recharts';

// ─── Props ────────────────────────────────────────────────────────────────────
interface AnalyticsDashboardProps {
  patient: PatientProfile;
  logs: SessionLog[];
  onNavigateToLogs: (filter?: string) => void;
}

// ─── Internal data types ──────────────────────────────────────────────────────
interface DayEmotion {
  day: string;
  score: number;
  emotion: string;
  emoji: string;
  hasData: boolean;
}

interface KeywordItem {
  text: string;
  count: number;
  color: string;
}

interface AlertEvent {
  sessionId: string;
  timestamp: string;
  trigger: string;
}

interface WeekData {
  weekKey: string;
  range: string;
  sessionCount: number;
  totalPatientMessages: number;
  emotionByDay: DayEmotion[];
  engagementLevel: number;          // 0–100
  dailyMessageCounts: number[];     // [Mon, Tue, Wed, Thu, Fri, Sat, Sun]
  keywords: KeywordItem[];
  confusionCount: number;
  distressCount: number;
  alertEvents: AlertEvent[];
  bestHour: string;
  worstHour: string;
}

// ─── Detection keyword sets (mirror llm_chat.py) ─────────────────────────────
const TIER3_KW = [
  "fell", "can't move", "cannot move", "chest hurts", "chest pain",
  "can't breathe", "cannot breathe", "fire", "smoke", "burning",
  "kill myself", "want to die", "end my life", "suicide",
  "too many pills", "overdose", "took too many", "help me",
  "i'm bleeding", "not breathing", "unconscious", "emergency",
];
const TIER2_KW = [
  "scared", "afraid", "anxious", "panic", "frustrated", "angry",
  "lonely", "alone", "nobody cares", "burden",
  "crying", "can't stop crying", "lost my mind", "miserable",
  "worried", "confused", "lost", "forgot", "where am i",
  "don't know", "don't remember",
];
const POSITIVE_KW = [
  "happy", "love", "wonderful", "great", "beautiful", "remember",
  "fun", "laugh", "smile", "joy", "nice", "lovely", "peaceful",
  "calm", "grateful", "thank", "good", "delightful", "enjoy",
];

// ─── Stop words for keyword extraction ───────────────────────────────────────
const STOP = new Set([
  "i","me","my","we","our","you","your","he","she","it","they","them",
  "this","that","these","those","is","are","was","were","be","been",
  "being","have","has","had","do","does","did","will","would","could",
  "should","may","might","can","to","of","in","for","on","with","at",
  "by","from","as","into","through","about","before","after","a","an",
  "the","and","but","or","so","not","no","just","very","really","also",
  "up","out","if","then","than","too","when","what","who","which",
  "there","here","how","all","some","like","well","oh","yes","yeah",
  "ok","okay","um","know","think","want","feel","going","get","got",
  "go","come","see","said","say","tell","think","make","let","time",
  "im","its","thats","dont","cant","wont","didnt","ive","ill","id",
  "dont","its","its","more","one","two","three","her","his","their",
]);

const KEYWORD_COLORS = [
  'text-blue-400','text-emerald-400','text-rose-400','text-indigo-400',
  'text-amber-400','text-purple-400','text-cyan-400','text-pink-400',
  'text-teal-400','text-orange-400','text-lime-400','text-sky-400',
];

// ─── Helpers ──────────────────────────────────────────────────────────────────
const parseDate = (ts: string): Date => {
  const d = new Date(ts.replace(' ', 'T'));
  return isNaN(d.getTime()) ? new Date(ts.replace(/-/g, '/')) : d;
};

const parseTranscript = (raw: string) =>
  raw.split('\n').filter(Boolean).map(line => {
    const i = line.indexOf(':');
    return i === -1
      ? { sender: 'unknown', text: line }
      : { sender: line.slice(0, i).trim().toLowerCase(), text: line.slice(i + 1).trim() };
  });

const scoreMessage = (text: string): number => {
  const l = text.toLowerCase();
  if (TIER3_KW.some(kw => l.includes(kw))) return 18;
  if (TIER2_KW.some(kw => l.includes(kw))) return 40;
  if (POSITIVE_KW.some(kw => l.includes(kw))) return 80;
  return 60;
};

const scoreToEmotion = (score: number): { emotion: string; emoji: string } => {
  if (score >= 78) return { emotion: 'Joyful',    emoji: '🌟' };
  if (score >= 68) return { emotion: 'Happy',     emoji: '😄' };
  if (score >= 58) return { emotion: 'Content',   emoji: '😊' };
  if (score >= 48) return { emotion: 'Calm',      emoji: '😌' };
  if (score >= 36) return { emotion: 'Anxious',   emoji: '😟' };
  if (score >= 24) return { emotion: 'Distressed',emoji: '😢' };
  return              { emotion: 'In Crisis',  emoji: '🚨' };
};

const DAY_LABELS = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];

const dayIndex = (d: Date) => (d.getDay() + 6) % 7; // 0=Mon … 6=Sun

const getWeekBounds = (date: Date) => {
  const d = new Date(date);
  const diff = dayIndex(d);
  const monday = new Date(d); monday.setDate(d.getDate() - diff); monday.setHours(0,0,0,0);
  const sunday = new Date(monday); sunday.setDate(monday.getDate() + 6); sunday.setHours(23,59,59,999);
  return {
    key: monday.toISOString().slice(0,10),
    start: monday,
    end: sunday,
    label: `${monday.toLocaleDateString(undefined,{month:'short',day:'numeric'})} – ${sunday.toLocaleDateString(undefined,{month:'short',day:'numeric',year:'numeric'})}`,
  };
};

const formatHour = (h: number) => {
  const s = h % 12 || 12;
  const e = (h + 1) % 12 || 12;
  return `${s}:00 ${h < 12 ? 'AM' : 'PM'} – ${e}:00 ${h + 1 < 12 ? 'AM' : 'PM'}`;
};

// ─── Per-week analytics computation ──────────────────────────────────────────
function computeWeekData(
  sessions: SessionLog[],
  weekBounds: ReturnType<typeof getWeekBounds>,
  globalMaxMessages: number
): WeekData {
  // Emotion by day
  const dayScores: number[][] = Array.from({length:7}, () => []);
  const dayHasData = Array(7).fill(false);

  // Daily message counts
  const dailyCounts = Array(7).fill(0);

  // Keyword frequency
  const wordFreq: Record<string, number> = {};

  // Hour bucket for responsiveness
  const hourMsgCount: Record<number, number> = {};

  let confusionCount = 0;
  let distressCount = 0;
  const alertEvents: AlertEvent[] = [];
  let totalPatientMessages = 0;

  for (const session of sessions) {
    const sessionDate = parseDate(session.timestamp);
    const di = dayIndex(sessionDate);
    const hour = sessionDate.getHours();
    const messages = parseTranscript(session.transcript);

    const patientMsgs = messages.filter(m => m.sender === 'patient');
    totalPatientMessages += patientMsgs.length;
    dailyCounts[di] += patientMsgs.length;
    dayHasData[di] = true;

    for (const msg of patientMsgs) {
      const score = scoreMessage(msg.text);
      dayScores[di].push(score);

      const l = msg.text.toLowerCase();

      // Tier tracking
      if (TIER3_KW.some(kw => l.includes(kw))) {
        const trigger = TIER3_KW.find(kw => l.includes(kw)) || 'unknown';
        if (!alertEvents.find(e => e.sessionId === session.id)) {
          alertEvents.push({ sessionId: session.id, timestamp: session.timestamp, trigger });
        }
      }
      if (TIER2_KW.some(kw => l.includes(kw))) distressCount++;
      if (['confused','lost','forgot','don\'t know','don\'t remember','where am i'].some(kw => l.includes(kw))) confusionCount++;

      // Keyword extraction
      const words = msg.text.toLowerCase().replace(/[^a-z\s']/g, '').split(/\s+/);
      for (const w of words) {
        const clean = w.replace(/^'+|'+$/g, '');
        if (clean.length > 2 && !STOP.has(clean)) {
          wordFreq[clean] = (wordFreq[clean] || 0) + 1;
        }
      }

      hourMsgCount[hour] = (hourMsgCount[hour] || 0) + 1;
    }
  }

  // Emotion by day
  const emotionByDay: DayEmotion[] = DAY_LABELS.map((day, i) => {
    const scores = dayScores[i];
    const avg = scores.length > 0
      ? Math.round(scores.reduce((a,b) => a+b, 0) / scores.length)
      : 60;
    return {
      day,
      score: avg,
      hasData: dayHasData[i],
      ...scoreToEmotion(avg),
    };
  });

  // Engagement level
  const engagementLevel = globalMaxMessages > 0
    ? Math.min(100, Math.round((totalPatientMessages / globalMaxMessages) * 100))
    : 0;

  // Keywords — top 12 by frequency
  const keywords: KeywordItem[] = Object.entries(wordFreq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 12)
    .map(([text, count], i) => ({
      text: text.charAt(0).toUpperCase() + text.slice(1),
      count,
      color: KEYWORD_COLORS[i % KEYWORD_COLORS.length],
    }));

  // Best / worst hour
  const hourEntries = Object.entries(hourMsgCount).map(([h, c]) => ({ h: Number(h), c }));
  hourEntries.sort((a, b) => b.c - a.c);
  const bestHour  = hourEntries.length > 0 ? formatHour(hourEntries[0].h)  : 'Not enough data';
  const worstHour = hourEntries.length > 1 ? formatHour(hourEntries[hourEntries.length - 1].h) : 'Not enough data';

  return {
    weekKey: weekBounds.key,
    range: weekBounds.label,
    sessionCount: sessions.length,
    totalPatientMessages,
    emotionByDay,
    engagementLevel,
    dailyMessageCounts: dailyCounts,
    keywords,
    confusionCount,
    distressCount,
    alertEvents,
    bestHour,
    worstHour,
  };
}

// ─── LLM insights prompt ─────────────────────────────────────────────────────
function buildInsightsPrompt(patientName: string, w: WeekData): string {
  const avgScore = w.emotionByDay.filter(d => d.hasData).reduce((s,d) => s+d.score, 0)
    / (w.emotionByDay.filter(d => d.hasData).length || 1);
  const topKeywords = w.keywords.slice(0, 5).map(k => k.text).join(', ') || 'none recorded';
  return `You are a clinical AI assistant helping caregivers understand a dementia patient's wellbeing.

Patient: ${patientName}
Week: ${w.range}

Session Data Summary:
- Sessions: ${w.sessionCount}
- Total patient messages: ${w.totalPatientMessages}
- Average emotion score: ${Math.round(avgScore)}/100
- Confusion events: ${w.confusionCount}
- Distress events: ${w.distressCount}
- Emergency alerts: ${w.alertEvents.length}
- Top topics mentioned: ${topKeywords}
- Most responsive time: ${w.bestHour}
- Least responsive time: ${w.worstHour}

Write exactly 3 specific, actionable caregiver insights based ONLY on this data.
Focus on what actually happened — what worked, what to watch for, and concrete recommendations.

Respond ONLY with valid JSON (no markdown, no extra text):
{"insights":["Insight one.","Insight two.","Insight three."]}`;
}

// ─── Sub-components ───────────────────────────────────────────────────────────
const PaginationControls = ({
  current, total, onChange,
}: { current: number; total: number; onChange: (n: number) => void }) => (
  <div className="flex items-center gap-1 bg-[var(--nura-card)] rounded-lg p-1">
    <button
      disabled={current >= total - 1}
      onClick={e => { e.stopPropagation(); onChange(current + 1); }}
      className="p-1 hover:bg-white/10 rounded disabled:opacity-30 transition-all"
    >
      <ChevronLeft size={15} />
    </button>
    <span className="text-[10px] font-bold text-[var(--nura-dim)] uppercase tracking-tight px-1 min-w-[64px] text-center">
      {current === 0 ? 'This week' : `Week −${current}`}
    </span>
    <button
      disabled={current <= 0}
      onClick={e => { e.stopPropagation(); onChange(current - 1); }}
      className="p-1 hover:bg-white/10 rounded disabled:opacity-30 transition-all"
    >
      <ChevronRight size={15} />
    </button>
  </div>
);

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload as DayEmotion;
  return (
    <div className="bg-[var(--nura-bg)] border border-white/20 p-4 rounded-2xl shadow-2xl backdrop-blur-md">
      <p className="text-[var(--nura-dim)] text-[10px] font-black uppercase tracking-widest mb-2">{label}</p>
      {d.hasData ? (
        <div className="flex items-center gap-3">
          <span className="text-3xl">{d.emoji}</span>
          <div>
            <p className="text-[var(--nura-text)] font-black text-lg leading-none mb-1">{d.emotion}</p>
            <p className="text-[var(--nura-accent)] font-bold text-xs">Score: {d.score}%</p>
          </div>
        </div>
      ) : (
        <p className="text-[var(--nura-dim)] text-xs font-bold">No session</p>
      )}
    </div>
  );
};

// ─── Main component ───────────────────────────────────────────────────────────
export const AnalyticsDashboard: React.FC<AnalyticsDashboardProps> = ({
  patient, logs, onNavigateToLogs,
}) => {
  const patientName = patient.name || (patient as any).full_name || 'the patient';

  const [weekIndex, setWeekIndex]           = useState(0);
  const [hoveredWord, setHoveredWord]       = useState<string | null>(null);
  const [showDailyTime, setShowDailyTime]   = useState(false);
  const [llmInsights, setLlmInsights]       = useState<Record<string, string[]>>({});
  const [isGenerating, setIsGenerating]     = useState(false);

  // ── Group logs into weeks, compute analytics ────────────────────────────────
  const { weeksSorted, globalMaxMessages } = useMemo(() => {
    const buckets: Record<string, SessionLog[]> = {};
    for (const log of logs) {
      const bounds = getWeekBounds(parseDate(log.timestamp));
      if (!buckets[bounds.key]) buckets[bounds.key] = [];
      buckets[bounds.key].push(log);
    }

    // Global max for engagement normalisation
    let globalMaxMessages = 1;
    for (const sessions of Object.values(buckets)) {
      const total = sessions.reduce((s, log) =>
        s + parseTranscript(log.transcript).filter(m => m.sender === 'patient').length, 0);
      if (total > globalMaxMessages) globalMaxMessages = total;
    }

    const sorted = Object.keys(buckets).sort().reverse(); // newest first
    return { weeksSorted: sorted, globalMaxMessages };
  }, [logs]);

  const allWeekData = useMemo(() => {
    const buckets: Record<string, SessionLog[]> = {};
    for (const log of logs) {
      const bounds = getWeekBounds(parseDate(log.timestamp));
      if (!buckets[bounds.key]) buckets[bounds.key] = [];
      buckets[bounds.key].push(log);
    }
    return weeksSorted.map(key => {
      const bounds = getWeekBounds(parseDate(key + 'T12:00:00'));
      return computeWeekData(buckets[key] || [], bounds, globalMaxMessages);
    });
  }, [logs, weeksSorted, globalMaxMessages]);

  const currentWeek: WeekData | null = allWeekData[weekIndex] ?? null;

  // ── LLM insights generation ─────────────────────────────────────────────────
  useEffect(() => {
    if (!currentWeek) return;
    const key = currentWeek.weekKey;
    if (llmInsights[key] || isGenerating) return;
    if (currentWeek.sessionCount === 0) return;

    const generate = async () => {
      setIsGenerating(true);
      try {
        const res = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: 'claude-sonnet-4-6',
            max_tokens: 1000,
            messages: [{ role: 'user', content: buildInsightsPrompt(patientName, currentWeek) }],
          }),
        });
        const data = await res.json();
        const text = (data.content || []).map((b: any) => b.text || '').join('');
        const clean = text.replace(/```json|```/g, '').trim();
        const parsed = JSON.parse(clean);
        setLlmInsights(prev => ({ ...prev, [key]: parsed.insights || [] }));
      } catch {
        // Fallback to rule-based insights
        const w = currentWeek;
        const fallback: string[] = [];
        if (w.sessionCount > 0) {
          fallback.push(`${w.sessionCount} session${w.sessionCount !== 1 ? 's' : ''} completed this week with ${w.totalPatientMessages} patient messages recorded.`);
        }
        if (w.confusionCount > 0) {
          fallback.push(`${w.confusionCount} confusion event${w.confusionCount !== 1 ? 's' : ''} detected. Consider simplifying conversation topics and using more grounding statements.`);
        } else {
          fallback.push('No confusion events detected this week — patient appeared oriented during sessions.');
        }
        if (w.alertEvents.length > 0) {
          fallback.push(`⚠️ ${w.alertEvents.length} emergency alert${w.alertEvents.length !== 1 ? 's' : ''} triggered. Review session transcripts and discuss with the care team.`);
        } else if (w.keywords.length > 0) {
          fallback.push(`Most discussed topics this week: ${w.keywords.slice(0,3).map(k=>k.text).join(', ')}. Consider incorporating these into future sessions.`);
        } else {
          fallback.push('No specific topics stood out this week. Encourage conversations around known interests.');
        }
        setLlmInsights(prev => ({ ...prev, [key]: fallback }));
      } finally {
        setIsGenerating(false);
      }
    };
    generate();
  }, [weekIndex, currentWeek?.weekKey]);

  // ── Empty state (no logs at all) ────────────────────────────────────────────
  if (logs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <Activity size={48} className="text-[var(--nura-dim)]/20 mb-4" />
        <p className="text-[var(--nura-text)] font-black text-xl mb-2">No sessions yet</p>
        <p className="text-[var(--nura-dim)] text-sm max-w-sm">
          Analytics will appear here once {patientName} has completed chat sessions.
        </p>
      </div>
    );
  }

  const w = currentWeek!;
  const insights = currentWeek ? llmInsights[currentWeek.weekKey] : undefined;
  const prevWeek = allWeekData[weekIndex + 1];
  const engagementChange = prevWeek
    ? w.engagementLevel - prevWeek.engagementLevel
    : null;

  // Chart data — only days with data get a dot, rest show neutral line
  const chartData = w.emotionByDay;

  return (
    <div className="space-y-8 pb-20 pt-6">

      {/* ── A. Urgent Notifications ─────────────────────────────────────────── */}
      <section className={`p-6 rounded-3xl border ${
        w.alertEvents.length > 0
          ? 'bg-red-500/10 border-red-500/30'
          : 'bg-emerald-500/10 border-emerald-500/20'
      }`}>
        <h3 className={`flex items-center gap-3 text-xl font-black mb-4 ${
          w.alertEvents.length > 0 ? 'text-red-400' : 'text-emerald-400'
        }`}>
          {w.alertEvents.length > 0
            ? <><TriangleAlert /> Emergency Alerts — {w.alertEvents.length} Detected</>
            : <><ShieldCheck /> No Critical Alerts This Week</>
          }
        </h3>
        {w.alertEvents.length > 0 ? (
          <div className="space-y-3">
            {w.alertEvents.map((evt, i) => (
              <div key={i} className="bg-white/5 border border-red-500/20 p-4 rounded-2xl flex items-start gap-3">
                <AlertCircle size={18} className="text-red-400 mt-0.5 shrink-0" />
                <div>
                  <p className="font-black text-[var(--nura-text)] text-sm">
                    Emergency keyword detected: <span className="text-red-300">"{evt.trigger}"</span>
                  </p>
                  <p className="text-xs text-[var(--nura-dim)] mt-0.5">
                    Session on {parseDate(evt.timestamp).toLocaleDateString(undefined, { weekday:'long', month:'short', day:'numeric' })}
                    {' '}at {parseDate(evt.timestamp).toLocaleTimeString(undefined, { hour:'2-digit', minute:'2-digit' })}
                  </p>
                  <button
                    onClick={() => onNavigateToLogs('alert')}
                    className="mt-2 text-[10px] font-black text-red-400 uppercase tracking-widest hover:underline"
                  >
                    View Session Log →
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white/5 border border-emerald-500/20 p-4 rounded-2xl flex items-start gap-3">
            <ShieldCheck size={18} className="text-emerald-400 mt-0.5 shrink-0" />
            <div>
              <p className="font-black text-[var(--nura-text)] text-sm">System monitored all {w.sessionCount} session{w.sessionCount !== 1 ? 's' : ''} for distress, self-harm, and medical emergencies.</p>
              <p className="text-xs text-[var(--nura-dim)] mt-0.5">Everything appears stable this week.</p>
            </div>
          </div>
        )}
      </section>

      {/* ── B + C. Emotion chart + Engagement ──────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

        {/* B. Emotion & Cognitive Trend */}
        <section className="bg-[var(--nura-card)] p-8 rounded-3xl border border-white/5">
          <div className="flex items-center justify-between mb-6">
            <h3 className="flex items-center gap-3 text-xl font-bold text-indigo-100">
              <TrendingUp className="text-indigo-400" /> Emotion & Cognitive Trend
            </h3>
            <PaginationControls
              current={weekIndex} total={allWeekData.length}
              onChange={i => { setWeekIndex(i); setShowDailyTime(false); }}
            />
          </div>

          {w.sessionCount === 0 ? (
            <div className="h-[300px] flex items-center justify-center">
              <p className="text-[var(--nura-dim)] text-sm font-bold">No sessions this week</p>
            </div>
          ) : (
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top:10, right:10, left:0, bottom:20 }}>
                  <defs>
                    <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
                  <XAxis dataKey="day" stroke="#ffffff40" fontSize={12} tickLine={false} axisLine={false}
                    label={{ value:'Day of Week', position:'insideBottom', offset:-10, fill:'#ffffff40', fontSize:10, fontWeight:'bold' }}
                  />
                  <YAxis domain={[0,100]} stroke="#ffffff40" fontSize={12} tickLine={false} axisLine={false}
                    label={{ value:'Emotion Score', angle:-90, position:'insideLeft', fill:'#ffffff40', fontSize:10, fontWeight:'bold', offset:10 }}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Area type="monotone" dataKey="score" stroke="#6366f1" fillOpacity={1} fill="url(#colorScore)" strokeWidth={3}
                    dot={(props: any) => {
                      const { cx, cy, payload } = props;
                      if (!payload.hasData) return <circle key={props.key} cx={cx} cy={cy} r={3} fill="#6366f140" stroke="none" />;
                      return <circle key={props.key} cx={cx} cy={cy} r={5} fill="#6366f1" stroke="#1e1b4b" strokeWidth={2} />;
                    }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4 mt-6">
            <button
              onClick={() => onNavigateToLogs('confused')}
              className="bg-[var(--nura-bg)]/50 p-4 rounded-2xl text-left hover:bg-[var(--nura-accent)]/10 transition-all group border border-transparent hover:border-indigo-500/30"
            >
              <p className="text-xs text-[var(--nura-dim)] uppercase font-bold tracking-wider mb-1">Confusion Events</p>
              <p className="text-2xl font-black text-[var(--nura-text)]">
                {w.confusionCount}
                <span className="text-sm font-normal text-[var(--nura-dim)]/50 ml-1">this week</span>
              </p>
              <p className="text-[10px] text-indigo-400 font-bold mt-2 opacity-0 group-hover:opacity-100 transition-opacity">View Logs →</p>
            </button>
            <button
              onClick={() => onNavigateToLogs('trigger')}
              className="bg-[var(--nura-bg)]/50 p-4 rounded-2xl text-left hover:bg-[var(--nura-accent)]/10 transition-all group border border-transparent hover:border-red-500/30"
            >
              <p className="text-xs text-[var(--nura-dim)] uppercase font-bold tracking-wider mb-1">Distress Events</p>
              <p className="text-2xl font-black text-[var(--nura-text)]">
                {w.distressCount}
                <span className="text-sm font-normal text-[var(--nura-dim)]/50 ml-1">detected</span>
              </p>
              <p className="text-[10px] text-red-400 font-bold mt-2 opacity-0 group-hover:opacity-100 transition-opacity">View Logs →</p>
            </button>
          </div>
        </section>

        {/* C. Engagement Progress */}
        <div className="space-y-8">
          <section className="bg-[var(--nura-card)] p-8 rounded-3xl border border-white/5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="flex items-center gap-3 text-xl font-bold text-indigo-100">
                <Activity className="text-emerald-400" /> Engagement Progress
              </h3>
              <PaginationControls
                current={weekIndex} total={allWeekData.length}
                onChange={i => { setWeekIndex(i); setShowDailyTime(false); }}
              />
            </div>

            <div className="space-y-6">
              <div>
                <div className="flex justify-between mb-2">
                  <span className="text-sm font-bold text-indigo-200">Interaction Level</span>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-emerald-400">{w.engagementLevel}%</span>
                    {engagementChange !== null && (
                      <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                        engagementChange >= 0
                          ? 'bg-emerald-500/10 text-emerald-400'
                          : 'bg-red-500/10 text-red-400'
                      }`}>
                        {engagementChange >= 0 ? '+' : ''}{engagementChange}%
                      </span>
                    )}
                  </div>
                </div>
                <div className="h-3 bg-[var(--nura-bg)]/60 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-emerald-500 rounded-full shadow-[0_0_10px_rgba(16,185,129,0.5)] transition-all duration-1000"
                    style={{ width: `${w.engagementLevel}%` }}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <button
                  onClick={() => setShowDailyTime(!showDailyTime)}
                  className="w-full flex items-center justify-between bg-[var(--nura-bg)]/50 p-4 rounded-2xl hover:bg-white/5 transition-all group"
                >
                  <div className="flex items-center gap-3">
                    <Clock className="text-indigo-400" size={20} />
                    <span className="text-sm text-indigo-200 font-medium">Messages per Day</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-lg font-black text-[var(--nura-text)]">
                      {w.totalPatientMessages}
                      <span className="text-xs font-normal text-[var(--nura-dim)]/50 ml-1">total</span>
                    </span>
                    {showDailyTime
                      ? <ChevronUp size={16} className="text-indigo-400" />
                      : <ChevronDown size={16} className="text-indigo-400" />}
                  </div>
                </button>

                {showDailyTime && (
                  <div className="bg-black/20 rounded-2xl p-4 border border-white/5 animate-in slide-in-from-top-2 duration-300">
                    <p className="text-[10px] font-bold text-[var(--nura-dim)] uppercase tracking-widest mb-3">
                      Daily Patient Messages
                    </p>
                    <div className="flex items-end justify-between h-20 gap-1 px-2">
                      {DAY_LABELS.map((day, i) => {
                        const max = Math.max(...w.dailyMessageCounts, 1);
                        const pct = (w.dailyMessageCounts[i] / max) * 100;
                        return (
                          <div key={day} className="flex flex-col items-center gap-1 flex-1">
                            <div
                              className="w-full bg-indigo-500/40 hover:bg-indigo-500/70 rounded-t-sm transition-all duration-500 relative group/bar"
                              style={{ height: `${Math.max(4, pct)}%` }}
                            >
                              {w.dailyMessageCounts[i] > 0 && (
                                <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-[var(--nura-bg)] border border-white/10 px-1.5 py-0.5 rounded text-[9px] font-black text-[var(--nura-text)] opacity-0 group-hover/bar:opacity-100 transition-opacity whitespace-nowrap">
                                  {w.dailyMessageCounts[i]}
                                </div>
                              )}
                            </div>
                            <span className="text-[8px] font-bold text-[var(--nura-dim)]/50">{day.slice(0,1)}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </section>

          {/* D. Common Keywords */}
          <section className="bg-[var(--nura-card)] p-8 rounded-3xl border border-white/5">
            <div className="flex items-center justify-between mb-6">
              <h3 className="flex items-center gap-3 text-xl font-bold text-indigo-100">
                <MessageSquare className="text-blue-400" /> Common Keywords
              </h3>
              <PaginationControls
                current={weekIndex} total={allWeekData.length}
                onChange={i => setWeekIndex(i)}
              />
            </div>

            {w.keywords.length === 0 ? (
              <div className="flex items-center justify-center min-h-[120px]">
                <p className="text-[var(--nura-dim)] text-sm font-bold">No keywords recorded this week</p>
              </div>
            ) : (
              <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-5 min-h-[140px] p-2">
                {w.keywords.map((word, idx) => {
                  const size = Math.max(0.75, Math.min(2.2, word.count / 5));
                  const isHovered = hoveredWord === word.text;
                  return (
                    <div
                      key={word.text}
                      className={`relative cursor-default ${idx % 3 === 0 ? 'mt-3' : idx % 3 === 1 ? 'mb-3' : ''}`}
                      onMouseEnter={() => setHoveredWord(word.text)}
                      onMouseLeave={() => setHoveredWord(null)}
                    >
                      <span
                        style={{ fontSize: `${size}rem` }}
                        className={`font-black transition-all duration-300 ${word.color} ${
                          isHovered ? 'drop-shadow-[0_0_10px_currentColor] opacity-100' : 'opacity-60 hover:opacity-80'
                        }`}
                      >
                        {word.text}
                      </span>
                      {isHovered && (
                        <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-[var(--nura-bg)] border border-white/10 px-3 py-1.5 rounded-xl shadow-xl z-50 whitespace-nowrap animate-in zoom-in-95 duration-150">
                          <p className="text-[10px] font-bold text-[var(--nura-dim)] uppercase tracking-widest">Mentioned</p>
                          <p className="text-sm font-black text-[var(--nura-text)]">{word.count}×</p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </div>
      </div>

      {/* ── E. Weekly Summary (AI-powered) ──────────────────────────────────── */}
      <section className="bg-[var(--nura-card)] p-10 rounded-[2.5rem] border border-white/5 relative overflow-hidden">
        <div className="absolute top-0 left-0 p-8">
          <PaginationControls
            current={weekIndex} total={allWeekData.length}
            onChange={i => setWeekIndex(i)}
          />
        </div>
        <div className="absolute top-0 right-0 p-8">
          <button
            onClick={() => window.print()}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-500 hover:bg-indigo-600 rounded-xl text-sm font-bold transition-all shadow-lg"
          >
            <Download size={16} /> Export
          </button>
        </div>

        <div className="max-w-2xl mx-auto pt-8">
          <div className="text-center mb-10">
            <h2 className="text-3xl font-black text-[var(--nura-text)] mb-2">Weekly Care Summary</h2>
            <p className="text-[var(--nura-dim)] font-medium">{w.range}</p>
            {w.sessionCount === 0 && (
              <p className="text-amber-400 text-sm font-bold mt-2">No sessions recorded this week</p>
            )}
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
                    <span className="text-[var(--nura-dim)]/70">Most Active:</span>
                    <span className="text-[var(--nura-text)] font-bold">{w.bestHour}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-[var(--nura-dim)]/70">Least Active:</span>
                    <span className="text-[var(--nura-text)] font-bold">{w.worstHour}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-[var(--nura-dim)]/70">Sessions:</span>
                    <span className="text-[var(--nura-text)] font-bold">{w.sessionCount}</span>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center gap-3 text-indigo-200 font-bold">
                  <Activity size={20} className="text-emerald-400" />
                  Engagement
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-3xl font-black text-[var(--nura-text)]">{w.engagementLevel}%</span>
                  {engagementChange !== null && (
                    <span className={`text-xs font-bold px-2 py-1 rounded-md ${
                      engagementChange >= 0
                        ? 'bg-emerald-500/10 text-emerald-400'
                        : 'bg-red-500/10 text-red-400'
                    }`}>
                      {engagementChange >= 0 ? '+' : ''}{engagementChange}% vs last week
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* AI-generated insights */}
            <div className="border-t border-white/5 pt-8">
              <h4 className="flex items-center gap-2 text-sm font-bold text-[var(--nura-dim)] uppercase tracking-widest mb-4">
                <Sparkles size={14} className="text-indigo-400" />
                AI Caregiver Insights
              </h4>

              {isGenerating ? (
                <div className="flex items-center gap-3 py-6 text-[var(--nura-dim)]">
                  <Loader2 size={18} className="animate-spin text-indigo-400" />
                  <span className="text-sm font-medium">Analysing session data…</span>
                </div>
              ) : insights && insights.length > 0 ? (
                <ul className="space-y-3 text-indigo-100 leading-relaxed">
                  {insights.map((insight, i) => (
                    <li key={i} className="flex items-start gap-3">
                      <div className="w-1.5 h-1.5 rounded-full bg-indigo-400 mt-2 shrink-0" />
                      <span className="text-sm">{insight}</span>
                    </li>
                  ))}
                </ul>
              ) : w.sessionCount === 0 ? (
                <p className="text-[var(--nura-dim)] text-sm font-bold py-4">
                  No sessions to analyse for this week.
                </p>
              ) : (
                <div className="flex items-center gap-3 py-4 text-[var(--nura-dim)]">
                  <Loader2 size={18} className="animate-spin text-indigo-400" />
                  <span className="text-sm">Loading insights…</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

