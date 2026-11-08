// End to end: brief or spec -> rules -> archive search -> part decisions -> CAD -> DFM -> DFA -> packet.
// The engine steps are the recovered engine, unchanged. CAD, DFM and DFA consume its outputs.

import {
  ARCHIVE_ALL, buildPacket, checkRules, decideParts, hasBlock, searchArchive, toArchiveRecord,
} from "./legacy/engine.js";
import type { ArchiveRecord, Design, Packet, PenSpec, Rule, SearchResult, Verdict } from "./legacy/engine.js";
import { buildCad, type CadModel } from "./cad/geometry.js";
import { drawingSvg } from "./cad/drawing.js";
import { partMass, partVolume } from "./cad/measure.js";
import { runDfm, type DfmResult } from "./dfm.js";
import { runDfa, type DfaResult } from "./dfa.js";

export interface RunOptions {
  extraRecords?: ArchiveRecord[];   // live releases saved from the workbench
  choice?: Verdict;                 // engineer override of the engine verdict
  newId?: string;
  accepted?: boolean;               // engineer accepted parts with no history
  date?: string;
}

export interface RunResult {
  spec: PenSpec;
  cadSpec: PenSpec;                 // spec the CAD was built from (the archive record's values on reuse)
  rules: Rule[];
  blocked: boolean;
  search: SearchResult;
  choice: Verdict;
  design: Design | null;
  cad: CadModel;
  cadSource: { kind: "archive" | "derived" | "new"; recordId: string | null; text: string };
  dfm: DfmResult | null;
  dfa: DfaResult | null;
  packet: Packet | null;
  drawing: string | null;
}

/** Spec values that reproduce an archived design, so a reused design's CAD is the archived geometry. */
export function specFromRecord(base: PenSpec, rec: ArchiveRecord): PenSpec {
  return {
    ...base, mech: rec.mech, system: rec.system, refill: rec.refill, tip: rec.tip, mat: rec.mat, finish: rec.finish,
    barrelLen: rec.barrelLen, od: rec.od, clip: rec.clip, grip: rec.grip as PenSpec["grip"], brand: rec.brand as PenSpec["brand"],
  };
}

export function run(spec: PenSpec, opts: RunOptions = {}): RunResult {
  const records = [...ARCHIVE_ALL, ...(opts.extraRecords ?? [])];
  const rules = checkRules(spec);
  const blocked = hasBlock(rules);
  const search = searchArchive(spec, records);
  const choice: Verdict = opts.choice ?? search.verdict;
  const top = search.matches[0]?.rec ?? null;
  const newId = opts.newId ?? `PEN-${new Date().getFullYear()}-NEW`;

  if (blocked) {
    const cad = buildCad(spec, null);
    return { spec, cadSpec: spec, rules, blocked, search, choice, design: null, cad: { ...cad, ok: false, parts: [], reason: "Design rules blocked this spec, so no CAD was built." },
      cadSource: { kind: "new", recordId: null, text: "Blocked before design." }, dfm: null, dfa: null, packet: null, drawing: null };
  }

  const design = decideParts(spec, search, choice, newId);
  const cadSpec = choice === "reuse" && top ? specFromRecord(spec, top) : spec;
  const cad = buildCad(cadSpec, design);
  const cadSource: RunResult["cadSource"] =
    choice === "reuse" && top ? { kind: "archive", recordId: top.id, text: `Geometry regenerated from archived design ${top.id} rev ${top.rev}.` }
    : choice === "mix" && top ? { kind: "derived", recordId: top.id, text: `New geometry; carried over parts keep their source records, closest design ${top.id}.` }
    : { kind: "new", recordId: null, text: "No archived design close enough; geometry designed from the spec." };

  const dfm = cad.ok ? runDfm(cadSpec, cad) : null;
  const dfa = runDfa(cadSpec, cad, design);
  const packet = buildPacket(spec, design, rules, opts.accepted ?? true);
  const drawing = cad.ok ? drawingSvg(cadSpec, cad, { id: design.id, title: design.title, date: opts.date ?? new Date().toISOString().slice(0, 10) }) : null;
  return { spec, cadSpec, rules, blocked, search, choice, design, cad, cadSource, dfm, dfa, packet, drawing };
}

/** Record saved to the live archive when a design is released. */
export function releaseRecord(r: RunResult): ArchiveRecord | null {
  return r.design ? toArchiveRecord(r.spec, r.design) : null;
}

/** Parts payload for the STEP exporter (packages/cad-export). */
export function exportPayload(r: RunResult) {
  return {
    id: r.design?.id ?? "PEN", title: r.design?.title ?? "", units: "mm",
    parts: r.cad.parts.map((p) => ({
      partNo: p.partNo, name: p.name, material: p.mat, colour: p.colour, qty: p.qty,
      profile: p.profile ?? null, boxes: p.boxes ?? [], volume_mm3: partVolume(p), mass_g: partMass(p),
    })),
  };
}
