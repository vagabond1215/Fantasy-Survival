import { describe, expect, it } from 'vitest';
import { createCamera } from '../src/map/camera.ts';
import { BoundedLRUCache } from '../src/storage/chunkCache.ts';

describe('camera.setZoom pivot invariants', () => {
  it('clamps zoom and keeps the center tile when pivoting on the center', () => {
    const camera = createCamera({
      viewportWidth: 320,
      viewportHeight: 240,
      minZoom: 0.5,
      maxZoom: 4,
      initialZoom: 1.5,
      centerTile: { x: 12, y: -3 }
    });

    const previousCenter = camera.centerTile;
    const result = camera.setZoom(10, 'centerTile');

    expect(result).toBeCloseTo(4);
    expect(camera.zoom).toBeCloseTo(4);
    expect(camera.centerTile.x).toBeCloseTo(previousCenter.x);
    expect(camera.centerTile.y).toBeCloseTo(previousCenter.y);
  });

  it('clamps zoom and keeps the center tile when pivoting on the viewport', () => {
    const camera = createCamera({
      viewportWidth: 512,
      viewportHeight: 384,
      minZoom: 0.25,
      maxZoom: 3,
      initialZoom: 2,
      centerTile: { x: -6, y: 9 }
    });

    camera.panBy(2.5, -1.25);
    const previousCenter = camera.centerTile;

    const result = camera.setZoom(0.01, 'viewport');

    expect(result).toBeCloseTo(0.25);
    expect(camera.zoom).toBeCloseTo(0.25);
    expect(camera.centerTile.x).toBeCloseTo(previousCenter.x);
    expect(camera.centerTile.y).toBeCloseTo(previousCenter.y);
  });
});

describe('camera.commitSnap snapping math', () => {
  it('rounds the center tile to the nearest integer coordinates when changed', () => {
    const camera = createCamera({
      viewportWidth: 400,
      viewportHeight: 300,
      initialZoom: 1,
      centerTile: { x: 3.42, y: -7.58 }
    });

    const result = camera.commitSnap({ animate: false });

    expect(result).toEqual({ targetX: 3, targetY: -8, changed: true });
    expect(camera.centerTile).toEqual({ x: 3, y: -8 });
  });

  it('reports unchanged when the center tile is already aligned', () => {
    const camera = createCamera({
      viewportWidth: 400,
      viewportHeight: 300,
      initialZoom: 1,
      centerTile: { x: 12, y: 5 }
    });

    const result = camera.commitSnap({ animate: false });

    expect(result).toEqual({ targetX: 12, targetY: 5, changed: false });
    expect(camera.centerTile).toEqual({ x: 12, y: 5 });
  });
});

describe('BoundedLRUCache eviction behavior', () => {
  it('evicts the least recently used entry when capacity is exceeded', () => {
    const evicted: Array<[string, number]> = [];
    const cache = new BoundedLRUCache<number>(2, (key, value) => {
      evicted.push([key, value]);
    });

    cache.set('a', 1);
    cache.set('b', 2);
    cache.get('a'); // mark `a` as the most recently used entry
    cache.set('c', 3);

    expect(cache.has('a')).toBe(true);
    expect(cache.has('c')).toBe(true);
    expect(cache.has('b')).toBe(false);
    expect(evicted).toContainEqual(['b', 2]);
  });
});
