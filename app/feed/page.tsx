import AppHeader from "@/components/layout/AppHeader";
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
      <AppHeader />

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
