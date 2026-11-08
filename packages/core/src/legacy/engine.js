// Pen NPI engine, recovered from the published Pen NPI Agent build (Nov 2026).
// Logic is unchanged; only module wiring was added at the end. Names are the
// minified ones; engine.d.ts and index.ts give them readable aliases.
import ARCHIVE from "../data/archive.json" with { type: "json" };
import SCENARIOS from "../data/scenarios.json" with { type: "json" };
var d = {
    D1: {
      label: `D1 mini`,
      dia: 2.35,
      len: 67,
      systems: [`ball`, `hybrid`, `gel`],
      maxWrite: { ball: 1e3, hybrid: 800, gel: 400 },
      note: `Used in multi pens and compact pens`,
    },
    G2: {
      label: `G2 Parker style`,
      dia: 6,
      len: 98.1,
      systems: [`ball`, `hybrid`, `gel`],
      maxWrite: { ball: 4500, hybrid: 3e3, gel: 1200 },
      note: `Most common retractable format`,
    },
    A2: {
      label: `A2 slim`,
      dia: 3.2,
      len: 106.8,
      systems: [`ball`],
      maxWrite: { ball: 2500 },
      note: `Thin metal refill`,
    },
    C1: {
      label: `C1 Cross style`,
      dia: 3.05,
      len: 117.4,
      systems: [`ball`, `gel`],
      maxWrite: { ball: 2500, gel: 900 },
      note: `Screw in refill for twist pens`,
    },
    RB: {
      label: `RB rollerball`,
      dia: 6.3,
      len: 110,
      systems: [`gel`, `roller`],
      maxWrite: { gel: 1500, roller: 1200 },
      note: `Not the same as a G2`,
    },
    PR: {
      label: `PR pressurised`,
      dia: 4.8,
      len: 90,
      systems: [`ball`],
      maxWrite: { ball: 3e3 },
      note: `Sealed gas refill, writes upside down. Fits G2 pens with an adapter`,
    },
    "INT-S": {
      label: `International cartridge, short`,
      dia: 7.5,
      len: 38,
      systems: [`fountain`],
      maxWrite: { fountain: 1400 },
      note: `Diameter is a planning value`,
    },
    "INT-L": {
      label: `International cartridge, long`,
      dia: 7.5,
      len: 73,
      systems: [`fountain`],
      maxWrite: { fountain: 2800 },
      note: `Diameter is a planning value`,
    },
  },
  f = {
    click: { label: `Click`, stack: 14, rear: 12, capped: !1 },
    twist: { label: `Twist`, stack: 10, rear: 0, capped: !1 },
    capped: { label: `Screw or push cap`, stack: 4, rear: 0, capped: !0 },
    magnetic: { label: `Magnetic cap`, stack: 4, rear: 0, capped: !0 },
    multi: { label: `Four colour multi pen`, stack: 40, rear: 10, capped: !1 },
    capless: { label: `Retractable nib`, stack: 22, rear: 12, capped: !1 },
  },
  p = {
    ball: {
      label: `Ballpoint`,
      mlPerKm: 0.267,
      cost: 6,
      tips: [`0.5`, `0.7`, `1.0`, `1.4`],
    },
    hybrid: {
      label: `Hybrid ink`,
      mlPerKm: 0.4,
      cost: 8,
      tips: [`0.5`, `0.7`, `1.0`],
    },
    gel: {
      label: `Gel`,
      mlPerKm: 0.6,
      cost: 9,
      tips: [`0.38`, `0.5`, `0.7`, `1.0`],
    },
    roller: {
      label: `Rollerball`,
      mlPerKm: 0.8,
      cost: 14,
      tips: [`0.5`, `0.7`],
    },
    fountain: {
      label: `Fountain nib`,
      mlPerKm: 0.7,
      cost: 32,
      tips: [`EF`, `F`, `M`, `B`, `STUB`],
    },
  },
  m = {
    abs: {
      label: `ABS plastic`,
      rho: 1.05,
      rate: 0.15,
      base: 1.2,
      k: 0.4,
      metal: !1,
      conv: 3,
      finishes: [`moulded`, `chrome`, `lacquer`],
    },
    pc: {
      label: `Polycarbonate`,
      rho: 1.2,
      rate: 0.28,
      base: 1,
      k: 0.25,
      metal: !1,
      conv: 4,
      finishes: [`moulded`, `lacquer`],
    },
    rpet: {
      label: `Recycled PET`,
      rho: 1.35,
      rate: 0.2,
      base: 1.4,
      k: 0.5,
      metal: !1,
      conv: 4,
      finishes: [`moulded`],
    },
    alu: {
      label: `Aluminium`,
      rho: 2.7,
      rate: 0.45,
      base: 0.7,
      k: 0.4,
      metal: !0,
      conv: 14,
      finishes: [`anodise`, `lacquer`, `brushed`, `bead`],
    },
    bra: {
      label: `Brass`,
      rho: 8.5,
      rate: 1.1,
      base: 0.5,
      k: 0.2,
      metal: !0,
      conv: 14,
      finishes: [`lacquer`, `chrome`, `pvd`],
    },
    sst: {
      label: `Stainless steel`,
      rho: 8,
      rate: 0.9,
      base: 0.4,
      k: 0.1,
      metal: !0,
      conv: 18,
      finishes: [`brushed`, `bead`, `pvd`],
    },
    tit: {
      label: `Titanium`,
      rho: 4.5,
      rate: 5,
      base: 0.45,
      k: 0.2,
      metal: !0,
      conv: 32,
      finishes: [`anodise`, `brushed`, `bead`, `pvd`],
    },
  },
  h = {
    moulded: `As moulded`,
    anodise: `Anodised`,
    lacquer: `Lacquered`,
    pvd: `PVD coated`,
    chrome: `Chrome plated`,
    brushed: `Brushed`,
    bead: `Bead blasted`,
  },
  g = { none: `None`, laser: `Laser engraving`, pad: `Pad printing` },
  _ = { none: `None`, rubber: `Rubber grip`, knurl: `Knurled` },
  v = { IN: `India`, EU: `European Union`, US: `United States` },
  y = [`OPEN`, `CUST-014`, `CUST-027`, `CUST-033`],
  b = (e) =>
    e === `STUB` ? `Stub 1.1 mm` : /^[A-Z]+$/.test(e) ? `${e} nib` : `${e} mm`,
  x = {
    customer: `OPEN`,
    mech: `click`,
    system: `ball`,
    refill: `G2`,
    tip: `0.7`,
    color: `Blue`,
    mat: `alu`,
    finish: `anodise`,
    barrelLen: 104,
    od: 0,
    write: 1200,
    click: 1e4,
    drop: 1.5,
    tempMax: 50,
    tempMin: 0,
    clip: !0,
    brand: `laser`,
    brandLen: 40,
    grip: `none`,
    child: !1,
    upsideDown: !1,
    market: `IN`,
    vol: 5e4,
    cost: 75,
  },
  S = (e, t = 0.05) => Math.round(Math.ceil((e - 1e-9) / t) * t * 100) / 100,
  C = (e, t = 1) => Math.round(e * 10 ** t) / 10 ** t,
  ee = (e) => S(Math.max(0.4, m[e.mat].base + m[e.mat].k * (e.drop - 1))),
  w = (e) =>
    e.mech === `click` || e.mech === `multi` || e.mech === `capless`
      ? C(Math.min(3, Math.max(1.8, 2.1 + (0.3 * (e.click - 8e3)) / 2e3)))
      : 0,
  te = (e) =>
    e.mech === `multi` ? 9.6 : C(Math.max(d[e.refill].dia + 1, 4.2)),
  T = 22,
  E = (e) =>
    m[e.mat].metal
      ? e.vol >= 15e4 && e.mat !== `tit`
        ? `Deep drawing`
        : `CNC turning`
      : `Injection moulding`;
function D(e) {
  let t = d[e.refill],
    n = f[e.mech],
    r = te(e),
    i = ee(e),
    a = C(r + 2 * i, 2),
    o = e.od > 0 ? e.od : Math.max(a, 8),
    s = o >= a ? C(o - 2 * i, 2) : r,
    c = C((o - s) / 2, 2),
    l = e.system === `fountain` ? 26 : 0,
    u = t.len + l + 2 + n.stack,
    h = T + e.barrelLen,
    g = Math.ceil(u - T),
    _ = C(h - u),
    v = (((Math.PI / 4) * (o * o - s * s) * e.barrelLen) / 1e3) * m[e.mat].rho,
    y = C(v * 1.35 + (m[e.mat].metal ? 4 : 3) + (n.capped ? v * 0.4 : 0));
  return {
    wall: c,
    wallRule: i,
    bore: s,
    refillBore: r,
    od: C(o, 2),
    odMin: a,
    nose: T,
    stack: n.stack,
    rear: n.rear,
    barrelLen: e.barrelLen,
    overall: C(T + e.barrelLen + n.rear),
    refillLen: t.len,
    refillDia: t.dia,
    minBarrel: g,
    spare: _,
    force: w(e),
    fill: C((e.write / 1e3) * p[e.system].mlPerKm, 2),
    mass: y,
    barrelGrams: v,
    route: E(e),
  };
}
var ne = {
  click: 9,
  twist: 11,
  capped: 5,
  magnetic: 9,
  multi: 26,
  capless: 48,
};
function O(e, t) {
  let n = m[e.mat],
    r =
      (e.clip ? 3 : 0) +
      (e.grip === `none` ? 0 : 2) +
      (n.metal ? 4 : 0) +
      (e.brand === `laser` ? 3 : e.brand === `pad` ? 1.5 : 0),
    i = t.route === `Deep drawing` ? n.conv * 0.55 : n.conv,
    a = e.mech === `multi` ? 4 : 1;
  return Math.round(
    t.barrelGrams * n.rate * (f[e.mech].capped ? 1.4 : 1) +
      ne[e.mech] +
      p[e.system].cost * a +
      r +
      i,
  );
}
function k(e, t, n, r) {
  let i = t.matches.map((e) => e.rec),
    a = i[0],
    o = (e) => i.find(e),
    s = D(e),
    c = ee(e),
    l = w(e),
    u = m[e.mat].label.toLowerCase(),
    v = n === `new`,
    y = [],
    b = (e, t, n, r, i, a, o) => {
      let s = {
        no: e,
        key: t,
        name: n,
        dec: r,
        src: i?.id ?? null,
        why: a,
        tool: o,
        toolNew: r === `New` && o,
      };
      i &&
        o &&
        r !== `New` &&
        (i.tooling === `scrapped`
          ? ((s.dec = `Modify`),
            (s.toolNew = !0),
            (s.why = `Design is proven but the tool was scrapped. Rebuild the tool.`))
          : i.tooling === `other_plant`
            ? (s.note = `Tool sits at ${i.plant}. Plan a transfer.`)
            : r === `Modify` && (s.toolNew = !0)),
        i?.provisional && (s.note = `Released here. No trial data yet.`),
        y.push(s);
    },
    x = (e, t, r, i, o, s, c = !1) => {
      if (n === `reuse`)
        return b(
          e,
          t,
          r,
          `Carryover`,
          a,
          `Proven in the matched design. No change.`,
          s,
        );
      if (!v || c) {
        for (let [n, a, o] of i) if (a) return b(e, t, r, n, a, o, s);
      }
      b(e, t, r, `New`, null, v ? `Clean sheet for this design.` : o, s);
    },
    S = (t) => (t.proven.drop ?? 0) >= e.drop;
  x(
    10,
    `barrel`,
    `Barrel`,
    [
      [
        `Carryover`,
        o(
          (t) =>
            t.mat === e.mat &&
            t.mech === e.mech &&
            t.refill === e.refill &&
            S(t) &&
            t.wall >= c &&
            Math.abs(t.barrelLen - e.barrelLen) <= 1 &&
            Math.abs(t.od - s.od) <= 0.2,
        ),
        `Same material, refill, length and diameter. Proven at this drop height.`,
      ],
      [
        `Modify`,
        o(
          (t) =>
            t.mat === e.mat &&
            t.mech === e.mech &&
            t.refill === e.refill &&
            S(t) &&
            t.wall >= c,
        ),
        `Proven section. Length changed to ${e.barrelLen} mm.`,
      ],
    ],
    `${m[e.mat].label} at ${s.wall.toFixed(2)} mm wall and ${e.barrelLen} mm long. No proven equivalent.`,
    !0,
  ),
    x(
      20,
      `nose`,
      e.system === `fountain` ? `Section` : `Nose cone`,
      [
        [
          `Carryover`,
          o((t) => t.mat === e.mat && S(t) && Math.abs(t.od - s.od) <= 0.2),
          `Same material and diameter, proven at this drop height.`,
        ],
        [
          `Modify`,
          o((t) => t.mat === e.mat),
          `Thread pitch retained. Section changed to suit the barrel.`,
        ],
      ],
      `No ${u} nose in the archive.`,
      !0,
    );
  let C = (t) => t.mech === e.mech,
    te = (t) => C(t) && (t.proven.click ?? 0) >= e.click,
    T = o(C);
  for (let [t, n, r] of {
    click: [
      [30, `housing`, `Click cam housing`],
      [40, `follower`, `Cam follower`],
      [50, `button`, `Push button`],
    ],
    multi: [
      [30, `selector`, `Colour selector cam`],
      [40, `slider`, `Four slider set`],
      [50, `button`, `Top button`],
    ],
    capless: [
      [30, `trapdoor`, `Sealed nib door`],
      [40, `carrier`, `Nib carrier`],
      [50, `button`, `Push button`],
    ],
    twist: [
      [30, `sleeve`, `Twist sleeve`],
      [40, `drive`, `Helical drive`],
    ],
    capped: [
      [30, `cap`, `Cap`],
      [40, `capseal`, `Cap inner seal`],
    ],
    magnetic: [
      [30, `cap`, `Cap`],
      [40, `capseal`, `Cap inner seal`],
      [45, `magnet`, `Magnet pair`],
    ],
  }[e.mech]) {
    let i = o((t) => C(t) && t.mat === e.mat),
      a = o((t) => C(t) && m[t.mat].metal === m[e.mat].metal);
    n === `cap`
      ? x(
          t,
          n,
          r,
          [
            [`Carryover`, i, `Same material cap.`],
            [`Modify`, a, `Geometry reused, remade in ${u}.`],
          ],
          `No cap on file.`,
          !0,
        )
      : n === `capseal`
        ? x(
            t,
            n,
            r,
            [
              [
                `Carryover`,
                o((t) => C(t) && t.system === e.system),
                `Proven with this ink system.`,
              ],
              [`Modify`, T, `Seal material changed for this ink system.`],
            ],
            `No cap seal on file.`,
            !1,
          )
        : n === `sleeve`
          ? x(
              t,
              n,
              r,
              [
                [`Carryover`, i, `Same material sleeve.`],
                [`Modify`, a, `Geometry reused, remade in ${u}.`],
              ],
              `No sleeve for this material class.`,
              !0,
            )
          : x(
              t,
              n,
              r,
              [
                [
                  `Carryover`,
                  e.mech === `twist` || e.mech === `magnetic` ? T : o(te),
                  `Proven to this life. Tooling and gauges usable.`,
                ],
                [`Modify`, T, `Hardness and finish raised to reach this life.`],
              ],
              `No ${f[e.mech].label.toLowerCase()} mechanism on file.`,
              !0,
            );
  }
  l > 0 &&
    x(
      60,
      `spring`,
      `Return spring`,
      [
        [
          `Carryover`,
          o((e) => te(e) && e.force != null && Math.abs(e.force - l) < 0.05),
          `Already ${l.toFixed(1)} N. Proven at this life.`,
        ],
        [
          `Modify`,
          T,
          `Force changed from ${T?.force?.toFixed(1) ?? `the source value`} N to ${l.toFixed(1)} N. Same wire and supplier.`,
        ],
      ],
      `No spring on file.`,
      !1,
    );
  let E = (e) => e.refillSupply === `active`,
    ne = (t) =>
      (t.proven.write ?? 0) >= e.write && (t.proven.tempMax ?? 0) >= e.tempMax,
    O =
      e.system === `fountain`
        ? `Ink cartridge`
        : e.mech === `multi`
          ? `D1 refill set`
          : `Refill assembly`,
    k = (t) => t.refill === e.refill && t.system === e.system;
  n === `reuse` && !E(a)
    ? b(
        70,
        `refill`,
        O,
        `Modify`,
        a,
        `Refill supplier discontinued. Qualify a second source.`,
        !1,
      )
    : x(
        70,
        `refill`,
        O,
        [
          [
            `Carryover`,
            o((t) => k(t) && t.tip === e.tip && ne(t) && E(t)),
            `${e.write} m and ${e.tempMax} C proven. Bought out part.`,
          ],
          [
            `Modify`,
            o((e) => k(e) && E(e)),
            `Same format. Fill set to ${s.fill} ml and seal grade checked.`,
          ],
        ],
        `No live supplier for ${d[e.refill].label}.`,
        !1,
        !0,
      ),
    e.system === `fountain`
      ? (x(
          75,
          `feed`,
          `Feed`,
          [
            [
              `Carryover`,
              o((e) => e.system === `fountain`),
              `Proven feed for this nib family.`,
            ],
          ],
          `No feed on file.`,
          !0,
          !0,
        ),
        x(
          80,
          `nib`,
          `Nib, ${e.tip}`,
          [
            [
              `Carryover`,
              o((t) => t.system === `fountain` && t.tip === e.tip),
              `Supplier qualified.`,
            ],
            [
              `Modify`,
              o((e) => e.system === `fountain`),
              `Same supplier, ${e.tip} grade to qualify.`,
            ],
          ],
          `No nib on file.`,
          !1,
          !0,
        ))
      : x(
          80,
          `ball`,
          `Tip and ball`,
          [
            [
              `Carryover`,
              o((t) => t.system === e.system && t.tip === e.tip),
              `Supplier qualified. No change.`,
            ],
            [
              `Modify`,
              o((t) => t.system === e.system),
              `Same supplier, ${e.tip} mm size to qualify.`,
            ],
          ],
          `No tip on file.`,
          !1,
          !0,
        ),
    e.clip &&
      x(
        90,
        `clip`,
        `Pocket clip`,
        [
          [
            `Carryover`,
            o((t) => t.clip && t.mat === e.mat),
            `Same material clip.`,
          ],
        ],
        `No matching clip. No validated history.`,
        !0,
      ),
    e.grip !== `none` &&
      x(
        95,
        `grip`,
        _[e.grip],
        [
          [
            `Carryover`,
            o((t) => t.grip === e.grip && Math.abs(t.od - s.od) <= 0.5),
            `Same grip on the same diameter.`,
          ],
          [
            `Modify`,
            o((t) => t.grip === e.grip),
            `Grip reused, resized to this diameter.`,
          ],
        ],
        `No grip on file.`,
        !0,
      ),
    e.child &&
      f[e.mech].capped &&
      x(
        96,
        `vent`,
        `Ventilated cap insert`,
        [
          [
            `Carryover`,
            o((e) => e.ventedCap),
            `Meets the ventilated cap requirement.`,
          ],
        ],
        `No ventilated cap on file. Needs an airflow test.`,
        !0,
      );
  let re = `${h[e.finish]}${e.brand === `none` ? `` : ` and ` + g[e.brand].toLowerCase()}`;
  x(
    100,
    `finish`,
    re,
    [
      [
        `Carryover`,
        o(
          (t) =>
            t.mat === e.mat &&
            t.finish === e.finish &&
            (t.brand === e.brand || e.brand === `none`),
        ),
        `Process window transfers directly.`,
      ],
      [
        `Modify`,
        o((t) => t.mat === e.mat && t.finish === e.finish),
        `Finish retained. Branding step added.`,
      ],
    ],
    `No ${re.toLowerCase()} process on file.`,
    !1,
  );
  let ie = n === `reuse`;
  return {
    id: ie ? a.id : r,
    title: ie
      ? a.title
      : `${m[e.mat].label} ${f[e.mech].label.toLowerCase()} pen, ${p[e.system].label.toLowerCase()}`.replace(
          `pen pen`,
          `pen`,
        ),
    choice: n,
    parts: y,
    geo: s,
    metrics: A(e, y, s),
  };
}
function A(e, t, n) {
  let r = t.length,
    i = t.filter((e) => e.dec === `Carryover`).length,
    a = t.filter((e) => e.dec === `Modify`).length,
    o = r - i - a,
    s = t.filter((e) => e.tool),
    c = s.filter((e) => !e.toolNew).length;
  return {
    parts: r,
    carry: i,
    modify: a,
    fresh: o,
    reusePct: Math.round(((i + a) / r) * 100),
    toolsKept: c,
    toolsAll: s.length,
    capex: (s.length - c) * (m[e.mat].metal ? 4e4 : 15e4),
    testsAvoided: Math.round((11 * (i + 0.3 * a)) / r),
    weeks: Math.max(3, Math.round(14 * (0.3 + (0.7 * (o + 0.5 * a)) / r))),
    unit: O(e, n),
  };
}
function re(e, t) {
  return {
    id: t.id,
    rev: `A`,
    title: t.title,
    year: new Date().getFullYear(),
    plant: `Bengaluru`,
    status: `released`,
    customer: e.customer,
    tooling: `active`,
    refillSupply: `active`,
    mech: e.mech,
    system: e.system,
    refill: e.refill,
    tip: e.tip,
    mat: e.mat,
    finish: e.finish,
    barrelLen: e.barrelLen,
    od: t.geo.od,
    wall: t.geo.wall,
    clip: e.clip,
    brand: e.brand,
    grip: e.grip,
    force: t.geo.force || null,
    ventedCap: e.child && f[e.mech].capped,
    proven: {
      write: e.write,
      click:
        e.mech === `click` || e.mech === `multi` || e.mech === `capless`
          ? e.click
          : null,
      drop: e.drop,
      tempMax: e.tempMax,
      tempMin: e.tempMin,
    },
    failures: [],
    source: `Released in this workbench`,
    provisional: !0,
  };
}
function ie(e) {
  let t = [],
    n = (e) => t.push(e),
    r = d[e.refill],
    i = D(e),
    a = m[e.mat],
    o = e.system === `fountain`;
  (!isFinite(e.barrelLen) || e.barrelLen <= 0) &&
    n({
      code: `F01`,
      severity: `block`,
      field: `barrelLen`,
      message: `Barrel length is missing.`,
    }),
    (!isFinite(e.drop) || e.drop <= 0) &&
      n({
        code: `F02`,
        severity: `block`,
        field: `drop`,
        message: `Drop height is missing.`,
      }),
    e.tempMin >= e.tempMax &&
      n({
        code: `F03`,
        severity: `block`,
        field: `tempMin`,
        message: `Minimum temperature must be below the maximum.`,
      }),
    r.systems.includes(e.system) ||
      n({
        code: `F10`,
        severity: `block`,
        field: `refill`,
        message: `${r.label} does not carry ${p[e.system].label.toLowerCase()}.`,
        fix: `Use ${Object.values(d)
          .filter((t) => t.systems.includes(e.system))
          .map((e) => e.label)
          .join(` or `)}.`,
      }),
    p[e.system].tips.includes(e.tip) ||
      n({
        code: `F11`,
        severity: `block`,
        field: `tip`,
        message: `${b(e.tip)} is not offered for ${p[e.system].label.toLowerCase()}.`,
        fix: `Choose ${p[e.system].tips.map(b).join(`, `)}.`,
      }),
    o &&
      !f[e.mech].capped &&
      e.mech !== `capless` &&
      n({
        code: `F12`,
        severity: `block`,
        field: `mech`,
        message: `A fountain nib dries out without a cap or a sealed door.`,
        fix: `Use a cap, or the retractable nib mechanism.`,
      }),
    e.mech === `capless` &&
      !o &&
      n({
        code: `F13`,
        severity: `block`,
        field: `mech`,
        message: `The retractable nib mechanism is only for fountain nibs.`,
      }),
    e.mech === `multi` &&
      e.refill !== `D1` &&
      n({
        code: `F14`,
        severity: `block`,
        field: `refill`,
        message: `A four colour pen needs D1 refills.`,
        fix: `Change the refill to D1 mini.`,
      }),
    e.refill === `C1` &&
      ![`twist`, `capped`, `magnetic`].includes(e.mech) &&
      n({
        code: `F15`,
        severity: `block`,
        field: `mech`,
        message: `C1 refills screw in and suit twist or capped pens.`,
        fix: `Change the mechanism, or use a G2 refill.`,
      }),
    e.system === `roller` &&
      !f[e.mech].capped &&
      n({
        code: `F16`,
        severity: `warn`,
        field: `mech`,
        message: `Liquid ink in a retractable pen can dry out at the tip.`,
        fix: `Add a tip seal and a 72 hour dry out test.`,
      }),
    e.upsideDown &&
      e.refill !== `PR` &&
      n({
        code: `F20`,
        severity: `block`,
        field: `refill`,
        message: `Writing upside down needs a pressurised refill.`,
        fix: `Change the refill to PR pressurised.`,
      }),
    e.refill === `PR` &&
      n({
        code: `F21`,
        severity: `info`,
        field: `refill`,
        message: `PR is a proprietary sealed refill. Confirm a second source before release.`,
      }),
    e.tempMin < 0 &&
      e.system === `gel` &&
      n({
        code: `F22`,
        severity: `warn`,
        field: `tempMin`,
        message: `Gel ink is at risk below 0 C.`,
        fix: `Use a pressurised or oil based refill.`,
      }),
    e.tempMax > 60 &&
      e.system !== `ball` &&
      n({
        code: `F23`,
        severity: `warn`,
        field: `tempMax`,
        message: `Water based inks are at risk above 60 C.`,
      });
  let s = r.maxWrite[e.system];
  if (
    (s &&
      e.write > s &&
      n({
        code: `F30`,
        severity: `block`,
        field: `write`,
        message: `${r.label} reaches about ${s} m in ${p[e.system].label.toLowerCase()}. The request is ${e.write} m.`,
        fix: `Lower the writing length, or use a larger refill.`,
      }),
    e.od > 0 &&
      e.od < i.odMin &&
      n({
        code: `F40`,
        severity: `block`,
        field: `od`,
        message: `${r.label} needs a ${i.refillBore} mm bore. With a ${i.wallRule.toFixed(2)} mm wall the barrel must be at least ${i.odMin} mm, not ${e.od} mm.`,
        fix: `Set outer diameter to ${i.odMin} mm, or use a thinner refill.`,
      }),
    e.barrelLen > 0 &&
      i.spare < 0 &&
      n({
        code: `F41`,
        severity: `block`,
        field: `barrelLen`,
        message: `The ${r.len} mm refill and mechanism need a barrel of at least ${i.minBarrel} mm, not ${e.barrelLen} mm.`,
        fix: `Set barrel length to ${i.minBarrel} mm, or use a shorter refill.`,
      }),
    i.spare > 25 &&
      n({
        code: `F42`,
        severity: `warn`,
        field: `barrelLen`,
        message: `The barrel has ${i.spare} mm of spare length, so the refill needs an extender.`,
        fix: `Add an extender to the bill of materials, or shorten the barrel.`,
      }),
    i.overall > 165 &&
      n({
        code: `F43`,
        severity: `warn`,
        field: `barrelLen`,
        message: `Overall length ${i.overall} mm is outside normal pen ergonomics.`,
      }),
    i.od > 16 &&
      n({
        code: `F44`,
        severity: `warn`,
        field: `od`,
        message: `A barrel above 16 mm is hard to grip and will not fit standard packaging.`,
      }),
    i.mass > 45 &&
      n({
        code: `F45`,
        severity: `warn`,
        field: `mat`,
        message: `Estimated mass ${i.mass} g is heavy for a pen.`,
        fix: `Reduce the wall, or change the material.`,
      }),
    a.finishes.includes(e.finish) ||
      n({
        code: `F50`,
        severity: `block`,
        field: `finish`,
        message: `${h[e.finish]} cannot be applied to ${a.label.toLowerCase()}.`,
        fix: `Choose ${a.finishes.map((e) => h[e].toLowerCase()).join(`, `)}.`,
      }),
    e.brand === `laser` &&
      !a.metal &&
      n({
        code: `F51`,
        severity: `warn`,
        field: `brand`,
        message: `Plastics need a laser additive for a clear mark.`,
        fix: `Add the additive to the resin, or use pad printing.`,
      }),
    e.brand !== `none` &&
      e.brandLen > e.barrelLen - 25 &&
      n({
        code: `F52`,
        severity: `block`,
        field: `brandLen`,
        message: `A ${e.brandLen} mm mark does not fit on a ${e.barrelLen} mm barrel with a clip and grip zone.`,
        fix: `Keep the mark under ${e.barrelLen - 25} mm.`,
      }),
    e.brand === `pad` &&
      (e.finish === `brushed` || e.finish === `bead`) &&
      n({
        code: `F53`,
        severity: `warn`,
        field: `brand`,
        message: `Pad print adhesion is poor on textured metal.`,
        fix: `Use laser engraving.`,
      }),
    e.grip === `rubber` &&
      e.tempMax > 60 &&
      n({
        code: `F54`,
        severity: `warn`,
        field: `grip`,
        message: `Rubber grips can soften above 60 C.`,
      }),
    e.child &&
      f[e.mech].capped &&
      n({
        code: `F60`,
        severity: `info`,
        field: `child`,
        message: `Children's use needs a ventilated cap under ISO 11540. The design will add one.`,
      }),
    e.child &&
      e.mech === `magnetic` &&
      n({
        code: `F61`,
        severity: `block`,
        field: `mech`,
        message: `A loose magnet is a swallowing hazard in a children's product.`,
        fix: `Use a push cap.`,
      }),
    e.mat === `bra` &&
      (e.market !== `IN` || e.child) &&
      n({
        code: `F62`,
        severity: `warn`,
        field: `market`,
        message: `Free cutting brass contains lead. Check the limits for this market and use.`,
        fix: `Specify a low lead alloy, or change the material.`,
      }),
    (e.mat === `sst` || e.mat === `tit`) &&
      a.metal &&
      n({
        code: `F63`,
        severity: `info`,
        field: `mat`,
        message: `${a.label} threads can gall. The design adds a thread coating check.`,
      }),
    e.mat === `rpet` &&
      e.drop > 1.2 &&
      n({
        code: `F70`,
        severity: `warn`,
        field: `drop`,
        message: `Recycled PET loses impact strength. Drop above 1.2 m needs a material trial.`,
      }),
    !a.metal &&
      e.vol < 3e3 &&
      n({
        code: `F71`,
        severity: `warn`,
        field: `vol`,
        message: `A moulding tool does not pay back at ${e.vol} a month.`,
        fix: `Use a soft tool, or a turned metal body.`,
      }),
    i.route === `Deep drawing` &&
      n({
        code: `F72`,
        severity: `info`,
        field: `vol`,
        message: `At ${e.vol.toLocaleString(`en-IN`)} a month the barrel moves from CNC turning to deep drawing.`,
      }),
    e.click > 3e4 &&
      (e.mech === `click` || e.mech === `multi`) &&
      n({
        code: `F73`,
        severity: `warn`,
        field: `click`,
        message: `Click life above 30,000 is outside normal cam material limits.`,
      }),
    e.cost > 0)
  ) {
    let t = O(e, i);
    t > e.cost &&
      n({
        code: `F80`,
        severity: `warn`,
        field: `cost`,
        message: `Estimated cost Rs ${t} is above the target of Rs ${e.cost}.`,
      });
  }
  return t;
}
var ae = (e) => e.some((e) => e.severity === `block`);
function oe(e) {
  let t = [],
    n = [],
    r = ``,
    i = !1;
  for (let a = 0; a < e.length; a++) {
    let o = e[a];
    i
      ? o === `"`
        ? e[a + 1] === `"`
          ? ((r += `"`), a++)
          : (i = !1)
        : (r += o)
      : o === `"`
        ? (i = !0)
        : o === `,`
          ? (n.push(r), (r = ``))
          : o ===
                `
` || o === `\r`
            ? (o === `\r` &&
                e[a + 1] ===
                  `
` &&
                a++,
              n.push(r),
              (r = ``),
              n.some((e) => e.trim()) && t.push(n),
              (n = []))
            : (r += o);
  }
  return n.push(r), n.some((e) => e.trim()) && t.push(n), t;
}
var se = {
    project_id: { field: `id` },
    "proj no": { field: `id` },
    revision: { field: `rev` },
    rev: { field: `rev` },
    title: { field: `title` },
    desc: { field: `title` },
    release_date: { field: `date` },
    yr: { field: `date` },
    plant: { field: `plant` },
    status: { field: `status` },
    state: { field: `status` },
    customer: { field: `customer` },
    cust: { field: `customer` },
    tooling_status: { field: `tooling` },
    tool: { field: `tooling` },
    refill_supply: { field: `supply` },
    mechanism: { field: `mech` },
    type: { field: `mech` },
    writing_system: { field: `system` },
    ink: { field: `system` },
    refill_type: { field: `refill` },
    refill: { field: `refill` },
    tip: { field: `tip` },
    point: { field: `tip` },
    barrel_material: { field: `mat` },
    body: { field: `mat` },
    surface_finish: { field: `finish` },
    coating: { field: `finish` },
    barrel_length: { field: `barrelLen`, unit: `mm` },
    "body len (cm)": { field: `barrelLen`, unit: `cm` },
    outer_diameter: { field: `od`, unit: `mm` },
    "dia (in)": { field: `od`, unit: `in` },
    wall_thickness: { field: `wall`, unit: `mm` },
    wall: { field: `wall`, unit: `mm` },
    clip: { field: `clip` },
    "clip?": { field: `clip` },
    branding: { field: `brand` },
    logo: { field: `brand` },
    grip: { field: `grip` },
    spring_force: { field: `force`, unit: `N` },
    "spring (gf)": { field: `force`, unit: `gf` },
    proven_writing_length: { field: `write`, unit: `m` },
    "km written": { field: `write`, unit: `km` },
    proven_click_life: { field: `click`, unit: `x` },
    "clicks (k)": { field: `click`, unit: `k` },
    proven_drop: { field: `drop`, unit: `m` },
    "drop (ft)": { field: `drop`, unit: `ft` },
    proven_temp_max: { field: `tempMax`, unit: `C` },
    "max f": { field: `tempMax`, unit: `F` },
    proven_temp_min: { field: `tempMin`, unit: `C` },
    "min f": { field: `tempMin`, unit: `F` },
    vented_cap: { field: `vented` },
    trial_notes: { field: `notes` },
    notes: { field: `notes` },
  },
  ce = (e) => e.trim().toLowerCase().replace(/\s+/g, ` `),
  le = (e, t) => {
    let n = ce(t);
    for (let [t, r] of e) if (t.test(n)) return r;
    return null;
  },
  ue = [
    [/^(abs|abs plastic|acrylonitrile.*)$/, `abs`],
    [/^(pc|polycarb.*)$/, `pc`],
    [/^(rpet|r-pet|recycled pet.*|pcr pet)$/, `rpet`],
    [/^(alu|al|alum.*|aa ?60.*|6063|6061)/, `alu`],
    [/^(brass|bra|cuzn.*|c36.*|c360.*)/, `bra`],
    [/^(sst|ss|ss ?30.*|stainless.*|inox|aisi ?30.*)/, `sst`],
    [/^(ti|tit|titanium.*|grade ?[25] ti.*)/, `tit`],
  ],
  de = [
    [/^(g-?2|iso g2|parker.*|jotter.*)$/, `G2`],
    [/^(d-?1|mini|mini d1|d1 mini)$/, `D1`],
    [/^(a-?2|a2 slim|slim metal)$/, `A2`],
    [/^(c-?1|cross.*)$/, `C1`],
    [/^(rb|rollerball|gel 110|pilot g-?2.*|rollerball 110)$/, `RB`],
    [/^(pr|pressuri[sz]ed|space|fisher.*)$/, `PR`],
    [/^(int-?s|int.*short|short cartridge)$/, `INT-S`],
    [/^(int-?l|int.*long|long cartridge)$/, `INT-L`],
  ],
  fe = [
    [/^(ball|ballpoint|ball pen|oil|oil based|bp)$/, `ball`],
    [/^(hybrid|low viscosity|lv)/, `hybrid`],
    [/^gel/, `gel`],
    [/^(roller|rollerball|liquid)/, `roller`],
    [/^(fountain|fp|nib|fountain nib)/, `fountain`],
  ],
  pe = [
    [/^(click|retractable|push ?button|knock)/, `click`],
    [/^twist/, `twist`],
    [/^(cap|capped|screw cap|push cap|screw or push cap)/, `capped`],
    [/^magnet/, `magnetic`],
    [/^(multi|4 ?colou?r|four colou?r)/, `multi`],
    [/^(capless|retractable nib|vanishing)/, `capless`],
  ],
  me = [
    [/^(moulded|molded|as moulded|as molded|none|raw)/, `moulded`],
    [/^(anod|hard anod|type ii)/, `anodise`],
    [/^(lacquer|paint|ep lacquer)/, `lacquer`],
    [/^pvd/, `pvd`],
    [/^(chrome|cr plat)/, `chrome`],
    [/^(brush|satin|hairline)/, `brushed`],
    [/^(bead|blast|matte blast)/, `bead`],
  ],
  he = [
    [/^(released|rel|active|production|sop)/, `released`],
    [/^(superseded|sup)/, `superseded`],
    [/^(obsolete|eol|end of life|retired)/, `obsolete`],
    [/^(ppap.?fail.*|failed|rejected|ppap rejected)/, `ppap_failed`],
    [/^(on.?hold|hold|paused)/, `on_hold`],
  ],
  ge = [
    [/^(active|ok|in use|live)/, `active`],
    [/^(other.?plant|transferred|moved)/, `other_plant`],
    [/^(scrapped|scrap|destroyed|disposed)/, `scrapped`],
  ],
  _e =
    /^\s*(-?[\d,]*\.?\d+)\s*(mm|cm|in|inch|inches|"|km|m|ft|feet|°?c|°?f|n|gf|k)?\s*$/i;
function ve(e, t) {
  switch (t) {
    case `cm`:
      return e * 10;
    case `in`:
    case `inch`:
    case `inches`:
    case `"`:
      return e * 25.4;
    case `km`:
      return e * 1e3;
    case `ft`:
    case `feet`:
      return e * 0.3048;
    case `f`:
    case `°f`:
      return ((e - 32) * 5) / 9;
    case `gf`:
      return e * 0.00980665;
    case `k`:
      return e * 1e3;
    default:
      return e;
  }
}
function ye(e, t = `x`) {
  let n = (e ?? ``).trim();
  if (!n || /^(n\/?a|na|-|tbd|not tested|nt|\?)$/i.test(n))
    return { value: null, changed: !1, bad: !1 };
  let r = n.match(_e);
  if (!r) return { value: null, changed: !1, bad: !0 };
  let i = Number(r[1].replace(/,/g, ``)),
    a = r[2]?.toLowerCase(),
    o = ve(i, a ?? t.toLowerCase());
  return { value: o, changed: !!a || o !== i || r[1].includes(`,`), bad: !1 };
}
var j = (e) => /^(y|yes|true|1)$/i.test((e ?? ``).trim()),
  M = [
    [/drop|crack/i, `drop_crack`],
    [/cam|latch|wear/i, `cam_wear`],
    [/leak|seal/i, `seal_leak`],
    [/dry|dried/i, `dry_out`],
    [/gall|seiz/i, `thread_gall`],
    [/peel|flak|finish|coating/i, `finish_peel`],
    [/clip/i, `clip_fatigue`],
    [/spring|set\b/i, `spring_set`],
  ];
function be(e) {
  let t = [];
  for (let n of (e ?? ``)
    .split(`;`)
    .map((e) => e.trim())
    .filter(Boolean)) {
    if (/^(ok|pass|passed|no issues?|none)\.?$/i.test(n)) continue;
    let e = M.find(([e]) => e.test(n))?.[1] ?? `other`,
      r = n.match(/(\d+(?:[.,]\d+)?)\s*(m\b|c\b|clicks|k\b)/i),
      i = r
        ? Number(r[1].replace(/,/g, ``)) *
          (r[2].toLowerCase() === `k` ? 1e3 : 1)
        : null;
    t.push({ mode: e, at: i, note: n });
  }
  return t;
}
var xe = {
  MISSING_ID: `Missing project id`,
  BAD_NUMBER: `Unreadable number`,
  UNKNOWN_MATERIAL: `Unknown material`,
  UNKNOWN_REFILL: `Unknown refill`,
  UNKNOWN_MECH: `Unknown mechanism`,
  BAD_DATE: `Date out of range`,
  IMPOSSIBLE: `Physically impossible geometry`,
  CONFLICT: `Same revision, conflicting data`,
  MISSING_DESIGN: `Missing design dimensions`,
};
function Se(e, t = new Date().getFullYear()) {
  let n = {
      sources: [],
      rowsRead: 0,
      accepted: 0,
      duplicatesDropped: 0,
      superseded: 0,
      quarantined: 0,
      normalised: 0,
      missingProven: 0,
      reasons: {},
      normalisedBy: {},
      quarantine: [],
      byYear: {},
    },
    r = (e, t) => {
      e[t] = (e[t] ?? 0) + 1;
    },
    i = (e, t, i, a, o) => {
      n.quarantined++,
        r(n.reasons, xe[a]),
        n.quarantine.push({
          source: e,
          line: t,
          id: i || `(none)`,
          reason: xe[a],
          detail: o,
        });
    },
    a = new Map();
  for (let o of e) {
    let e = oe(o.text);
    if (!e.length) continue;
    let s = e[0].map((e) => se[ce(e)]);
    n.sources.push({ name: o.name, rows: e.length - 1 }),
      e.slice(1).forEach((e, c) => {
        n.rowsRead++;
        let l = c + 2,
          u = {},
          f = {};
        s.forEach((t, n) => {
          t && ((u[t.field] = e[n] ?? ``), (f[t.field] = t.unit));
        });
        let p = (u.id ?? ``).trim().toUpperCase();
        if (!p)
          return i(o.name, l, ``, `MISSING_ID`, `Row for "${u.title ?? ``}"`);
        let h = (u.date ?? ``).match(/(19|20)\d{2}/),
          g = h ? Number(h[0]) : NaN;
        if (!g || g < 2005 || g > t)
          return i(o.name, l, p, `BAD_DATE`, `Date "${u.date}"`);
        let _ = le(ue, u.mat ?? ``);
        if (!_) return i(o.name, l, p, `UNKNOWN_MATERIAL`, `"${u.mat}"`);
        let v = le(de, u.refill ?? ``);
        if (!v) return i(o.name, l, p, `UNKNOWN_REFILL`, `"${u.refill}"`);
        let y = le(pe, u.mech ?? ``);
        if (!y) return i(o.name, l, p, `UNKNOWN_MECH`, `"${u.mech}"`);
        ce(u.mat ?? ``) !== _ && r(n.normalisedBy, `Material names`),
          (u.refill ?? ``).trim() !== v && r(n.normalisedBy, `Refill names`);
        let b = ``,
          x = (e) => {
            let t = ye(u[e], f[e]);
            return (
              t.bad && (b = `${e}: "${u[e]}"`),
              t.changed && r(n.normalisedBy, `Units and number formats`),
              t.value
            );
          },
          S = x(`barrelLen`),
          C = x(`od`),
          ee = x(`wall`),
          w = x(`force`),
          te = x(`write`),
          T = x(`click`),
          E = x(`drop`),
          D = x(`tempMax`),
          ne = x(`tempMin`);
        if (b) return i(o.name, l, p, `BAD_NUMBER`, b);
        if (S == null || C == null || ee == null)
          return i(
            o.name,
            l,
            p,
            `MISSING_DESIGN`,
            `Barrel length, diameter or wall is blank`,
          );
        let O = d[v],
          k = Math.round((C - 2 * ee) * 100) / 100;
        if (S <= 0 || C <= 0 || ee <= 0 || k < O.dia)
          return i(
            o.name,
            l,
            p,
            `IMPOSSIBLE`,
            `OD ${C}, wall ${ee}: ${k} mm bore cannot hold a ${O.dia} mm refill`,
          );
        let A = le(fe, u.system ?? ``) ?? O.systems[0],
          re = ce(u.brand ?? ``),
          ie = /laser|engrav/.test(re)
            ? `laser`
            : /pad|print/.test(re)
              ? `pad`
              : `none`,
          ae = ce(u.grip ?? ``),
          oe = /rubber|tpe/.test(ae)
            ? `rubber`
            : /knurl/.test(ae)
              ? `knurl`
              : `none`,
          se = y === `click` || y === `multi` || y === `capless` ? T : null;
        ([te, E, D, ne].some((e) => e == null) ||
          (se == null && (y === `click` || y === `multi`))) &&
          n.missingProven++;
        let _e = {
            id: p,
            rev: (u.rev ?? `A`).trim().toUpperCase() || `A`,
            title: (u.title ?? p).trim() || p,
            year: g,
            plant: (u.plant ?? ``).trim() || `Unknown`,
            status: le(he, u.status ?? ``) ?? `released`,
            customer: (u.customer ?? ``).trim().toUpperCase() || `OPEN`,
            tooling: le(ge, u.tooling ?? ``) ?? `active`,
            refillSupply: /disc|eol|unavail/i.test(u.supply ?? ``)
              ? `discontinued`
              : `active`,
            mech: y,
            system: A,
            refill: v,
            tip:
              (u.tip ?? ``)
                .trim()
                .toUpperCase()
                .replace(/\s*MM$/, ``)
                .replace(/^1$/, `1.0`)
                .replace(/^\.(\d)/, `0.$1`) || (A === `fountain` ? `M` : `0.7`),
            mat: _,
            finish:
              le(me, u.finish ?? ``) ??
              (m[_].metal ? m[_].finishes[0] : `moulded`),
            barrelLen: Ce(S, 1),
            od: Ce(C, 2),
            wall: Ce(ee, 2),
            clip: j(u.clip),
            brand: ie,
            grip: oe,
            force: w == null ? null : Ce(w, 1),
            ventedCap: j(u.vented),
            proven: {
              write: te == null ? null : Math.round(te),
              click: se == null ? null : Math.round(se),
              drop: E == null ? null : Ce(E, 1),
              tempMax: D == null ? null : Math.round(D),
              tempMin: ne == null ? null : Math.round(ne),
            },
            failures: be(u.notes),
            source: o.name,
          },
          ve = `${p}|${_e.rev}`,
          M = JSON.stringify({ ..._e, source: `` }),
          xe = a.get(ve);
        if (xe) {
          if (xe.sig === M) {
            n.duplicatesDropped++;
            return;
          }
          return i(
            o.name,
            l,
            p,
            `CONFLICT`,
            `Revision ${_e.rev} already loaded with different values`,
          );
        }
        a.set(ve, { rec: _e, sig: M }), n.accepted++;
      });
  }
  let o = new Map();
  for (let { rec: e } of a.values()) {
    let t = o.get(e.id);
    (!t || e.rev > t) && o.set(e.id, e.rev);
  }
  let s = [];
  for (let { rec: e } of a.values())
    e.rev !== o.get(e.id) &&
      e.status === `released` &&
      ((e.status = `superseded`), n.superseded++),
      s.push(e),
      r(n.byYear, String(e.year));
  return (
    (n.normalised = Object.values(n.normalisedBy).reduce((e, t) => e + t, 0)),
    { records: s, report: n }
  );
}
var Ce = (e, t) => Math.round(e * 10 ** t) / 10 ** t,
  we = {
    mech: 0.16,
    refill: 0.12,
    system: 0.08,
    tip: 0.05,
    mat: 0.13,
    finish: 0.03,
    length: 0.07,
    od: 0.06,
    write: 0.06,
    click: 0.06,
    drop: 0.07,
    tempMax: 0.03,
    tempMin: 0.01,
    clip: 0.01,
    brand: 0.02,
    grip: 0.01,
  },
  N = (e, t) =>
    t == null ? 0.5 : t >= e ? 1 : Math.max(0, 1 - (2 * (e - t)) / e),
  Te = (e, t, n, r) => {
    let i = Math.abs(e - t);
    return i <= n ? 1 : Math.max(0, 1 - (i - n) / r);
  },
  Ee = (e, t = ``) =>
    e == null ? `Not validated` : `${e.toLocaleString(`en-IN`)}${t} proven`;
function De(e, t) {
  let n = [],
    r = D(e),
    i = (e, t, r, i, a, o = r === 1) =>
      n.push({ key: e, label: t, sim: r, req: i, val: a, ok: o }),
    a = m[e.mat].metal === m[t.mat].metal;
  i(
    `mech`,
    `Mechanism`,
    e.mech === t.mech ? 1 : f[e.mech].capped === f[t.mech].capped ? 0.2 : 0,
    f[e.mech].label,
    f[t.mech].label,
  ),
    i(
      `refill`,
      `Refill format`,
      e.refill === t.refill
        ? 1
        : Math.abs(d[e.refill].dia - d[t.refill].dia) < 0.5
          ? 0.4
          : 0,
      d[e.refill].label,
      d[t.refill].label,
    ),
    i(
      `system`,
      `Nib or tip type`,
      e.system === t.system
        ? 1
        : e.system !== `fountain` && t.system !== `fountain`
          ? 0.3
          : 0,
      p[e.system].label,
      p[t.system].label,
    ),
    i(`tip`, `Tip size`, e.tip === t.tip ? 1 : 0.6, b(e.tip), b(t.tip)),
    i(
      `mat`,
      `Barrel material`,
      e.mat === t.mat ? 1 : a ? 0.1 : 0,
      m[e.mat].label,
      m[t.mat].label,
    ),
    i(
      `finish`,
      `Finish`,
      e.finish === t.finish ? 1 : 0.2,
      h[e.finish],
      h[t.finish],
    ),
    i(
      `length`,
      `Barrel length`,
      Te(e.barrelLen, t.barrelLen, 1, 20),
      `${e.barrelLen} mm`,
      `${t.barrelLen} mm`,
    ),
    i(
      `od`,
      `Outer diameter`,
      Te(r.od, t.od, 0.2, 3),
      `${r.od} mm`,
      `${t.od} mm`,
    ),
    i(
      `write`,
      `Writing length`,
      N(e.write, t.proven.write),
      `${e.write} m`,
      Ee(t.proven.write, ` m`),
    ),
    (e.mech === `click` || e.mech === `multi` || e.mech === `capless`) &&
      i(
        `click`,
        `Actuation life`,
        t.mech === e.mech ? N(e.click, t.proven.click) : 0,
        e.click.toLocaleString(`en-IN`),
        Ee(t.proven.click),
      ),
    i(
      `drop`,
      `Drop`,
      N(e.drop, t.proven.drop),
      `${e.drop} m`,
      Ee(t.proven.drop, ` m`),
    ),
    i(
      `tempMax`,
      `Max temperature`,
      N(e.tempMax, t.proven.tempMax),
      `${e.tempMax} C`,
      Ee(t.proven.tempMax, ` C`),
    ),
    i(
      `tempMin`,
      `Min temperature`,
      t.proven.tempMin == null ? 0.5 : t.proven.tempMin <= e.tempMin ? 1 : 0.3,
      `${e.tempMin} C`,
      Ee(t.proven.tempMin, ` C`),
    ),
    i(
      `clip`,
      `Pocket clip`,
      !e.clip || t.clip ? 1 : 0,
      e.clip ? `Yes` : `No`,
      t.clip ? `Yes` : `No`,
    ),
    i(
      `brand`,
      `Branding`,
      +(e.brand === t.brand || e.brand === `none`),
      e.brand,
      t.brand,
    ),
    i(`grip`, `Grip`, e.grip === t.grip ? 1 : 0.3, e.grip, t.grip);
  let o = n.reduce((e, t) => e + we[t.key], 0);
  return {
    score: n.reduce((e, t) => e + we[t.key] * t.sim, 0) / o,
    rows: n,
    gaps: n.filter((e) => !e.ok),
  };
}
function Oe(e, t) {
  return t.status === `ppap_failed`
    ? `Failed PPAP. Kept as a lesson only.`
    : t.status === `superseded`
      ? `Superseded by a newer revision.`
      : t.status === `obsolete`
        ? `Obsolete. Materials or process no longer available.`
        : t.status === `on_hold`
          ? `On hold. Not cleared for reuse.`
          : t.customer !== `OPEN` && t.customer !== e.customer
            ? `Exclusive to ${t.customer}. Cannot be reused for this customer.`
            : e.child && f[e.mech].capped && !t.ventedCap && e.mech === t.mech
              ? `Cap is not ventilated, so it cannot be used for a children's pen.`
              : null;
}
var ke = {
  drop_crack: (e) =>
    `Wall held at ${D(e).wallRule.toFixed(2)} mm or more and drop test kept in the plan.`,
  cam_wear: (e) =>
    `Endurance test raised to ${Math.round(e.click * 1.2).toLocaleString(`en-IN`)} cycles.`,
  seal_leak: (e) => `Oven leak test at ${e.tempMax} C made mandatory.`,
  dry_out: () => `72 hour dry out test added.`,
  thread_gall: () => `Thread coating check added.`,
  finish_peel: () => `Adhesion test added to the finish control.`,
  clip_fatigue: () => `Clip fatigue cycle added to validation.`,
  spring_set: () => `Spring force re-checked after endurance.`,
  other: () => `Engineer to review the note.`,
};
function Ae(e, t, n, r) {
  switch (n) {
    case `drop_crack`:
      return e.mat === t.mat && e.drop >= (r ?? 0) * 0.9;
    case `cam_wear`:
    case `spring_set`:
      return (
        (e.mech === `click` || e.mech === `multi`) &&
        t.mech === e.mech &&
        e.click >= (r ?? 0)
      );
    case `seal_leak`:
      return e.system === t.system && e.tempMax >= (r ?? 0) - 5;
    case `dry_out`:
      return (
        e.system === t.system &&
        (e.system === `roller` || e.system === `fountain` || e.system === `gel`)
      );
    case `thread_gall`:
      return e.mat === t.mat;
    case `finish_peel`:
      return e.finish === t.finish && e.mat === t.mat;
    case `clip_fatigue`:
      return e.clip && e.mat === t.mat;
    default:
      return !1;
  }
}
function je(e, t) {
  let n = new Map();
  for (let r of t)
    for (let t of r.failures) {
      if (!Ae(e, r, t.mode, t.at)) continue;
      let i = n.get(t.mode),
        a = t.at ?? 1 / 0;
      (!i || a < i.at || (a === i.at && r.year > i.year)) &&
        n.set(t.mode, {
          recId: r.id,
          year: r.year,
          mode: t.mode,
          text: t.note,
          effect: ke[t.mode](e),
          at: a,
        });
    }
  return [...n.values()]
    .map(({ at: e, ...t }) => t)
    .sort((e, t) => t.year - e.year);
}
function Me(e, t) {
  let n = [],
    r = [];
  for (let i of t) {
    let t = De(e, i),
      a = Oe(e, i);
    a
      ? r.push({ rec: i, score: t.score, reason: a })
      : n.push({ rec: i, ...t });
  }
  n.sort((e, t) => t.score - e.score || t.rec.year - e.rec.year),
    r.sort((e, t) => t.score - e.score);
  let i = n[0],
    a = i
      ? i.gaps.length === 0
        ? `reuse`
        : i.score >= 0.72
          ? `mix`
          : `new`
      : `new`;
  return {
    matches: n,
    excluded: r
      .filter((e) => e.score >= Math.max(0.7, (i?.score ?? 0) - 0.05))
      .slice(0, 6),
    lessons: je(e, t),
    verdict: a,
    scanned: t.length,
  };
}
function Ne(e, t, n) {
  return e >= 9
    ? t >= 3 && n >= 2
      ? `High`
      : t >= 2
        ? `Medium`
        : `Low`
    : e >= 7
      ? t >= 5
        ? `High`
        : t >= 3
          ? `Medium`
          : `Low`
      : e >= 4
        ? t >= 6 && n >= 5
          ? `High`
          : t >= 4 && n >= 5
            ? `Medium`
            : `Low`
        : `Low`;
}
var P = { drop: 7, nose: 8, latch: 8, leak: 9 };
function Pe(e, t) {
  let n = t.geo,
    r = e.click.toLocaleString(`en-IN`),
    i = [
      `Extends and retracts the tip`,
      `Mechanism fails to latch`,
      `Tip does not stay out`,
      P.latch,
      `Wear beyond life`,
      4,
      `Hardness 45 to 55 HRC`,
      `${r} cycle endurance test`,
      3,
    ],
    a = {
      barrel: [
        `Contains and protects internals`,
        `Barrel cracks on impact`,
        `Pen unusable, sharp edge`,
        P.drop,
        `Wall below ${n.wallRule.toFixed(2)} mm`,
        4,
        `Wall set by rule at ${n.wall.toFixed(2)} mm`,
        `Drop test at ${e.drop} m`,
        4,
      ],
      nose: [
        `Retains the assembly`,
        `Nose unscrews in use`,
        `Internals fall out, ink stain`,
        P.nose,
        `Insufficient thread engagement`,
        3,
        `Minimum 4 full threads`,
        `Torque to loosen test`,
        3,
      ],
      housing: i,
      selector: [
        `Selects one of four refills`,
        `Two refills extend together`,
        `Pen unusable`,
        P.latch,
        `Slider timing`,
        4,
        `Slider stop geometry`,
        `${r} cycle selector test`,
        3,
      ],
      trapdoor: [
        `Seals the nib when retracted`,
        `Door leaks air`,
        `Nib dries out`,
        P.latch,
        `Seal wear`,
        5,
        `Spring loaded door`,
        `30 day dry out test`,
        4,
      ],
      carrier: i,
      follower: [
        `Indexes the cam`,
        `Follower jams`,
        `Tip stuck`,
        P.latch,
        `Burr on lobes`,
        3,
        `Lobe finish specified`,
        `Endurance test`,
        3,
      ],
      slider: [
        `Drives each refill`,
        `Slider breaks`,
        `One colour lost`,
        6,
        `Thin section`,
        4,
        `Section check`,
        `Selector test`,
        3,
      ],
      button: [
        `Takes user input`,
        `Button cracks`,
        `Poor feel, loss of function`,
        5,
        `Thin section at root`,
        3,
        `Section check`,
        `Endurance test`,
        3,
      ],
      spring: [
        `Retracts the tip`,
        `Spring takes set`,
        `Tip does not retract, ink marks pocket`,
        P.drop,
        `Stressed beyond elastic limit`,
        4,
        `Force ${n.force.toFixed(1)} N, wire size checked`,
        `Force after endurance`,
        4,
      ],
      sleeve: [
        `Transfers twist`,
        `Sleeve slips on barrel`,
        `Tip does not extend`,
        P.latch,
        `Interference too low`,
        4,
        `Fit class specified`,
        `Slip torque test`,
        3,
      ],
      drive: [
        `Extends and retracts the tip`,
        `Drive strips`,
        `Pen unusable`,
        P.latch,
        `Helix wear`,
        3,
        `Material grade specified`,
        `20,000 cycle twist test`,
        3,
      ],
      cap: [
        `Protects the tip`,
        `Cap falls off`,
        `Ink marks pocket`,
        6,
        `Low retention force`,
        4,
        `Retention 3 to 6 N`,
        `Pull test`,
        3,
      ],
      capseal: [
        `Prevents dry out`,
        `Tip dries out`,
        `Pen fails to write`,
        6,
        `Seal gap`,
        4,
        `Seal compression specified`,
        `72 hour dry out test`,
        3,
      ],
      magnet: [
        `Holds the cap`,
        `Magnet detaches`,
        `Cap falls off, loose magnet`,
        P.latch,
        `Bond failure`,
        3,
        `Mechanical retention`,
        `Pull test after thermal cycle`,
        3,
      ],
      refill: [
        `Holds and delivers ink`,
        `Ink leaks at high temperature`,
        `Ink on garment`,
        P.leak,
        `Seal degrades near ${e.tempMax} C`,
        3,
        `Qualified seal grade`,
        `Oven leak test at ${e.tempMax} C, 72 h`,
        3,
      ],
      feed: [
        `Controls ink flow`,
        `Feed burps ink`,
        `Blots on paper`,
        6,
        `Air channel blocked`,
        4,
        `Feed design rule`,
        `Altitude and flow test`,
        3,
      ],
      nib: [
        `Lays ink on paper`,
        `Tines misaligned`,
        `Scratchy line`,
        6,
        `Nib set`,
        4,
        `Tine gap specified`,
        `Writing test`,
        3,
      ],
      ball: [
        `Writes on paper`,
        `Ink skips`,
        `Customer rejects`,
        6,
        `Ball to seat clearance out of window`,
        4,
        `Clearance 0.008 to 0.015 mm`,
        `Writing test`,
        3,
      ],
      clip: [
        `Retains pen in pocket`,
        `Clip fatigues and detaches`,
        `Pen lost`,
        5,
        `Spring back too low`,
        4,
        `Design rule only`,
        `None yet`,
        4,
      ],
      grip: [
        `Gives a firm hold`,
        `Grip slides or swells`,
        `Poor feel`,
        4,
        `Adhesive or ink solvent`,
        3,
        `Material compatibility`,
        `Solvent wipe test`,
        3,
      ],
      vent: [
        `Keeps an air path if swallowed`,
        `Air flow below requirement`,
        `Choking risk`,
        10,
        `Vent blocked by moulding flash`,
        3,
        `Vent area per ISO 11540`,
        `Air flow test`,
        3,
      ],
      finish: [
        `Gives surface and branding`,
        `Finish or mark rejected`,
        `Cosmetic reject, rework`,
        4,
        `Process drift`,
        4,
        `Process window specified`,
        `Boundary sample`,
        3,
      ],
    };
  return t.parts.map((e) => {
    let t = a[e.key],
      n = t[5],
      r = t[8],
      i = `None. Existing control adequate.`;
    e.dec === `New` && !e.src
      ? ((n = Math.min(10, n + 2)),
        (r = Math.min(10, r + 3)),
        (i = `No history in the archive. Full design validation required before release.`))
      : e.dec === `Modify` &&
        ((n = Math.min(10, n + 1)),
        (i = `Changed from a proven part. Run a targeted validation.`));
    let o = Ne(t[3], n, r);
    return (
      o === `High` &&
        i.startsWith(`None`) &&
        (i = `Extend the detection control and raise a design action.`),
      {
        item: e.name,
        key: e.key,
        fn: t[0],
        mode: t[1],
        effect: t[2],
        S: t[3],
        cause: t[4],
        O: n,
        prevention: t[6],
        detection: t[7],
        D: r,
        priority: o,
        action: i,
        source: e.src ?? `No source, flagged as new`,
      }
    );
  });
}
function Fe(e, t) {
  let n = t.geo,
    r = m[e.mat],
    i = [],
    a = (e) => t.parts.find((t) => t.key === e)?.dec,
    o = (...e) => e.some((e) => a(e) && a(e) !== `Carryover`),
    s = (e, t, n, r, a) =>
      i.push({ op: e, name: t, equipment: n, changed: o(...r), sop: a });
  return (
    r.metal
      ? (s(
          10,
          `${r.label} stock receiving`,
          `Incoming inspection bench`,
          [`barrel`],
          [
            `Check the mill certificate against the work order.`,
            `Verify grade and size on a sample.`,
            `Tag and release the lot.`,
          ],
        ),
        n.route === `Deep drawing`
          ? (s(
              20,
              `Deep drawing of barrel`,
              `Transfer press 1`,
              [`barrel`],
              [
                `Load the die set for this part number.`,
                `Run the first piece and sign the setup sheet.`,
                `Check outer diameter ${n.od} mm and wall ${n.wall.toFixed(2)} mm.`,
              ],
            ),
            s(
              30,
              `Trim and pierce`,
              `Transfer press 1`,
              [`barrel`],
              [
                `Confirm the trim die count.`,
                `Trim to ${e.barrelLen} mm.`,
                `Measure every 200 pieces.`,
              ],
            ))
          : (s(
              20,
              `CNC turning of barrel profile`,
              `CNC lathe 2`,
              [`barrel`],
              [
                `Load the program for this part number.`,
                `Run the first piece and sign the setup sheet.`,
                `Check outer diameter ${n.od} mm and length ${e.barrelLen} mm.`,
              ],
            ),
            s(
              30,
              `Deep hole boring to ${n.wall.toFixed(2)} mm wall`,
              `CNC lathe 2`,
              [`barrel`],
              [
                `Confirm tool life is below 300 pieces.`,
                `Bore to ${n.bore} mm.`,
                `Measure the wall on CMM every 50 pieces.`,
              ],
            )),
        s(
          40,
          `Thread cutting at nose end`,
          `CNC lathe 2`,
          [`barrel`, `nose`],
          [
            `Verify the offset after every tool change.`,
            `Check every piece with the go and no go gauge.`,
            `Rework within stock, otherwise scrap.`,
          ],
        ),
        s(
          50,
          `Deburring and ultrasonic cleaning`,
          `Cleaner 1`,
          [`barrel`],
          [
            `Load barrels without contact.`,
            `Run the cleaning cycle.`,
            `Dry and inspect the bore for burrs.`,
          ],
        ),
        s(
          60,
          `${h[e.finish]} finish`,
          `Finishing line`,
          [`finish`],
          [
            `Confirm the bath or media check for this shift.`,
            `Run the lot to the process window.`,
            `Measure 5 pieces per lot.`,
          ],
        ))
      : (s(
          10,
          `Resin receiving and drying`,
          `Dryer 1`,
          [`barrel`],
          [
            `Verify resin grade and lot.`,
            e.brand === `laser`
              ? `Confirm the laser additive is in the masterbatch.`
              : `Check the colour masterbatch.`,
            `Record moisture before release.`,
          ],
        ),
        s(
          20,
          `Injection moulding of barrel and nose`,
          `Moulding machine 3`,
          [`barrel`, `nose`],
          [
            `Load the process sheet for this tool.`,
            `Run first article and sign it off.`,
            `Check wall ${n.wall.toFixed(2)} mm every 200 shots.`,
          ],
        ),
        s(
          30,
          `Degating and visual check`,
          `Trim station`,
          [`barrel`],
          [
            `Remove the runner.`,
            `Check the gate vestige.`,
            `Check the thread root for whitening.`,
          ],
        )),
    e.brand !== `none` &&
      s(
        70,
        g[e.brand],
        e.brand === `laser` ? `Fibre marker 1` : `Pad printer 1`,
        [`finish`],
        [
          `Load the approved artwork.`,
          `Fix the barrel in the nest. Mark length ${e.brandLen} mm.`,
          `Check the first piece against the boundary sample.`,
        ],
      ),
    e.grip !== `none` &&
      s(
        75,
        `${e.grip === `rubber` ? `Grip fitting` : `Knurling`}`,
        `Assembly station 1`,
        [`grip`],
        [
          `Confirm the grip part number.`,
          `Fit to the depth stop.`,
          `Check the grip does not slide.`,
        ],
      ),
    s(
      80,
      {
        click: `Mechanism subassembly`,
        twist: `Twist drive subassembly`,
        capped: `Cap and seal assembly`,
        magnetic: `Cap, seal and magnet assembly`,
        multi: `Selector and slider subassembly`,
        capless: `Nib door subassembly`,
      }[e.mech],
      `Assembly station 1`,
      {
        click: [`housing`, `follower`, `button`],
        twist: [`sleeve`, `drive`],
        capped: [`cap`, `capseal`],
        magnetic: [`cap`, `capseal`, `magnet`],
        multi: [`selector`, `slider`, `button`],
        capless: [`trapdoor`, `carrier`, `button`],
      }[e.mech],
      [
        `Confirm part numbers on all bins.`,
        e.mech === `click`
          ? `Place the follower. The fixture will not close if it is inverted.`
          : `Seat the parts in the fixture with the marks aligned.`,
        `Actuate three times by hand and check the action.`,
      ],
    ),
    e.system === `fountain` &&
      s(
        85,
        `Nib and feed setting`,
        `Nib bench`,
        [`nib`, `feed`],
        [
          `Press the feed and nib into the section.`,
          `Check tine alignment under the loupe.`,
          `Write a test line.`,
        ],
      ),
    s(
      90,
      e.mech === `multi`
        ? `Refill set insertion`
        : e.system === `fountain`
          ? `Cartridge packing`
          : `Refill insertion`,
      `Assembly station 2`,
      [`refill`],
      [
        `Scan the refill lot to the work order.`,
        t.geo.force
          ? `Fit the spring from the marked bin only.`
          : `Check the tip size marking.`,
        `Insert until seated.`,
      ],
    ),
    s(
      100,
      `Nose fitting`,
      `Torque station`,
      [`nose`],
      [
        `Verify the driver calibration sticker.`,
        `Fit to the set torque.`,
        `Move any rejected part to the rework bin.`,
      ],
    ),
    s(
      110,
      `Function and leak test`,
      `End of line rig and oven`,
      [`refill`, `barrel`],
      [
        `Run the function cycle on every pen.`,
        `Pull 5 pens per shift for the oven test at ${e.tempMax} C.`,
        `Hold the shift output if any pen leaks.`,
      ],
    ),
    s(
      120,
      `Packing`,
      `Packing line`,
      [],
      [
        `Check the count and label.`,
        `Pack to the customer specification.`,
        `Close the work order.`,
      ],
    ),
    i
  );
}
function Ie(e, t) {
  let n = t.geo,
    r = m[e.mat],
    i = [],
    a = r.metal ? `1.2 to 1.6 Nm` : `0.6 to 0.9 Nm`,
    o = (e, t, n, r, a, o, s, c, l, u, d, f, p, m, h, g, _, v) =>
      i.push({
        op: e,
        step: t,
        mode: n,
        effect: r,
        S: a,
        cause: o,
        O: s,
        prevention: c,
        detection: l,
        D: u,
        priority: Ne(a, s, u),
        characteristic: d,
        type: f,
        spec: p,
        evaluation: m,
        sample: h,
        frequency: g,
        control: _,
        reaction: v,
      });
  if (r.metal) {
    o(
      30,
      n.route === `Deep drawing` ? `Trim and pierce` : `Deep hole boring`,
      `Wall below ${n.wallRule.toFixed(2)} mm`,
      `Barrel fails drop test`,
      P.drop,
      `Tool wear`,
      5,
      `Tool life limit`,
      `Wall measured on a schedule`,
      4,
      `Barrel wall thickness`,
      `Product, critical`,
      `${n.wallRule.toFixed(2)} mm minimum`,
      `CMM`,
      `3`,
      `Every 50 pieces`,
      `Variable chart with Cpk tracking`,
      `Quarantine since last good check, change tool`,
    ),
      o(
        40,
        `Thread cutting`,
        `Fewer than 4 full threads`,
        `Nose unscrews in service`,
        P.nose,
        `Wrong Z offset after tool change`,
        3,
        `Offset verified at first piece`,
        `Go and no go gauge`,
        2,
        `Thread engagement`,
        `Product, critical`,
        `Minimum 4 full threads`,
        `Go and no go gauge`,
        `All`,
        `100 percent`,
        `Attribute check at station`,
        `Rework within stock, else scrap`,
      );
    let t = {
      anodise: [`Coating thickness`, `8 to 12 micron`, `Eddy current gauge`],
      lacquer: [`Lacquer thickness`, `15 to 25 micron`, `Coating gauge`],
      pvd: [`Coating adhesion`, `Passes scratch test`, `Scratch tester`],
      chrome: [`Plating thickness`, `0.3 micron minimum`, `XRF gauge`],
      brushed: [
        `Surface roughness`,
        `Ra 0.4 to 0.8 micron`,
        `Roughness tester`,
      ],
      bead: [`Surface roughness`, `Ra 0.8 to 1.6 micron`, `Roughness tester`],
      moulded: [`Surface`, `Boundary sample`, `Visual`],
    }[e.finish];
    o(
      60,
      `${h[e.finish]} finish`,
      `${t[0]} out of range`,
      `Cosmetic reject`,
      4,
      `Bath or media drift`,
      4,
      `Checked every shift`,
      `Gauge, 5 pieces per lot`,
      3,
      t[0],
      `Product`,
      t[1],
      t[2],
      `5`,
      `Per lot`,
      `Variable chart`,
      `Reject lot, reprocess`,
    );
  } else
    o(
      20,
      `Injection moulding`,
      `Wall below ${n.wallRule.toFixed(2)} mm`,
      `Barrel fails drop test`,
      P.drop,
      `Core shift, short shot`,
      4,
      `Process sheet locked`,
      `Section check every 200 shots`,
      4,
      `Barrel wall thickness`,
      `Product, critical`,
      `${n.wallRule.toFixed(2)} mm minimum`,
      `Section gauge`,
      `3`,
      `Every 200 shots`,
      `Variable chart`,
      `Quarantine since last good check`,
    ),
      o(
        30,
        `Degating`,
        `Thread root whitening`,
        `Nose unscrews in service`,
        P.nose,
        `Gate stress near thread`,
        3,
        `Gate location fixed`,
        `Visual against boundary sample`,
        3,
        `Thread root condition`,
        `Product, critical`,
        `No whitening or cracks`,
        `Visual`,
        `All`,
        `100 percent`,
        `Attribute check`,
        `Scrap, check tool`,
      );
  return (
    e.brand === `laser` &&
      o(
        70,
        `Laser engraving`,
        `Mark illegible or burnt through`,
        `Cosmetic reject`,
        4,
        `Power or focus drift`,
        3,
        `Power verified at start of shift`,
        `Visual`,
        3,
        `Engraving legibility`,
        `Product`,
        `Legible, no burn through`,
        `Boundary sample`,
        `All`,
        `100 percent`,
        `Attribute check`,
        `Stop line, verify power and focus`,
      ),
    e.brand === `pad` &&
      o(
        70,
        `Pad printing`,
        `Print peels`,
        `Cosmetic reject`,
        4,
        `Ink cure`,
        3,
        `Cure time set`,
        `Tape test`,
        3,
        `Print adhesion`,
        `Product`,
        `Passes tape test`,
        `Tape test`,
        `5`,
        `Per hour`,
        `Attribute check`,
        `Hold lot, recheck cure`,
      ),
    e.mech === `click`
      ? o(
          80,
          `Mechanism subassembly`,
          `Follower assembled inverted`,
          `Mechanism does not latch`,
          P.latch,
          `Part is near symmetric`,
          5,
          `Orientation fixture`,
          `Function check at Op 110`,
          3,
          `Follower orientation`,
          `Process, critical`,
          `Correct orientation`,
          `Poka yoke fixture`,
          `All`,
          `100 percent`,
          `Fixture will not close if inverted`,
          `Stop station, check fixture wear`,
        )
      : f[e.mech].capped
        ? o(
            80,
            `Cap assembly`,
            `Seal not seated`,
            `Tip dries out`,
            6,
            `Press depth`,
            4,
            `Depth stop`,
            `Retention check`,
            3,
            `Cap retention`,
            `Product`,
            `3 to 6 N`,
            `Pull gauge`,
            `5`,
            `Per hour`,
            `Variable chart`,
            `Hold lot, reset press`,
          )
        : o(
            80,
            `Mechanism subassembly`,
            `Parts out of phase`,
            `Tip does not extend`,
            P.latch,
            `Timing mark missed`,
            4,
            `Timing mark on parts`,
            `Function check at Op 110`,
            3,
            `Tip travel`,
            `Process, critical`,
            `Tip travel 4 to 6 mm`,
            `Travel gauge`,
            `All`,
            `100 percent`,
            `Attribute check`,
            `Rework, retrain operator`,
          ),
    e.system === `fountain` &&
      o(
        85,
        `Nib and feed setting`,
        `Tines misaligned`,
        `Scratchy line`,
        6,
        `Handling`,
        4,
        `Loupe check`,
        `Writing test`,
        3,
        `Tine alignment`,
        `Product`,
        `Tines level, gap as drawn`,
        `Loupe`,
        `All`,
        `100 percent`,
        `Attribute check`,
        `Reset nib`,
      ),
    t.geo.force
      ? o(
          90,
          `Spring insertion`,
          `Wrong spring variant used`,
          `Tip fails to retract`,
          P.drop,
          `Similar springs in stores`,
          4,
          `Separate colour coded bins`,
          `Force check on sample`,
          4,
          `Spring force`,
          `Product`,
          `${n.force.toFixed(1)} N plus or minus 0.2 N`,
          `Spring tester`,
          `5`,
          `Per lot incoming`,
          `Variable chart`,
          `Reject lot, segregate`,
        )
      : o(
          90,
          `Refill insertion`,
          `Wrong refill variant`,
          `Wrong ink or tip`,
          6,
          `Similar refills in stores`,
          3,
          `Lot scan at station`,
          `Writing check`,
          3,
          `Refill part number`,
          `Process`,
          `As per BOM`,
          `Barcode scan`,
          `All`,
          `100 percent`,
          `Scan interlock`,
          `Stop station, purge bin`,
        ),
    o(
      100,
      `Nose fitting`,
      `Under torque`,
      `Nose loosens in service`,
      P.nose,
      `Driver drift`,
      3,
      `Driver calibrated daily`,
      `Torque logged on every piece`,
      2,
      `Assembly torque`,
      `Process, critical`,
      a,
      `Torque driver with log`,
      `All`,
      `100 percent`,
      `Driver locks out outside window`,
      `Rework bin, verify calibration`,
    ),
    o(
      110,
      `Function and leak test`,
      `Leaking pen passed as good`,
      `Ink leak reaches customer`,
      P.leak,
      `Test has no thermal condition`,
      4,
      `Sampling includes oven test`,
      `Oven test, 5 per shift`,
      4,
      `Leak at ${e.tempMax} C, 72 h`,
      `Product, critical`,
      `No visible ink escape`,
      `Oven`,
      `5`,
      `Per shift`,
      `Attribute check with record`,
      `Hold shift output, escalate to quality head`,
    ),
    e.child &&
      f[e.mech].capped &&
      o(
        110,
        `Cap air flow audit`,
        `Vent blocked`,
        `Choking risk`,
        10,
        `Moulding flash`,
        3,
        `Tool maintenance`,
        `Air flow test, 5 per shift`,
        3,
        `Cap air flow`,
        `Product, safety`,
        `Per ISO 11540`,
        `Air flow rig`,
        `5`,
        `Per shift`,
        `Variable chart`,
        `Stop line, quarantine since last good check`,
      ),
    i
  );
}
function Le(e, t, n, r) {
  let i = Pe(e, t),
    a = Fe(e, t),
    o = Ie(e, t),
    s = t.parts.filter((e) => e.dec === `New` && !e.src),
    c = i.filter((e) => e.priority === `High`),
    l = t.geo,
    u = t.metrics,
    d = [
      [`barrel`, P.drop],
      [`nose`, P.nose],
      [`refill`, P.leak],
    ].every(([e, t]) => i.find((t) => t.key === e)?.S === t),
    f = n.filter((e) => e.severity === `warn`);
  return {
    ops: a,
    dfmea: i,
    process: o,
    rules: [
      {
        label: `Documents built in order: process flow, DFMEA, PFMEA, control plan, check sheets, SOPs`,
        result: `pass`,
      },
      {
        label: `Barrel wall ${l.wall.toFixed(2)} mm meets the ${l.wallRule.toFixed(2)} mm rule at ${e.drop} m`,
        result: l.wall >= l.wallRule ? `pass` : `fail`,
      },
      {
        label: `${l.refillLen} mm refill fits with ${l.spare} mm spare`,
        result: l.spare >= 0 ? `pass` : `fail`,
      },
      {
        label: `Every High priority DFMEA row carries an action (${c.length} rows)`,
        result: c.every((e) => !e.action.startsWith(`None`)) ? `pass` : `fail`,
      },
      {
        label: `Every PFMEA row has a control plan line (${o.length} rows)`,
        result: o.every((e) => e.characteristic && e.evaluation)
          ? `pass`
          : `fail`,
      },
      {
        label: `Severity agrees between DFMEA and PFMEA`,
        result: d ? `pass` : `fail`,
      },
      {
        label: s.length
          ? `${s.length === 1 ? `1 part` : s.length + ` parts`} with no history, validation accepted by the engineer`
          : `No parts without history`,
        result: !s.length || r ? `pass` : `fail`,
      },
      {
        label: e.cost
          ? u.unit <= e.cost
            ? `Estimated cost Rs ${u.unit} within target Rs ${e.cost}`
            : `Estimated cost Rs ${u.unit} above target Rs ${e.cost}. Review with commercial.`
          : `No target cost entered`,
        result: !e.cost || u.unit <= e.cost ? `pass` : `warn`,
      },
      ...f
        .filter((e) => e.code !== `F80`)
        .map((e) => ({
          label: `Open warning ${e.code}: ${e.message}`,
          result: `warn`,
        })),
    ],
  };
}
function Re(e, t) {
  let n = (e) => `"${String(e ?? ``).replace(/"/g, `""`)}"`,
    r = (e) => e.map(n).join(`,`),
    i = [],
    a = (e, t, a) => i.push(n(e), r(t), ...a.map(r), ``);
  return (
    a(
      `Bill of materials`,
      [`Item`, `Part`, `Decision`, `Source`, `Reason`, `Note`],
      e.parts.map((e) => [
        e.no,
        e.name,
        e.dec,
        e.src ?? `Clean sheet`,
        e.why,
        e.note,
      ]),
    ),
    a(
      `Process flow`,
      [`Op`, `Operation`, `Equipment`, `Changed`],
      t.ops.map((e) => [e.op, e.name, e.equipment, e.changed ? `Yes` : `No`]),
    ),
    a(
      `DFMEA`,
      [
        `Item`,
        `Failure mode`,
        `Effect`,
        `S`,
        `Cause`,
        `O`,
        `Prevention`,
        `Detection`,
        `D`,
        `Priority`,
        `Action`,
        `Source`,
      ],
      t.dfmea.map((e) => [
        e.item,
        e.mode,
        e.effect,
        e.S,
        e.cause,
        e.O,
        e.prevention,
        e.detection,
        e.D,
        e.priority,
        e.action,
        e.source,
      ]),
    ),
    a(
      `PFMEA`,
      [
        `Op`,
        `Step`,
        `Failure mode`,
        `Effect`,
        `S`,
        `Cause`,
        `O`,
        `Prevention`,
        `Detection`,
        `D`,
        `Priority`,
      ],
      t.process.map((e) => [
        e.op,
        e.step,
        e.mode,
        e.effect,
        e.S,
        e.cause,
        e.O,
        e.prevention,
        e.detection,
        e.D,
        e.priority,
      ]),
    ),
    a(
      `Control plan`,
      [
        `Op`,
        `Characteristic`,
        `Type`,
        `Specification`,
        `Evaluation`,
        `Sample`,
        `Frequency`,
        `Control`,
        `Reaction`,
      ],
      t.process.map((e) => [
        e.op,
        e.characteristic,
        e.type,
        e.spec,
        e.evaluation,
        e.sample,
        e.frequency,
        e.control,
        e.reaction,
      ]),
    ),
    i.join(`\r
`)
  );
}
function ze(e) {
  let t = e.toLowerCase().replace(/(\d),(\d)/g, `$1$2`),
    n = {},
    r = (e) => e.test(t),
    i = (e) => {
      let n = t.match(e);
      return n ? Number(n[1]) : void 0;
    };
  r(/retractable nib|capless/)
    ? (n.mech = `capless`)
    : r(/multi pen|four colou?r|4 colou?r/)
      ? (n.mech = `multi`)
      : r(/magnetic cap/)
        ? (n.mech = `magnetic`)
        : r(/\btwist/)
          ? (n.mech = `twist`)
          : r(/\bclick|retractable|push button/)
            ? (n.mech = `click`)
            : r(/screw cap|push cap|\bcapped\b/) && (n.mech = `capped`),
    r(/fountain/)
      ? (n.system = `fountain`)
      : r(/rollerball/)
        ? (n.system = `roller`)
        : r(/\bgel\b/)
          ? (n.system = `gel`)
          : r(/hybrid/)
            ? (n.system = `hybrid`)
            : r(/ballpoint|oil based/) && (n.system = `ball`),
    r(/\bg2\b|parker/)
      ? (n.refill = `G2`)
      : r(/\bd1\b|mini refill/)
        ? (n.refill = `D1`)
        : r(/cross style|\bc1\b/)
          ? (n.refill = `C1`)
          : r(/\ba2\b/)
            ? (n.refill = `A2`)
            : r(/\brb\b/)
              ? (n.refill = `RB`)
              : r(/pressuri[sz]ed/)
                ? (n.refill = `PR`)
                : r(/long (international )?cartridge/)
                  ? (n.refill = `INT-L`)
                  : r(/short (international )?cartridge/) &&
                    (n.refill = `INT-S`);
  let a = t.match(/(0\.38|0\.5|0\.7|1\.0|1\.4)\s*mm/);
  a
    ? (n.tip = a[1])
    : r(/medium nib/)
      ? (n.tip = `M`)
      : r(/fine nib/)
        ? (n.tip = `F`)
        : r(/broad nib/)
          ? (n.tip = `B`)
          : r(/stub/)
            ? (n.tip = `STUB`)
            : r(/medium tip/)
              ? (n.tip = `0.7`)
              : r(/fine tip/) && (n.tip = `0.5`);
  for (let [e, r] of [
    [`blue`, `Blue`],
    [`black`, `Black`],
    [`red`, `Red`],
    [`green`, `Green`],
  ])
    if (t.includes(e + ` `)) {
      n.color = r;
      break;
    }
  r(/titanium/)
    ? (n.mat = `tit`)
    : r(/stainless/)
      ? (n.mat = `sst`)
      : r(/brass/)
        ? (n.mat = `bra`)
        : r(/alumin/)
          ? (n.mat = `alu`)
          : r(/recycled pet|rpet/)
            ? (n.mat = `rpet`)
            : r(/polycarbonate/)
              ? (n.mat = `pc`)
              : r(/\babs\b/) && (n.mat = `abs`),
    r(/anodi[sz]ed/)
      ? (n.finish = `anodise`)
      : r(/pvd/)
        ? (n.finish = `pvd`)
        : r(/lacquer/)
          ? (n.finish = `lacquer`)
          : r(/chrome/)
            ? (n.finish = `chrome`)
            : r(/brushed/)
              ? (n.finish = `brushed`)
              : r(/bead blast/) && (n.finish = `bead`);
  let o = (e, t) => {
    t !== void 0 && (n[e] = t);
  };
  o(
    `barrelLen`,
    i(/(\d{2,3})\s*mm\s*(?:long\s*)?barrel/) ?? i(/barrel[^.]*?(\d{2,3})\s*mm/),
  ),
    o(`od`, i(/(\d+(?:\.\d+)?)\s*mm\s*outer/)),
    o(`write`, i(/(\d{3,5})\s*m\b(?!m)/)),
    o(`click`, i(/(\d{4,6})\s*(?:clicks|actuations|cycles)/)),
    o(
      `drop`,
      i(/(\d(?:\.\d)?)\s*m\s*drop/) ?? i(/drop[^.]*?(\d(?:\.\d)?)\s*m\b/),
    ),
    o(
      `tempMax`,
      i(/up to (\d{2})\s*(?:c\b|degrees)/) ?? i(/to (\d{2})\s*(?:c\b|degrees)/),
    );
  let s = t.match(/(?:down to )?minus (\d{1,2})\s*c/);
  return (
    s && (n.tempMin = -Number(s[1])),
    /\bclip\b/.test(t) && (n.clip = !/no clip|without (a )?clip/.test(t)),
    r(/engrav|laser/)
      ? (n.brand = `laser`)
      : r(/pad print/) && (n.brand = `pad`),
    r(/upside down/) && (n.upsideDown = !0),
    r(/child|school/) && (n.child = !0),
    r(/europe/)
      ? (n.market = `EU`)
      : r(/united states|\busa\b/) && (n.market = `US`),
    o(`vol`, i(/(\d{3,7})\s*(?:a|per|\/)\s*month/)),
    { values: n, found: Object.keys(n) }
  );
}
var F = (e, t, n, r, i, a, o) => ({
    id: e,
    group: t,
    name: n,
    shows: r,
    brief: i,
    spec: { ...x, ...a },
    expect: o,
  }),
  Be = SCENARIOS,
  Ve = ARCHIVE;
export {
  d as REFILLS,
  f as MECHS,
  p as SYSTEMS,
  m as MATERIALS,
  h as FINISHES,
  g as BRANDS,
  _ as GRIPS,
  v as MARKETS,
  y as CUSTOMERS,
  b as tipLabel,
  x as DEFAULT_SPEC,
  D as deriveGeometry,
  O as unitCost,
  k as decideParts,
  re as toArchiveRecord,
  ie as checkRules,
  ae as hasBlock,
  De as similarity,
  Oe as exclusionReason,
  je as lessonsFor,
  Me as searchArchive,
  Le as buildPacket,
  Re as packetCsv,
  ze as parseBrief,
  Be as SCENARIOS_ALL,
  Ve as ARCHIVE_ALL,
};
