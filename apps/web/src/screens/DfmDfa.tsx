import type { DfmFinding, RunResult } from "@pen-npi/core";
import { useState } from "react";
import { inr, Kpi, Meter, PageHead, Panel, Tag } from "../ui";

const LEVELS = ["fail", "warn", "info", "pass"] as const;

export function Dfm({ r, next }: { r: RunResult; next: () => void }) {
  const [show, setShow] = useState<Set<string>>(new Set(["fail", "warn", "info"]));
  const [part, setPart] = useState("all");
  if (!r.dfm) {
    return (
      <>
        <PageHead title="Design for manufacture"><button className="btn primary" onClick={next}>Run DFA</button></PageHead>
        <div className="banner">DFM needs geometry. {r.cad.reason}</div>
      </>
    );
  }
  const d = r.dfm;
  const list = d.findings.filter((f) => show.has(f.level) && (part === "all" || f.partNo === part));
  const toolTotal = d.tooling.reduce((a, t) => a + t.inr, 0);
  const tone = d.counts.fail ? "bad" : d.counts.warn > 4 ? "warn" : "ok";
  return (
    <>
      <PageHead title="Design for manufacture" sub="Every check reads the generated geometry and the process each part is routed to.">
        <button className="btn primary" onClick={next}>Run DFA</button>
      </PageHead>
      <div className="kpis">
        <div className="kpi"><b className="scorebig">{d.score}</b><Meter pct={d.score} tone={tone} /><span>DFM score, share of checks passed</span></div>
        <Kpi v={d.counts.fail} l="Failures to fix before release" tone={d.counts.fail ? "amber" : undefined} />
        <Kpi v={d.counts.warn} l="Warnings" />
        <Kpi v={d.counts.pass} l="Checks passed" />
        <Kpi v={inr(toolTotal)} l="Tooling estimate" />
      </div>
      <Panel title="Parts by process" pad={false}>
        <div className="tw"><table>
          <thead><tr><th /><th>Part</th><th>Material</th><th>Process</th><th className="num">Wall min</th><th className="num">Wall max</th><th className="num">Mass g</th><th className="num">Material Rs</th><th>Capacity</th></tr></thead>
          <tbody>{d.parts.map((p) => (
            <tr key={p.partNo} className="click" onClick={() => setPart(part === p.partNo ? "all" : p.partNo)}>
              <td><span className={`lvl ${p.level}`} aria-label={p.level} /></td>
              <td>{p.name} <span className="mono">{p.partNo}</span></td><td>{p.material}</td><td>{p.process}</td>
              <td className="num">{p.wallMin ? p.wallMin.toFixed(2) : ""}</td><td className="num">{p.wallMax ? p.wallMax.toFixed(2) : ""}</td>
              <td className="num">{p.mass.toFixed(2)}</td><td className="num">{p.materialCost.toFixed(2)}</td><td>{p.capacityNote}</td>
            </tr>
          ))}</tbody>
        </table></div>
      </Panel>
      <div className="split">
        <Panel title={`Findings${part !== "all" ? ` for ${part}` : ""}`} right={
          <div className="chips">
            {LEVELS.map((l) => (
              <button key={l} className="chip" aria-pressed={show.has(l)} onClick={() => setShow((s) => { const n = new Set(s); n.has(l) ? n.delete(l) : n.add(l); return n; })}>
                <span className={`lvl ${l}`} />{l} {d.counts[l]}
              </button>
            ))}
            {part !== "all" && <button className="chip" aria-pressed onClick={() => setPart("all")}>All parts</button>}
          </div>}>
          {list.length ? <ul className="findings">{list.map((f) => <Finding key={f.id} f={f} />)}</ul> : <p className="hint">Nothing at the selected levels.</p>}
        </Panel>
        <div className="stack">
          <Panel title="Tooling">
            <table><tbody>{d.tooling.map((t) => <tr key={t.item}><td>{t.item}</td><td className="num">{inr(t.inr)}</td></tr>)}
              <tr><td><b>Total</b></td><td className="num"><b>{inr(toolTotal)}</b></td></tr></tbody></table>
            <p className="hint">Planning estimates for tool room quotes; parts carried over with a kept tool need none.</p>
          </Panel>
        </div>
      </div>
    </>
  );
}

function Finding({ f }: { f: DfmFinding }) {
  return (
    <li className={`finding ${f.level}`}>
      <span><b>{f.check}</b> · {f.part} <span className="mono">{f.id}</span></span>
      <span className="val">{f.value}</span>
      <p>{f.message}</p>
      {f.fix && <p className="fix">Fix: {f.fix}</p>}
    </li>
  );
}

const yn = (b: boolean) => <span className={`yesno ${b ? "y" : ""}`}>{b ? "Yes" : "No"}</span>;

export function Dfa({ r, next }: { r: RunResult; next: () => void }) {
  const a = r.dfa!;
  const pct = Math.round(a.index * 100), rpct = Math.round(a.redesign.index * 100);
  return (
    <>
      <PageHead title="Design for assembly" sub="Boothroyd Dewhurst manual assembly: three questions decide which parts must exist; handling and insertion times give the assembly time.">
        <button className="btn primary" onClick={next}>Documents</button>
      </PageHead>
      <div className="kpis">
        <div className="kpi"><b className="scorebig">{pct} %</b><Meter pct={pct} tone={pct >= 50 ? "ok" : pct >= 30 ? "warn" : "bad"} /><span>DFA index, 3 x Nmin / time</span></div>
        <Kpi v={`${a.nMin} of ${a.nParts}`} l="Theoretical minimum parts" />
        <Kpi v={`${a.totalS.toFixed(1)} s`} l="Manual assembly time" />
        <Kpi v={`Rs ${a.labourInr.toFixed(2)}`} l="Assembly labour per pen" />
        <Kpi v={`${rpct} %`} l={`Index after the ${a.suggestions.length} suggestions`} />
      </div>
      <Panel title="Part by part" pad={false}>
        <div className="tw"><table>
          <thead><tr><th className="num">Step</th><th>Part</th><th>Moves</th><th>Other material</th><th>Separate for service</th><th>Must exist</th><th className="num">α+β</th><th className="num">Handle s</th><th>Joining</th><th className="num">Insert s</th><th className="num">Total s</th></tr></thead>
          <tbody>{a.rows.map((x) => (
            <tr key={x.partNo}>
              <td className="num">{x.seq}</td><td>{x.name}{x.qty > 1 && ` x${x.qty}`}<div className="note">{x.note}</div></td>
              <td>{yn(x.moves)}</td><td>{yn(x.otherMaterial)}</td><td>{yn(x.separate)}</td>
              <td>{x.essential ? <Tag t="Essential" kind="pass" /> : <Tag t="Candidate" kind="warn" />}</td>
              <td className="num">{x.alphaBeta}</td><td className="num">{x.handlingS.toFixed(2)}</td><td>{x.insertion}</td>
              <td className="num">{x.insertionS.toFixed(1)}</td><td className="num">{x.totalS.toFixed(1)}</td>
            </tr>
          ))}</tbody>
        </table></div>
      </Panel>
      <div className="two">
        <Panel title="Redesign suggestions">
          {a.suggestions.length ? (
            <ul className="issues">{a.suggestions.map((s) => (
              <li key={s.part} className="issue info"><b>{s.part}</b> <span className="mono">saves {s.savesS.toFixed(1)} s</span><p>{s.text}</p></li>
            ))}</ul>
          ) : <p className="hint">Every part is essential under the three questions.</p>}
          <p className="hint">With all suggestions: {a.redesign.nParts} parts, {a.redesign.totalS.toFixed(1)} s, index {rpct} %.</p>
        </Panel>
        <Panel title="Assembly sequence">
          <ol className="seq">{a.rows.filter((x) => x.insertionS > 0).map((x) => (
            <li key={x.partNo}><span>{x.name}</span><span className="note">{x.insertion}</span></li>
          ))}</ol>
          <p className="hint">The exploded CAD view follows this order.</p>
        </Panel>
      </div>
    </>
  );
}
