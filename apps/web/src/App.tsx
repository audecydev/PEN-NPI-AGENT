import { ARCHIVE_ALL, checkRules, run, SCENARIOS_ALL, type ArchiveRecord, type PenSpec, type Verdict } from "@pen-npi/core";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { cap, nextId, watchReleases } from "./live";
import { Cad } from "./screens/Cad";
import { Dfa, Dfm } from "./screens/DfmDfa";
import { Docs, Release } from "./screens/DocsRelease";
import { Intake } from "./screens/Intake";
import { Match, Parts } from "./screens/Match";
import { DemoDecisions } from "./screens/DemoDecisions";

type View = "intake" | "match" | "parts" | "cad" | "dfm" | "dfa" | "docs" | "release" | "demo-decisions";
const STEPS: { view: View; code: string; label: string }[] = [
  { view: "intake", code: "G1", label: "Brief and spec" },
  { view: "match", code: "G2", label: "Archive search" },
  { view: "parts", code: "G3", label: "Part decisions" },
  { view: "cad", code: "G4", label: "CAD model" },
  { view: "dfm", code: "G5", label: "DFM" },
  { view: "dfa", code: "G6", label: "DFA" },
  { view: "docs", code: "G7", label: "FMEA and control plan" },
  { view: "release", code: "G8", label: "Release" },
];
const start = SCENARIOS_ALL.find((s) => s.id === "mix")!;

export function App() {
  const [view, setView] = useState<View>("intake");
  const [spec, setSpec] = useState<PenSpec>(start.spec);
  const [scenario, setScenario] = useState(start.id);
  const [brief, setBrief] = useState(start.brief);
  const [choice, setChoice] = useState<Verdict | undefined>();
  const [accepted, setAccepted] = useState(false);
  const [releases, setReleases] = useState<ArchiveRecord[]>([]);
  const [liveState, setLiveState] = useState<"live" | "stale" | "off" | "none">("none");
  const [db, setDb] = useState<any>(null);
  const [downloads, setDownloads] = useState<any>(null);
  const [sample, setSample] = useState<any>(null);
  const [released, setReleased] = useState<string | null>(null);
  const [events, setEvents] = useState<{ at: string; text: string; ai?: boolean }[]>([]);
  const [logOpen, setLogOpen] = useState(false);
  const t0 = useRef(Date.now());
  const main = useRef<HTMLElement>(null);

  const log = useCallback((text: string, ai?: boolean) => {
    const s = Math.round((Date.now() - t0.current) / 1000);
    setEvents((e) => [...e, { at: `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`, text, ai }]);
  }, []);

  useEffect(() => {
    let unsub: (() => void) | undefined;
    cap("db").then((d) => {
      if (!d) { setLiveState("none"); return; }
      setDb(d);
      unsub = watchReleases(d, setReleases, setLiveState);
    });
    cap("downloads").then(setDownloads);
    cap("sample").then((s) => s && setSample(() => s));
    return () => unsub?.();
  }, []);

  const rules = useMemo(() => checkRules(spec), [spec]);
  const newId = useMemo(() => nextId(releases), [releases]);
  const result = useMemo(() => run(spec, { extraRecords: releases, choice, newId, accepted }), [spec, releases, choice, newId, accepted]);

  const loadScenario = (id: string) => {
    const s = SCENARIOS_ALL.find((x) => x.id === id)!;
    setScenario(id); setSpec(s.spec); setBrief(s.brief); setChoice(undefined); setReleased(null);
    log(`Loaded test case: ${s.name}.`);
  };
  const editSpec = (s: PenSpec) => { setSpec(s); setChoice(undefined); setReleased(null); };

  const blocked = result.blocked;
  const enabled: Record<View, boolean> = {
    intake: true, match: !blocked, parts: !blocked && !!result.design, cad: !blocked && !!result.design,
    dfm: !blocked && !!result.design, dfa: !blocked && !!result.dfa, docs: !blocked && !!result.packet, release: !blocked && !!result.packet,
    "demo-decisions": true,
  };
  const go = (v: View) => {
    if (!enabled[v]) return;
    setView(v);
    if (v === "match") log(`Scored ${result.search.scanned.toLocaleString("en-IN")} records. Verdict ${result.choice}.`);
    if (v === "cad" && result.cad.ok) log(`Built ${result.cad.parts.length} parts with the ${result.cad.template} template.`);
    if (v === "dfm" && result.dfm) log(`DFM: ${result.dfm.counts.fail} failures, ${result.dfm.counts.warn} warnings, score ${result.dfm.score}.`);
    if (v === "dfa" && result.dfa) log(`DFA index ${Math.round(result.dfa.index * 100)} %, ${result.dfa.totalS} s.`);
    main.current?.scrollTo({ top: 0 });
  };
  const nextOf = (v: View) => () => go(STEPS[STEPS.findIndex((s) => s.view === v) + 1].view);
  const saveDrawing = async () => {
    if (!downloads || !result.drawing) { log("Saving files is not available in this view."); return; }
    try { await downloads.save({ filename: `${result.design!.id}-drawing.svg`, data: result.drawing }); log("Saved the drawing."); } catch { log("The drawing was not saved."); }
  };

  const blocks = rules.filter((r) => r.severity === "block").length;
  const warns = rules.filter((r) => r.severity === "warn").length;
  const done: Record<View, boolean> = {
    intake: !blocked, match: !blocked, parts: !!result.design, cad: result.cad.ok, dfm: !!result.dfm && result.dfm.counts.fail === 0,
    dfa: !!result.dfa, docs: !!result.packet, release: !!released, "demo-decisions": true,
  };

  return (
    <div className="app">
      <header className="appbar">
        <div className="brandmark"><b>AUDECY</b><span>AI</span></div>
        <div className="appname">NPI Workbench</div>
        <div className="ctx">
          <span>Project <b>{result.design?.id ?? "New request"}</b></span>
          <span>Customer <b>{spec.customer}</b></span>
          <span>Archive <b>{(ARCHIVE_ALL.length + releases.length).toLocaleString("en-IN")}</b></span>
        </div>
        <div className="sample">Fictional sample data</div>
      </header>
      <nav className="sidenav" aria-label="Workflow">
        <div className="navhead">NPI gates</div>
        {STEPS.map((s) => (
          <button key={s.view} className={`navitem ${view === s.view ? "on" : ""}`} disabled={!enabled[s.view]} aria-current={view === s.view ? "page" : undefined} onClick={() => go(s.view)}>
            <span className={`gate ${done[s.view] ? "done" : ""}`}>{s.code}</span>{s.label}
          </button>
        ))}
        <div className="navhead">Live archive</div>
        <div style={{ padding: "4px 14px", fontSize: 12.5, color: "var(--muted)" }}>
          {liveState === "live" ? `${releases.length} released here` : liveState === "stale" ? "Release history not reachable yet" : liveState === "off" ? "Release history unavailable" : "Release history needs the published page"}
        </div>
        <div className="navhead" style={{ marginTop: 12 }}>Architecture</div>
        <button
          className={`navitem ${view === "demo-decisions" ? "on" : ""}`}
          aria-current={view === "demo-decisions" ? "page" : undefined}
          onClick={() => go("demo-decisions")}
        >
          <span className="gate done" style={{ background: "#0284c7" }}>ADR</span>Demo Decisions
        </button>
      </nav>
      <main className="content" ref={main}>
        {view === "intake" && <Intake spec={spec} setSpec={editSpec} scenario={scenario} loadScenario={loadScenario} brief={brief} setBrief={setBrief} rules={rules} log={log} next={() => go("match")} />}
        {view === "match" && <Match r={result} setChoice={(c) => { setChoice(c); setReleased(null); }} choiceOverride={choice} liveCount={releases.length} next={nextOf("match")} />}
        {view === "parts" && result.design && <Parts r={result} next={nextOf("parts")} />}
        {view === "cad" && result.design && <Cad r={result} next={nextOf("cad")} onDrawing={saveDrawing} />}
        {view === "dfm" && result.design && <Dfm r={result} next={nextOf("dfm")} />}
        {view === "dfa" && result.dfa && <Dfa r={result} next={nextOf("dfa")} />}
        {view === "docs" && result.packet && <Docs r={result} next={nextOf("docs")} />}
        {view === "release" && result.packet && (
          <Release r={result} db={db} downloads={downloads} sample={sample} released={released === result.design?.id} onReleased={setReleased}
            accepted={accepted} setAccepted={setAccepted} log={log} />
        )}
        {view === "demo-decisions" && <DemoDecisions onBack={() => go("intake")} />}
      </main>
      <footer className="statusbar">
        <span className={blocks ? "bad" : ""}>Blocks <b>{blocks}</b></span>
        <span className={warns ? "warn" : ""}>Warnings <b>{warns}</b></span>
        {result.dfm && <span className={result.dfm.counts.fail ? "bad" : ""}>DFM <b>{result.dfm.score}</b></span>}
        {result.dfa && <span>DFA <b>{Math.round(result.dfa.index * 100)} %</b></span>}
        <span className="last">{events[events.length - 1]?.text ?? "Ready"}</span>
        <span className="right"><button className="logbtn" onClick={() => setLogOpen((o) => !o)}>Activity ({events.length})</button></span>
      </footer>
      {logOpen && (
        <div className="logpanel" role="log">
          <ol>{events.map((e, i) => <li key={i}><time>{e.at}</time><span className={e.ai ? "ai" : ""}>{e.text}</span></li>)}</ol>
        </div>
      )}
    </div>
  );
}
