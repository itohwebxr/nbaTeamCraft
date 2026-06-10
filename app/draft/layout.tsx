import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Draft — NBA TeamCraft",
};

export default function DraftLayout({ children }: { children: React.ReactNode }) {
  return children;
}
