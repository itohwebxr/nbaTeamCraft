import Image from "next/image";
import Link from "next/link";
import HeaderAuth from "@/components/auth/HeaderAuth";
import FeedClient from "./FeedClient";

export const metadata = {
  title: "Feed — NBA TeamCraft",
  description: "See what teams the NBA TeamCraft community is building and debating.",
};

export default async function FeedPage({
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
            <Image src="/logo.png?v=2" alt="NBA TeamCraft" height={32} width={60} className="object-contain" />
          </Link>
          <div className="flex items-center gap-4">
            <Link href="/trivia" className="text-xs font-bold text-sky-400 hover:text-sky-300 transition-colors">
              🧠 Trivia
            </Link>
            <Link href="/draft" className="text-xs font-bold text-orange-400 hover:text-orange-300 transition-colors">
              Craft a Team →
            </Link>
            <HeaderAuth />
          </div>
        </div>
      </header>

      <div className="fade-up fade-up-1 max-w-lg mx-auto px-4 py-6">
        <div className="mb-6">
          <h1 className="font-display text-3xl font-black text-white tracking-wide">Community Feed</h1>
          <p className="text-sm text-zinc-500 mt-1">Teams being built and debated right now.</p>
        </div>

        <FeedClient initialTab={tab} />
      </div>
    </div>
  );
}
