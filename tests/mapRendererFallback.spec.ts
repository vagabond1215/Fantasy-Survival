import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { MapRenderer } from '../src/map/renderer.js';

describe('MapRenderer fallback rendering', () => {
  let canvas: HTMLCanvasElement;
  let ctx: any;
  const viewportWidth = 200;
  const viewportHeight = 120;

  beforeEach(() => {
    canvas = document.createElement('canvas');
    Object.defineProperty(canvas, 'clientWidth', {
      value: viewportWidth,
      configurable: true
    });
    Object.defineProperty(canvas, 'clientHeight', {
      value: viewportHeight,
      configurable: true
    });

    const fillRect = vi.fn();
    const fillText = vi.fn();
    const save = vi.fn();
    const restore = vi.fn();
    const setTransform = vi.fn();
    const clearRect = vi.fn();
    const fill = vi.fn();
    const drawImage = vi.fn();
    const addColorStop = vi.fn();
    const createLinearGradient = vi.fn(() => ({ addColorStop }));

    ctx = {
      fillRect,
      fillText,
      save,
      restore,
      setTransform,
      clearRect,
      fill,
      drawImage,
      createLinearGradient,
      canvas,
      beginPath: vi.fn(),
      moveTo: vi.fn(),
      lineTo: vi.fn(),
      quadraticCurveTo: vi.fn(),
      closePath: vi.fn(),
      stroke: vi.fn(),
      roundRect: undefined,
      measureText: vi.fn(),
      clip: vi.fn(),
      rect: vi.fn(),
      globalAlpha: 1,
      lineWidth: 1,
      strokeStyle: '',
      fillStyle: '',
      font: '',
      textAlign: 'start',
      textBaseline: 'alphabetic',
      setLineDash: vi.fn()
    } as CanvasRenderingContext2D;

    canvas.getContext = vi.fn().mockReturnValue(ctx);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('draws a fallback message and logs an error when no map is available', () => {
    const warnSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const camera = {
      viewportWidth,
      viewportHeight,
      zoom: 1,
      setViewportSize: vi.fn()
    };

    const renderer = new MapRenderer(canvas, {
      camera,
      tileBaseSize: 16
    });

    renderer.render();

    expect(ctx.fillText).toHaveBeenCalledTimes(1);
    const [message, x, y] = ctx.fillText.mock.calls[0];
    expect(typeof message).toBe('string');
    expect(message).toMatch(/map/i);
    expect(x).toBeCloseTo(viewportWidth / 2);
    expect(y).toBeCloseTo(viewportHeight / 2);
    expect(ctx.fillRect).toHaveBeenCalledWith(0, 0, viewportWidth, viewportHeight);
    expect(warnSpy).toHaveBeenCalledTimes(1);
    const [firstArg] = warnSpy.mock.calls[0];
    expect(String(firstArg)).toContain('Unable to render map');
  });

  it('retries logging if the renderer recovers and fails again', () => {
    const warnSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const camera = {
      viewportWidth,
      viewportHeight,
      zoom: 1,
      setViewportSize: vi.fn(),
      getScaledTileSize: vi.fn().mockReturnValue(16),
      worldToScreen: vi.fn().mockReturnValue({ x: 0, y: 0 })
    };

    const renderer = new MapRenderer(canvas, {
      camera,
      tileBaseSize: 16
    });

    vi.spyOn(renderer, 'ensureChunkCanvas').mockReturnValue(null);
    vi.spyOn(renderer, 'drawChunkDirect').mockImplementation(() => {});
    vi
      .spyOn(renderer, 'drawVisibleDevelopments')
      .mockImplementation(() => {});

    renderer.render();
    expect(warnSpy).toHaveBeenCalledTimes(1);

    renderer.setMap({
      tiles: [[1]],
      width: 1,
      height: 1,
      xStart: 0,
      yStart: 0
    });

    // Rendering with a valid map should clear the logged flag
    renderer.render();

    // Break the map again and ensure it logs once more
    renderer.setMap(null);
    renderer.render();

    expect(warnSpy).toHaveBeenCalledTimes(2);
  });
});
