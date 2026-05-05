import Link from "next/link";

export default function NotFound() {
  return (
    <div className="grid gap-8">
      <section
        className="relative overflow-hidden rounded-3xl"
        style={{
          background:
            "linear-gradient(180deg, color-mix(in srgb, var(--color-accent-soft) 60%, var(--color-surface)) 0%, var(--color-surface) 100%)",
          border: "1px solid var(--color-border)",
        }}
      >
        <div className="px-6 py-10 sm:px-10 sm:py-14">
          <div className="text-xs font-medium uppercase tracking-[0.14em] muted">
            Net loss
          </div>

          <div className="mt-3 flex flex-wrap items-baseline gap-x-4 gap-y-2">
            <h1 className="text-5xl font-semibold tracking-tight tabular-nums sm:text-6xl md:text-7xl">
              −$404
            </h1>
            <span
              className="text-sm font-medium"
              style={{ color: "var(--color-negative)" }}
            >
              page not found
            </span>
          </div>

          <p className="mt-3 max-w-xl text-sm muted">
            We searched every account, ledger, and shoebox under the desk.
            That page isn&apos;t on the books.
          </p>

          <div className="mt-7 flex flex-wrap gap-2">
            <Link className="btn btn-primary" href="/">
              Back to dashboard
            </Link>
            <Link className="btn" href="/entries">
              Manage entries
            </Link>
          </div>
        </div>
      </section>

      <section className="card p-6">
        <div className="text-[11px] font-medium uppercase tracking-wider muted">
          Transaction details
        </div>
        <ul className="mt-3 grid gap-2 text-sm">
          <Row label="Category" value="Mystery / Uncategorized" />
          <Row label="Merchant" value="The Internet" />
          <Row label="Amount" value="404 vibes" />
          <Row label="Recurring" value="Hopefully not" />
          <Row label="Notes" value="Probably a typo. We’ve all been there." />
        </ul>
      </section>

      <p className="text-xs muted">
        Fun fact: this 404 page costs you nothing because nothing in this app
        costs you anything. You&apos;re welcome.
      </p>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <li
      className="flex items-baseline justify-between gap-4 border-b py-2 last:border-b-0"
      style={{ borderColor: "var(--color-border)" }}
    >
      <span className="muted">{label}</span>
      <span className="text-right font-medium">{value}</span>
    </li>
  );
}
