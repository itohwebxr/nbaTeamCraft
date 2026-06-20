"use client";

import Image from "next/image";
import Link from "next/link";
import HeaderAuth from "@/components/auth/HeaderAuth";

interface AppHeaderProps {
  /** Extra actions rendered between the logo title area and the user icon (e.g. ← Back, Skip) */
  actions?: React.ReactNode;
}

export default function AppHeader({ actions }: AppHeaderProps) {
  return (
    <header className="sticky top-0 z-40 bg-zinc-950/95 backdrop-blur border-b border-zinc-800 px-4 py-3">
      <div className="max-w-lg mx-auto flex items-center justify-between gap-3">
        <Link href="/" className="shrink-0">
          <Image
            src="/logo.png?v=2"
            alt="NBA TeamCraft"
            height={32}
            width={60}
            className="object-contain"
          />
        </Link>

        <div className="flex items-center gap-3 ml-auto">
          {actions}
          <HeaderAuth />
        </div>
      </div>
    </header>
  );
}
