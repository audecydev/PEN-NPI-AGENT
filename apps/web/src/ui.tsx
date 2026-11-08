import type { ReactNode } from "react";

export const Tag = ({ t, kind }: { t: string; kind?: string }) => (
  <span className={`tag t-${(kind ?? t).toLowerCase().replace(/\s+/g, "-")}`}>{t}</span>
);

export const PageHead = ({ title, sub, children }: { title: string; sub?: ReactNode; children?: ReactNode }) => (
  <div className="pagehead">
    <div>
      <h1>{title}</h1>
      {sub && <p>{sub}</p>}
    </div>
    <div className="actions">{children}</div>
  </div>
);

export const Panel = ({ title, right, children, pad = true }: { title?: ReactNode; right?: ReactNode; children: ReactNode; pad?: boolean }) => (
  <section className="panel">
    {(title || right) && (
      <div className="panelhead">
        <h2>{title}</h2>
        {right}
      </div>
    )}
    {pad ? <div className="panelbody">{children}</div> : children}
  </section>
);

export const Kpi = ({ v, l, tone }: { v: ReactNode; l: string; tone?: "amber" }) => (
  <div className={`kpi ${tone ?? ""}`}>
    <b>{v}</b>
    <span>{l}</span>
  </div>
);

export const Meter = ({ pct, tone }: { pct: number; tone: "ok" | "warn" | "bad" | "gold" }) => (
  <div className={`meter ${tone}`} role="img" aria-label={`${Math.round(pct)} percent`}>
    <i style={{ width: `${Math.max(0, Math.min(100, pct))}%` }} />
  </div>
);

export const decTag = (d: string) => <Tag t={d === "Added" ? "CAD template" : d} kind={d} />;

export const fmt = (n: number, d = 2) => n.toLocaleString("en-IN", { maximumFractionDigits: d, minimumFractionDigits: d });
export const inr = (n: number) => `Rs ${Math.round(n).toLocaleString("en-IN")}`;
