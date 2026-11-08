import { run, SCENARIOS_ALL, deriveGeometry } from "../packages/core/src/index.ts";
for (const id of ["child","reuse","laserplastic","scrapped","supplier"]) {
const s=SCENARIOS_ALL.find(s=>s.id===id)!.spec; const r=run(s);
const t=r.search.matches[0].rec; console.log(id, r.choice, t.id, t.mat, t.mech, t.refill, 'od',t.od,'wall',t.wall, 'spec od', s.od, 'geo', JSON.stringify((({od,wall,bore,refillBore,odMin})=>({od,wall,bore,refillBore,odMin}))(deriveGeometry(r.cadSpec))));
}
import { ARCHIVE_ALL } from "../packages/core/src/index.ts";
const bad = ARCHIVE_ALL.filter(r=>{ const g=deriveGeometry({...SCENARIOS_ALL[0].spec, ...r, od:r.od}); return r.od < g.odMin-0.01;}); console.log('records below engine odMin', bad.length, 'of', ARCHIVE_ALL.length);
