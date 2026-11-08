import { run, SCENARIOS_ALL, section } from "../packages/core/src/index.ts";
const id = process.argv[2] ?? "reuse";
const r = run(SCENARIOS_ALL.find(s=>s.id===id)!.spec, { date: "2026-11-07" });
console.log(r.cadSource, r.cad.key);
for (const f of r.dfm!.findings.filter(f=>f.level!=="pass")) console.log(f.level, f.partNo, f.check, '|', f.value, '|', f.message);
for (const p of r.dfm!.parts) console.log(p.partNo, p.name, p.mass, p.wallMin, p.wallMax, p.cycleS, p.capacityNote);
for (const p of r.cad.parts) if (p.profile) { const s=section(p.profile); console.log(p.partNo, 'cores', JSON.stringify(s.cores), 'uc', JSON.stringify(s.undercut)); }
