import { CAD_MATS, partMass, partVolume, type RunResult } from "@pen-npi/core";
import { Fragment, useMemo, useState } from "react";
import { PenViewer, type ColourMode, type ViewMode } from "../PenViewer";
import { decTag, fmt, PageHead, Panel, Tag } from "../ui";

const KEY_LABELS: Record<string, string> = {
  od: "Barrel OD", bore: "Barrel bore", wall: "Barrel wall", nose: "Nose length", barrelLen: "Barrel length", tipOut: "Tip out",
  refillLen: "Refill length", refillDia: "Refill diameter", overall: "Overall (engine)", noseTipOd: "Nose tip OD", noseHole: "Tip hole",
  jointWall: "Nose joint wall", jointMin: "Joint wall minimum", gripOd: "Grip OD", buttonOd: "Button OD", buttonEnd: "Button end",
  springLen: "Spring length", springMeanDia: "Spring mean dia", springWire: "Spring wire", springPitch: "Spring pitch",
  clipLen: "Clip length", capOd: "Cap OD", capLen: "Cap length", capVent: "Cap vent dia", twistJoint: "Twist joint at",
};
const HIDE_KEYS = new Set(["jointZ0", "jointZ1", "jointFemale", "jointClearance", "springNoRoom"]);

export function Cad({ r, next, onDrawing }: { r: RunResult; next: () => void; onDrawing: () => void }) {
  const [mode, setMode] = useState<ViewMode>("assembly");
  const [colours, setColours] = useState<ColourMode>("material");
  const [hidden, setHidden] = useState<Set<string>>(new Set());
  const [tab, setTab] = useState<"drawing" | "parts" | "dims">("drawing");
  const parts = r.cad.parts;
  const toggle = (pn: string) => setHidden((h) => { const n = new Set(h); n.has(pn) ? n.delete(pn) : n.add(pn); return n; });
  const total = useMemo(() => parts.reduce((a, p) => a + partMass(p) * p.qty, 0), [parts]);

  if (!r.cad.ok) {
    return (
      <>
        <PageHead title="CAD model" sub={r.design ? `${r.design.id} · ${r.design.title}` : undefined} />
        <div className="banner"><b>No model generated.</b> {r.cad.reason}</div>
        <p className="hint">Templates cover click, twist, capped and magnetic pens with ballpoint, gel, hybrid and rollerball refills, plus capped fountain pens. DFA still runs on the engine part list.</p>
        <div className="actions"><button className="btn primary" onClick={next}>Continue to DFM</button></div>
      </>
    );
  }

  return (
    <>
      <PageHead title="CAD model" sub={`${r.design!.id} · ${r.design!.title} · template ${r.cad.template}`}>
        <button className="btn" onClick={onDrawing}>Save drawing</button>
        <button className="btn primary" onClick={next}>Run DFM</button>
      </PageHead>
      <div className={`banner ${r.cadSource.kind === "archive" ? "ok" : ""}`}>
        <b>{r.cadSource.kind === "archive" ? "From the archive. " : r.cadSource.kind === "derived" ? "Mixed. " : "New design. "}</b>{r.cadSource.text}
      </div>
      <section className="panel">
        <div className="panelhead">
          <h2>3D model</h2>
          <div className="actions">
            <div className="seg" role="group" aria-label="View">
              {(["assembly", "section", "exploded"] as ViewMode[]).map((m) => (
                <button key={m} className={mode === m ? "on" : ""} aria-pressed={mode === m} onClick={() => setMode(m)}>{m[0].toUpperCase() + m.slice(1)}</button>
              ))}
            </div>
            <div className="seg" role="group" aria-label="Colour">
              <button className={colours === "material" ? "on" : ""} aria-pressed={colours === "material"} onClick={() => setColours("material")}>Material</button>
              <button className={colours === "reuse" ? "on" : ""} aria-pressed={colours === "reuse"} onClick={() => setColours("reuse")}>Reuse</button>
            </div>
          </div>
        </div>
        <PenViewer parts={parts} hidden={hidden} mode={mode} colours={colours} />
        <div className="panelbody">
          <div className="chips" aria-label="Show or hide parts">
            {parts.map((p) => (
              <button key={p.partNo} className="chip" aria-pressed={!hidden.has(p.partNo)} onClick={() => toggle(p.partNo)}>
                <span className="sw" style={{ background: p.colour }} />{p.name}
              </button>
            ))}
          </div>
          <p className="hint" style={{ marginTop: 6 }}>Tap a part to hide it. Section cuts the pen through its axis; exploded spreads parts in assembly order.</p>
        </div>
      </section>
      <section className="panel">
        <div className="tabs" role="tablist" style={{ padding: "0 10px", marginBottom: 0 }}>
          {([["drawing", "Drawing sheet"], ["parts", "Parts and mass"], ["dims", "Key dimensions"]] as const).map(([k, l]) => (
            <button key={k} role="tab" aria-selected={tab === k} className={tab === k ? "on" : ""} onClick={() => setTab(k)}>{l}</button>
          ))}
        </div>
        {tab === "drawing" && <div className="sheetwrap" dangerouslySetInnerHTML={{ __html: (r.drawing ?? "").replace("<svg ", '<svg class="sheet" ') }} />}
        {tab === "parts" && (
          <div className="tw"><table>
            <thead><tr><th>Part no</th><th>Part</th><th>Material</th><th>Process</th><th>Reuse</th><th>Source</th><th className="num">Volume mm³</th><th className="num">Mass g</th></tr></thead>
            <tbody>{parts.map((p) => (
              <tr key={p.partNo}><td className="mono">{p.partNo}</td><td>{p.name}{p.qty > 1 && ` x${p.qty}`}</td><td>{CAD_MATS[p.mat].label}</td><td>{p.process}</td>
                <td>{decTag(p.decision)}</td><td className="source">{p.src ?? ""}</td>
                <td className="num">{fmt(partVolume(p), 1)}</td><td className="num">{fmt(partMass(p) * p.qty)}</td></tr>
            ))}</tbody>
            <tfoot><tr><td /><td><b>Total</b></td><td /><td /><td /><td /><td /><td className="num"><b>{fmt(total)}</b></td></tr></tfoot>
          </table></div>
        )}
        {tab === "dims" && (
          <div className="panelbody">
            <dl className="dl wide">
              {Object.entries(r.cad.key).filter(([k]) => !HIDE_KEYS.has(k)).map(([k, v]) => (
                <Fragment key={k}><dt>{KEY_LABELS[k] ?? k}</dt><dd>{fmt(v)} mm</dd></Fragment>
              ))}
            </dl>
            <p className="hint">Joint: {r.cad.key.jointFemale ? "female nose socket over a turned down barrel end" : "male nose spigot in the barrel bore"}. <Tag t="Mass is exact" kind="info" /> from the section profiles.</p>
          </div>
        )}
      </section>
    </>
  );
}
