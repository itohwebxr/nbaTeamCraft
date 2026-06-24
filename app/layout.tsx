import type { Metadata, Viewport } from "next";
import { Barlow_Condensed, DM_Sans } from "next/font/google";
import "./globals.css";
import RetentionTracker from "@/components/common/RetentionTracker";

const barlow = Barlow_Condensed({
  variable: "--font-barlow",
  weight: ["400", "600", "700", "900"],
  subsets: ["latin"],
});

const dmSans = DM_Sans({
  variable: "--font-dm-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "NBA TeamCraft",
  description: "Build any NBA roster. Test trades, debate line-ups, prove your NBA knowledge.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "TeamCraft",
  },
  icons: {
    icon: "/favicon.ico",
    apple: "/logo.png?v=2",
  },
  openGraph: {
    title: "NBA TeamCraft",
    description: "Build any NBA roster. Test trades, debate line-ups, prove your NBA knowledge.",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "NBA TeamCraft",
    description: "Build any NBA roster. Test trades, debate line-ups, prove your NBA knowledge.",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#f97316",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${barlow.variable} ${dmSans.variable} h-full antialiased bg-zinc-950`}
    >
      <head>
        {/* Google Tag Manager — native inline script so it renders into the
            server HTML and executes (next/script with inline children inside
            <head> is not executed on the client). */}
        <script
          id="gtm"
          dangerouslySetInnerHTML={{
            __html: `(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);})(window,document,'script','dataLayer','GTM-K6P8WDXB');`,
          }}
        />
      </head>
      <body className="min-h-full flex flex-col bg-zinc-950 text-white">
        <noscript>
          <iframe
            src="https://www.googletagmanager.com/ns.html?id=GTM-K6P8WDXB"
            height="0"
            width="0"
            style={{ display: "none", visibility: "hidden" }}
          />
        </noscript>
        <RetentionTracker />
        {children}
      </body>
    </html>
  );
}
