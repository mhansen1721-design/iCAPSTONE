import React, { useState, useEffect } from 'react';
import { AppSettings } from '../types';
import { ChevronLeft, Type, Palette, Contrast, ZapOff } from 'lucide-react';

interface SettingsProps {
  currentSettings: AppSettings;
  onSave: (settings: AppSettings) => void;
  onBack: () => void;
  caregiverEmail: string;
}

export const Settings: React.FC<SettingsProps> = ({ currentSettings, onSave, onBack, caregiverEmail }) => {
  const [localSettings, setLocalSettings] = useState<AppSettings>(currentSettings);

  useEffect(() => {
    if (currentSettings) setLocalSettings(currentSettings);
  }, [currentSettings]);

  const getFontSizeClass = (size: AppSettings['fontSize']) => {
    switch (size) {
      case 'small': return 'text-xs';
      case 'large': return 'text-lg';
      default: return 'text-sm'; 
    }
  };

  const colorPalettes = [
    { id: 'deep-space', label: 'Deep Space', colors: ['bg-[#0B0A1A]', 'bg-[var(--nura-accent)]'], desc: "Premium Tech: Modern and low-glare." },
    { id: 'serene-nature', label: 'Serene Nature', colors: ['bg-[#FF3E9B]', 'bg-[#0D7C85]'], desc: "Clinical Healing: Soft and biophilic." },
    { id: 'high-clarity', label: 'High-Clarity', colors: ['bg-[#000000]', 'bg-[#FF5A5A]'], desc: "Dark Mode: High contrast for vision." },
    { id: 'twilight', label: 'Twilight', colors: ['bg-[#CAADDE]', 'bg-[#C886E5]'], desc: "Warmth: Comforting and homey." },
  ];

  return (
  <div className="w-full max-w-xl mx-auto p-6 animate-in slide-in-from-bottom-4 duration-500 pb-20">
    <header className="mb-6 flex items-center gap-4">
      <button onClick={onBack} className="p-2 hover:bg-nura-accent/20 rounded-full transition-all bg-[var(--nura-card)] border border-white/10 text-[var(--nura-text)]">
        <ChevronLeft size={24} />
      </button>
      <div>
        <h1 className="text-2xl font-black text-[var(--nura-text)]">App Settings</h1>
        <p className="text-[10px] text-[var(--nura-dim)] font-bold uppercase tracking-widest opacity-60">{caregiverEmail}</p>
      </div>
    </header>

    <div className="space-y-4">
      {/* --- FONT SIZE SECTION --- */}
      <section className="bg-[var(--nura-card)] p-4 rounded-3xl border border-white/5">
        <div className="flex items-center gap-2 mb-3 opacity-80">
          <Type size={16} className="text-[var(--nura-dim)]" />
          <h2 className="text-sm font-bold uppercase tracking-wider text-[var(--nura-text)]">Font Size</h2>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {['small', 'medium', 'large'].map((size) => (
            <button
              key={size}
              onClick={() => setLocalSettings({ ...localSettings, fontSize: size as any })}
              className={`py-3 rounded-xl border-2 transition-all flex flex-col items-center ${
                localSettings.fontSize === size 
                  ? 'bg-[var(--nura-accent)] border-white/20 text-white' 
                  : 'bg-black/20 border-transparent text-[var(--nura-text)]/40'
              }`}
            >
              <span className={`block font-bold ${size === 'small' ? 'text-xs' : size === 'medium' ? 'text-base' : 'text-xl'}`}>Aa</span>
              <span className="text-[10px] uppercase font-black">{size}</span>
            </button>
          ))}
        </div>
      </section>

      {/* --- COLOR PALETTE SECTION --- */}
      <section className="bg-[var(--nura-card)] p-4 rounded-3xl border border-white/5">
        <div className="flex items-center gap-2 mb-3 opacity-80">
          <Palette size={16} className="text-[var(--nura-accent)]" />
          <h2 className="text-sm font-bold uppercase tracking-wider text-[var(--nura-text)]">Color Palette</h2>
        </div>
        
        <div className="grid grid-cols-1 gap-2">
          {colorPalettes.map((palette) => (
  <button
    key={palette.id}
    onClick={() => {
      // 1. Update the local state for the radio buttons
      const updated = { ...localSettings, colorPalette: palette.id as any };
      setLocalSettings(updated);

      // 2. IMMEDIATE FEEDBACK: Force the theme class onto the HTML root
      // This makes the background change the second you tap the button
      document.documentElement.className = `theme-${palette.id}`;
      document.body.className = `theme-${palette.id}`;
    }}
    className={`p-4 rounded-2xl transition-all flex flex-col gap-1 text-left border-2 ${
      localSettings.colorPalette === palette.id 
        ? 'bg-[var(--nura-accent)] border-white/20 shadow-lg' 
        : 'bg-black/20 border-transparent hover:bg-nura-accent/20'
    }`}
  >
              <div className="flex items-center gap-3">
                <div className="flex -space-x-2 shrink-0">
                  <div className={`w-7 h-7 rounded-full border border-white/20 ${palette.colors[0]}`} />
                  <div className={`w-7 h-7 rounded-full border border-white/20 ${palette.colors[1]}`} />
                </div>
                <span className={`text-lg font-black tracking-tight ${localSettings.colorPalette === palette.id ? 'text-white' : 'text-[var(--nura-text)]'}`}>
                  {palette.label}
                </span>
              </div>
              <p className={`font-medium leading-snug transition-all ${getFontSizeClass(localSettings.fontSize)} ${
                localSettings.colorPalette === palette.id ? 'text-white/80' : 'text-[var(--nura-dim)]'
              }`}>
                {palette.desc}
              </p>
            </button>
          ))}
        </div>
      </section>

      {/* --- ACCESSIBILITY SECTION (FIXED: Back in the code) --- */}
      <section className="bg-[var(--nura-card)] p-4 rounded-3xl border border-white/5">
        <div className="flex items-center gap-2 mb-3 opacity-80">
          <Contrast size={16} className="text-[var(--nura-dim)]" />
          <h2 className="text-sm font-bold uppercase tracking-wider text-[var(--nura-text)]">Accessibility</h2>
        </div>
        <div className="flex items-center justify-between p-4 bg-black/20 rounded-2xl border border-white/5">
          <div className="flex items-center gap-3">
            <ZapOff size={18} className="text-[var(--nura-dim)]" />
            <div>
              <p className={`font-bold text-[var(--nura-text)] ${getFontSizeClass(localSettings.fontSize)}`}>Reduced Motion</p>
              <p className="text-[10px] text-[var(--nura-dim)] font-bold uppercase tracking-widest">Simplify transitions</p>
            </div>
          </div>
          <button 
            onClick={() => setLocalSettings({ ...localSettings, reducedMotion: !localSettings.reducedMotion })}
            className={`w-12 h-7 rounded-full transition-all relative ${localSettings.reducedMotion ? 'bg-[var(--nura-accent)]' : 'bg-transparent/20'}`}
          >
            <div className={`absolute top-1 w-5 h-5 bg-transparent rounded-full shadow-sm transition-all ${localSettings.reducedMotion ? 'left-6' : 'left-1'}`} />
          </button>
        </div>
      </section>

      {/* --- SAVE BUTTON --- */}
      <button
        onClick={() => onSave(localSettings)}
        className="w-full py-5 font-black rounded-[2rem] shadow-xl hover:scale-[0.98] transition-all text-lg"
        style={{ backgroundColor: 'var(--nura-text)', color: 'var(--nura-bg)' }}
      >
        Save Settings
      </button>
    </div>
  </div>
);
      
};
