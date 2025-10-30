const DEFAULT_TILE_SIZE = 32;
const DEFAULT_CORNER_RADIUS_FACTOR = 0.24;

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
    this.tileBaseSize = Math.max(
      2,
      Math.trunc(options.tileBaseSize || DEFAULT_TILE_SIZE),
    );
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
  }
  setTileBaseSize(size) {
    if (!Number.isFinite(size) || size <= 0) return;
    this.tileBaseSize = Math.max(2, Math.trunc(size));
  }
  setUseTerrainColors(enabled) {
    this.useTerrainColors = Boolean(enabled);
  }
  setTerrainColorResolver(resolver) {
    this.getTerrainColor = resolver;
  }
  setTerrainGradientResolver(resolver) {
    this.getTerrainGradient = resolver;
  }
  setScale(scale) {
    if (!Number.isFinite(scale) || scale <= 0) return;
    this.scale = scale;
  }
  setMap(map) {
    this.map = map;
  }
  setDevelopments(entries) {
    this.developments = entries;
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
    const tileSize = Math.max(2, this.tileBaseSize * (this.scale || 1));
    const rows = this.map.tiles.length;
    const cols = this.map.tiles[0]?.length || 0;
    const startX = this.map.xStart;
    const startY = this.map.yStart;
    const accentColor = readCssVariable("--accent", "#f7c948");
    const strokeColor = accentColor || "#f7c948";
    const gapAlpha = 0.35;
    const strokeWidth = Math.max(1, Math.round(tileSize * 0.09));
    const cornerRadius = Math.max(1.5, tileSize * DEFAULT_CORNER_RADIUS_FACTOR);

    for (let row = 0; row < rows; row++) {
      const tileRow = this.map.tiles[row];
      if (!tileRow) continue;
      for (let col = 0; col < cols; col++) {
        const worldX = startX + col;
        const worldY = startY + row;
        const { x, y } = this.camera.worldToScreen(
          worldX,
          worldY,
          this.tileBaseSize,
        );
        const drawX = Math.round(x);
        const drawY = Math.round(y);
        const type = this.map.types?.[row]?.[col] ?? null;
        const gradient = this.useTerrainColors
          ? this.getTerrainGradient(type)
          : null;
        const fallbackFill = this.useTerrainColors
          ? this.getTerrainColor(type)
          : "rgba(148, 163, 184, 0.25)";
        const width = Math.ceil(tileSize);
        const height = Math.ceil(tileSize);
        drawRoundedRectPath(ctx, drawX, drawY, width, height, cornerRadius);
        if (gradient && (gradient.start || gradient.end)) {
          const startColor = gradient.start || fallbackFill || strokeColor;
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
          ctx.fillStyle = fallbackFill || strokeColor;
        }
        ctx.fill();
        ctx.save();
        ctx.lineWidth = strokeWidth;
        ctx.lineJoin = "round";
        ctx.lineCap = "round";
        ctx.strokeStyle = strokeColor;
        ctx.globalAlpha = gapAlpha;
        drawRoundedRectPath(ctx, drawX, drawY, width, height, cornerRadius);
        ctx.stroke();
        ctx.restore();
        const developmentKey = `${worldX}:${worldY}`;
        const development = this.developments.get(developmentKey) || null;
        if (development) {
          this.drawDevelopmentOverlay(ctx, drawX, drawY, tileSize, development);
        }
      }
    }
    ctx.restore();
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
