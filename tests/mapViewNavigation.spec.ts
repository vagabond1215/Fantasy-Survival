import { describe, it, expect, vi, afterEach } from 'vitest';
import createMapView from '../src/mapView.js';

function buildTileMatrix(rows: number, cols: number) {
  return Array.from({ length: rows }, () => Array.from({ length: cols }, () => '.'));
}

function createTestMap(options: {
  width: number;
  height: number;
  viewport: { xStart: number; yStart: number; width: number; height: number };
}) {
  const { width, height, viewport } = options;
  return {
    tiles: buildTileMatrix(height, width),
    types: null,
    elevations: null,
    xStart: 0,
    yStart: 0,
    width,
    height,
    viewport
  };
}

function getViewportOrigin(mapView: ReturnType<typeof createMapView>) {
  const firstTile = mapView.elements.display.querySelector('.map-tile') as HTMLElement | null;
  if (!firstTile) {
    throw new Error('No tiles rendered in map view');
  }
  const xStart = Number.parseInt(firstTile.dataset.worldX ?? '', 10);
  const yStart = Number.parseInt(firstTile.dataset.worldY ?? '', 10);
  if (!Number.isFinite(xStart) || !Number.isFinite(yStart)) {
    throw new Error('Tile origin coordinates are not available');
  }
  return { xStart, yStart };
}

describe('map view navigation limits', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    document.body.innerHTML = '';
  });

  it('pans by half-viewport increments when using arrow keys', () => {
    const container = document.createElement('div');
    document.body.appendChild(container);

    const mapView = createMapView(container, {
      showControls: false
    });

    const viewport = { xStart: 20, yStart: 10, width: 20, height: 12 };
    const focus = {
      x: viewport.xStart + Math.floor(viewport.width / 2),
      y: viewport.yStart + Math.floor(viewport.height / 2)
    };
    const map = createTestMap({ width: 60, height: 40, viewport });

    mapView.setMap(map, { focus });

    const baseViewport = getViewportOrigin(mapView);
    expect(baseViewport).toEqual({ xStart: viewport.xStart, yStart: viewport.yStart });

    const expectedStepX = Math.max(1, Math.floor(viewport.width * 0.5));
    const expectedStepY = Math.max(1, Math.floor(viewport.height * 0.5));

    mapView.elements.wrapper.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));

    const afterRight = getViewportOrigin(mapView);
    expect(afterRight.xStart).toBe(baseViewport.xStart + expectedStepX);
    expect(afterRight.yStart).toBe(baseViewport.yStart);

    mapView.elements.wrapper.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));

    const afterDown = getViewportOrigin(mapView);
    expect(afterDown.xStart).toBe(afterRight.xStart);
    expect(afterDown.yStart).toBe(afterRight.yStart + expectedStepY);

    mapView.destroy();
    container.remove();
  });

  it('caps drag movements to the viewport continuity limit', () => {
    const container = document.createElement('div');
    document.body.appendChild(container);

    const mapView = createMapView(container, {
      showControls: false
    });

    const viewport = { xStart: 10, yStart: 8, width: 20, height: 12 };
    const focus = {
      x: viewport.xStart + Math.floor(viewport.width / 2),
      y: viewport.yStart + Math.floor(viewport.height / 2)
    };
    const map = createTestMap({ width: 64, height: 48, viewport });
    mapView.setMap(map, { focus });

    const baseViewport = getViewportOrigin(mapView);
    expect(baseViewport).toEqual({ xStart: viewport.xStart, yStart: viewport.yStart });

    const continuityLimit = viewport.width - 1;

    const display = mapView.elements.display;
    display.getBoundingClientRect = () => ({
      width: 600,
      height: 360,
      top: 0,
      left: 0,
      right: 600,
      bottom: 360,
      x: 0,
      y: 0,
      toJSON() {
        return this;
      }
    } as DOMRect);

    const startX = 400;
    const startY = 200;

    mapView.elements.wrapper.dispatchEvent(new MouseEvent('mousedown', {
      clientX: startX,
      clientY: startY,
      bubbles: true
    }));

    window.dispatchEvent(new MouseEvent('mousemove', {
      clientX: startX - 600,
      clientY: startY,
      bubbles: true
    }));

    const afterDrag = getViewportOrigin(mapView);
    expect(afterDrag.xStart).toBe(baseViewport.xStart + continuityLimit);
    expect(afterDrag.yStart).toBe(baseViewport.yStart);

    window.dispatchEvent(new MouseEvent('mouseup', {
      clientX: startX - 600,
      clientY: startY,
      bubbles: true
    }));

    mapView.destroy();
    container.remove();
  });
});
