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
        <footer className="mx-auto flex w-full max-w-5xl flex-col gap-2 px-4 pb-10 text-xs muted sm:flex-row sm:items-center sm:justify-between">
          <span className="inline-flex items-center gap-2">
            <span>Your data is stored only in this browser. Nothing is sent anywhere.</span>
            <a
              href="https://github.com/Chepenik/localhostfinancebuddy"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="View source on GitHub"
              title="View source on GitHub — don't trust, verify."
              className="inline-flex items-center gap-1.5 rounded-md px-1.5 py-1 transition-colors hover:bg-[color-mix(in_srgb,var(--color-fg)_8%,transparent)]"
              style={{ color: "var(--color-fg)" }}
            >
              <svg
                aria-hidden="true"
                viewBox="0 0 16 16"
                width="14"
                height="14"
                fill="currentColor"
              >
                <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0 0 16 8c0-4.42-3.58-8-8-8Z"/>
              </svg>
              <span>Source on GitHub</span>
            </a>
          </span>
          <span>
            By{" "}
            <a
              href="https://binmucker.com"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:underline"
              style={{ color: "var(--color-accent)" }}
            >
              Binmucker
            </a>
            {" · "}
            <a
              href="https://bitcoincoloring.com"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:underline"
              style={{ color: "var(--color-accent)" }}
            >
              Bitcoin Coloring Book
            </a>
          </span>
        </footer>
      </body>
    </html>
  );
}
