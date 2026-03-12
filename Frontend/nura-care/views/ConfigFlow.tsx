import React, { useState, useEffect } from 'react';
import { DementiaStage } from '../types';
import type { PatientProfile, AvatarType } from '../types';
import { Avatar } from '../components/Avatar';
import {
  CheckCircle2, User, Brain, X,
  Users, Briefcase, AlertCircle, ArrowRight, ArrowLeft, AlertTriangle,
  BookOpen
} from 'lucide-react';

interface ConfigFlowProps {
  caregiverEmail: string;
  patient: PatientProfile | null;
  onSave: (patient: PatientProfile) => void;
  onBack: () => void;
  isSubView?: boolean; 
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

const STEPS = [
  { id: 'basics', label: 'Basics' },
  { id: 'reminiscence', label: 'Reminiscence' },
  { id: 'safety', label: 'Safety' }
] as const;

export const ConfigFlow: React.FC<ConfigFlowProps> = ({ caregiverEmail, patient, onSave, onBack }) => {
  const [formData, setFormData] = useState<PatientProfile>(patient || { ...EmptyPatient });
  const [currentStep, setCurrentStep] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  
  const [newLifestyle, setNewLifestyle] = useState('');
  const [famName, setFamName] = useState('');
  const [famRel, setFamRel] = useState('');
  const [newTrigger, setNewTrigger] = useState('');
  const [newTopic, setNewTopic] = useState('');

  const activeSection = STEPS[currentStep].id;

  useEffect(() => {
    if (patient) {
      const p = patient as any;
      setFormData({
        ...patient,
        patient_id: p.patient_id || p.id || '',
        name: p.full_name || p.name || '',
        avatarType: p.avatarType || 'jellyfish', // Ensure avatar is loaded
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
    const stepId = STEPS[stepIndex].id;
    if (stepId === 'basics') {
      if (!formData.name?.trim()) return "Full Name is required.";
      if (!formData.age || formData.age <= 0) return "A valid Age is required.";
    }
    if (stepId === 'reminiscence' && (formData.familyMembers?.length || 0) < 1) return "Add at least 1 Key Person.";
    if (stepId === 'safety') {
      if ((formData.safeTopics?.length || 0) < 3) return "Add at least 3 Approved Topics.";
      if ((formData.triggers?.length || 0) < 3) return "Add at least 3 Known Triggers.";
    }
    return null;
  };

  const handleNext = () => {
    const errorMsg = validateStep(currentStep);
    if (errorMsg) { setError(errorMsg); return; }
    setCurrentStep(prev => prev + 1);
  };

  const handleBackStep = () => {
    setError(null);
    if (currentStep > 0) setCurrentStep(prev => prev - 1);
  };

  const handleFinalSave = async () => {
    const errorMsg = validateStep(currentStep);
    if (errorMsg) { setError(errorMsg); return; }
    
    setIsLoading(true);
    setError(null);

    // FIXED: Added avatarType to payload so it saves to the backend
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
        onSave({ 
          ...formData, 
          patient_id: result.patient_id, 
          id: result.patient_id 
        });
      } else {
        const msg = Array.isArray(result.detail) ? result.detail[0].msg : result.detail;
        setError(msg || "Failed to save profile.");
        setIsLoading(false);
      }
    } catch (err) {
      setError("Server connection failed. Is the Python backend running?");
      setIsLoading(false);
    }
  };

  const addTag = (field: 'lifestyles' | 'triggers' | 'safeTopics', value: string, setter: (s: string) => void) => {
    if (!value.trim()) return;
    setFormData(prev => ({ 
      ...prev, 
      [field]: [...(prev[field] || []), value.trim()] 
    }));
    setter('');
  };

  const removeTag = (field: 'lifestyles' | 'triggers' | 'safeTopics', index: number) => {
    setFormData(prev => ({ 
      ...prev, 
      [field]: (prev[field] || []).filter((_, i) => i !== index) 
    }));
  };

  const addFamilyMember = () => {
    if (!famName.trim() || !famRel.trim()) return;
    const newMember = { name: famName, relation: famRel };
    setFormData(prev => ({ 
      ...prev, 
      familyMembers: [...(prev.familyMembers || []), newMember] 
    }));
    setFamName(''); setFamRel('');
  };

  return (
    <div className="w-full max-w-5xl mx-auto min-h-screen flex flex-col p-6 animate-in fade-in duration-700 pb-40 text-[var(--nura-text)]">
      <div className="max-w-3xl mx-auto w-full">
        
        {activeSection === 'basics' && (
          <div className="space-y-10 animate-in slide-in-from-right-8 duration-500">
             {/* AVATAR PICKER */}
             <div className="flex justify-center items-end gap-12 w-full max-w-2xl px-8 mx-auto">
              {AVATAR_OPTIONS.map((type) => (
                <button 
                  key={type} 
                  type="button"
                  onClick={() => setFormData(p => ({...p, avatarType: type}))} 
                  className={`relative p-6 rounded-[2.5rem] transition-all duration-500 flex flex-col items-center ${formData.avatarType === type ? 'bg-indigo-500/20 scale-110 ring-2 ring-indigo-400' : 'opacity-40 grayscale hover:opacity-100'}`}
                >
                  <Avatar size="md" type={type} emotion={formData.avatarType === type ? 'happy' : 'neutral'} />
                  {formData.avatarType === type && (
                    <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 bg-indigo-400 text-slate-900 text-[10px] font-black px-4 py-1.5 rounded-full shadow-lg">Selected</div>
                  )}
                </button>
              ))}
            </div>

            {/* PERSONAL INFO */}
            <div className="bg-[var(--nura-card)] p-8 rounded-[2rem] border-white/10 shadow-xl">
              <h3 className="flex items-center gap-3 text-xl font-bold mb-6 text-indigo-100 border-b border-white/5 pb-4">
                <User size={24} className="text-indigo-400" /> Personal Information
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="md:col-span-3">
                  <label className="block text-base font-bold text-[var(--nura-dim)] mb-2">Full Name *</label>
                  <input 
                    type="text" 
                    value={formData.name || ''} 
                    onChange={(e) => setFormData({...formData, name: e.target.value})} 
                    className="w-full bg-black/20 border border-white/10 rounded-xl p-4 text-[var(--nura-text)] focus:border-indigo-400 outline-none" 
                  />
                </div>
                <div>
                  <label className="block text-base font-bold text-[var(--nura-dim)] mb-2">Age *</label>
                  <input 
                    type="number" 
                    value={formData.age === 0 ? '' : formData.age} 
                    onChange={(e) => setFormData({...formData, age: parseInt(e.target.value) || 0})} 
                    className="w-full bg-black/20 border border-white/10 rounded-xl p-4 text-[var(--nura-text)] focus:border-indigo-400 outline-none" 
                    placeholder="0" 
                  />
                </div>
              </div>
            </div>

               <div className="bg-[var(--nura-card)] p-8 rounded-[2rem] border-l-8 border-l-purple-500/50 border-white/10 shadow-xl">
                      <h3 className="flex items-center gap-3 text-xl font-bold mb-3 text-indigo-100">
                          <Brain size={24} className="text-purple-400" /> Dementia Stage <span className="text-red-400">*</span>
                      </h3>
                      <p className="text-base text-indigo-200/80 mb-6">Helping the AI adjust conversational complexity and tone.</p>
                      
                      <div className="grid grid-cols-1 gap-4">
                        {[
                          {
                            value: DementiaStage.EARLY,
                            title: "Mild",
                            desc: "They are mostly independent but have occasional memory lapses"
                          },
                          {
                            value: DementiaStage.MIDDLE,
                            title: "Moderate",
                            desc: "They sometimes get confused about time or place, or struggle to find the right words"
                          },
                          {
                            value: DementiaStage.LATE,
                            title: "Severe",
                            desc: "Verbal communication is difficult, and they respond best to music, touch, or visual cues"
                          }
                        ].map((option) => (
                          <button
                            key={option.value}
                            onClick={() => { setFormData(prev => ({ ...prev, stage: option.value as DementiaStage, aiSuggestionsLoaded: false })); setError(null); }}
                            className={`p-5 rounded-2xl border text-left transition-all flex flex-col gap-2 relative overflow-hidden group ${
                              formData.stage === option.value
                                ? 'bg-indigo-500/20 border-indigo-400 shadow-[0_0_20px_rgba(99,102,241,0.15)]'
                                : 'bg-black/20 border-white/10 hover:bg-[var(--nura-card)] hover:border-white/30'
                            }`}
                          >
                            <div className={`font-bold text-lg flex items-center justify-between ${formData.stage === option.value ? 'text-[var(--nura-dim)]' : 'text-[var(--nura-text)]'}`}>
                              {option.title}
                              {formData.stage === option.value && <CheckCircle2 size={20} className="text-indigo-400" />}
                            </div>
                            <p className="text-base text-indigo-200/70 leading-relaxed font-medium">
                              {option.desc}
                            </p>
                          </button>
                        ))}
                      </div>
                  </div>
              </div>
          )}

        {activeSection === 'reminiscence' && (
          <div className="space-y-6 animate-in slide-in-from-right-8 duration-500">
            {/* STORY */}
            <div className="bg-[var(--nura-card)] p-8 rounded-[2rem] border-white/10 shadow-xl">
              <h3 className="flex items-center gap-3 text-xl font-bold mb-4 text-indigo-100 border-b border-white/5 pb-4">
                <BookOpen size={24} className="text-cyan-400" /> Patient Story
              </h3>
              <textarea 
                value={formData.description || ''} 
                onChange={(e) => setFormData({...formData, description: e.target.value})} 
                className="w-full bg-black/20 border border-white/10 rounded-xl p-4 text-[var(--nura-text)] min-h-[120px] focus:border-indigo-400 outline-none" 
                placeholder="Describe their life, personality, or important memories..." 
              />
            </div>

            {/* HOBBIES */}
            <div className="bg-[var(--nura-card)] p-8 rounded-[2rem] border-white/10 border-t-8 border-t-amber-500/50">
              <h3 className="flex items-center gap-3 text-xl font-bold mb-4 text-indigo-100 pb-4">
                <Briefcase size={24} className="text-amber-400" /> Hobbies & Career
              </h3>
              <div className="flex gap-3 mb-6">
                <input 
                  type="text" 
                  value={newLifestyle} 
                  onChange={(e) => setNewLifestyle(e.target.value)} 
                  onKeyDown={(e) => e.key === 'Enter' && addTag('lifestyles', newLifestyle, setNewLifestyle)} 
                  className="flex-1 bg-black/20 border border-white/10 rounded-xl p-4 text-[var(--nura-text)] focus:outline-none" 
                  placeholder="e.g. Piano Teacher, Gardening" 
                />
                <button 
                  type="button" 
                  onClick={() => addTag('lifestyles', newLifestyle, setNewLifestyle)} 
                  className="bg-indigo-500 px-6 rounded-xl font-bold text-[var(--nura-text)]"
                >
                  +
                </button>
              </div>
              <div className="flex flex-wrap gap-3">
                {(formData.lifestyles || []).map((tag, idx) => (
                  <span key={idx} className="bg-amber-500/10 border border-amber-500/20 text-amber-100 px-4 py-2 rounded-xl flex items-center gap-3">
                    {tag}
                    <button type="button" onClick={() => removeTag('lifestyles', idx)}><X size={14}/></button>
                  </span>
                ))}
              </div>
            </div>

            {/* KEY PEOPLE */}
            <div className="bg-[var(--nura-card)] p-8 rounded-[2rem] border-white/10 border-t-8 border-t-pink-500/50">
              <h3 className="flex items-center gap-3 text-xl font-bold mb-3 text-indigo-100">
                <Users size={24} className="text-pink-400" /> Key People *
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                {(formData.familyMembers || []).map((member, idx) => (
                  <div key={idx} className="bg-[var(--nura-card)] border border-white/10 rounded-2xl p-4 flex items-center justify-between">
                    <div>
                      <h4 className="font-bold text-[var(--nura-text)]">{member.name}</h4>
                      <p className="text-sm text-[var(--nura-dim)]">{member.relation}</p>
                    </div>
                    <button 
                      type="button" 
                      onClick={() => setFormData(p => ({...p, familyMembers: (p.familyMembers || []).filter((_, i) => i !== idx)}))}
                    >
                      <X size={18} className="text-red-300" />
                    </button>
                  </div>
                ))}
              </div>
              <div className="bg-black/20 rounded-2xl p-5 border border-white/5 flex flex-col gap-4">
                <div className="grid grid-cols-2 gap-4">
                  <input type="text" value={famName} onChange={(e) => setFamName(e.target.value)} placeholder="Name" className="bg-black/20 border border-white/10 rounded-xl p-3 text-[var(--nura-text)]" />
                  <input type="text" value={famRel} onChange={(e) => setFamRel(e.target.value)} placeholder="Relation" className="bg-black/20 border border-white/10 rounded-xl p-3 text-[var(--nura-text)]" />
                </div>
                <button type="button" onClick={addFamilyMember} className="bg-pink-500/80 hover:bg-pink-500 text-[var(--nura-text)] py-3 rounded-xl font-bold transition-colors">
                  Add Person
                </button>
              </div>
            </div>
          </div>
        )}

        {activeSection === 'safety' && (
          <div className="space-y-8 animate-in slide-in-from-right-8 duration-500">
            {/* TOPICS */}
            <div className="bg-[var(--nura-card)] p-8 rounded-[2rem] border-t-8 border-t-green-500/50 border-white/10 shadow-xl">
              <h3 className="flex items-center gap-3 text-xl font-bold mb-3 text-indigo-100">
                <CheckCircle2 size={26} className="text-green-400" /> Approved Topics *
              </h3>
              <div className="flex gap-3 mb-6">
                <input type="text" value={newTopic} onChange={(e) => setNewTopic(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && addTag('safeTopics', newTopic, setNewTopic)} className="flex-1 bg-black/20 border border-white/10 rounded-xl p-4 text-[var(--nura-text)] focus:outline-none" placeholder="e.g. Classical Music" />
                <button type="button" onClick={() => addTag('safeTopics', newTopic, setNewTopic)} className="bg-green-500/20 px-6 rounded-xl font-bold text-green-200">+</button>
              </div>
              <div className="flex flex-wrap gap-3">
                {(formData.safeTopics || []).map((tag, idx) => (
                  <span key={idx} className="bg-green-500/10 border border-green-500/20 text-green-100 px-4 py-2 rounded-xl flex items-center gap-3">
                    {tag}
                    <button type="button" onClick={() => removeTag('safeTopics', idx)}><X size={14}/></button>
                  </span>
                ))}
              </div>
            </div>

            {/* TRIGGERS */}
            <div className="bg-[var(--nura-card)] p-8 rounded-[2rem] border-t-8 border-t-red-500/50 border-white/10 shadow-xl">
              <h3 className="flex items-center gap-3 text-xl font-bold mb-3 text-indigo-100">
                <AlertCircle size={26} className="text-red-400" /> Known Triggers *
              </h3>
              <div className="flex gap-3 mb-6">
                <input type="text" value={newTrigger} onChange={(e) => setNewTrigger(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && addTag('triggers', newTrigger, setNewTrigger)} className="flex-1 bg-black/20 border border-white/10 rounded-xl p-4 text-[var(--nura-text)] focus:outline-none" placeholder="e.g. Late for work" />
                <button type="button" onClick={() => addTag('triggers', newTrigger, setNewTrigger)} className="bg-red-500/20 px-6 rounded-xl font-bold text-red-200">+</button>
              </div>
              <div className="flex flex-wrap gap-3">
                {(formData.triggers || []).map((tag, idx) => (
                  <span key={idx} className="bg-red-500/10 border border-red-500/20 text-red-100 px-4 py-2 rounded-xl flex items-center gap-3">
                    {tag}
                    <button type="button" onClick={() => removeTag('triggers', idx)}><X size={14}/></button>
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* FOOTER NAVIGATION */}
<div className="fixed bottom-0 left-0 right-0 p-8 bg-gradient-to-t from-[var(--nura-bg)] via-[var(--nura-bg)]/90 to-transparent z-50">
        <div className="max-w-3xl mx-auto flex flex-col gap-4">
          {error && (
            <div className="w-full bg-red-500/20 border border-red-500/50 text-red-100 px-6 py-4 rounded-2xl flex items-center gap-3 animate-pulse">
              <AlertTriangle size={24} className="text-red-400 shrink-0" />
              <p className="font-bold">{error}</p>
            </div>
          )}
          <div className="flex gap-4 w-full">
            <button type="button" onClick={onBack} className="px-8 py-5 rounded-[1.5rem] bg-[var(--nura-card)] text-[var(--nura-text)]/50 font-bold border border-white/10 hover:bg-nura-accent/20 transition-all">Cancel</button>
            {currentStep > 0 && (
              <button type="button" onClick={handleBackStep} className="px-8 py-5 rounded-[1.5rem] bg-nura-card text-[var(--nura-text)] font-bold border border-white/10 hover:bg-transparent/20 transition-all"><ArrowLeft size={24} /></button>
            )}
            <button 
              onClick={currentStep < STEPS.length - 1 ? handleNext : handleFinalSave} 
              disabled={isLoading} 
              className="flex-1 bg-transparent text-[#171140] text-xl font-black py-5 rounded-[1.5rem] shadow-2xl transition-all hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-3 disabled:opacity-50"
            >
              {isLoading ? "Saving..." : currentStep < STEPS.length - 1 ? "Next" : "Save Companion Settings"}
              {!isLoading && (currentStep < STEPS.length - 1 ? <ArrowRight size={24} /> : <CheckCircle2 size={24} />)}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
