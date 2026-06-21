"use client";

import { useEffect } from "react";

// Ensures the page starts at the top after a client-side navigation (e.g. from
// a feed card), where the previous scroll position can otherwise be retained.
export default function ScrollToTop() {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);
  return null;
}
