function clamp(value, min, max) {
  if (Number.isNaN(value)) return min;
  if (min > max) return value;
  if (value < min) return min;
  if (value > max) return max;
  return value;
}
function normalizeTileValue(value, fallback) {
  if (!Number.isFinite(value)) return fallback;
  return value;
}
export function createCamera(options) {
  const minZoom =
    options.minZoom && Number.isFinite(options.minZoom)
      ? Math.max(0.05, options.minZoom)
      : 0.1;
  const maxZoom =
    options.maxZoom && Number.isFinite(options.maxZoom)
      ? Math.max(minZoom, options.maxZoom)
      : Math.max(minZoom, 8);
  let viewportWidth = Math.max(0, Math.trunc(options.viewportWidth || 0));
  let viewportHeight = Math.max(0, Math.trunc(options.viewportHeight || 0));
  let centerX = normalizeTileValue(options.centerTile?.x, 0);
  let centerY = normalizeTileValue(options.centerTile?.y, 0);
  let zoom = clamp(
    Number.isFinite(options.initialZoom) ? options.initialZoom : 1,
    minZoom,
    maxZoom,
  );
  let animationFrame = null;
  let animationStartTime = null;
  let animationDuration = 0;
  let animationStartX = centerX;
  let animationStartY = centerY;
  let animationTargetX = centerX;
  let animationTargetY = centerY;
  let animationEasing = null;
  let animationOnUpdate = null;
  let animationOnComplete = null;
  const requestFrame = (callback) => {
    if (
      typeof window !== "undefined" &&
      typeof window.requestAnimationFrame === "function"
    ) {
      return window.requestAnimationFrame(callback);
    }
    return setTimeout(() => callback(Date.now()), 16);
  };
  const cancelFrame = (handle) => {
    if (handle === null || handle === undefined) return;
    if (
      typeof window !== "undefined" &&
      typeof window.cancelAnimationFrame === "function" &&
      typeof handle === "number"
    ) {
      window.cancelAnimationFrame(handle);
      return;
    }
    clearTimeout(handle);
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
  function easeOutCubic(progress) {
    const normalized = progress < 0 ? 0 : progress > 1 ? 1 : progress;
    const inverted = 1 - normalized;
    return 1 - inverted * inverted * inverted;
  }
  function startSnapAnimation(duration, easing) {
    animationDuration = duration;
    animationStartX = centerX;
    animationStartY = centerY;
    animationStartTime = null;
    animationEasing = easing;
    const step = (timestamp) => {
      if (animationStartTime === null) {
        animationStartTime = timestamp;
      }
      const elapsed = timestamp - animationStartTime;
      const progress =
        animationDuration > 0 ? Math.min(1, elapsed / animationDuration) : 1;
      const eased = animationEasing ? animationEasing(progress) : progress;
      const nextX =
        animationStartX + (animationTargetX - animationStartX) * eased;
      const nextY =
        animationStartY + (animationTargetY - animationStartY) * eased;
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
  const state = {
    get centerTile() {
      return { x: centerX, y: centerY };
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
    setViewportSize(width, height) {
      if (Number.isFinite(width)) {
        viewportWidth = Math.max(0, Math.trunc(width));
      }
      if (Number.isFinite(height)) {
        viewportHeight = Math.max(0, Math.trunc(height));
      }
    },
    setCenterTile(tile, options = {}) {
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
    setZoom(nextZoom, _pivot = "viewport") {
      const previous = zoom;
      zoom = clamp(
        Number.isFinite(nextZoom) ? nextZoom : previous,
        minZoom,
        maxZoom,
      );
      return zoom;
    },
    panBy(dx, dy, options = {}) {
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
      const changed =
        Math.abs(targetX - centerX) > 1e-6 ||
        Math.abs(targetY - centerY) > 1e-6;
      const updateHandler =
        typeof options.onUpdate === "function" ? options.onUpdate : null;
      const completeHandler =
        typeof options.onComplete === "function" ? options.onComplete : null;
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
      const distance = Math.max(
        Math.abs(targetX - centerX),
        Math.abs(targetY - centerY),
      );
      const minDuration = 150;
      const maxDuration = 250;
      const suggested = Number.isFinite(options.duration)
        ? options.duration
        : minDuration + Math.min(maxDuration - minDuration, distance * 40);
      const duration = Math.max(minDuration, Math.min(maxDuration, suggested));
      const easing =
        typeof options.easing === "function" ? options.easing : easeOutCubic;
      animationTargetX = targetX;
      animationTargetY = targetY;
      animationOnUpdate = updateHandler;
      animationOnComplete = completeHandler;
      startSnapAnimation(duration, easing);
      return { targetX, targetY, changed: true };
    },
    worldToScreen(tileX, tileY, tileSize) {
      const scale = state.getScaledTileSize(tileSize);
      const x = viewportWidth / 2 + (tileX - centerX - 0.5) * scale;
      const y = viewportHeight / 2 + (tileY - centerY - 0.5) * scale;
      return { x, y };
    },
    worldToScreenCenter(tileX, tileY, tileSize) {
      const scale = state.getScaledTileSize(tileSize);
      const x = viewportWidth / 2 + (tileX - centerX) * scale;
      const y = viewportHeight / 2 + (tileY - centerY) * scale;
      return { x, y };
    },
    screenToTile(x, y, tileSize) {
      const scale = state.getScaledTileSize(tileSize) || 1;
      const tileX = centerX + (x - viewportWidth / 2) / scale + 0.5;
      const tileY = centerY + (y - viewportHeight / 2) / scale + 0.5;
      return { x: tileX, y: tileY };
    },
    getVisibleWorldBounds(tileSize) {
      const scale = state.getScaledTileSize(tileSize) || 1;
      const halfWidthTiles = scale ? viewportWidth / (2 * scale) : 0;
      const halfHeightTiles = scale ? viewportHeight / (2 * scale) : 0;
      return {
        minX: centerX - halfWidthTiles - 1,
        maxX: centerX + halfWidthTiles + 1,
        minY: centerY - halfHeightTiles - 1,
        maxY: centerY + halfHeightTiles + 1,
      };
    },
    getScaledTileSize(tileSize) {
      const base = Number.isFinite(tileSize) && tileSize > 0 ? tileSize : 1;
      return base * zoom;
    },
  };
  return state;
}
