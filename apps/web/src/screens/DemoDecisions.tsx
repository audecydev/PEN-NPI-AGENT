import { useState } from "react";

interface DecisionItem {
  id: string;
  category: "Architecture" | "Frontend & Cloudflare" | "Backend & Render" | "CAD & Geometry" | "Data & Security";
  title: string;
  verdict: string;
  rationale: string;
  tradeoffs: string;
  impact: string;
}

const DECISIONS: DecisionItem[] = [
  {
    id: "DEC-001",
    category: "Architecture",
    title: "Deterministic TypeScript Rule Engine vs. External LLM APIs",
    verdict: "Pure client & server deterministic TypeScript engine without external LLM API dependencies.",
    rationale: "Engineering NPI rules (e.g. wall thickness, bore clearances, material pairings, mass calculations, FMEA) require 100% reproducible, mathematically auditable, and instant evaluations. Using an external LLM introduces latency, non-deterministic hallucinations, and token cost for critical physical validation.",
    tradeoffs: "Natural language brief parsing is regex/heuristic-driven rather than open-ended free conversation.",
    impact: "Zero external API key management, offline readiness, near-instant sub-50ms rule evaluation across 40+ engineering constraints."
  },
  {
    id: "DEC-002",
    category: "CAD & Geometry",
    title: "Dual-Layer Geometry (Three.js Revolved Lathe in FE + OpenCascade in BE)",
    verdict: "WebGL LatheGeometry for interactive client-side 3D inspection; Python OpenCascade (build123d) on the backend for true B-Rep STEP exports.",
    rationale: "Browsers cannot efficiently compile or run full B-Rep solids kernels like OpenCascade without heavy 30MB+ WebAssembly downloads. Closed (r, z) polygon profiles are rendered in Three.js in the browser for smooth 60fps exploration, while the exact profile coordinates are sent to the backend for STEP/glTF generation.",
    tradeoffs: "Requires a Python runtime environment on the backend rather than a Node-only container.",
    impact: "Fast, responsive in-browser 3D view with zero lag, while still exporting manufacturing-grade ISO 10303 STEP CAD files."
  },
  {
    id: "DEC-003",
    category: "CAD & Geometry",
    title: "Volume Cross-Check & Pappus Theorem Analytical Verification",
    verdict: "Cross-validate every STEP exported solid volume against analytical Pappus's Centroid Theorem calculated by the core.",
    rationale: "Ensures the generated STEP solid geometry has no self-intersections, inverted normals, or missing faces. Every scenario requires the OpenCascade solid volume to match the analytical core calculation within 1 mm³.",
    tradeoffs: "Slightly higher compute overhead during STEP export to measure CAD body volume.",
    impact: "High confidence that generated STEP files load cleanly into SolidWorks, Autodesk Fusion, or CNC CAM toolpaths."
  },
  {
    id: "DEC-004",
    category: "Frontend & Cloudflare",
    title: "Frontend Deployment on Cloudflare Pages via Edge CDN",
    verdict: "Deploy static React + Vite build (`apps/web/dist`) to Cloudflare Pages.",
    rationale: "Cloudflare Pages provides global edge distribution with near-zero latency, automatic preview deployments, zero server maintenance, and free tier bandwidth.",
    tradeoffs: "Client cannot run server-side code without Cloudflare Workers or an external API.",
    impact: "Global load times < 200ms for UI assets and instant cache invalidation upon git pushes."
  },
  {
    id: "DEC-005",
    category: "Frontend & Cloudflare",
    title: "Reverse-Proxy API Routing via Cloudflare `_redirects`",
    verdict: "Route `/api/*` requests through Cloudflare's edge proxying directly to Render's backend domain (`200` rewrite).",
    rationale: "Eliminates CORS pre-flight OPTIONS request roundtrips, prevents cross-origin cookie/header blockers, and hides the direct backend URL from client network inspect panels.",
    tradeoffs: "Requires maintaining a `_redirects` mapping file with the production backend host.",
    impact: "Unified single-origin feel for the frontend; API calls look like local same-origin endpoints."
  },
  {
    id: "DEC-006",
    category: "Backend & Render",
    title: "Fastify API + Headless Python Worker on Render",
    verdict: "Deploy the Node.js Fastify API (`apps/api`) alongside Python 3 (`build123d`) on Render Web Services.",
    rationale: "Render supports multi-language execution in native Node environments or Docker containers. Fastify provides high-throughput, low-overhead HTTP handling, spawning Python worker scripts on-demand to process CAD payloads.",
    tradeoffs: "Free-tier instances on Render sleep after 15 minutes of inactivity (cold start of 30-50s).",
    impact: "Isolated environment for heavy geometry exports without burdening client browser CPU/RAM."
  },
  {
    id: "DEC-007",
    category: "Architecture",
    title: "Boothroyd-Dewhurst DFA Index & Physics-Driven DFM Verification",
    verdict: "Embed industry-standard Boothroyd-Dewhurst manual assembly analysis and physical mould/machining criteria into the gating pipeline.",
    rationale: "NPI gating must assess not just geometry feasibility, but manufacturing cycle times, tooling costs, ejection drafts, wall thickness ratios, and assembly ergonomics before sign-off.",
    tradeoffs: "Requires strict adherence to component classification tables and standard part catalogs.",
    impact: "Actionable engineering metrics: assembly time in seconds, theoretical minimum parts, and gating blocks on critical DFM violations."
  },
  {
    id: "DEC-008",
    category: "Data & Security",
    title: "Zero Secret & Zero External API Key Architecture",
    verdict: "No third-party secret keys, tokens, or external authentication providers required for core functions.",
    rationale: "Guarantees zero risk of key leakage, quota exhaustion, unexpected billing spikes, or third-party uptime outages during critical design workflows.",
    tradeoffs: "No out-of-the-box OAuth or proprietary cloud sync without additional plugins.",
    impact: "Instant onboarding, self-contained air-gapped demo capability, and seamless zero-configuration deployments."
  }
];

export function DemoDecisions({ onBack }: { onBack?: () => void }) {
  const [filter, setFilter] = useState<string>("All");
  const [search, setSearch] = useState("");

  const categories = ["All", "Architecture", "Frontend & Cloudflare", "Backend & Render", "CAD & Geometry", "Data & Security"];

  const filtered = DECISIONS.filter((d) => {
    const matchesCat = filter === "All" || d.category === filter;
    const matchesQuery = search.trim() === "" ||
      d.title.toLowerCase().includes(search.toLowerCase()) ||
      d.verdict.toLowerCase().includes(search.toLowerCase()) ||
      d.rationale.toLowerCase().includes(search.toLowerCase()) ||
      d.id.toLowerCase().includes(search.toLowerCase());
    return matchesCat && matchesQuery;
  });

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto", padding: "16px 20px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
        <div>
          <div style={{ display: "inline-block", background: "#e0f2fe", color: "#0369a1", padding: "3px 10px", borderRadius: 12, fontSize: 12, fontWeight: 700, marginBottom: 8, letterSpacing: "0.5px" }}>
            ARCHITECTURE & INFRASTRUCTURE
          </div>
          <h1 style={{ margin: "0 0 6px 0", fontSize: 24, fontWeight: 700, color: "var(--text, #111827)" }}>
            Demo Technical Decisions (ADRs)
          </h1>
          <p style={{ margin: 0, color: "var(--muted, #64748b)", fontSize: 14 }}>
            Architectural decisions, trade-offs, and hosting strategy implemented across the Pen NPI workbench.
          </p>
        </div>
        {onBack && (
          <button className="btn" onClick={onBack} style={{ padding: "6px 14px", fontSize: 13 }}>
            ← Back to Workbench
          </button>
        )}
      </div>

      {/* Filter and Search Bar */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center", marginBottom: 20, background: "var(--bg-panel, #f8fafc)", padding: "12px 16px", borderRadius: 8, border: "1px solid var(--border, #e2e8f0)" }}>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", flex: 1 }}>
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setFilter(cat)}
              style={{
                border: "1px solid",
                borderColor: filter === cat ? "#0284c7" : "var(--border, #cbd5e1)",
                background: filter === cat ? "#0284c7" : "white",
                color: filter === cat ? "white" : "var(--text, #334155)",
                borderRadius: 6,
                padding: "5px 12px",
                fontSize: 12.5,
                fontWeight: 600,
                cursor: "pointer",
                transition: "all 0.15s ease"
              }}
            >
              {cat}
            </button>
          ))}
        </div>
        <input
          type="text"
          placeholder="Search decisions..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{
            padding: "6px 12px",
            fontSize: 13,
            borderRadius: 6,
            border: "1px solid var(--border, #cbd5e1)",
            minWidth: 220,
            outline: "none"
          }}
        />
      </div>

      {/* Overview Metric Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 14, marginBottom: 24 }}>
        <div style={{ background: "white", padding: "14px 18px", borderRadius: 8, border: "1px solid var(--border, #e2e8f0)", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
          <div style={{ fontSize: 12, color: "var(--muted, #64748b)", fontWeight: 600 }}>HOSTING TOPOLOGY</div>
          <div style={{ fontSize: 18, fontWeight: 700, marginTop: 4, color: "#0f172a" }}>Cloudflare + Render</div>
          <div style={{ fontSize: 12, color: "#16a34a", marginTop: 2 }}>Static Edge CDN + API Worker</div>
        </div>
        <div style={{ background: "white", padding: "14px 18px", borderRadius: 8, border: "1px solid var(--border, #e2e8f0)", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
          <div style={{ fontSize: 12, color: "var(--muted, #64748b)", fontWeight: 600 }}>API KEYS & SECRETS</div>
          <div style={{ fontSize: 18, fontWeight: 700, marginTop: 4, color: "#0f172a" }}>Zero (0) Required</div>
          <div style={{ fontSize: 12, color: "#0284c7", marginTop: 2 }}>Self-contained rule engine</div>
        </div>
        <div style={{ background: "white", padding: "14px 18px", borderRadius: 8, border: "1px solid var(--border, #e2e8f0)", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
          <div style={{ fontSize: 12, color: "var(--muted, #64748b)", fontWeight: 600 }}>CAD PIPELINE</div>
          <div style={{ fontSize: 18, fontWeight: 700, marginTop: 4, color: "#0f172a" }}>Three.js & OpenCascade</div>
          <div style={{ fontSize: 12, color: "#6366f1", marginTop: 2 }}>Cross-verified solid volume</div>
        </div>
        <div style={{ background: "white", padding: "14px 18px", borderRadius: 8, border: "1px solid var(--border, #e2e8f0)", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
          <div style={{ fontSize: 12, color: "var(--muted, #64748b)", fontWeight: 600 }}>ENGINEERING GATES</div>
          <div style={{ fontSize: 18, fontWeight: 700, marginTop: 4, color: "#0f172a" }}>8 Gates (G1 - G8)</div>
          <div style={{ fontSize: 12, color: "#ea580c", marginTop: 2 }}>DFM / DFA / FMEA validated</div>
        </div>
      </div>

      {/* Decision Cards List */}
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {filtered.map((item) => (
          <div
            key={item.id}
            style={{
              background: "white",
              border: "1px solid var(--border, #e2e8f0)",
              borderRadius: 8,
              padding: "18px 22px",
              boxShadow: "0 1px 3px rgba(0,0,0,0.03)"
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: "#0284c7", background: "#f0f9ff", padding: "2px 8px", borderRadius: 4, border: "1px solid #bae6fd" }}>
                  {item.id}
                </span>
                <span style={{ fontSize: 12, color: "#475569", fontWeight: 600, background: "#f1f5f9", padding: "2px 8px", borderRadius: 4 }}>
                  {item.category}
                </span>
              </div>
            </div>

            <h3 style={{ margin: "0 0 8px 0", fontSize: 16, fontWeight: 700, color: "#0f172a" }}>
              {item.title}
            </h3>

            <div style={{ background: "#f8fafc", borderLeft: "4px solid #0284c7", padding: "8px 12px", borderRadius: 4, marginBottom: 12, fontSize: 13.5, color: "#1e293b", fontWeight: 500 }}>
              <b>Decision:</b> {item.verdict}
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, fontSize: 13, lineHeight: 1.5 }}>
              <div>
                <strong style={{ color: "#334155", display: "block", marginBottom: 2 }}>Rationale:</strong>
                <p style={{ margin: 0, color: "#475569" }}>{item.rationale}</p>
              </div>
              <div>
                <strong style={{ color: "#334155", display: "block", marginBottom: 2 }}>Trade-offs & Mitigations:</strong>
                <p style={{ margin: 0, color: "#475569" }}>{item.tradeoffs}</p>
              </div>
            </div>

            <div style={{ marginTop: 12, paddingTop: 10, borderTop: "1px dashed #e2e8f0", fontSize: 12.5, color: "#047857" }}>
              <b>Production Impact:</b> {item.impact}
            </div>
          </div>
        ))}

        {filtered.length === 0 && (
          <div style={{ textAlign: "center", padding: 40, color: "#94a3b8" }}>
            No decisions match your search criteria.
          </div>
        )}
      </div>
    </div>
  );
}

