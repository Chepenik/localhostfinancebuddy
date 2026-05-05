# Localhost Finance Buddy

A calm, local-first personal finance dashboard you run on your own machine.
No accounts. No cloud. No third-party APIs. Your numbers never leave your
browser.

It's designed to be the **opposite** of an accounting app: a single, friendly
view of your money that's useful even if you only ever enter five things.
**Net worth** is the hero, everything else supports it.

> "How much money do I actually have, and where is it going?" — answered, on
> your own laptop, in about ten seconds.

---

## What it does

- Track your **income**, **expenses**, **assets**, and **liabilities** (debts)
- See your **net worth** front and center, with a 12-month projection at your current pace
- Watch your **monthly cash flow**, **savings rate**, and **debt-to-asset ratio**
- Visualize **where your money goes** and **what you own** with simple pie charts
- See your **assets vs. liabilities split** as a single proportional bar
- Get a friendly **financial-health read** ("Looking great" → "A bit tight")
- **Export & import** your data as JSON for backups or moving between browsers
- **Load demo data** with one click to explore without entering your own numbers
- **Wipe all data** with a confirmation step
- Light & dark mode that respects your system preference, plus a manual toggle

That's it. No bank linking, no transaction-level accounting, no auth, no sync.

---

## Why local-first

Your finances are private. Most "personal finance" apps make you sign up,
upload statements, hand over read-only bank credentials, or accept that an ad
network sees what you spend. None of that is necessary just to ask:

> "Am I building wealth?"

This app answers that question without ever touching the network. There is no
backend. There is no server-side rendering of your numbers. There is no
analytics, no tracker, no cookie banner — there is nothing to put one up
about.

---

## Run it

You'll need **Node 22.6+** (Node 24 LTS recommended).

```bash
git clone <this-repo>
cd localhostfinancebuddy
npm install
npm run dev
# open http://localhost:3000
```

Other useful scripts:

```bash
npm run build       # production build (Next.js + Turbopack)
npm run start       # serve the built app
npm run lint        # ESLint
npm run typecheck   # tsc --noEmit
npm run validate    # 38 assertions over the finance + storage logic
```

---

## How to use it

1. **Open the app.** You'll see a big "$0" with two buttons: *Add your first
   entry* or *Try with demo data*.
2. **Add a few items.** Hit the Entries tab. The four buckets are Income,
   Expenses, Assets, and Liabilities. Each takes a name, an amount, a
   category, and optional notes.
   - Income/Expenses ask "how often?" — pick weekly/monthly/yearly/one-time
     and we convert to a monthly figure for you.
   - Assets/Liabilities are point-in-time balances (what's in the account
     today, what you owe today).
3. **Watch the dashboard fill in.** Net worth, cash flow, savings rate, and
   the breakdown charts update as you go.
4. **Export when you want a backup** — Settings → Export JSON. The file is
   plain text; you can read it, edit it, version it, share it.

You're not locked in to anything. The whole app is a few hundred lines of
TypeScript over a single localStorage key.

---

## How data is stored

All your data lives in this browser's `localStorage` under a single key:
`lfb:state:v1`.

**Why not IndexedDB?** For a few hundred line items of structured JSON,
`localStorage` is faster and simpler to reason about. It's synchronous (no
loading states), well under the ~5 MB quota, and trivially serializable for
export. IndexedDB only pays off when you need binary blobs, multi-megabyte
datasets, or background queries — none of which apply here.

Mutations dispatch a custom event so other tabs and same-tab listeners stay
in sync. Reads use `useSyncExternalStore` so SSR + hydration don't flicker.

### Import / export

- **Export** writes a single `finance-buddy-backup-YYYY-MM-DD.json` file
  containing your full state.
- **Import** validates each row using a strict shape check
  (`coerceEntry`). Bad rows are skipped silently with a "Skipped N items"
  message; good rows are saved.
- Importing **replaces** your current data. The app prompts you to confirm
  if you have anything saved.

---

## What it doesn't do (yet)

By design, this is a v1. Things it doesn't try to be:

- **A bookkeeper.** No transaction-level history, no double-entry, no
  reconciliation. Income and expenses are recurring rates, not a list of
  every coffee.
- **Multi-currency.** Numbers are formatted with your locale, defaulting to
  USD. No FX conversion.
- **A cloud product.** No accounts, no sync, no shared budgets.
- **A bank integration.** Plaid, Yodlee, etc. are explicitly out of scope.
- **A budgeting envelope tool.** Maybe later — see roadmap.

If you fork it and add any of these, that's wonderful and very much in the
spirit of "your machine, your rules."

---

## Project layout

```
app/
  layout.tsx           # Root shell, theme bootstrap, navigation, footer
  page.tsx             # Dashboard — net worth hero, metric tiles, charts
  entries/page.tsx     # Tabbed manager for the four entry kinds
  settings/page.tsx    # Backup / restore / demo / clear
  globals.css          # Tailwind v4 theme variables, light/dark, components
components/
  Nav.tsx              # Sticky top nav + theme toggle
  ThemeScript.tsx      # Inlined no-flash theme bootstrap
  ThemeToggle.tsx
  NetWorthHero.tsx     # The hero. Big number, projection, health.
  MetricTile.tsx       # Calm secondary metric card
  AssetsLiabilitiesBar.tsx  # Single proportional split bar
  EntryForm.tsx        # Add/edit form for any entry kind
  EntryList.tsx        # Inline-editable, deletable list
  charts/
    CategoryPie.tsx    # The one chart we use, twice
lib/
  types.ts             # Entry shapes + runtime coerceEntry validator
  storage.ts           # Safe localStorage with quota/disabled handling
  finance.ts           # Pure functions: toMonthly, summarize, formatters
  useEntries.ts        # useSyncExternalStore hook + hydrated flag
  demo.ts              # Demo dataset (load from Settings)
scripts/
  validate-finance.mjs # 38 assertions over the core logic
```

---

## Tech notes

- **Next.js 16** App Router with Turbopack
- **React 19** + `useSyncExternalStore` for snapshot-safe SSR/hydration
- **TypeScript** in strict mode
- **Tailwind CSS v4** (no config file needed)
- **Recharts** for the two pie charts
- **No** state library, no UI kit, no backend, no test runner

The whole thing is a single deployable Next app you can serve from anywhere
or run forever on `localhost`.

---

## Roadmap

Things that would make a great v2, in roughly the order I'd build them:

1. **Dated transactions** as the storage primitive, so the dashboard can show
   real trend lines and last-N-month comparisons.
2. **Goals** — emergency fund, down payment, payoff target — with progress
   bars woven into the dashboard.
3. **Budget envelopes** — set a per-category cap, see what's left.
4. **CSV import** from common bank exports → bulk-fill expenses.
5. **PWA / installable** with offline cache.
6. **Optional client-side encryption** of the stored blob behind a passphrase.
7. **Currency picker** + Intl-formatted entries.
8. **A migration to IndexedDB** if/when transaction history lands.
9. **Vitest + Playwright** suites alongside the existing validation script.

---

## License

[MIT](./LICENSE) — do whatever you want, just don't blame us if your spreadsheets get jealous.
# localhostfinancebuddy
