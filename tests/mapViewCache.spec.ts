import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import createMapView from '../src/mapView.js';
import { chunkDataCache } from '../src/storage/chunkCache.js';

function buildTileMatrix(width: number, height: number) {
  return Array.from({ length: height }, () =>
    Array.from({ length: width }, () => '.')
  );
}

function buildBuffer(options: { xStart: number; yStart: number; width: number; height: number }) {
  const { xStart, yStart, width, height } = options;
  return {
    seed: 'cache-demo',
    season: 'Sunheight',
    xStart,
    yStart,
    width,
    height,
    tiles: buildTileMatrix(width, height)
  };
}

describe('map view buffer cache', () => {
  beforeEach(() => {
    chunkDataCache.clear();
  });

  afterEach(() => {
    document.body.innerHTML = '';
    chunkDataCache.clear();
  });

  it('reuses cached buffers when requesting the same viewport bounds', () => {
    const container = document.createElement('div');
    document.body.appendChild(container);

    const fetchCalls: Array<{ xStart: number; yStart: number }> = [];

    const mapView = createMapView(container, {
      bufferMargin: 0,
      fetchMap: params => {
        fetchCalls.push({ xStart: params.xStart, yStart: params.yStart });
        return buildBuffer({
          xStart: params.xStart,
          yStart: params.yStart,
          width: params.width,
          height: params.height
        });
      }
    });

    const initialMap = buildBuffer({ xStart: 0, yStart: 0, width: 32, height: 32 });
    mapView.setMap(initialMap, { focus: { x: 0, y: 0 } });

    const baseCacheSize = chunkDataCache.size;

    fetchCalls.length = 0;

    mapView.setFocus({ x: 256, y: 256 });
    expect(fetchCalls.length).toBeGreaterThan(0);
    expect(chunkDataCache.size).toBe(baseCacheSize + 1);

    fetchCalls.length = 0;

    mapView.setFocus({ x: 512, y: 512 });
    expect(fetchCalls.length).toBeGreaterThan(0);
    expect(chunkDataCache.size).toBe(baseCacheSize + 2);

    fetchCalls.length = 0;

    mapView.setFocus({ x: 256, y: 256 });
    expect(fetchCalls.length).toBe(0);
    expect(chunkDataCache.size).toBe(baseCacheSize + 2);

    mapView.destroy();
    container.remove();
  });
});
