import Image from "next/image";
import Link from "next/link";
import BuilderList from "@/components/builder/BuilderList";
import HeaderAuth from "@/components/auth/HeaderAuth";

export const metadata = {
  title: "Roster Builder — NBA TeamCraft",
  description: "Trade & FA scenario rosters built by NBA TeamCraft players. See how every what-if lineup stacks up.",
};

export default function BuilderGalleryPage() {
  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      <header className="sticky top-0 z-40 bg-zinc-950/95 backdrop-blur border-b border-zinc-800 px-4 py-3">
        <div className="max-w-lg mx-auto flex items-center justify-between">
          <Link href="/">
            <Image src="/logo.png?v=2" alt="NBA TeamCraft" height={32} width={60} className="object-contain" />
          </Link>
          <div className="flex items-center gap-4">
            <Link href="/ranking" className="text-xs font-bold text-zinc-400 hover:text-white transition-colors">
              Rankings
            </Link>
            <Link href="/draft" className="text-xs font-bold text-orange-400 hover:text-orange-300 transition-colors">
              Build →
            </Link>
            <HeaderAuth />
          </div>
        </div>
      </header>

      <div className="fade-up fade-up-1 max-w-lg mx-auto px-4 py-6">
        <div className="mb-6">
          <h1 className="font-display text-3xl font-black text-white tracking-wide">🔧 Roster Builder</h1>
          <p className="text-sm text-zinc-500 mt-1">Trade &amp; FA scenarios, built by the community.</p>
        </div>

        <BuilderList />
      </div>
    </div>
  );
}
