import type { Metadata } from "next";
import "./globals.css";
import { ThemeScript } from "@/components/ThemeScript";
import { Nav } from "@/components/Nav";

export const metadata: Metadata = {
  title: "Localhost Finance Buddy",
  description:
    "A friendly, local-only personal finance dashboard. Your data never leaves your browser.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <ThemeScript />
      </head>
      <body className="min-h-screen">
        <Nav />
        <main className="mx-auto w-full max-w-5xl px-4 pb-24 pt-8 md:pt-12">
          {children}
        </main>
        <footer className="mx-auto w-full max-w-5xl px-4 pb-10 text-xs muted">
          Your data is stored only in this browser. Nothing is sent anywhere.
        </footer>
      </body>
    </html>
  );
}
