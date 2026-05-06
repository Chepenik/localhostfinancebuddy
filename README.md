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
- Read **plain-language observations** (cash flow, savings rate, emergency-fund estimate, debt load, expense concentration) — generated locally, with no AI and no network call
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
npm run validate    # 55 assertions over the finance, observations, and insights logic
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

## AI Insights (optional, off by default)

There is an opt-in **AI Insights** tab that can turn your numbers into a short
plain-English summary using your **own** AI API key. Nothing happens
automatically — you have to type a key, click *Generate*, and you can see the
exact JSON that will leave the browser before it does.

- **Optional.** Off by default. The feature does nothing until you visit the
  Insights tab and click Generate.
- **Bring your own key.** The app does not ship with a key, does not proxy
  through any server, and does not have a server. The key is held in this
  tab's `sessionStorage` (gone when you close it) unless you explicitly tick
  *Remember on this device*, which mirrors it to `localStorage`.
  **Browser storage is not a secure vault** — anyone with access to this
  device or browser profile can read it. The app warns you about this in the
  UI.
- **Minimized payload.** Only top-line aggregates leave your browser:
  net worth, monthly income, monthly expenses, monthly cash flow, savings
  rate, total assets, total liabilities, debt-to-asset ratio, entry count,
  and an ISO timestamp. Optionally — only if you tick the box — the payload
  also includes per-category totals (e.g. *Housing $1,850/mo*) using the
  predefined category labels.
- **Excluded by default.** Entry names, notes, IDs, timestamps, account /
  bank / employer names, and the raw `localStorage` blob are **never** part
  of the payload. The validation script asserts this.
- **Default provider: OpenRouter + Kimi K2.** The base URL defaults to
  `https://openrouter.ai/api/v1` and the model to `moonshotai/kimi-k2`. Both
  fields are editable — you can pin a specific Kimi version (e.g.
  `moonshotai/kimi-k2-0905`) or swap the provider entirely.
- **Privacy-focused providers welcome.** The provider field is just an
  OpenAI-compatible base URL, so you can point it at a local model server
  (Ollama at `http://localhost:11434/v1`, LM Studio at
  `http://localhost:1234/v1`, llama.cpp's OpenAI compat, etc.) and the
  payload never leaves your machine.
- **Not financial advice.** The system prompt explicitly forbids the model
  from recommending specific investments, securities, funds, or trades. Any
  response is a summary of the numbers you provided, not advice.

The result is shown only in the page (with a *Copy insights* button) and is
not saved anywhere — it disappears on reload.

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
  insights/page.tsx    # Optional, opt-in AI Insights (BYO key)
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
  insights.ts          # AI Insights — pure payload builder + OpenAI-compatible request
  aiSettings.ts        # AI key / config storage helpers (session-default)
  observations.ts      # Local, AI-free, plain-language insights for the dashboard
scripts/
  validate-finance.mjs # 55 assertions over the core, insights, and observations logic
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
