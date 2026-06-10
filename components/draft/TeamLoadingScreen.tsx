"use client";

export default function TeamLoadingScreen() {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-zinc-950/75 backdrop-blur-sm" />

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center gap-6">
        {/* Equalizer bars */}
        <div className="flex items-end gap-1.5 h-10">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <div
              key={i}
              className="w-2 rounded-full bg-orange-400"
              style={{
                animation: `eq-bar 1s ease-in-out ${i * 0.1}s infinite`,
              }}
            />
          ))}
        </div>

        {/* Text */}
        <p className="font-display font-bold text-sm tracking-[0.3em] text-zinc-400 uppercase">
          Loading Team
        </p>
      </div>

      <style>{`
        @keyframes eq-bar {
          0%, 100% { height: 8px;  opacity: 0.4; }
          50%       { height: 40px; opacity: 1;   }
        }
      `}</style>
    </div>
  );
}
