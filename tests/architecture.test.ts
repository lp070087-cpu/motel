import test from 'node:test';
import assert from 'node:assert/strict';
import { architectureLayout } from '../lib/architecture';

test('architectural layout includes every suite for configurable unit sizes without overlaps', () => {
  for (const count of [0, 20, 25, 30, 60]) {
    const layout = architectureLayout('u1', count);
    assert.equal(layout.positions.length, count);
    assert.equal(new Set(layout.positions.map(p => p.join(','))).size, count);
    for (let a = 0; a < count; a++) {
      const [x, , z] = layout.positions[a];
      assert.ok(Math.abs(x) + 2.45 < layout.width / 2);
      assert.ok(Math.abs(z) + 3.55 <= layout.depth / 2);
      // Every suite door meets a gallery, including the final incomplete wing.
      const entrance = z + (layout.mirrored[a] ? -3.55 : 3.55);
      assert.ok(layout.galleries.some(gallery => Math.abs(entrance - gallery) < 1.46));
      for (let b = a + 1; b < count; b++) {
        const [otherX, , otherZ] = layout.positions[b];
        assert.ok(Math.abs(x - otherX) >= 4.9 || Math.abs(z - otherZ) >= 7.0);
      }
    }
  }
});

test('unit architecture is repeatable and varies across the ten independent units', () => {
  assert.deepEqual(architectureLayout('u1', 25), architectureLayout('u1', 25));
  const layouts = Array.from({ length: 10 }, (_, i) => architectureLayout(`u${i + 1}`, 25));
  assert.ok(new Set(layouts.map(l => l.columns)).size > 1);
  assert.ok(new Set(layouts.map(l => l.entrySide)).size > 1);
  assert.ok(new Set(layouts.map(l => l.accent)).size > 1);
});
