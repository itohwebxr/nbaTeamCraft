import Link from "next/link";
import Image from "next/image";

export default function Home() {
  return (
    <div className="min-h-screen bg-zinc-950 text-white flex flex-col items-center justify-center px-4">
      <div className="max-w-md w-full text-center space-y-8">
        {/* Logo */}
        <div>
          <Image src="/logo.png" alt="NBA TeamCraft" width={240} height={80} className="mx-auto object-contain" />
          <p className="mt-4 text-zinc-400 text-sm leading-relaxed">
            Draft 8 players from historic NBA rosters.<br />
            Build the greatest team ever assembled.
          </p>
        </div>

        {/* Rules */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 text-left space-y-3">
          <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest">How to Play</p>
          <ul className="space-y-2 text-sm text-zinc-300">
            <li className="flex gap-2">
              <span className="text-orange-400 shrink-0">01</span>
              Random historical NBA teams appear one by one
            </li>
            <li className="flex gap-2">
              <span className="text-orange-400 shrink-0">02</span>
              Draft players to fill 5 starter slots (PG/SG/SF/PF/C) + 3 bench
            </li>
            <li className="flex gap-2">
              <span className="text-orange-400 shrink-0">03</span>
              Budget: <span className="font-bold text-white">25 points</span> — star players cost more
            </li>
            <li className="flex gap-2">
              <span className="text-orange-400 shrink-0">04</span>
              Get your team rated and share your result
            </li>
          </ul>
        </div>

        {/* CTA */}
        <Link
          href="/draft"
          className="block w-full py-4 rounded-2xl bg-orange-500 hover:bg-orange-400 active:bg-orange-600
            text-white font-black text-lg tracking-tight transition-colors"
        >
          Start Drafting →
        </Link>

        <p className="text-xs text-zinc-600">
          Data: NBA seasons 2001–2026
        </p>
      </div>
    </div>
  );
}
