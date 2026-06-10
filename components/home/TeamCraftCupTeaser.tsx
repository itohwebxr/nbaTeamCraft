export default function TeamCraftCupTeaser() {
  return (
    <div className="w-full max-w-md mx-auto">
      <div className="relative overflow-hidden rounded-2xl border border-amber-800/40 bg-gradient-to-br from-amber-900/30 via-zinc-900 to-orange-900/20 p-6">
        {/* Background glow */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute -top-8 -right-8 w-40 h-40 rounded-full bg-amber-500/10 blur-3xl" />
          <div className="absolute -bottom-8 -left-8 w-32 h-32 rounded-full bg-orange-500/10 blur-3xl" />
        </div>

        <div className="relative z-10 text-center space-y-3">
          <p className="font-display text-4xl">🏆</p>
          <div>
            <p className="font-display text-xl font-black text-white tracking-widest uppercase">
              TeamCraft Cup
            </p>
            <p className="font-display text-xs font-bold text-amber-400 tracking-[0.25em] uppercase mt-1">
              Coming Soon
            </p>
          </div>
          <p className="text-sm text-zinc-400 leading-relaxed">
            The ultimate challenge is coming.<br />
            Build the greatest team. Compete for the crown.
          </p>
          <a
            href="https://x.com/nbaTeamCraft"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 hover:border-zinc-500 text-white font-bold text-sm transition-colors"
          >
            <span className="font-bold">𝕏</span>
            Follow for Updates
          </a>
        </div>
      </div>
    </div>
  );
}
