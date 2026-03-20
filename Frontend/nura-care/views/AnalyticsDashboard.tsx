import React, { useState, useEffect, useMemo } from 'react';
import { PatientProfile, SessionLog } from '../types';
import {
  AlertCircle, TrendingUp, MessageSquare,
  Clock, Activity, Download,
  ChevronLeft, ChevronRight, ChevronDown, ChevronUp,
  Sparkles, Loader2, TriangleAlert, ShieldCheck,
  Printer, Calendar, Heart, Brain
} from 'lucide-react';
import {
  XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, AreaChart, Area
} from 'recharts';
import { GoogleGenAI, Type } from '@google/genai';

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

interface WeeklyInsights {
  generalSummary: string;
  notableConversations: string[];
  caregiverRecommendations: string[];
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
  // Pronouns
  "i","me","my","myself","we","our","ours","ourselves","you","your","yours",
  "yourself","he","him","his","himself","she","her","hers","herself",
  "it","its","itself","they","them","their","theirs","themselves",
  // Demonstratives / articles
  "this","that","these","those","a","an","the",
  // To be / auxiliaries
  "is","are","was","were","be","been","being","am",
  "have","has","had","having","do","does","did","doing",
  "will","would","could","should","may","might","can","shall","must",
  // Prepositions / conjunctions
  "to","of","in","for","on","with","at","by","from","as","into",
  "through","about","before","after","between","against","during",
  "without","within","along","following","across","behind","beyond",
  "and","but","or","nor","so","yet","both","either","neither","if",
  "then","than","though","although","because","since","while","when",
  "where","which","who","whom","whose","what","how","whether","until",
  // Common adverbs / fillers
  "not","no","nor","up","out","too","very","really","also","just",
  "still","here","there","now","then","already","always","never",
  "sometimes","often","again","almost","even","ever","quite","rather",
  "soon","yet","today","tomorrow","yesterday","back","away","around",
  "maybe","perhaps","probably","actually","certainly","definitely",
  "usually","generally","basically","literally","totally","anyway",
  // Common verbs that add no topic signal
  "go","goes","going","went","gone","get","gets","getting","got",
  "come","comes","coming","came","make","makes","making","made",
  "let","lets","know","knows","knowing","knew","think","thinks",
  "thinking","thought","want","wants","wanting","wanted","feel","feels",
  "feeling","felt","see","sees","seeing","saw","seen","say","says",
  "saying","said","tell","tells","telling","told","ask","asked","use",
  "used","using","try","tried","trying","put","take","takes","took",
  "seem","seems","seemed","look","looks","looked","need","needs",
  "talk","talking","talked","spoke","speak","speaking","call","called",
  "keep","kept","give","gave","find","found","show","showed","start",
  "help","hope","mean","work","works","working","worked","play",
  "like","love","care","wish","wonder","happen","happens","happened",
  // Contractions (after apostrophe stripping)
  "im","ive","id","ill","its","isnt","arent","wasnt","werent",
  "dont","doesnt","didnt","wont","wouldnt","couldnt","shouldnt",
  "cant","cannot","lets","thats","whats","whos","theres","heres",
  "theyre","youre","were","hed","shed","theyd","wed","youd",
  // Greetings / conversation openers
  "hi","hey","hello","oh","ah","um","uh","hmm","hm","wow","ok",
  "okay","yes","yeah","yep","nope","nah","sure","right","well",
  "so","now","nice","good","great","fine","okay","thanks","thank",
  "please","sorry","excuse","pardon",
  // Quantity / misc
  "one","two","three","four","five","more","much","many","few",
  "less","most","some","any","all","every","each","other","another",
  "same","different","thing","things","something","anything","nothing",
  "everything","someone","anyone","everyone","nobody","somebody",
  "lot","lots","bit","little","big","small","long","day","days",
  "time","times","way","ways","place","part","parts","kind","sort",
  "type","point","fact","case","side","end","new","old","own",
  "just","even","also","though","however","instead","unless","since",
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

      // Keyword extraction — strip ALL apostrophes so "let's"→"lets" etc. hit STOP
      const words = msg.text.toLowerCase().replace(/[^a-z\s']/g, '').split(/\s+/);
      for (const w of words) {
        const clean = w.replace(/'/g, '');   // strip all apostrophes (internal + edge)
        if (clean.length > 3 && !STOP.has(clean)) {
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
  const bestHour  = hourEntries.length > 0 ? formatHour(hourEntries[0]?.h)  : 'Not enough data';
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

Write a concise weekly care summary based ONLY on this data.
Include:
1. A general summary of the patient's week (combining mood, behavior, and overall conversation flow).
2. Notable conversations or topics.
3. Caregiver recommendations (actionable advice for the caregiver based on the week's data).

Respond ONLY with valid JSON (no markdown, no extra text) matching this schema:
{
  "generalSummary": "string",
  "notableConversations": ["string", "string"],
  "caregiverRecommendations": ["string", "string"]
}`;
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
  const d = payload?.[0]?.payload as DayEmotion;
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

// ─── Report generator ─────────────────────────────────────────────────────────
function generateReport({
  patient, w, avgScore, insights, emotionChange, confusionChange, engagementChange,
}: {
  patient: PatientProfile;
  w: WeekData;
  avgScore: number;
  insights: WeeklyInsights | undefined;
  emotionChange: number | null;
  confusionChange: number | null;
  engagementChange: number | null;
}) {
  const p = patient as any;
  const name       = p.name       || p.full_name     || 'Unknown Patient';
  const dob        = p.date_of_birth || p.dob        || null;
  const diagnosis  = p.diagnosis  || p.condition     || null;
  const caregiver  = p.caregiver_name || p.caregiver || null;
  const phone      = p.phone      || p.contact_phone || null;
  const notes      = p.notes      || p.care_notes    || null;
  const generated  = new Date().toLocaleString(undefined, {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });

  // Emotion bar for each day
  const dayRows = w.emotionByDay.map(d => {
    const barW = d.hasData ? Math.round(d.score) : 0;
    const barColor = d.score >= 68 ? '#22c55e' : d.score >= 48 ? '#6366f1' : d.score >= 36 ? '#f59e0b' : '#ef4444';
    return `
      <tr>
        <td style="padding:6px 12px 6px 0;font-weight:700;color:#374151;width:40px">${d.day}</td>
        <td style="padding:6px 8px">
          ${d.hasData
            ? `<div style="background:#e5e7eb;border-radius:4px;height:14px;overflow:hidden">
                 <div style="background:${barColor};height:100%;width:${barW}%;border-radius:4px;transition:width 0.3s"></div>
               </div>`
            : `<span style="color:#9ca3af;font-size:11px">No session</span>`}
        </td>
        <td style="padding:6px 0 6px 8px;text-align:right;font-weight:600;color:#374151;white-space:nowrap">
          ${d.hasData ? `${d.emoji} ${d.emotion} (${d.score})` : '—'}
        </td>
      </tr>`;
  }).join('');

  // Keywords
  const keywordBadges = w.keywords.map(k =>
    `<span style="display:inline-block;background:#ede9fe;color:#4f46e5;border-radius:20px;padding:3px 12px;font-size:12px;font-weight:700;margin:3px">${k.text} ×${k.count}</span>`
  ).join('');

  // Alert events
  const alertSection = w.alertEvents.length > 0
    ? w.alertEvents.map(evt => {
        const d = parseDate(evt.timestamp);
        return `<li style="margin-bottom:8px"><strong style="color:#dc2626">"${evt.trigger}"</strong> — ${d.toLocaleDateString(undefined,{weekday:'long',month:'short',day:'numeric'})} at ${d.toLocaleTimeString(undefined,{hour:'2-digit',minute:'2-digit'})}</li>`;
      }).join('')
    : '<li style="color:#16a34a">✓ No emergency alerts detected this week.</li>';

  // Change badge helper
  const changeBadge = (val: number | null, invertGood = false) => {
    if (val === null) return '';
    const good = invertGood ? val <= 0 : val >= 0;
    const color = good ? '#16a34a' : '#dc2626';
    const bg    = good ? '#dcfce7' : '#fee2e2';
    return `<span style="background:${bg};color:${color};font-size:11px;font-weight:700;padding:2px 8px;border-radius:99px;margin-left:8px">${val >= 0 ? '+' : ''}${val}</span>`;
  };

  // AI insights sections
  const insightSummary = insights?.generalSummary
    ? `<p style="color:#1f2937;line-height:1.7;margin:0">${insights.generalSummary}</p>`
    : '<p style="color:#6b7280;font-style:italic;margin:0">Insights not available for this week.</p>';

  const insightConversations = (insights?.notableConversations?.length ?? 0) > 0
    ? insights!.notableConversations.map(c => `<li style="margin-bottom:6px;color:#374151">${c}</li>`).join('')
    : '<li style="color:#9ca3af;font-style:italic">None recorded.</li>';

  const insightRecs = (insights?.caregiverRecommendations?.length ?? 0) > 0
    ? insights!.caregiverRecommendations.map(r =>
        `<li style="margin-bottom:8px;padding-left:8px;border-left:3px solid #6366f1;color:#1f2937">${r}</li>`
      ).join('')
    : '<li style="color:#9ca3af;font-style:italic">No specific recommendations this week.</li>';

  // Daily message mini-chart (text-based)
  const maxCount = Math.max(...w.dailyMessageCounts, 1);
  const msgRows = DAY_LABELS.map((day, i) => {
    const c = w.dailyMessageCounts[i];
    const pct = Math.round((c / maxCount) * 100);
    return `
      <tr>
        <td style="padding:4px 10px 4px 0;font-weight:700;color:#374151;width:36px;font-size:12px">${day}</td>
        <td style="padding:4px 6px">
          <div style="background:#e5e7eb;border-radius:4px;height:10px;overflow:hidden">
            <div style="background:#6366f1;height:100%;width:${pct}%;border-radius:4px"></div>
          </div>
        </td>
        <td style="padding:4px 0 4px 8px;text-align:right;color:#6b7280;font-size:12px;width:30px">${c}</td>
      </tr>`;
  }).join('');

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Weekly Care Report — ${name} — ${w.range}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #f9fafb; color: #111827; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    .page { max-width: 820px; margin: 0 auto; padding: 48px 40px; background: #fff; }
    h1  { font-size: 26px; font-weight: 900; color: #111827; }
    h2  { font-size: 16px; font-weight: 800; color: #1f2937; margin-bottom: 14px; padding-bottom: 6px; border-bottom: 2px solid #e5e7eb; display: flex; align-items: center; gap: 8px; }
    h2 .icon { display: inline-block; width: 20px; height: 20px; border-radius: 6px; flex-shrink: 0; }
    section { margin-bottom: 32px; }
    table { width: 100%; border-collapse: collapse; }
    .stat-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px; }
    @media (min-width: 600px) { .stat-grid { grid-template-columns: repeat(4, 1fr); } }
    .stat-card { background: #f3f4f6; border-radius: 12px; padding: 16px; }
    .stat-label { font-size: 10px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.1em; color: #6b7280; margin-bottom: 6px; }
    .stat-value { font-size: 28px; font-weight: 900; color: #111827; line-height: 1; }
    .stat-sub   { font-size: 11px; color: #6b7280; margin-top: 4px; }
    .alert-box  { border-radius: 12px; padding: 16px 20px; margin-bottom: 0; }
    .alert-ok   { background: #f0fdf4; border: 1.5px solid #86efac; }
    .alert-warn { background: #fef2f2; border: 1.5px solid #fca5a5; }
    ul { padding-left: 20px; }
    li { margin-bottom: 4px; }
    .divider { border: none; border-top: 1px solid #e5e7eb; margin: 28px 0; }
    @media print {
      body { background: #fff; }
      .page { padding: 20px; max-width: 100%; }
      .no-print { display: none !important; }
    }
  </style>
</head>
<body>
<div class="page">

  <!-- Print button (hidden on print) -->
  <div class="no-print" style="text-align:right;margin-bottom:24px">
    <button onclick="window.print()" style="background:#6366f1;color:#fff;border:none;padding:10px 24px;border-radius:8px;font-weight:700;font-size:14px;cursor:pointer">
      🖨 Print / Save as PDF
    </button>
  </div>

  <!-- ── Header ── -->
  <div style="display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:32px;gap:16px;flex-wrap:wrap">
    <div>
      <div style="font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:0.15em;color:#6366f1;margin-bottom:6px">Weekly Care Report</div>
      <h1 style="margin-bottom:4px">${name}</h1>
      <p style="color:#6b7280;font-size:14px">📅 ${w.range}</p>
    </div>
    <div style="text-align:right;font-size:12px;color:#9ca3af">
      <div>Generated</div>
      <div style="font-weight:700;color:#6b7280">${generated}</div>
    </div>
  </div>

  <!-- ── Patient Details ── -->
  <section>
    <h2><span class="icon" style="background:#ede9fe"></span>Patient Details</h2>
    <table style="font-size:14px">
      <tbody>
        <tr>
          <td style="padding:6px 16px 6px 0;color:#6b7280;font-weight:600;width:160px">Full Name</td>
          <td style="padding:6px 0;font-weight:700;color:#111827">${name}</td>
        </tr>
        ${dob ? `<tr><td style="padding:6px 16px 6px 0;color:#6b7280;font-weight:600">Date of Birth</td><td style="padding:6px 0;font-weight:700;color:#111827">${dob}</td></tr>` : ''}
        ${diagnosis ? `<tr><td style="padding:6px 16px 6px 0;color:#6b7280;font-weight:600">Diagnosis</td><td style="padding:6px 0;font-weight:700;color:#111827">${diagnosis}</td></tr>` : ''}
        ${caregiver ? `<tr><td style="padding:6px 16px 6px 0;color:#6b7280;font-weight:600">Primary Caregiver</td><td style="padding:6px 0;font-weight:700;color:#111827">${caregiver}</td></tr>` : ''}
        ${phone ? `<tr><td style="padding:6px 16px 6px 0;color:#6b7280;font-weight:600">Contact</td><td style="padding:6px 0;font-weight:700;color:#111827">${phone}</td></tr>` : ''}
        ${notes ? `<tr><td style="padding:6px 16px 6px 0;color:#6b7280;font-weight:600;vertical-align:top">Care Notes</td><td style="padding:6px 0;color:#374151;line-height:1.6">${notes}</td></tr>` : ''}
      </tbody>
    </table>
  </section>

  <hr class="divider" />

  <!-- ── Key Metrics ── -->
  <section>
    <h2><span class="icon" style="background:#dbeafe"></span>Key Metrics</h2>
    <div class="stat-grid">
      <div class="stat-card">
        <div class="stat-label">Avg Emotion Score</div>
        <div class="stat-value">${Math.round(avgScore)}<span style="font-size:16px;font-weight:600;color:#9ca3af">/100</span></div>
        ${emotionChange !== null ? `<div class="stat-sub">${changeBadge(emotionChange)} vs prev week</div>` : ''}
      </div>
      <div class="stat-card">
        <div class="stat-label">Confusion Events</div>
        <div class="stat-value">${w.confusionCount}</div>
        ${confusionChange !== null ? `<div class="stat-sub">${changeBadge(confusionChange, true)} vs prev week</div>` : ''}
      </div>
      <div class="stat-card">
        <div class="stat-label">Engagement</div>
        <div class="stat-value">${w.engagementLevel}<span style="font-size:16px;font-weight:600;color:#9ca3af">%</span></div>
        ${engagementChange !== null ? `<div class="stat-sub">${changeBadge(engagementChange)} vs prev week</div>` : ''}
      </div>
      <div class="stat-card">
        <div class="stat-label">Total Sessions</div>
        <div class="stat-value">${w.sessionCount}</div>
        <div class="stat-sub">${w.totalPatientMessages} patient messages</div>
      </div>
    </div>
  </section>

  <hr class="divider" />

  <!-- ── Activity & Responsiveness ── -->
  <section>
    <h2><span class="icon" style="background:#dcfce7"></span>Activity &amp; Responsiveness</h2>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:24px">
      <div>
        <p style="font-size:12px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:0.08em;margin-bottom:10px">Daily Messages</p>
        <table style="width:100%"><tbody>${msgRows}</tbody></table>
      </div>
      <div style="font-size:14px">
        <p style="font-size:12px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:0.08em;margin-bottom:10px">Peak Hours</p>
        <table><tbody>
          <tr><td style="padding:5px 12px 5px 0;color:#6b7280;font-weight:600">Most Active</td><td style="font-weight:700;color:#111827">${w.bestHour}</td></tr>
          <tr><td style="padding:5px 12px 5px 0;color:#6b7280;font-weight:600">Least Active</td><td style="font-weight:700;color:#111827">${w.worstHour}</td></tr>
        </tbody></table>
      </div>
    </div>
  </section>

  <hr class="divider" />

  <!-- ── Emotion by Day ── -->
  <section>
    <h2><span class="icon" style="background:#fce7f3"></span>Emotional Wellbeing by Day</h2>
    <table style="width:100%"><tbody>${dayRows}</tbody></table>
  </section>

  <hr class="divider" />

  <!-- ── Safety Alerts ── -->
  <section>
    <h2><span class="icon" style="background:${w.alertEvents.length > 0 ? '#fee2e2' : '#dcfce7'}"></span>Safety Monitoring</h2>
    <div class="alert-box ${w.alertEvents.length > 0 ? 'alert-warn' : 'alert-ok'}">
      <p style="font-weight:800;font-size:14px;margin-bottom:8px;color:${w.alertEvents.length > 0 ? '#dc2626' : '#16a34a'}">
        ${w.alertEvents.length > 0 ? `⚠ ${w.alertEvents.length} Emergency Alert${w.alertEvents.length !== 1 ? 's' : ''} Detected` : '✓ No Critical Alerts This Week'}
      </p>
      <ul style="list-style:none;padding:0;font-size:13px">${alertSection}</ul>
    </div>
    ${w.distressCount > 0 ? `<p style="margin-top:10px;font-size:13px;color:#92400e;background:#fef3c7;padding:8px 14px;border-radius:8px">⚠ ${w.distressCount} distress-related message${w.distressCount !== 1 ? 's' : ''} detected during the week. Review session logs for context.</p>` : ''}
  </section>

  <hr class="divider" />

  <!-- ── Keywords ── -->
  ${w.keywords.length > 0 ? `
  <section>
    <h2><span class="icon" style="background:#e0f2fe"></span>Common Topics</h2>
    <div style="margin-top:4px">${keywordBadges}</div>
  </section>
  <hr class="divider" />
  ` : ''}

  <!-- ── AI Insights ── -->
  <section>
    <h2><span class="icon" style="background:#ede9fe"></span>AI Caregiver Insights</h2>
    ${insights ? `
    <div style="margin-bottom:20px">
      <p style="font-size:12px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:0.08em;margin-bottom:8px">General Summary</p>
      ${insightSummary}
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:24px">
      <div>
        <p style="font-size:12px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:0.08em;margin-bottom:8px">Notable Conversations</p>
        <ul style="font-size:13px;line-height:1.7">${insightConversations}</ul>
      </div>
      <div>
        <p style="font-size:12px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:0.08em;margin-bottom:8px">Caregiver Recommendations</p>
        <ul style="list-style:none;padding:0;font-size:13px">${insightRecs}</ul>
      </div>
    </div>
    ` : '<p style="color:#9ca3af;font-size:13px;font-style:italic">AI insights were not available for this week.</p>'}
  </section>

  <!-- ── Footer ── -->
  <hr class="divider" />
  <div style="text-align:center;font-size:11px;color:#9ca3af;line-height:1.8">
    <p>This report was auto-generated by the Nura Care platform on ${generated}.</p>
    <p>It is intended for use by authorised caregivers only. Not a substitute for professional medical advice.</p>
  </div>

</div>
</body>
</html>`;

  const win = window.open('', '_blank');
  if (win) {
    win.document.write(html);
    win.document.close();
  }
}

// ─── Main component ───────────────────────────────────────────────────────────
export const AnalyticsDashboard: React.FC<AnalyticsDashboardProps> = ({
  patient, logs, onNavigateToLogs,
}) => {
  const patientName = patient.name || (patient as any).full_name || 'the patient';

  const [weekIndex, setWeekIndex]           = useState(0);
  const [hoveredWord, setHoveredWord]       = useState<string | null>(null);
  const [showDailyTime, setShowDailyTime]   = useState(false);
  const [llmInsights, setLlmInsights]       = useState<Record<string, WeeklyInsights>>({});
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
        const ai = new GoogleGenAI({ apiKey: (import.meta as any).env.VITE_GEMINI_API_KEY || process.env.GEMINI_API_KEY });
        const response = await ai.models.generateContent({
          model: "gemini-3-flash-preview",
          contents: buildInsightsPrompt(patientName, currentWeek),
          config: {
            responseMimeType: "application/json",
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                generalSummary: { type: Type.STRING },
                notableConversations: { type: Type.ARRAY, items: { type: Type.STRING } },
                caregiverRecommendations: { type: Type.ARRAY, items: { type: Type.STRING } },
              },
              required: ["generalSummary", "notableConversations", "caregiverRecommendations"]
            }
          }
        });
        
        const text = response.text || "{}";
        const parsed = JSON.parse(text) as WeeklyInsights;
        setLlmInsights(prev => ({ ...prev, [key]: parsed }));
      } catch (err) {
        console.error("Failed to generate insights", err);
        // Fallback to rule-based insights
        const w = currentWeek;
        const fallback: WeeklyInsights = {
          generalSummary: w.sessionCount > 0 
            ? `${w.sessionCount} session(s) completed this week. Average emotion score was ${Math.round(w.emotionByDay.filter(d => d.hasData).reduce((s,d) => s+d.score, 0) / (w.emotionByDay.filter(d => d.hasData).length || 1))}/100.`
            : "No sessions recorded this week.",
          notableConversations: [],
          caregiverRecommendations: []
        };
        
        if (w.confusionCount > 0) {
          fallback.generalSummary += ` ${w.confusionCount} confusion event(s) detected.`;
          fallback.caregiverRecommendations.push("Consider simplifying conversation topics and using more grounding statements.");
        }
        
        if (w.alertEvents.length > 0) {
          fallback.generalSummary += ` ⚠️ ${w.alertEvents.length} emergency alert(s) triggered.`;
          fallback.caregiverRecommendations.push("Review session transcripts and discuss with the care team.");
        }
        
        if (w.keywords.length > 0) {
          fallback.notableConversations.push(`Most discussed topics: ${w.keywords.slice(0,3).map(k=>k.text).join(', ')}.`);
        }
        
        if (fallback.caregiverRecommendations.length === 0) {
          fallback.caregiverRecommendations.push("Continue current care plan. Patient appears stable.");
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
  
  const avgScore = w.emotionByDay.filter(d => d.hasData).reduce((s,d) => s+d.score, 0) / (w.emotionByDay.filter(d => d.hasData).length || 1);
  const prevAvgScore = prevWeek ? prevWeek.emotionByDay.filter(d => d.hasData).reduce((s,d) => s+d.score, 0) / (prevWeek.emotionByDay.filter(d => d.hasData).length || 1) : null;
  const emotionChange = prevAvgScore !== null ? Math.round(avgScore) - Math.round(prevAvgScore) : null;
  const confusionChange = prevWeek ? w.confusionCount - prevWeek.confusionCount : null;

  const engagementChange = prevWeek
    ? w.engagementLevel - prevWeek.engagementLevel
    : null;

  // Chart data — only days with data get a dot, rest show neutral line
  const chartData = w.emotionByDay;

  return (
    <div className="space-y-8 pb-20 pt-6">

      {/* ── Top Row: Alerts & AI Insights ─────────────────────────────────── */}
      <div className="flex flex-col gap-6">
        {/* Alerts */}
        <section className={`p-6 rounded-3xl border flex flex-col ${
          w.alertEvents.length > 0
            ? 'bg-[var(--nura-card)] border-red-500/30'
            : 'bg-[var(--nura-card)] border-emerald-500/30'
        }`}>
          <h3 className={`flex items-center gap-3 text-xl font-black mb-2 ${
            w.alertEvents.length > 0 ? 'text-red-400' : 'text-emerald-400'
          }`}>
            {w.alertEvents.length > 0
              ? <><TriangleAlert /> Emergency Alerts — {w.alertEvents.length} Detected</>
              : <><ShieldCheck /> No Critical Alerts This Week</>
            }
          </h3>
          {w.alertEvents.length > 0 ? (
            <div className="space-y-4 flex-1 overflow-y-auto">
              {w.alertEvents.map((evt, i) => (
                <div key={i} className="flex items-start gap-3">
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
            <div>
              <p className="font-black text-[var(--nura-text)] text-sm">System monitored all {w.sessionCount} session{w.sessionCount !== 1 ? 's' : ''} for distress, self-harm, and medical emergencies.</p>
              <p className="text-xs text-[var(--nura-dim)] mt-0.5">Everything appears stable this week.</p>
            </div>
          )}
        </section>

        {/* AI Insights */}
        <section className="bg-[var(--nura-card)] p-6 rounded-3xl border border-white/5 flex flex-col">
          <h4 className="flex items-center gap-2 text-sm font-bold text-[var(--nura-dim)] uppercase tracking-widest mb-4">
            <Sparkles size={14} className="text-indigo-400" />
            AI Caregiver Insights
          </h4>
          {isGenerating ? (
            <div className="flex items-center justify-center flex-1 gap-3 py-6 text-[var(--nura-dim)]">
              <Loader2 size={18} className="animate-spin text-indigo-400" />
              <span className="text-sm font-medium">Analysing session data…</span>
            </div>
          ) : insights ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 flex-1">
              <div className="bg-white/5 border border-white/10 p-4 rounded-2xl flex flex-col">
                <h5 className="text-xs font-bold text-indigo-200 mb-2">General Summary</h5>
                <p className="text-sm text-indigo-100/80 leading-relaxed flex-1">{insights.generalSummary}</p>
              </div>
              
              <div className="bg-white/5 border border-white/10 p-4 rounded-2xl flex flex-col">
                <h5 className="text-xs font-bold text-indigo-200 mb-3">Notable Conversations</h5>
                {insights.notableConversations && insights.notableConversations.length > 0 ? (
                  <div className="flex flex-wrap gap-2 content-start">
                    {insights.notableConversations.map((conv, i) => (
                      <span key={i} className="bg-indigo-500/20 text-indigo-200 text-xs px-3 py-1.5 rounded-xl border border-indigo-500/20">
                        {conv}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-indigo-100/50 italic">No notable conversations recorded.</p>
                )}
              </div>

              <div className="bg-white/5 border border-white/10 p-4 rounded-2xl flex flex-col">
                <h5 className="text-xs font-bold text-indigo-200 mb-3">Caregiver Recommendations</h5>
                {insights.caregiverRecommendations && insights.caregiverRecommendations.length > 0 ? (
                  <ul className="space-y-2">
                    {insights.caregiverRecommendations.map((rec, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-indigo-100/80">
                        <div className="w-1.5 h-1.5 rounded-full bg-indigo-400 mt-1.5 shrink-0" />
                        <span>{rec}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-indigo-100/50 italic">No specific recommendations this week.</p>
                )}
              </div>
            </div>
          ) : w.sessionCount === 0 ? (
            <div className="flex items-center justify-center flex-1">
              <p className="text-[var(--nura-dim)] text-sm font-bold py-4">
                No sessions to analyse for this week.
              </p>
            </div>
          ) : (
            <div className="flex items-center justify-center flex-1 gap-3 py-4 text-[var(--nura-dim)]">
              <Loader2 size={18} className="animate-spin text-indigo-400" />
              <span className="text-sm">Loading insights…</span>
            </div>
          )}
        </section>
      </div>

      {/* ── C + D. Emotion chart + Engagement ──────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

        {/* C. Emotion & Cognitive Trend */}
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

        {/* D. Engagement Progress */}
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

          {/* E. Common Keywords */}
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

      {/* ── B. Weekly Summary (Stats) ──────────────────────────────────── */}
      <section className="bg-[var(--nura-card)] p-10 rounded-[2.5rem] border border-white/5 relative overflow-hidden">
        <div className="absolute top-0 left-0 p-8">
          <PaginationControls
            current={weekIndex} total={allWeekData.length}
            onChange={i => setWeekIndex(i)}
          />
        </div>
        <div className="absolute top-0 right-0 p-8">
          <button
            onClick={() => generateReport({ patient, w, avgScore, insights, emotionChange, confusionChange, engagementChange })}
            className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 rounded-xl text-[var(--nura-dim)] hover:text-[var(--nura-text)] transition-all text-xs font-bold border border-white/10"
            title="Export Report"
          >
            <Download size={15} />
            Export Report
          </button>
        </div>

        <div className="flex flex-col items-center text-center mb-12 mt-4">
          <h2 className="text-3xl font-black text-[var(--nura-text)] mb-2">Weekly Care Summary</h2>
          <p className="text-[var(--nura-dim)] font-medium flex items-center gap-2">
            <Calendar size={16} /> {w.range}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          <div className="space-y-4">
            <div className="flex items-center gap-3 text-indigo-200 font-bold">
              <Heart size={20} className="text-pink-400" />
              Avg Emotion
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-3xl font-black text-[var(--nura-text)]">{Math.round(avgScore)}</span>
              <span className="text-[var(--nura-dim)] font-bold">/100</span>
              {emotionChange !== null && (
                <span className={`text-xs font-bold px-2 py-1 rounded-md ${
                  emotionChange >= 0
                    ? 'bg-emerald-500/10 text-emerald-400'
                    : 'bg-red-500/10 text-red-400'
                }`}>
                  {emotionChange >= 0 ? '+' : ''}{emotionChange} vs last week
                </span>
              )}
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center gap-3 text-indigo-200 font-bold">
              <Brain size={20} className="text-orange-400" />
              Confusion
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-3xl font-black text-[var(--nura-text)]">{w.confusionCount}</span>
              <span className="text-[var(--nura-dim)] font-bold">events</span>
              {confusionChange !== null && (
                <span className={`text-xs font-bold px-2 py-1 rounded-md ${
                  confusionChange <= 0
                    ? 'bg-emerald-500/10 text-emerald-400'
                    : 'bg-red-500/10 text-red-400'
                }`}>
                  {confusionChange > 0 ? '+' : ''}{confusionChange} vs last week
                </span>
              )}
            </div>
          </div>

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
      </section>
    </div>
  );
};
