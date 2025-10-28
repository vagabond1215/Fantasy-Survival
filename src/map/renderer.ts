import type { Camera } from './camera';

export interface MapChunk {
  tiles: string[][];
  types?: (string | null)[][] | null;
  xStart: number;
  yStart: number;
  width: number;
  height: number;
}

export interface DevelopmentInfo {
  x: number;
  y: number;
  status: string;
  label?: string;
  tooltip?: string;
  structures?: string[];
  count?: number;
  emphasis?: boolean;
  highlight?: boolean;
}

export interface MapRendererOptions {
  camera: Camera;
  tileBaseSize?: number;
  useTerrainColors?: boolean;
  getTerrainColor?: (type: string | null | undefined) => string | null;
}

interface TileInfo {
  x: number;
  y: number;
  col: number;
  row: number;
  symbol: string;
  type: string | null;
  development?: DevelopmentInfo | null;
}

const DEFAULT_TILE_SIZE = 32;
const SYMBOL_FONT_STACK = '\"Apple Color Emoji\", \"Segoe UI Emoji\", \"Noto Color Emoji\", sans-serif';

function readCssVariable(name: string, fallback: string): string {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return fallback;
  }
  try {
    const styles = getComputedStyle(document.documentElement);
    const value = styles.getPropertyValue(name).trim();
    return value || fallback;
  } catch (error) {
    return fallback;
  }
}

function resolveDevelopmentStroke(status: string): string {
  const accent = readCssVariable('--accent', '#f7c948');
  const strong = readCssVariable('--accent-strong', '#d4a72c');
  const warn = readCssVariable('--warn', '#ff9f47');
  const emphasis = readCssVariable('--accent-stronger', '#f59e0b');
  const normalized = status?.toLowerCase() || '';
  switch (normalized) {
    case 'completed':
    case 'complete':
      return strong || accent;
    case 'under-construction':
    case 'under construction':
    case 'construction':
    case 'in-progress':
      return warn;
    case 'planned':
    case 'queued':
      return emphasis || warn;
    case 'mixed':
      return readCssVariable('--accent', warn);
    default:
      return accent;
  }
}

export class MapRenderer {
  private readonly canvas: HTMLCanvasElement;
  private readonly ctx: CanvasRenderingContext2D | null;
  private readonly camera: Camera;
  private tileBaseSize: number;
  private useTerrainColors: boolean;
  private getTerrainColor: (type: string | null | undefined) => string | null;
  private devicePixelRatio: number;
  private viewportWidth: number;
  private viewportHeight: number;
  private map: MapChunk | null;
  private developments: Map<string, DevelopmentInfo>;
  private scale: number;

  constructor(canvas: HTMLCanvasElement, options: MapRendererOptions) {
    this.canvas = canvas;
    let context: CanvasRenderingContext2D | null = null;
    try {
      context = canvas.getContext('2d');
    } catch (_error) {
      context = null;
    }
    this.ctx = context;
    this.camera = options.camera;
    this.tileBaseSize = Math.max(2, Math.trunc(options.tileBaseSize || DEFAULT_TILE_SIZE));
    this.useTerrainColors = options.useTerrainColors ?? false;
    this.getTerrainColor = options.getTerrainColor || (() => null);
    this.devicePixelRatio = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;
    this.viewportWidth = Math.max(1, this.camera.viewportWidth || this.canvas.clientWidth || 1);
    this.viewportHeight = Math.max(1, this.camera.viewportHeight || this.canvas.clientHeight || 1);
    this.map = null;
    this.developments = new Map();
    this.scale = this.camera.zoom;
    this.configureCanvasSize(this.viewportWidth, this.viewportHeight);
  }

  setTileBaseSize(size: number) {
    if (!Number.isFinite(size) || size <= 0) return;
    this.tileBaseSize = Math.max(2, Math.trunc(size));
  }

  setUseTerrainColors(enabled: boolean) {
    this.useTerrainColors = Boolean(enabled);
  }

  setTerrainColorResolver(resolver: (type: string | null | undefined) => string | null) {
    this.getTerrainColor = resolver;
  }

  setScale(scale: number) {
    if (!Number.isFinite(scale) || scale <= 0) return;
    this.scale = scale;
  }

  setMap(map: MapChunk | null) {
    this.map = map;
  }

  setDevelopments(entries: Map<string, DevelopmentInfo>) {
    this.developments = entries;
  }

  resize(width: number, height: number) {
    const normalizedWidth = Math.max(1, Math.round(width));
    const normalizedHeight = Math.max(1, Math.round(height));
    this.viewportWidth = normalizedWidth;
    this.viewportHeight = normalizedHeight;
    this.camera.setViewportSize(normalizedWidth, normalizedHeight);
    this.configureCanvasSize(normalizedWidth, normalizedHeight);
  }

  render() {
    if (!this.ctx) return;
    const ctx = this.ctx;
    ctx.save();
    ctx.setTransform(this.devicePixelRatio, 0, 0, this.devicePixelRatio, 0, 0);
    ctx.clearRect(0, 0, this.viewportWidth, this.viewportHeight);

    if (!this.map || !this.map.tiles?.length) {
      ctx.restore();
      return;
    }

    const tileSize = Math.max(2, this.tileBaseSize * (this.scale || 1));
    const tileFontSize = Math.max(6, Math.floor(tileSize * 0.78));

    ctx.font = `${tileFontSize}px ${SYMBOL_FONT_STACK}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    const rows = this.map.tiles.length;
    const cols = this.map.tiles[0]?.length || 0;
    const startX = this.map.xStart;
    const startY = this.map.yStart;

    for (let row = 0; row < rows; row++) {
      const tileRow = this.map.tiles[row];
      if (!tileRow) continue;
      for (let col = 0; col < cols; col++) {
        const symbol = tileRow[col] ?? '';
        const worldX = startX + col;
        const worldY = startY + row;
        const { x, y } = this.camera.worldToScreen(worldX, worldY, this.tileBaseSize);
        const drawX = Math.round(x);
        const drawY = Math.round(y);

        const type = this.map.types?.[row]?.[col] ?? null;
        const fillColor = this.useTerrainColors ? this.getTerrainColor(type) : null;
        if (fillColor) {
          ctx.fillStyle = fillColor;
          ctx.fillRect(drawX, drawY, Math.ceil(tileSize), Math.ceil(tileSize));
          ctx.strokeStyle = 'rgba(0, 0, 0, 0.18)';
          ctx.lineWidth = Math.max(1, Math.round(tileSize * 0.03));
          ctx.strokeRect(drawX + 0.5, drawY + 0.5, Math.ceil(tileSize) - 1, Math.ceil(tileSize) - 1);
        } else {
          ctx.fillStyle = 'rgba(0, 0, 0, 0)';
          ctx.fillRect(drawX, drawY, Math.ceil(tileSize), Math.ceil(tileSize));
        }

        if (symbol) {
          ctx.fillStyle = fillColor ? 'rgba(16, 24, 40, 0.92)' : 'rgba(15, 23, 42, 0.88)';
          ctx.fillText(symbol, drawX + tileSize / 2, drawY + tileSize / 2 + tileSize * 0.02);
        }

        const developmentKey = `${worldX}:${worldY}`;
        const development = this.developments.get(developmentKey) || null;
        if (development) {
          this.drawDevelopmentOverlay(ctx, drawX, drawY, tileSize, development);
        }
      }
    }

    ctx.restore();
  }

  hitTest(x: number, y: number): TileInfo | null {
    if (!this.map || !this.map.tiles?.length) return null;
    const coords = this.camera.screenToTile(x, y, this.tileBaseSize);
    const worldX = Math.floor(coords.x);
    const worldY = Math.floor(coords.y);
    const col = worldX - this.map.xStart;
    const row = worldY - this.map.yStart;
    if (row < 0 || col < 0 || row >= this.map.height || col >= this.map.width) {
      return null;
    }
    const tileRow = this.map.tiles[row];
    if (!tileRow) return null;
    const symbol = tileRow[col] ?? '';
    const type = this.map.types?.[row]?.[col] ?? null;
    const developmentKey = `${worldX}:${worldY}`;
    const development = this.developments.get(developmentKey) || null;
    return {
      x: worldX,
      y: worldY,
      col,
      row,
      symbol: symbol ?? '',
      type: type ?? null,
      development
    };
  }

  private configureCanvasSize(width: number, height: number) {
    this.devicePixelRatio = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;
    const pixelWidth = Math.max(1, Math.round(width * this.devicePixelRatio));
    const pixelHeight = Math.max(1, Math.round(height * this.devicePixelRatio));
    if (this.canvas.width !== pixelWidth) {
      this.canvas.width = pixelWidth;
    }
    if (this.canvas.height !== pixelHeight) {
      this.canvas.height = pixelHeight;
    }
    this.canvas.style.width = `${width}px`;
    this.canvas.style.height = `${height}px`;
  }

  private drawDevelopmentOverlay(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    tileSize: number,
    development: DevelopmentInfo
  ) {
    const strokeColor = resolveDevelopmentStroke(development.status);
    const outlineWidth = Math.max(1, Math.round(tileSize * 0.08));
    const inset = Math.max(2, Math.round(tileSize * 0.18));
    ctx.save();
    ctx.lineWidth = outlineWidth;
    ctx.strokeStyle = strokeColor;
    ctx.globalAlpha = 0.85;
    ctx.strokeRect(x + inset, y + inset, Math.max(1, tileSize - inset * 2), Math.max(1, tileSize - inset * 2));
    if (development.emphasis || development.highlight) {
      ctx.lineWidth = Math.max(outlineWidth * 0.6, 1);
      ctx.globalAlpha = 0.45;
      const glowInset = Math.max(1, inset - outlineWidth * 1.2);
      ctx.strokeRect(
        x + glowInset,
        y + glowInset,
        Math.max(1, tileSize - glowInset * 2),
        Math.max(1, tileSize - glowInset * 2)
      );
    }
    ctx.restore();
  }
}

export function createMapRenderer(
  canvas: HTMLCanvasElement,
  options: MapRendererOptions
): MapRenderer {
  return new MapRenderer(canvas, options);
}

export type { TileInfo };
