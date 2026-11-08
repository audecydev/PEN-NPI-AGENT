import { describe, expect, it } from "vitest";
import {
  ARCHIVE_ALL, buildCad, CAD_MATS, DEFAULT_SPEC, interference, partVolume, revolvedVolume, run, SCENARIOS_ALL, section,
  specFromRecord, templateFor, toArchiveRecord,
} from "../src/index.js";

const byId = (id: string) => SCENARIOS_ALL.find((s) => s.id === id)!;

describe("recovered engine", () => {
  it("still has the 1,751 record archive and 29 scenarios", () => {
    expect(ARCHIVE_ALL).toHaveLength(1751);
    expect(SCENARIOS_ALL).toHaveLength(29);
  });
  it("gives the published verdicts for the core paths", () => {
    expect(run(byId("reuse").spec).choice).toBe("reuse");
    expect(run(byId("mix").spec).choice).toBe("mix");
    expect(run(byId("new").spec).choice).toBe("new");
  });
});

describe("measurement", () => {
  it("Pappus volume of a tube equals pi (R^2 - r^2) L", () => {
    const v = revolvedVolume([[3, 0], [5, 0], [5, 10], [3, 10]]);
    expect(v).toBeCloseTo(Math.PI * (25 - 9) * 10, 6);
  });
  it("reads the wall of a tube and its two cores", () => {
    const s = section([[3, 0], [4, 0], [4, 100], [3, 100]]);
    expect(s.wallMin).toBeCloseTo(1, 3);
    expect(s.cores).toHaveLength(2);
    expect(s.undercut).toBeNull();
  });
  it("finds an internal pocket as an undercut", () => {
    const s = section([[3, 0], [5, 0], [5, 20], [3, 20], [3, 12], [3.8, 12], [3.8, 8], [3, 8]]);
    expect(s.undercut).not.toBeNull();
  });
});

describe("every scenario through CAD, DFM and DFA", () => {
  for (const sc of SCENARIOS_ALL) {
    it(sc.id, () => {
      const r = run(sc.spec, { date: "2026-11-07" });
      if (r.blocked) {
        expect(r.cad.parts).toHaveLength(0);
        expect(r.dfm).toBeNull();
        return;
      }
      expect(r.dfa).not.toBeNull();
      if (!templateFor(r.cadSpec).id) {
        expect(r.cad.ok).toBe(false);
        expect(r.dfa!.rows.length).toBeGreaterThan(0);
        return;
      }
      expect(r.cad.ok).toBe(true);
      expect(interference(r.cad.parts)).toEqual([]);
      for (const p of r.cad.parts) expect(partVolume(p)).toBeGreaterThan(0);
      const barrel = r.cad.parts.find((p) => p.key === "barrel")!;
      expect(2 * Math.max(...barrel.profile!.map((q) => q[0]))).toBeCloseTo(r.cad.geo.od, 6);
      expect(r.drawing).toContain("<svg");
      expect(r.dfm!.score).toBeGreaterThanOrEqual(0);
      expect(r.dfa!.index).toBeGreaterThan(0);
      expect(r.dfa!.nMin).toBeLessThanOrEqual(r.dfa!.nParts);
    });
  }
});

describe("reuse regenerates the archived geometry", () => {
  it("builds from the record's diameter and length", () => {
    const r = run(byId("reuse").spec);
    const rec = r.search.matches[0].rec;
    expect(r.cadSource.recordId).toBe(rec.id);
    expect(r.cad.geo.od).toBeCloseTo(rec.od, 6);
    expect(r.cad.geo.barrelLen).toBe(rec.barrelLen);
  });
  it("a released design becomes searchable and is found as the top match", () => {
    const spec = { ...byId("mix").spec, mat: "tit" as const, finish: "bead", barrelLen: 111 };
    const first = run(spec, { newId: "PEN-2026-900" });
    const rec = toArchiveRecord(spec, first.design!);
    const again = run(spec, { extraRecords: [rec] });
    expect(again.search.matches[0].rec.id).toBe("PEN-2026-900");
  });
});

describe("DFM catches real problems", () => {
  it("flags the magnet pocket in a moulded magnetic cap as an undercut", () => {
    const spec = { ...DEFAULT_SPEC, mech: "magnetic" as const, mat: "abs" as const, finish: "moulded", system: "gel" as const, refill: "RB", tip: "0.5", clip: false };
    const r = run(spec);
    expect(r.blocked).toBe(false);
    expect(r.dfm!.findings.some((f) => f.check === "Undercut" && f.level === "fail" && f.partNo === "PC-210")).toBe(true);
  });
  it("routes high volume aluminium barrels to deep drawing", () => {
    const r = run(byId("highvol").spec);
    expect(r.cad.parts.find((p) => p.key === "barrel")!.process).toBe("Deep drawing");
  });
  it("every CAD material is known", () => {
    for (const sc of SCENARIOS_ALL) {
      const cad = buildCad(sc.spec, null);
      for (const p of cad.parts) expect(CAD_MATS[p.mat]).toBeDefined();
    }
  });
  it("spec from a record keeps the customer and life requirements", () => {
    const s = specFromRecord(byId("mix").spec, ARCHIVE_ALL[0]);
    expect(s.write).toBe(byId("mix").spec.write);
  });
});

describe("DFA", () => {
  it("plastic click pens list the housing and clip as candidates to combine", () => {
    const r = run(byId("laserplastic").spec);
    const names = r.dfa!.suggestions.map((s) => s.part);
    expect(names).toContain("Pocket clip");
    expect(r.dfa!.redesign.index).toBeGreaterThan(r.dfa!.index);
  });
});
