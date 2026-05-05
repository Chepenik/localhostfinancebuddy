"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ThemeToggle } from "./ThemeToggle";

const TABS = [
  { href: "/", label: "Dashboard" },
  { href: "/entries", label: "Entries" },
  { href: "/settings", label: "Settings" },
];

export function Nav() {
  const pathname = usePathname();
  return (
    <header className="sticky top-0 z-30 backdrop-blur-md"
      style={{ backgroundColor: "color-mix(in srgb, var(--color-bg) 80%, transparent)", borderBottom: "1px solid var(--color-border)" }}
    >
      <div className="mx-auto flex w-full max-w-5xl items-center justify-between px-4 py-3">
        <Link href="/" className="flex items-center gap-2 font-semibold tracking-tight">
          <span
            aria-hidden
            className="inline-flex h-7 w-7 items-center justify-center rounded-lg text-white"
            style={{ backgroundColor: "var(--color-accent)" }}
          >
            $
          </span>
          <span className="hidden sm:inline">Localhost Finance Buddy</span>
          <span className="sm:hidden">Finance Buddy</span>
        </Link>

        <nav className="flex items-center gap-1">
          {TABS.map((t) => {
            const active = t.href === "/" ? pathname === "/" : pathname.startsWith(t.href);
            return (
              <Link
                key={t.href}
                href={t.href}
                className="rounded-lg px-3 py-1.5 text-sm font-medium transition-colors"
                style={{
                  backgroundColor: active ? "var(--color-accent-soft)" : "transparent",
                  color: active ? "var(--color-accent)" : "var(--color-fg)",
                }}
              >
                {t.label}
              </Link>
            );
          })}
          <ThemeToggle />
        </nav>
      </div>
    </header>
  );
}
