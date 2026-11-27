import * as THREE from "three";
import fixedDimensionsRaw from "../data/modelDimensions.json";

/**
 * Dimension overlay helpers — used for the "Manually Modelled" collection ONLY.
 *
 * Empties expected inside each GLB (all optional):
 *   Dim_A_1 / Dim_A_2  -> A measured between two points
 *   Dim_A              -> single point; its value comes from src/data/modelDimensions.json
 *   Dim_B_1 / Dim_B_2  -> B (horizontal-style dimension, outside the model)
 *   Dim_C_1 / Dim_C_2  -> C
 *   Dim_D, Dim_DE, Dim_E -> chained, unnamed dimensions D->DE and DE->E, drawn
 *                           straight (axis-aligned) on the model's near side, black.
 *
 * Everything is projected onto ONE plane, so lines, arrows and labels are coplanar.
 * Scene units are metres; labels are shown in mm.
 */

export const MANUAL_MODEL_CATEGORY = "Manually Modelled";
export const DIMENSION_KEYS = ["A", "B", "C"] as const;
export type DimensionKey = (typeof DIMENSION_KEYS)[number];

/** Objects with this userData flag are ignored when normalizing model bounds. */
export const EXCLUDE_FROM_BOUNDS = "excludeFromBounds";

export const DIM_MAIN = "#111111";
export const DIM_BLACK = "#111111";
export const DIM_EXTENSION = "#111111";

export function isManuallyModelled(
  model?: { category?: string } | null,
  url?: string
): boolean {
  if (model?.category === MANUAL_MODEL_CATEGORY) return true;
  return !!url && decodeURI(url).includes(`/${MANUAL_MODEL_CATEGORY}/`);
}

/** Per-model settings from src/data/modelDimensions.json. */
export interface ModelDimensionConfig {
  /** Fixed value (mm) for a single-point Dim_A */
  A?: number;
  /** Also draw a dotted line along DE -> E (only for models that need it) */
  chainSpanLine?: boolean;
  /** Place the DE -> E chain dimension above its measured points. */
  chainSpanAbove?: boolean;
}

export function getFixedDimensions(modelName?: string | null): ModelDimensionConfig {
  if (!modelName) return {};
  const all = fixedDimensionsRaw as Record<string, ModelDimensionConfig>;
  return all[modelName] ?? {};
}

export interface DimensionLine {
  points: [THREE.Vector3, THREE.Vector3];
  dashed: boolean;
  color: string;
}

export interface DimensionLabel {
  position: THREE.Vector3;
  text: string;
  /** center: centred on position; left/right: text sits to that side of it */
  align: "center" | "left" | "right";
  color: string;
}

export interface DimensionLayout {
  id: string;
  lines: DimensionLine[];
  /** Filled arrowheads, three vertices each */
  arrows: { tri: [THREE.Vector3, THREE.Vector3, THREE.Vector3]; color: string }[];
  dots: THREE.Vector3[];
  labels: DimensionLabel[];
  dashSize: number;
  gapSize: number;
  dotRadius: number;
}

const mm = (metres: number) => (metres * 1000).toFixed(2);

export function buildDimensionLayouts(
  scene: THREE.Object3D,
  fixed: ModelDimensionConfig = {}
): DimensionLayout[] {
  scene.updateMatrixWorld(true);

  const pos = (name: string) =>
    scene.getObjectByName(name)?.getWorldPosition(new THREE.Vector3()) ?? null;

  // 1. Collect points
  const pairs: { key: DimensionKey; p1: THREE.Vector3; p2: THREE.Vector3 }[] = [];
  let singleA: THREE.Vector3 | null = null;
  for (const key of DIMENSION_KEYS) {
    const p1 = pos(`Dim_${key}_1`);
    const p2 = pos(`Dim_${key}_2`);
    if (p1 && p2) pairs.push({ key, p1, p2 });
    else if (key === "A") singleA = pos("Dim_A");
  }
  const chainRaw = [pos("Dim_D"), pos("Dim_DE"), pos("Dim_E")];
  const chain = chainRaw.every(Boolean) ? (chainRaw as THREE.Vector3[]) : null;

  const allPts: THREE.Vector3[] = [
    ...pairs.flatMap((f) => [f.p1, f.p2]),
    ...(singleA ? [singleA] : []),
    ...(chain ?? []),
  ];
  if (allPts.length === 0) return [];

  // 2. Model bounds (meshes only; empties have no geometry)
  const box = new THREE.Box3().setFromObject(scene);

  // 3. Common plane: normal = axis along which the points vary least; the plane
  //    passes through the model's centre on that axis.
  //    The single Dim_A point may sit off-plane (it marks a surface), so it is
  //    ignored when other points exist. Collinear points give no plane, so the
  //    default view plane (XY, normal Z) wins whenever the points are flat in Z.
  const refPts = [...pairs.flatMap((f) => [f.p1, f.p2]), ...(chain ?? [])];
  const ptsBox = new THREE.Box3().setFromPoints(refPts.length ? refPts : allPts);
  const ext = ptsBox.getSize(new THREE.Vector3());
  const bs = box.getSize(new THREE.Vector3());
  const flatTol = Math.max(bs.x, bs.y, bs.z) * 0.01;
  const axis: "x" | "y" | "z" =
    ext.z <= flatTol
      ? "z"
      : ext.x <= ext.y && ext.x <= ext.z
        ? "x"
        : ext.y <= ext.z
          ? "y"
          : "z";
  const normal = new THREE.Vector3();
  normal[axis] = 1;
  const planeValue = box.isEmpty()
    ? ptsBox.getCenter(new THREE.Vector3())[axis]
    : box.getCenter(new THREE.Vector3())[axis];

  const project = (v: THREE.Vector3) => {
    const r = v.clone();
    r[axis] = planeValue;
    return r;
  };

  const boxSize = box.getSize(new THREE.Vector3());
  const [axU, axV] = (["x", "y", "z"] as const).filter((a) => a !== axis);
  const modelSize = Math.max(boxSize[axU], boxSize[axV]);
  const center = project(box.getCenter(new THREE.Vector3()));
  const uAxis = new THREE.Vector3();
  uAxis[axU] = 1;
  const vAxis = new THREE.Vector3();
  vAxis[axV] = 1;

  const corners: THREE.Vector3[] = [];
  for (const a of [box.min[axU], box.max[axU]]) {
    for (const b of [box.min[axV], box.max[axV]]) {
      const c = new THREE.Vector3();
      c[axU] = a;
      c[axV] = b;
      c[axis] = planeValue;
      corners.push(c);
    }
  }

  const margin = modelSize * 0.12;
  const gap = margin * 0.15;
  const overshoot = margin * 0.3;
  const dashSize = margin * 0.1;
  const gapSize = margin * 0.08;
  const dotRadius = margin * 0.07;

  const triangle = (
    tip: THREE.Vector3,
    outward: THREE.Vector3,
    side: THREE.Vector3,
    len: number
  ): [THREE.Vector3, THREE.Vector3, THREE.Vector3] => {
    const base = tip.clone().addScaledVector(outward, -len);
    const hw = len * 0.28;
    return [
      tip.clone(),
      base.clone().addScaledVector(side, hw),
      base.clone().addScaledVector(side, -hw),
    ];
  };

  /** Label alignment for a label sitting on the `dir` side of a dimension line */
  const alignFor = (dir: THREE.Vector3): DimensionLabel["align"] => {
    const du = dir.dot(uAxis);
    if (Math.abs(du) > Math.abs(dir.dot(vAxis))) return du > 0 ? "left" : "right";
    return "center";
  };

  /** Furthest extent of the model along `dir`, measured from `from` */
  const reachAlong = (from: THREE.Vector3, dir: THREE.Vector3) =>
    Math.max(0, ...corners.map((c) => c.clone().sub(from).dot(dir)));

  const layouts: DimensionLayout[] = [];
  const common = { dashSize, gapSize, dotRadius };

  const projectedPairs = pairs.map((f) => {
    const p1 = project(f.p1);
    const p2 = project(f.p2);
    return { key: f.key, p1, p2, length: p1.distanceTo(p2) };
  });

  // Leader arrow coming from the right (+in-plane X) pointing at `tip`
  const leader = (
    id: string,
    tip: THREE.Vector3,
    text: string,
    dots: THREE.Vector3[],
    extraLines: DimensionLine[]
  ) => {
    const tail = tip.clone().addScaledVector(uAxis, margin * 1.3);
    const side = new THREE.Vector3().crossVectors(normal, uAxis).normalize();
    layouts.push({
      id,
      lines: [...extraLines, { points: [tip.clone(), tail], dashed: false, color: DIM_MAIN }],
      arrows: [
        { tri: triangle(tip.clone(), uAxis.clone().negate(), side, margin * 0.35), color: DIM_MAIN },
      ],
      dots,
      labels: [
        {
          position: tail.clone().addScaledVector(uAxis, margin * 0.15),
          text,
          align: "left",
          color: DIM_MAIN,
        },
      ],
      ...common,
    });
  };

  // 4a. Single-point A: fixed value from JSON
  if (singleA) {
    const pt = project(singleA);
    const value = fixed.A;
    leader("A", pt, value != null ? `A (${value.toFixed(2)} mm)` : "A", [], []);
  }

  // 4b. Two-point dimensions
  // Extension lines already drawn (origin + direction + owner length), so a
  // dotted span is not duplicated on top of a longer dimension's extension line.
  const usedLevels: { dir: THREE.Vector3; level: number }[] = [];
  const extAxes: { origin: THREE.Vector3; dir: THREE.Vector3; length: number }[] = [];
  for (const { key, p1, p2, length } of projectedPairs) {
    const mid = p1.clone().add(p2).multiplyScalar(0.5);
    const t = p2.clone().sub(p1).normalize();

    // In-plane perpendicular, flipped to point away from the model's centre
    const p = new THREE.Vector3().crossVectors(normal, t).normalize();
    if (p.dot(mid.clone().sub(center)) < 0) p.negate();

    if (key === "A") {
      const end = p1.dot(uAxis) >= p2.dot(uAxis) ? p1 : p2;
      leader(
        "A",
        end.clone(),
        `A (${mm(length)} mm)`,
        [],
        [{ points: [p1, p2], dashed: false, color: DIM_MAIN }]
      );
      continue;
    }

    const offset = reachAlong(mid, p) + margin;
    const d1 = p1.clone().addScaledVector(p, offset);
    const d2 = p2.clone().addScaledVector(p, offset);

    // Dotted extension lines. They reach back to any point of a SHORTER
    // dimension that lies directly on the same line (e.g. B's line runs up
    // to C's top point), so the dimensions visibly tie together.
    const extStart = (pt: THREE.Vector3) => {
      let start = pt.clone().addScaledVector(p, gap);
      let reach = 0;
      for (const o of projectedPairs) {
        if (o.key === key || o.length >= length) continue;
        for (const q of [o.p1, o.p2]) {
          const d = q.clone().sub(pt);
          if (Math.abs(d.dot(t)) > margin * 0.05) continue;
          const along = d.dot(p);
          if (along < reach - 1e-9) {
            reach = along;
            start = q.clone();
          }
        }
      }
      return start;
    };

    const arrowLen = Math.min(margin * 0.4, length * 0.3);
    const labelDir = alignFor(p);

    // Dotted line along the measured span itself (between the two points),
    // unless a longer dimension's extension line already runs along it.
    const spanCovered = extAxes.some(
      (e) =>
        e.length > length &&
        Math.abs(e.dir.dot(t)) > 0.999 &&
        p1.clone().sub(e.origin).cross(e.dir).length() < margin * 0.05
    );
    usedLevels.push({ dir: p.clone(), level: d1.dot(p) });
    extAxes.push({ origin: p1.clone(), dir: p.clone(), length }, { origin: p2.clone(), dir: p.clone(), length });

    layouts.push({
      id: key,
      lines: [
        ...(spanCovered ? [] : [{ points: [p1.clone(), p2.clone()] as [THREE.Vector3, THREE.Vector3], dashed: true, color: DIM_EXTENSION }]),
        { points: [extStart(p1), d1.clone().addScaledVector(p, overshoot)], dashed: true, color: DIM_EXTENSION },
        { points: [extStart(p2), d2.clone().addScaledVector(p, overshoot)], dashed: true, color: DIM_EXTENSION },
        { points: [d1, d2], dashed: false, color: DIM_MAIN },
      ],
      arrows: [
        { tri: triangle(d1.clone(), t.clone().negate(), p, arrowLen), color: DIM_MAIN },
        { tri: triangle(d2.clone(), t.clone(), p, arrowLen), color: DIM_MAIN },
      ],
      dots: [p1, p2],
      labels: [
        {
          position:
            labelDir === "center"
              ? d1.clone().add(d2).multiplyScalar(0.5).addScaledVector(p, margin * 0.55)
              : d1.clone().add(d2).multiplyScalar(0.5),
          text: `${key} (${mm(length)} mm)`,
          align: labelDir,
          color: DIM_MAIN,
        },
      ],
      ...common,
    });
  }

  // 4c. Chain D -> DE -> E, black, value only.
  //     D -> DE : slanted (aligned) dimension, true distance between the points.
  //     DE -> E : straight (axis-aligned) dimension on the model's near side.
  if (chain) {
    const [D, DE, E] = chain.map(project);
    const lines: DimensionLine[] = [];
    const arrows: DimensionLayout["arrows"] = [];
    const labels: DimensionLabel[] = [];
    const ext = (from: THREE.Vector3, dir: THREE.Vector3, dist: number) =>
      lines.push({
        points: [from.clone().addScaledVector(dir, gap), from.clone().addScaledVector(dir, dist + overshoot)],
        dashed: true,
        color: DIM_BLACK,
      });
    const dimension = (
      a: THREE.Vector3,
      b: THREE.Vector3,
      side: THREE.Vector3,
      text: string,
      align: DimensionLabel["align"]
    ) => {
      const len = a.distanceTo(b);
      const dir = b.clone().sub(a).normalize();
      const arrowLen = Math.min(margin * 0.4, len * 0.3);
      lines.push({ points: [a, b], dashed: false, color: DIM_BLACK });
      arrows.push({ tri: triangle(a.clone(), dir.clone().negate(), side, arrowLen), color: DIM_BLACK });
      arrows.push({ tri: triangle(b.clone(), dir.clone(), side, arrowLen), color: DIM_BLACK });
      const m = a.clone().add(b).multiplyScalar(0.5);
      labels.push({
        position: m.addScaledVector(side, align === "center" ? margin * 0.45 : margin * 0.2),
        text,
        align,
        color: DIM_BLACK,
      });
    };

    // Straight segment DE -> E: line sits just beyond the model on the near side
    const span = E.clone().sub(DE);
    const t = Math.abs(span.dot(uAxis)) >= Math.abs(span.dot(vAxis)) ? uAxis : vAxis;
    const p = (t === uAxis ? vAxis : uAxis).clone();
    const meanPt = D.clone().add(DE).add(E).multiplyScalar(1 / 3);
    if (fixed.chainSpanAbove && t === uAxis) {
      // For a horizontal DE -> E span, positive v is the upper side of the
      // measured points in the dimension plane.
      if (p.dot(vAxis) < 0) p.negate();
    } else if (reachAlong(meanPt, p.clone().negate()) <= reachAlong(meanPt, p)) {
      p.negate();
    }
    let level = Math.max(...[DE, E].map((pt) => pt.dot(p) + reachAlong(pt, p))) + margin * 0.8;
    // Stay outside any dimension line already drawn on the same side (e.g. B)
    for (const u of usedLevels) {
      if (u.dir.dot(p) > 0.999) level = Math.max(level, u.level + margin * 1.2);
    }
    const onLine = (pt: THREE.Vector3) => pt.clone().addScaledVector(p, level - pt.dot(p));
    const [L2, L3] = [DE, E].map(onLine);
    ext(DE, p, level - DE.dot(p));
    ext(E, p, level - E.dot(p));
    dimension(L2, L3, p, `${mm(Math.abs(span.dot(t)))} mm`, alignFor(p));

    // Slanted segment D -> DE: parallel to the D-DE line, on the OUTSIDE of the
    // model (away from its centre) so it never cuts across the part.
    const ts = DE.clone().sub(D).normalize();
    const ps = new THREE.Vector3().crossVectors(normal, ts).normalize();
    if (ps.dot(D.clone().add(DE).multiplyScalar(0.5).sub(center)) < 0) ps.negate();
    const off = margin * 2.2;
    ext(D, ps, off);
    ext(DE, ps, off);
    dimension(
      D.clone().addScaledVector(ps, off),
      DE.clone().addScaledVector(ps, off),
      ps,
      `${mm(D.distanceTo(DE))} mm`,
      ps.dot(uAxis) > 0 ? "left" : "right"
    );

    if (fixed.chainSpanLine) {
      lines.push({ points: [DE.clone(), E.clone()], dashed: true, color: DIM_BLACK });
    }

    layouts.push({ id: "DE-chain", lines, arrows, dots: [D, DE, E], labels, ...common });
  }

  return layouts;
}
