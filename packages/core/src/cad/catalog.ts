// CAD side catalogue: values the recovered engine does not carry.
// Refill tip sections are nominal planning values; confirm with supplier drawings.

export const TIP: Record<string, { dia: number; len: number }> = {
  D1: { dia: 1.6, len: 6 },
  G2: { dia: 2.4, len: 10 },
  A2: { dia: 2.0, len: 8 },
  C1: { dia: 2.0, len: 8 },
  RB: { dia: 2.6, len: 9 },
  PR: { dia: 2.4, len: 10 },
  "INT-S": { dia: 7.5, len: 0 },
  "INT-L": { dia: 7.5, len: 0 },
};

/** Part materials. Barrel family materials reuse the engine codes; the rest are internal parts. */
export interface CadMaterial {
  code: string;
  label: string;
  rho: number;           // g/cm3
  process: Process;
  wallMin: number;       // mm, lowest wall the process holds reliably
  wallMax: number;       // mm, above this sink and long cycle (moulding) or waste (machining)
  shrink?: number;       // % linear mould shrinkage
  draftMin?: number;     // degrees per side on cores
  rateInrKg: number;
  colour: string;        // hex for the 3D view
  metal: boolean;
}

export type Process =
  | "Injection moulding"
  | "CNC turning"
  | "Deep drawing"
  | "Stamping"
  | "Spring coiling"
  | "Overmoulding"
  | "Bought out"
  | "Sintered magnet";

export const CAD_MATS: Record<string, CadMaterial> = {
  abs: { code: "abs", label: "ABS", rho: 1.05, process: "Injection moulding", wallMin: 0.9, wallMax: 3.0, shrink: 0.5, draftMin: 0.5, rateInrKg: 190, colour: "#f2f1ec", metal: false },
  pc: { code: "pc", label: "Polycarbonate", rho: 1.2, process: "Injection moulding", wallMin: 1.0, wallMax: 3.8, shrink: 0.6, draftMin: 0.5, rateInrKg: 280, colour: "#e9eef2", metal: false },
  rpet: { code: "rpet", label: "Recycled PET", rho: 1.35, process: "Injection moulding", wallMin: 1.0, wallMax: 3.0, shrink: 1.2, draftMin: 1.0, rateInrKg: 200, colour: "#dfe8e3", metal: false },
  alu: { code: "alu", label: "Aluminium 6061", rho: 2.7, process: "CNC turning", wallMin: 0.5, wallMax: 3.0, rateInrKg: 450, colour: "#b9bdc2", metal: true },
  bra: { code: "bra", label: "Brass CZ121", rho: 8.5, process: "CNC turning", wallMin: 0.5, wallMax: 3.0, rateInrKg: 1100, colour: "#c8a75a", metal: true },
  sst: { code: "sst", label: "Stainless 304", rho: 8.0, process: "CNC turning", wallMin: 0.4, wallMax: 3.0, rateInrKg: 900, colour: "#a9adb1", metal: true },
  tit: { code: "tit", label: "Titanium Gr 2", rho: 4.5, process: "CNC turning", wallMin: 0.45, wallMax: 3.0, rateInrKg: 5000, colour: "#8f9399", metal: true },
  pom: { code: "pom", label: "POM (acetal)", rho: 1.41, process: "Injection moulding", wallMin: 0.6, wallMax: 3.0, shrink: 2.0, draftMin: 0.5, rateInrKg: 260, colour: "#ece9e1", metal: false },
  pp: { code: "pp", label: "Polypropylene", rho: 0.9, process: "Injection moulding", wallMin: 0.6, wallMax: 3.0, shrink: 1.5, draftMin: 1.0, rateInrKg: 120, colour: "#f4f3ef", metal: false },
  tpe: { code: "tpe", label: "TPE", rho: 1.1, process: "Overmoulding", wallMin: 0.5, wallMax: 3.0, shrink: 1.5, draftMin: 1.0, rateInrKg: 280, colour: "#3b3f44", metal: false },
  ss301: { code: "ss301", label: "SS 301 strip", rho: 7.9, process: "Stamping", wallMin: 0.3, wallMax: 1.0, rateInrKg: 260, colour: "#c9a84c", metal: true },
  wire: { code: "wire", label: "Music wire", rho: 7.85, process: "Spring coiling", wallMin: 0.15, wallMax: 1.0, rateInrKg: 150, colour: "#8d9196", metal: true },
  ndfeb: { code: "ndfeb", label: "NdFeB N42", rho: 7.5, process: "Sintered magnet", wallMin: 0.5, wallMax: 5.0, rateInrKg: 6000, colour: "#6d7178", metal: true },
  refill: { code: "refill", label: "Bought out refill", rho: 1.0, process: "Bought out", wallMin: 0, wallMax: 99, rateInrKg: 0, colour: "#d9dbde", metal: false },
};

/** Barrel material code from the engine maps directly to a CAD material. */
export const barrelMat = (mat: string) => CAD_MATS[mat] ?? CAD_MATS.abs;
