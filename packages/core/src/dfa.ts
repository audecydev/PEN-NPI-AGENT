// Design for assembly, Boothroyd Dewhurst manual assembly method.
// Each part gets the three minimum part questions, a handling time from its size and
// symmetry, and an insertion time from how it joins. DFA index = 3 x Nmin / total time.

import type { Design, PenSpec } from "./legacy/engine.js";
import { CAD_MATS } from "./cad/catalog.js";
import type { CadModel } from "./cad/geometry.js";
import { section } from "./cad/measure.js";

export interface DfaRow {
  seq: number; key: string; partNo: string; name: string; qty: number;
  moves: boolean; otherMaterial: boolean; separate: boolean; essential: boolean;
  alphaBeta: number; handlingS: number; insertion: string; insertionS: number; totalS: number;
  note: string; suggestion?: string;
}
export interface DfaResult {
  rows: DfaRow[]; nParts: number; nMin: number; totalS: number; index: number; labourInr: number;
  suggestions: { part: string; text: string; savesS: number }[];
  redesign: { nParts: number; totalS: number; index: number };
}

const LABOUR_INR_PER_HOUR = 300;
const r1 = (x: number) => Math.round(x * 10) / 10;

/** Handling time (s) from Boothroyd Dewhurst chart 1 codes 00 to 03 and the small part rows. */
function handling(alphaBeta: number, size: number, tangles: boolean, thin: boolean): number {
  let t = alphaBeta < 360 ? 1.13 : alphaBeta < 540 ? 1.5 : alphaBeta < 720 ? 1.8 : 1.95;
  if (size < 6) t += 0.7;            // small parts need tweezers or care
  else if (size < 15) t += 0.3;
  if (thin) t += 0.4;
  if (tangles) t += 1.6;             // springs nest and tangle
  return r1(t);
}

const JOINS: Record<string, [string, number]> = {
  place: ["Placed in fixture", 1.5],
  slide: ["Slides in, self aligning", 1.5],
  hold: ["Needs holding while the next part goes on", 5.5],
  press: ["Press fit, aligned", 2.5],
  snap: ["Snap fit", 2.0],
  screw: ["Screw thread, several turns", 6.0],
  bond: ["Adhesive bond and cure fixture", 8.0],
  over: ["Moulded on, no assembly step", 0],
  clip: ["Pushed over a ring, oriented", 4.0],
};

export function runDfa(spec: PenSpec, cad: CadModel, design: Design | null): DfaResult {
  const metal = CAD_MATS[spec.mat]?.metal ?? false;
  const refillable = spec.mech !== "capped" || metal || spec.vol < 100000;
  const rows: DfaRow[] = [];

  type Rule = { seq: number; moves: boolean; other: boolean; sep: boolean; join: keyof typeof JOINS; note: string; sug?: string };
  const rule = (key: string): Rule => {
    switch (key) {
      case "barrel": return { seq: 1, moves: false, other: false, sep: true, join: "place", note: "Base part; everything assembles into it." };
      case "grip": return { seq: 0, moves: false, other: true, sep: false, join: "over", note: "Two shot or overmoulded with the barrel." };
      case "clip": return { seq: 2, moves: false, other: metal, sep: false, join: "clip",
        note: "Spring steel clip.", sug: metal ? undefined : "Mould the clip into the plastic barrel or cap and drop the steel part." };
      case "housing": return { seq: 3, moves: false, other: metal, sep: false, join: "press",
        note: "Holds the cam.", sug: metal ? undefined : "Mould the cam track inside the plastic barrel and drop the housing." };
      case "follower": return { seq: 4, moves: true, other: false, sep: false, join: "slide", note: "Rotates on every click." };
      case "button": return { seq: 5, moves: true, other: false, sep: false, join: "hold", note: "Trapped by the housing; held until the housing seats.", sug: "Add a lead in so the button snaps through the housing and needs no holding." };
      case "drive": return { seq: 2, moves: false, other: false, sep: false, join: "slide", note: "Turns with the sleeve.", sug: "Mould the helical track inside the twist sleeve and drop the drive." };
      case "sleeve": return { seq: 7, moves: true, other: false, sep: false, join: "snap", note: "Rotates against the barrel." };
      case "plug": return { seq: 2, moves: false, other: false, sep: false, join: "press", note: "Closes the barrel.", sug: metal ? "Turn the barrel with a closed end." : "Mould the barrel with a closed end and drop the plug." };
      case "refill": return { seq: 6, moves: false, other: true, sep: refillable, join: "slide", note: refillable ? "Must come out for a refill change." : "Bought out ink system." };
      case "spring": return { seq: 7, moves: true, other: true, sep: false, join: "hold", note: "Flexes on every click; held on the tip until the nose goes on." };
      case "feed": return { seq: 6, moves: false, other: false, sep: false, join: "press", note: "Capillary feed." };
      case "nib": return { seq: 5, moves: false, other: true, sep: false, join: "press", note: "Gold or steel nib pressed onto the feed." };
      case "nose": return { seq: 8, moves: false, other: false, sep: refillable, join: refillable ? "screw" : "press", note: refillable ? "Unscrews to change the refill." : "Pressed in; pen is sealed for life." };
      case "capseal": return { seq: 9, moves: false, other: true, sep: false, join: "press", note: "Seals the tip from drying out.", sug: "Two shot mould the seal into the cap." };
      case "vent": return { seq: 9, moves: false, other: false, sep: false, join: "press", note: "Child safety airflow.", sug: "Mould the vent holes straight into the cap and drop the insert." };
      case "magnet": return { seq: 9, moves: false, other: true, sep: false, join: "bond", note: "Holds the cap closed." };
      case "cap": return { seq: 10, moves: true, other: false, sep: true, join: "snap", note: "Removed by the user." };
      default: return { seq: 5, moves: false, other: false, sep: false, join: "press", note: "" };
    }
  };

  for (const p of cad.parts) {
    const r = rule(p.key);
    const sec = p.profile ? section(p.profile) : null;
    const size = sec ? Math.max(sec.length, sec.od) : 20;
    const thin = !!p.boxes && !p.profile;
    // rotational parts: beta = 0; alpha 180 when the ends match, else 360. Clips add beta 180.
    const ab = (sec?.symmetricEnds ? 180 : 360) + (p.boxes ? 180 : 0);
    const th = r.join === "over" ? 0 : handling(ab, size, p.key === "spring", thin);
    const [label, ti] = JOINS[r.join];
    const essential = r.moves || r.other || r.sep;
    rows.push({
      seq: r.seq, key: p.key, partNo: p.partNo, name: p.name, qty: p.qty,
      moves: r.moves, otherMaterial: r.other, separate: r.sep, essential,
      alphaBeta: ab, handlingS: th, insertion: label, insertionS: ti, totalS: r1((th + ti) * p.qty),
      note: r.note, suggestion: !essential ? r.sug : p.key === "button" ? r.sug : undefined,
    });
  }

  // engine parts that have no geometry (multi, capless) still count for DFA
  if (!cad.ok && design) {
    for (const p of design.parts) {
      if (p.key === "finish" || p.key === "ball") continue;
      const moves = ["follower", "button", "spring", "selector", "slider", "trapdoor", "carrier", "cap"].includes(p.key);
      const other = ["refill", "spring", "clip", "nib", "magnet"].includes(p.key);
      const sep = ["barrel", "refill", "cap"].includes(p.key);
      const ti = p.key === "slider" ? 4 * 2.0 : 2.5;
      rows.push({ seq: p.no / 10, key: p.key, partNo: `E-${p.no}`, name: p.name, qty: p.key === "slider" ? 4 : 1, moves, otherMaterial: other, separate: sep, essential: moves || other || sep,
        alphaBeta: 360, handlingS: 1.5, insertion: "Estimated, no geometry", insertionS: ti, totalS: r1(1.5 + ti), note: "From the engine part list; no CAD template yet." });
    }
  }

  rows.sort((a, b) => a.seq - b.seq);
  rows.forEach((r, i) => (r.seq = i + 1));
  const assembled = rows.filter((r) => r.insertion !== JOINS.over[0]);
  const nParts = assembled.reduce((a, r) => a + r.qty, 0);
  const nMin = assembled.filter((r) => r.essential).reduce((a, r) => a + r.qty, 0);
  const totalS = r1(rows.reduce((a, r) => a + r.totalS, 0));
  const index = totalS > 0 ? Math.round((300 * nMin) / totalS) / 100 : 0;

  const suggestions = rows.filter((r) => r.suggestion).map((r) => ({ part: r.name, text: r.suggestion!, savesS: r.key === "button" ? r1(JOINS.hold[1] - JOINS.snap[1]) : r.totalS }));
  const saved = suggestions.reduce((a, s) => a + s.savesS, 0);
  const dropped = rows.filter((r) => r.suggestion && !r.essential).reduce((a, r) => a + r.qty, 0);
  const rd = { nParts: nParts - dropped, totalS: r1(totalS - saved), index: 0 };
  rd.index = rd.totalS > 0 ? Math.round((300 * nMin) / rd.totalS) / 100 : 0;

  return { rows, nParts, nMin, totalS, index, labourInr: Math.round((totalS / 3600) * LABOUR_INR_PER_HOUR * 100) / 100, suggestions, redesign: rd };
}
