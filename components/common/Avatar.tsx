"use client";

import { useState } from "react";

// Avatar that renders an X (Twitter) profile image with two safeguards:
//  1. referrerPolicy="no-referrer" — pbs.twimg.com blocks cross-origin hotlinks
//     when a Referer is sent.
//  2. onError fallback to the user's initial — so a dead/stale/blocked URL shows
//     a clean initial instead of a broken-image icon.
// `className` carries the size/shape/border and is applied to both the image
// and the fallback so they look identical.
export default function Avatar({
  src,
  name,
  className,
  textClassName = "text-xs",
}: {
  src?: string | null;
  name?: string | null;
  className: string;
  textClassName?: string;
}) {
  const [ok, setOk] = useState(true);
  const initial = (name?.trim()?.charAt(0) ?? "?").toUpperCase();

  if (src && ok) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt=""
        referrerPolicy="no-referrer"
        loading="lazy"
        onError={() => setOk(false)}
        className={`object-cover ${className}`}
      />
    );
  }

  return (
    <div className={`bg-zinc-700 flex items-center justify-center font-bold text-zinc-300 ${textClassName} ${className}`}>
      {initial}
    </div>
  );
}
