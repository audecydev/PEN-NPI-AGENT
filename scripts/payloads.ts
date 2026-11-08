// Writes one exporter payload per scenario that has CAD: npx tsx scripts/payloads.ts out/payloads
import { mkdirSync, writeFileSync } from "node:fs";
import { exportPayload, run, SCENARIOS_ALL } from "../packages/core/src/index.ts";
const dir = process.argv[2] ?? "out/payloads";
mkdirSync(dir, { recursive: true });
for (const s of SCENARIOS_ALL) {
  const r = run(s.spec, { newId: `PEN-2026-${s.id.toUpperCase()}` });
  if (r.cad.ok) writeFileSync(`${dir}/${s.id}.json`, JSON.stringify({ ...exportPayload(r), id: `PEN-2026-${s.id.toUpperCase()}` }));
}
