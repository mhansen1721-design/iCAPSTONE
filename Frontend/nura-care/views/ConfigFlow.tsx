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
}

const EmptyPatient: PatientProfile = {
  patient_id: '',
  name: '',
  avatarType: 'jellyfish',
  age: 0,
  stage: DementiaStage.EARLY,
  description: '',
  familyMembers: [],
  lifestyles: [],
  mediaDocs: [],
  triggers: [],
  safeTopics: [],
  aiSuggestionsLoaded: false
};

const AVATAR_OPTIONS: AvatarType[] = ['panda', 'jellyfish', 'axolotl'];

export const ConfigFlow: React.FC<ConfigFlowProps> = ({ caregiverEmail, patient, onSave, onBack }) => {
  const [formData, setFormData] = useState<PatientProfile>(patient || { ...EmptyPatient });
  const [currentStep, setCurrentStep] = useState<number>(0); // 0: Basics, 1: People & Safety
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  
  const [newLifestyle, setNewLifestyle] = useState('');
  const [famName, setFamName] = useState('');
  const [famRel, setFamRel] = useState('');
  const [newTrigger, setNewTrigger] = useState('');
  const [newTopic, setNewTopic] = useState('');

  useEffect(() => {
    if (patient) {
      const p = patient as any;
      setFormData({
        ...patient,
        patient_id: p.patient_id || p.id || '',
        name: p.full_name || p.name || '',
        avatarType: p.avatarType || 'jellyfish', 
        age: p.age || 0,
        stage: p.dementia_stage || p.stage || DementiaStage.EARLY,
        description: p.patient_story || p.description || '',
        lifestyles: p.hobbies_and_career 
          ? (typeof p.hobbies_and_career === 'string' ? p.hobbies_and_career.split(', ') : p.hobbies_and_career)
          : (patient.lifestyles || []),
        familyMembers: p.key_people || p.familyMembers || [],
        triggers: p.known_triggers || p.triggers || [],
        safeTopics: p.approved_topics || p.safeTopics || []
      });
    }
  }, [patient]);

  const validateStep = (stepIndex: number) => {
    setError(null);
    if (stepIndex === 0) {
      if (!formData.name?.trim()) return "Full Name is required.";
      if (!formData.age || formData.age <= 0) return "A valid Age is required.";
    } else if (stepIndex === 1) {
      if ((formData.familyMembers?.length || 0) < 1) return "Add at least 1 Key Person.";
      if ((formData.safeTopics?.length || 0) < 3) return "Add at least 3 Approved Topics.";
      if ((formData.triggers?.length || 0) < 3) return "Add at least 3 Known Triggers.";
    }
    return null;
  };

  const handleNext = () => {
    const errorMsg = validateStep(currentStep);
    if (errorMsg) { setError(errorMsg); return; }
    setCurrentStep(1);
  };

  const handleFinalSave = async () => {
    const errorMsg = validateStep(currentStep);
    if (errorMsg) { setError(errorMsg); return; }
    
    setIsLoading(true);
    const backendPayload = {
      patient_id: formData.patient_id || null,
      full_name: (formData.name || '').trim(),
      avatarType: formData.avatarType, 
      age: parseInt(String(formData.age)) || 0,
      dementia_stage: formData.stage,
      patient_story: formData.description || "",
      hobbies_and_career: (formData.lifestyles || []).join(", "),
      key_people: (formData.familyMembers || []).map(m => ({ name: m.name, relation: m.relation })),
      approved_topics: formData.safeTopics || [],
      known_triggers: formData.triggers || []
    };

    try {
      const response = await fetch(`http://127.0.0.1:8000/patients/save/${encodeURIComponent(caregiverEmail.toLowerCase().trim())}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(backendPayload)
      });
      const result = await response.json();
      if (response.ok && result.success) {
        onSave({ ...formData, patient_id: result.patient_id, id: result.patient_id });
      } else {
        setError(result.detail || "Failed to save.");
      }
    } catch (err) {
      setError("Server connection failed.");
    } finally {
      setIsLoading(false);
    }
  };

  const addTag = (field: 'lifestyles' | 'triggers' | 'safeTopics', value: string, setter: (s: string) => void) => {
    if (!value.trim()) return;
    setFormData(prev => ({ ...prev, [field]: [...(prev[field] || []), value.trim()] }));
    setter('');
  };

  const removeTag = (field: 'lifestyles' | 'triggers' | 'safeTopics' | 'familyMembers', index: number) => {
    setFormData(prev => ({ 
      ...prev, 
      [field]: (prev[field as keyof PatientProfile] as any[]).filter((_, i) => i !== index) 
    }));
  };

  const addFamilyMember = () => {
    if (!famName.trim() || !famRel.trim()) return;
    setFormData(prev => ({ 
      ...prev, 
      familyMembers: [...(prev.familyMembers || []), { name: famName, relation: famRel }] 
    }));
    setFamName(''); setFamRel('');
  };

  return (
    <div className="w-full max-w-5xl mx-auto min-h-screen flex flex-col p-6 pb-48 text-[var(--nura-text)]">
      <div className="max-w-3xl mx-auto w-full space-y-8">

        {/* ── PAGE HEADER ── */}
        <div className="text-center pt-2 pb-4">
          {patient ? (
            <>
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[var(--nura-accent)] mb-2">Configure</p>
              <h1 className="text-4xl font-extrabold text-[var(--nura-text)]">
                Edit {formData.name || patient.name || (patient as any).full_name}'s Details
              </h1>
            </>
          ) : (
            <>
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[var(--nura-accent)] mb-2">New Profile</p>
              <h1 className="text-4xl font-extrabold text-[var(--nura-text)]">Add a Loved One</h1>
            </>
          )}
        </div>

        {/* PAGE 1: BASICS */}
        {currentStep === 0 && (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
             {/* Avatar Selection */}
             <div className="flex justify-center items-end gap-12 w-full max-w-2xl px-8 mx-auto">
              {AVATAR_OPTIONS.map((type) => (
                <button 
                  key={type} 
                  type="button"
                  onClick={() => setFormData(p => ({...p, avatarType: type}))} 
                  className={`relative p-6 rounded-[2.5rem] transition-all duration-500 flex flex-col items-center ${formData.avatarType === type ? 'bg-[var(--nura-accent)]/20 scale-110 ring-2 ring-[var(--nura-accent)]' : 'opacity-40 grayscale hover:opacity-100'}`}
                >
                  <Avatar size="md" type={type} emotion={formData.avatarType === type ? 'happy' : 'neutral'} />
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
                  <input type="text" value={formData.name || ''} onChange={(e) => setFormData({...formData, name: e.target.value})} className="w-full bg-transparent border-2 border-[var(--nura-text)]/20 rounded-xl p-4 focus:border-[var(--nura-accent)] outline-none transition-all" />
                </div>
                <div>
                  <label className="block text-xs font-black text-[var(--nura-dim)] mb-2 uppercase tracking-widest">Age *</label>
                  <input type="number" value={formData.age === 0 ? '' : formData.age} onChange={(e) => setFormData({...formData, age: parseInt(e.target.value) || 0})} className="w-full bg-transparent border-2 border-[var(--nura-text)]/20 rounded-xl p-4 focus:border-[var(--nura-accent)] outline-none" />
                </div>
              </div>

              <div className="mb-8">
                <label className="block text-xs font-black text-[var(--nura-dim)] mb-2 uppercase flex items-center gap-2">
                  <BookOpen size={14}/> Patient Story
                </label>
                <textarea 
                  value={formData.description || ''} 
                  onChange={(e) => setFormData({...formData, description: e.target.value})} 
                  placeholder="Describe their personality and background..."
                  className="w-full bg-transparent border-2 border-[var(--nura-text)]/20 rounded-xl p-4 h-32 focus:border-[var(--nura-accent)] outline-none resize-none" 
                />
              </div>

              <div>
                <label className="block text-xs font-black text-[var(--nura-dim)] mb-2 uppercase flex items-center gap-2">
                  <Briefcase size={14}/> Hobbies & Career
                </label>
                <div className="flex gap-3 mb-4">
                  <input type="text" value={newLifestyle} onChange={(e) => setNewLifestyle(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && addTag('lifestyles', newLifestyle, setNewLifestyle)} className="flex-1 bg-transparent border-2 border-[var(--nura-text)]/20 rounded-xl p-4 outline-none" placeholder="e.g. Architect" />
                  <button onClick={() => addTag('lifestyles', newLifestyle, setNewLifestyle)} className="bg-[var(--nura-accent)] text-white px-6 rounded-xl"><Plus size={24}/></button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {(formData.lifestyles || []).map((tag, idx) => (
                    <div key={idx} className="bg-[var(--nura-accent)]/10 border border-[var(--nura-accent)]/30 px-4 py-2 rounded-full flex items-center gap-2">
                      <span className="text-sm font-bold">{tag}</span>
                      <button onClick={() => removeTag('lifestyles', idx)} className="text-[var(--nura-dim)] hover:text-red-500"><X size={14}/></button>
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
                  { value: DementiaStage.EARLY, title: "Mild", desc: "Mostly independent but has occasional memory lapses" },
                  { value: DementiaStage.MIDDLE, title: "Moderate", desc: "Struggles to find words or gets confused about time" },
                  { value: DementiaStage.LATE, title: "Severe", desc: "Communication is difficult; responds best to music or touch" }
                ].map((option) => (
                  <button
                    key={option.value}
                    onClick={() => setFormData(prev => ({ ...prev, stage: option.value as DementiaStage }))}
                    className={`w-full p-6 rounded-2xl border-2 text-left transition-all ${
                      formData.stage === option.value ? 'bg-[var(--nura-accent)] border-[var(--nura-accent)] text-white' : 'bg-[var(--nura-bg)]/30 border-[var(--nura-text)]/10'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-black text-lg">{option.title}</span>
                      {formData.stage === option.value && <CheckCircle2 size={20} />}
                    </div>
                    <p className={`text-sm font-medium ${formData.stage === option.value ? 'opacity-90' : 'text-[var(--nura-dim)]'}`}>{option.desc}</p>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* PAGE 2: PEOPLE & SAFETY */}
        {currentStep === 1 && (
          <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
            {/* Key People */}
            <div className="bg-[var(--nura-card)] p-8 rounded-[2rem] border border-[var(--nura-text)]/10 shadow-xl">
              <h3 className="flex items-center gap-3 text-xl font-bold mb-2">
                <Users size={24} className="text-pink-500" /> Key People *
              </h3>
              <p className="text-[var(--nura-dim)] text-sm mb-6 leading-relaxed">Add close family or friends who visit frequently.</p>
              
              <div className="bg-[var(--nura-bg)]/50 rounded-2xl p-6 border border-[var(--nura-text)]/10 mb-8">
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <input type="text" value={famName} onChange={(e) => setFamName(e.target.value)} placeholder="Name" className="bg-transparent border-2 border-[var(--nura-text)]/20 rounded-xl p-4 focus:border-pink-500 outline-none" />
                  <input type="text" value={famRel} onChange={(e) => setFamRel(e.target.value)} placeholder="Relation" className="bg-transparent border-2 border-[var(--nura-text)]/20 rounded-xl p-4 focus:border-pink-500 outline-none" />
                </div>
                <button onClick={addFamilyMember} className="w-full bg-pink-500 hover:bg-pink-600 text-white py-4 rounded-xl font-black transition-all shadow-md">Add Person</button>
              </div>

              <div className="space-y-3">
                {(formData.familyMembers || []).map((member, idx) => (
                  <div key={idx} className="bg-[var(--nura-bg)]/30 border border-[var(--nura-text)]/10 rounded-2xl p-4 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-pink-500/20 flex items-center justify-center text-pink-500"><User size={20} /></div>
                      <div>
                        <p className="font-black text-lg leading-tight">{member.name}</p>
                        <p className="text-xs font-bold text-[var(--nura-dim)] uppercase tracking-tighter">{member.relation}</p>
                      </div>
                    </div>
                    <button onClick={() => removeTag('familyMembers', idx)} className="text-[var(--nura-dim)] hover:text-red-500"><X size={20}/></button>
                  </div>
                ))}
              </div>
            </div>

            {/* Approved Topics */}
            <div className="bg-[var(--nura-card)] p-8 rounded-[2rem] border border-[var(--nura-text)]/10 shadow-xl">
              <h3 className="flex items-center gap-3 text-xl font-bold mb-2 text-green-500">
                <CheckCircle2 size={24} /> Approved Topics *
              </h3>
              <p className="text-[var(--nura-dim)] text-sm mb-6 leading-relaxed">
                Safe, positive subjects that help ground the patient (e.g., childhood pets, classical music).
              </p>
              <div className="flex gap-3 mb-6">
                <input type="text" value={newTopic} onChange={(e) => setNewTopic(e.target.value)} placeholder="Add a safe topic..." className="flex-1 bg-transparent border-2 border-[var(--nura-text)]/20 rounded-xl p-4 outline-none focus:border-green-500" />
                <button onClick={() => addTag('safeTopics', newTopic, setNewTopic)} className="bg-green-500 text-white p-4 rounded-xl shadow-lg"><Plus size={24}/></button>
              </div>
              <div className="flex flex-wrap gap-2">
                {(formData.safeTopics || []).map((tag, idx) => (
                  <div key={idx} className="bg-green-500/10 border border-green-500/20 px-4 py-2 rounded-xl flex items-center gap-2">
                    <span className="font-bold text-sm">{tag}</span>
                    <button onClick={() => removeTag('safeTopics', idx)} className="text-green-600 hover:text-red-500"><X size={16}/></button>
                  </div>
                ))}
              </div>
            </div>

            {/* Known Triggers */}
            <div className="bg-[var(--nura-card)] p-8 rounded-[2rem] border border-[var(--nura-text)]/10 shadow-xl">
              <h3 className="flex items-center gap-3 text-xl font-bold mb-2 text-red-500">
                <AlertCircle size={24} /> Known Triggers *
              </h3>
              <p className="text-[var(--nura-dim)] text-sm mb-6 leading-relaxed">
                Identify topics or situations that may cause distress or confusion.
              </p>
              <div className="flex gap-3 mb-6">
                <input type="text" value={newTrigger} onChange={(e) => setNewTrigger(e.target.value)} placeholder="Add a trigger..." className="flex-1 bg-transparent border-2 border-[var(--nura-text)]/20 rounded-xl p-4 outline-none focus:border-red-500" />
                <button onClick={() => addTag('triggers', newTrigger, setNewTrigger)} className="bg-red-500 text-white p-4 rounded-xl shadow-lg"><Plus size={24}/></button>
              </div>
              <div className="flex flex-wrap gap-2">
                {(formData.triggers || []).map((tag, idx) => (
                  <div key={idx} className="bg-red-500/10 border border-red-500/20 px-4 py-2 rounded-xl flex items-center gap-2">
                    <span className="font-bold text-sm">{tag}</span>
                    <button onClick={() => removeTag('triggers', idx)} className="text-red-600 hover:text-red-800"><X size={16}/></button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* FOOTER */}
      <div className="fixed bottom-0 left-0 right-0 p-8 bg-gradient-to-t from-[var(--nura-bg)] via-[var(--nura-bg)] to-transparent z-50">
        <div className="max-w-3xl mx-auto flex flex-col gap-4">
          {error && (
            <div className="bg-red-500/20 border border-red-500/50 text-red-100 p-4 rounded-2xl flex items-center gap-3 animate-bounce">
              <AlertTriangle size={20} className="text-red-500" />
              <p className="font-bold text-sm">{error}</p>
            </div>
          )}
          <div className="flex gap-4">
            <button onClick={onBack} className="px-8 py-5 rounded-2xl bg-[var(--nura-card)] text-[var(--nura-text)] font-bold border border-[var(--nura-text)]/10">Cancel</button>
            {currentStep === 1 && <button onClick={() => setCurrentStep(0)} className="px-8 py-5 rounded-2xl bg-[var(--nura-card)] text-[var(--nura-text)] font-bold border border-[var(--nura-text)]/10"><ArrowLeft size={24}/></button>}
            <button 
              onClick={currentStep === 0 ? handleNext : handleFinalSave} 
              disabled={isLoading}
              className="flex-1 bg-[var(--nura-text)] text-[var(--nura-bg)] text-xl font-black py-5 rounded-2xl shadow-2xl flex items-center justify-center gap-3 transition-transform active:scale-95"
            >
              {isLoading ? "Saving..." : currentStep === 0 ? "Next" : "Save Settings"}
              {!isLoading && (currentStep === 0 ? <Check size={24} /> : <CheckCircle2 size={24} />)}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
