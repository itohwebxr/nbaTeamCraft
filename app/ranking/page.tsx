import Image from "next/image";
import Link from "next/link";
import RankingList from "@/components/ranking/RankingList";

export const metadata = {
  title: "Rankings — NBA TeamCraft",
  description: "See the greatest teams ever assembled by NBA TeamCraft players.",
};

export default async function RankingPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const { tab } = await searchParams;
  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      <header className="sticky top-0 z-40 bg-zinc-950/95 backdrop-blur border-b border-zinc-800 px-4 py-3">
        <div className="max-w-lg mx-auto flex items-center justify-between">
          <Link href="/">
            <Image src="/logo.png" alt="NBA TeamCraft" height={32} width={60} className="object-contain" />
          </Link>
          <div className="flex items-center gap-4">
            <Link href="/cup" className="text-xs font-bold text-amber-400 hover:text-amber-300 transition-colors">
              🏆 Cup
            </Link>
            <Link href="/draft" className="text-xs font-bold text-orange-400 hover:text-orange-300 transition-colors">
              Draft →
            </Link>
          </div>
        </div>
      </header>

      <div className="fade-up fade-up-1 max-w-lg mx-auto px-4 py-6">
        <div className="mb-6">
          <h1 className="font-display text-3xl font-black text-white tracking-wide">🏆 Rankings</h1>
          <p className="text-sm text-zinc-500 mt-1">The greatest teams ever assembled.</p>
        </div>

        <RankingList initialTab={tab} />
      </div>
    </div>
  );
}
