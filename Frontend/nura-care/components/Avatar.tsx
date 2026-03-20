import React from 'react';
import { AvatarType } from '../types';

// AvatarType: 'jellyfish' | 'seal' | 'bee' | 'turtle'

interface AvatarProps {
  size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  emotion?: 'neutral' | 'happy' | 'talking';
  type?: AvatarType;
  reducedMotion?: boolean;
}

export const Avatar: React.FC<AvatarProps> = ({
  size = 'md',
  emotion = 'neutral',
  type = 'jellyfish',
  reducedMotion = false,
}) => {
  const sizeClasses = {
    sm:    'w-10 h-14',
    md:    'w-20 h-28',
    lg:    'w-28 h-40',
    xl:    'w-40 h-56',
    '2xl': 'w-64 h-80',
  };

  // Tailwind container sizes in px
  const containerPx: Record<string, [number, number]> = {
    sm: [40, 56], md: [80, 112], lg: [112, 160], xl: [160, 224], '2xl': [256, 320],
  };
  const [cw, ch] = containerPx[size];

  // ── Jellyfish (original div approach) ───────────────────────────────────────
  const eyeSize = { sm:'w-1 h-1', md:'w-2 h-2', lg:'w-3 h-3', xl:'w-4 h-4', '2xl':'w-6 h-6' };

  const renderJellyfishFace = () => (
    <div className="flex items-center gap-4 z-30">
      <div className={`${eyeSize[size]} bg-slate-800 rounded-full shadow-sm ${!reducedMotion ? 'animate-pulse' : ''}`} />
      <div className="flex items-center justify-center min-w-[10px]">
        {emotion === 'happy' ? (
          <svg width="14" height="7" viewBox="0 0 24 12" fill="none" className="text-slate-800 stroke-current stroke-[4]">
            <path d="M7 4C10 8 14 8 17 4" strokeLinecap="round" />
          </svg>
        ) : emotion === 'talking' ? (
          <div className={`w-4 h-4 bg-slate-800 rounded-full opacity-60 ${!reducedMotion ? 'animate-ping' : ''}`} />
        ) : (
          <div className="w-2 h-0.5 bg-slate-800 rounded-full opacity-60" />
        )}
      </div>
      <div className={`${eyeSize[size]} bg-slate-800 rounded-full shadow-sm ${!reducedMotion ? 'animate-pulse' : ''}`} />
    </div>
  );

  const renderJellyfish = () => (
    <div className="w-full h-full flex flex-col items-center justify-center">
      <div className="relative w-full h-[58%] bg-gradient-to-b from-white/80 via-[#a4c0fc] to-[#7ba4f7] rounded-t-[65%] rounded-b-[40%] shadow-[inset_0_-4px_12px_rgba(255,255,255,0.4),inset_0_-8px_16px_rgba(0,0,0,0.1),0_8px_24px_rgba(0,0,0,0.2)] flex flex-col items-center justify-center border border-white/40 z-20 overflow-hidden">
        <div className="absolute top-2 left-1/4 w-1/4 h-1/6 bg-white/40 rounded-full blur-sm rotate-[-15deg]" />
        <div className="absolute top-[58%] left-[15%] w-[15%] h-[15%] bg-rose-300/40 blur-md rounded-full" />
        <div className="absolute top-[58%] right-[15%] w-[15%] h-[15%] bg-rose-300/40 blur-md rounded-full" />
        <div className="mt-3">{renderJellyfishFace()}</div>
      </div>
      <div className="w-[85%] h-[28%] -mt-2 relative z-10">
        <svg viewBox="0 0 100 40" className="w-full h-full drop-shadow-[0_2px_4px_rgba(164,192,252,0.5)]" preserveAspectRatio="none">
          <path d="M 20 0 Q 15 10, 20 20 T 20 35" fill="none" stroke="rgba(164,192,252,0.8)" strokeWidth="8" strokeLinecap="round" className={!reducedMotion ? 'tentacle-path' : ''} />
          <path d="M 40 0 Q 45 10, 40 20 T 40 40" fill="none" stroke="rgba(164,192,252,0.6)" strokeWidth="8" strokeLinecap="round" className={!reducedMotion ? 'tentacle-path' : ''} />
          <path d="M 60 0 Q 55 10, 60 20 T 60 40" fill="none" stroke="rgba(164,192,252,0.6)" strokeWidth="8" strokeLinecap="round" className={!reducedMotion ? 'tentacle-path' : ''} />
          <path d="M 80 0 Q 85 10, 80 20 T 80 35" fill="none" stroke="rgba(164,192,252,0.8)" strokeWidth="8" strokeLinecap="round" className={!reducedMotion ? 'tentacle-path' : ''} />
        </svg>
      </div>
    </div>
  );

  // ── SEAL — exact port of claymorphic-seal HTML (design canvas: 400×400) ─────
  // CSS variables: --seal-base:#fdfaf2, --seal-shadow-inner:#ece2d0,
  //               --seal-highlight:#ffffff, --seal-pink:#fbb7bc, --seal-dark:#3c2a21
  const renderSeal = () => {
    const dw = 400, dh = 400;
    const scale = Math.min(cw / dw, ch / dh) * 1.25;

    const sealEyes = () => {
      if (emotion === 'happy') {
        // Squint: flat bottom, curved top = upward arc shape
        return (
          <>
            <div style={{ position: 'absolute', width: 30, height: 16,
              background: '#3c2a21', borderRadius: '30px 30px 0 0',
              top: 20, left: 63 }} />
            <div style={{ position: 'absolute', width: 30, height: 16,
              background: '#3c2a21', borderRadius: '30px 30px 0 0',
              top: 20, right: 63 }} />
          </>
        );
      }
      // Neutral / talking: round eyes
      return (
        <>
          <div style={{ position: 'absolute', width: 28, height: 32,
            background: '#3c2a21', borderRadius: '50%', top: 20, left: 65,
            boxShadow: 'inset 2px 2px 5px rgba(255,255,255,0.2), 2px 4px 6px rgba(0,0,0,0.3)' }} />
          <div style={{ position: 'absolute', width: 28, height: 32,
            background: '#3c2a21', borderRadius: '50%', top: 20, right: 65,
            boxShadow: 'inset 2px 2px 5px rgba(255,255,255,0.2), 2px 4px 6px rgba(0,0,0,0.3)' }} />
        </>
      );
    };

    const sealMouth = () => {
      if (emotion === 'happy') {
        return (
          <svg style={{ position: 'absolute', top: 14, left: '50%', transform: 'translateX(-50%)' }}
            width={60} height={32} viewBox="0 0 60 32">
            <path d="M 4 4 Q 30 30 56 4" fill="none" stroke="#3c2a21" strokeWidth="4.5" strokeLinecap="round" />
          </svg>
        );
      }
      if (emotion === 'talking') {
        return (
          <div style={{ position: 'absolute', top: 18, left: '50%', transform: 'translateX(-50%)',
            width: 20, height: 20, background: '#3c2a21', borderRadius: '50%', opacity: 0.85 }} />
        );
      }
      // Neutral: W-shape mouth
      return (
        <div style={{ position: 'absolute', top: 18, left: '50%', transform: 'translateX(-50%)',
          width: 44, height: 18, display: 'flex', justifyContent: 'center' }}>
          <div style={{ width: 20, height: 16, border: '3.5px solid #3c2a21',
            borderTop: '3.5px solid transparent', borderRadius: '0 0 10px 12px',
            position: 'absolute', left: 3 }} />
          <div style={{ width: 20, height: 16, border: '3.5px solid #3c2a21',
            borderTop: '3.5px solid transparent', borderRadius: '0 0 12px 10px',
            position: 'absolute', right: 3 }} />
        </div>
      );
    };

    return (
      <div style={{
        position: 'absolute', top: '50%', left: '50%',
        width: dw, height: dh,
        transform: `translate(-50%, -50%) scale(${scale})`,
        transformOrigin: 'center center',
      }}>
        {/* Ground shadow */}
        <div style={{ position: 'absolute', bottom: 35, left: '50%', transform: 'translateX(-50%)',
          width: 240, height: 20, background: 'rgba(0,0,0,0.05)',
          borderRadius: '50%', filter: 'blur(8px)', zIndex: 1 }} />

        {/* Left flipper */}
        <div style={{ position: 'absolute', width: 70, height: 45, background: '#fdfaf2',
          borderRadius: '50%', zIndex: 5, bottom: 80, left: 25, transform: 'rotate(-35deg)',
          boxShadow: 'inset -5px -10px 15px #ece2d0, inset 5px 5px 10px #ffffff, -5px 10px 15px rgba(0,0,0,0.08)' }} />

        {/* Right flipper */}
        <div style={{ position: 'absolute', width: 70, height: 45, background: '#fdfaf2',
          borderRadius: '50%', zIndex: 5, bottom: 80, right: 25, transform: 'rotate(35deg)',
          boxShadow: 'inset 5px -10px 15px #ece2d0, inset -5px 5px 10px #ffffff, 5px 10px 15px rgba(0,0,0,0.08)' }} />

        {/* Tail */}
        <div style={{ position: 'absolute', width: 90, height: 50, background: '#fdfaf2',
          right: 40, bottom: 45, borderRadius: '50% 50% 60% 40%', transform: 'rotate(15deg)',
          zIndex: 4, boxShadow: 'inset -5px -10px 15px #ece2d0, inset 5px 5px 10px #ffffff, 5px 5px 15px rgba(0,0,0,0.08)' }} />

        {/* Main body */}
        <div style={{ position: 'absolute', width: 300, height: 310, left: '50%', top: '50%',
          transform: 'translate(-50%, -50%)', background: '#fdfaf2',
          borderRadius: '50% 50% 48% 48% / 65% 65% 40% 40%',
          boxShadow: '0 20px 40px -10px rgba(0,0,0,0.08), inset -15px -25px 40px #ece2d0, inset 15px 15px 30px #ffffff',
          zIndex: 10 }}>

          {/* Face container */}
          <div style={{ position: 'absolute', top: '40%', left: '50%',
            transform: 'translate(-50%, -50%)', width: 220, height: 120 }}>

            {/* Cheeks */}
            <div style={{ position: 'absolute', width: 55, height: 35, background: '#fbb7bc',
              filter: 'blur(10px)', opacity: 0.6, borderRadius: '50%', top: 35, left: 10 }} />
            <div style={{ position: 'absolute', width: 55, height: 35, background: '#fbb7bc',
              filter: 'blur(10px)', opacity: 0.6, borderRadius: '50%', top: 35, right: 10 }} />

            {/* Eyes */}
            {sealEyes()}

            {/* Whiskers left */}
            <div style={{ position: 'absolute', top: 65, left: 38, display: 'flex',
              flexDirection: 'column', gap: 12, alignItems: 'flex-end' }}>
              <div style={{ width: 24, height: 3.5, background: '#3c2a21',
                borderRadius: 4, opacity: 0.8, transform: 'rotate(-5deg)' }} />
              <div style={{ width: 20, height: 3.5, background: '#3c2a21',
                borderRadius: 4, opacity: 0.8, transform: 'rotate(15deg)' }} />
            </div>
            {/* Whiskers right */}
            <div style={{ position: 'absolute', top: 65, right: 38, display: 'flex',
              flexDirection: 'column', gap: 12, alignItems: 'flex-start' }}>
              <div style={{ width: 24, height: 3.5, background: '#3c2a21',
                borderRadius: 4, opacity: 0.8, transform: 'rotate(5deg)' }} />
              <div style={{ width: 20, height: 3.5, background: '#3c2a21',
                borderRadius: 4, opacity: 0.8, transform: 'rotate(-15deg)' }} />
            </div>

            {/* Muzzle */}
            <div style={{ position: 'absolute', left: '50%', top: 45,
              transform: 'translateX(-50%)', width: 60, height: 50 }}>
              {/* Nose */}
              <div style={{ position: 'absolute', left: '50%', top: 0,
                transform: 'translateX(-50%)', width: 26, height: 20,
                background: '#3c2a21', borderRadius: '40% 40% 50% 50%',
                boxShadow: 'inset 0 -3px 4px rgba(0,0,0,0.3)' }} />
              {sealMouth()}
            </div>
          </div>
        </div>
      </div>
    );
  };

  // ── BEE — exact port of claymorphism-bee HTML (design canvas: 320×380) ──────
  // CSS variables: --bee-yellow:#ffcf4b, --bee-brown:#5d4037,
  //               --bee-wing:#fef4d1, --bee-cheek:#ffb1a2
  const renderBee = () => {
    const dw = 320, dh = 380;
    const scale = Math.min(cw / dw, ch / dh);

    const beeEyes = () => {
      const base: React.CSSProperties = {
        width: 28, height: 28, background: '#2b1d18', borderRadius: '50%',
        boxShadow: 'inset -4px -4px 8px rgba(0,0,0,0.5), inset 4px 4px 6px rgba(255,255,255,0.2)',
      };
      if (emotion === 'happy') {
        return (
          <>
            <div style={{ ...base, height: 14, borderRadius: '14px 14px 0 0' }} />
            <div style={{ ...base, height: 14, borderRadius: '14px 14px 0 0' }} />
          </>
        );
      }
      return (
        <>
          <div style={base} />
          <div style={base} />
        </>
      );
    };

    const beeMouth = () => {
      if (emotion === 'happy') {
        return (
          <svg width="50" height="28" viewBox="0 0 50 28" style={{ marginTop: 8 }}>
            <path d="M 2 2 Q 25 26 48 2" fill="none" stroke="#5d4037" strokeWidth="5" strokeLinecap="round" />
          </svg>
        );
      }
      if (emotion === 'talking') {
        return <div style={{ width: 22, height: 22, background: '#5d4037', borderRadius: '50%',
          marginTop: 8, opacity: 0.85 }} />;
      }
      // neutral: downward arc
      return <div style={{ width: 40, height: 20, borderBottom: '5px solid #5d4037',
        borderRadius: '0 0 50px 50px', marginTop: 5 }} />;
    };

    const clayCard: React.CSSProperties = {
      background: '#ffcf4b',
      borderRadius: '160px 160px 140px 140px',
      boxShadow: 'inset -20px -20px 40px rgba(0,0,0,0.15), inset 20px 20px 40px rgba(255,255,255,0.5), 20px 40px 60px rgba(0,0,0,0.1)',
    };

    return (
      <div style={{
        position: 'absolute', top: '50%', left: '50%',
        width: dw, height: dh,
        transform: `translate(-50%, -50%) scale(${scale})`,
        transformOrigin: 'center center',
        display: 'flex', flexDirection: 'column', alignItems: 'center',
      }}>
        {/* Left wing */}
        <div style={{ position: 'absolute', width: 140, height: 180, background: '#fef4d1',
          borderRadius: '50% 50% 50% 50% / 40% 40% 60% 60%',
          top: 40, left: -60, transform: 'rotate(-50deg)',
          boxShadow: 'inset -10px -10px 20px rgba(0,0,0,0.05), inset 10px 10px 20px rgba(255,255,255,0.8), 10px 20px 30px rgba(0,0,0,0.05)' }} />

        {/* Right wing */}
        <div style={{ position: 'absolute', width: 140, height: 180, background: '#fef4d1',
          borderRadius: '50% 50% 50% 50% / 40% 40% 60% 60%',
          top: 40, right: -60, transform: 'rotate(50deg)',
          boxShadow: 'inset -10px -10px 20px rgba(0,0,0,0.05), inset 10px 10px 20px rgba(255,255,255,0.8), 10px 20px 30px rgba(0,0,0,0.05)' }} />

        {/* Left antenna */}
        <div style={{ position: 'absolute', top: -20, left: 100, width: 12, height: 60,
          background: '#5d4037', borderRadius: 10, zIndex: 4, transform: 'rotate(-15deg)',
          boxShadow: 'inset -4px -4px 8px rgba(0,0,0,0.2), inset 2px 2px 4px rgba(255,255,255,0.2)' }}>
          <div style={{ position: 'absolute', top: -15, left: -10, width: 32, height: 32,
            background: '#5d4037', borderRadius: '50%',
            boxShadow: 'inset -6px -6px 12px rgba(0,0,0,0.3), inset 4px 4px 8px rgba(255,255,255,0.2)' }} />
        </div>

        {/* Right antenna */}
        <div style={{ position: 'absolute', top: -20, right: 100, width: 12, height: 60,
          background: '#5d4037', borderRadius: 10, zIndex: 4, transform: 'rotate(15deg)',
          boxShadow: 'inset -4px -4px 8px rgba(0,0,0,0.2), inset 2px 2px 4px rgba(255,255,255,0.2)' }}>
          <div style={{ position: 'absolute', top: -15, left: -10, width: 32, height: 32,
            background: '#5d4037', borderRadius: '50%',
            boxShadow: 'inset -6px -6px 12px rgba(0,0,0,0.3), inset 4px 4px 8px rgba(255,255,255,0.2)' }} />
        </div>

        {/* Main body */}
        <div style={{ ...clayCard, width: 260, height: 320, position: 'relative',
          zIndex: 10, overflow: 'hidden',
          display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>

          {/* Face (absolute inside body) */}
          <div style={{ position: 'absolute', top: 100, width: '100%',
            display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            {/* Eyes row */}
            <div style={{ display: 'flex', justifyContent: 'space-between',
              width: 140, alignItems: 'center' }}>
              {beeEyes()}
            </div>
            {/* Cheeks */}
            <div style={{ position: 'absolute', width: 45, height: 35, background: '#ffb1a2',
              borderRadius: '50%', filter: 'blur(8px)', opacity: 0.7, top: 30, left: 40 }} />
            <div style={{ position: 'absolute', width: 45, height: 35, background: '#ffb1a2',
              borderRadius: '50%', filter: 'blur(8px)', opacity: 0.7, top: 30, right: 40 }} />
            {/* Mouth */}
            <div style={{ display: 'flex', justifyContent: 'center' }}>
              {beeMouth()}
            </div>
          </div>

          {/* Stripes (flex children at bottom) */}
          <div style={{ width: '120%', height: 75, background: '#5d4037', marginLeft: '-10%',
            borderRadius: '50%', marginBottom: 25,
            boxShadow: 'inset 0 10px 15px rgba(0,0,0,0.2), inset 0 -10px 15px rgba(255,255,255,0.1)' }} />
          <div style={{ width: '120%', height: 65, background: '#5d4037', marginLeft: '-10%',
            borderRadius: '50%', marginBottom: -20,
            boxShadow: 'inset 0 10px 15px rgba(0,0,0,0.2)' }} />
        </div>

        {/* Stinger (flex child below body) */}
        <div style={{ width: 25, height: 30, background: '#5d4037', marginTop: -15,
          borderRadius: '50% 50% 50% 50% / 20% 20% 80% 80%', zIndex: 3,
          boxShadow: 'inset -5px -5px 10px rgba(0,0,0,0.3), inset 3px 3px 6px rgba(255,255,255,0.1)' }} />
      </div>
    );
  };

  // ── TURTLE — exact port of claymorphism-turtle HTML (design canvas: 400×450) ─
  // CSS variables: --clay-green:#9de37a, --clay-green-dark:#77bc59,
  //               --clay-pink:#f9b499, --clay-eye:#2c2c2c
  const renderTurtle = () => {
    const dw = 400, dh = 450;
    const scale = Math.min(cw / dw, ch / dh) * 1.25;

    const limbShadow = 'inset -8px -8px 15px rgba(0,0,0,0.2), inset 8px 8px 15px rgba(255,255,255,0.3), 0 10px 15px rgba(0,0,0,0.1)';

    const turtleEyes = () => {
      const base: React.CSSProperties = {
        position: 'absolute', width: 28, height: 32, background: '#2c2c2c',
        borderRadius: '50%', top: '45%',
        boxShadow: 'inset 2px 2px 5px rgba(255,255,255,0.2), 2px 4px 6px rgba(0,0,0,0.3)',
      };
      if (emotion === 'happy') {
        return (
          <>
            <div style={{ ...base, height: 16, borderRadius: '14px 14px 0 0', top: '48%', left: 65 }} />
            <div style={{ ...base, height: 16, borderRadius: '14px 14px 0 0', top: '48%', right: 65 }} />
          </>
        );
      }
      return (
        <>
          <div style={{ ...base, left: 65 }} />
          <div style={{ ...base, right: 65 }} />
        </>
      );
    };

    const turtleMouth = () => {
      if (emotion === 'happy') {
        return (
          <svg style={{ position: 'absolute', top: '54%', left: '50%', transform: 'translateX(-50%)' }}
            width={70} height={38} viewBox="0 0 70 38">
            <path d="M 2 2 Q 35 36 68 2" fill="none" stroke="#2c2c2c" strokeWidth="5" strokeLinecap="round" />
          </svg>
        );
      }
      if (emotion === 'talking') {
        return (
          <div style={{ position: 'absolute', top: '54%', left: '50%', transform: 'translateX(-50%)',
            width: 26, height: 26, background: '#2c2c2c', borderRadius: '50%', opacity: 0.85 }} />
        );
      }
      // neutral: exact HTML mouth
      return (
        <div style={{ position: 'absolute', width: 65, height: 30,
          borderBottom: '5px solid #2c2c2c',
          borderRadius: '0 0 50% 50% / 0 0 100% 100%',
          top: '52%', left: '50%', transform: 'translateX(-50%)' }} />
      );
    };

    return (
      <div style={{
        position: 'absolute', top: '50%', left: '50%',
        width: dw, height: dh,
        transform: `translate(-50%, -50%) scale(${scale})`,
        transformOrigin: 'center center',
      }}>
        {/* Ground shadow */}
        <div style={{ position: 'absolute', bottom: 20, left: '50%', transform: 'translateX(-50%)',
          width: 340, height: 40, background: 'rgba(0,0,0,0.08)', borderRadius: '50%',
          filter: 'blur(15px)', zIndex: 0 }} />

        {/* Shell */}
        <div style={{ position: 'absolute', bottom: 60, left: '50%', transform: 'translateX(-50%)',
          width: 320, height: 240, background: '#77bc59',
          borderRadius: '50% 50% 45% 45% / 60% 60% 40% 40%',
          boxShadow: 'inset -15px -15px 30px rgba(0,0,0,0.2), inset 15px 15px 30px rgba(255,255,255,0.3), 0 20px 40px rgba(0,0,0,0.1)',
          zIndex: 1 }} />

        {/* Body */}
        <div style={{ position: 'absolute', bottom: 40, left: '50%', transform: 'translateX(-50%)',
          width: 240, height: 180, background: '#9de37a',
          borderRadius: '50% 50% 48% 48% / 55% 55% 45% 45%',
          boxShadow: 'inset -10px -20px 30px rgba(0,0,0,0.15), inset 10px 10px 25px rgba(255,255,255,0.4), 0 15px 30px rgba(0,0,0,0.1)',
          zIndex: 3 }} />

        {/* Back left limb */}
        <div style={{ position: 'absolute', width: 70, height: 75, background: '#77bc59',
          borderRadius: '50%', bottom: 50, left: 20, transform: 'rotate(-15deg)',
          boxShadow: limbShadow, zIndex: 2 }} />

        {/* Back right limb */}
        <div style={{ position: 'absolute', width: 70, height: 75, background: '#77bc59',
          borderRadius: '50%', bottom: 50, right: 20, transform: 'rotate(15deg)',
          boxShadow: limbShadow, zIndex: 2 }} />

        {/* Front left limb */}
        <div style={{ position: 'absolute', width: 80, height: 90, background: '#9de37a',
          bottom: 30, left: 40, zIndex: 4,
          borderRadius: '40% 60% 40% 60% / 40% 40% 60% 60%',
          boxShadow: limbShadow }} />

        {/* Front right limb */}
        <div style={{ position: 'absolute', width: 80, height: 90, background: '#9de37a',
          bottom: 30, right: 40, zIndex: 4,
          borderRadius: '60% 40% 60% 40% / 40% 40% 60% 60%',
          boxShadow: limbShadow }} />

        {/* Head */}
        <div style={{ position: 'absolute', top: 40, left: '50%', transform: 'translateX(-50%)',
          width: 280, height: 250, background: '#9de37a',
          borderRadius: '50% 50% 48% 48% / 55% 55% 45% 45%',
          boxShadow: 'inset -12px -20px 35px rgba(0,0,0,0.12), inset 15px 15px 40px rgba(255,255,255,0.5), 0 10px 20px rgba(0,0,0,0.05)',
          zIndex: 5 }}>
          {/* Blush */}
          <div style={{ position: 'absolute', width: 45, height: 30, background: '#f9b499',
            borderRadius: '50%', filter: 'blur(10px)', opacity: 0.7, top: '55%', left: 30 }} />
          <div style={{ position: 'absolute', width: 45, height: 30, background: '#f9b499',
            borderRadius: '50%', filter: 'blur(10px)', opacity: 0.7, top: '55%', right: 30 }} />
          {turtleEyes()}
          {turtleMouth()}
        </div>
      </div>
    );
  };

  // ── Render ────────────────────────────────────────────────────────────────────
  const renderAnimal = () => {
    switch (type) {
      case 'seal':    return renderSeal();
      case 'bee':     return renderBee();
      case 'turtle':  return renderTurtle();
      default:        return renderJellyfish();
    }
  };

  const isJellyfish = type === 'jellyfish';

  return (
    <div className={`${sizeClasses[size]} relative flex items-center justify-center group transition-transform duration-500 hover:scale-110 overflow-visible`}>
      <div className={`w-full h-full relative overflow-visible ${!reducedMotion ? 'floating-anim' : ''}`}>
        {renderAnimal()}
      </div>

      <style>{`
        .tentacle-path {
          animation: squiggle 3.5s ease-in-out infinite alternate;
          transform-origin: top center;
        }
        @keyframes squiggle {
          0%   { stroke-dashoffset: 0; transform: scaleY(0.85) translateX(-3px); opacity: 0.7; }
          100% { stroke-dashoffset: 2; transform: scaleY(1.15) translateX(3px);  opacity: 0.9; }
        }
        .floating-anim {
          animation: float 5s ease-in-out infinite;
        }
        @keyframes float {
          0%, 100% { transform: translateY(0); }
          50%       { transform: translateY(-12px); }
        }
      `}</style>
    </div>
  );
};
