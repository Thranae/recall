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
      className={`relative flex items-center justify-center rounded-[14px] overflow-hidden select-none shrink-0 ${className}`}
    >
      {/* Background Gradient */}
      <div
        className="absolute inset-0"
        style={{
          background: 'linear-gradient(135deg, #3B82F6 0%, #2563EB 50%, #1D4ED8 100%)',
          boxShadow: glow
            ? '0 8px 25px -4px rgba(37, 99, 235, 0.50), inset 0 1.5px 1.5px rgba(255, 255, 255, 0.75), inset 0 -1.5px 2px rgba(15, 45, 115, 0.35)'
            : '0 3.5px 12px -1px rgba(37, 99, 235, 0.35), inset 0 1.5px 1.5px rgba(255, 255, 255, 0.70), inset 0 -1.5px 2px rgba(15, 45, 115, 0.35)',
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

      {/* Bold, Neat, Iconic Recall "R" Monogram */}
      <svg
        viewBox="0 0 48 48"
        className="w-full h-full relative z-10 p-0.5"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M14 12h11c5 0 9 3.5 9 8 0 3.8-2.9 6.9-7 7.7L34 36h-6.5l-6.2-7.5H20v7.5h-6V12zm6 11.5h5c2.2 0 4-1.5 4-3.5s-1.8-3.5-4-3.5h-5v7z"
          fill="#ffffff"
        />
      </svg>
    </div>
  );
};
