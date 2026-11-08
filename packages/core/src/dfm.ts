// Design for manufacture. Every check reads the generated geometry (measure.ts) and the
// process each part is routed to, and returns a finding with the number it was judged on.

import type { PenSpec } from "./legacy/engine.js";
import { CAD_MATS, TIP } from "./cad/catalog.js";
import type { CadModel, CadPart } from "./cad/geometry.js";
import { interference, partMass, partVolume, section, type Section } from "./cad/measure.js";

export type Level = "pass" | "info" | "warn" | "fail";
export interface DfmFinding {
  id: string; part: string; partNo: string; level: Level; check: string; value: string; message: string; fix?: string;
}
export interface DfmPartSummary {
  key: string; partNo: string; name: string; material: string; process: string; mass: number; volume: number;
  wallMin: number; wallMax: number; cycleS: number | null; materialCost: number; utilisation: number | null;
  capacityNote: string; level: Level;
}
export interface DfmResult {
  findings: DfmFinding[];
  parts: DfmPartSummary[];
  score: number;            // 0..100
  counts: Record<Level, number>;
  tooling: { item: string; inr: number }[];
}

const MRR: Record<string, number> = { alu: 1500, bra: 1800, sst: 500, tit: 300 }; // mm3/min, small turned parts
const HOURS_MONTH = 16 * 25 * 0.85;   // two shifts, 25 days, 85 % OEE
const deg = (a: number) => (a * Math.PI) / 180;
const r2 = (x: number) => Math.round(x * 100) / 100;
const worst = (a: Level, b: Level): Level => (["pass", "info", "warn", "fail"].indexOf(a) >= ["pass", "info", "warn", "fail"].indexOf(b) ? a : b);

export function runDfm(spec: PenSpec, cad: CadModel): DfmResult {
  const findings: DfmFinding[] = [];
  const parts: DfmPartSummary[] = [];
  const tooling: { item: string; inr: number }[] = [];
  let n = 0;
  const add = (p: CadPart, level: Level, check: string, value: string, message: string, fix?: string) =>
    findings.push({ id: `DFM-${String(++n).padStart(2, "0")}`, part: p.name, partNo: p.partNo, level, check, value, message, fix });

  for (const p of cad.parts) {
    const m = CAD_MATS[p.mat];
    const vol = partVolume(p);
    const mass = partMass(p);
    const sec: Section | null = p.profile ? section(p.profile) : null;
    let cycle: number | null = null;
    let util: number | null = null;
    let capNote = "";
    let level: Level = "pass";
    const mark = (l: Level, ...a: [string, string, string, string?]) => { add(p, l, ...a); level = worst(level, l); };

    if (p.process === "Bought out") {
      parts.push({ key: p.key, partNo: p.partNo, name: p.name, material: m.label, process: p.process, mass: r2(mass), volume: r2(vol), wallMin: 0, wallMax: 0, cycleS: null, materialCost: 0, utilisation: null, capacityNote: "Supplier part", level });
      continue;
    }

    if (sec && sec.hollow && ["Injection moulding", "Overmoulding", "CNC turning", "Deep drawing"].includes(p.process)) {
      // the nose joint zone is judged against the short feature minimum; the body against the material minimum
      const inJoint = (z: number) => (p.key === "nose" || p.key === "barrel") && z >= (cad.key.jointZ0 ?? 1e9) - 0.05 && z <= (cad.key.jointZ1 ?? -1e9) + 0.05;
      const body = sec.walls.filter((w) => !inJoint(w.z));
      const bodyMin = body.length ? Math.min(...body.map((w) => w.t)) : sec.wallMin;
      const at = body.find((w) => w.t === bodyMin)?.z ?? sec.wallMinAt;
      if (bodyMin < m.wallMin - 1e-6)
        mark("fail", "Minimum wall", `${r2(bodyMin)} mm at z ${r2(at)}`, `Below the ${m.wallMin} mm the ${p.process.toLowerCase()} process holds in ${m.label}.`, "Raise the outer diameter or reduce the bore at that station.");
      else if (bodyMin < m.wallMin + 0.1)
        mark("warn", "Minimum wall", `${r2(bodyMin)} mm`, `Within 0.1 mm of the ${m.wallMin} mm process minimum.`, "Hold the wall on the drawing as a critical characteristic.");
      else mark("pass", "Minimum wall", `${r2(bodyMin)} mm`, `Meets the ${m.wallMin} mm minimum for ${m.label}.`);
      sec.wallMin = Math.min(bodyMin, sec.wallMax);
    }
    if (sec && !sec.hollow && (p.process === "Injection moulding") && sec.od > 2 * m.wallMax)
      mark("warn", "Solid section", `Ø${r2(sec.od)} solid`, "A thick solid moulding sinks and cycles slowly.", "Core it out to a uniform wall.");

    if (p.process === "Injection moulding" || p.process === "Overmoulding") {
      if (sec && sec.hollow) {
        const ratio = sec.wallMax / Math.max(sec.wallMin, 0.01);
        if (ratio > 2.5) mark("warn", "Wall uniformity", `max/min ${r2(ratio)}`, "Thick and thin sections in one moulding cause sink and warp.", "Core out the thick section to bring the ratio under 2.");
        else mark("pass", "Wall uniformity", `max/min ${r2(ratio)}`, "Even enough to fill and cool without sink.");
        if (sec.wallMax > m.wallMax) mark("warn", "Maximum wall", `${r2(sec.wallMax)} mm`, `Above ${m.wallMax} mm; long cooling and sink marks.`, "Core out to a uniform wall.");
        if (sec.undercut) mark("fail", "Undercut", `${r2(sec.undercut.depth)} mm deep at z ${r2(sec.undercut.z)}`, "An internal pocket that no straight core can release.", p.key === "cap" ? "Insert mould the magnet, or use a collapsible core (adds about Rs 4 lakh per cavity)." : "Move the feature to an opening end or split the part.");
        else mark("pass", "Undercut", "none", "Every bore releases on a straight core.");
        const draft = m.draftMin ?? 0.5;
        for (const c of sec.cores) {
          const ld = c.length / Math.max(c.dia, 0.1);
          const grow = c.length * Math.tan(deg(draft));
          const after = sec.wallMin - grow / 2;   // draft split between core and cavity
          if (ld > 10) mark("warn", `Core pin L/D (${c.from})`, `${r2(ld)} (${r2(c.length)} x Ø${r2(c.dia)})`, "A long thin core deflects under injection pressure and the wall goes eccentric.", "Support the core at both ends or mould from both ends with a shut off at mid length.");
          if (after < m.wallMin - 0.005) mark("warn", `Draft on ${c.from} core`, `${draft}° per side loses ${r2(grow)} mm`, `With draft the deepest wall drops to ${r2(after)} mm, under the ${m.wallMin} mm minimum.`, "Draft the outside to match, or shorten the core.");
          else mark("pass", `Draft on ${c.from} core`, `${draft}° per side`, `Wall stays at ${r2(after)} mm or more after draft. Model shows zero draft; add it at detail design.`);
        }
      }
      if (m.shrink) mark("info", "Mould shrinkage", `${m.shrink} %`, `Cut the tool ${m.shrink} % oversize; critical diameters to be tuned after T1.`);
      const tMax = sec ? Math.max(sec.wallMax, 0.6) : 1.5;
      const cool = 2.0 * tMax * tMax * (m.code === "pom" || m.code === "pp" ? 1.3 : 1);
      cycle = Math.round(6 + cool + (sec && sec.length > 60 ? 4 : 0));
      const perCav = (3600 / cycle) * HOURS_MONTH;
      const cav = Math.max(1, Math.min(32, 2 ** Math.ceil(Math.log2(Math.max(1, (spec.vol * 1.05) / perCav)))));
      capNote = `${cycle} s cycle, ${cav} cavity tool for ${spec.vol.toLocaleString("en-IN")} a month`;
      tooling.push({ item: `${p.name} mould, ${cav} cavity`, inr: Math.round(250000 + cav * 90000 + (sec && sec.length > 60 ? 150000 : 0)) });
      if (spec.vol < 3000) mark("warn", "Volume for moulding", `${spec.vol.toLocaleString("en-IN")} a month`, "A moulding tool rarely pays back at this volume.", "Machine from rod or 3D print for the first lots.");
    }

    if (p.process === "CNC turning" && sec) {
      const deep = sec.cores.some((c) => c.length / Math.max(c.dia, 0.1) > 6);
      // bar in whole mm sizes; drawn tube in half mm steps with 0.2 mm per side to clean up
      const stockD = deep ? Math.ceil((sec.od + 0.4) * 2) / 2 : Math.ceil(sec.od + 1);
      const stockL = sec.length + 3;
      const boreD = Math.min(...sec.cores.map((c) => c.dia), sec.od);
      const tubeId = Math.max(boreD - 0.6, 0);
      // long bores start from drawn tube; short parts from bar
      const stockVol = (Math.PI / 4) * (stockD * stockD - (deep ? tubeId * tubeId : 0)) * stockL;
      if (deep) mark("info", "Stock", `Drawn tube Ø${stockD} x ${r2((stockD - tubeId) / 2)} wall`, "The bore is too deep to drill economically, so the part starts from tube.");
      util = vol / stockVol;
      const removed = stockVol - vol;
      cycle = Math.round(20 + (removed / (MRR[m.code] ?? 1000)) * 60);
      const machines = Math.ceil((spec.vol * cycle) / 3600 / HOURS_MONTH);
      capNote = `${cycle} s cycle, ${machines} sliding head lathe${machines > 1 ? "s" : ""} for ${spec.vol.toLocaleString("en-IN")} a month`;
      const stockName = deep ? "tube" : "bar";
      if (util < 0.25) mark("warn", "Material utilisation", `${Math.round(util * 100)} % of Ø${stockD} ${stockName}`, "Most of the stock is turned to chips.", "Near net stock or a cold headed blank would cut waste.");
      else mark("pass", "Material utilisation", `${Math.round(util * 100)} % of Ø${stockD} ${stockName}`, "Acceptable for a turned part.");
      for (const c of sec.cores) {
        if (c.length < 0.5) continue;
        const ld = c.length / Math.max(c.dia, 0.1);
        if (ld > 6 && !deep) mark("warn", `Bore depth (${c.from})`, `L/D ${r2(ld)}`, "Beyond standard drilling.", "Use tube stock or bore from both ends.");
        else mark("pass", `Bore depth (${c.from})`, `L/D ${r2(ld)}`, deep ? "Bore comes from the tube; only the ends are finish bored." : "Drillable and boreable from this end.");
      }
      if (sec.hollow && sec.wallMin / sec.od < 0.06) mark("warn", "Thin wall chatter", `t/D ${r2(sec.wallMin / sec.od)}`, "Thin tube walls chatter on the last pass.", "Finish turn on a supported mandrel.");
      if (spec.vol > 150000 && m.code !== "tit") mark("info", "Route at volume", `${spec.vol.toLocaleString("en-IN")} a month`, "At this volume deep drawing or impact extrusion is cheaper than turning.");
    }

    if (p.process === "Deep drawing" && sec) {
      const d = sec.od - sec.wallMin;
      const h = sec.length;
      const blank = Math.sqrt(d * d + 4 * d * h);
      const ratio = blank / d;
      const stages = 1 + Math.max(0, Math.ceil(Math.log(ratio / 1.9) / Math.log(1.25)));
      capNote = `Blank Ø${r2(blank)}, ${stages} draw stages, then trim and pierce`;
      cycle = 3 * stages + 4;
      mark(stages > 8 ? "warn" : "pass", "Draw stages", `${stages} (blank Ø${r2(blank)})`, stages > 8 ? "Many redraws; check annealing between stages." : "Feasible on a transfer press.", stages > 8 ? "Consider impact extrusion for the barrel." : undefined);
      tooling.push({ item: `${p.name} transfer die set, ${stages} stations`, inr: 600000 + stages * 120000 });
    }

    if (p.process === "Stamping" && p.boxes) {
      const strip = p.boxes[1];
      const len = strip.z1 - strip.z0;
      const t = strip.y1 - strip.y0;
      mark(len > 50 ? "warn" : "pass", "Clip spring length", `${r2(len)} mm x ${r2(t)} mm`, len > 50 ? "A long clip loses its grip after repeated pocketing." : "Bend radius 1 x thickness in half hard SS 301.", len > 50 ? "Add a stiffening rib or shorten to 45 mm." : undefined);
      tooling.push({ item: "Clip progressive die", inr: 350000 });
      cycle = 1;
      capNote = "Progressive die, one hit per clip";
    }

    if (p.process === "Spring coiling" && sec) {
      const D = cad.key.springMeanDia ?? 2.5, dw = cad.key.springWire ?? 0.3;
      const C = D / dw;
      mark(C < 4 || C > 12 ? "warn" : "pass", "Spring index", `C = ${r2(C)}`, C < 4 || C > 12 ? "Outside the 4 to 12 range coilers hold to tolerance." : "Within the 4 to 12 range for consistent coiling.", C < 4 || C > 12 ? "Change wire diameter." : undefined);
      const coils = (cad.key.springLen ?? 5) / (cad.key.springPitch ?? 0.9);
      const solid = (coils + 2) * dw;
      const room = (cad.key.springLen ?? 5) - solid;
      mark(room < 3 ? "fail" : "pass", "Spring travel", `${r2(room)} mm to solid`, room < 3 ? "The spring goes solid before the 3 mm click travel." : "Enough travel before the spring goes solid.", room < 3 ? "Lengthen the refill tip seat or reduce coils." : undefined);
      capNote = "Bought from the spring supplier to drawing";
    }

    if (p.process === "Sintered magnet") {
      mark("info", "Magnet retention", "press fit or adhesive", "NdFeB is brittle; a press fit can crack it.", "Bond with anaerobic adhesive and coat Ni-Cu-Ni.");
      capNote = "Bought to drawing";
    }

    parts.push({
      key: p.key, partNo: p.partNo, name: p.name, material: m.label, process: p.process, mass: r2(mass), volume: r2(vol),
      wallMin: sec ? r2(sec.wallMin) : 0, wallMax: sec ? r2(sec.wallMax) : 0, cycleS: cycle,
      materialCost: r2((mass / 1000) * m.rateInrKg / (util ?? 0.9)), utilisation: util === null ? null : r2(util), capacityNote: capNote, level,
    });
  }

  // assembly level checks
  const barrel = cad.parts.find((p) => p.key === "barrel");
  const noseP = cad.parts.find((p) => p.key === "nose");
  if (barrel && noseP) {
    const jw = cad.key.jointWall, jmin = cad.key.jointMin;
    const kind = cad.key.jointFemale ? "Nose socket over a turned down barrel end" : "Nose spigot inside the barrel bore";
    if (jw !== undefined && jw < jmin) add(noseP, "fail", "Nose joint wall", `${jw} mm`, `${kind}: thinnest joint wall is under the ${jmin} mm a short joint feature holds.`, "Raise the barrel OD by " + r2(2 * (jmin - jw) + 0.1) + " mm or use a slimmer refill.");
    else if (jw !== undefined) add(noseP, "pass", "Nose joint wall", `${jw} mm`, `${kind}; holds the ${jmin} mm short feature minimum.`);
    add(noseP, "warn", "Nose to barrel fit", cad.key.jointFemale ? "socket over barrel end" : "Ø" + cad.geo.bore.toFixed(2) + " spigot in bore", "ISO 2768 m alone gives ±0.2 mm, which cannot hold this joint.", CAD_MATS[barrel.mat].metal ? "Specify H8/s7 press fit, or a M" + Math.floor(cad.geo.bore) + " x 0.5 thread if the refill is to be changed." : "Specify a snap bead 0.15 mm high, or ultrasonic weld for a sealed pen.");
  }
  if (cad.key.springNoRoom && noseP) add(noseP, "fail", "Return spring space", `coil OD ${r2(2 * ((TIP[spec.refill]?.dia ?? 2) / 2 + 0.6))} mm`, "The refill tip section leaves no room for a return spring inside the nose.", "Use a refill extender with a spring seat, or a larger refill format.");
  const clashes = interference(cad.parts);
  const host = barrel ?? cad.parts[0];
  if (clashes.length) for (const c of clashes) add(host, "fail", "Assembly interference", `${c.overlap} mm at z ${c.z}`, `${c.a} and ${c.b} occupy the same space.`, "Adjust the bore or the part diameter at that station.");
  else add(host, "pass", "Assembly interference", "none", "No two parts overlap anywhere along the pen.");
  if (spec.finish === "anodise" && barrel) add(barrel, "info", "Finish growth", "+0.01 to 0.02 mm per surface", "Anodising grows diameters; mask the bore or size fits after finish.");
  if (spec.finish === "pvd" || spec.finish === "chrome") add(barrel ?? cad.parts[0], "info", "Finish growth", "+0.002 to 0.01 mm", "Coating thickness is within fit tolerance.");

  const counts: Record<Level, number> = { pass: 0, info: 0, warn: 0, fail: 0 };
  for (const f of findings) counts[f.level]++;
  // share of checks passed, warnings counting half and information neutral
  const judged = counts.pass + counts.warn + counts.fail;
  const score = judged ? Math.round((100 * (counts.pass + 0.5 * counts.warn)) / judged) : 100;
  return { findings, parts, score, counts, tooling };
}
