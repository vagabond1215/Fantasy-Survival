import { afterEach, describe, expect, it } from 'vitest';
import createMapView from '../src/mapView.js';
import { DEFAULT_TERRAIN_COLORS } from '../src/map.js';
import { resolveTilePalette } from '../src/map/tileColors.js';

function hexToRgbString(hex: string): string {
  const value = hex.trim().replace(/^#/, '');
  if (value.length === 3) {
    const r = value[0];
    const g = value[1];
    const b = value[2];
    return hexToRgbString(`${r}${r}${g}${g}${b}${b}`);
  }
  if (value.length !== 6) {
    return hex.trim().toLowerCase();
  }
  const r = Number.parseInt(value.slice(0, 2), 16);
  const g = Number.parseInt(value.slice(2, 4), 16);
  const b = Number.parseInt(value.slice(4, 6), 16);
  return `rgb(${r}, ${g}, ${b})`;
}

function normalizeColor(color: string): string {
  const trimmed = (color || '').trim();
  if (!trimmed) return '';
  if (trimmed.startsWith('#')) {
    return hexToRgbString(trimmed);
  }
  if (/^rgb/i.test(trimmed)) {
    return trimmed
      .replace(/\s*,\s*/g, ', ')
      .replace(/\s+/g, ' ')
      .toLowerCase();
  }
  return trimmed.toLowerCase();
}

describe('map view terrain color coverage', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('fills every known terrain tile with a color', () => {
    const container = document.createElement('div');
    document.body.appendChild(container);

    const mapView = createMapView(container, {
      showControls: false,
      useTerrainColors: true
    });

    const terrainTypes = Object.keys(DEFAULT_TERRAIN_COLORS);
    const width = terrainTypes.length;
    const height = 1;
    const tiles = [terrainTypes.map(() => '·')];
    const types = [terrainTypes.slice()];

    mapView.setMap(
      {
        tiles,
        types,
        elevations: null,
        xStart: 0,
        yStart: 0,
        width,
        height,
        viewport: { xStart: 0, yStart: 0, width, height }
      },
      {
        focus: { x: Math.floor(width / 2), y: 0 }
      }
    );

    const palette = resolveTilePalette({ forceRefresh: true });
    const tilesRendered = Array.from(
      mapView.elements.display.querySelectorAll<HTMLSpanElement>('.map-tile')
    );

    expect(tilesRendered).toHaveLength(width);

    tilesRendered.forEach((tile, index) => {
      const type = terrainTypes[index];
      expect(tile.dataset.terrain).toBe(type);
      expect(tile.classList.contains('map-tile--fill')).toBe(true);
      const symbol = tile.querySelector<HTMLSpanElement>('.map-tile-symbol');
      expect(symbol).not.toBeNull();
      const expected = normalizeColor(palette[type]);
      const actual = normalizeColor(symbol?.style.backgroundColor ?? '');
      expect(actual).toBe(expected);
    });

    mapView.destroy();
    container.remove();
  });
});
