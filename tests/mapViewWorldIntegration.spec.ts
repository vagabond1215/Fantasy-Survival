import { afterEach, describe, expect, it } from 'vitest';
import createMapView from '../src/mapView.js';
import { generateWorld } from '../src/world/generate';
import type { CanonicalSeed } from '../src/world/seed.js';
import { adaptWorldToMapData } from '../src/world/mapAdapter.js';

function extractViewportOrigin(mapView: ReturnType<typeof createMapView>) {
  const firstTile = mapView.elements.display.querySelector('.map-tile') as HTMLElement | null;
  if (!firstTile) {
    throw new Error('Map view did not render any tiles.');
  }
  const xStart = Number.parseInt(firstTile.dataset.worldX ?? '', 10);
  const yStart = Number.parseInt(firstTile.dataset.worldY ?? '', 10);
  if (!Number.isFinite(xStart) || !Number.isFinite(yStart)) {
    throw new Error('Tile origin coordinates are unavailable.');
  }
  return { xStart, yStart };
}

describe('map view integration with generated worlds', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('renders typed layer buffers from world generation and clamps navigation bounds', async () => {
    const container = document.createElement('div');
    document.body.appendChild(container);

    const mapView = createMapView(container, { showControls: false });

    const seed: CanonicalSeed = {
      raw: 'integration',
      normalized: 'integration',
      hex: '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef',
      lanes: [0, 0, 0, 0, 0, 0, 0, 0],
    };

    const world = generateWorld({ width: 16, height: 12, seed });

    const width = world.dimensions.width;
    const height = world.dimensions.height;
    const viewport = { xStart: width - 6, yStart: height - 5, width: 8, height: 6 };

    const mapData = adaptWorldToMapData(world, {
      seedInfo: seed,
      seedString: seed.raw,
      season: 'Sunheight',
      xStart: 0,
      yStart: 0,
      viewport,
    });

    const focus = {
      x: viewport.xStart + Math.floor(viewport.width / 2),
      y: viewport.yStart + Math.floor(viewport.height / 2),
    };

    mapView.setMap(mapData, { focus });

    await new Promise(resolve => setTimeout(resolve, 20));

    const initialOrigin = extractViewportOrigin(mapView);
    const maxStartX = Math.max(0, width - viewport.width);
    const maxStartY = Math.max(0, height - viewport.height);

    expect(initialOrigin.xStart).toBe(Math.min(viewport.xStart, maxStartX));
    expect(initialOrigin.yStart).toBe(Math.min(viewport.yStart, maxStartY));

    const tilesRendered = mapView.elements.display.querySelectorAll('.map-tile');
    expect(tilesRendered).toHaveLength(viewport.width * viewport.height);

    mapView.elements.wrapper.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true })
    );

    await new Promise(resolve => setTimeout(resolve, 20));
    const afterRight = extractViewportOrigin(mapView);
    expect(afterRight.xStart).toBeLessThanOrEqual(maxStartX);

    mapView.elements.wrapper.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true })
    );
    mapView.elements.wrapper.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true })
    );

    await new Promise(resolve => setTimeout(resolve, 20));

    const afterLeft = extractViewportOrigin(mapView);
    expect(afterLeft.xStart).toBeGreaterThanOrEqual(0);

    mapView.destroy();
    container.remove();
  });
});
