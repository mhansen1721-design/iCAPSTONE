import React, { useState, useEffect } from 'react';
import { AppSettings } from '../types';
import { ChevronLeft, Type, Palette, Contrast, ZapOff, RotateCcw } from 'lucide-react';

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

  const handleSave = () => {
    onSave(localSettings);
    
    // Applying the change permanently to the document
    const themeClass = `theme-${localSettings.colorPalette}`;
    document.documentElement.className = themeClass;
    document.body.className = themeClass;
    
    onBack();
  };

  const handleReset = () => {
    // These are the baseline defaults for the app
    const defaults: AppSettings = {
      fontSize: 'medium',
      colorPalette: 'deep-space',
      reducedMotion: false
    };
    setLocalSettings(defaults);
  };

  const getFontSizeClass = (size: AppSettings['fontSize']) => {
    switch (size) {
      case 'small': return 'text-xs';
      case 'large': return 'text-xl';
      default: return 'text-base';
    }
  };

  const colorPalettes = [
    { id: 'deep-space', label: 'Deep Space', bg: '#171140', accent: '#715ffa', desc: "Premium Tech: Modern and low-glare." },
    { id: 'serene-nature', label: 'Serene Nature', bg: '#cbdad5', accent: '#065a60', desc: "Clinical Healing: Soft and biophilic." },
    { id: 'high-clarity', label: 'High-Clarity', bg: '#000000', accent: '#f1bd00', desc: "Dark Mode: High contrast for vision." },
    { id: 'twilight', label: 'Twilight', bg: '#F3E5F5', accent: '#7B1FA2', desc: "Warmth: Comforting and homey." },
  ];

  return (
    /* PREVIEW WRAPPER: This div adopts the theme locally so you can see it before saving */
    <div className={`theme-${localSettings.colorPalette} min-h-screen bg-[var(--nura-bg)] transition-colors duration-500`}>
      <div className="w-full max-w-xl mx-auto p-6 animate-in slide-in-from-bottom-4 duration-500 pb-20">
        
        <header className="mb-6 flex items-center gap-4">
          <button 
            onClick={onBack} 
            className="p-2 hover:bg-[var(--nura-accent)]/20 rounded-full transition-all bg-[var(--nura-card)] border border-[var(--nura-text)]/10 text-[var(--nura-text)]"
          >
            <ChevronLeft size={24} />
          </button>
          <div>
            <h1 className="text-2xl font-black text-[var(--nura-text)]">App Settings</h1>
            <p className="text-[10px] text-[var(--nura-dim)] font-bold uppercase tracking-widest opacity-60">{caregiverEmail}</p>
          </div>
        </header>

        <div className="space-y-4">
          {/* --- FONT SIZE SECTION --- */}
<section className="bg-[var(--nura-card)] p-4 rounded-3xl border border-[var(--nura-text)]/5">
  <div className="flex items-center gap-2 mb-3 opacity-80">
    <Type size={16} className="text-[var(--nura-dim)]" />
    <h2 className="text-sm font-bold uppercase tracking-wider text-[var(--nura-text)]">Font Size</h2>
  </div>
  <div className="grid grid-cols-3 gap-2">
    {['small', 'medium', 'large'].map((size) => {
      const isSelected = localSettings.fontSize === size;
      return (
        <button
          key={size}
          onClick={() => setLocalSettings({ ...localSettings, fontSize: size as any })}
          className={`py-3 rounded-xl border-2 transition-all flex flex-col items-center ${
            isSelected 
              ? 'bg-[var(--nura-accent)] border-[var(--nura-text)]/20 text-[var(--nura-bg)]' 
              : 'bg-[var(--nura-bg)]/60 border-[var(--nura-text)]/10 text-[var(--nura-text)] hover:border-[var(--nura-accent)]/50'
          }`}
        >
          <span className={`block font-black ${
            size === 'small' ? 'text-xs' : size === 'medium' ? 'text-base' : 'text-xl'
          } ${isSelected ? 'opacity-100' : 'opacity-70'}`}>
            Aa
          </span>
          <span className={`text-[10px] uppercase font-black tracking-widest ${
            isSelected ? 'opacity-100' : 'opacity-50'
          }`}>
            {size}
          </span>
        </button>
      );
    })}
  </div>
</section>

          {/* --- COLOR PALETTE SECTION --- */}
          <section className="bg-[var(--nura-card)] p-4 rounded-3xl border border-[var(--nura-text)]/5">
            <div className="flex items-center gap-2 mb-3 opacity-80">
              <Palette size={16} className="text-[var(--nura-accent)]" />
              <h2 className="text-sm font-bold uppercase tracking-wider text-[var(--nura-text)]">Color Palette</h2>
            </div>
            
            <div className="grid grid-cols-1 gap-3">
              {colorPalettes.map((palette) => (
                <button
                  key={palette.id}
                  onClick={() => setLocalSettings({ ...localSettings, colorPalette: palette.id as any })}
                  className={`w-full p-5 rounded-2xl transition-all flex flex-col gap-1 text-left border-2 ${
                    localSettings.colorPalette === palette.id 
                      ? 'bg-[var(--nura-accent)] border-[var(--nura-text)]/20 shadow-lg' 
                      : 'bg-[var(--nura-bg)] border-transparent hover:bg-[var(--nura-text)]/5'
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <div className="flex -space-x-2 shrink-0">
                      <div className="w-8 h-8 rounded-full border border-white/20" style={{ backgroundColor: palette.bg }} />
                      <div className="w-8 h-8 rounded-full border border-white/20" style={{ backgroundColor: palette.accent }} />
                    </div>
                    <div>
                      <span className={`text-lg font-black tracking-tight leading-none ${localSettings.colorPalette === palette.id ? 'text-[var(--nura-bg)]' : 'text-[var(--nura-text)]'}`}>
                        {palette.label}
                      </span>
                      <p className={`font-medium transition-all mt-1 ${getFontSizeClass(localSettings.fontSize)} ${
                        localSettings.colorPalette === palette.id ? 'text-[var(--nura-bg)]/80' : 'text-[var(--nura-dim)]'
                      }`}>
                        {palette.desc}
                      </p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </section>

          {/* --- ACCESSIBILITY SECTION --- */}
          <section className="bg-[var(--nura-card)] p-4 rounded-3xl border border-[var(--nura-text)]/5">
            <div className="flex items-center gap-2 mb-3 opacity-80">
              <Contrast size={16} className="text-[var(--nura-dim)]" />
              <h2 className="text-sm font-bold uppercase tracking-wider text-[var(--nura-text)]">Accessibility</h2>
            </div>
            <div className="flex items-center justify-between p-4 bg-[var(--nura-bg)]/40 rounded-2xl border border-[var(--nura-text)]/5">
              <div className="flex items-center gap-3">
                <ZapOff size={18} className="text-[var(--nura-dim)]" />
                <div>
                  <p className={`font-bold text-[var(--nura-text)] transition-all ${getFontSizeClass(localSettings.fontSize)}`}>Reduced Motion</p>
                  <p className="text-[10px] text-[var(--nura-dim)] font-bold uppercase tracking-widest">Simplify transitions</p>
                </div>
              </div>
              <button 
                onClick={() => setLocalSettings({ ...localSettings, reducedMotion: !localSettings.reducedMotion })}
                className={`w-14 h-8 rounded-full transition-all relative border-2 ${
                  localSettings.reducedMotion ? 'bg-[var(--nura-accent)] border-[var(--nura-text)]/20' : 'bg-black/40 border-white/10'
                }`}
              >
                <div className={`absolute top-1 w-5 h-5 rounded-full shadow-md transition-all duration-200 ${
                  localSettings.reducedMotion ? 'left-7 bg-white' : 'left-1 bg-white/40'
                }`} />
              </button>
            </div>
          </section>

          {/* --- ACTION BUTTONS --- */}
          <div className="flex flex-col gap-3 pt-4">
            <button
              onClick={handleSave}
              className="w-full py-5 font-black rounded-[2rem] shadow-xl hover:scale-[0.98] transition-all text-lg bg-[var(--nura-text)] text-[var(--nura-bg)]"
            >
              Save Settings
            </button>
            
            <button
              onClick={handleReset}
              className="w-full py-4 font-bold rounded-[1.5rem] transition-all text-sm text-[var(--nura-dim)] hover:text-[var(--nura-text)] flex items-center justify-center gap-2"
            >
              <RotateCcw size={14} />
              Reset to Defaults
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
