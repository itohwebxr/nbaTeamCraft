import Link from "next/link";
import Image from "next/image";

export default function Home() {
  return (
    <div className="min-h-screen court-bg text-white flex flex-col items-center justify-center px-4 overflow-hidden">
      <div className="max-w-md w-full text-center space-y-8">

        {/* Logo */}
        <div className="fade-up fade-up-1">
          <Image
            src="/logo.png"
            alt="NBA TeamCraft"
            width={280}
            height={94}
            className="mx-auto object-contain drop-shadow-[0_0_32px_rgba(249,115,22,0.3)]"
          />
          <p className="mt-4 text-zinc-400 text-sm leading-relaxed font-display tracking-wide">
            Draft 6 players from historic NBA rosters.<br />
            Build the greatest team ever assembled.
          </p>
        </div>

        {/* Rules */}
        <div className="fade-up fade-up-2 bg-zinc-900/80 border border-zinc-800 rounded-2xl p-5 text-left space-y-3 backdrop-blur-sm">
          <p className="font-display text-xs font-bold text-orange-400 uppercase tracking-[0.2em]">How to Play</p>
          <ul className="space-y-2.5 text-sm text-zinc-300">
            {[
              "Random historical NBA teams appear one by one",
              "Draft players to fill 5 starter slots (PG/SG/SF/PF/C) + 1 bench",
              <>Budget: <span className="font-bold text-white font-display text-base">17 pts</span> — star players cost more</>,
              "Get your team rated and share your result",
            ].map((text, i) => (
              <li key={i} className="flex gap-3 items-start">
                <span className="font-display text-orange-400 font-bold text-base leading-tight shrink-0 w-5">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span className="leading-relaxed">{text}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* CTA */}
        <div className="fade-up fade-up-3">
          <Link
            href="/draft"
            className="pulse-glow block w-full py-5 rounded-2xl bg-gradient-to-r from-orange-500 to-orange-400
              text-white font-display font-black text-2xl tracking-widest uppercase transition-all
              hover:from-orange-400 hover:to-amber-400 hover:scale-[1.02] active:scale-[0.98]"
          >
            Start Drafting →
          </Link>
        </div>

        <p className="fade-up fade-up-4 text-xs text-zinc-600 font-display tracking-widest">
          DATA: NBA SEASONS 2001–2026
        </p>
      </div>
    </div>
  );
}
