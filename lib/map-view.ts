import { Vector3 } from 'three';
import type { ArchitectureLayout } from './architecture';

export const isoDirection = new Vector3(.73, .91, .82).normalize();
const right = new Vector3().crossVectors(new Vector3(0, 1, 0), isoDirection).normalize();
const up = new Vector3().crossVectors(isoDirection, right).normalize();
export const labelWidth = 36;
export const labelHeight = 20;

/** Fit the building, entrance steps and walls, excluding the background plane. */
export function mapFrame(layout: ArchitectureLayout, width: number, height: number) {
  const center = new Vector3(0, .675, 0);
  const corners = [-1, 1].flatMap(x => [-.55, 1.9].flatMap(y =>
    [-1, 1].map(z => new Vector3(x * (layout.width / 2 + 1.2), y, z * layout.depth / 2))));
  const projectedWidth = Math.max(...corners.map(p => p.clone().sub(center).dot(right))) * 2;
  const projectedHeight = Math.max(...corners.map(p => p.clone().sub(center).dot(up))) * 2;
  return { center, corners, projectedWidth, projectedHeight,
    zoom: .92 * Math.min(Math.max(1, width - 32) / projectedWidth, Math.max(1, height - 92) / projectedHeight),
    offsetY: 30 };
}

export type MapLabel = { id: string; x: number; y: number };
/** Stable nearest-slot placement, with equal label boxes and a uniform gutter. */
export function placeMapLabels(anchors: MapLabel[], width: number, height: number): MapLabel[] {
  const placed: MapLabel[] = [];
  const fits = (p: MapLabel) => p.x >= labelWidth / 2 + 4 && p.x <= width - labelWidth / 2 - 4 &&
    p.y >= labelHeight / 2 + 4 && p.y <= height - labelHeight / 2 - 4 &&
    placed.every(q => Math.abs(p.x - q.x) >= labelWidth + 4 || Math.abs(p.y - q.y) >= labelHeight + 4);
  for (const anchor of [...anchors].sort((a, b) => a.y - b.y || a.x - b.x || a.id.localeCompare(b.id))) {
    // Off-screen rooms stay off-screen when the operator zooms in.
    if (anchor.x < 0 || anchor.x > width || anchor.y < 0 || anchor.y > height) continue;
    let match: MapLabel | undefined;
    for (let ring = 0; ring < 12 && !match; ring++) {
      const candidates: MapLabel[] = [];
      for (let dy = -ring; dy <= ring; dy++) for (let dx = -ring; dx <= ring; dx++) {
        if (Math.max(Math.abs(dx), Math.abs(dy)) !== ring) continue;
        candidates.push({ id: anchor.id, x: Math.round(anchor.x) + dx * (labelWidth + 4), y: Math.round(anchor.y) + dy * (labelHeight + 4) });
      }
      match = candidates.sort((a, b) => Math.hypot(a.x - anchor.x, a.y - anchor.y) - Math.hypot(b.x - anchor.x, b.y - anchor.y)).find(fits);
    }
    if (match) placed.push(match);
  }
  return placed;
}
