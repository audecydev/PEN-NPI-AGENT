import type { RunResult, Verdict } from "@pen-npi/core";
import { Fragment, useState } from "react";
import { decTag, Kpi, PageHead, Panel, Tag } from "../ui";

const VERDICT_TEXT: Record<Verdict, string> = {
  reuse: "Reuse the archived design as it is",
  mix: "Mix: carry over proven parts, design the rest",
  new: "New design: only bought out parts carry over",
};

export function Match({ r, setChoice, choiceOverride, liveCount, next }: {
  r: RunResult; setChoice: (c: Verdict | undefined) => void; choiceOverride?: Verdict; liveCount: number; next: () => void;
}) {
  const [open, setOpen] = useState<string | null>(r.search.matches[0]?.rec.id ?? null);
  const top = r.search.matches.slice(0, 8);
  return (
    <>
      <PageHead title="Archive search" sub={`Every released design is scored against the specification. ${r.search.scanned.toLocaleString("en-IN")} records scanned, ${liveCount} of them released from this workbench.`}>
        <button className="btn primary" onClick={next}>Decide parts</button>
      </PageHead>
      <div className="kpis">
        <Kpi v={top[0] ? `${Math.round(top[0].score * 100)} %` : "None"} l="Best match" />
        <Kpi v={top[0]?.gaps.length ?? 0} l="Gaps in best match" tone={top[0]?.gaps.length ? "amber" : undefined} />
        <Kpi v={r.search.excluded.length} l="Strong matches excluded" />
        <Kpi v={r.search.lessons.length} l="Failure lessons applied" />
        <div className="kpi wide"><b>{VERDICT_TEXT[r.choice]}</b><span>{choiceOverride ? "Engineer override" : "Engine verdict"}</span></div>
      </div>
      <Panel title="Decision" right={<span className="hint">Engine says {r.search.verdict}</span>}>
        <div className="seg" role="group" aria-label="Design decision">
          {(["reuse", "mix", "new"] as Verdict[]).map((v) => (
            <button key={v} className={r.choice === v ? "on" : ""} aria-pressed={r.choice === v}
              disabled={v === "reuse" && !top[0]} onClick={() => setChoice(v === r.search.verdict ? undefined : v)}>
              {v === "reuse" ? "Reuse" : v === "mix" ? "Mix" : "New"}
            </button>
          ))}
        </div>
        <p className="hint" style={{ marginTop: 8 }}>
          {r.choice === "reuse" && top[0] ? `The CAD is regenerated from ${top[0].rec.id}, so the model and drawing are the archived design.` :
            r.choice === "mix" ? "Carried over parts keep the archive record they come from; the rest is designed to the spec." :
              "The geometry is designed from the specification by the parametric templates."}
        </p>
      </Panel>
      <Panel title="Ranked matches" pad={false}>
        <div className="tw">
          <table>
            <thead><tr><th>Record</th><th>Title</th><th>Year</th><th>Plant</th><th className="num">Score</th><th>Gaps</th></tr></thead>
            <tbody>
              {top.map((m) => (
                <Fragment key={m.rec.id}>
                  <tr className={`click ${open === m.rec.id ? "sel" : ""}`} onClick={() => setOpen(open === m.rec.id ? null : m.rec.id)}>
                    <td className="mono">{m.rec.id}{m.rec.provisional && <> <Tag t="Live" kind="info" /></>}</td>
                    <td>{m.rec.title}</td><td>{m.rec.year}</td><td>{m.rec.plant}</td>
                    <td className="num"><span className="scorebar"><i style={{ width: `${m.score * 100}%` }} /></span>{Math.round(m.score * 100)}</td>
                    <td>{m.gaps.length ? m.gaps.map((g) => g.label).join(", ") : <Tag t="met" />}</td>
                  </tr>
                  {open === m.rec.id && (
                    <tr className="detail">
                      <td colSpan={6}>
                        <table>
                          <thead><tr><th>Requirement</th><th>Asked</th><th>Archive</th><th className="num">Similarity</th></tr></thead>
                          <tbody>{m.rows.map((row) => (
                            <tr key={row.key}><td>{row.label}</td><td>{row.req}</td><td>{row.val}</td>
                              <td className="num">{row.ok ? <Tag t="met" /> : `${Math.round(row.sim * 100)} %`}</td></tr>
                          ))}</tbody>
                        </table>
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
      <div className="two">
        <Panel title="Excluded although close">
          {r.search.excluded.length ? (
            <ul className="issues">{r.search.excluded.map((x) => (
              <li key={x.rec.id} className="issue warn"><b className="mono">{x.rec.id}</b> {Math.round(x.score * 100)} %<p>{x.reason}</p></li>
            ))}</ul>
          ) : <p className="hint">No strong match was excluded.</p>}
        </Panel>
        <Panel title="Lessons from past failures">
          {r.search.lessons.length ? (
            <ul className="issues">{r.search.lessons.map((l) => (
              <li key={l.mode} className="issue info"><b className="mono">{l.recId}</b> {l.year}<p>{l.text}</p><p className="fix">{l.effect}</p></li>
            ))}</ul>
          ) : <p className="hint">No failure in the archive applies to this specification.</p>}
        </Panel>
      </div>
    </>
  );
}

export function Parts({ r, next }: { r: RunResult; next: () => void }) {
  const d = r.design!;
  const m = d.metrics;
  return (
    <>
      <PageHead title="Part decisions" sub={`${d.id} · ${d.title}`}><button className="btn primary" onClick={next}>Open the CAD</button></PageHead>
      <div className="kpis">
        <Kpi v={`${m.reusePct} %`} l="Parts reused or modified" />
        <Kpi v={`${m.toolsKept} of ${m.toolsAll}`} l="Tools kept" />
        <Kpi v={`Rs ${m.capex.toLocaleString("en-IN")}`} l="New tooling capex" />
        <Kpi v={`${m.weeks} weeks`} l="Estimated NPI time" />
        <Kpi v={`Rs ${m.unit}`} l="Unit cost estimate" tone={r.spec.cost && m.unit > r.spec.cost ? "amber" : undefined} />
      </div>
      <Panel title="Bill of materials with reuse source" pad={false}>
        <div className="tw"><table>
          <thead><tr><th className="num">Item</th><th>Part</th><th>Decision</th><th>Source</th><th>Reason</th><th>Tool</th></tr></thead>
          <tbody>{d.parts.map((p) => (
            <tr key={p.key}>
              <td className="num">{p.no}</td><td>{p.name}</td><td>{decTag(p.dec)}</td>
              <td className="source">{p.src ?? "None"}</td>
              <td>{p.why}{p.note && <div className="rownote">{p.note}</div>}</td>
              <td>{p.tool ? (p.toolNew ? <Tag t="New tool" kind="new" /> : <Tag t="Kept" kind="pass" />) : ""}</td>
            </tr>
          ))}</tbody>
        </table></div>
      </Panel>
    </>
  );
}
