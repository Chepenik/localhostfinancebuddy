"use client";

import { useRef, useState } from "react";
import { buildDemoEntries } from "@/lib/demo";
import {
  clearState,
  exportJson,
  importJson,
  isLocalStorageAvailable,
  saveState,
} from "@/lib/storage";
import { useEntries } from "@/lib/useEntries";

type Message = { tone: "ok" | "err" | "info"; text: string };

export default function SettingsPage() {
  const { entries, hydrated } = useEntries();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [message, setMessage] = useState<Message | null>(null);

  const handleExport = () => {
    const blob = new Blob([exportJson()], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const stamp = new Date().toISOString().slice(0, 10);
    a.href = url;
    a.download = `finance-buddy-backup-${stamp}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setMessage({ tone: "ok", text: "Backup downloaded." });
  };

  const handleImport = async (file: File) => {
    if (entries.length > 0) {
      const ok = confirm(
        "Importing will replace your current data. Export a backup first if you want to keep it.",
      );
      if (!ok) return;
    }
    const text = await file.text();
    const result = importJson(text);
    if (result.ok) {
      const parts: string[] = [
        `Imported ${result.imported} item${result.imported === 1 ? "" : "s"}.`,
      ];
      if (result.skipped > 0) {
        parts.push(
          `Skipped ${result.skipped} item${result.skipped === 1 ? "" : "s"} that didn't look right.`,
        );
      }
      if (result.versionMismatch) {
        parts.push("File version was unfamiliar but the entries imported cleanly.");
      }
      setMessage({ tone: "ok", text: parts.join(" ") });
    } else {
      setMessage({ tone: "err", text: `Couldn't import: ${result.error}` });
    }
  };

  const handleLoadDemo = () => {
    if (entries.length > 0) {
      const ok = confirm("Loading the demo will replace your current data. Continue?");
      if (!ok) return;
    }
    const result = saveState({ version: 1, entries: buildDemoEntries() });
    if (result.ok) {
      setMessage({ tone: "ok", text: "Demo data loaded. Open the dashboard to see it." });
    } else {
      setMessage({ tone: "err", text: result.error });
    }
  };

  const handleClear = () => {
    const ok = confirm(
      "Delete every entry on this device? This can't be undone.\n\nIf you might want this data later, export a backup first.",
    );
    if (!ok) return;
    clearState();
    setMessage({ tone: "ok", text: "All data cleared." });
  };

  const storageOk = hydrated ? isLocalStorageAvailable() : true;

  return (
    <div className="grid gap-6">
      <header>
        <h1 className="text-3xl font-semibold tracking-tight">Settings</h1>
        <p className="mt-1 text-sm muted">
          Back up, restore, explore demo data, or wipe everything.
        </p>
      </header>

      {!storageOk && (
        <section
          className="card p-5"
          style={{
            borderColor:
              "color-mix(in srgb, var(--color-warning) 50%, var(--color-border))",
            color: "var(--color-warning)",
          }}
        >
          <h2 className="text-sm font-semibold">Storage isn&apos;t available</h2>
          <p className="mt-1 text-sm">
            This browser is blocking localStorage (private mode, strict settings, or storage
            disabled). Your changes won&apos;t persist after you close the tab.
          </p>
        </section>
      )}

      <section className="card p-6">
        <h2 className="text-sm font-semibold">Privacy</h2>
        <p className="mt-2 text-sm">
          All your entries live only in this browser&apos;s <code>localStorage</code>{" "}
          under <code>lfb:state:v1</code>. Nothing is ever sent to a server &mdash; this
          app does not have a server. Open your browser&apos;s Network tab and watch:
          adding entries, switching themes, and viewing the dashboard make zero
          network calls.
        </p>
        <p className="mt-3 text-sm muted">
          <strong>Local-first is not the same as encrypted.</strong> Anyone with access
          to this device or browser profile &mdash; including other apps and aggressive
          browser extensions &mdash; can read the stored JSON. If that matters for your
          situation, consider a dedicated browser profile for this app, full-disk
          encryption, or simply not entering numbers you wouldn&apos;t want a thief
          with your laptop to see.
        </p>
        <p className="mt-3 text-sm muted">
          The optional AI Insights feature is the <em>only</em> place this app makes a
          network request, and only when you explicitly click <em>Generate</em>. The AI
          API key is stored separately from your entries and is never included in
          backups, exports, or error messages.
        </p>
        <p className="mt-3 text-sm muted">
          {hydrated ? (
            <>
              You currently have <strong>{entries.length}</strong>{" "}
              {entries.length === 1 ? "entry" : "entries"} saved.
            </>
          ) : (
            "Loading your saved data…"
          )}
        </p>
      </section>

      <section className="card p-6">
        <h2 className="text-sm font-semibold">Backup &amp; restore</h2>
        <p className="mt-1 text-sm muted">
          Export downloads a single JSON file you can read, edit, or version-control.
          Import replaces everything you have on this device with the file&apos;s
          contents. Files larger than 4&nbsp;MB or with more than 50,000 entries are
          rejected as a safety check.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <button className="btn btn-primary" onClick={handleExport}>
            Export JSON
          </button>
          <button className="btn" onClick={() => fileInputRef.current?.click()}>
            Import JSON…
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleImport(f);
              e.target.value = "";
            }}
          />
        </div>
      </section>

      <section className="card p-6">
        <h2 className="text-sm font-semibold">Demo data</h2>
        <p className="mt-1 text-sm muted">
          Want to try the app without entering your own numbers? Load a small set of
          realistic example entries to explore. You can clear them anytime.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <button className="btn" onClick={handleLoadDemo}>
            Load demo data
          </button>
        </div>
      </section>

      <section
        className="card p-6"
        style={{
          borderColor: "color-mix(in srgb, var(--color-negative) 40%, var(--color-border))",
        }}
      >
        <h2 className="text-sm font-semibold" style={{ color: "var(--color-negative)" }}>
          Danger zone
        </h2>
        <p className="mt-1 text-sm muted">
          Permanently deletes every entry on this device. Export first if you might want
          it back. The optional AI Insights key (if you saved one) is also wiped on the
          Insights tab&apos;s &ldquo;Forget key&rdquo; button, not here.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <button className="btn btn-danger" onClick={handleClear}>
            Clear all entries
          </button>
        </div>
      </section>

      {message && (
        <div
          className="card px-4 py-3 text-sm"
          role="status"
          style={{
            borderColor:
              message.tone === "err"
                ? "var(--color-negative)"
                : message.tone === "ok"
                  ? "var(--color-accent)"
                  : "var(--color-border)",
            color:
              message.tone === "err"
                ? "var(--color-negative)"
                : message.tone === "ok"
                  ? "var(--color-accent)"
                  : "var(--color-fg)",
          }}
        >
          {message.text}
        </div>
      )}

      <CreatorCard />
    </div>
  );
}

function CreatorCard() {
  return (
    <section className="card p-6">
      <h2 className="text-sm font-semibold">More from the creator</h2>
      <p className="mt-1 text-xs muted">Optional. No tracking, just two friendly links.</p>
      <ul className="mt-4 grid gap-3 sm:grid-cols-2">
        <li
          className="rounded-2xl border p-4"
          style={{ borderColor: "var(--color-border)" }}
        >
          <a
            href="https://bitcoincoloring.com"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm font-semibold hover:underline"
            style={{ color: "var(--color-accent)" }}
          >
            The Bitcoin Coloring Book →
          </a>
          <p className="mt-1 text-xs muted leading-relaxed">
            Want to teach your children about sound money? Check out{" "}
            <em>The Bitcoin Coloring Book</em>.
          </p>
        </li>
        <li
          className="rounded-2xl border p-4"
          style={{ borderColor: "var(--color-border)" }}
        >
          <a
            href="https://binmucker.com"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm font-semibold hover:underline"
            style={{ color: "var(--color-accent)" }}
          >
            Binmucker →
          </a>
          <p className="mt-1 text-xs muted leading-relaxed">
            Enjoy this project? Check out more of my experiments at Binmucker.
          </p>
        </li>
      </ul>
    </section>
  );
}
