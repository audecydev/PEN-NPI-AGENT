// 3D view built straight from the core's section profiles: each revolved part is a lathe of
// its closed (r, z) polygon, clips and nibs are boxes. Section uses a clipping plane through
// the axis; exploded moves parts along the axis by their DFA offsets.

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import type { CadPart } from "@pen-npi/core";

export type ViewMode = "assembly" | "section" | "exploded";
export type ColourMode = "material" | "reuse";

export const REUSE_COLOURS: Record<string, string> = {
  Carryover: "#2f8a5b", Modify: "#d79a1e", New: "#c9a84c", Added: "#8c96a0",
};

function meshFor(p: CadPart, colour: string, clip: THREE.Plane[]): THREE.Object3D {
  const group = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(colour), roughness: 0.5, metalness: ["ss301", "wire", "ndfeb"].includes(p.mat) ? 0.35 : 0.1,
    side: THREE.DoubleSide, clippingPlanes: clip, clipShadows: true,
  });
  if (p.profile) {
    const pts = [...p.profile, p.profile[0]].map(([r, z]) => new THREE.Vector2(Math.max(r, 0), z));
    const g = new THREE.LatheGeometry(pts, p.key === "spring" ? 24 : 72);
    g.computeVertexNormals();
    group.add(new THREE.Mesh(g, mat));
  }
  for (const b of p.boxes ?? []) {
    const g = new THREE.BoxGeometry(b.y1 - b.y0, b.z1 - b.z0, b.w);
    const m = new THREE.Mesh(g, mat);
    m.position.set((b.y0 + b.y1) / 2, (b.z0 + b.z1) / 2, 0);
    group.add(m);
  }
  return group;
}

export function PenViewer({ parts, hidden, mode, colours }: { parts: CadPart[]; hidden: Set<string>; mode: ViewMode; colours: ColourMode }) {
  const host = useRef<HTMLDivElement>(null);
  const ctx = useRef<{ renderer: THREE.WebGLRenderer; scene: THREE.Scene; camera: THREE.PerspectiveCamera; controls: OrbitControls; root: THREE.Group; raf: number } | null>(null);
  const [failed, setFailed] = useState(false);
  const framedFor = useRef<string>("");

  useEffect(() => {
    const el = host.current!;
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
    } catch { setFailed(true); return; }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.localClippingEnabled = true;
    el.appendChild(renderer.domElement);
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(28, 1, 0.5, 4000);
    scene.add(new THREE.HemisphereLight(0xffffff, 0xb9bdb4, 1.6));
    const key = new THREE.DirectionalLight(0xffffff, 1.6); key.position.set(80, 140, 120); scene.add(key);
    const rim = new THREE.DirectionalLight(0xfff3d8, 0.7); rim.position.set(-120, -40, -80); scene.add(rim);
    const root = new THREE.Group();
    root.rotation.z = Math.PI / 2;     // lathe axis (Y) laid along screen X, clip side up
    scene.add(root);
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    const size = () => {
      const w = el.clientWidth, h = el.clientHeight;
      if (!w || !h) return;
      renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix();
    };
    const ro = new ResizeObserver(size); ro.observe(el); size();
    const loop = () => { controls.update(); renderer.render(scene, camera); ctx.current!.raf = requestAnimationFrame(loop); };
    ctx.current = { renderer, scene, camera, controls, root, raf: 0 };
    loop();
    return () => {
      cancelAnimationFrame(ctx.current?.raf ?? 0); ro.disconnect(); controls.dispose(); renderer.dispose();
      renderer.domElement.remove(); ctx.current = null;
    };
  }, []);

  useEffect(() => {
    const c = ctx.current; if (!c) return;
    for (const ch of [...c.root.children]) {
      c.root.remove(ch);
      ch.traverse((o: any) => { o.geometry?.dispose?.(); o.material?.dispose?.(); });
    }
    // section: cut away the half facing the viewer (plane through the axis)
    const clip = mode === "section" ? [new THREE.Plane(new THREE.Vector3(0, 0, -1), 0)] : [];
    const zs = parts.flatMap((p) => (p.profile ?? []).map((q) => q[1]));
    const span = zs.length ? Math.max(...zs) - Math.min(...zs) : 100;
    for (const p of parts) {
      if (hidden.has(p.partNo)) continue;
      const col = colours === "reuse" ? REUSE_COLOURS[p.decision] ?? "#8c96a0" : p.colour;
      const m = meshFor(p, col, clip);
      if (mode === "exploded") m.position.y = p.explode * (span / 140) * 1.4;
      c.root.add(m);
    }
    const sig = parts.map((p) => p.partNo).join() + span.toFixed(0) + mode;
    if (framedFor.current !== sig) {
      framedFor.current = sig;
      const box = new THREE.Box3().setFromObject(c.root);
      const ctr = box.getCenter(new THREE.Vector3()), s = box.getSize(new THREE.Vector3());
      const L = Math.max(s.x, s.y, s.z, 40);
      c.controls.target.copy(ctr);
      // section looks straight at the cut face; the other views look down a little to show the clip
      if (mode === "section") c.camera.position.set(ctr.x, ctr.y + L * 0.06, ctr.z + L * 0.85);
      else c.camera.position.set(ctr.x + L * 0.08, ctr.y + L * 0.22, ctr.z + L * (mode === "exploded" ? 1.05 : 0.95));
      c.camera.near = L / 200; c.camera.far = L * 30; c.camera.updateProjectionMatrix();
    }
  }, [parts, hidden, mode, colours]);

  return (
    <div className="viewer" ref={host}>
      {failed && <div className="vstate">3D needs WebGL, which this browser has turned off. The drawing sheet shows the same geometry.</div>}
      {colours === "reuse" && (
        <div className="vlegend" aria-label="Reuse colours">
          {Object.entries(REUSE_COLOURS).map(([k, v]) => (
            <span key={k}><i style={{ background: v }} />{k === "Added" ? "CAD template" : k}</span>
          ))}
        </div>
      )}
    </div>
  );
}
