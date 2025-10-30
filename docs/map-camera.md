# Map camera model

The map camera is defined in [`src/map/camera.js`](../src/map/camera.js) and is shared by
both the main application code and the documentation build (`docs/src`). It keeps track of a
floating-point `centerTile` along with the zoom level and viewport size so that the renderer
can project world tiles to screen pixels.

## Coordinate system and transforms

* The camera always tracks a center tile expressed in world tile coordinates. `panBy` shifts the
  center directly in tile units, while `setCenterTile` coerces any provided values through
  `normalizeTileValue` so that `NaN`/`undefined` input is ignored.
* `worldToScreen` and `worldToScreenCenter` implement the core projection math: they treat the
  viewport origin as the middle of the canvas and translate a world tile by subtracting the
  camera center, multiplying by the scaled tile size, and offsetting by half the viewport width
  or height. Formally, for a given tile `(tx, ty)` and tile size `s`:

  ```text
  scale = s * zoom
  screenX = viewportWidth / 2 + (tx - centerX - 0.5) * scale
  screenY = viewportHeight / 2 + (ty - centerY - 0.5) * scale
  ```

  `worldToScreenCenter` omits the `-0.5` term so it returns the visual center of the tile.
* `screenToTile` performs the inverse transformation, dividing by the scaled tile size and
  adding the fractional offset to the current camera center so pointer hits can be mapped back
  to world coordinates.

## Zoom behaviour

* Zoom values are clamped between `minZoom` and `maxZoom`. The camera stores only the resulting
  zoom factor—`setZoom` returns and persists the clamped value. Pivot arguments are accepted to
  allow future anchoring strategies; today the camera maintains the current `centerTile` for
  both `centerTile` and `viewport` pivots so that `alignViewportToCamera` can decide how to
  reposition the buffer.
* Pivot parameters intentionally **do not** mutate the camera’s center yet. This means callers
  can rely on `camera.centerTile` being unchanged before scheduling a render pass regardless of
  whether they passed `'centerTile'` or `'viewport'`. The behaviour is enforced by unit tests in
  [`__tests__/camera-and-cache.test.ts`](../__tests__/camera-and-cache.test.ts).
* `getScaledTileSize` multiplies the base renderer tile size by the zoom factor. This is used
  by the renderer to keep glyphs and development overlays aligned as the user zooms in and out.

## Snapping and animation

* `commitSnap` is the only place that rounds the floating-point center. It targets
  `Math.round(centerX)`/`Math.round(centerY)` and returns `{ targetX, targetY, changed }` so the
  caller knows whether animation or extra fetching is required. The tests cover both the
  “changed” and “already aligned” branches and exercise the easing path so refactors cannot drop
  the intermediate `onUpdate` calls that precede `onComplete`.
* When `animate !== false`, `commitSnap` runs a bounded (150–250 ms) easing function that
  repeatedly calls `onUpdate` while interpolating toward the rounded center. Providing
  `onComplete` is the recommended way to realign external viewport state after the animation.
* Passing `animate: false` immediately sets `centerTile` to the snapped coordinates and fires
  the optional callbacks once, which is useful for deterministic unit tests and server-side
  rendering.

## Interaction with the renderer

The renderer reads the camera’s center, viewport, and scaled tile size every frame. After any
camera change you should:

1. Call `setViewportSize` if the canvas element was resized.
2. Update zoom via `setZoom` (optionally with a pivot) and then run
   `getScaledTileSize`/`worldToScreen` when drawing tiles.
3. Use `commitSnap` to guarantee integer tile alignment before fetching new map buffers so that
   chunk coordinates stay stable.

Keeping the camera in sync with `state.viewport` (see `alignViewportToCamera` inside
`mapView.js`) is what lets keyboard and pointer navigation remain smooth.
