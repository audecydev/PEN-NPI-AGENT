// Parametric pen geometry. Every turned or moulded part is a closed (r, z) profile revolved
// about the pen axis; clips and nibs add boxes. z = 0 is the nose front face, the writing
// point sits at z = -TIP_OUT. The same data drives the 3D view, the drawing, mass, DFM and
// the STEP exporter (packages/cad-export), so they cannot disagree.

import { deriveGeometry, MECHS, REFILLS } from "../legacy/engine.js";
import type { Design, Geo, PartDecision, PenSpec } from "../legacy/engine.js";
import { barrelMat, CAD_MATS, Process, TIP } from "./catalog.js";

export type Pt = [number, number]; // [r, z]
export interface Box { y0: number; y1: number; z0: number; z1: number; w: number } // y radial (clip side), x width
export type Decision = "Carryover" | "Modify" | "New" | "Added";

export interface CadPart {
  key: string;            // engine part key, or a CAD only key (grip, spring2)
  partNo: string;
  name: string;
  mat: string;            // CAD_MATS key
  process: Process;
  colour: string;
  profile?: Pt[];         // revolved section, closed polygon
  boxes?: Box[];          // prismatic bits (clip, nib)
  section: boolean;       // hatch in the drawing section view
  decision: Decision;
  src: string | null;     // archive record the part is carried from
  why: string;
  explode: number;        // mm along +z for the exploded view
  qty: number;
}

export interface CadModel {
  ok: boolean;
  template: string | null;
  reason?: string;
  parts: CadPart[];
  key: Record<string, number>;
  geo: Geo;
}

export const TIP_OUT = 1.0;
const NOSE_CONE = 14;
const SPIGOT = 6;

const near = (a: number) => Math.round(a * 1000) / 1000;

/** Engine part decision for a key, or a default for CAD only parts. */
function decisionFor(design: Design | null, key: string): { decision: Decision; src: string | null; why: string; name?: string } {
  const p: PartDecision | undefined = design?.parts.find((x) => x.key === key);
  if (!p) return { decision: "Added", src: null, why: "Added by the CAD template; not in the engine part list." };
  return { decision: p.dec, src: p.src, why: p.why, name: p.name };
}

function nose(R: number, rt: number, rr: number, wn: number, zBody: number) {
  // outer cone r0 -> R over NOSE_CONE; inner cone from the tip hole to the refill passage rr,
  // offset by the wall so the nose moulds or turns from one side and clears the refill body.
  let r0 = Math.min(rt + wn, R);
  let zi = R > r0 ? ((rr + wn - r0) / (R - r0)) * NOSE_CONE : 2.5;
  zi = Math.min(zi, zBody - 0.4);
  zi = Math.max(zi, 2.5);
  if (zi < NOSE_CONE) {
    const need = (rr + wn - (R * zi) / NOSE_CONE) / (1 - zi / NOSE_CONE);
    r0 = Math.min(Math.max(r0, need), R);
  }
  return { r0, inner: [[rt, 0], [rt, 2.0], [rr, zi]] as Pt[] };
}

function clipPart(baseR: number, zAnchor: number, dir: 1 | -1, length: number, d: ReturnType<typeof decisionFor>, explode: number): CadPart {
  const t = 0.6, w = 3.2;
  const [zr0, zr1] = [zAnchor, zAnchor + dir * 5].sort((a, b) => a - b);
  const [zb0, zb1] = [zAnchor + dir * 1, zAnchor + dir * 4].sort((a, b) => a - b);
  const [zs0, zs1] = [zAnchor + dir * 1, zAnchor + dir * (1 + length)].sort((a, b) => a - b);
  const zt = zAnchor + dir * (1 + length);
  const [zp0, zp1] = [zt, zt - dir * 2].sort((a, b) => a - b);
  return {
    key: "clip", partNo: "PC-160", name: d.name ?? "Pocket clip", mat: "ss301", process: "Stamping", colour: CAD_MATS.ss301.colour,
    profile: [[baseR, zr0], [baseR + 0.4, zr0], [baseR + 0.4, zr1], [baseR, zr1]],
    boxes: [
      { y0: baseR + 0.4, y1: baseR + 1.4, z0: zb0, z1: zb1, w },
      { y0: baseR + 1.4, y1: baseR + 1.4 + t, z0: zs0, z1: zs1, w },
      { y0: baseR + 0.05, y1: baseR + 1.4, z0: zp0, z1: zp1, w },
    ],
    section: false, decision: d.decision, src: d.src, why: d.why, explode, qty: 1,
  };
}

function refillPart(spec: PenSpec, design: Design | null, z0: number): CadPart {
  const rf = REFILLS[spec.refill];
  const tip = TIP[spec.refill] ?? { dia: 2.0, len: 8 };
  const br = rf.dia / 2;
  const d = decisionFor(design, "refill");
  let profile: Pt[];
  if (spec.system === "fountain") {
    profile = [[0, z0], [br - 0.6, z0], [br, z0 + 0.6], [br, z0 + rf.len], [0, z0 + rf.len]];
  } else {
    const tr = tip.dia / 2;
    profile = [[0, z0], [0.35, z0], [tr, z0 + 1], [tr, z0 + tip.len], [br, z0 + tip.len], [br, z0 + rf.len], [0, z0 + rf.len]];
  }
  return {
    key: "refill", partNo: `BO-${spec.refill}`, name: d.name ?? (spec.system === "fountain" ? "Ink cartridge" : "Refill assembly"),
    mat: "refill", process: "Bought out", colour: CAD_MATS.refill.colour, profile, section: false,
    decision: d.decision, src: d.src, why: d.why, explode: -70, qty: 1,
  };
}

/** Which template builds this spec, or why none does. */
export function templateFor(spec: PenSpec): { id: string | null; reason?: string } {
  if (spec.mech === "multi") return { id: null, reason: "Four colour multi pens need the selector cam template, which is not built yet. Routed to a design engineer." };
  if (spec.mech === "capless") return { id: null, reason: "Retractable nib pens need the sealed door template, which is not built yet. Routed to a design engineer." };
  if (spec.system === "fountain" && !(spec.mech === "capped" || spec.mech === "magnetic"))
    return { id: null, reason: "A fountain nib needs a capped body in the CAD templates." };
  if (!REFILLS[spec.refill]) return { id: null, reason: `Unknown refill ${spec.refill}.` };
  return { id: `${spec.mech}${spec.system === "fountain" ? "-fountain" : ""}` };
}

export function buildCad(spec: PenSpec, design: Design | null): CadModel {
  const geo = deriveGeometry(spec);
  const tpl = templateFor(spec);
  if (!tpl.id) return { ok: false, template: null, reason: tpl.reason, parts: [], key: {}, geo };

  const rf = REFILLS[spec.refill];
  const tip = TIP[spec.refill] ?? { dia: 2.0, len: 8 };
  const bm = barrelMat(spec.mat);
  const barrelProcess: Process = geo.route === "Deep drawing" ? "Deep drawing" : bm.process;
  const R = geo.od / 2;
  const rb = geo.bore / 2;
  // the nose only has to pass the refill body; the engine's refill bore rule applies to the barrel
  const rr = Math.min(geo.refillBore / 2, rf.dia / 2 + 0.15);
  const N = geo.nose;                 // 22 mm nose length used by the engine
  const B = geo.barrelLen;
  const zEnd = N + B;                 // barrel rear face
  const z0 = -TIP_OUT;                // writing point
  const fountain = spec.system === "fountain";
  const wn = Math.max(bm.wallMin, 0.8);
  const parts: CadPart[] = [];
  const key: Record<string, number> = {
    od: geo.od, bore: near(geo.bore), wall: geo.wall, nose: N, barrelLen: B, tipOut: TIP_OUT,
    refillLen: rf.len, refillDia: rf.dia, overall: geo.overall,
  };

  // nose joint: a male nose spigot in the barrel bore when the bore leaves room around the
  // refill, otherwise a female nose socket over a turned down barrel end. Short joint
  // features hold thinner walls than the body: 0.3 mm in metal, 0.55 mm in plastic.
  const jw = bm.metal ? Math.min(0.3, bm.wallMin) : 0.55;
  const maleWall = rb - 0.01 - rr;
  const total = R - rb;
  const joint: "male" | "female" = fountain || maleWall >= jw || maleWall >= total / 2 ? "male" : "female";
  const Rs = joint === "female" ? rb + total / 2 : rb;
  key.jointWall = near(joint === "male" ? maleWall : Math.min(Rs - rb, R - Rs - 0.02));
  key.jointClearance = 0.02;
  key.jointMin = jw;
  key.jointZ0 = N; key.jointZ1 = N + SPIGOT;
  key.jointFemale = joint === "female" ? 1 : 0;

  // nose cone or fountain section
  {
    const d = decisionFor(design, "nose");
    let profile: Pt[];
    if (fountain) {
      const rfeed = 2.3, rsec = Math.max(rr, rfeed + 0.2);
      profile = [[rfeed, 0], [Math.min(R - 0.6, rfeed + 2.2), 0], [R, 10], [R, N], [rb - 0.01, N], [rb - 0.01, N + SPIGOT], [rsec, N + SPIGOT], [rsec, 10], [rfeed, 8]];
    } else {
      const rt = tip.dia / 2 + 0.15;
      const n = nose(R, rt, rr, wn, z0 + tip.len);
      if (joint === "male") {
        profile = [[rt, 0], [n.r0, 0], [R, NOSE_CONE], [R, N], [rb - 0.01, N], [rb - 0.01, N + SPIGOT], [rr, N + SPIGOT], n.inner[2], n.inner[1]];
      } else {
        // female nose: a socket over the turned down front of the barrel
        profile = [[rt, 0], [n.r0, 0], [R, NOSE_CONE], [R, N + SPIGOT], [Rs + 0.02, N + SPIGOT], [Rs + 0.02, N], [rr, N], n.inner[2], n.inner[1]];
      }
      key.noseTipOd = near(2 * n.r0);
      key.noseHole = near(2 * rt);
    }
    parts.push({ key: "nose", partNo: "PN-120", name: d.name ?? (fountain ? "Section" : "Nose cone"), mat: spec.mat, process: barrelProcess === "Deep drawing" ? "CNC turning" : bm.process, colour: bm.colour, profile, section: true, decision: d.decision, src: d.src, why: d.why, explode: -34, qty: 1 });
  }

  // barrel; magnetic pens get a groove for the steel ring under the cap
  const capOpen = N + 18;
  {
    const d = decisionFor(design, "barrel");
    const front: Pt[] = joint === "female" ? [[rb, N], [Rs, N], [Rs, N + SPIGOT], [R, N + SPIGOT]] : [[rb, N], [R, N]];
    let profile: Pt[] = [...front, [R, zEnd], [rb, zEnd]];
    if (spec.mech === "magnetic") {
      const g0 = capOpen - 6, g1 = capOpen - 2;
      profile = [...front, [R, g0], [R - 0.5, g0], [R - 0.5, g1], [R, g1], [R, zEnd], [rb, zEnd]];
    }
    parts.push({ key: "barrel", partNo: "PB-110", name: d.name ?? "Barrel", mat: spec.mat, process: barrelProcess, colour: bm.colour, profile, section: true, decision: d.decision, src: d.src, why: d.why, explode: 0, qty: 1 });
  }

  // grip sleeve (CAD only part; the engine treats grip as a feature)
  if (spec.grip === "rubber") {
    const zg0 = N + 2, zg1 = Math.min(N + 34, zEnd - 30);
    const Rg = R + 0.8;
    parts.push({ key: "grip", partNo: "PG-170", name: "Grip sleeve", mat: "tpe", process: "Overmoulding", colour: CAD_MATS.tpe.colour,
      profile: [[R, zg0], [Rg - 0.4, zg0], [Rg, zg0 + 0.8], [Rg, zg1 - 0.8], [Rg - 0.4, zg1], [R, zg1]], section: true,
      decision: "Added", src: null, why: "Rubber grip requested; overmoulded on the barrel.", explode: 0, qty: 1 });
    key.gripOd = near(2 * Rg);
  }

  const springOn = geo.force > 0 && !fountain;
  if (spec.mech === "click") {
    const wh = 0.9;
    const rh = rb - wh;
    const h0 = zEnd - MECHS.click.rear;
    {
      const d = decisionFor(design, "housing");
      parts.push({ key: "housing", partNo: "PM-130", name: d.name ?? "Click cam housing", mat: "pom", process: "Injection moulding", colour: CAD_MATS.pom.colour,
        profile: [[rh, h0], [rb - 0.01, h0], [rb - 0.01, zEnd], [rb + 0.4, zEnd], [rb + 0.4, zEnd + 1.0], [rh, zEnd + 1.0]], section: true,
        decision: d.decision, src: d.src, why: d.why, explode: 18, qty: 1 });
    }
    {
      const d = decisionFor(design, "follower");
      // the follower carries a push rod forward to the refill end, so the stack needs no loose spacer
      const refEnd = z0 + rf.len;
      const rp = Math.min(rf.dia / 2, rh - 0.4);
      const prof: Pt[] = refEnd + 0.5 < h0
        ? [[Math.max(rp - 0.8, 0.4), refEnd + 0.05], [rp, refEnd + 0.05], [rp, h0], [rh - 0.05, h0], [rh - 0.05, h0 + 5], [Math.max(rp - 0.8, 0.4), h0 + 5]]
        : [[Math.max(rh - 0.9, 0.4), h0], [rh - 0.05, h0], [rh - 0.05, h0 + 5], [Math.max(rh - 0.9, 0.4), h0 + 5]];
      parts.push({ key: "follower", partNo: "PM-140", name: d.name ?? "Cam follower", mat: "pom", process: "Injection moulding", colour: "#d8d3c6",
        profile: prof, section: true,
        decision: d.decision, src: d.src, why: d.why, explode: 26, qty: 1 });
    }
    {
      const d = decisionFor(design, "button");
      const rk = rh - 0.1, ke = zEnd + MECHS.click.rear;
      parts.push({ key: "button", partNo: "PM-150", name: d.name ?? "Push button", mat: CAD_MATS[spec.mat].metal ? spec.mat : "abs", process: CAD_MATS[spec.mat].metal ? "CNC turning" : "Injection moulding",
        colour: CAD_MATS[spec.mat].metal ? "#c9a84c" : "#2c2f33",
        profile: [[Math.max(rk - 0.9, 0.4), h0 + 5], [rk, h0 + 5], [rk, ke - 0.6], [rk - 0.6, ke], [0, ke], [0, ke - 1.2], [Math.max(rk - 0.9, 0.4), ke - 1.2]], section: true,
        decision: d.decision, src: d.src, why: d.why, explode: 36, qty: 1 });
      key.buttonOd = near(2 * rk);
      key.buttonEnd = ke;
    }
  }

  if (spec.mech === "twist") {
    const zs = N + Math.round(B * 0.62);
    const bar = parts.find((p) => p.key === "barrel")!;
    bar.profile = [...(joint === "female" ? [[rb, N], [Rs, N], [Rs, N + SPIGOT], [R, N + SPIGOT]] as Pt[] : [[rb, N], [R, N]] as Pt[]), [R, zs], [rb, zs]];
    const d = decisionFor(design, "sleeve");
    parts.push({ key: "sleeve", partNo: "PT-130", name: d.name ?? "Twist sleeve", mat: spec.mat, process: barrelProcess === "Deep drawing" ? "CNC turning" : bm.process, colour: bm.colour,
      profile: [[rb, zs], [R, zs], [R, zEnd - 0.6], [R - 0.6, zEnd], [0, zEnd], [0, zEnd - 1.2], [rb, zEnd - 1.2]], section: true,
      decision: d.decision, src: d.src, why: d.why, explode: 22, qty: 1 });
    const dd = decisionFor(design, "drive");
    parts.push({ key: "drive", partNo: "PT-140", name: dd.name ?? "Helical drive", mat: "pom", process: "Injection moulding", colour: CAD_MATS.pom.colour,
      profile: [[rf.dia / 2 + 0.3, zs - 6], [rb - 0.02, zs - 6], [rb - 0.02, zEnd - 1.3], [rf.dia / 2 + 0.3, zEnd - 1.3]], section: true,
      decision: dd.decision, src: dd.src, why: dd.why, explode: 12, qty: 1 });
    key.twistJoint = zs;
  }

  if (spec.mech === "capped" || spec.mech === "magnetic") {
    {
      const d = decisionFor(design, "barrel");
      parts.push({ key: "plug", partNo: "PE-180", name: "End plug", mat: "pp", process: "Injection moulding", colour: "#2c2f33",
        profile: [[Math.max(rb - 0.81, 0.4), zEnd - 6], [rb - 0.01, zEnd - 6], [rb - 0.01, zEnd], [R, zEnd], [R, zEnd + 1.4], [R - 0.6, zEnd + 2], [0, zEnd + 2], [0, zEnd + 0.8], [Math.max(rb - 0.81, 0.4), zEnd + 0.8]], section: true,
        decision: "Added", src: null, why: `Closes the barrel. ${d.decision === "Carryover" ? "Follows the carried over barrel." : "Sized to the barrel bore."}`, explode: 14, qty: 1 });
    }
    const rc = (key.gripOd ? key.gripOd / 2 : R) + 0.1;
    const wc = Math.max(bm.wallMin, 0.9);
    const Rc = rc + wc + (spec.mech === "magnetic" ? 0.8 : 0);
    const zIn = (fountain ? -12 : z0) - 2.4, zOut = zIn - 1.2;
    const rv = spec.child ? 1.2 : 0;
    {
      const d = decisionFor(design, "cap");
      let profile: Pt[] = [[rv, zOut], [Rc - 0.6, zOut], [Rc, zOut + 0.6], [Rc, capOpen], [rc, capOpen], [rc, zIn], [rv, zIn]];
      if (spec.mech === "magnetic") {
        const m0 = capOpen - 6, m1 = capOpen - 2, rm = rc + 0.8;
        profile = [[rv, zOut], [Rc - 0.6, zOut], [Rc, zOut + 0.6], [Rc, capOpen], [rc, capOpen], [rc, m1], [rm, m1], [rm, m0], [rc, m0], [rc, zIn], [rv, zIn]];
      }
      parts.push({ key: "cap", partNo: "PC-210", name: d.name ?? "Cap", mat: spec.mat, process: bm.process, colour: bm.colour, profile, section: true,
        decision: d.decision, src: d.src, why: d.why, explode: -120, qty: 1 });
      key.capOd = near(2 * Rc);
      key.capLen = near(capOpen - zOut);
      key.capVent = 2 * rv;
    }
    {
      const d = decisionFor(design, "capseal");
      const ro = Math.min(rc - 0.05, (tip.dia / 2) + 2.6);
      parts.push({ key: "capseal", partNo: "PC-220", name: d.name ?? "Cap inner seal", mat: "tpe", process: "Injection moulding", colour: "#55595e",
        profile: [[Math.max(rv, tip.dia / 2 + 0.25), zIn], [ro, zIn], [ro, zIn + 1.2], [Math.max(rv, tip.dia / 2 + 0.25), zIn + 1.2]], section: true,
        decision: d.decision, src: d.src, why: d.why, explode: -128, qty: 1 });
    }
    if (spec.child) {
      const d = decisionFor(design, "vent");
      parts.push({ key: "vent", partNo: "PC-230", name: d.name ?? "Ventilated cap insert", mat: "pp", process: "Injection moulding", colour: "#ffffff",
        profile: [[0.6, zOut - 0.3], [rv, zOut - 0.3], [rv, zIn], [0.6, zIn]], section: true,
        decision: d.decision, src: d.src, why: d.why, explode: -134, qty: 1 });
    }
    if (spec.mech === "magnetic") {
      const d = decisionFor(design, "magnet");
      const m0 = capOpen - 6, m1 = capOpen - 2;
      parts.push({ key: "magnet", partNo: "PC-240", name: d.name ?? "Magnet pair", mat: "ndfeb", process: "Sintered magnet", colour: CAD_MATS.ndfeb.colour,
        profile: [[rc, m0 + 0.2], [rc + 0.78, m0 + 0.2], [rc + 0.78, m1 - 0.2], [rc, m1 - 0.2]], section: true,
        decision: d.decision, src: d.src, why: d.why + " Shown: cap ring. The mating steel ring sits in the barrel groove.", explode: -120, qty: 2 });
    }
  }

  if (fountain) {
    const df = decisionFor(design, "feed");
    parts.push({ key: "feed", partNo: "PF-190", name: df.name ?? "Feed", mat: "abs", process: "Injection moulding", colour: "#2c2f33",
      profile: [[0, -9], [1.2, -9], [2.25, -4], [2.25, 12], [0, 12]], section: true,
      decision: df.decision, src: df.src, why: df.why, explode: -46, qty: 1 });
    const dn = decisionFor(design, "nib");
    parts.push({ key: "nib", partNo: "BO-NIB", name: dn.name ?? "Nib", mat: "ss301", process: "Bought out", colour: "#c9a84c",
      boxes: [{ y0: 2.25, y1: 2.6, z0: -12, z1: -6, w: 2.6 }, { y0: 2.25, y1: 2.6, z0: -6, z1: 6, w: 5.2 }], section: false,
      decision: dn.decision, src: dn.src, why: dn.why, explode: -58, qty: 1 });
  }

  if (springOn && spec.mech === "click") {
    const d = decisionFor(design, "spring");
    const tr = tip.dia / 2;
    const nosePart = parts.find((p) => p.key === "nose")!;
    const [[a1, b1], [a2, b2]] = [nosePart.profile![8], nosePart.profile![7]];
    const zsp = Math.max(b1, a2 > a1 ? b1 + ((tr + 0.6 - a1) / (a2 - a1)) * (b2 - b1) : b1);
    const h = z0 + tip.len - zsp;
    const fits = tr + 0.6 <= a2 + 1e-6;   // coil OD must pass inside the nose passage
    if (!fits || h <= 1) key.springNoRoom = 1;
    if (fits && h > 1) {
      parts.push({ key: "spring", partNo: "PS-160", name: d.name ?? "Return spring", mat: "wire", process: "Spring coiling", colour: CAD_MATS.wire.colour,
        profile: [[tr + 0.3, zsp], [tr + 0.6, zsp], [tr + 0.6, zsp + h], [tr + 0.3, zsp + h]], section: false,
        decision: d.decision, src: d.src, why: d.why, explode: -52, qty: 1 });
      key.springLen = near(h);
      key.springMeanDia = near(2 * (tr + 0.45));
      key.springWire = 0.3;
      key.springPitch = 1.2;
    }
  }

  if (spec.clip) {
    const d = decisionFor(design, "clip");
    const capPart = parts.find((p) => p.key === "cap");
    if (capPart) {
      const capOd = key.capOd / 2;
      const zOut = capPart.profile![0][1];
      parts.push(clipPart(capOd, zOut + 1, 1, near(0.72 * key.capLen), d, -120));
    } else {
      const holder = parts.find((p) => p.key === "sleeve") ?? parts.find((p) => p.key === "barrel")!;
      parts.push(clipPart(R, zEnd - 1, -1, near(0.36 * (zEnd + 12)), d, holder.explode));
    }
    key.clipLen = parts[parts.length - 1].boxes![1].z1 - parts[parts.length - 1].boxes![1].z0;
  }

  parts.push(refillPart(spec, design, fountain ? 12 : z0));
  return { ok: true, template: tpl.id, parts, key, geo };
}
