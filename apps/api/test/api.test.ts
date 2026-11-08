import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { beforeAll, describe, expect, it } from "vitest";

process.env.PEN_NPI_DATA = mkdtempSync(join(tmpdir(), "pen-npi-"));
process.env.LOG_LEVEL = "silent";
const { buildApp } = await import("../src/app.js");
const app = buildApp();
const mix = { mech: "click", system: "ball", refill: "G2", tip: "0.7", mat: "alu", finish: "anodise", barrelLen: 104, click: 12500 };

describe("api", () => {
  beforeAll(async () => { await app.ready(); });
  it("health reports the archive", async () => {
    const r = await app.inject({ method: "GET", url: "/api/health" });
    expect(r.json().archive).toBe(1751);
  });
  it("design runs the full pipeline", async () => {
    const r = await app.inject({ method: "POST", url: "/api/design", payload: { spec: mix } });
    const j = r.json();
    expect(j.choice).toBe("mix");
    expect(j.cad.ok).toBe(true);
    expect(j.dfm.findings.length).toBeGreaterThan(5);
    expect(j.dfa.index).toBeGreaterThan(0);
  });
  it("release stores a record that the next search finds first", async () => {
    const spec = { ...mix, mat: "tit", finish: "bead", barrelLen: 111 };
    const rel = await app.inject({ method: "POST", url: "/api/releases", payload: { spec, id: "PEN-2026-777" } });
    expect(rel.statusCode).toBe(201);
    const again = await app.inject({ method: "POST", url: "/api/design", payload: { spec } });
    expect(again.json().search.matches[0].rec.id).toBe("PEN-2026-777");
    const dup = await app.inject({ method: "POST", url: "/api/releases", payload: { spec, id: "PEN-2026-777" } });
    expect(dup.statusCode).toBe(409);
  });
  it("refuses a blocked spec on release", async () => {
    const r = await app.inject({ method: "POST", url: "/api/releases", payload: { spec: { ...mix, od: 7.5 } } });
    expect(r.statusCode).toBe(422);
  });
  it("exports STEP with volumes that agree with the core", async () => {
    const r = await app.inject({ method: "POST", url: "/api/cad/export", payload: { spec: mix, id: "PEN-2026-EXP" } });
    expect(r.statusCode).toBe(200);
    expect(r.json().report.ok).toBe(true);
    const f = await app.inject({ method: "GET", url: "/api/cad/files/PEN-2026-EXP/PEN-2026-EXP.step" });
    expect(f.statusCode).toBe(200);
    expect(f.body.startsWith("ISO-10303-21")).toBe(true);
  }, 120000);
  it("rejects path traversal", async () => {
    const r = await app.inject({ method: "GET", url: "/api/cad/files/PEN-2026-EXP/..%2F..%2Fpackage.json" });
    expect(r.statusCode).toBe(400);
  });
});
