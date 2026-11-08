import { exportPayload, packetCsv, releaseRecord, type RunResult } from "@pen-npi/core";
import { useState } from "react";
import { PageHead, Panel, Tag } from "../ui";

export function Docs({ r, next }: { r: RunResult; next: () => void }) {
  const [tab, setTab] = useState<"dfmea" | "pfmea" | "plan" | "sop">("dfmea");
  const p = r.packet!;
  return (
    <>
      <PageHead title="Engineering documents" sub="DFMEA, PFMEA, control plan and SOPs from the engine, built in that order.">
        <button className="btn primary" onClick={next}>Release</button>
      </PageHead>
      <section className="panel">
        <div className="tabs" role="tablist" style={{ padding: "0 10px", marginBottom: 0 }}>
          {([["dfmea", "DFMEA"], ["pfmea", "PFMEA"], ["plan", "Control plan"], ["sop", "Process and SOPs"]] as const).map(([k, l]) => (
            <button key={k} role="tab" aria-selected={tab === k} className={tab === k ? "on" : ""} onClick={() => setTab(k)}>{l}</button>
          ))}
        </div>
        <div className="tw">
          {tab === "dfmea" && (
            <table><thead><tr><th>Item</th><th>Failure mode</th><th>Effect</th><th className="num">S</th><th>Cause</th><th className="num">O</th><th>Detection</th><th className="num">D</th><th>Priority</th><th>Action</th></tr></thead>
              <tbody>{p.dfmea.map((x: any, i: number) => (
                <tr key={i}><td>{x.item}</td><td>{x.mode}</td><td>{x.effect}</td><td className="num">{x.S}</td><td>{x.cause}</td><td className="num">{x.O}</td><td>{x.detection}</td><td className="num">{x.D}</td><td><Tag t={x.priority} /></td><td>{x.action}</td></tr>
              ))}</tbody></table>
          )}
          {tab === "pfmea" && (
            <table><thead><tr><th className="num">Op</th><th>Step</th><th>Failure mode</th><th className="num">S</th><th>Cause</th><th className="num">O</th><th>Prevention</th><th>Detection</th><th className="num">D</th><th>Priority</th></tr></thead>
              <tbody>{p.process.map((x: any, i: number) => (
                <tr key={i}><td className="num">{x.op}</td><td>{x.step}</td><td>{x.mode}</td><td className="num">{x.S}</td><td>{x.cause}</td><td className="num">{x.O}</td><td>{x.prevention}</td><td>{x.detection}</td><td className="num">{x.D}</td><td><Tag t={x.priority} /></td></tr>
              ))}</tbody></table>
          )}
          {tab === "plan" && (
            <table><thead><tr><th className="num">Op</th><th>Characteristic</th><th>Type</th><th>Specification</th><th>Evaluation</th><th>Sample</th><th>Frequency</th><th>Control</th><th>Reaction</th></tr></thead>
              <tbody>{p.process.map((x: any, i: number) => (
                <tr key={i}><td className="num">{x.op}</td><td>{x.characteristic}</td><td>{x.type}</td><td>{x.spec}</td><td>{x.evaluation}</td><td>{x.sample}</td><td>{x.frequency}</td><td>{x.control}</td><td>{x.reaction}</td></tr>
              ))}</tbody></table>
          )}
          {tab === "sop" && (
            <table><thead><tr><th className="num">Op</th><th>Operation</th><th>Equipment</th><th>Steps</th></tr></thead>
              <tbody>{p.ops.map((x: any) => (
                <tr key={x.op}><td className="num">{x.op}</td><td>{x.name} {x.changed && <Tag t="Changed" kind="modify" />}</td><td>{x.equipment}</td><td><ol className="sop">{x.sop.map((s: string) => <li key={s}>{s}</li>)}</ol></td></tr>
              ))}</tbody></table>
          )}
        </div>
      </section>
    </>
  );
}

function csv(r: RunResult) {
  const q = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const rows: string[] = [packetCsv(r.design!, r.packet!)];
  if (r.dfm) {
    rows.push(q("DFM findings"), ["Id", "Part", "Level", "Check", "Value", "Message", "Fix"].map(q).join(","));
    for (const f of r.dfm.findings) rows.push([f.id, f.part, f.level, f.check, f.value, f.message, f.fix].map(q).join(","));
    rows.push("");
  }
  if (r.dfa) {
    rows.push(q("DFA"), ["Step", "Part", "Moves", "Other material", "Separate", "Essential", "Handle s", "Insert s", "Total s"].map(q).join(","));
    for (const x of r.dfa.rows) rows.push([x.seq, x.name, x.moves, x.otherMaterial, x.separate, x.essential, x.handlingS, x.insertionS, x.totalS].map(q).join(","));
    rows.push(q(`DFA index ${Math.round(r.dfa.index * 100)} %, ${r.dfa.nMin} of ${r.dfa.nParts} parts essential, ${r.dfa.totalS} s`));
  }
  return rows.join("\n");
}

export function Release({ r, db, downloads, sample, released, onReleased, accepted, setAccepted, log }: {
  r: RunResult; db: any; downloads: any; sample: any; released: boolean; onReleased: (id: string) => void;
  accepted: boolean; setAccepted: (b: boolean) => void; log: (t: string, ai?: boolean) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [review, setReview] = useState<string>("");
  const [reviewing, setReviewing] = useState(false);
  const p = r.packet!;
  const dfmFails = r.dfm?.counts.fail ?? 0;
  const ruleFails = p.rules.filter((x) => x.result === "fail").length;
  const ready = ruleFails === 0 && dfmFails === 0 && !r.blocked;
  const id = r.design!.id;

  const save = async (filename: string, data: string) => {
    if (!downloads) return;
    try { await downloads.save({ filename, data }); log(`Saved ${filename}.`); } catch { log(`${filename} was not saved.`); }
  };

  const release = async () => {
    if (!db || !ready) return;
    setBusy(true); setMsg(null);
    try {
      const rec = releaseRecord(r)!;
      await db.collection("releases").doc(rec.id).set(rec as unknown as Record<string, unknown>);
      setMsg(`${rec.id} released. It is now in the archive and the next search scores it.`);
      log(`Released ${rec.id} to the archive.`);
      onReleased(rec.id);
    } catch (e: any) {
      setMsg(e?.code === "not_granted" || e?.code === "permission_denied" ? "You can view this workbench but not release from it. Ask the owner for edit access." : "The release could not be saved. Try again in a moment.");
    } finally { setBusy(false); }
  };

  const askClaude = async () => {
    if (!sample) return;
    setReviewing(true); setReview("");
    const brief = {
      spec: r.cadSpec, choice: r.choice, design: r.design!.title, parts: r.design!.parts.map((x) => `${x.name}: ${x.dec}${x.src ? " from " + x.src : ""}`),
      dfm: r.dfm ? { score: r.dfm.score, fails: r.dfm.findings.filter((f) => f.level === "fail").map((f) => `${f.part}: ${f.check} ${f.value}. ${f.message}`), warns: r.dfm.findings.filter((f) => f.level === "warn").map((f) => `${f.part}: ${f.check} ${f.value}`) } : null,
      dfa: r.dfa ? { index: r.dfa.index, nMin: r.dfa.nMin, nParts: r.dfa.nParts, timeS: r.dfa.totalS, suggestions: r.dfa.suggestions.map((s) => `${s.part}: ${s.text}`) } : null,
      key: r.cad.key,
    };
    try {
      const out = await sample(
        `You are a senior design for manufacture engineer reviewing a writing instrument before release at a contract manufacturer in India. ` +
        `Using only the data below, give: 1) the three changes that most reduce cost or risk, each with the number it rests on; 2) anything the automated checks may have missed; 3) a one line release recommendation. ` +
        `Plain sentences, no markdown headings, under 220 words.\n\n${JSON.stringify(brief)}`,
        { onText: ({ text }: { text: string }) => setReview(text), modelTier: "default" },
      );
      setReview(out.text);
      log("Claude reviewed the design.", true);
    } catch (e: any) {
      setReview(e?.code === "rate_limited" ? "Claude is busy. Try the review again shortly." : "The review could not run.");
    } finally { setReviewing(false); }
  };

  return (
    <>
      <PageHead title="Release" sub={`${id} · ${r.design!.title}`}>
        <button className="btn primary" disabled={!ready || !db || busy || released} onClick={release}>{released ? "Released" : busy ? "Releasing" : "Release to the archive"}</button>
      </PageHead>
      {msg && <div className={`banner ${released ? "ok" : ""}`}>{msg}</div>}
      {!db && <p className="hint">Release history is not available in this view, so releasing is turned off. Everything else works.</p>}
      <div className="two">
        <Panel title="Release gates">
          <ul className="issues">
            {p.rules.map((x) => (
              <li key={x.label} className={`issue ${x.result === "fail" ? "block" : x.result === "warn" ? "warn" : ""}`}><Tag t={x.result} /> {x.label}</li>
            ))}
            <li className={`issue ${dfmFails ? "block" : ""}`}><Tag t={dfmFails ? "fail" : "pass"} /> {dfmFails ? `${dfmFails} DFM failure${dfmFails > 1 ? "s" : ""} open` : r.dfm ? `DFM: no failures, score ${r.dfm.score}` : "DFM not run (no CAD template)"}</li>
            {r.dfa && <li className="issue"><Tag t="info" /> DFA index {Math.round(r.dfa.index * 100)} %, {r.dfa.nMin} of {r.dfa.nParts} parts essential</li>}
          </ul>
          <label className="check" style={{ marginTop: 10 }}>
            <input id="accept" type="checkbox" checked={accepted} onChange={(e) => setAccepted(e.target.checked)} />
            I accept full validation for parts with no history in the archive.
          </label>
        </Panel>
        <Panel title="Files">
          <div className="actions">
            <button className="btn" disabled={!downloads || !r.drawing} onClick={() => save(`${id}-drawing.svg`, r.drawing!)}>Drawing (SVG)</button>
            <button className="btn" disabled={!downloads} onClick={() => save(`${id}-packet.csv`, csv(r))}>BOM, FMEA, DFM, DFA (CSV)</button>
            <button className="btn" disabled={!downloads || !r.cad.ok} onClick={() => save(`${id}-cad.json`, JSON.stringify(exportPayload(r), null, 1))}>CAD for STEP export (JSON)</button>
          </div>
          <p className="hint">STEP and glTF come from the API (POST /api/cad/export), which runs the same geometry through OpenCascade. The JSON here is its input.</p>
          {!downloads && <p className="hint">Saving files is not available in this view.</p>}
        </Panel>
      </div>
      <Panel title="Design review by Claude" right={<button className="btn" disabled={!sample || reviewing} onClick={askClaude}>{reviewing ? "Reviewing" : "Ask Claude"}</button>}>
        {review ? <div className="reviewtext">{review}</div> : <p className="hint">{sample ? "Optional. Claude reads the DFM and DFA results and names the changes worth making. The checks above do not depend on it." : "Claude review is not available in this view."}</p>}
      </Panel>
    </>
  );
}
