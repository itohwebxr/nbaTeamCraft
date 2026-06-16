import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // Allow the cache-busted logo to be optimized by next/image. Query strings
    // are blocked by default in Next 16 unless explicitly allowed here.
    localPatterns: [
      { pathname: "/logo.png", search: "" },
      { pathname: "/logo.png", search: "?v=2" },
    ],
  },
};

export default nextConfig;
