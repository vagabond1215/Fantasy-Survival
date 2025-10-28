export interface CameraOptions {
  viewportWidth: number;
  viewportHeight: number;
  minZoom?: number;
  maxZoom?: number;
  initialZoom?: number;
  centerTile?: { x: number; y: number };
}

export type CameraSnapPivot = 'centerTile' | 'viewport';

export interface CameraState {
  readonly centerTile: Readonly<{ x: number; y: number }>;
  readonly zoom: number;
  readonly minZoom: number;
  readonly maxZoom: number;
  readonly viewportWidth: number;
  readonly viewportHeight: number;
  setViewportSize(width: number, height: number): void;
  setCenterTile(tile: { x?: number; y?: number }, options?: { snap?: boolean }): void;
  setZoom(nextZoom: number, pivot?: CameraSnapPivot): number;
  panBy(dx: number, dy: number, options?: { snap?: boolean }): void;
  commitSnap(options?: {
    animate?: boolean;
    duration?: number;
    easing?: (progress: number) => number;
    onUpdate?: (center: { x: number; y: number }) => void;
    onComplete?: (center: { x: number; y: number }) => void;
  }): { targetX: number; targetY: number; changed: boolean };
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

type FrameHandle = number | ReturnType<typeof setTimeout>;

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
  let animationFrame: FrameHandle | null = null;
  let animationStartTime: number | null = null;
  let animationDuration = 0;
  let animationStartX = centerX;
  let animationStartY = centerY;
  let animationTargetX = centerX;
  let animationTargetY = centerY;
  let animationEasing: ((progress: number) => number) | null = null;
  let animationOnUpdate: ((center: { x: number; y: number }) => void) | null = null;
  let animationOnComplete: ((center: { x: number; y: number }) => void) | null = null;

  const requestFrame = (callback: (timestamp: number) => void): FrameHandle => {
    if (typeof window !== 'undefined' && typeof window.requestAnimationFrame === 'function') {
      return window.requestAnimationFrame(callback);
    }
    return setTimeout(() => callback(Date.now()), 16);
  };

  const cancelFrame = (handle: FrameHandle) => {
    if (handle === null || handle === undefined) return;
    if (typeof window !== 'undefined' && typeof window.cancelAnimationFrame === 'function' && typeof handle === 'number') {
      window.cancelAnimationFrame(handle);
      return;
    }
    clearTimeout(handle as ReturnType<typeof setTimeout>);
  };

  function stopAnimation(finalize = false) {
    if (animationFrame !== null) {
      cancelFrame(animationFrame);
      animationFrame = null;
    }
    animationStartTime = null;
    if (finalize) {
      centerX = animationTargetX;
      centerY = animationTargetY;
    }
    animationOnUpdate = null;
    animationOnComplete = null;
    animationEasing = null;
  }

  function easeOutCubic(progress: number): number {
    const normalized = progress < 0 ? 0 : progress > 1 ? 1 : progress;
    const inverted = 1 - normalized;
    return 1 - inverted * inverted * inverted;
  }

  function startSnapAnimation(duration: number, easing: (progress: number) => number) {
    animationDuration = duration;
    animationStartX = centerX;
    animationStartY = centerY;
    animationStartTime = null;
    animationEasing = easing;

    const step = (timestamp: number) => {
      if (animationStartTime === null) {
        animationStartTime = timestamp;
      }
      const elapsed = timestamp - animationStartTime;
      const progress = animationDuration > 0 ? Math.min(1, elapsed / animationDuration) : 1;
      const eased = animationEasing ? animationEasing(progress) : progress;
      const nextX = animationStartX + (animationTargetX - animationStartX) * eased;
      const nextY = animationStartY + (animationTargetY - animationStartY) * eased;
      centerX = Number.isFinite(nextX) ? nextX : animationTargetX;
      centerY = Number.isFinite(nextY) ? nextY : animationTargetY;
      if (animationOnUpdate) {
        animationOnUpdate({ x: centerX, y: centerY });
      }
      if (progress >= 1 - 1e-6) {
        centerX = animationTargetX;
        centerY = animationTargetY;
        animationFrame = null;
        animationStartTime = null;
        const completionUpdate = animationOnUpdate;
        const completionHandler = animationOnComplete;
        animationOnUpdate = null;
        animationOnComplete = null;
        animationEasing = null;
        if (completionUpdate) {
          completionUpdate({ x: centerX, y: centerY });
        }
        if (completionHandler) {
          completionHandler({ x: centerX, y: centerY });
        }
        return;
      }
      animationFrame = requestFrame(step);
    };

    animationFrame = requestFrame(step);
  }

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
      if (animationFrame !== null) {
        stopAnimation(false);
      }
      const nextX = normalizeTileValue(tile?.x, centerX);
      const nextY = normalizeTileValue(tile?.y, centerY);
      centerX = Number.isFinite(nextX) ? nextX : centerX;
      centerY = Number.isFinite(nextY) ? nextY : centerY;
      if (options.snap) {
        centerX = Math.round(centerX);
        centerY = Math.round(centerY);
      }
    },
    setZoom(nextZoom: number, _pivot: CameraSnapPivot = 'viewport') {
      const previous = zoom;
      zoom = clamp(Number.isFinite(nextZoom) ? (nextZoom as number) : previous, minZoom, maxZoom);
      return zoom;
    },
    panBy(dx: number, dy: number, options = {}) {
      if (animationFrame !== null) {
        stopAnimation(false);
      }
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
    commitSnap(options = {}) {
      const targetX = Math.round(centerX);
      const targetY = Math.round(centerY);
      const changed = Math.abs(targetX - centerX) > 1e-6 || Math.abs(targetY - centerY) > 1e-6;
      const updateHandler = typeof options.onUpdate === 'function' ? options.onUpdate : null;
      const completeHandler = typeof options.onComplete === 'function' ? options.onComplete : null;

      stopAnimation(false);

      if (!changed) {
        if (updateHandler) {
          updateHandler({ x: centerX, y: centerY });
        }
        if (completeHandler) {
          completeHandler({ x: centerX, y: centerY });
        }
        return { targetX, targetY, changed: false };
      }

      const shouldAnimate = options.animate !== false;
      if (!shouldAnimate) {
        centerX = targetX;
        centerY = targetY;
        if (updateHandler) {
          updateHandler({ x: centerX, y: centerY });
        }
        if (completeHandler) {
          completeHandler({ x: centerX, y: centerY });
        }
        return { targetX, targetY, changed: true };
      }

      const distance = Math.max(Math.abs(targetX - centerX), Math.abs(targetY - centerY));
      const minDuration = 150;
      const maxDuration = 250;
      const suggested = Number.isFinite(options.duration)
        ? (options.duration as number)
        : minDuration + Math.min(maxDuration - minDuration, distance * 40);
      const duration = Math.max(minDuration, Math.min(maxDuration, suggested));
      const easing = typeof options.easing === 'function' ? options.easing : easeOutCubic;

      animationTargetX = targetX;
      animationTargetY = targetY;
      animationOnUpdate = updateHandler;
      animationOnComplete = completeHandler;
      startSnapAnimation(duration, easing);
      return { targetX, targetY, changed: true };
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
