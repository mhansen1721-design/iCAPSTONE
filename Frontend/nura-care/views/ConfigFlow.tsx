
import React, { useState } from 'react';
import { DementiaStage } from '../types';
import type { PatientProfile, AvatarType, FamilyMember } from '../types';
import { Avatar } from '../components/Avatar';
import { 
  ChevronLeft, CheckCircle2, 
  User, Brain, ShieldCheck, X,
  Users, Image as ImageIcon, Upload, FileText, Briefcase, AlertCircle, ArrowRight, ArrowLeft, AlertTriangle,
  BookOpen
} from 'lucide-react';

interface ConfigFlowProps {
  patient: PatientProfile | null;
  onSave: (patient: PatientProfile) => void;
  onBack: () => void;
}

const EmptyPatient: PatientProfile = {
  id: '',
  name: '',
  avatarType: 'jellyfish',
  age: 65,
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

export const ConfigFlow: React.FC<ConfigFlowProps> = ({ patient, onSave, onBack }) => {
  const [formData, setFormData] = useState<PatientProfile>(patient || { ...EmptyPatient, id: crypto.randomUUID() });
  const [currentStep, setCurrentStep] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);
  
  // Reminiscence inputs
  const [newLifestyle, setNewLifestyle] = useState('');
  
  // Family Member Inputs
  const [famName, setFamName] = useState('');
  const [famRel, setFamRel] = useState('');
  const [famPhoto, setFamPhoto] = useState<string | null>(null);

  // Safety inputs
  const [newTrigger, setNewTrigger] = useState('');
  const [newTopic, setNewTopic] = useState('');

  const activeSection = STEPS[currentStep].id;

  const validateStep = (step: number) => {
    setError(null);
    if (step === 0) { // Basics
      if (!formData.name.trim()) return "Full Name is required.";
      if (!formData.age || isNaN(formData.age)) return "Valid Age is required.";
      if (!formData.stage) return "Dementia Stage is required.";
    }
    if (step === 1) { // Reminiscence
      if (!formData.description || !formData.description.trim()) return "Please provide a brief Patient Story describing them.";
      if (formData.familyMembers.length === 0) return "Please add at least one Key Person.";
      // Hobbies are now optional
    }
    if (step === 2) { // Safety
      if (formData.triggers.length === 0) return "Please add at least one Known Trigger.";
    }
    return null;
  };

  const handleNext = () => {
    const errorMsg = validateStep(currentStep);
    if (errorMsg) {
      setError(errorMsg);
      return;
    }

    if (currentStep < STEPS.length - 1) {
      setCurrentStep(prev => prev + 1);
    }
  };

  const handleBackStep = () => {
    setError(null);
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const handleFinalSave = () => {
    const errorMsg = validateStep(currentStep);
    if (errorMsg) {
      setError(errorMsg);
      return;
    }
    onSave(formData);
  };

  const addTag = (field: 'lifestyles' | 'triggers' | 'safeTopics', value: string, setter: (s: string) => void) => {
    if (!value.trim()) return;
    setFormData(prev => ({
      ...prev,
      [field]: [...prev[field], value.trim()]
    }));
    setter('');
    // Clear error if adding a tag resolves the requirement
    if (error) setError(null);
  };

  const removeTag = (field: 'lifestyles' | 'triggers' | 'safeTopics', index: number) => {
    setFormData(prev => ({
      ...prev,
      [field]: prev[field].filter((_, i) => i !== index)
    }));
  };

  const selectAvatar = (type: AvatarType) => {
    setFormData(prev => ({ ...prev, avatarType: type }));
  };

  // Handle Photo Upload Simulation
  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onloadend = () => {
        setFamPhoto(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const addFamilyMember = () => {
    if (!famName.trim() || !famRel.trim()) return;
    
    const newMember: FamilyMember = {
      id: crypto.randomUUID(),
      name: famName,
      relation: famRel,
      photo: famPhoto || undefined
    };

    setFormData(prev => ({
      ...prev,
      familyMembers: [...prev.familyMembers, newMember]
    }));

    // Reset fields
    setFamName('');
    setFamRel('');
    setFamPhoto(null);
    if (error) setError(null);
  };

  const removeFamilyMember = (id: string) => {
    setFormData(prev => ({
      ...prev,
      familyMembers: prev.familyMembers.filter(m => m.id !== id)
    }));
  };

  // Handle Media Doc Upload Simulation
  const handleMediaUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const newFiles = Array.from(e.target.files).map((f: any) => f.name); // Just storing names for demo
      setFormData(prev => ({
        ...prev,
        mediaDocs: [...(prev.mediaDocs || []), ...newFiles]
      }));
    }
  };

  const removeMediaDoc = (idx: number) => {
    setFormData(prev => ({
      ...prev,
      mediaDocs: (prev.mediaDocs || []).filter((_, i) => i !== idx)
    }));
  };

  return (
    <div className="w-full max-w-5xl mx-auto h-[calc(100vh-2rem)] flex flex-col p-6 animate-in fade-in duration-700">
      <header className="mb-4 mt-1 flex items-center justify-between border-b border-white/5 pb-2 relative">
        <button 
          onClick={onBack} 
          className="p-1.5 hover:bg-white/10 rounded-full transition-all active:scale-90 glass-panel border-white/10 shadow-lg shadow-indigo-500/10"
          aria-label="Go back to dashboard"
        >
          <ChevronLeft size={20} className="text-indigo-200" />
        </button>

        <div className="flex-1 text-center">
          <h1 className="text-lg font-bold tracking-tight text-white">Configure Companion</h1>
        </div>
        
        <div className="w-[34px]" aria-hidden="true" />
      </header>

      <div className="flex-1 overflow-y-auto pr-2 pb-32 scroll-smooth">
        
        {/* Progress Bar */}
        <div className="max-w-2xl mx-auto mb-10 px-4">
          <div className="flex justify-between items-end mb-3">
             <span className="text-2xl font-black text-white">{STEPS[currentStep].label}</span>
             <span className="text-indigo-300 font-bold tracking-widest text-sm">
               STEP {currentStep + 1}/{STEPS.length}
             </span>
          </div>
          <div className="h-2 w-full bg-white/10 rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-indigo-500 to-[#715ffa] transition-all duration-500 ease-out shadow-[0_0_10px_rgba(113,95,250,0.5)]"
              style={{ width: `${((currentStep + 1) / STEPS.length) * 100}%` }}
            />
          </div>
        </div>

        {/* Avatar Selection Grid - Only shown on Basics step */}
        {activeSection === 'basics' && (
          <div className="flex flex-col items-center mb-10 animate-in fade-in zoom-in duration-500">
              <div className="flex justify-center items-end gap-12 w-full max-w-2xl px-8">
                {AVATAR_OPTIONS.map((type) => (
                  <button
                    key={type}
                    onClick={() => selectAvatar(type)}
                    className={`relative p-6 rounded-[2.5rem] transition-all duration-500 group flex flex-col items-center ${
                      formData.avatarType === type 
                        ? 'bg-indigo-500/20 scale-110 ring-2 ring-indigo-400 shadow-[0_0_40px_rgba(99,102,241,0.2)] z-10' 
                        : 'hover:bg-white/5 hover:scale-105 opacity-40 grayscale hover:grayscale-0 hover:opacity-100'
                    }`}
                  >
                    <Avatar size="md" type={type} emotion={formData.avatarType === type ? 'happy' : 'neutral'} />
                    {formData.avatarType === type && (
                      <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 bg-indigo-400 text-slate-900 text-[10px] font-black px-4 py-1.5 rounded-full uppercase tracking-widest shadow-xl animate-in fade-in zoom-in duration-300">
                        Selected
                      </div>
                    )}
                  </button>
                ))}
              </div>
          </div>
        )}

        <div className="max-w-3xl mx-auto">
          {activeSection === 'basics' && (
              <div className="space-y-6 animate-in slide-in-from-right-8 duration-500 px-2">
                  <div className="glass-panel p-8 rounded-[2rem] border-white/10 shadow-xl">
                      <h3 className="flex items-center gap-3 text-xl font-bold mb-6 text-indigo-100 border-b border-white/5 pb-4">
                          <User size={24} className="text-indigo-400" /> Personal Information
                      </h3>
                      <div className="space-y-6">
                          <div>
                              <label className="block text-base font-bold text-indigo-300 mb-2">
                                Full Name <span className="text-red-400">*</span>
                              </label>
                              <input 
                                  type="text" 
                                  value={formData.name}
                                  onChange={(e) => { setFormData({...formData, name: e.target.value}); setError(null); }}
                                  className="w-full bg-black/20 border border-white/10 rounded-xl p-4 text-lg text-white focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-400/20 transition-all placeholder:text-white/20"
                                  placeholder="e.g. Grandma Jane"
                              />
                          </div>
                          <div>
                              <label className="block text-base font-bold text-indigo-300 mb-2">
                                Age <span className="text-red-400">*</span>
                              </label>
                              <input 
                                  type="number" 
                                  value={formData.age}
                                  onChange={(e) => { setFormData({...formData, age: parseInt(e.target.value)}); setError(null); }}
                                  className="w-full bg-black/20 border border-white/10 rounded-xl p-4 text-lg text-white focus:outline-none focus:border-indigo-400 transition-all"
                              />
                          </div>
                      </div>
                  </div>

                  <div className="glass-panel p-8 rounded-[2rem] border-l-8 border-l-purple-500/50 border-white/10 shadow-xl">
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
                                : 'bg-black/20 border-white/10 hover:bg-white/5 hover:border-white/30'
                            }`}
                          >
                            <div className={`font-bold text-lg flex items-center justify-between ${formData.stage === option.value ? 'text-indigo-300' : 'text-white'}`}>
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
              <div className="space-y-6 animate-in slide-in-from-right-8 duration-500 px-2">
                  
                  {/* Patient Description */}
                  <div className="glass-panel p-8 rounded-[2rem] border-white/10 shadow-xl">
                      <h3 className="flex items-center gap-3 text-xl font-bold mb-4 text-indigo-100 border-b border-white/5 pb-4">
                          <BookOpen size={24} className="text-cyan-400" /> Patient Story <span className="text-red-400">*</span>
                      </h3>
                      <p className="text-base text-indigo-300 mb-4">
                        A paragraph from caregivers to describe the patient.
                      </p>
                      <textarea
                          value={formData.description}
                          onChange={(e) => { setFormData({...formData, description: e.target.value}); setError(null); }}
                          className="w-full bg-black/20 border border-white/10 rounded-xl p-4 text-lg text-white focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-400/20 transition-all placeholder:text-white/20 min-h-[120px]"
                          placeholder="e.g. She's a retired teacher who loves gardening. She has a gentle personality and enjoys talking about her grandchildren..."
                      />
                  </div>

                  {/* Hobbies & Career */}
                  <div className="glass-panel p-8 rounded-[2rem] border-white/10 shadow-xl border-t-8 border-t-amber-500/50">
                      <h3 className="flex items-center gap-3 text-xl font-bold mb-4 text-indigo-100 border-b border-white/5 pb-4">
                          <Briefcase size={24} className="text-amber-400" /> Hobbies & Career <span className="text-indigo-400/50 text-sm ml-2">(Optional)</span>
                      </h3>
                      <p className="text-base text-indigo-300 mb-6">Prompts to spark memory (e.g. "Former Carpenter", "Loves Knitting").</p>
                      
                      <div className="flex gap-3 mb-6">
                          <input 
                              type="text" 
                              value={newLifestyle}
                              onChange={(e) => setNewLifestyle(e.target.value)}
                              onKeyDown={(e) => e.key === 'Enter' && addTag('lifestyles', newLifestyle, setNewLifestyle)}
                              className="flex-1 bg-black/20 border border-white/10 rounded-xl p-4 text-lg text-white focus:outline-none focus:ring-2 focus:ring-indigo-400/20"
                              placeholder="e.g. Piano Teacher"
                          />
                          <button 
                              onClick={() => addTag('lifestyles', newLifestyle, setNewLifestyle)}
                              className="bg-[#715ffa] hover:bg-[#8475ff] px-6 rounded-xl font-bold text-2xl transition-all shadow-lg"
                              aria-label="Add lifestyle"
                          >+</button>
                      </div>

                      <div className="flex flex-wrap gap-3">
                          {formData.lifestyles.map((tag, idx) => (
                              <span key={idx} className="bg-amber-500/10 border border-amber-500/20 text-amber-100 px-4 py-2 rounded-xl text-base font-bold flex items-center gap-3 shadow-sm">
                                  {tag}
                                  <button onClick={() => removeTag('lifestyles', idx)} className="hover:text-amber-400 transition-colors" aria-label={`Remove ${tag}`}><X size={18}/></button>
                              </span>
                          ))}
                      </div>
                  </div>

                  {/* Key People */}
                  <div className="glass-panel p-8 rounded-[2rem] border-white/10 shadow-xl border-t-8 border-t-pink-500/50">
                      <h3 className="flex items-center gap-3 text-xl font-bold mb-3 text-indigo-100">
                          <Users size={24} className="text-pink-400" /> Key People <span className="text-red-400">*</span>
                      </h3>
                      <p className="text-base text-indigo-300 mb-6">
                        Add the people who visit most often. We need a clear photo of their face to help {formData.name} know who is visiting.
                      </p>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                        {formData.familyMembers.map((member) => (
                          <div key={member.id} className="bg-white/5 border border-white/10 rounded-2xl p-4 flex items-center gap-4 relative group">
                            <div className="w-14 h-14 rounded-full bg-indigo-500/30 overflow-hidden flex-shrink-0 border border-white/20">
                              {member.photo ? (
                                <img src={member.photo} alt={member.name} className="w-full h-full object-cover" />
                              ) : (
                                <User className="w-full h-full p-3 text-indigo-300" />
                              )}
                            </div>
                            <div className="overflow-hidden">
                              <h4 className="font-bold text-white truncate">{member.name}</h4>
                              <p className="text-sm text-indigo-300 truncate">{member.relation}</p>
                            </div>
                            <button 
                              onClick={() => removeFamilyMember(member.id)}
                              className="absolute top-2 right-2 p-1.5 rounded-full bg-red-500/10 text-red-300 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500/20"
                            >
                              <X size={14} />
                            </button>
                          </div>
                        ))}
                      </div>

                      <div className="bg-black/20 rounded-2xl p-5 border border-white/5">
                        <h4 className="text-sm font-bold text-indigo-200 uppercase tracking-wider mb-4">Add New Person</h4>
                        <div className="flex flex-col gap-4">
                          <div className="flex gap-4">
                            <input 
                              type="text" 
                              value={famName}
                              onChange={(e) => setFamName(e.target.value)}
                              placeholder="Name"
                              className="flex-1 bg-black/20 border border-white/10 rounded-xl p-3 text-white focus:outline-none focus:border-indigo-400"
                            />
                            <input 
                              type="text" 
                              value={famRel}
                              onChange={(e) => setFamRel(e.target.value)}
                              placeholder="Relation"
                              className="flex-1 bg-black/20 border border-white/10 rounded-xl p-3 text-white focus:outline-none focus:border-indigo-400"
                            />
                          </div>
                          
                          <div className="flex items-center gap-4">
                            <label className="flex-1 cursor-pointer group">
                              <input type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} />
                              <div className={`border-2 border-dashed rounded-xl p-3 flex items-center justify-center gap-3 transition-colors ${famPhoto ? 'border-green-500/50 bg-green-500/10' : 'border-white/10 hover:border-indigo-400/50 hover:bg-indigo-500/10'}`}>
                                {famPhoto ? (
                                  <>
                                    <div className="w-6 h-6 rounded-full overflow-hidden border border-white/20">
                                      <img src={famPhoto} className="w-full h-full object-cover" />
                                    </div>
                                    <span className="text-green-200 font-medium text-sm">Photo Selected</span>
                                  </>
                                ) : (
                                  <>
                                    <ImageIcon size={18} className="text-indigo-300" />
                                    <span className="text-indigo-300 font-medium text-sm">Upload Face Photo</span>
                                  </>
                                )}
                              </div>
                            </label>
                            
                            <button 
                              onClick={addFamilyMember}
                              disabled={!famName || !famRel}
                              className="bg-pink-500/80 hover:bg-pink-500 text-white px-6 py-3 rounded-xl font-bold shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              Add
                            </button>
                          </div>
                        </div>
                      </div>
                  </div>

                  {/* Media Uploads */}
                  <div className="glass-panel p-8 rounded-[2rem] border-white/10 shadow-xl border-t-8 border-t-blue-500/50">
                      <h3 className="flex items-center gap-3 text-xl font-bold mb-3 text-indigo-100">
                          <FileText size={24} className="text-blue-400" /> Media & Albums
                      </h3>
                      <p className="text-base text-indigo-300 mb-6">
                        Identity cards, family albums, or scanned letters to help with reminiscence.
                      </p>

                      <div className="flex flex-col gap-4">
                         {formData.mediaDocs && formData.mediaDocs.length > 0 && (
                           <div className="flex flex-wrap gap-3 mb-2">
                             {formData.mediaDocs.map((doc, idx) => (
                               <div key={idx} className="bg-blue-500/10 border border-blue-500/20 text-blue-100 px-4 py-3 rounded-xl flex items-center gap-3">
                                 <FileText size={16} />
                                 <span className="text-sm font-medium">{doc}</span>
                                 <button onClick={() => removeMediaDoc(idx)} className="hover:text-red-400 transition-colors">
                                   <X size={16} />
                                 </button>
                               </div>
                             ))}
                           </div>
                         )}

                         <label className="cursor-pointer block">
                            <input type="file" multiple className="hidden" onChange={handleMediaUpload} />
                            <div className="border-2 border-dashed border-white/10 rounded-2xl p-8 flex flex-col items-center justify-center gap-3 hover:bg-white/5 hover:border-indigo-400/40 transition-all group">
                                <div className="p-4 bg-white/5 rounded-full group-hover:bg-indigo-500/20 transition-colors">
                                  <Upload size={24} className="text-indigo-300 group-hover:text-indigo-200" />
                                </div>
                                <div className="text-center">
                                  <p className="text-indigo-200 font-bold">Click to upload files</p>
                                  <p className="text-indigo-200/50 text-sm mt-1">Supports JPG, PNG, PDF</p>
                                </div>
                            </div>
                         </label>
                      </div>
                  </div>

              </div>
          )}

          {activeSection === 'safety' && (
              <div className="space-y-8 animate-in slide-in-from-right-8 duration-500 px-2">
                  <div className="glass-panel p-8 rounded-[2rem] border-t-8 border-t-green-500/50 shadow-xl border-white/10">
                      <h3 className="flex items-center gap-3 text-xl font-bold mb-3 text-indigo-100">
                          <CheckCircle2 size={26} className="text-green-400" /> Approved Topics
                      </h3>
                      <p className="text-base text-indigo-300 mb-6 font-medium">Safe subjects like favorite pets, classic music, or the weather.</p>
                      <div className="flex gap-3 mb-6">
                          <input 
                              type="text" 
                              value={newTopic}
                              onChange={(e) => setNewTopic(e.target.value)}
                              onKeyDown={(e) => e.key === 'Enter' && addTag('safeTopics', newTopic, setNewTopic)}
                              className="flex-1 bg-black/20 border border-white/10 rounded-xl p-4 text-lg text-white focus:outline-none"
                              placeholder="Add a safe topic..."
                          />
                           <button 
                              onClick={() => addTag('safeTopics', newTopic, setNewTopic)}
                              className="bg-green-500/20 hover:bg-green-500/40 px-6 rounded-xl text-green-200 font-bold shadow-sm transition-all"
                          >+</button>
                      </div>
                      <div className="flex flex-wrap gap-3">
                          {formData.safeTopics.map((tag, idx) => (
                              <span key={idx} className="bg-green-500/10 border border-green-500/20 text-green-100 px-4 py-2 rounded-xl text-base font-bold flex items-center gap-3">
                                  {tag}
                                  <button onClick={() => removeTag('safeTopics', idx)} className="hover:text-green-400" aria-label={`Remove ${tag}`}><X size={18}/></button>
                              </span>
                          ))}
                      </div>
                  </div>

                  <div className="glass-panel p-8 rounded-[2rem] border-t-8 border-t-red-500/50 shadow-xl border-white/10">
                      <h3 className="flex items-center gap-3 text-xl font-bold mb-3 text-indigo-100">
                          <AlertCircle size={26} className="text-red-400" /> Known Triggers <span className="text-red-400">*</span>
                      </h3>
                      <p className="text-base text-indigo-300 mb-6 font-medium">Topics that may cause confusion, stress, or agitation.</p>
                      <div className="flex gap-3 mb-6">
                          <input 
                              type="text" 
                              value={newTrigger}
                              onChange={(e) => setNewTrigger(e.target.value)}
                              onKeyDown={(e) => e.key === 'Enter' && addTag('triggers', newTrigger, setNewTrigger)}
                              className="flex-1 bg-black/20 border border-white/10 rounded-xl p-4 text-lg text-white focus:outline-none"
                              placeholder="Add a known trigger..."
                          />
                          <button 
                              onClick={() => addTag('triggers', newTrigger, setNewTrigger)}
                              className="bg-red-500/20 hover:bg-red-500/40 px-6 rounded-xl text-red-200 font-bold shadow-sm transition-all"
                          >+</button>
                      </div>
                      <div className="flex flex-wrap gap-3">
                          {formData.triggers.map((tag, idx) => (
                              <span key={idx} className="bg-red-500/10 border border-red-500/20 text-red-100 px-4 py-2 rounded-xl text-base font-bold flex items-center gap-3">
                                  {tag}
                                  <button onClick={() => removeTag('triggers', idx)} className="hover:text-red-400" aria-label={`Remove ${tag}`}><X size={18}/></button>
                              </span>
                          ))}
                      </div>
                  </div>
              </div>
          )}
        </div>
      </div>

      <div className="fixed bottom-0 left-0 right-0 p-8 bg-gradient-to-t from-[#171140] via-[#171140]/90 to-transparent z-50">
          <div className="max-w-3xl mx-auto flex flex-col gap-4">
              {error && (
                <div className="w-full bg-red-500/20 border border-red-500/50 text-red-100 px-6 py-4 rounded-2xl flex items-center gap-3 animate-in fade-in slide-in-from-bottom-2">
                  <AlertTriangle size={24} className="text-red-400 flex-shrink-0" />
                  <p className="font-bold">{error}</p>
                </div>
              )}
              
              <div className="flex gap-4 w-full">
                {currentStep > 0 && (
                  <button
                    onClick={handleBackStep}
                    className="px-8 py-5 rounded-[1.5rem] bg-white/10 hover:bg-white/20 text-white font-bold text-lg backdrop-blur-md transition-all border border-white/10"
                  >
                    <ArrowLeft size={24} />
                  </button>
                )}
                
                {currentStep < STEPS.length - 1 ? (
                   <button 
                    onClick={handleNext}
                    className="flex-1 bg-white text-[#171140] hover:bg-indigo-50 text-xl font-black py-5 rounded-[1.5rem] shadow-2xl transition-all active:scale-95 flex items-center justify-center gap-3"
                  >
                      Next: {STEPS[currentStep + 1].label}
                      <ArrowRight size={24} />
                  </button>
                ) : (
                  <button 
                    onClick={handleFinalSave}
                    className="flex-1 bg-[#715ffa] hover:bg-[#8475ff] text-white text-xl font-black py-5 rounded-[1.5rem] shadow-2xl shadow-indigo-600/15 transition-all active:scale-95 border-t border-white/10 flex items-center justify-center gap-3"
                  >
                      Save Companion Settings
                      <CheckCircle2 size={24} />
                  </button>
                )}
              </div>
          </div>
      </div>
    </div>
  );
};