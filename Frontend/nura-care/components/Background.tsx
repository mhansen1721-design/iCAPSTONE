import React from 'react';

interface BackgroundProps {
  palette?: string;
  className?: string;
}

export const Background: React.FC<BackgroundProps> = ({ palette, className }) => {
  return (
    /* CRITICAL: We use 'bg-transparent' here so the color of the <body> 
       and <main> tags (the theme colors) can actually be seen! 
    */
    <div className={`fixed inset-0 -z-10 overflow-hidden pointer-events-none bg-transparent ${className}`}>
      
      {/* This orb uses the CSS variable for the accent color. 
         It will turn Red in High-Clarity and Teal in Serene Nature! 
      */}
      <div 
        className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full blur-[120px] opacity-20 animate-pulse" 
        style={{ backgroundColor: 'var(--nura-accent)' }} 
      />
      
      <div 
        className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] rounded-full blur-[150px] opacity-10" 
        style={{ backgroundColor: 'var(--nura-accent)', animationDelay: '2s' }} 
      />

      {/* Floating particles */}
      {[...Array(12)].map((_, i) => (
        <div
          key={i}
          className="absolute rounded-full bg-nura-card blur-[1px]"
          style={{
            width: Math.random() * 15 + 5 + 'px',
            height: Math.random() * 15 + 5 + 'px',
            top: Math.random() * 100 + '%',
            left: Math.random() * 100 + '%',
            animation: `float ${15 + Math.random() * 10}s ease-in-out infinite`,
            opacity: Math.random() * 0.4
          }}
        />
      ))}
    </div>
  );
};
