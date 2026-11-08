import { run, SCENARIOS_ALL, interference } from "../packages/core/src/index.ts";
for (const s of SCENARIOS_ALL) { const r = run(s.spec); if (r.cad.ok) { const c = interference(r.cad.parts); if (c.length) console.log(s.id, JSON.stringify(c)); } }
console.log("done");
