import type { Metadata, Viewport } from "next";
import Script from "next/script";
import { Bricolage_Grotesque, Space_Mono } from "next/font/google";
import WebAnalytics from "@/components/WebAnalytics";
import "./globals.css";

const bricolage = Bricolage_Grotesque({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

const spaceMono = Space_Mono({
  subsets: ["latin"],
  weight: ["400", "700"],
  variable: "--font-mono",
  display: "swap",
});

export const viewport: Viewport = {
  themeColor: "#0b0d11",
};

export const metadata: Metadata = {
  title: "ZailTrack — High-Density Financial Ledger",
  description:
    "A clean, secure, and modern financial management ledger with zero generic slop. Real-time cashflow tracking, monthly analytics, and technical reporting.",
  authors: [{ name: "Fuzail Fazle Rabbi", url: "https://github.com/FuzailFr" }],
  manifest: "/manifest.json",
  icons: {
    icon: "/icon.svg",
    apple: "/icon.svg",
  },
};

const THEME_INIT_SCRIPT = `
(function () {
  try {
    var stored = localStorage.getItem("theme") || localStorage.getItem("zailtrack-theme");
    var theme = stored === "light" || stored === "dark" ? stored : "dark";
    document.documentElement.setAttribute("data-theme", theme);
  } catch (e) {
    document.documentElement.setAttribute("data-theme", "dark");
  }
})();
`;

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="id"
      className={`${bricolage.variable} ${spaceMono.variable}`}
      suppressHydrationWarning
    >
      <head>
        <Script
          id="theme-initializer"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }}
        />
      </head>
      <body className="min-h-screen bg-[var(--bg)] text-[var(--text-primary)] antialiased">
        {children}
        <WebAnalytics />
      </body>
    </html>
  );
}
