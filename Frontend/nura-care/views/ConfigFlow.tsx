import React, { useState, useEffect } from 'react';
import { DementiaStage } from '../types';
import type { PatientProfile, AvatarType, FamilyMember } from '../types';
import { Avatar } from '../components/Avatar';
import {
 ChevronLeft, CheckCircle2,
 User, Brain, X,
 Users, Briefcase, AlertCircle, ArrowRight, ArrowLeft, AlertTriangle,
 BookOpen
} from 'lucide-react';


interface ConfigFlowProps {
 caregiverEmail: string;
 patient: PatientProfile | null;
 onSave: (patient: PatientProfile) => void;
 onBack: () => void;
}


const EmptyPatient: PatientProfile = {
 id: '',
 name: '',
 avatarType: 'jellyfish',
 age: undefined,
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
 // --- 1. STATE MANAGEMENT ---
 const [formData, setFormData] = useState<PatientProfile>(patient || { ...EmptyPatient, id: crypto.randomUUID() });
 const [currentStep, setCurrentStep] = useState<number>(0);
 const [error, setError] = useState<string | null>(null);
 const [isLoading, setIsLoading] = useState(false);
  const [newLifestyle, setNewLifestyle] = useState('');
 const [famName, setFamName] = useState('');
 const [famRel, setFamRel] = useState('');
 const [famPhoto, setFamPhoto] = useState<string | null>(null);
 const [newTrigger, setNewTrigger] = useState('');
 const [newTopic, setNewTopic] = useState('');


 const activeSection = STEPS[currentStep].id;


 // --- 2. BACKEND: INITIAL LOAD ---
 useEffect(() => {
   const fetchExistingProfile = async () => {
     const email = caregiverEmail.toLowerCase().trim();
     try {
       const response = await fetch(`http://127.0.0.1:8000/caregiver/init-profile/${encodeURIComponent(email)}`);
       const data = await response.json();
      
       if (data.exists && data.patient) {
         const p = data.patient;
         setFormData({
           id: p.patient_id,
           name: p.full_name,
           age: p.age,
           stage: p.dementia_stage as DementiaStage,
           description: p.patient_story,
           lifestyles: p.hobbies_and_career ? p.hobbies_and_career.split(', ') : [],
           familyMembers: p.key_people.map((kp: any) => ({
             id: crypto.randomUUID(),
             name: kp.name,
             relation: kp.relation
           })),
           triggers: p.known_triggers || [],
           safeTopics: p.approved_topics || [],
           avatarType: 'jellyfish',
           mediaDocs: [],
           aiSuggestionsLoaded: true
         });
       }
     } catch (err) {
       console.log("Starting fresh: No existing profile found.");
     }
   };
   if (caregiverEmail) fetchExistingProfile();
 }, [caregiverEmail]);


 // --- 3. LOGIC FUNCTIONS ---
 const validateStep = (step: number) => {
   setError(null);
   if (step === 0) {
     if (!formData.name.trim()) return "Full Name is required.";
     if (formData.age === undefined || formData.age <= 0) return "A valid positive age is required.";
     if (!formData.stage) return "Dementia Stage is required.";
   }
   if (step === 1) {
     if (!formData.description?.trim()) return "Please provide a brief Patient Story.";
     if (formData.familyMembers.length === 0) return "Please add at least one Key Person.";
   }
   if (step === 2) {
     if (formData.triggers.length === 0) return "Please add at least one Known Trigger.";
   }
   return null;
 };


 const handleNext = () => {
   const errorMsg = validateStep(currentStep);
   if (errorMsg) { setError(errorMsg); return; }
   if (currentStep < STEPS.length - 1) setCurrentStep(prev => prev + 1);
 };


 const handleBackStep = () => {
   setError(null);
   if (currentStep > 0) setCurrentStep(prev => prev - 1);
 };


 const handleFinalSave = async () => {
   const errorMsg = validateStep(currentStep);
   if (errorMsg) { setError(errorMsg); return; }


   setIsLoading(true);
   const email = caregiverEmail.toLowerCase().trim();
  
   const backendPayload = {
     id: formData.id,
     full_name: formData.name,
     age: formData.age,
     dementia_stage: formData.stage,
     patient_story: formData.description,
     hobbies_and_career: formData.lifestyles.join(", "),
     key_people: formData.familyMembers.map(m => ({ name: m.name, relation: m.relation })),
     approved_topics: formData.safeTopics,
     known_triggers: formData.triggers
   };


   try {
     const response = await fetch(`http://127.0.0.1:8000/patients/save/${encodeURIComponent(email)}`, {
       method: "POST",
       headers: { "Content-Type": "application/json" },
       body: JSON.stringify(backendPayload)
     });


     const result = await response.json();
     if (response.ok && result.success) {
       onSave(formData); // REDIRECTS TO DASHBOARD
     } else {
       setError(result.detail || "Failed to save profile.");
     }
   } catch (err) {
     setError("Server connection failed. Is your backend running?");
   } finally {
     setIsLoading(false);
   }
 };


 const addTag = (field: 'lifestyles' | 'triggers' | 'safeTopics', value: string, setter: (s: string) => void) => {
   if (!value.trim()) return;
   setFormData(prev => ({ ...prev, [field]: [...prev[field], value.trim()] }));
   setter('');
   if (error) setError(null);
 };


 const removeTag = (field: 'lifestyles' | 'triggers' | 'safeTopics', index: number) => {
   setFormData(prev => ({ ...prev, [field]: prev[field].filter((_, i) => i !== index) }));
 };


 const selectAvatar = (type: AvatarType) => {
   setFormData(prev => ({ ...prev, avatarType: type }));
 };


 const addFamilyMember = () => {
   if (!famName.trim() || !famRel.trim()) return;
   const newMember: FamilyMember = {
     id: crypto.randomUUID(),
     name: famName,
     relation: famRel,
     photo: famPhoto || undefined
   };
   setFormData(prev => ({ ...prev, familyMembers: [...prev.familyMembers, newMember] }));
   setFamName(''); setFamRel(''); setFamPhoto(null);
   if (error) setError(null);
 };


 const removeFamilyMember = (id: string) => {
   setFormData(prev => ({ ...prev, familyMembers: prev.familyMembers.filter(m => m.id !== id) }));
 };


 // --- 4. USER INTERFACE (JSX) ---
 return (
   <div className="w-full max-w-5xl mx-auto h-[calc(100vh-2rem)] flex flex-col p-6 animate-in fade-in duration-700">
     <header className="mb-4 mt-1 flex items-center justify-between border-b border-white/5 pb-2 relative text-white">
       <button onClick={onBack} className="p-1.5 hover:bg-white/10 rounded-full glass-panel transition-all active:scale-90">
         <ChevronLeft size={20} className="text-indigo-200" />
       </button>
       <div className="flex-1 text-center">
         <h1 className="text-lg font-bold tracking-tight">Configure Companion</h1>
       </div>
       <div className="w-[34px]" aria-hidden="true" />
     </header>


     <div className="flex-1 overflow-y-auto pr-2 pb-32 scroll-smooth">
       {/* Progress Bar */}
       <div className="max-w-2xl mx-auto mb-10 px-4">
         <div className="flex justify-between items-end mb-3">
            <span className="text-2xl font-black text-white">{STEPS[currentStep].label}</span>
            <span className="text-indigo-300 font-bold tracking-widest text-sm">STEP {currentStep + 1}/{STEPS.length}</span>
         </div>
         <div className="h-2 w-full bg-white/10 rounded-full overflow-hidden">
           <div className="h-full bg-gradient-to-r from-indigo-500 to-[#715ffa] transition-all duration-500 ease-out" style={{ width: `${((currentStep + 1) / STEPS.length) * 100}%` }} />
         </div>
       </div>


       <div className="max-w-3xl mx-auto">
         {/* STEP 1: BASICS */}
         {activeSection === 'basics' && (
           <div className="space-y-10 animate-in slide-in-from-right-8 duration-500">
             <div className="flex justify-center items-end gap-12 w-full max-w-2xl px-8 mx-auto">
               {AVATAR_OPTIONS.map((type) => (
                 <button
                   key={type}
                   onClick={() => selectAvatar(type)}
                   className={`relative p-6 rounded-[2.5rem] transition-all duration-500 group flex flex-col items-center ${formData.avatarType === type ? 'bg-indigo-500/20 scale-110 ring-2 ring-indigo-400 z-10' : 'opacity-40 grayscale hover:grayscale-0'}`}
                 >
                   <Avatar size="md" type={type} emotion={formData.avatarType === type ? 'happy' : 'neutral'} />
                   {formData.avatarType === type && <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 bg-indigo-400 text-slate-900 text-[10px] font-black px-4 py-1.5 rounded-full uppercase tracking-widest shadow-xl">Selected</div>}
                 </button>
               ))}
             </div>


             <div className="glass-panel p-8 rounded-[2rem] border-white/10 shadow-xl">
               <h3 className="flex items-center gap-3 text-xl font-bold mb-6 text-indigo-100 border-b border-white/5 pb-4"><User size={24} className="text-indigo-400" /> Personal Information</h3>
               <div className="space-y-6">
                 <div>
                   <label className="block text-base font-bold text-indigo-300 mb-2">Full Name <span className="text-red-400">*</span></label>
                   <input type="text" value={formData.name} onChange={(e) => { setFormData({...formData, name: e.target.value}); setError(null); }} className="w-full bg-black/20 border border-white/10 rounded-xl p-4 text-lg text-white focus:outline-none focus:border-indigo-400 transition-all placeholder:text-white/20" placeholder="e.g. Grandma Jane" />
                 </div>
                 <div>
                   <label className="block text-base font-bold text-indigo-300 mb-2">Age <span className="text-red-400">*</span></label>
                   <input
                     type="number" min="1" value={formData.age ?? ''}
                     onWheel={(e) => (e.target as HTMLInputElement).blur()}
                     onKeyDown={(e) => { if (['e', 'E', '-', '.'].includes(e.key)) e.preventDefault(); }}
                     onChange={(e) => {
                       const val = e.target.value === '' ? undefined : parseInt(e.target.value);
                       if (val === undefined || val > 0) { setFormData({...formData, age: val}); setError(null); }
                     }}
                     className="w-full bg-black/20 border border-white/10 rounded-xl p-4 text-lg text-white focus:outline-none focus:border-indigo-400 transition-all"
                   />
                 </div>
               </div>
             </div>


             <div className="glass-panel p-8 rounded-[2rem] border-l-8 border-l-purple-500/50 border-white/10 shadow-xl">
               <h3 className="flex items-center gap-3 text-xl font-bold mb-3 text-indigo-100"><Brain size={24} className="text-purple-400" /> Dementia Stage <span className="text-red-400">*</span></h3>
               <div className="grid grid-cols-1 gap-4">
                 {[
                   { value: DementiaStage.EARLY, title: "Mild", desc: "Mostly independent but have occasional memory lapses" },
                   { value: DementiaStage.MIDDLE, title: "Moderate", desc: "Sometimes confused about time/place, or struggle to find words" },
                   { value: DementiaStage.LATE, title: "Severe", desc: "Verbal communication is difficult" }
                 ].map((option) => (
                   <button
                     key={option.value}
                     onClick={() => { setFormData(prev => ({ ...prev, stage: option.value as DementiaStage })); setError(null); }}
                     className={`p-5 rounded-2xl border text-left transition-all flex flex-col gap-2 relative group ${formData.stage === option.value ? 'bg-indigo-500/20 border-indigo-400 shadow-xl' : 'bg-black/20 border-white/10 hover:bg-white/5'}`}
                   >
                     <div className={`font-bold text-lg flex items-center justify-between ${formData.stage === option.value ? 'text-indigo-300' : 'text-white'}`}>
                       {option.title}
                       {formData.stage === option.value && <CheckCircle2 size={20} className="text-indigo-400" />}
                     </div>
                     <p className="text-base text-indigo-200/70">{option.desc}</p>
                   </button>
                 ))}
               </div>
             </div>
           </div>
         )}


         {/* STEP 2: REMINISCENCE */}
         {activeSection === 'reminiscence' && (
           <div className="space-y-6 animate-in slide-in-from-right-8 duration-500 px-2">
             <div className="glass-panel p-8 rounded-[2rem] border-white/10 shadow-xl">
               <h3 className="flex items-center gap-3 text-xl font-bold mb-4 text-indigo-100 border-b border-white/5 pb-4"><BookOpen size={24} className="text-cyan-400" /> Patient Story <span className="text-red-400">*</span></h3>
               <textarea value={formData.description} onChange={(e) => { setFormData({...formData, description: e.target.value}); setError(null); }} className="w-full bg-black/20 border border-white/10 rounded-xl p-4 text-lg text-white min-h-[120px] focus:border-indigo-400 outline-none transition-all" placeholder="Describe their life, personality..." />
             </div>


             <div className="glass-panel p-8 rounded-[2rem] border-white/10 shadow-xl border-t-8 border-t-amber-500/50">
               <h3 className="flex items-center gap-3 text-xl font-bold mb-4 text-indigo-100 border-b border-white/5 pb-4"><Briefcase size={24} className="text-amber-400" /> Hobbies & Career</h3>
               <div className="flex gap-3 mb-6">
                 <input type="text" value={newLifestyle} onChange={(e) => setNewLifestyle(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && addTag('lifestyles', newLifestyle, setNewLifestyle)} className="flex-1 bg-black/20 border border-white/10 rounded-xl p-4 text-white focus:outline-none" placeholder="e.g. Piano Teacher" />
                 <button onClick={() => addTag('lifestyles', newLifestyle, setNewLifestyle)} className="bg-[#715ffa] px-6 rounded-xl font-bold text-2xl shadow-lg transition-all active:scale-90">+</button>
               </div>
               <div className="flex flex-wrap gap-3">
                 {formData.lifestyles.map((tag, idx) => (
                   <span key={idx} className="bg-amber-500/10 border border-amber-500/20 text-amber-100 px-4 py-2 rounded-xl text-base font-bold flex items-center gap-3">{tag}<button onClick={() => removeTag('lifestyles', idx)}><X size={18}/></button></span>
                 ))}
               </div>
             </div>


             <div className="glass-panel p-8 rounded-[2rem] border-white/10 shadow-xl border-t-8 border-t-pink-500/50">
               <h3 className="flex items-center gap-3 text-xl font-bold mb-3 text-indigo-100"><Users size={24} className="text-pink-400" /> Key People <span className="text-red-400">*</span></h3>
               <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                 {formData.familyMembers.map((member) => (
                   <div key={member.id} className="bg-white/5 border border-white/10 rounded-2xl p-4 flex items-center gap-4 relative group">
                     <div className="w-14 h-14 rounded-full bg-indigo-500/30 overflow-hidden border border-white/20">
                       {member.photo ? <img src={member.photo} className="w-full h-full object-cover" /> : <User className="p-3 text-indigo-300" />}
                     </div>
                     <div className="overflow-hidden text-white">
                       <h4 className="font-bold truncate">{member.name}</h4>
                       <p className="text-sm text-indigo-300 truncate">{member.relation}</p>
                     </div>
                     <button onClick={() => removeFamilyMember(member.id)} className="absolute top-2 right-2 text-red-300 opacity-0 group-hover:opacity-100 transition-opacity"><X size={14} /></button>
                   </div>
                 ))}
               </div>
               <div className="bg-black/20 rounded-2xl p-5 border border-white/5 flex flex-col gap-4">
                 <div className="flex gap-4">
                   <input type="text" value={famName} onChange={(e) => setFamName(e.target.value)} placeholder="Name" className="flex-1 bg-black/20 border border-white/10 rounded-xl p-3 text-white focus:outline-none" />
                   <input type="text" value={famRel} onChange={(e) => setFamRel(e.target.value)} placeholder="Relation" className="flex-1 bg-black/20 border border-white/10 rounded-xl p-3 text-white focus:outline-none" />
                 </div>
                 <button onClick={addFamilyMember} disabled={!famName || !famRel} className="bg-pink-500/80 hover:bg-pink-500 text-white py-3 rounded-xl font-bold shadow-lg transition-all disabled:opacity-50">Add Person</button>
               </div>
             </div>
           </div>
         )}


         {/* STEP 3: SAFETY */}
         {activeSection === 'safety' && (
           <div className="space-y-8 animate-in slide-in-from-right-8 duration-500 px-2">
             <div className="glass-panel p-8 rounded-[2rem] border-t-8 border-t-green-500/50 shadow-xl border-white/10">
               <h3 className="flex items-center gap-3 text-xl font-bold mb-3 text-indigo-100"><CheckCircle2 size={26} className="text-green-400" /> Approved Topics</h3>
               <div className="flex gap-3 mb-6">
                 <input type="text" value={newTopic} onChange={(e) => setNewTopic(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && addTag('safeTopics', newTopic, setNewTopic)} className="flex-1 bg-black/20 border border-white/10 rounded-xl p-4 text-white focus:outline-none focus:border-green-400/50" placeholder="Add a safe topic..." />
                 <button onClick={() => addTag('safeTopics', newTopic, setNewTopic)} className="bg-green-500/20 px-6 rounded-xl font-bold text-green-200 shadow-sm transition-all active:scale-90">+</button>
               </div>
               <div className="flex flex-wrap gap-3">
                 {formData.safeTopics.map((tag, idx) => (
                   <span key={idx} className="bg-green-500/10 border border-green-500/20 text-green-100 px-4 py-2 rounded-xl font-bold flex items-center gap-3">{tag}<button onClick={() => removeTag('safeTopics', idx)}><X size={18}/></button></span>
                 ))}
               </div>
             </div>


             <div className="glass-panel p-8 rounded-[2rem] border-t-8 border-t-red-500/50 shadow-xl border-white/10">
               <h3 className="flex items-center gap-3 text-xl font-bold mb-3 text-indigo-100"><AlertCircle size={26} className="text-red-400" /> Known Triggers <span className="text-red-400">*</span></h3>
               <p className="text-base text-indigo-200/70 mb-6">Specifically list words like "wandering" or "medicine" for Tier 3 safety alerts.</p>
               <div className="flex gap-3 mb-6">
                 <input type="text" value={newTrigger} onChange={(e) => setNewTrigger(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && addTag('triggers', newTrigger, setNewTrigger)} className="flex-1 bg-black/20 border border-white/10 rounded-xl p-4 text-white focus:outline-none focus:border-red-400/50" placeholder="Add a trigger..." />
                 <button onClick={() => addTag('triggers', newTrigger, setNewTrigger)} className="bg-red-500/20 px-6 rounded-xl font-bold text-red-200 shadow-sm transition-all active:scale-90">+</button>
               </div>
               <div className="flex flex-wrap gap-3">
                 {formData.triggers.map((tag, idx) => (
                   <span key={idx} className="bg-red-500/10 border border-red-500/20 text-red-100 px-4 py-2 rounded-xl font-bold flex items-center gap-3">{tag}<button onClick={() => removeTag('triggers', idx)}><X size={18}/></button></span>
                 ))}
               </div>
             </div>
           </div>
         )}
       </div>
     </div>


     {/* BOTTOM ACTION BAR */}
     <div className="fixed bottom-0 left-0 right-0 p-8 bg-gradient-to-t from-[#171140] via-[#171140]/90 to-transparent z-50">
       <div className="max-w-3xl mx-auto flex flex-col gap-4">
         {error && <div className="w-full bg-red-500/20 border border-red-500/50 text-red-100 px-6 py-4 rounded-2xl flex items-center gap-3 animate-in fade-in"><AlertTriangle size={24} className="text-red-400 flex-shrink-0" /><p className="font-bold">{error}</p></div>}
         <div className="flex gap-4 w-full">
           {currentStep > 0 && <button onClick={handleBackStep} className="px-8 py-5 rounded-[1.5rem] bg-white/10 text-white font-bold border border-white/10 transition-all active:scale-95"><ArrowLeft size={24} /></button>}
           <button onClick={currentStep < STEPS.length - 1 ? handleNext : handleFinalSave} disabled={isLoading} className="flex-1 bg-white text-[#171140] text-xl font-black py-5 rounded-[1.5rem] shadow-2xl transition-all active:scale-95 flex items-center justify-center gap-3">
             {isLoading ? "Saving..." : currentStep < STEPS.length - 1 ? `Next: ${STEPS[currentStep + 1].label}` : "Save Companion Settings"}
             {currentStep < STEPS.length - 1 ? <ArrowRight size={24} /> : <CheckCircle2 size={24} />}
           </button>
         </div>
       </div>
     </div>
   </div>
 );
};
