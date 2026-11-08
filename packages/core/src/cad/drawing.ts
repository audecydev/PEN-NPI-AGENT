// A3 drawing sheet (SVG) built from the same profiles as the model: upper half in section,
// lower half as exterior, a 5:1 writing end detail, the parts list with reuse decisions and
// an Audecy title block. First angle projection, mm.

import type { PenSpec } from "../legacy/engine.js";
import { CAD_MATS } from "./catalog.js";
import type { CadModel, Pt } from "./geometry.js";
import { partMass } from "./measure.js";

const W = 420, H = 297;
const INK = "#1f2933", GOLD = "#b8953a", MUTED = "#5f6b76";
const FONT = "IBM Plex Mono, Consolas, monospace";
const esc = (s: unknown) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);
const f2 = (x: number) => x.toFixed(2);

function maxR(p: Pt[], z: number) {
  let best = 0;
  for (let i = 0; i < p.length; i++) {
    const [r1, z1] = p[i], [r2, z2] = p[(i + 1) % p.length];
    if (z >= Math.min(z1, z2) - 1e-9 && z <= Math.max(z1, z2) + 1e-9) {
      best = Math.abs(z2 - z1) < 1e-9 ? Math.max(best, r1, r2) : Math.max(best, r1 + ((r2 - r1) * (z - z1)) / (z2 - z1));
    }
  }
  return best;
}
export function envelope(p: Pt[]): Pt[] {
  const zs = [...new Set(p.map((q) => q[1]))].sort((a, b) => a - b);
  const out: Pt[] = [[0, zs[0]]];
  for (const z of zs) for (const zz of [z - 1e-4, z, z + 1e-4]) if (zz >= zs[0] && zz <= zs[zs.length - 1]) out.push([maxR(p, zz), zz]);
  out.push([0, zs[zs.length - 1]]);
  return out;
}

class Svg {
  b: string[] = [];
  add(s: string) { this.b.push(s); }
  text(x: number, y: number, t: unknown, size = 3, anchor = "start", weight = "400", fill = INK) {
    this.add(`<text x="${f2(x)}" y="${f2(y)}" font-size="${size}" text-anchor="${anchor}" font-weight="${weight}" fill="${fill}" font-family="${FONT}">${esc(t)}</text>`);
  }
  line(x1: number, y1: number, x2: number, y2: number, w = 0.25, stroke = INK, dash?: string) {
    this.add(`<line x1="${f2(x1)}" y1="${f2(y1)}" x2="${f2(x2)}" y2="${f2(y2)}" stroke="${stroke}" stroke-width="${w}"${dash ? ` stroke-dasharray="${dash}"` : ""}/>`);
  }
  poly(pts: [number, number][], fill = "none", w = 0.35, stroke = INK) {
    this.add(`<polygon points="${pts.map(([x, y]) => `${x.toFixed(3)},${y.toFixed(3)}`).join(" ")}" fill="${fill}" stroke="${stroke}" stroke-width="${w}" stroke-linejoin="round"/>`);
  }
  rect(x: number, y: number, w: number, h: number, fill = "none", sw = 0.35, stroke = INK) {
    this.add(`<rect x="${f2(x)}" y="${f2(y)}" width="${f2(w)}" height="${f2(h)}" fill="${fill}" stroke="${stroke}" stroke-width="${sw}"/>`);
  }
}

function arrow(s: Svg, x: number, y: number, ang: number) {
  const a = (ang * Math.PI) / 180, l = 2.2, wd = 0.7;
  const bx = x - l * Math.cos(a), by = y - l * Math.sin(a), px = -Math.sin(a) * wd, py = Math.cos(a) * wd;
  s.poly([[x, y], [bx + px, by + py], [bx - px, by - py]], INK, 0.1);
}
function dimH(s: Svg, x1: number, x2: number, yf1: number, yf2: number, y: number, label: string) {
  for (const [x, yf] of [[x1, yf1], [x2, yf2]]) s.line(x, yf + (y > yf ? 1 : -1), x, y + (y > yf ? 1.5 : -1.5), 0.18);
  s.line(x1, y, x2, y, 0.18); arrow(s, x1, y, 180); arrow(s, x2, y, 0);
  s.text((x1 + x2) / 2, y - 1, label, 3, "middle");
}
function dimV(s: Svg, x: number, y1: number, y2: number, label: string, xt?: number) {
  s.line(x, y1, x, y2, 0.18); arrow(s, x, y1, y1 < y2 ? 270 : 90); arrow(s, x, y2, y1 < y2 ? 90 : 270);
  s.text(xt ?? x + 1.6, (y1 + y2) / 2 + 1, label, 3);
}

function viewGroup(cad: CadModel, X: (z: number) => number, Y: (r: number) => number, hatch: string[]) {
  const s = new Svg();
  const rev = cad.parts.filter((p) => p.profile);
  const inside = rev.filter((p) => !p.section);
  const cut = rev.filter((p) => p.section);
  const rank = (k: string) => (["housing", "follower", "button", "drive", "plug", "feed"].includes(k) ? 0 : ["grip", "cap", "capseal", "vent", "magnet"].includes(k) ? 2 : 1);
  for (const p of [...cut].sort((a, b) => rank(a.key) - rank(b.key))) s.poly(envelope(p.profile!).map(([r, z]) => [X(z), Y(-r)]), "#ffffff");
  for (const p of inside) {
    if (p.key === "spring") {
      const [[ra, za], , [rb, zb]] = p.profile!;
      const rm = (ra + rb) / 2;
      for (let z = za; z <= zb + 1e-6; z += 0.9) s.add(`<circle cx="${X(z).toFixed(3)}" cy="${Y(rm).toFixed(3)}" r="${Math.abs(Y(0.15) - Y(0)).toFixed(3)}" fill="${INK}"/>`);
    } else s.poly(p.profile!.map(([r, z]) => [X(z), Y(r)]), "#ffffff", 0.3);
  }
  cut.forEach((p, i) => s.poly(p.profile!.map(([r, z]) => [X(z), Y(r)]), `url(#${hatch[i % hatch.length]})`));
  for (const p of cad.parts) for (const b of p.boxes ?? []) s.poly([[X(b.z0), Y(b.y0)], [X(b.z1), Y(b.y0)], [X(b.z1), Y(b.y1)], [X(b.z0), Y(b.y1)]], "#f4ecd4", 0.3);
  return s.b.join("");
}

export interface SheetMeta { id: string; title: string; date: string; rev?: string }

export function drawingSvg(spec: PenSpec, cad: CadModel, meta: SheetMeta): string {
  const k = cad.key;
  const zs = cad.parts.flatMap((p) => [...(p.profile ?? []).map((q) => q[1]), ...(p.boxes ?? []).flatMap((b) => [b.z0, b.z1])]);
  const zMin = Math.min(...zs), zMax = Math.max(...zs);
  const span = zMax - zMin;
  const sc = [2, 1.5, 1.25, 1].find((v) => span * v <= 300) ?? 0.75;
  const x0 = 20 + (330 - span * sc) / 2 - zMin * sc;
  const ya = 92;
  const X = (z: number) => x0 + z * sc, Y = (r: number) => ya - r * sc;
  const s = new Svg();
  const hatch = ["h45", "h135", "h45b", "h135b"];
  const pat = (id: string, sz: number, rot: number) =>
    `<pattern id="${id}" width="${sz}" height="${sz}" patternUnits="userSpaceOnUse" patternTransform="rotate(${rot})"><rect width="${sz}" height="${sz}" fill="#fff"/><line x1="0" y1="0" x2="0" y2="${sz}" stroke="${INK}" stroke-width="0.18"/></pattern>`;
  s.add(`<defs>${pat("h45", 1.4, 45)}${pat("h135", 1.4, 135)}${pat("h45b", 2.2, 45)}${pat("h135b", 2.2, 135)}<clipPath id="detclip"><rect x="14" y="160" width="150" height="84"/></clipPath></defs>`);
  s.rect(0, 0, W, H, "#ffffff", 0);
  s.rect(8, 8, W - 16, H - 16, "none", 0.7);
  s.add(`<rect x="8" y="8" width="${W - 16}" height="2.2" fill="${GOLD}"/>`);
  s.text(14, 18, "ASSEMBLY  HALF SECTION", 3.6, "start", "600");
  s.text(14, 23, `SCALE ${sc}:1   UPPER HALF SECTIONED, LOWER HALF EXTERIOR`, 2.6, "start", "400", MUTED);
  s.add(viewGroup(cad, X, Y, hatch));
  s.line(X(zMin) - 6, ya, X(zMax) + 6, ya, 0.18, INK, "6 1.2 1 1.2");

  const R = k.od / 2;
  const outerR = Math.max(R, (k.capOd ?? 0) / 2, (k.gripOd ?? 0) / 2);
  const low = ya + outerR * sc;
  const rearZ = k.buttonEnd ?? k.nose + k.barrelLen;
  dimH(s, X(0), X(rearZ), Y(-R), ya, low + 14, (rearZ).toFixed(1));
  dimH(s, X(0), X(k.nose), Y(-R), Y(-R), low + 7, k.nose.toFixed(1));
  dimH(s, X(k.nose), X(k.nose + k.barrelLen), Y(-R), Y(-R), low + 7, k.barrelLen.toFixed(1));
  const zd = k.nose + k.barrelLen * 0.55;
  dimV(s, X(zd), Y(R), Y(-R), `Ø${k.od.toFixed(2)}`);
  if (k.gripOd) dimV(s, X(k.nose + 14), Y(k.gripOd / 2), Y(-k.gripOd / 2), `Ø${k.gripOd.toFixed(2)}`);
  if (k.capOd) dimV(s, X(k.nose + 10), Y(k.capOd / 2), Y(-k.capOd / 2), `Ø${k.capOd.toFixed(2)}`, X(k.nose + 10) - 16);
  const clip = cad.parts.find((p) => p.key === "clip");
  if (clip?.boxes) {
    const st = clip.boxes[1];
    dimH(s, X(st.z0), X(st.z1), Y(st.y1), Y(st.y1), Y(st.y1) - 8, (st.z1 - st.z0).toFixed(1));
  }

  // detail A at 5:1
  s.add(`<circle cx="${f2(X(3))}" cy="${f2(ya)}" r="${f2(9 * sc)}" fill="none" stroke="${MUTED}" stroke-width="0.25" stroke-dasharray="3 1.5"/>`);
  s.text(X(3) - 9 * sc - 4, ya + 9 * sc + 2, "A", 3.6, "start", "600");
  s.text(14, 154, "DETAIL A  WRITING END  SCALE 5:1", 3, "start", "600");
  const sd = 5, xd0 = 14 + 6 * sd + 6 + (spec.system === "fountain" ? 50 : 0), yd = 204;
  const Xd = (z: number) => xd0 + z * sd, Yd = (r: number) => yd - r * sd;
  s.add(`<g clip-path="url(#detclip)">${viewGroup(cad, Xd, Yd, hatch)}</g>`);
  s.line(14, yd, 164, yd, 0.18, INK, "6 1.2 1 1.2");
  s.rect(14, 160, 150, 84, "none", 0.25, MUTED);
  if (k.noseHole) {
    dimV(s, Xd(0) - 4, Yd(k.noseHole / 2), Yd(-k.noseHole / 2), `Ø${k.noseHole.toFixed(2)}`, Xd(0) - 18);
    dimH(s, Xd(-k.tipOut), Xd(0), Yd(-0.35), Yd(-k.noseHole / 2), yd + 22, k.tipOut.toFixed(1));
  }

  // parts list
  const bx = 176, by = 150, bw = 236;
  const cols: [string, number][] = [["ITEM", 10], ["PART NO", 20], ["DESCRIPTION", 50], ["MATERIAL", 34], ["PROCESS", 44], ["REUSE", 54], ["MASS g", 24]];
  s.rect(bx, by, bw, 6, "#f3f4f6", 0.3);
  let cx = bx;
  for (const [n, w] of cols) { s.text(cx + 1.5, by + 4.2, n, 2.5, "start", "600"); cx += w; }
  const rowsH = Math.min(4.6, 94 / Math.max(cad.parts.length + 1, 1));
  let total = 0;
  cad.parts.forEach((p, i) => {
    const y = by + 6 + i * rowsH;
    s.rect(bx, y, bw, rowsH, "none", 0.2);
    const mass = partMass(p);
    total += mass * p.qty;
    const reuse = p.decision === "Added" ? "CAD template" : `${p.decision}${p.src ? " " + p.src : ""}`;
    const vals = [i + 1, p.partNo, p.name.slice(0, 26), CAD_MATS[p.mat].label.slice(0, 18), p.process.slice(0, 22), reuse.slice(0, 26), (mass * p.qty).toFixed(2)];
    let c = bx;
    cols.forEach(([, w], j) => { s.text(c + 1.5, y + rowsH * 0.72, vals[j], Math.min(2.3, rowsH * 0.55)); c += w; });
  });
  const yt = by + 6 + cad.parts.length * rowsH;
  s.text(bx + bw - 22, yt + 4, total.toFixed(2), 2.6, "start", "600");
  s.text(bx + bw - 58, yt + 4, "TOTAL MASS", 2.4, "start", "400", MUTED);

  // notes
  const notes = ["DIMENSIONS IN mm", "GENERAL TOL ISO 2768 m", "FIRST ANGLE PROJECTION", "REFILL Ø NOMINAL, VERIFY", "DRAFT NOT MODELLED, SEE DFM", "FITS PER DFM REPORT"];
  if (spec.mech === "click") notes.push("CAM SHOWN AS PUSH ROD");
  if (spec.child) notes.push("CAP VENT PER ISO 11540");
  s.text(352, 30, "NOTES", 2.8, "start", "600");
  notes.forEach((n, i) => s.text(352, 39 + i * 4.2, `${i + 1}. ${n}`, 2.2));

  // title block
  const tx = 176, ty = 250, tw = 236, th = 39;
  s.rect(tx, ty, tw, th, "none", 0.5);
  s.add(`<rect x="${tx}" y="${ty}" width="70" height="${th}" fill="#faf4e1" stroke="${INK}" stroke-width="0.3"/>`);
  s.text(tx + 4, ty + 9, "AUDECY", 6, "start", "600", GOLD);
  s.text(tx + 4, ty + 15, "AI TECHNOLOGIES PVT. LTD.", 2.5);
  s.text(tx + 4, ty + 20, "NITK STEP, SURATHKAL", 2.3, "start", "400", MUTED);
  s.text(tx + 4, ty + 26, `REV ${meta.rev ?? "A"}`, 2.3, "start", "400", MUTED);
  s.text(tx + 4, ty + 33, "GENERATED, NOT FOR RELEASE", 2.5, "start", "600", "#ae2a1d");
  s.line(tx + 70, ty + 13, tx + tw, ty + 13, 0.3);
  s.line(tx + 70, ty + 26, tx + tw, ty + 26, 0.3);
  for (const xx of [tx + 150, tx + 194]) s.line(xx, ty + 13, xx, ty + th, 0.3);
  s.text(tx + 73, ty + 4.5, "TITLE", 2, "start", "400", MUTED);
  s.text(tx + 73, ty + 10.5, meta.title.toUpperCase().slice(0, 52), 3.4, "start", "600");
  const cells: [string, string, number, number][] = [
    ["DRAWING NO", meta.id, tx + 73, ty + 17], ["SCALE", `${sc}:1  DETAIL 5:1`, tx + 153, ty + 17], ["SHEET", "1 / 1  A3", tx + 197, ty + 17],
    ["DRAWN", "PEN NPI AGENT", tx + 73, ty + 30], ["CHECKED", "______", tx + 153, ty + 30], ["DATE", meta.date, tx + 197, ty + 30],
  ];
  for (const [lab, val, x, y] of cells) { s.text(x, y, lab, 2, "start", "400", MUTED); s.text(x, y + 6, val, 3, "start", "500"); }
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}mm" height="${H}mm" viewBox="0 0 ${W} ${H}">${s.b.join("")}</svg>`;
}
