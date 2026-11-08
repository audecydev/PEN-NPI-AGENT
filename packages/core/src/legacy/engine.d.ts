// Types for the recovered Pen NPI engine (engine.js). Shapes were read from the engine code.

export type Mech = "click" | "twist" | "capped" | "magnetic" | "multi" | "capless";
export type InkSystem = "ball" | "hybrid" | "gel" | "roller" | "fountain";
export type MatCode = "abs" | "pc" | "rpet" | "alu" | "bra" | "sst" | "tit";
export type Verdict = "reuse" | "mix" | "new";

export interface PenSpec {
  customer: string; mech: Mech; system: InkSystem; refill: string; tip: string; color: string;
  mat: MatCode; finish: string; barrelLen: number; od: number; write: number; click: number;
  drop: number; tempMax: number; tempMin: number; clip: boolean; brand: "none" | "laser" | "pad";
  brandLen: number; grip: "none" | "rubber" | "knurl"; child: boolean; upsideDown: boolean;
  market: "IN" | "EU" | "US"; vol: number; cost: number;
}

export interface ArchiveRecord {
  id: string; rev: string; title: string; year: number; plant: string; status: string; customer: string;
  tooling: string; refillSupply: string; mech: Mech; system: InkSystem; refill: string; tip: string;
  mat: MatCode; finish: string; barrelLen: number; od: number; wall: number; clip: boolean; brand: string;
  grip: string; force: number | null; ventedCap: boolean;
  proven: { write: number | null; click: number | null; drop: number | null; tempMax: number | null; tempMin: number | null };
  failures: { mode: string; at: number | null; note: string }[]; source: string; provisional?: boolean;
}

export interface Geo {
  wall: number; wallRule: number; bore: number; refillBore: number; od: number; odMin: number; nose: number;
  stack: number; rear: number; barrelLen: number; overall: number; refillLen: number; refillDia: number;
  minBarrel: number; spare: number; force: number; fill: number; mass: number; barrelGrams: number; route: string;
}

export interface Rule { code: string; severity: "block" | "warn" | "info"; field?: string; message: string; fix?: string }
export interface MatchRow { key: string; label: string; sim: number; req: string; val: string; ok: boolean }
export interface Match { rec: ArchiveRecord; score: number; rows: MatchRow[]; gaps: MatchRow[] }
export interface SearchResult {
  matches: Match[]; excluded: { rec: ArchiveRecord; score: number; reason: string }[];
  lessons: { recId: string; year: number; mode: string; text: string; effect: string }[];
  verdict: Verdict; scanned: number;
}
export interface PartDecision {
  no: number; key: string; name: string; dec: "Carryover" | "Modify" | "New"; src: string | null;
  why: string; tool: boolean; toolNew: boolean; note?: string;
}
export interface Metrics {
  parts: number; carry: number; modify: number; fresh: number; reusePct: number; toolsKept: number;
  toolsAll: number; capex: number; testsAvoided: number; weeks: number; unit: number;
}
export interface Design { id: string; title: string; choice: Verdict; parts: PartDecision[]; geo: Geo; metrics: Metrics }
export interface Packet { ops: any[]; dfmea: any[]; process: any[]; rules: { label: string; result: "pass" | "fail" | "warn" }[] }

export interface Scenario { id: string; group: string; name: string; shows: string; brief: string; spec: PenSpec }

export const REFILLS: Record<string, { label: string; dia: number; len: number; systems: InkSystem[]; maxWrite: Record<string, number>; note: string }>;
export const MECHS: Record<Mech, { label: string; stack: number; rear: number; capped: boolean }>;
export const SYSTEMS: Record<InkSystem, { label: string; mlPerKm: number; cost: number; tips: string[] }>;
export const MATERIALS: Record<MatCode, { label: string; rho: number; rate: number; base: number; k: number; metal: boolean; conv: number; finishes: string[] }>;
export const FINISHES: Record<string, string>;
export const BRANDS: Record<string, string>;
export const GRIPS: Record<string, string>;
export const MARKETS: Record<string, string>;
export const CUSTOMERS: string[];
export function tipLabel(tip: string): string;
export const DEFAULT_SPEC: PenSpec;
export function deriveGeometry(spec: PenSpec): Geo;
export function unitCost(spec: PenSpec, geo: Geo): number;
export function decideParts(spec: PenSpec, search: SearchResult, choice: Verdict, newId: string): Design;
export function toArchiveRecord(spec: PenSpec, design: Design): ArchiveRecord;
export function checkRules(spec: PenSpec): Rule[];
export function hasBlock(rules: Rule[]): boolean;
export function similarity(spec: PenSpec, rec: ArchiveRecord): { score: number; rows: MatchRow[]; gaps: MatchRow[] };
export function exclusionReason(spec: PenSpec, rec: ArchiveRecord): string | null;
export function lessonsFor(spec: PenSpec, recs: ArchiveRecord[]): SearchResult["lessons"];
export function searchArchive(spec: PenSpec, recs: ArchiveRecord[]): SearchResult;
export function buildPacket(spec: PenSpec, design: Design, rules: Rule[], accepted: boolean): Packet;
export function packetCsv(design: Design, packet: Packet): string;
export function parseBrief(text: string): { values: Partial<PenSpec>; found: string[] };
export const SCENARIOS_ALL: Scenario[];
export const ARCHIVE_ALL: ArchiveRecord[];
