"use client";

export default function TeamLoadingScreen() {
  return (
    <div className="flex flex-col items-center justify-center h-64 gap-8 select-none">
      {/* Bouncing ball */}
      <div className="relative w-16 h-16">
        {/* Shadow under ball */}
        <div
          className="absolute bottom-0 left-1/2 -translate-x-1/2 w-8 h-2 rounded-full bg-black/50"
          style={{ animation: "ball-shadow 0.7s ease-in-out infinite" }}
        />
        {/* Ball */}
        <div
          className="absolute w-12 h-12 left-1/2 -translate-x-1/2"
          style={{ animation: "ball-bounce 0.7s ease-in-out infinite" }}
        >
          <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="24" cy="24" r="24" fill="#f97316" />
            {/* seam lines */}
            <path d="M24 0 C24 0 10 12 10 24 C10 36 24 48 24 48" stroke="#c2410c" strokeWidth="2.5" fill="none"/>
            <path d="M24 0 C24 0 38 12 38 24 C38 36 24 48 24 48" stroke="#c2410c" strokeWidth="2.5" fill="none"/>
            <path d="M0 24 C0 24 12 18 24 18 C36 18 48 24 48 24" stroke="#c2410c" strokeWidth="2.5" fill="none"/>
          </svg>
        </div>
      </div>

      {/* Pulsing text with dots */}
      <div className="flex items-center gap-2">
        <span className="font-display font-bold text-base tracking-[0.2em] text-zinc-400 uppercase">
          Loading Team
        </span>
        <span className="flex gap-1">
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className="block w-1 h-1 rounded-full bg-orange-400"
              style={{ animation: `dot-pulse 1.2s ease-in-out ${i * 0.2}s infinite` }}
            />
          ))}
        </span>
      </div>

      {/* Skeleton cards */}
      <div className="w-full grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 opacity-30 pointer-events-none">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="h-28 rounded-xl bg-zinc-800"
            style={{ animation: `skeleton-pulse 1.5s ease-in-out ${i * 0.1}s infinite` }}
          />
        ))}
      </div>

      <style>{`
        @keyframes ball-bounce {
          0%, 100% { transform: translateX(-50%) translateY(0);    animation-timing-function: ease-in; }
          50%       { transform: translateX(-50%) translateY(-40px); animation-timing-function: ease-out; }
        }
        @keyframes ball-shadow {
          0%, 100% { transform: translateX(-50%) scaleX(1);   opacity: 0.5; }
          50%       { transform: translateX(-50%) scaleX(0.4); opacity: 0.2; }
        }
        @keyframes dot-pulse {
          0%, 100% { opacity: 0.2; transform: scale(0.8); }
          50%       { opacity: 1;   transform: scale(1.4); }
        }
        @keyframes skeleton-pulse {
          0%, 100% { opacity: 0.3; }
          50%       { opacity: 0.6; }
        }
      `}</style>
    </div>
  );
}
