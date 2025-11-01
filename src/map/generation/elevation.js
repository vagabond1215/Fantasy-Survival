import { hashSeed, mulberry32 } from '../../utils/random.js';

const F2 = 0.5 * (Math.sqrt(3) - 1);
const G2 = (3 - Math.sqrt(3)) / 6;

/**
 * @param {number} value
 * @param {number} min
 * @param {number} max
 */
function clamp(value, min, max) {
  if (!Number.isFinite(value)) return min;
  if (value < min) return min;
  if (value > max) return max;
  return value;
}

/** @type {Array<[number, number]>} */
const GRADIENTS = [
  [1, 1],
  [-1, 1],
  [1, -1],
  [-1, -1],
  [1, 0],
  [-1, 0],
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
  [0, 1],
  [0, -1]
];

class Simplex2D {
  /**
   * @param {string | number} seed
   */
  constructor(seed) {
    const random = mulberry32(hashSeed(seed));
    const perm = new Uint8Array(256);
    for (let i = 0; i < 256; i += 1) {
      perm[i] = i;
    }
    for (let i = 255; i > 0; i -= 1) {
      const j = Math.floor(random() * (i + 1));
      const temp = perm[i];
      perm[i] = perm[j];
      perm[j] = temp;
    }
    /** @type {Uint8Array} */
    this.perm = new Uint8Array(512);
    for (let i = 0; i < 512; i += 1) {
      this.perm[i] = perm[i & 255];
    }
  }

  /**
   * @param {number} xin
   * @param {number} yin
   */
  noise2D(xin, yin) {
    let n0 = 0;
    let n1 = 0;
    let n2 = 0;

    const s = (xin + yin) * F2;
    const i = Math.floor(xin + s);
    const j = Math.floor(yin + s);
    const t = (i + j) * G2;
    const X0 = i - t;
    const Y0 = j - t;
    const x0 = xin - X0;
    const y0 = yin - Y0;

    let i1 = 0;
    let j1 = 0;
    if (x0 > y0) {
      i1 = 1;
    } else {
      j1 = 1;
    }

    const x1 = x0 - i1 + G2;
    const y1 = y0 - j1 + G2;
    const x2 = x0 - 1 + 2 * G2;
    const y2 = y0 - 1 + 2 * G2;

    const ii = i & 255;
    const jj = j & 255;

    const gi0 = this.perm[ii + this.perm[jj]] % 12;
    const gi1 = this.perm[ii + i1 + this.perm[jj + j1]] % 12;
    const gi2 = this.perm[ii + 1 + this.perm[jj + 1]] % 12;

    let t0 = 0.5 - x0 * x0 - y0 * y0;
    if (t0 >= 0) {
      t0 *= t0;
      const grad = GRADIENTS[gi0];
      n0 = t0 * t0 * (grad[0] * x0 + grad[1] * y0);
    }

    let t1 = 0.5 - x1 * x1 - y1 * y1;
    if (t1 >= 0) {
      t1 *= t1;
      const grad = GRADIENTS[gi1];
      n1 = t1 * t1 * (grad[0] * x1 + grad[1] * y1);
    }

    let t2 = 0.5 - x2 * x2 - y2 * y2;
    if (t2 >= 0) {
      t2 *= t2;
      const grad = GRADIENTS[gi2];
      n2 = t2 * t2 * (grad[0] * x2 + grad[1] * y2);
    }

    return 70 * (n0 + n1 + n2);
  }
}

/**
 * @typedef {Object} ElevationOptions
 * @property {number} [base]
 * @property {number} [variance]
 * @property {number} [scale]
 * @property {number} [worldScale]
 * @property {number} [octaves]
 * @property {number} [persistence]
 * @property {number} [lacunarity]
 * @property {number} [maskStrength]
 * @property {number} [maskBias]
 * @property {string} [mapType]
 * @property {string} [landmassSalt]
 */

/**
 * @typedef {{sample: (x: number, y: number) => number}} ElevationSampler
 */

/**
 * @param {Simplex2D} simplex
 * @param {number} x
 * @param {number} y
 * @param {number} worldScale
 * @param {number} maskStrength
 * @param {number} maskBias
 */
function computeMask(simplex, x, y, worldScale, maskStrength, maskBias) {
  const scale = Math.max(24, worldScale);
  const nx = x / scale;
  const ny = y / scale;
  const radial = clamp(1 - Math.hypot(nx, ny), 0, 1);
  const wobble = simplex.noise2D(nx * 0.7 + 11.3, ny * 0.7 - 7.1) * 0.5 + 0.5;
  const rim = simplex.noise2D(nx * 1.8 - 3.7, ny * 1.8 + 5.9) * 0.5 + 0.5;
  const blended = radial * (0.65 + 0.35 * wobble) + rim * 0.12;
  const biased = blended * (1 - maskStrength) + Math.pow(blended, 1.5) * maskStrength;
  return clamp(biased + maskBias, 0, 1);
}

/**
 * @param {string | number} seed
 * @param {ElevationOptions} [options]
 * @returns {ElevationSampler}
 */
export function createElevationSampler(seed, options = {}) {
  const landmassSalt = options.landmassSalt ?? options.mapType;
  const baseSeed = landmassSalt != null && landmassSalt !== '' ? `${seed}:${landmassSalt}` : `${seed}`;
  const simplex = new Simplex2D(`${baseSeed}:elev`);
  const maskSimplex = new Simplex2D(`${baseSeed}:mask`);

  const base = clamp(options.base ?? 0.5, 0.01, 0.99);
  const variance = clamp(options.variance ?? 0.5, 0.01, 2);
  const scale = Math.max(4, options.scale ?? 64);
  const worldScale = Math.max(scale, options.worldScale ?? scale * 4);
  const octaves = Math.max(1, Math.trunc(options.octaves ?? 5));
  const persistence = clamp(options.persistence ?? 0.5, 0.25, 0.85);
  const lacunarity = clamp(options.lacunarity ?? 2.1, 1.2, 3.6);
  const maskStrength = clamp(options.maskStrength ?? 0.55, 0, 1);
  const maskBias = clamp(options.maskBias ?? 0, -0.3, 0.3);

  const baseFrequency = 1 / scale;
  const worldFactor = Math.sqrt(worldScale / 64);

  return {
    sample(x, y) {
      let amplitude = 1;
      let frequency = 1;
      let total = 0;
      let weight = 0;
      for (let octave = 0; octave < octaves; octave += 1) {
        const nx = ((x + octave * 17.31) * baseFrequency * frequency) / worldFactor;
        const ny = ((y - octave * 11.17) * baseFrequency * frequency) / worldFactor;
        const noise = simplex.noise2D(nx, ny) * 0.5 + 0.5;
        total += noise * amplitude;
        weight += amplitude;
        amplitude *= persistence;
        frequency *= lacunarity;
      }
      const normalized = weight > 0 ? total / weight : 0.5;
      const mask = computeMask(maskSimplex, x, y, worldScale, maskStrength, maskBias);
      const blended = clamp(normalized * (0.6 + 0.4 * mask) + mask * 0.18, 0, 1);
      const ranged = base + (blended - 0.5) * 2 * variance;
      return clamp(ranged, 0, 1);
    }
  };
}
