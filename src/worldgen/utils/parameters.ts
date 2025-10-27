import { ParameterDefinition, ParameterPath, ParameterVector } from '../solver/types';

export function cloneParameters<T extends ParameterVector>(vector: T): T {
  return structuredClone(vector);
}

export function clampParameter(value: number, min: number, max: number): number {
  if (value < min) return min;
  if (value > max) return max;
  return value;
}

export function snapParameterValue(
  value: number,
  step = 1,
  min = 0,
  max = 100
): number {
  if (!Number.isFinite(value)) return min;
  if (!step || step <= 0) return clampParameter(value, min, max);
  const steps = Math.round((value - min) / step);
  const snapped = min + steps * step;
  return clampParameter(snapped, min, max);
}

export function getParameterValue(
  vector: ParameterVector,
  path: ParameterPath,
  fallback = 0
): number {
  const segments = path.split('.');
  let cursor: any = vector;
  for (const segment of segments) {
    if (cursor == null) {
      return fallback;
    }
    cursor = cursor[segment];
  }
  return typeof cursor === 'number' ? cursor : fallback;
}

export function setParameterValue(
  target: ParameterVector,
  path: ParameterPath,
  value: number
): void {
  const segments = path.split('.');
  let cursor: any = target;
  for (let i = 0; i < segments.length - 1; i += 1) {
    const segment = segments[i];
    if (typeof cursor[segment] !== 'object' || cursor[segment] === null) {
      cursor[segment] = {};
    }
    cursor = cursor[segment];
  }
  cursor[segments[segments.length - 1]] = value;
}

export function mergeParameterOverrides(
  base: ParameterVector,
  overrides: Partial<ParameterVector> = {}
): ParameterVector {
  const result = cloneParameters(base);
  const stack: Array<{ target: ParameterVector; source: Partial<ParameterVector> }> = [
    { target: result, source: overrides }
  ];

  while (stack.length) {
    const { target, source } = stack.pop()!;
    for (const [key, value] of Object.entries(source)) {
      if (value == null) continue;
      if (typeof value === 'number') {
        target[key] = value;
      } else if (typeof value === 'object') {
        const next =
          typeof target[key] === 'object' && target[key] !== null
            ? (target[key] as ParameterVector)
            : ((target[key] = {} as ParameterVector));
        stack.push({ target: next, source: value as Partial<ParameterVector> });
      }
    }
  }

  return result;
}

export function jitterParameterVector(
  source: ParameterVector,
  definitions: ParameterDefinition[],
  rng: () => number,
  amplitude = 4
): ParameterVector {
  const jittered = cloneParameters(source);
  for (const definition of definitions) {
    const base = getParameterValue(source, definition.key);
    const offset = (rng() - 0.5) * amplitude;
    const next = snapParameterValue(
      base + offset,
      definition.step ?? 1,
      definition.min,
      definition.max
    );
    setParameterValue(jittered, definition.key, next);
  }
  return jittered;
}
