export interface CameraOptions {
  viewportWidth: number;
  viewportHeight: number;
  minZoom?: number;
  maxZoom?: number;
  initialZoom?: number;
  centerTile?: { x: number; y: number };
}

export interface CameraState {
  readonly centerTile: Readonly<{ x: number; y: number }>;
  readonly zoom: number;
  readonly minZoom: number;
  readonly maxZoom: number;
  readonly viewportWidth: number;
  readonly viewportHeight: number;
  setViewportSize(width: number, height: number): void;
  setCenterTile(tile: { x?: number; y?: number }, options?: { snap?: boolean }): void;
  setZoom(nextZoom: number): number;
  panBy(dx: number, dy: number, options?: { snap?: boolean }): void;
  commitSnap(): void;
  worldToScreen(tileX: number, tileY: number, tileSize: number): { x: number; y: number };
  worldToScreenCenter(tileX: number, tileY: number, tileSize: number): { x: number; y: number };
  screenToTile(x: number, y: number, tileSize: number): { x: number; y: number };
  getVisibleWorldBounds(tileSize: number): {
    minX: number;
    maxX: number;
    minY: number;
    maxY: number;
  };
  getScaledTileSize(tileSize: number): number;
}

function clamp(value: number, min: number, max: number): number {
  if (Number.isNaN(value)) return min;
  if (min > max) return value;
  if (value < min) return min;
  if (value > max) return max;
  return value;
}

function normalizeTileValue(value: number | undefined | null, fallback: number): number {
  if (!Number.isFinite(value)) return fallback;
  return value as number;
}

function snapToHalf(value: number): number {
  return Math.round(value * 2) / 2;
}

export function createCamera(options: CameraOptions): CameraState {
  const minZoom = options.minZoom && Number.isFinite(options.minZoom) ? Math.max(0.05, options.minZoom) : 0.1;
  const maxZoom = options.maxZoom && Number.isFinite(options.maxZoom) ? Math.max(minZoom, options.maxZoom) : Math.max(minZoom, 8);
  let viewportWidth = Math.max(0, Math.trunc(options.viewportWidth || 0));
  let viewportHeight = Math.max(0, Math.trunc(options.viewportHeight || 0));
  let centerX = normalizeTileValue(options.centerTile?.x, 0);
  let centerY = normalizeTileValue(options.centerTile?.y, 0);
  let zoom = clamp(
    Number.isFinite(options.initialZoom) ? (options.initialZoom as number) : 1,
    minZoom,
    maxZoom
  );

  const state: CameraState = {
    get centerTile() {
      return { x: centerX, y: centerY } as const;
    },
    get zoom() {
      return zoom;
    },
    get minZoom() {
      return minZoom;
    },
    get maxZoom() {
      return maxZoom;
    },
    get viewportWidth() {
      return viewportWidth;
    },
    get viewportHeight() {
      return viewportHeight;
    },
    setViewportSize(width: number, height: number) {
      if (Number.isFinite(width)) {
        viewportWidth = Math.max(0, Math.trunc(width));
      }
      if (Number.isFinite(height)) {
        viewportHeight = Math.max(0, Math.trunc(height));
      }
    },
    setCenterTile(tile: { x?: number; y?: number }, options = {}) {
      const nextX = normalizeTileValue(tile?.x, centerX);
      const nextY = normalizeTileValue(tile?.y, centerY);
      centerX = Number.isFinite(nextX) ? nextX : centerX;
      centerY = Number.isFinite(nextY) ? nextY : centerY;
      if (options.snap) {
        centerX = snapToHalf(centerX);
        centerY = snapToHalf(centerY);
      }
    },
    setZoom(nextZoom: number) {
      const previous = zoom;
      zoom = clamp(Number.isFinite(nextZoom) ? (nextZoom as number) : previous, minZoom, maxZoom);
      return zoom;
    },
    panBy(dx: number, dy: number, options = {}) {
      if (Number.isFinite(dx)) {
        centerX += dx;
      }
      if (Number.isFinite(dy)) {
        centerY += dy;
      }
      if (options.snap) {
        state.commitSnap();
      }
    },
    commitSnap() {
      centerX = snapToHalf(centerX);
      centerY = snapToHalf(centerY);
    },
    worldToScreen(tileX: number, tileY: number, tileSize: number) {
      const scale = state.getScaledTileSize(tileSize);
      const x = viewportWidth / 2 + (tileX - centerX - 0.5) * scale;
      const y = viewportHeight / 2 + (tileY - centerY - 0.5) * scale;
      return { x, y };
    },
    worldToScreenCenter(tileX: number, tileY: number, tileSize: number) {
      const scale = state.getScaledTileSize(tileSize);
      const x = viewportWidth / 2 + (tileX - centerX) * scale;
      const y = viewportHeight / 2 + (tileY - centerY) * scale;
      return { x, y };
    },
    screenToTile(x: number, y: number, tileSize: number) {
      const scale = state.getScaledTileSize(tileSize) || 1;
      const tileX = centerX + (x - viewportWidth / 2) / scale + 0.5;
      const tileY = centerY + (y - viewportHeight / 2) / scale + 0.5;
      return { x: tileX, y: tileY };
    },
    getVisibleWorldBounds(tileSize: number) {
      const scale = state.getScaledTileSize(tileSize) || 1;
      const halfWidthTiles = scale ? viewportWidth / (2 * scale) : 0;
      const halfHeightTiles = scale ? viewportHeight / (2 * scale) : 0;
      return {
        minX: centerX - halfWidthTiles - 1,
        maxX: centerX + halfWidthTiles + 1,
        minY: centerY - halfHeightTiles - 1,
        maxY: centerY + halfHeightTiles + 1
      };
    },
    getScaledTileSize(tileSize: number) {
      const base = Number.isFinite(tileSize) && tileSize > 0 ? tileSize : 1;
      return base * zoom;
    }
  };

  return state;
}

export type Camera = CameraState;
