# Pen NPI Agent v2

Agentic NPI workbench demonstrated on a pen: customer brief to released design, now with
generated CAD, drawings, DFM and DFA. The pen is the stand in for Wipro's pistons and cylinders.

```
packages/core        engine (recovered v1, unchanged) + CAD, DFM, DFA, drawing, pipeline
packages/cad-export  Python OpenCascade exporter: STEP, glTF, volume cross check
apps/web             React workbench (also built as the single file published page)
apps/api             Fastify API, same core, plus STEP export
docs/CAD_DFM_DFA.md  what v2 adds, checks, API, open problems
```

## Run

```
npm ci
npm test                      # core 41 tests, api 6 tests (api test runs a real STEP export)
npm run dev:api               # http://localhost:8787
npm run dev:web               # http://localhost:5173, proxies /api
npm run build:artifact        # writes pen-npi-agent.html for the published page
pip install build123d         # for STEP export
```

Sample data is fictional. Refill tip sections, material rates, cycle times and tool costs are
planning values, not Wipro figures.
