import { resolveWorldParameters } from '../difficulty.js';
import {
  DEFAULT_LANDMASS_TYPE,
  LANDMASS_PRESETS,
  resolveLandmassPreset,
} from '../map/landmassPresets/index.js';

const MAX_GENERATION_BIAS = 0.45;

/**
 * @typedef {Readonly<{
 *   skipResolve?: boolean;
 *   width?: number;
 *   height?: number;
 * }>} GenerationTuningOptions
 */

/**
 * @typedef {Readonly<{
 *   maskStrength: number;
 *   maskBias: number;
 *   worldScaleFactor: number;
 *   waterCoverageTarget: number;
 *   minOceanFraction: number;
 *   openLandBias: number;
 * }>} LandmassPreset
 */

function clamp(value, min, max) {
  if (!Number.isFinite(value)) return min;
  if (value < min) return min;
  if (value > max) return max;
  return value;
}

function sliderValue(world, key, fallback = 50) {
  if (!world || typeof world !== 'object') {
    return clamp(fallback, 0, 100);
  }
  const raw = Number(world[key]);
  if (!Number.isFinite(raw)) {
    return clamp(fallback, 0, 100);
  }
  return clamp(raw, 0, 100);
}

function sliderBias(world, key, fallback = 50) {
  return (sliderValue(world, key, fallback) - 50) / 50;
}

function clampBias(value) {
  if (!Number.isFinite(value)) return 0;
  if (value < -MAX_GENERATION_BIAS) return -MAX_GENERATION_BIAS;
  if (value > MAX_GENERATION_BIAS) return MAX_GENERATION_BIAS;
  return Math.fround(value);
}

/**
 * @param {unknown} world
 * @param {GenerationTuningOptions} [options]
 */
export function deriveGenerationTuning(world, { skipResolve = false, width, height } = {}) {
  const resolved = skipResolve ? world || {} : resolveWorldParameters(world || {});
  if (!resolved || typeof resolved !== 'object') {
    return {
      elevationBias: 0,
      temperatureBias: 0,
      moistureBias: 0,
    };
  }

  const mountainsBias = sliderBias(resolved, 'mountains', 50);
  const elevationMaxBias = sliderBias(resolved, 'mapElevationMax', 50);
  const elevationVarianceBias = sliderBias(resolved, 'mapElevationVariance', 50);
  const elevationBias = clampBias(
    mountainsBias * 0.28 + elevationMaxBias * 0.4 + elevationVarianceBias * 0.18,
  );

  const temperatureSliderBias = sliderBias(resolved, 'temperature', 50);
  const rainfallBias = sliderBias(resolved, 'rainfall', 50);
  const waterTableBias = sliderBias(resolved, 'waterTable', 50);
  const temperatureBias = clampBias(
    temperatureSliderBias * 0.45 + mountainsBias * -0.12 + rainfallBias * -0.08,
  );

  const marshBias = sliderBias(resolved, 'marshSwamp', 28);
  const bogBias = sliderBias(resolved, 'bogFen', 24);
  const moistureBias = clampBias(
    rainfallBias * 0.42 + waterTableBias * 0.32 + marshBias * 0.12 + bogBias * 0.1,
  );

  const islandBias = sliderBias(resolved, 'mapIslands', 50);
  const normalizedWidth = Number.isFinite(width) ? Math.max(1, Math.trunc(width)) : null;
  const normalizedHeight = Number.isFinite(height) ? Math.max(1, Math.trunc(height)) : null;
  const area =
    normalizedWidth && normalizedHeight ? normalizedWidth * normalizedHeight : null;
  const baselineSuggestions = area
    ? Math.max(16, Math.min(256, Math.floor(area / 64)))
    : null;
  const spawnSuggestionCount = baselineSuggestions
    ? Math.round(
        baselineSuggestions +
          mountainsBias * -0.35 * baselineSuggestions +
          islandBias * -0.28 * baselineSuggestions +
          waterTableBias * 0.22 * baselineSuggestions +
          rainfallBias * 0.18 * baselineSuggestions,
      )
    : null;

  return {
    elevationBias,
    temperatureBias,
    moistureBias,
    ...(spawnSuggestionCount != null ? { spawnSuggestionCount } : {}),
  };
}

export function deriveLandmassModifiers(world, { skipResolve = false } = {}) {
  const resolved = skipResolve ? world : resolveWorldParameters(world || {});
  const rawMapType = resolved?.mapType;
  let normalizedMapType = '';
  if (typeof rawMapType === 'string') {
    normalizedMapType = rawMapType.trim();
  } else if (rawMapType != null) {
    normalizedMapType = String(rawMapType).trim();
  }

  const isKnownMapType = Object.prototype.hasOwnProperty.call(
    LANDMASS_PRESETS,
    normalizedMapType,
  );

  const landmassType =
    normalizedMapType && isKnownMapType ? normalizedMapType : DEFAULT_LANDMASS_TYPE;

  if (normalizedMapType && !isKnownMapType) {
    console.warn(
      `Unknown map type "${normalizedMapType}" supplied to deriveLandmassModifiers. Falling back to ${DEFAULT_LANDMASS_TYPE}.`,
    );
  }

  const preset = /** @type {LandmassPreset | undefined} */ (
    resolveLandmassPreset(landmassType)
  );
  const islandsBias = sliderBias(resolved, 'mapIslands', 50);

  const maskStrengthBase = preset?.maskStrength ?? 0.55;
  const maskBiasBase = preset?.maskBias ?? 0;
  const worldScaleFactorBase = preset?.worldScaleFactor ?? 1.2;
  const waterCoverageTargetBase = preset?.waterCoverageTarget ?? 0.32;
  const minOceanFractionBase = preset?.minOceanFraction ?? 0.02;
  const openLandBiasBase = preset?.openLandBias ?? 0;

  const maskStrength = clamp(maskStrengthBase + islandsBias * 0.22, 0.28, 0.92);
  const maskBias = clamp(maskBiasBase + islandsBias * -0.12, -0.3, 0.3);
  const worldScaleFactor = clamp(worldScaleFactorBase + islandsBias * -0.12, 0.6, 1.8);
  const waterCoverageTarget = clamp(waterCoverageTargetBase + islandsBias * 0.18, 0.08, 0.85);
  const minOceanFraction = clamp(minOceanFractionBase + islandsBias * 0.12, 0, 0.4);
  const openLandBias = clamp(openLandBiasBase + islandsBias * -0.14, -0.5, 0.5);

  return {
    landmassType,
    maskStrength,
    maskBias,
    worldScaleFactor,
    waterCoverageTarget,
    minOceanFraction,
    openLandBias,
  };
}

export function deriveElevationOptions(biome, world, { skipResolve = false } = {}) {
  const resolved = skipResolve ? world : resolveWorldParameters(world || {});
  const adv = resolved?.advanced || {};

  const rainfallBias = sliderBias(resolved, 'rainfall', 50);
  const waterBias = sliderBias(resolved, 'waterTable', 50);
  const mountainsBias = sliderBias(resolved, 'mountains', 50);
  const elevationBias = sliderBias(resolved, 'mapElevationMax', 50);
  const varianceBias = sliderBias(resolved, 'mapElevationVariance', 50);

  const baseElevation = biome?.elevation?.base ?? 0.5;
  const baseVariance = biome?.elevation?.variance ?? 0.5;
  const baseScale = biome?.elevation?.scale ?? 50;

  const elevationBaseBias = (((adv.elevationBase ?? 50) - 50) / 100) * 0.3;
  const elevationVarianceBias = (((adv.elevationVariance ?? 50) - 50) / 100) * 0.5;
  const elevationScaleBias = (((adv.elevationScale ?? 50) - 50) / 100) * 70;

  const base = clamp(
    baseElevation +
      waterBias * -0.12 +
      rainfallBias * -0.08 +
      mountainsBias * 0.05 +
      elevationBaseBias +
      elevationBias * 0.35,
    0.05,
    0.95,
  );

  const variance = clamp(
    baseVariance +
      mountainsBias * 0.45 +
      elevationVarianceBias +
      varianceBias * 0.6,
    0.05,
    1.5,
  );

  const scale = clamp(
    baseScale +
      mountainsBias * 40 +
      elevationScaleBias +
      varianceBias * -20 +
      elevationBias * -10,
    12,
    200,
  );

  return { base, variance, scale };
}
