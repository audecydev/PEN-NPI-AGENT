import { run, SCENARIOS_ALL } from "../packages/core/src/index.ts";
const r = run(SCENARIOS_ALL[1].spec);
const p = r.packet!;
console.log(JSON.stringify(p.ops[0]), '\n', JSON.stringify(p.dfmea[0]), '\n', JSON.stringify(p.process[0]), '\n', p.ops.length, p.dfmea.length, p.process.length);
console.log(JSON.stringify(r.search.lessons[0]), JSON.stringify(r.search.excluded[0]?.reason), JSON.stringify(r.rules.slice(0,3)));
console.log(JSON.stringify(r.design!.parts[0]), JSON.stringify(r.design!.metrics));
