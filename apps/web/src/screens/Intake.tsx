import { BRANDS, CUSTOMERS, FINISHES, GRIPS, MARKETS, MATERIALS, MECHS, parseBrief, REFILLS, SCENARIOS_ALL, SYSTEMS, tipLabel } from "@pen-npi/core";
import type { PenSpec, Rule } from "@pen-npi/core";
import { useState, type ChangeEvent } from "react";
import { PageHead, Panel, Tag } from "../ui";

type Props = {
  spec: PenSpec; setSpec: (s: PenSpec) => void; scenario: string; loadScenario: (id: string) => void;
  brief: string; setBrief: (b: string) => void; rules: Rule[]; log: (t: string) => void; next: () => void;
};

const groups = [...new Set(SCENARIOS_ALL.map((s) => s.group))];

export function Intake({ spec, setSpec, scenario, loadScenario, brief, setBrief, rules, log, next }: Props) {
  const [found, setFound] = useState<string[] | null>(null);
  const set = <K extends keyof PenSpec>(k: K, v: PenSpec[K]) => setSpec({ ...spec, [k]: v });
  const num = (k: keyof PenSpec) => (e: ChangeEvent<HTMLInputElement>) => set(k, Number(e.target.value) as never);
  const err = (f: string) => rules.some((r) => r.severity === "block" && r.field === f);
  const sc = SCENARIOS_ALL.find((s) => s.id === scenario);
  const blocks = rules.filter((r) => r.severity === "block");

  const readBrief = () => {
    const { values, found } = parseBrief(brief);
    setSpec({ ...spec, ...values });
    setFound(found);
    log(`Read the brief: ${found.length} fields found.`);
  };

  const sel = (k: keyof PenSpec, opts: [string, string][]) => (
    <label className={`f ${err(k) ? "err" : ""}`}>{labels[k] ?? k}
      <select id={`f-${k}`} value={String(spec[k])} onChange={(e) => set(k, e.target.value as never)}>
        {opts.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
      </select>
    </label>
  );
  const inp = (k: keyof PenSpec, step = 1) => (
    <label className={`f ${err(k) ? "err" : ""}`}>{labels[k] ?? k}
      <input id={`f-${k}`} type="number" step={step} value={String(spec[k])} onChange={num(k)} />
    </label>
  );
  const chk = (k: keyof PenSpec) => (
    <label className="f check" style={{ alignSelf: "end" }}>
      <span className="check"><input id={`f-${k}`} type="checkbox" checked={Boolean(spec[k])} onChange={(e) => set(k, e.target.checked as never)} />{labels[k]}</span>
    </label>
  );

  return (
    <>
      <PageHead title="Customer brief" sub="Load a test case or paste a brief. The engine reads it into the specification below; every field stays editable.">
        <button className="btn primary" onClick={next} disabled={blocks.length > 0}>Search the archive</button>
      </PageHead>
      <Panel title="Test case">
        <div className="caserow">
          <label className="f">Edge case
            <select id="scenario" value={scenario} onChange={(e) => loadScenario(e.target.value)}>
              {groups.map((g) => (
                <optgroup key={g} label={g}>
                  {SCENARIOS_ALL.filter((s) => s.group === g).map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </optgroup>
              ))}
            </select>
          </label>
          <p className="casenote">{sc?.shows}</p>
        </div>
      </Panel>
      <div className="split">
        <div className="stack">
          <Panel title="Brief" right={<button className="btn" onClick={readBrief}>Read brief</button>}>
            <textarea id="brief" className="brief" value={brief} onChange={(e) => setBrief(e.target.value)} aria-label="Customer brief" />
            {found && <p className="hint">Filled from the brief: {found.length ? found.join(", ") : "nothing recognised"}.</p>}
          </Panel>
          <Panel title="Specification">
            <div className="form">
              {sel("customer", CUSTOMERS.map((c) => [c, c]))}
              {sel("mech", Object.entries(MECHS).map(([k, v]) => [k, v.label]))}
              {sel("system", Object.entries(SYSTEMS).map(([k, v]) => [k, v.label]))}
              {sel("refill", Object.entries(REFILLS).map(([k, v]) => [k, v.label]))}
              {sel("tip", SYSTEMS[spec.system].tips.map((t) => [t, tipLabel(t)]))}
              {sel("mat", Object.entries(MATERIALS).map(([k, v]) => [k, v.label]))}
              {sel("finish", Object.entries(FINISHES))}
              {inp("barrelLen")}
              {inp("od", 0.1)}
              {inp("write", 100)}
              {inp("click", 500)}
              {inp("drop", 0.1)}
              {inp("tempMax")}
              {inp("tempMin")}
              {sel("brand", Object.entries(BRANDS))}
              {inp("brandLen")}
              {sel("grip", Object.entries(GRIPS))}
              {sel("market", Object.entries(MARKETS))}
              {inp("vol", 1000)}
              {inp("cost")}
              {chk("clip")}
              {chk("child")}
              {chk("upsideDown")}
            </div>
            <p className="hint">Outer diameter 0 lets the engine size it from the refill and the drop rule.</p>
          </Panel>
        </div>
        <div className="stack sticky">
          <Panel title="Rule check" right={<span className="count">{rules.length} findings</span>}>
            {rules.length === 0 ? <p className="hint">Every rule passes for this specification.</p> : (
              <ul className="issues">
                {rules.map((r) => (
                  <li key={r.code} className={`issue ${r.severity}`}>
                    <b className="mono">{r.code}</b> <Tag t={r.severity} />
                    <p>{r.message}</p>
                    {r.fix && <p className="fix">Fix: {r.fix}</p>}
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </div>
      </div>
    </>
  );
}

const labels: Partial<Record<keyof PenSpec, string>> = {
  customer: "Customer", mech: "Mechanism", system: "Ink system", refill: "Refill format", tip: "Tip", mat: "Barrel material",
  finish: "Finish", barrelLen: "Barrel length mm", od: "Outer diameter mm", write: "Writing length m", click: "Actuation life",
  drop: "Drop height m", tempMax: "Max temp C", tempMin: "Min temp C", brand: "Branding", brandLen: "Logo length mm",
  grip: "Grip", market: "Market", vol: "Volume a month", cost: "Target cost Rs", clip: "Pocket clip", child: "Children's product",
  upsideDown: "Writes upside down",
};
