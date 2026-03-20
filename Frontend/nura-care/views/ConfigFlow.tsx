import React, { useState, useEffect } from 'react';
import { DementiaStage } from '../types';
import type { PatientProfile, AvatarType } from '../types';
import { Avatar } from '../components/Avatar';
import {
  CheckCircle2, User, Brain, X,
  Users, Briefcase, AlertCircle, Check, ArrowLeft, AlertTriangle,
  BookOpen, Plus
} from 'lucide-react';

interface ConfigFlowProps {
  caregiverEmail: string;
  patient: PatientProfile | null;
  onSave: (patient: PatientProfile) => void;
  onBack: () => void;
  isEmbedded?: boolean;
}

const EmptyPatient: any = {
  patient_id: '',
  name: '',
  avatarType: 'seal',
  age: 0,
  stage: DementiaStage.EARLY,
  description: '',
  familyMembers: [],
  lifestyles: [],
  mediaDocs: [],
  triggers: [],
  safeTopics: [],
  aiSuggestionsLoaded: false,
  pauseTolerance: 'medium',
  softSpokenMode: false,
  interactiveMode: true,
};

const AVATAR_OPTIONS: AvatarType[] = ['seal', 'jellyfish', 'bee', 'turtle'];

const PAUSE_OPTIONS = [
  { value: 'short'  as const, label: 'Short',  ms: '2 seconds',  desc: 'Snappy back-and-forth for fluent speakers' },
  { value: 'medium' as const, label: 'Medium', ms: '5 seconds',  desc: 'Comfortable pace — works for most patients' },
  { value: 'long'   as const, label: 'Long',   ms: '10 seconds', desc: 'For Aphasia or long breaths between phrases' },
];

// ── Toggle ────────────────────────────────────────────────────────────────────
const Toggle: React.FC<{ checked: boolean; onChange: (v: boolean) => void; label: string }> = ({
  checked, onChange, label,
}) => (
  <button
    type="button"
    onClick={() => onChange(!checked)}
    aria-label={label}
    className={`relative flex items-center w-20 h-10 rounded-full transition-all duration-300 focus:outline-none shrink-0 ${
      checked
        ? 'bg-[var(--nura-accent)] shadow-lg shadow-[var(--nura-accent)]/40'
        : 'bg-[var(--nura-text)]/10 border-2 border-[var(--nura-text)]/20'
    }`}
  >
    <span className={`absolute text-[9px] font-black uppercase tracking-widest transition-all duration-300 select-none ${
      checked ? 'left-2.5 text-white/70' : 'right-2.5 text-[var(--nura-dim)]/60'
    }`}>
      {checked ? 'ON' : 'OFF'}
    </span>
    <div className={`absolute w-7 h-7 rounded-full shadow-md transition-all duration-300 ${
      checked ? 'left-[calc(100%-2rem)] bg-white' : 'left-1 bg-[var(--nura-text)]/40'
    }`} />
  </button>
);

// ─────────────────────────────────────────────────────────────────────────────
export const ConfigFlow: React.FC<ConfigFlowProps> = ({
  caregiverEmail, patient, onSave, onBack, isEmbedded = false,
}) => {
  const [formData, setFormData] = useState<any>(patient || { ...EmptyPatient });
  const [currentStep, setCurrentStep] = useState(0);
  const [error, setError]     = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const [newLifestyle, setNewLifestyle] = useState('');
  const [famName, setFamName]   = useState('');
  const [famRel, setFamRel]     = useState('');
  const [newTrigger, setNewTrigger] = useState('');
  const [newTopic, setNewTopic]     = useState('');

  useEffect(() => {
    if (patient) {
      const src = patient as any;
      setFormData({
        ...patient,
        patient_id:      src.patient_id || src.id || '',
        name:            src.full_name  || src.name || '',
        avatarType:      src.avatarType || 'seal',
        age:             src.age || 0,
        stage:           src.dementia_stage || src.stage || DementiaStage.EARLY,
        description:     src.patient_story  || src.description || '',
        lifestyles: src.hobbies_and_career
          ? (typeof src.hobbies_and_career === 'string' ? src.hobbies_and_career.split(', ') : src.hobbies_and_career)
          : (src.lifestyles || []),
        familyMembers:   src.key_people      || src.familyMembers || [],
        triggers:        src.known_triggers  || src.triggers      || [],
        safeTopics:      src.approved_topics || src.safeTopics    || [],
        pauseTolerance:  src.pause_tolerance  || src.pauseTolerance  || 'medium',
        softSpokenMode:  src.soft_spoken_mode ?? src.softSpokenMode  ?? false,
        interactiveMode: src.interactive_mode ?? src.interactiveMode ?? true,
      });
    }
  }, [patient]);

  const validateStep = (step: number): string | null => {
    setError(null);
    if (step === 0) {
      if (!formData.name?.trim())            return 'Full Name is required.';
      if (!formData.age || formData.age <= 0) return 'A valid Age is required.';
    }
    if (step === 1) {
      if ((formData.familyMembers?.length || 0) < 1) return 'Add at least 1 Key Person.';
      if ((formData.safeTopics?.length   || 0) < 3) return 'Add at least 3 Approved Topics.';
      if ((formData.triggers?.length     || 0) < 3) return 'Add at least 3 Known Triggers.';
    }
    return null;
  };

  const handleNext = () => {
    const msg = validateStep(currentStep);
    if (msg) { setError(msg); return; }
    setCurrentStep(s => s + 1);
  };

  const handleFinalSave = async () => {
    const msg = validateStep(currentStep);
    if (msg) { setError(msg); return; }
    setIsLoading(true);

    const payload = {
      patient_id:         formData.patient_id || null,
      full_name:          (formData.name || '').trim(),
      avatarType:         formData.avatarType,
      age:                parseInt(String(formData.age)) || 0,
      dementia_stage:     formData.stage,
      patient_story:      formData.description || '',
      hobbies_and_career: (formData.lifestyles || []).join(', '),
      key_people:         (formData.familyMembers || []).map((m: any) => ({ name: m.name, relation: m.relation })),
      approved_topics:    formData.safeTopics || [],
      known_triggers:     formData.triggers   || [],
      pause_tolerance:    formData.pauseTolerance  || 'medium',
      soft_spoken_mode:   formData.softSpokenMode  ?? false,
      interactive_mode:   formData.interactiveMode ?? true,
    };

    try {
      const res = await fetch(
        `http://127.0.0.1:8000/patients/save/${encodeURIComponent(caregiverEmail.toLowerCase().trim())}`,
        { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) }
      );
      const result = await res.json();
      if (res.ok && result.success) {
        onSave({ ...formData, patient_id: result.patient_id, id: result.patient_id });
      } else {
        setError(result.detail || 'Failed to save.');
      }
    } catch {
      setError('Server connection failed.');
    } finally {
      setIsLoading(false);
    }
  };

  const addTag = (field: 'lifestyles' | 'triggers' | 'safeTopics', value: string, setter: (s: string) => void) => {
    if (!value.trim()) return;
    setFormData((prev: any) => ({ ...prev, [field]: [...(prev[field] || []), value.trim()] }));
    setter('');
  };

  const removeTag = (field: string, index: number) => {
    setFormData((prev: any) => ({ ...prev, [field]: (prev[field] as any[]).filter((_: any, i: number) => i !== index) }));
  };

  const addFamilyMember = () => {
    if (!famName.trim() || !famRel.trim()) return;
    setFormData((prev: any) => ({ ...prev, familyMembers: [...(prev.familyMembers || []), { name: famName, relation: famRel }] }));
    setFamName(''); setFamRel('');
  };

  const pageTitle = currentStep === 2
    ? 'Listening Profile'
    : patient
      ? `Edit ${formData.name || (patient as any).full_name || ''}'s Details`
      : 'Add a Loved One';

  const pageLabel = currentStep === 2 ? 'Step 3 of 3' : patient ? 'Configure' : 'New Profile';
  const pageSub   = currentStep === 2 ? `Fine-tune how the AI listens to ${formData.name || 'this patient'}.` : null;

  return (
    <div className={`w-full max-w-5xl mx-auto flex flex-col p-6 pb-48 text-[var(--nura-text)] ${isEmbedded ? 'min-h-full' : 'min-h-screen'}`}>
      <div className="max-w-3xl mx-auto w-full space-y-8">

        {/* Header */}
        <div className="text-center pt-2 pb-4">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[var(--nura-accent)] mb-2">{pageLabel}</p>
          <h1 className="text-4xl font-extrabold text-[var(--nura-text)]">{pageTitle}</h1>
          {pageSub && <p className="text-[var(--nura-dim)] text-sm mt-2">{pageSub}</p>}
        </div>

        {/* ── STEP 0: BASICS ── */}
        {currentStep === 0 && (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">

            <div className="flex justify-center items-end gap-6 w-full max-w-2xl px-4 mx-auto flex-wrap">
              {AVATAR_OPTIONS.map(type => (
                <button key={type} type="button"
                  onClick={() => setFormData((prev: any) => ({ ...prev, avatarType: type }))}
                  className={`relative p-6 rounded-[2.5rem] transition-all duration-500 flex flex-col items-center ${
                    formData.avatarType === type
                      ? 'bg-[var(--nura-accent)]/20 scale-110 ring-2 ring-[var(--nura-accent)]'
                      : 'opacity-40 grayscale hover:opacity-100'
                  }`}
                >
                  <Avatar size="md" type={type} emotion={formData.avatarType === type ? 'happy' : 'neutral'} reducedMotion />
                  {formData.avatarType === type && (
                    <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 bg-[var(--nura-accent)] text-white text-[10px] font-black px-4 py-1.5 rounded-full shadow-lg">Selected</div>
                  )}
                </button>
              ))}
            </div>

            <div className="bg-[var(--nura-card)] p-8 rounded-[2rem] border border-[var(--nura-text)]/10 shadow-xl">
              <h3 className="flex items-center gap-3 text-xl font-bold mb-6">
                <User size={24} className="text-[var(--nura-accent)]" /> Personal Information
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                <div className="md:col-span-3">
                  <label className="block text-xs font-black text-[var(--nura-dim)] mb-2 uppercase tracking-widest">Full Name *</label>
                  <input type="text" value={formData.name || ''}
                    onChange={e => setFormData((prev: any) => ({ ...prev, name: e.target.value }))}
                    className="w-full bg-transparent border-2 border-[var(--nura-text)]/20 rounded-xl p-4 focus:border-[var(--nura-accent)] outline-none transition-all" />
                </div>
                <div>
                  <label className="block text-xs font-black text-[var(--nura-dim)] mb-2 uppercase tracking-widest">Age *</label>
                  <input type="number" value={formData.age === 0 ? '' : formData.age}
                    onChange={e => setFormData((prev: any) => ({ ...prev, age: parseInt(e.target.value) || 0 }))}
                    className="w-full bg-transparent border-2 border-[var(--nura-text)]/20 rounded-xl p-4 focus:border-[var(--nura-accent)] outline-none" />
                </div>
              </div>
              <div className="mb-8">
                <label className="block text-xs font-black text-[var(--nura-dim)] mb-2 uppercase flex items-center gap-2">
                  <BookOpen size={14} /> Patient Story
                </label>
                <textarea value={formData.description || ''}
                  onChange={e => setFormData((prev: any) => ({ ...prev, description: e.target.value }))}
                  placeholder="Describe their personality and background..."
                  className="w-full bg-transparent border-2 border-[var(--nura-text)]/20 rounded-xl p-4 h-32 focus:border-[var(--nura-accent)] outline-none resize-none" />
              </div>
              <div>
                <label className="block text-xs font-black text-[var(--nura-dim)] mb-2 uppercase flex items-center gap-2">
                  <Briefcase size={14} /> Hobbies &amp; Career
                </label>
                <div className="flex gap-3 mb-4">
                  <input type="text" value={newLifestyle} onChange={e => setNewLifestyle(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && addTag('lifestyles', newLifestyle, setNewLifestyle)}
                    className="flex-1 bg-transparent border-2 border-[var(--nura-text)]/20 rounded-xl p-4 outline-none" placeholder="e.g. Architect" />
                  <button onClick={() => addTag('lifestyles', newLifestyle, setNewLifestyle)} className="bg-[var(--nura-accent)] text-white px-6 rounded-xl"><Plus size={24} /></button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {(formData.lifestyles || []).map((tag: string, idx: number) => (
                    <div key={idx} className="bg-[var(--nura-accent)]/10 border border-[var(--nura-accent)]/30 px-4 py-2 rounded-full flex items-center gap-2">
                      <span className="text-sm font-bold">{tag}</span>
                      <button onClick={() => removeTag('lifestyles', idx)} className="text-[var(--nura-dim)] hover:text-red-500"><X size={14} /></button>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="bg-[var(--nura-card)] p-8 rounded-[2rem] border border-[var(--nura-text)]/10 shadow-xl">
              <h3 className="flex items-center gap-3 text-xl font-bold mb-4">
                <Brain size={24} className="text-[var(--nura-accent)]" /> Dementia Stage *
              </h3>
              <div className="space-y-4">
                {[
                  { value: DementiaStage.EARLY,  title: 'Mild',     desc: 'Mostly independent but has occasional memory lapses' },
                  { value: DementiaStage.MIDDLE, title: 'Moderate', desc: 'Struggles to find words or gets confused about time' },
                  { value: DementiaStage.LATE,   title: 'Severe',   desc: 'Communication is difficult; responds best to music or touch' },
                ].map(opt => (
                  <button key={opt.value}
                    onClick={() => setFormData((prev: any) => ({ ...prev, stage: opt.value }))}
                    className={`w-full p-6 rounded-2xl border-2 text-left transition-all ${
                      formData.stage === opt.value
                        ? 'bg-[var(--nura-accent)] border-[var(--nura-accent)] text-white'
                        : 'bg-[var(--nura-bg)]/30 border-[var(--nura-text)]/10'
                    }`}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-black text-lg">{opt.title}</span>
                      {formData.stage === opt.value && <CheckCircle2 size={20} />}
                    </div>
                    <p className={`text-sm font-medium ${formData.stage === opt.value ? 'opacity-90' : 'text-[var(--nura-dim)]'}`}>{opt.desc}</p>
                  </button>
                ))}
              </div>
            </div>

          </div>
        )}

        {/* ── STEP 1: PEOPLE & SAFETY ── */}
        {currentStep === 1 && (
          <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">

            <div className="bg-[var(--nura-card)] p-8 rounded-[2rem] border border-[var(--nura-text)]/10 shadow-xl">
              <h3 className="flex items-center gap-3 text-xl font-bold mb-2">
                <Users size={24} className="text-pink-500" /> Key People *
              </h3>
              <p className="text-[var(--nura-dim)] text-sm mb-6 leading-relaxed">Add close family or friends who visit frequently.</p>
              <div className="bg-[var(--nura-bg)]/50 rounded-2xl p-6 border border-[var(--nura-text)]/10 mb-8">
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <input type="text" value={famName} onChange={e => setFamName(e.target.value)} placeholder="Name"
                    className="bg-transparent border-2 border-[var(--nura-text)]/20 rounded-xl p-4 focus:border-pink-500 outline-none" />
                  <input type="text" value={famRel} onChange={e => setFamRel(e.target.value)} placeholder="Relation"
                    className="bg-transparent border-2 border-[var(--nura-text)]/20 rounded-xl p-4 focus:border-pink-500 outline-none" />
                </div>
                <button onClick={addFamilyMember} className="w-full bg-pink-500 hover:bg-pink-600 text-white py-4 rounded-xl font-black transition-all shadow-md">
                  Add Person
                </button>
              </div>
              <div className="space-y-3">
                {(formData.familyMembers || []).map((member: any, idx: number) => (
                  <div key={idx} className="bg-[var(--nura-bg)]/30 border border-[var(--nura-text)]/10 rounded-2xl p-4 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-pink-500/20 flex items-center justify-center text-pink-500"><User size={20} /></div>
                      <div>
                        <p className="font-black text-lg leading-tight">{member.name}</p>
                        <p className="text-xs font-bold text-[var(--nura-dim)] uppercase tracking-tighter">{member.relation}</p>
                      </div>
                    </div>
                    <button onClick={() => removeTag('familyMembers', idx)} className="text-[var(--nura-dim)] hover:text-red-500"><X size={20} /></button>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-[var(--nura-card)] p-8 rounded-[2rem] border border-[var(--nura-text)]/10 shadow-xl">
              <h3 className="flex items-center gap-3 text-xl font-bold mb-2 text-green-500">
                <CheckCircle2 size={24} /> Approved Topics *
              </h3>
              <p className="text-[var(--nura-dim)] text-sm mb-6 leading-relaxed">
                Safe, positive subjects that help ground the patient (e.g., childhood pets, classical music).
              </p>
              <div className="flex gap-3 mb-6">
                <input type="text" value={newTopic} onChange={e => setNewTopic(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && addTag('safeTopics', newTopic, setNewTopic)}
                  placeholder="Add a safe topic..."
                  className="flex-1 bg-transparent border-2 border-[var(--nura-text)]/20 rounded-xl p-4 outline-none focus:border-green-500" />
                <button onClick={() => addTag('safeTopics', newTopic, setNewTopic)} className="bg-green-500 text-white p-4 rounded-xl shadow-lg"><Plus size={24} /></button>
              </div>
              <div className="flex flex-wrap gap-2">
                {(formData.safeTopics || []).map((tag: string, idx: number) => (
                  <div key={idx} className="bg-green-500/10 border border-green-500/20 px-4 py-2 rounded-xl flex items-center gap-2">
                    <span className="font-bold text-sm">{tag}</span>
                    <button onClick={() => removeTag('safeTopics', idx)} className="text-green-600 hover:text-red-500"><X size={16} /></button>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-[var(--nura-card)] p-8 rounded-[2rem] border border-[var(--nura-text)]/10 shadow-xl">
              <h3 className="flex items-center gap-3 text-xl font-bold mb-2 text-red-500">
                <AlertCircle size={24} /> Known Triggers *
              </h3>
              <p className="text-[var(--nura-dim)] text-sm mb-6 leading-relaxed">
                Identify topics or situations that may cause distress or confusion.
              </p>
              <div className="flex gap-3 mb-6">
                <input type="text" value={newTrigger} onChange={e => setNewTrigger(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && addTag('triggers', newTrigger, setNewTrigger)}
                  placeholder="Add a trigger..."
                  className="flex-1 bg-transparent border-2 border-[var(--nura-text)]/20 rounded-xl p-4 outline-none focus:border-red-500" />
                <button onClick={() => addTag('triggers', newTrigger, setNewTrigger)} className="bg-red-500 text-white p-4 rounded-xl shadow-lg"><Plus size={24} /></button>
              </div>
              <div className="flex flex-wrap gap-2">
                {(formData.triggers || []).map((tag: string, idx: number) => (
                  <div key={idx} className="bg-red-500/10 border border-red-500/20 px-4 py-2 rounded-xl flex items-center gap-2">
                    <span className="font-bold text-sm">{tag}</span>
                    <button onClick={() => removeTag('triggers', idx)} className="text-red-600 hover:text-red-800"><X size={16} /></button>
                  </div>
                ))}
              </div>
            </div>

          </div>
        )}

        {/* ── STEP 2: LISTENING PROFILE ── */}
        {currentStep === 2 && (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">

            {/* A — Pause Tolerance */}
            <div className="bg-[var(--nura-card)] p-8 rounded-[2rem] border border-[var(--nura-text)]/10 shadow-xl">
              <div className="flex items-center gap-3 mb-2">
                <span className="w-7 h-7 rounded-full bg-indigo-500/20 text-indigo-400 flex items-center justify-center text-xs font-black shrink-0">A</span>
                <h3 className="text-xl font-bold">Pause Tolerance</h3>
              </div>
              <p className="text-[var(--nura-dim)] text-sm mb-8 leading-relaxed pl-10">
                How long the AI waits after the patient stops speaking before it responds.
              </p>
              <div className="space-y-4">
                {PAUSE_OPTIONS.map(opt => {
                  const active = (formData.pauseTolerance || 'medium') === opt.value;
                  return (
                    <button key={opt.value} type="button"
                      onClick={() => setFormData((prev: any) => ({ ...prev, pauseTolerance: opt.value }))}
                      className={`w-full p-6 rounded-2xl border-2 text-left transition-all flex items-center justify-between gap-6 ${
                        active
                          ? 'bg-[var(--nura-accent)]/15 border-[var(--nura-accent)]/60'
                          : 'bg-[var(--nura-bg)]/30 border-[var(--nura-text)]/10 hover:border-[var(--nura-text)]/25'
                      }`}
                    >
                      <div>
                        <div className="flex items-center gap-3 mb-1">
                          <span className={`font-black text-xl ${active ? 'text-[var(--nura-accent)]' : 'text-[var(--nura-text)]'}`}>
                            {opt.label}
                          </span>
                          <span className={`text-xs font-black uppercase tracking-widest px-2.5 py-1 rounded-full ${
                            active
                              ? 'bg-[var(--nura-accent)]/20 text-[var(--nura-accent)]'
                              : 'bg-[var(--nura-text)]/10 text-[var(--nura-dim)]'
                          }`}>
                            {opt.ms}
                          </span>
                        </div>
                        <p className={`text-sm leading-relaxed ${active ? 'text-[var(--nura-text)]/80' : 'text-[var(--nura-dim)]/70'}`}>
                          {opt.desc}
                        </p>
                      </div>
                      <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 transition-all ${
                        active
                          ? 'border-[var(--nura-accent)] bg-[var(--nura-accent)]'
                          : 'border-[var(--nura-text)]/20 bg-transparent'
                      }`}>
                        {active && <Check size={13} className="text-white" strokeWidth={3} />}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* B — Soft Spoken Mode */}
            <div className="bg-[var(--nura-card)] p-8 rounded-[2rem] border border-[var(--nura-text)]/10 shadow-xl">
              <div className="flex items-start justify-between gap-6">
                <div className="flex items-start gap-3 flex-1">
                  <span className="w-7 h-7 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center text-xs font-black shrink-0 mt-0.5">B</span>
                  <div>
                    <h3 className="text-xl font-bold mb-2">Soft Spoken Mode</h3>
                    <p className="text-[var(--nura-dim)] text-sm leading-relaxed">
                      Boosts microphone sensitivity and lowers the volume threshold for detecting speech. Ideal for patients with quiet or weak voices.
                    </p>
                  </div>
                </div>
                <div className="shrink-0 pt-1">
                  <Toggle
                    checked={formData.softSpokenMode ?? false}
                    onChange={v => setFormData((prev: any) => ({ ...prev, softSpokenMode: v }))}
                    label="Soft Spoken Mode"
                  />
                </div>
              </div>
            </div>

            {/* C — Interactive Avatar */}
            <div className="bg-[var(--nura-card)] p-8 rounded-[2rem] border border-[var(--nura-text)]/10 shadow-xl">
              <div className="flex items-start justify-between gap-6">
                <div className="flex items-start gap-3 flex-1">
                  <span className="w-7 h-7 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-xs font-black shrink-0 mt-0.5">C</span>
                  <div>
                    <h3 className="text-xl font-bold mb-2">Interactive Avatar</h3>
                    <p className="text-[var(--nura-dim)] text-sm leading-relaxed">
                      The avatar reacts the moment any sound is detected — with an animated glow border and expression change. If Reduced Motion is enabled, only colour changes will appear.
                    </p>
                  </div>
                </div>
                <div className="shrink-0 pt-1">
                  <Toggle
                    checked={formData.interactiveMode ?? true}
                    onChange={v => setFormData((prev: any) => ({ ...prev, interactiveMode: v }))}
                    label="Interactive Avatar"
                  />
                </div>
              </div>
            </div>

          </div>
        )}

      </div>

      {/* ── FOOTER ── */}
      <div className="fixed bottom-0 left-0 right-0 p-8 z-50 pointer-events-none">
        <div className="max-w-3xl mx-auto flex flex-col gap-4 pointer-events-auto">

          {/* Step dots */}
          <div className="flex items-center justify-center gap-2 mb-2">
            {[0, 1, 2].map(i => (
              <div key={i} className={`rounded-full transition-all duration-300 ${
                i === currentStep
                  ? 'w-6 h-2 bg-[var(--nura-accent)]'
                  : i < currentStep
                  ? 'w-2 h-2 bg-[var(--nura-accent)]/40'
                  : 'w-2 h-2 bg-[var(--nura-text)]/15'
              }`} />
            ))}
          </div>

          {error && (
            <div className="bg-red-500/20 border border-red-500/50 text-red-100 p-4 rounded-2xl flex items-center gap-3 animate-bounce">
              <AlertTriangle size={20} className="text-red-500" />
              <p className="font-bold text-sm">{error}</p>
            </div>
          )}

          <div className="flex gap-4">
            {!isEmbedded && (
              <button onClick={onBack} className="px-8 py-5 rounded-2xl bg-[var(--nura-card)] text-[var(--nura-text)] font-bold border border-[var(--nura-text)]/10 shadow-lg hover:brightness-110">
                Cancel
              </button>
            )}
            {currentStep > 0 && (
              <button onClick={() => setCurrentStep(s => s - 1)} className="px-8 py-5 rounded-2xl bg-[var(--nura-card)] text-[var(--nura-text)] font-bold border border-[var(--nura-text)]/10 shadow-lg hover:brightness-110">
                <ArrowLeft size={24} />
              </button>
            )}
            <button
              onClick={currentStep < 2 ? handleNext : handleFinalSave}
              disabled={isLoading}
              className="flex-1 bg-[var(--nura-text)] text-[var(--nura-bg)] text-xl font-black py-5 rounded-2xl shadow-2xl flex items-center justify-center gap-3 transition-transform active:scale-95"
            >
              {isLoading ? 'Saving...' : currentStep < 2 ? 'Next' : 'Save Settings'}
              {!isLoading && (currentStep < 2 ? <Check size={24} /> : <CheckCircle2 size={24} />)}
            </button>
          </div>

        </div>
      </div>
    </div>
  );
};
