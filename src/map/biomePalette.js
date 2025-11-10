import { biomeCodeToId } from '../world/generate.ts';
import { getBiome } from '../biomes.js';

const DEFAULT_HEX_COLOR = '#64748b';
const TABLE_SIZE = 256;

let packedColorTable = null;
let cssColorTable = null;
let biomeNameTable = null;
let biomeIdTable = null;

function clampChannel(value) {
  if (!Number.isFinite(value)) return 0;
  return Math.min(255, Math.max(0, Math.round(value)));
}

function parseColorToRgb(color) {
  if (!color) {
    return { r: 100, g: 116, b: 139 };
  }
  const value = String(color).trim();
  if (!value) {
    return { r: 100, g: 116, b: 139 };
  }

  const hexMatch = value.match(/^#?([0-9a-f]{3}|[0-9a-f]{6})$/i);
  if (hexMatch) {
    let hex = hexMatch[1];
    if (hex.length === 3) {
      hex = hex
        .split('')
        .map(ch => ch + ch)
        .join('');
    }
    const intValue = Number.parseInt(hex, 16);
    if (!Number.isNaN(intValue)) {
      return {
        r: (intValue >> 16) & 255,
        g: (intValue >> 8) & 255,
        b: intValue & 255
      };
    }
  }

  const rgbMatch = value.match(/^rgba?\(([^)]+)\)$/i);
  if (rgbMatch) {
    const components = rgbMatch[1]
      .split(/[,\s]+/)
      .filter(Boolean)
      .map(component => Number.parseFloat(component));
    if (components.length >= 3 && components.every(channel => !Number.isNaN(channel))) {
      return {
        r: clampChannel(components[0]),
        g: clampChannel(components[1]),
        b: clampChannel(components[2])
      };
    }
  }

  return parseColorToRgb(DEFAULT_HEX_COLOR);
}

function packRgba(r, g, b, a = 255) {
  return ((clampChannel(a) << 24) | (clampChannel(b) << 16) | (clampChannel(g) << 8) | clampChannel(r)) >>> 0;
}

function ensureBiomeTables() {
  if (packedColorTable && cssColorTable && biomeNameTable && biomeIdTable) {
    return;
  }

  packedColorTable = new Uint32Array(TABLE_SIZE);
  cssColorTable = new Array(TABLE_SIZE);
  biomeNameTable = new Array(TABLE_SIZE);
  biomeIdTable = new Array(TABLE_SIZE);

  for (let code = 0; code < TABLE_SIZE; code += 1) {
    const biomeId = biomeCodeToId(code);
    const biome = getBiome(biomeId);
    const rgb = parseColorToRgb(biome?.color ?? DEFAULT_HEX_COLOR);
    packedColorTable[code] = packRgba(rgb.r, rgb.g, rgb.b, 255);
    cssColorTable[code] = `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`;
    biomeNameTable[code] = biome?.name || biomeId || 'Unknown biome';
    biomeIdTable[code] = biomeId || 'temperate-broadleaf';
  }
}

export function getBiomePackedColor(code) {
  ensureBiomeTables();
  const index = Number.isFinite(code) ? code & 0xff : 0;
  return packedColorTable[index];
}

export function getBiomeCssColor(code) {
  ensureBiomeTables();
  const index = Number.isFinite(code) ? code & 0xff : 0;
  return cssColorTable[index];
}

export function getBiomeName(code) {
  ensureBiomeTables();
  const index = Number.isFinite(code) ? code & 0xff : 0;
  return biomeNameTable[index];
}

export function getBiomeId(code) {
  ensureBiomeTables();
  const index = Number.isFinite(code) ? code & 0xff : 0;
  return biomeIdTable[index];
}
