# Map performance guide

This document explains the main performance levers for the tile map renderer. It references the
runtime utilities in [`src/map/renderer.js`](../src/map/renderer.js) and the storage helpers in
[`src/storage/chunkCache.js`](../src/storage/chunkCache.js).

## Rendering math highlights

* Rendering work scales with the projected tile size `scale = tileBaseSize * zoom`. Doubling the
  zoom therefore quadruples the fill area and stroke work for development overlays. Prefer
  batching updates through `scheduleRender()` so multiple state changes trigger a single draw.
* Camera transformations are pure math on the camera state: `worldToScreen` and
  `screenToTile` are linear operations, so their cost is bounded by the number of tiles you draw
  or hit-test. Avoid creating intermediate arrays when iterating through map chunks—reuse the
  buffer objects already produced by `updateVisibleFromBuffer`.

## Cache limits

`chunkCache.js` contains two bounded LRU caches and a shared canvas pool:

* `chunkDataCache` defaults to **256** entries and stores serialized terrain chunks.
* `tileCanvasCache` defaults to **96** entries and keeps prerendered tile canvases. Evicting a
  canvas returns it to `sharedCanvasPool`, which is capped at 48 canvases by default.

Both caches use insertion order on an internal `Map`. `get()` re-inserts the entry to keep it
recent, and `set()` evicts the oldest keys until the map’s size is at or under the configured
capacity. The behaviour (including eviction callbacks) is covered by
[`__tests__/camera-and-cache.test.ts`](../__tests__/camera-and-cache.test.ts) so regression
tests will catch changes to the LRU contract.

When tuning these values, keep in mind that:

1. `setCapacity()` can be called at runtime, but dropping the capacity to zero clears the cache
   immediately via the eviction callback.
2. Increasing the limits improves reuse but also raises memory pressure—watch the browser’s
   performance panel and GPU memory allocations if you exceed the defaults.

## Profiling workflow

1. Append `?debug=1` to the map URL to enable the lightweight debug overlay. The overlay displays
   the current tile under the pointer, the camera’s center tile, zoom factor, frame rate, and live
   cache occupancy (`chunkDataCache` and `tileCanvasCache` along with the canvas pool size).
2. While the overlay is active, interact with the map (pan, zoom, toggle layers) and watch the FPS
   indicator. Sudden drops often mean too many renders are being scheduled or that caches are
   thrashing.
3. Record a Performance profile in your browser’s dev tools. Use the overlay’s cache numbers to
   correlate spikes with chunk fetches or canvas churn, and adjust cache capacities only if you see
   sustained eviction or reallocation.
4. For precise timing, temporarily disable animation by calling `camera.commitSnap({ animate: false })`
   in the console—this removes easing overhead so you can focus on pure render throughput.

Following these steps keeps the renderer responsive while giving you concrete metrics to justify any
cache or tile-size tweaks.

## World generation profiling

Set the `FS_DEBUG_MAP_PROFILING` environment variable to a truthy value (for example `1`) before
running the app or the Vitest suite to record the timing for the most expensive world-generation
steps. You can also toggle the feature at runtime in the browser console by setting
`window.__FS_DEBUG_MAP_PROFILING__ = true` before generating a new map.

When enabled, the generator logs a summary like `generateColorMap profiling` with per-step timings
for `createElevationSampler`, `generateHydrology`, and `applyMangroveZones`. The generated map data
also includes a `profiling` object so you can inspect the aggregated `total` duration and the raw
`steps` timings directly from the returned value or in captured snapshots.
