"use client";

import { useSyncExternalStore } from "react";

function subscribe(cb: () => void) {
  const observer = new MutationObserver(cb);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
  return () => observer.disconnect();
}

const getSnapshot = () => document.documentElement.classList.contains("dark");
const getServerSnapshot = () => false;

export function ThemeToggle() {
  const dark = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const toggle = () => {
    const next = !document.documentElement.classList.contains("dark");
    document.documentElement.classList.toggle("dark", next);
    try {
      localStorage.setItem("lfb:theme", next ? "dark" : "light");
    } catch {}
  };

  return (
    <button
      type="button"
      aria-label="Toggle theme"
      title="Toggle theme"
      onClick={toggle}
      className="ml-1 rounded-lg p-1.5 text-base transition-colors hover:bg-[color-mix(in_srgb,var(--color-fg)_8%,transparent)]"
      suppressHydrationWarning
    >
      <span aria-hidden suppressHydrationWarning>
        {dark ? "☀️" : "🌙"}
      </span>
    </button>
  );
}
