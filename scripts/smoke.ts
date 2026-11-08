import { run, SCENARIOS_ALL } from "../packages/core/src/index.ts";
for (const s of SCENARIOS_ALL) {
  const r = run(s.spec, { date: "2026-11-07" });
  console.log(s.id.padEnd(12), r.choice.padEnd(5), r.blocked ? "BLOCKED" : (r.cad.ok ? `cad ${r.cad.template} parts ${r.cad.parts.length}` : `nocad: ${r.cad.reason?.slice(0,40)}`),
    r.dfm ? `dfm ${r.dfm.score} f${r.dfm.counts.fail} w${r.dfm.counts.warn}` : "", r.dfa ? `dfa ${r.dfa.nMin}/${r.dfa.nParts} ${r.dfa.totalS}s idx ${r.dfa.index}` : "");
}
