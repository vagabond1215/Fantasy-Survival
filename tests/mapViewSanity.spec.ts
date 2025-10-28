import { describe, it, expect, vi, afterEach } from 'vitest';
import createMapView from '../src/mapView.js';
import { generateColorMap } from '../src/map.js';
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
        return generateColorMap(
          'coastal-temperate',
          'sanity-follow-up',
          params.xStart,
          params.yStart,
          params.width,
          params.height,
          params.season ?? 'Sunheight',
          undefined,
          params.viewport,
          null,
          params.skipSanityChecks
        );
      }
    });

    const initialMap = generateColorMap(
      'coastal-temperate',
      'sanity-follow-up',
      null,
      null,
      32,
      32,
      'Sunheight',
      undefined,
      null,
      null,
      false
    );

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
});
