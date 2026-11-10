import React from 'react';

interface RecallEmblemProps {
  className?: string;
  size?: number;
  glow?: boolean;
}

export const RecallEmblem: React.FC<RecallEmblemProps> = ({
  className = 'h-9 w-9',
  size,
  glow = false,
}) => {
  const style = size ? { width: size, height: size } : undefined;

  return (
    <div
      style={style}
      className={`relative flex items-center justify-center rounded-[13px] overflow-hidden select-none shrink-0 ${className}`}
    >
      <div
        className="absolute inset-0"
        style={{
          background: 'linear-gradient(135deg, #4F93FF 0%, #3478F6 50%, #1856CB 100%)',
          boxShadow: glow
            ? '0 6px 20px -2px rgba(52, 120, 246, 0.45), inset 0 1.5px 1.5px rgba(255, 255, 255, 0.75), inset 0 -1.5px 2px rgba(15, 45, 115, 0.35)'
            : '0 3.5px 12px -1px rgba(52, 120, 246, 0.38), inset 0 1.5px 1.5px rgba(255, 255, 255, 0.70), inset 0 -1.5px 2px rgba(15, 45, 115, 0.35)',
        }}
      />

      {/* Top gloss curve reflection */}
      <div
        className="absolute top-0 inset-x-0 h-[45%] pointer-events-none"
        style={{
          background: 'linear-gradient(180deg, rgba(255, 255, 255, 0.38) 0%, transparent 100%)',
          borderTopLeftRadius: 'inherit',
          borderTopRightRadius: 'inherit',
        }}
      />

      {/* Specular rim */}
      <div className="absolute inset-0 rounded-[inherit] border border-white/30 pointer-events-none" />

      {/* Neat & Simple Screenshot Search Glyph */}
      <svg
        viewBox="0 0 48 48"
        className="w-full h-full relative z-10 p-1"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Screen Notch Indicator */}
        <rect x="18" y="5" width="12" height="2.2" rx="1.1" fill="white" fillOpacity="0.8" />

        {/* Magnifying Glass Lens */}
        <circle
          cx="22"
          cy="24"
          r="9"
          stroke="white"
          strokeWidth="3.2"
          strokeLinecap="round"
        />

        {/* Lens Specular Reflection Arc */}
        <path
          d="M19 19a5.5 5.5 0 0 1 6 0"
          stroke="white"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeOpacity="0.85"
        />

        {/* Search Handle */}
        <path
          d="M28.5 30.5L37 39"
          stroke="white"
          strokeWidth="3.4"
          strokeLinecap="round"
        />
      </svg>
    </div>
  );
};
