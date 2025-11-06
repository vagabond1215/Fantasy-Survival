import type { MoistureBand, RunoffLevel, TemperatureBand, TileClimate } from './types';

function clamp01(value: number): number {
  if (Number.isNaN(value)) return 0;
  if (value <= 0) return 0;
  if (value >= 1) return 1;
  return value;
}

function resolveTemperatureBand(value: number): TemperatureBand {
  const v = clamp01(value);
  if (v < 0.18) return 'frigid';
  if (v < 0.32) return 'cold';
  if (v < 0.46) return 'cool';
  if (v < 0.63) return 'mild';
  if (v < 0.8) return 'warm';
  return 'hot';
}

function resolveMoistureBand(value: number): MoistureBand {
  const v = clamp01(value);
  if (v < 0.18) return 'arid';
  if (v < 0.35) return 'semi-arid';
  if (v < 0.55) return 'moderate';
  if (v < 0.75) return 'humid';
  return 'wet';
}

function resolveRunoffLevel(value: number): RunoffLevel {
  const v = clamp01(value);
  if (v < 0.22) return 'minimal';
  if (v < 0.55) return 'seasonal';
  return 'perennial';
}

function frostRisk(temperature: number, runoff: number): number {
  const tempPenalty = Math.max(0, 0.4 - clamp01(temperature));
  const runoffPenalty = clamp01(runoff) * 0.25;
  return clamp01(tempPenalty * 1.6 + runoffPenalty);
}

export function classifyClimate(
  temperature: number,
  moisture: number,
  runoff: number
): TileClimate {
  const temperatureBand = resolveTemperatureBand(temperature);
  const moistureBand = resolveMoistureBand(moisture);
  const runoffLevel = resolveRunoffLevel(runoff);
  return Object.freeze({
    temperature: temperatureBand,
    moisture: moistureBand,
    runoff: runoffLevel,
    frostRisk: frostRisk(temperature, runoff),
  });
}
