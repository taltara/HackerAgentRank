import type { Metadata } from "next";
import type { ReactNode } from "react";
import { IBM_Plex_Mono, Outfit, Syne } from "next/font/google";
import "./globals.css";

const display = Syne({
  subsets: ["latin"],
  variable: "--font-display",
  weight: ["500", "600", "700"],
});

const sans = Outfit({
  subsets: ["latin"],
  variable: "--font-sans",
});

const mono = IBM_Plex_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  weight: ["400", "500"],
});

export const metadata: Metadata = {
  title: "CV Evaluator",
  description:
    "Local-first CV scoring against explainable hiring rubrics. Runs on your machine.",
};

export default function RootLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <html lang="en" className={`${display.variable} ${sans.variable} ${mono.variable}`}>
      <body className="bg-ink font-sans text-white antialiased">
        <main className="min-h-screen">{children}</main>
      </body>
    </html>
  );
}
