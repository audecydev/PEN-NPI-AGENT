# Pen NPI Agent v2: CAD, DFM and DFA

Addendum to the v1 PRD, SRD and BRD. v1 stopped at part decisions and documents. v2 adds a
generated 3D model and drawing for every design, design for manufacture and design for
assembly, and a release gate that blocks on DFM failures. Everything runs live in the browser
workbench; STEP export runs on the API.

## What changed from v1

| Area | v1 | v2 |
|---|---|---|
| Engine | Rules, archive search, part decisions, FMEA, control plan | Same engine, recovered unchanged into `packages/core/src/legacy/engine.js` |
| Design | Part list only | Parametric CAD per mechanism; reuse regenerates the archived record's geometry |
| Checks | Engine rules F01 to F80 | Plus DFM (geometry and process) and DFA (Boothroyd Dewhurst) |
| Release | Released record saved to the `releases` collection | Same collection and shape; release now also needs zero DFM failures |
| Files | CSV packet | Plus A3 drawing (SVG), CAD payload (JSON), STEP and glTF from the API |

## Flow

```
brief -> parseBrief -> spec -> checkRules -> searchArchive(archive + live releases)
      -> verdict (reuse | mix | new, engineer can override)
      -> decideParts -> buildCad -> runDfm, runDfa -> buildPacket -> release
```

* **Reuse**: the CAD is built from the top record's own values (OD, length, material, refill),
  so the model and drawing are the archived design.
* **Mix**: geometry is built to the spec; each carried over part keeps its source record id,
  shown in the BOM, the drawing parts list and the "Reuse" colouring of the 3D view.
* **New**: geometry is designed from the spec by the templates.
* **No template** (multi pens, retractable nib): no CAD, routed to a design engineer; DFA still
  runs on the engine part list.

## Geometry model

Every turned or moulded part is a closed (r, z) polygon revolved about the pen axis; clips and
nibs add boxes. The same polygons drive the 3D view (three.js lathe), the drawing, the masses
(Pappus theorem, exact), DFM measurements and the STEP exporter. The exporter re-checks every
solid's volume against the core; all 17 CAD scenarios agree to the cubic millimetre.

Templates: click, twist, capped, magnetic; ballpoint, gel, hybrid and rollerball refills;
capped fountain pens.

Nose joint: a male nose spigot inside the barrel bore when the bore leaves at least the joint
minimum around the refill (0.3 mm metal, 0.55 mm plastic); otherwise a female nose socket over
a turned down barrel end. If neither fits, DFM fails the design with the OD increase needed.

## DFM checks

| Check | Applies to | Basis |
|---|---|---|
| Minimum wall, body and joint zone | moulded, turned, drawn | material minimum; short joint features separately |
| Wall uniformity, maximum wall, solid section | moulded | sink and warp |
| Undercut | moulded | bore profile must release on straight cores from its open ends |
| Core pin L/D, draft on each core | moulded | 0.5 or 1 degree per side, wall left after draft |
| Shrinkage, cycle time, cavities, tool cost | moulded | wall squared cooling estimate, monthly volume |
| Stock (bar or drawn tube), utilisation, bore depth, chatter, cycle, machines | turned | removed volume over material removal rate |
| Blank size, draw stages | deep drawn | blank from area, 1.9 first draw then 1.25 |
| Clip spring length | stamped | fatigue in pocketing |
| Spring index, travel to solid | coiled | 4 to 12; 3 mm click travel |
| Magnet retention | NdFeB | brittle, bond and coat |
| Nose joint wall, nose to barrel fit | assembly | fit class needed beyond ISO 2768 m |
| Assembly interference | assembly | every pair of parts, sampled every 0.1 mm |
| Finish growth | anodise, PVD, chrome | fits after finish |

Score is the share of judged checks passed, with warnings counted half.

## DFA

Per part: moves relative to the rest, must be another material, must be separate for service.
Any yes makes it essential. Handling time from alpha plus beta symmetry and size (springs add
tangling), insertion time from the joining method. DFA index = 3 x Nmin / total seconds.
Candidates for elimination carry a redesign suggestion and the projected index.

## API (apps/api)

| Method | Path | Does |
|---|---|---|
| GET | /api/health | archive and release counts |
| GET | /api/scenarios | the 29 edge cases |
| POST | /api/brief | `{text}` -> parsed spec fields |
| GET | /api/archive | paged archive plus live releases |
| POST | /api/design | `{spec, choice?, accepted?, id?}` -> full run: rules, search, parts, CAD, DFM, DFA, packet, drawing |
| POST | /api/releases | release; 422 when rules block or DFM fails, 409 on a duplicate id |
| POST | /api/cad/export | STEP (assembly and per part) and glTF through OpenCascade, with a volume cross check |
| GET | /api/cad/files/:id/* | download an exported file |

## Open problems

| ID | Problem |
|---|---|
| CAD-001 | Click cam is drawn as a push rod; the real cam track and rotator need their own template |
| CAD-002 | Multi pen and retractable nib templates not built |
| CAD-003 | Draft is checked, not modelled; threads are specified, not modelled |
| CAD-004 | Refill tip sections are nominal; replace with supplier drawings |
| DFM-001 | Cycle times and tool costs are planning estimates; calibrate against Wipro tool room quotes |
| DFM-002 | No mould flow or tolerance stack analysis yet |
| DFA-001 | Handling and insertion times use chart approximations, not the full Boothroyd Dewhurst tables |
| INT-001 | v1 source not available in this session; engine recovered from the published build. Diff against the v1 repo before merging |
