// Runtime capabilities of the published page. Every one is optional: the workbench runs
// fully without them, and lights up release history, downloads and the Claude review when
// the viewer grants them.

import type { ArchiveRecord } from "@pen-npi/core";

type Use = (name: string) => Promise<any>;
const claudeUse = (): Use | null => {
  const c = (globalThis as any).claude;
  return c && typeof c.use === "function" ? (c.use.bind(c) as Use) : null;
};

export async function cap<T = any>(name: string): Promise<T | null> {
  const use = claudeUse();
  if (!use) return null;
  try { return await use(name); } catch { return null; }
}

/** Releases saved from this workbench, same collection and shape as the first version. */
export function watchReleases(db: any, onRows: (rows: ArchiveRecord[]) => void, onState: (s: "live" | "stale" | "off") => void) {
  let settled = false;
  const timer = setTimeout(() => { if (!settled) onState("stale"); }, 10000);
  const unsub = db.collection("releases").onSnapshot(
    (snap: any) => {
      const rows = snap.docs.map((d: any) => d.data()).filter((r: any) => r && typeof r.id === "string" && r.proven && r.provisional);
      onRows(rows);
      if (!snap.metadata?.fromCache) { settled = true; clearTimeout(timer); onState("live"); }
    },
    () => { settled = true; clearTimeout(timer); onState("off"); },
  );
  return () => { clearTimeout(timer); unsub?.(); };
}

export function nextId(releases: ArchiveRecord[], year = new Date().getFullYear()) {
  const nums = releases.map((r) => r.id.match(new RegExp(`^PEN-${year}-(\\d{3})$`))).filter(Boolean).map((m) => Number(m![1]));
  return `PEN-${year}-${String(Math.max(200, ...nums) + 1).padStart(3, "0")}`;
}
