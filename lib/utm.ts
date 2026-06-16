// Appends UTM parameters to a share URL so GA4 can attribute traffic by the
// channel and, when available, the X account that generated the share.
//
// `handle` is the logged-in user's X handle (without @). When a guest shares,
// we still tag the channel so X-share traffic is separable from organic/direct.
export function withShareUtm(
  url: string,
  opts: { handle?: string | null; campaign?: string } = {}
): string {
  try {
    const u = new URL(url);
    u.searchParams.set("utm_source", "x");
    u.searchParams.set("utm_medium", "social");
    u.searchParams.set("utm_campaign", opts.campaign ?? "share");
    u.searchParams.set("utm_content", opts.handle ? opts.handle : "guest");
    return u.toString();
  } catch {
    return url;
  }
}
