import { run, SCENARIOS_ALL, section } from "../packages/core/src/index.ts";
const r = run(SCENARIOS_ALL[1].spec);
console.log(r.cad.geo.od, r.cad.geo.bore, r.cad.geo.wall, JSON.stringify(section(r.cad.parts.find(p=>p.key==="barrel")!.profile!).cores));
