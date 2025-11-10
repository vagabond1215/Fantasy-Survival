import { describe, it, expect, vi, afterEach } from 'vitest';
import createMapView from '../src/mapView.js';
import { generateWorldMap } from '../src/map.js';
import * as notifications from '../src/notifications.js';
import { AdjustmentSolver } from '../src/map/generation/adjustmentSolver.js';

describe('map view sanity safeguards', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    document.body.innerHTML = '';
  });

  it('skips solver work and sanity notifications after the base chunk is initialized', () => {
    const container = document.createElement('div');
    document.body.appendChild(container);

    const solveSpy = vi.spyOn(AdjustmentSolver.prototype, 'solve');
    const notifySpy = vi.spyOn(notifications, 'notifySanityCheck');

    const fetchCalls: Array<{ skipSanityChecks: boolean }> = [];

    const mapView = createMapView(container, {
      bufferMargin: 0,
      fetchMap: params => {
        fetchCalls.push({ skipSanityChecks: Boolean(params.skipSanityChecks) });
        return generateWorldMap({
          width: params.width,
          height: params.height,
          seed: 'sanity-follow-up',
          season: params.season ?? 'Sunheight',
          xStart: params.xStart,
          yStart: params.yStart,
          viewport: params.viewport,
          worldSettings: null
        }).map;
      }
    });

    const initialMap = generateWorldMap({
      width: 32,
      height: 32,
      seed: 'sanity-follow-up',
      season: 'Sunheight'
    }).map;

    mapView.setMap(initialMap, { focus: { x: 0, y: 0 } });

    solveSpy.mockClear();
    notifySpy.mockClear();
    fetchCalls.length = 0;

    mapView.setFocus({ x: 200, y: 200 });

    expect(fetchCalls.length).toBeGreaterThan(0);
    const lastCall = fetchCalls[fetchCalls.length - 1];
    expect(lastCall.skipSanityChecks).toBe(true);
    expect(solveSpy).not.toHaveBeenCalled();
    expect(notifySpy).not.toHaveBeenCalled();

    mapView.destroy();
    container.remove();
  });

  it('expands buffered fetches to 3×3 viewport coverage and avoids redundant refetches', () => {
    const container = document.createElement('div');
    document.body.appendChild(container);

    const fetchCalls: Array<{ width: number; height: number; viewport: { xStart: number; yStart: number; width: number; height: number } }> = [];

    const mapView = createMapView(container, {
      bufferMargin: 0,
      fetchMap: params => {
        fetchCalls.push(params);
        return generateWorldMap({
          width: params.width,
          height: params.height,
          seed: 'buffer-sizing',
          season: params.season ?? 'Sunheight',
          xStart: params.xStart,
          yStart: params.yStart,
          viewport: params.viewport,
          worldSettings: null
        }).map;
      }
    });

    const viewportSize = 48;
    const initialMap = generateWorldMap({
      width: viewportSize,
      height: viewportSize,
      seed: 'buffer-sizing',
      season: 'Sunheight'
    }).map;

    mapView.setMap(initialMap, { focus: { x: 0, y: 0 } });

    fetchCalls.length = 0;
    mapView.setFocus({ x: viewportSize * 4, y: viewportSize * 4 });

    expect(fetchCalls.length).toBeGreaterThan(0);
    const baseFetch = fetchCalls[fetchCalls.length - 1];
    expect(baseFetch.width).toBe(baseFetch.viewport.width * 3);
    expect(baseFetch.height).toBe(baseFetch.viewport.height * 3);

    const safePan = Math.floor(baseFetch.viewport.width / 4);
    fetchCalls.length = 0;
    mapView.setFocus({ x: baseFetch.viewport.xStart + safePan, y: baseFetch.viewport.yStart });
    expect(fetchCalls.length).toBe(0);

    mapView.setFocus({ x: baseFetch.viewport.xStart + baseFetch.viewport.width * 2, y: baseFetch.viewport.yStart });
    expect(fetchCalls.length).toBeGreaterThan(0);

    mapView.destroy();
    container.remove();
  });
});
