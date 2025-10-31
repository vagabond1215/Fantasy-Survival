import {
  tileCanvasCache,
  acquireSharedCanvas,
  releaseSharedCanvas,
} from "../storage/chunkCache.js";

const DEFAULT_TILE_SIZE = 16;
const DEFAULT_CORNER_RADIUS_FACTOR = 0.24;
const DEFAULT_CHUNK_SIZE = 32;
const DEFAULT_PREFETCH_MARGIN = 0;

function drawRoundedRectPath(ctx, x, y, width, height, radius) {
  const cornerRadius = Math.max(0, Math.min(radius, Math.min(width, height) / 2));
  if (typeof ctx.roundRect === "function") {
    ctx.beginPath();
    ctx.roundRect(x, y, width, height, cornerRadius);
    return;
  }
  ctx.beginPath();
  ctx.moveTo(x + cornerRadius, y);
  ctx.lineTo(x + width - cornerRadius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + cornerRadius);
  ctx.lineTo(x + width, y + height - cornerRadius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - cornerRadius, y + height);
  ctx.lineTo(x + cornerRadius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - cornerRadius);
  ctx.lineTo(x, y + cornerRadius);
  ctx.quadraticCurveTo(x, y, x + cornerRadius, y);
  ctx.closePath();
}
function readCssVariable(name, fallback) {
  if (typeof window === "undefined" || typeof document === "undefined") {
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
function resolveDevelopmentStroke(status) {
  const accent = readCssVariable("--accent", "#f7c948");
  const strong = readCssVariable("--accent-strong", "#d4a72c");
  const warn = readCssVariable("--warn", "#ff9f47");
  const emphasis = readCssVariable("--accent-stronger", "#f59e0b");
  const normalized = status?.toLowerCase() || "";
  switch (normalized) {
    case "completed":
    case "complete":
      return strong || accent;
    case "under-construction":
    case "under construction":
    case "construction":
    case "in-progress":
      return warn;
    case "planned":
    case "queued":
      return emphasis || warn;
    case "mixed":
      return readCssVariable("--accent", warn);
    default:
      return accent;
  }
}
export class MapRenderer {
  constructor(canvas, options) {
    this.canvas = canvas;
    let context = null;
    try {
      context = canvas.getContext("2d");
    } catch (_error) {
      context = null;
    }
    this.ctx = context;
    this.camera = options.camera;
    const providedTileSize = Number.isFinite(options.tileBaseSize)
      ? options.tileBaseSize
      : DEFAULT_TILE_SIZE;
    this.tileBaseSize = Math.max(2, providedTileSize);
    this.useTerrainColors = options.useTerrainColors ?? false;
    this.getTerrainColor = options.getTerrainColor || (() => null);
    this.getTerrainGradient = options.getTerrainGradient || (() => null);
    this.devicePixelRatio =
      typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1;
    this.viewportWidth = Math.max(
      1,
      this.camera.viewportWidth || this.canvas.clientWidth || 1,
    );
    this.viewportHeight = Math.max(
      1,
      this.camera.viewportHeight || this.canvas.clientHeight || 1,
    );
    this.map = null;
    this.developments = new Map();
    this.scale = this.camera.zoom;
    this.configureCanvasSize(this.viewportWidth, this.viewportHeight);
    this.chunkSize = Math.max(4, options.chunkSize || DEFAULT_CHUNK_SIZE);
    this.prefetchMargin = Math.max(
      0,
      Number.isFinite(options.prefetchMargin)
        ? Math.trunc(options.prefetchMargin)
        : DEFAULT_PREFETCH_MARGIN,
    );
    this.cacheSignature = 1;
  }
  setTileBaseSize(size) {
    if (!Number.isFinite(size) || size <= 0) return;
    this.tileBaseSize = Math.max(2, size);
  }
  setUseTerrainColors(enabled) {
    const normalized = Boolean(enabled);
    if (this.useTerrainColors !== normalized) {
      this.useTerrainColors = normalized;
      this.invalidateTileCache();
    }
  }
  setTerrainColorResolver(resolver) {
    if (this.getTerrainColor !== resolver) {
      this.getTerrainColor = resolver;
      this.invalidateTileCache();
    }
  }
  setTerrainGradientResolver(resolver) {
    if (this.getTerrainGradient !== resolver) {
      this.getTerrainGradient = resolver;
      this.invalidateTileCache();
    }
  }
  setScale(scale) {
    if (!Number.isFinite(scale) || scale <= 0) return;
    this.scale = scale;
  }
  setMap(map) {
    const previousSeed = this.map?.seed ?? null;
    const previousSeason = this.map?.season ?? null;
    const previousWater = this.map?.waterLevel ?? null;
    const nextSeed = map?.seed ?? null;
    const nextSeason = map?.season ?? null;
    const nextWater = map?.waterLevel ?? null;
    if (
      previousSeed !== nextSeed ||
      previousSeason !== nextSeason ||
      previousWater !== nextWater
    ) {
      this.invalidateTileCache();
    }
    this.map = map;
  }
  setDevelopments(entries) {
    this.developments = entries;
  }
  setPrefetchMargin(margin) {
    if (!Number.isFinite(margin)) {
      return;
    }
    const normalized = Math.max(0, Math.trunc(margin));
    if (normalized === this.prefetchMargin) {
      return;
    }
    this.prefetchMargin = normalized;
  }
  resize(width, height) {
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
    const tileSize = this.camera?.getScaledTileSize
      ? Math.max(2, this.camera.getScaledTileSize(this.tileBaseSize))
      : Math.max(2, this.tileBaseSize * (this.scale || 1));
    const accentColor = readCssVariable("--accent", "#f7c948");
    const strokeColor = accentColor || "#f7c948";
    const gapAlpha = 0.35;
    const strokeWidth = Math.max(1, Math.round(tileSize * 0.09));
    const cornerRadius = Math.max(1.5, tileSize * DEFAULT_CORNER_RADIUS_FACTOR);
    const tilePixelSize = Math.max(1, Math.ceil(tileSize));
    const chunkPadding = Math.max(2, Math.ceil(strokeWidth * 0.75));

    const style = {
      tileSize,
      tilePixelSize,
      strokeColor,
      gapAlpha,
      strokeWidth,
      cornerRadius,
      padding: chunkPadding,
    };

    const computedChunks = new Map();
    const prefetchChunks = this.computeChunkRange(
      tileSize,
      this.prefetchMargin,
    );
    for (const geometry of prefetchChunks) {
      this.ensureChunkCanvas(geometry, style, computedChunks);
    }

    const visibleChunks = this.computeChunkRange(tileSize, 0);
    for (const geometry of visibleChunks) {
      const chunkResult = this.ensureChunkCanvas(
        geometry,
        style,
        computedChunks,
      );
      if (chunkResult?.canvas) {
        const screen = this.camera.worldToScreen(
          geometry.worldX + geometry.startCol,
          geometry.worldY + geometry.startRow,
          this.tileBaseSize,
        );
        const drawX = Math.round(screen.x) - chunkPadding;
        const drawY = Math.round(screen.y) - chunkPadding;
        const destWidth =
          geometry.tileCols * tilePixelSize + chunkPadding * 2;
        const destHeight =
          geometry.tileRows * tilePixelSize + chunkPadding * 2;
        ctx.drawImage(
          chunkResult.canvas,
          0,
          0,
          destWidth,
          destHeight,
          drawX,
          drawY,
          destWidth,
          destHeight,
        );
      } else {
        this.drawChunkDirect(ctx, geometry, style);
      }
    }

    this.drawVisibleDevelopments(ctx, tileSize);
    ctx.restore();
  }
  invalidateTileCache() {
    this.cacheSignature = (this.cacheSignature + 1) % 1_000_000_000;
  }
  buildChunkKey(geometry, style) {
    const sizeKey = Math.round(style.tileSize * 1000);
    return [
      this.cacheSignature,
      sizeKey,
      geometry.chunkX,
      geometry.chunkY,
      geometry.startCol,
      geometry.startRow,
      geometry.tileCols,
      geometry.tileRows,
    ].join(":");
  }
  computeChunkRange(tileSize, margin) {
    if (!this.map || !this.map.tiles?.length) {
      return [];
    }
    const chunkSize = this.chunkSize;
    const mapStartX = Number.isFinite(this.map.xStart) ? this.map.xStart : 0;
    const mapStartY = Number.isFinite(this.map.yStart) ? this.map.yStart : 0;
    const mapWidth = Math.max(0, Math.trunc(this.map.width || 0));
    const mapHeight = Math.max(0, Math.trunc(this.map.height || 0));
    const mapEndX = mapStartX + mapWidth;
    const mapEndY = mapStartY + mapHeight;
    if (mapWidth <= 0 || mapHeight <= 0) {
      return [];
    }

    let minWorldX = mapStartX;
    let minWorldY = mapStartY;
    let maxWorldX = mapEndX;
    let maxWorldY = mapEndY;
    const bounds =
      typeof this.camera?.getVisibleWorldBounds === "function"
        ? this.camera.getVisibleWorldBounds(this.tileBaseSize)
        : null;
    if (bounds) {
      const marginTiles = Math.max(0, Math.trunc(margin || 0));
      minWorldX = Math.max(
        mapStartX,
        Math.floor(bounds.minX - marginTiles),
      );
      minWorldY = Math.max(
        mapStartY,
        Math.floor(bounds.minY - marginTiles),
      );
      maxWorldX = Math.min(mapEndX, Math.ceil(bounds.maxX + marginTiles));
      maxWorldY = Math.min(mapEndY, Math.ceil(bounds.maxY + marginTiles));
    }

    if (minWorldX >= maxWorldX || minWorldY >= maxWorldY) {
      return [];
    }

    const startChunkX = Math.floor(minWorldX / chunkSize);
    const endChunkX = Math.floor((maxWorldX - 1) / chunkSize);
    const startChunkY = Math.floor(minWorldY / chunkSize);
    const endChunkY = Math.floor((maxWorldY - 1) / chunkSize);
    const geometries = [];

    for (let chunkY = startChunkY; chunkY <= endChunkY; chunkY++) {
      for (let chunkX = startChunkX; chunkX <= endChunkX; chunkX++) {
        const worldX = chunkX * chunkSize;
        const worldY = chunkY * chunkSize;
        const chunkStartCol = Math.max(0, mapStartX - worldX);
        const chunkStartRow = Math.max(0, mapStartY - worldY);
        const chunkEndCol = Math.min(chunkSize, mapEndX - worldX);
        const chunkEndRow = Math.min(chunkSize, mapEndY - worldY);
        const tileCols = Math.max(0, chunkEndCol - chunkStartCol);
        const tileRows = Math.max(0, chunkEndRow - chunkStartRow);
        if (tileCols <= 0 || tileRows <= 0) {
          continue;
        }
        geometries.push({
          chunkX,
          chunkY,
          worldX,
          worldY,
          startCol: chunkStartCol,
          startRow: chunkStartRow,
          tileCols,
          tileRows,
        });
      }
    }

    return geometries;
  }
  ensureChunkCanvas(geometry, style, cacheMap) {
    if (!geometry) {
      return null;
    }
    const key = this.buildChunkKey(geometry, style);
    if (cacheMap?.has(key)) {
      return cacheMap.get(key);
    }
    let canvas = tileCanvasCache.get(key);
    if (!canvas) {
      canvas = this.createChunkCanvas(geometry, style);
      if (canvas) {
        tileCanvasCache.set(key, canvas);
      }
    }
    const result = canvas
      ? { canvas, geometry }
      : { canvas: null, geometry };
    if (cacheMap) {
      cacheMap.set(key, result);
    }
    return result;
  }
  createChunkCanvas(geometry, style) {
    if (!this.map || !this.map.tiles?.length) {
      return null;
    }
    const tilePixelSize = style.tilePixelSize;
    const padding = style.padding;
    const width = geometry.tileCols * tilePixelSize + padding * 2;
    const height = geometry.tileRows * tilePixelSize + padding * 2;
    const mapStartX = Number.isFinite(this.map.xStart) ? this.map.xStart : 0;
    const mapStartY = Number.isFinite(this.map.yStart) ? this.map.yStart : 0;
    const canvas = acquireSharedCanvas(Math.max(width, height));
    if (!canvas) {
      return null;
    }
    if (Number.isFinite(width)) {
      canvas.width = width;
    }
    if (Number.isFinite(height)) {
      canvas.height = height;
    }
    const ctx = canvas.getContext("2d");
    if (!ctx || !("clearRect" in ctx)) {
      releaseSharedCanvas(canvas);
      return null;
    }
    const renderingCtx = /** @type {
      | CanvasRenderingContext2D
      | OffscreenCanvasRenderingContext2D
    } */ (ctx);
    renderingCtx.clearRect(0, 0, canvas.width, canvas.height);
    for (
      let localRow = geometry.startRow;
      localRow < geometry.startRow + geometry.tileRows;
      localRow++
    ) {
      const worldY = geometry.worldY + localRow;
      const mapRow = worldY - mapStartY;
      const typeRow = this.map.types?.[mapRow] || null;
      for (
        let localCol = geometry.startCol;
        localCol < geometry.startCol + geometry.tileCols;
        localCol++
      ) {
        const worldX = geometry.worldX + localCol;
        const mapCol = worldX - mapStartX;
        if (mapRow < 0 || mapCol < 0) {
          continue;
        }
        const type = typeRow?.[mapCol] ?? null;
        const drawX =
          padding + (localCol - geometry.startCol) * tilePixelSize;
        const drawY =
          padding + (localRow - geometry.startRow) * tilePixelSize;
        this.drawTileBase(renderingCtx, drawX, drawY, style, type);
      }
    }
    return canvas;
  }
  drawTileBase(ctx, drawX, drawY, style, type) {
    const width = style.tilePixelSize;
    const height = style.tilePixelSize;
    const gradient = this.useTerrainColors
      ? this.getTerrainGradient(type)
      : null;
    const fallbackFill = this.useTerrainColors
      ? this.getTerrainColor(type)
      : "rgba(148, 163, 184, 0.25)";
    drawRoundedRectPath(
      ctx,
      drawX,
      drawY,
      width,
      height,
      style.cornerRadius,
    );
    if (gradient && (gradient.start || gradient.end)) {
      const startColor = gradient.start || fallbackFill || style.strokeColor;
      const endColor = gradient.end || startColor;
      const fillGradient = ctx.createLinearGradient(
        drawX,
        drawY,
        drawX,
        drawY + height,
      );
      fillGradient.addColorStop(0, startColor);
      fillGradient.addColorStop(1, endColor);
      ctx.fillStyle = fillGradient;
    } else {
      ctx.fillStyle = fallbackFill || style.strokeColor;
    }
    ctx.fill();
    ctx.save();
    ctx.lineWidth = style.strokeWidth;
    ctx.lineJoin = "round";
    ctx.lineCap = "round";
    ctx.strokeStyle = style.strokeColor;
    ctx.globalAlpha = style.gapAlpha;
    drawRoundedRectPath(
      ctx,
      drawX,
      drawY,
      width,
      height,
      style.cornerRadius,
    );
    ctx.stroke();
    ctx.restore();
  }
  drawChunkDirect(ctx, geometry, style) {
    const mapStartX = Number.isFinite(this.map?.xStart)
      ? this.map.xStart
      : 0;
    const mapStartY = Number.isFinite(this.map?.yStart)
      ? this.map.yStart
      : 0;
    for (
      let localRow = geometry.startRow;
      localRow < geometry.startRow + geometry.tileRows;
      localRow++
    ) {
      const worldY = geometry.worldY + localRow;
      const mapRow = worldY - mapStartY;
      const typeRow = this.map.types?.[mapRow] || null;
      for (
        let localCol = geometry.startCol;
        localCol < geometry.startCol + geometry.tileCols;
        localCol++
      ) {
        const worldX = geometry.worldX + localCol;
        const mapCol = worldX - mapStartX;
        if (mapRow < 0 || mapCol < 0) {
          continue;
        }
        const type = typeRow?.[mapCol] ?? null;
        const screen = this.camera.worldToScreen(
          worldX,
          worldY,
          this.tileBaseSize,
        );
        const drawX = Math.round(screen.x);
        const drawY = Math.round(screen.y);
        this.drawTileBase(ctx, drawX, drawY, style, type);
      }
    }
  }
  drawVisibleDevelopments(ctx, tileSize) {
    if (!this.developments || this.developments.size === 0) {
      return;
    }
    const mapStartX = this.map?.xStart ?? 0;
    const mapStartY = this.map?.yStart ?? 0;
    const mapEndX = mapStartX + (this.map?.width ?? 0);
    const mapEndY = mapStartY + (this.map?.height ?? 0);
    for (const development of this.developments.values()) {
      if (!development) continue;
      const worldX = Number.isFinite(development.x)
        ? development.x
        : null;
      const worldY = Number.isFinite(development.y)
        ? development.y
        : null;
      if (worldX === null || worldY === null) {
        continue;
      }
      if (
        worldX < mapStartX ||
        worldY < mapStartY ||
        worldX >= mapEndX ||
        worldY >= mapEndY
      ) {
        continue;
      }
      const { x, y } = this.camera.worldToScreen(
        worldX,
        worldY,
        this.tileBaseSize,
      );
      const drawX = Math.round(x);
      const drawY = Math.round(y);
      this.drawDevelopmentOverlay(ctx, drawX, drawY, tileSize, development);
    }
  }
  hitTest(x, y) {
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
    const symbol = tileRow[col] ?? "";
    const type = this.map.types?.[row]?.[col] ?? null;
    const developmentKey = `${worldX}:${worldY}`;
    const development = this.developments.get(developmentKey) || null;
    return {
      x: worldX,
      y: worldY,
      col,
      row,
      symbol: symbol ?? "",
      type: type ?? null,
      development,
    };
  }
  configureCanvasSize(width, height) {
    this.devicePixelRatio =
      typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1;
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
  drawDevelopmentOverlay(ctx, x, y, tileSize, development) {
    const strokeColor = resolveDevelopmentStroke(development.status);
    const outlineWidth = Math.max(1, Math.round(tileSize * 0.08));
    const inset = Math.max(2, Math.round(tileSize * 0.18));
    const width = Math.max(1, Math.ceil(tileSize));
    const height = Math.max(1, Math.ceil(tileSize));
    const baseRadius = Math.max(1, tileSize * DEFAULT_CORNER_RADIUS_FACTOR);
    ctx.save();
    ctx.lineWidth = outlineWidth;
    ctx.strokeStyle = strokeColor;
    ctx.globalAlpha = 0.85;
    const insetRadius = Math.max(1, baseRadius - inset * 0.6);
    drawRoundedRectPath(
      ctx,
      x + inset,
      y + inset,
      Math.max(1, width - inset * 2),
      Math.max(1, height - inset * 2),
      insetRadius,
    );
    ctx.stroke();
    if (development.emphasis || development.highlight) {
      ctx.lineWidth = Math.max(outlineWidth * 0.6, 1);
      ctx.globalAlpha = 0.45;
      const glowInset = Math.max(1, inset - outlineWidth * 1.2);
      const glowRadius = Math.max(1, baseRadius - glowInset * 0.5);
      drawRoundedRectPath(
        ctx,
        x + glowInset,
        y + glowInset,
        Math.max(1, width - glowInset * 2),
        Math.max(1, height - glowInset * 2),
        glowRadius,
      );
      ctx.stroke();
    }
    ctx.restore();
  }
}
export function createMapRenderer(canvas, options) {
  return new MapRenderer(canvas, options);
}
