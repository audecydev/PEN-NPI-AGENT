// Pen NPI API. Same engine as the web workbench; adds the STEP export, which needs the
// OpenCascade kernel (Python, packages/cad-export) and so cannot run in a browser.

import Fastify from "fastify";
import { execFile } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import {
  ARCHIVE_ALL, DEFAULT_SPEC, exportPayload, parseBrief, releaseRecord, run, SCENARIOS_ALL,
  type ArchiveRecord, type PenSpec, type Verdict,
} from "@pen-npi/core";

const exec = promisify(execFile);
const here = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(here, "../../..");
const DATA = process.env.PEN_NPI_DATA ?? join(ROOT, "data");
const RELEASES = join(DATA, "releases.json");
const EXPORTS = join(DATA, "exports");
const SAFE_ID = /^[A-Z0-9-]{3,40}$/;
const SAFE_FILE = /^[A-Za-z0-9._-]{1,80}$/;

function loadReleases(): ArchiveRecord[] {
  try { return JSON.parse(readFileSync(RELEASES, "utf8")); } catch { return []; }
}
function saveReleases(r: ArchiveRecord[]) {
  mkdirSync(DATA, { recursive: true });
  writeFileSync(RELEASES, JSON.stringify(r, null, 2));
}

const VERDICTS = new Set(["reuse", "mix", "new"]);
function body(req: { body: unknown }) {
  const b = (req.body ?? {}) as { spec?: Partial<PenSpec>; choice?: string; accepted?: boolean; id?: string };
  const spec: PenSpec = { ...DEFAULT_SPEC, ...(b.spec ?? {}) };
  const choice = b.choice && VERDICTS.has(b.choice) ? (b.choice as Verdict) : undefined;
  return { spec, choice, accepted: b.accepted ?? true, id: b.id };
}

export function buildApp() {
  const app = Fastify({ logger: { level: process.env.LOG_LEVEL ?? "info" } });

  app.get("/api/health", async () => ({ ok: true, archive: ARCHIVE_ALL.length, releases: loadReleases().length }));
  app.get("/api/scenarios", async () => SCENARIOS_ALL.map(({ id, group, name, shows, brief, spec }) => ({ id, group, name, shows, brief, spec })));
  app.post("/api/brief", async (req) => parseBrief(String((req.body as { text?: string })?.text ?? "")));

  app.get("/api/archive", async (req) => {
    const q = req.query as { limit?: string; offset?: string };
    const all = [...loadReleases(), ...ARCHIVE_ALL];
    const off = Math.max(0, Number(q.offset ?? 0)), lim = Math.min(500, Math.max(1, Number(q.limit ?? 50)));
    return { total: all.length, records: all.slice(off, off + lim) };
  });

  /** Full run: rules, archive search, part decisions, CAD, DFM, DFA, packet and drawing. */
  app.post("/api/design", async (req) => {
    const { spec, choice, accepted, id } = body(req);
    const r = run(spec, { extraRecords: loadReleases(), choice, accepted, newId: id });
    return { ...r, search: { ...r.search, matches: r.search.matches.slice(0, 8) } };
  });

  app.post("/api/releases", async (req, reply) => {
    const { spec, choice, id } = body(req);
    const releases = loadReleases();
    const newId = id ?? `PEN-${new Date().getFullYear()}-${String(201 + releases.length).padStart(3, "0")}`;
    const r = run(spec, { extraRecords: releases, choice, newId });
    if (r.blocked || !r.design) return reply.code(422).send({ error: "Design rules block this spec, so it cannot be released.", rules: r.rules });
    if (r.dfm && r.dfm.counts.fail > 0) return reply.code(422).send({ error: "DFM has open failures. Fix them before release.", findings: r.dfm.findings.filter((f) => f.level === "fail") });
    const rec = releaseRecord(r)!;
    if (releases.some((x) => x.id === rec.id)) return reply.code(409).send({ error: `${rec.id} is already released.` });
    saveReleases([rec, ...releases]);
    return reply.code(201).send(rec);
  });

  /** STEP and glTF through the OpenCascade exporter; volumes are cross checked against the core. */
  app.post("/api/cad/export", async (req, reply) => {
    const { spec, choice, id } = body(req);
    const r = run(spec, { extraRecords: loadReleases(), choice, newId: id });
    if (!r.cad.ok) return reply.code(422).send({ error: r.cad.reason ?? "No CAD for this spec." });
    const payload = exportPayload(r);
    if (!SAFE_ID.test(payload.id)) return reply.code(400).send({ error: "Design id must be capitals, digits and hyphens." });
    const out = join(EXPORTS, payload.id);
    mkdirSync(out, { recursive: true });
    const pf = join(out, "payload.json");
    writeFileSync(pf, JSON.stringify(payload));
    try {
      const pythonBin = process.env.PYTHON ?? (process.platform === "win32" ? "python" : "python3");
      await exec(pythonBin, [join(ROOT, "packages/cad-export/export.py"), pf, out], { timeout: 120000 });
    } catch (e) {
      req.log.error(e);
      return reply.code(500).send({ error: "STEP export failed; see the API log." });
    }
    writeFileSync(join(out, `${payload.id}.svg`), r.drawing ?? "");
    const report = JSON.parse(readFileSync(join(out, "export-report.json"), "utf8"));
    return { id: payload.id, report, files: [`${payload.id}.step`, `${payload.id}.glb`, `${payload.id}.svg`, ...payload.parts.map((p) => `parts/${p.partNo}.step`)] };
  });

  app.get("/api/cad/files/:id/*", async (req, reply) => {
    const { id } = req.params as { id: string; "*": string };
    const rel = (req.params as Record<string, string>)["*"];
    const segs = rel.split("/");
    if (!SAFE_ID.test(id) || segs.length > 2 || !segs.every((s) => SAFE_FILE.test(s)) || (segs.length === 2 && segs[0] !== "parts"))
      return reply.code(400).send({ error: "Bad file path." });
    const f = join(EXPORTS, id, ...segs);
    if (!existsSync(f)) return reply.code(404).send({ error: "Not exported yet." });
    const type = f.endsWith(".svg") ? "image/svg+xml" : f.endsWith(".glb") ? "model/gltf-binary" : "application/step";
    return reply.type(type).header("content-disposition", `attachment; filename="${segs[segs.length - 1]}"`).send(readFileSync(f));
  });

  return app;
}
