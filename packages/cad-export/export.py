"""STEP / glTF exporter for Pen NPI designs.

Reads the parts payload the core produces (exportPayload in packages/core/src/pipeline.ts):
every part is an (r, z) profile revolved about Z, plus optional boxes (clip, nib). Writes an
assembly STEP, one STEP per part and a binary glTF, and checks each solid's volume against the
volume the core computed, so the two sides cannot drift.

Usage:  python export.py payload.json out_dir
"""
from __future__ import annotations

import json
import math
import sys
from pathlib import Path

from build123d import Axis, Box, Color, Compound, Plane, Polygon, Pos, export_gltf, export_step, revolve


def hex_rgb(h: str):
    h = h.lstrip("#")
    return tuple(int(h[i:i + 2], 16) / 255 for i in (0, 2, 4))


def solid_for(part: dict):
    shape = None
    if part.get("profile"):
        pts = [(r, z) for r, z in part["profile"]]
        shape = revolve(Plane.XZ * Polygon(*pts, align=None), Axis.Z, 360)
    for b in part.get("boxes") or []:
        bx = Pos(0, (b["y0"] + b["y1"]) / 2, (b["z0"] + b["z1"]) / 2) * Box(b["w"], b["y1"] - b["y0"], b["z1"] - b["z0"])
        shape = bx if shape is None else shape + bx
    return shape


def export(payload: dict, out: Path) -> dict:
    out.mkdir(parents=True, exist_ok=True)
    (out / "parts").mkdir(exist_ok=True)
    report = {"id": payload["id"], "parts": []}
    solids = []
    for p in payload["parts"]:
        s = solid_for(p)
        vol = float(s.volume)
        expected = p["volume_mm3"]
        # boxes overlapping a ring are unioned by OCC but summed by the core, so allow the overlap
        tol = max(0.5, 0.02 * expected) if p.get("boxes") else max(0.05, 1e-4 * expected)
        ok = bool(s.is_valid) and abs(vol - expected) <= tol
        report["parts"].append({"partNo": p["partNo"], "name": p["name"], "valid": bool(s.is_valid),
                                "volume_occ": round(vol, 3), "volume_core": round(expected, 3), "agrees": ok})
        export_step(s, str(out / "parts" / f"{p['partNo']}.step"))
        s.label = f"{p['partNo']} {p['name']}"
        s.color = Color(*hex_rgb(p.get("colour", "#cccccc")))
        solids.append(s)
    asm = Compound(label=payload["id"], children=solids)
    export_step(asm, str(out / f"{payload['id']}.step"))
    export_gltf(asm, str(out / f"{payload['id']}.glb"), binary=True, linear_deflection=0.02, angular_deflection=0.2)
    report["ok"] = all(p["agrees"] for p in report["parts"])
    (out / "export-report.json").write_text(json.dumps(report, indent=2))
    return report


if __name__ == "__main__":
    payload = json.loads(Path(sys.argv[1]).read_text())
    rep = export(payload, Path(sys.argv[2]))
    for p in rep["parts"]:
        print(f"{p['partNo']:8} {p['name'][:24]:24} occ {p['volume_occ']:10.2f}  core {p['volume_core']:10.2f}  {'ok' if p['agrees'] else 'MISMATCH'}")
    sys.exit(0 if rep["ok"] else 1)
