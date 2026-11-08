// Exact measurements from section profiles: volume by Pappus, wall thickness sampled along z,
// bore cores and undercuts. Nothing here approximates a mesh.

import type { Box, CadPart, Pt } from "./geometry.js";
import { CAD_MATS } from "./catalog.js";

/** Volume of revolution of a closed (r, z) polygon: V = 2*pi * |integral of r dA|. */
export function revolvedVolume(p: Pt[]): number {
  let s = 0;
  for (let i = 0; i < p.length; i++) {
    const [r1, z1] = p[i];
    const [r2, z2] = p[(i + 1) % p.length];
    s += (r1 + r2) * (r1 * z2 - r2 * z1);
  }
  return Math.abs((2 * Math.PI * s) / 6);
}

export const boxVolume = (b: Box) => (b.y1 - b.y0) * (b.z1 - b.z0) * b.w;

export function partVolume(part: CadPart): number {
  return (part.profile ? revolvedVolume(part.profile) : 0) + (part.boxes ?? []).reduce((a, b) => a + boxVolume(b), 0);
}

export function partMass(part: CadPart): number {
  return (partVolume(part) * (CAD_MATS[part.mat]?.rho ?? 1)) / 1000;
}

/** Radii where the horizontal line at z crosses the profile, sorted. */
function crossings(p: Pt[], z: number): number[] {
  const out: number[] = [];
  for (let i = 0; i < p.length; i++) {
    const [r1, z1] = p[i];
    const [r2, z2] = p[(i + 1) % p.length];
    if (z1 === z2) continue;
    const lo = Math.min(z1, z2), hi = Math.max(z1, z2);
    if (z >= lo && z < hi) out.push(r1 + ((r2 - r1) * (z - z1)) / (z2 - z1));
  }
  return out.sort((a, b) => a - b);
}

const avg = (seg: { r: number }[]) => seg.reduce((a, q) => a + q.r, 0) / Math.max(seg.length, 1);

export interface Section {
  zMin: number; zMax: number; length: number; od: number;
  walls: { z: number; t: number }[];
  wallMin: number; wallMax: number; wallMinAt: number;
  hollow: boolean;
  inner: { z: number; r: number | null }[];   // first solid crossing; null where solid to the axis or empty
  undercut: { z: number; depth: number } | null;
  cores: { from: "front" | "rear"; length: number; dia: number }[];
  symmetricEnds: boolean;
}

export function section(p: Pt[], step = 0.1): Section {
  const zs = p.map((q) => q[1]);
  const zMin = Math.min(...zs), zMax = Math.max(...zs);
  let wallMin = Infinity, wallMax = 0, wallMinAt = zMin;
  const inner: Section["inner"] = [];
  let hollow = false;
  const walls: { z: number; t: number }[] = [];
  // radial wall where the section is a tube; where it reaches (nearly) to the axis it is an end
  // wall, whose thickness is its axial length
  const odR = Math.max(...p.map((q) => q[0]));
  const ends: number[] = [];
  let run = 0;
  for (let z = zMin + step / 2; z < zMax; z += step) {
    const c = crossings(p, z);
    if (c.length < 2) { inner.push({ z, r: null }); if (run) { ends.push(run); run = 0; } continue; }
    let t = 0;
    for (let i = 0; i + 1 < c.length; i += 2) t += c[i + 1] - c[i];
    const endWall = c[0] < Math.max(0.3 * odR, 1.3);
    inner.push({ z, r: c[0] < 1e-6 ? null : c[0] });
    if (c[0] >= 1e-6) hollow = true;
    if (endWall) { run += step; continue; }
    if (run) { ends.push(run); run = 0; }
    if (t < wallMin) { wallMin = t; wallMinAt = z; }
    wallMax = Math.max(wallMax, t);
    walls.push({ z, t });
  }
  if (run) ends.push(run);
  // an end wall that is not the whole part counts by its axial thickness
  const tubeLike = walls.length > 0;
  if (tubeLike) for (const e of ends) { if (e < wallMin) { wallMin = e; } wallMax = Math.max(wallMax, e); }
  if (!hollow || !tubeLike) { hollow = hollow && tubeLike; wallMin = hollow ? wallMin : odR * 2; wallMax = Math.max(wallMax, wallMin); }

  // cores: the bore splits at its narrowest point; a front core pulls toward -z, a rear core toward +z.
  // A pocket (narrow, wide, narrow on one side of the split) cannot be cored and is an undercut.
  const rs = inner.filter((q) => q.r !== null) as { z: number; r: number }[];
  let undercut: Section["undercut"] = null;
  const cores: Section["cores"] = [];
  if (rs.length) {
    // only the bore that opens to an end can be cored; a run that starts at an end
    const openFront = inner[0].r !== null, openRear = inner[inner.length - 1].r !== null;
    const rmin = Math.min(...rs.map((q) => q.r));
    const at = rs.map((q, i) => (q.r <= rmin + 1e-6 ? i : -1)).filter((i) => i >= 0);
    const k = at[Math.floor(at.length / 2)];
    const front = rs.slice(0, k + 1), rear = rs.slice(k);
    const check = (seg: { z: number; r: number }[], dir: 1 | -1) => {
      // pulling toward the open end: radius must not grow away from that end
      const ordered = dir === 1 ? seg : [...seg].reverse();
      let best = ordered[0]?.r ?? 0;
      for (const q of ordered) {
        if (q.r > best + 0.02) { const d = q.r - best; if (!undercut || d > undercut.depth) undercut = { z: q.z, depth: d }; }
        best = Math.min(best, q.r);
      }
    };
    if (openFront && openRear) {
      check(front, 1); check(rear, -1);
      cores.push({ from: "front", length: front[front.length - 1].z - zMin, dia: 2 * avg(front) });
      cores.push({ from: "rear", length: zMax - rear[0].z, dia: 2 * avg(rear) });
    } else if (openRear) {
      check(rs, -1);
      cores.push({ from: "rear", length: zMax - rs[0].z, dia: 2 * avg(rs) });
    } else if (openFront) {
      check(rs, 1);
      cores.push({ from: "front", length: rs[rs.length - 1].z - zMin, dia: 2 * avg(rs) });
    }
  }

  // end symmetry for DFA handling (alpha): compare the profile with itself mirrored about mid length
  const mid = (zMin + zMax) / 2;
  let sym = true;
  for (let z = zMin + 0.5; z < zMax; z += Math.max(0.5, (zMax - zMin) / 40)) {
    const a = crossings(p, z), b = crossings(p, 2 * mid - z);
    if (a.length !== b.length || a.some((v, i) => Math.abs(v - b[i]) > 0.05)) { sym = false; break; }
  }
  return {
    zMin, zMax, length: zMax - zMin, od: 2 * odR, walls,
    wallMin: wallMin === Infinity ? 0 : wallMin, wallMax, wallMinAt, hollow, inner, undercut, cores, symmetricEnds: sym,
  };
}

/** Radial material intervals of a profile at z. */
export function intervals(p: Pt[], z: number): [number, number][] {
  const c = crossings(p, z);
  const out: [number, number][] = [];
  for (let i = 0; i + 1 < c.length; i += 2) out.push([c[i], c[i + 1]]);
  return out;
}

export interface Clash { a: string; b: string; z: number; overlap: number }

/** Interference between revolved parts, sampled every 0.1 mm along the axis. */
export function interference(parts: CadPart[], tol = 0.005): Clash[] {
  const rev = parts.filter((p) => p.profile);
  const out: Clash[] = [];
  for (let i = 0; i < rev.length; i++) for (let j = i + 1; j < rev.length; j++) {
    const A = rev[i], B = rev[j];
    const za = A.profile!.map((q) => q[1]), zb = B.profile!.map((q) => q[1]);
    const lo = Math.max(Math.min(...za), Math.min(...zb)), hi = Math.min(Math.max(...za), Math.max(...zb));
    let worst: Clash | null = null;
    for (let z = lo + 0.05; z < hi; z += 0.1) {
      for (const [a0, a1] of intervals(A.profile!, z)) for (const [b0, b1] of intervals(B.profile!, z)) {
        const ov = Math.min(a1, b1) - Math.max(a0, b0);
        if (ov > tol && (!worst || ov > worst.overlap)) worst = { a: A.name, b: B.name, z: Math.round(z * 100) / 100, overlap: Math.round(ov * 1000) / 1000 };
      }
    }
    if (worst) out.push(worst);
  }
  return out;
}
