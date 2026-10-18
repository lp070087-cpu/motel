/** Illustrative architecture only: these coordinates are unrelated to a real building. */
export type ArchitecturePoint = [number, number, number];
export interface ArchitectureLayout {
  columns: number;
  width: number;
  depth: number;
  accent: string;
  entrySide: -1 | 1;
  positions: ArchitecturePoint[];
  mirrored: boolean[];
  galleries: number[];
}

export function architectureLayout(unitId: string, roomCount: number): ArchitectureLayout {
  const seed = Array.from(unitId).reduce((sum, character) => sum * 31 + character.charCodeAt(0), 7) >>> 0;
  const count = Math.max(0, Math.floor(roomCount));
  const columns = seed % 2 === 0 ? 5 : 6;
  const rows = Math.ceil(count / columns);
  // Two facing wings share each gallery. Successive wings meet at their rear walls.
  const rowCenter = (row: number) => Math.floor(row / 2) * 17 + (row % 2 === 0 ? -5 : 5);
  const first = rows ? rowCenter(0) - 3.55 : -3.55;
  const last = rows ? Math.max(rowCenter(rows - 1) + 3.55, (Math.ceil(rows / 2) - 1) * 17 + 1.45) : 3.55;
  const center = (first + last) / 2;
  return {
    columns,
    width: columns * 5 + 4.4,
    depth: last - first + 2.2,
    accent: ['#807461', '#788273', '#957965', '#777c80'][seed % 4],
    entrySide: seed % 3 === 0 ? 1 : -1,
    positions: Array.from({ length: count }, (_, index): ArchitecturePoint => [(index % columns - (columns - 1) / 2) * 5, 0, rowCenter(Math.floor(index / columns)) - center]),
    mirrored: Array.from({ length: count }, (_, index) => Math.floor(index / columns) % 2 === 1),
    galleries: Array.from({ length: Math.ceil(rows / 2) }, (_, pair) => pair * 17 - center),
  };
}
