import { resolveWaterRules, type WaterRuleSet } from './waterRules';

export type HydrologyTile = 'land' | 'ocean' | 'lake' | 'river' | 'marsh';

interface HydrologyInput {
  seed: string | number;
  width: number;
  height: number;
  elevations: number[][];
  biome: { id: string; features?: string[]; elevation?: { waterLevel?: number } } | null;
  world: {
    oreDensity?: number;
    waterTable?: number;
    temperature?: number;
    rainfall?: number;
    mountains?: number;
    rivers100?: number;
    lakes100?: number;
    advanced?: Record<string, number> | null | undefined;
  };
}

interface PriorityNode {
  index: number;
  value: number;
}

class MinHeap {
  private heap: PriorityNode[] = [];

  push(node: PriorityNode) {
    this.heap.push(node);
    this.bubbleUp(this.heap.length - 1);
  }

  pop(): PriorityNode | null {
    if (!this.heap.length) return null;
    const root = this.heap[0];
    const last = this.heap.pop()!;
    if (this.heap.length) {
      this.heap[0] = last;
      this.bubbleDown(0);
    }
    return root;
  }

  private bubbleUp(index: number) {
    let current = index;
    while (current > 0) {
      const parent = Math.floor((current - 1) / 2);
      if (this.heap[parent].value <= this.heap[current].value) break;
      [this.heap[parent], this.heap[current]] = [this.heap[current], this.heap[parent]];
      current = parent;
    }
  }

  private bubbleDown(index: number) {
    let current = index;
    const length = this.heap.length;
    while (true) {
      const left = current * 2 + 1;
      const right = current * 2 + 2;
      let smallest = current;
      if (left < length && this.heap[left].value < this.heap[smallest].value) {
        smallest = left;
      }
      if (right < length && this.heap[right].value < this.heap[smallest].value) {
        smallest = right;
      }
      if (smallest === current) break;
      [this.heap[current], this.heap[smallest]] = [this.heap[smallest], this.heap[current]];
      current = smallest;
    }
  }
}

const D8: Array<[number, number]> = [
  [1, 0],
  [1, 1],
  [0, 1],
  [-1, 1],
  [-1, 0],
  [-1, -1],
  [0, -1],
  [1, -1]
];

function clamp(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  if (value < min) return min;
  if (value > max) return max;
  return value;
}

function hashCoord(seed: string | number, index: number): number {
  const text = `${seed}:${index}`;
  let h = 1779033703 ^ text.length;
  for (let i = 0; i < text.length; i += 1) {
    h = Math.imul(h ^ text.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  h = Math.imul(h ^ (h >>> 16), 2246822507);
  h = Math.imul(h ^ (h >>> 13), 3266489909);
  return (h ^= h >>> 16) >>> 0;
}

function priorityFlood(
  width: number,
  height: number,
  elevations: Float64Array,
  seaLevel: number
): Float64Array {
  const size = width * height;
  const filled = new Float64Array(size);
  filled.fill(Number.POSITIVE_INFINITY);
  const visited = new Uint8Array(size);
  const heap = new MinHeap();

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      if (y === 0 || x === 0 || y === height - 1 || x === width - 1) {
        const idx = y * width + x;
        const elev = Math.max(elevations[idx], seaLevel);
        filled[idx] = elev;
        visited[idx] = 1;
        heap.push({ index: idx, value: elev });
      }
    }
  }

  while (true) {
    const current = heap.pop();
    if (!current) break;
    const { index, value } = current;
    const x = index % width;
    const y = Math.floor(index / width);
    for (let n = 0; n < D8.length; n += 1) {
      const dx = D8[n][0];
      const dy = D8[n][1];
      const nx = x + dx;
      const ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;
      const nIdx = ny * width + nx;
      if (visited[nIdx]) continue;
      visited[nIdx] = 1;
      const candidate = Math.max(elevations[nIdx], value);
      filled[nIdx] = candidate;
      heap.push({ index: nIdx, value: candidate });
    }
  }

  return filled;
}

function toMatrix<T>(width: number, height: number, data: T[] | Float64Array): T[][] {
  const matrix: T[][] = [];
  for (let y = 0; y < height; y += 1) {
    const row: T[] = [];
    for (let x = 0; x < width; x += 1) {
      row.push(data[y * width + x] as T);
    }
    matrix.push(row);
  }
  return matrix;
}

function classifyLakes(
  width: number,
  height: number,
  elevations: Float64Array,
  filled: Float64Array,
  seaLevel: number,
  rules: WaterRuleSet
): {
  types: HydrologyTile[];
  spill: Float64Array;
} {
  const size = width * height;
  const types: HydrologyTile[] = new Array(size).fill('land');
  const spill = new Float64Array(size);
  spill.set(filled);
  const visited = new Uint8Array(size);
  const epsilon = 1e-5;
  const lakeCells: number[] = [];

  const minDepth = rules.lakeMinDepth;
  const minArea = rules.lakeMinArea;
  const softDepth = Math.max(minDepth * 0.6, 0.006);

  for (let idx = 0; idx < size; idx += 1) {
    if (visited[idx]) continue;
    const waterDepth = filled[idx] - elevations[idx];
    if (filled[idx] <= seaLevel + epsilon || waterDepth < softDepth) {
      continue;
    }

    const queue = [idx];
    const basin: number[] = [];
    let maxDepth = waterDepth;
    let total = 0;
    const targetLevel = filled[idx];

    while (queue.length) {
      const current = queue.pop()!;
      if (visited[current]) continue;
      visited[current] = 1;
      const depth = filled[current] - elevations[current];
      if (filled[current] - targetLevel > epsilon || depth < softDepth) {
        continue;
      }
      basin.push(current);
      total += 1;
      if (depth > maxDepth) {
        maxDepth = depth;
      }
      const cx = current % width;
      const cy = Math.floor(current / width);
      for (let n = 0; n < D8.length; n += 1) {
        const nx = cx + D8[n][0];
        const ny = cy + D8[n][1];
        if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;
        const nIdx = ny * width + nx;
        if (visited[nIdx]) continue;
        queue.push(nIdx);
      }
    }

    if (!basin.length) continue;

    if (total >= minArea || maxDepth >= minDepth * 1.35) {
      for (const cell of basin) {
        types[cell] = 'lake';
      }
      lakeCells.push(...basin);
    }
  }

  const oceanVisited = new Uint8Array(size);
  const queue: number[] = [];
  for (let x = 0; x < width; x += 1) {
    const top = x;
    const bottom = (height - 1) * width + x;
    if (filled[top] <= seaLevel + epsilon) {
      queue.push(top);
      oceanVisited[top] = 1;
      types[top] = 'ocean';
    }
    if (filled[bottom] <= seaLevel + epsilon) {
      queue.push(bottom);
      oceanVisited[bottom] = 1;
      types[bottom] = 'ocean';
    }
  }
  for (let y = 0; y < height; y += 1) {
    const left = y * width;
    const right = left + width - 1;
    if (filled[left] <= seaLevel + epsilon && !oceanVisited[left]) {
      queue.push(left);
      oceanVisited[left] = 1;
      types[left] = 'ocean';
    }
    if (filled[right] <= seaLevel + epsilon && !oceanVisited[right]) {
      queue.push(right);
      oceanVisited[right] = 1;
      types[right] = 'ocean';
    }
  }

  while (queue.length) {
    const current = queue.shift()!;
    const cx = current % width;
    const cy = Math.floor(current / width);
    for (let n = 0; n < D8.length; n += 1) {
      const nx = cx + D8[n][0];
      const ny = cy + D8[n][1];
      if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;
      const nIdx = ny * width + nx;
      if (oceanVisited[nIdx]) continue;
      if (filled[nIdx] <= seaLevel + epsilon && types[nIdx] !== 'lake') {
        types[nIdx] = 'ocean';
        oceanVisited[nIdx] = 1;
        queue.push(nIdx);
      }
    }
  }

  return { types, spill };
}

function computeFlowDirections(
  width: number,
  height: number,
  elevations: Float64Array,
  filled: Float64Array,
  types: HydrologyTile[],
  seed: string | number
): Int8Array {
  const size = width * height;
  const flow = new Int8Array(size);
  flow.fill(-1);
  const epsilon = 1e-6;

  for (let idx = 0; idx < size; idx += 1) {
    if (types[idx] === 'ocean') continue;
    const cx = idx % width;
    const cy = Math.floor(idx / width);
    let bestDir = -1;
    let bestFall = -Infinity;
    let bestElev = elevations[idx];

    for (let n = 0; n < D8.length; n += 1) {
      const nx = cx + D8[n][0];
      const ny = cy + D8[n][1];
      if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;
      const nIdx = ny * width + nx;
      const fall = filled[idx] - filled[nIdx];
      if (fall > bestFall + epsilon) {
        bestFall = fall;
        bestDir = n;
        bestElev = elevations[nIdx];
      } else if (Math.abs(fall - bestFall) <= epsilon && fall > -epsilon) {
        if (elevations[nIdx] < bestElev - epsilon) {
          bestDir = n;
          bestElev = elevations[nIdx];
        } else if (Math.abs(elevations[nIdx] - bestElev) <= epsilon) {
          const hash = hashCoord(seed, idx * 31 + n);
          if ((hash & 1) === 0) {
            bestDir = n;
            bestElev = elevations[nIdx];
          }
        }
      }
    }

    if (bestDir === -1) {
      let lowestVal = filled[idx];
      for (let n = 0; n < D8.length; n += 1) {
        const nx = cx + D8[n][0];
        const ny = cy + D8[n][1];
        if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;
        const nIdx = ny * width + nx;
        const val = filled[nIdx];
        if (val < lowestVal - epsilon) {
          lowestVal = val;
          bestDir = n;
        }
      }
    }

    flow[idx] = bestDir;
  }

  return flow;
}

function computeAccumulation(
  width: number,
  height: number,
  flow: Int8Array,
  types: HydrologyTile[],
  filled: Float64Array
): Float64Array {
  const size = width * height;
  const order = Array.from({ length: size }, (_, index) => index);
  order.sort((a, b) => filled[a] - filled[b]);
  const accumulation = new Float64Array(size);
  accumulation.fill(1);

  for (const idx of order) {
    const dir = flow[idx];
    if (dir < 0) continue;
    const cx = idx % width;
    const cy = Math.floor(idx / width);
    const nx = cx + D8[dir][0];
    const ny = cy + D8[dir][1];
    if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;
    const nIdx = ny * width + nx;
    accumulation[nIdx] += accumulation[idx];
  }

  return accumulation;
}

function buildUpstreamGraph(
  width: number,
  height: number,
  flow: Int8Array
): number[][] {
  const size = width * height;
  const upstream: number[][] = Array.from({ length: size }, () => []);
  for (let idx = 0; idx < size; idx += 1) {
    const dir = flow[idx];
    if (dir < 0) continue;
    const cx = idx % width;
    const cy = Math.floor(idx / width);
    const nx = cx + D8[dir][0];
    const ny = cy + D8[dir][1];
    if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;
    const nIdx = ny * width + nx;
    upstream[nIdx].push(idx);
  }
  return upstream;
}

function applyRiverClassification(
  width: number,
  height: number,
  types: HydrologyTile[],
  accumulation: Float64Array,
  flow: Int8Array,
  upstream: number[][],
  rules: WaterRuleSet
) {
  const size = width * height;
  const threshold = rules.riverFlowThreshold * rules.flowMultiplier;
  const tributaryThreshold = rules.tributaryThreshold * rules.flowMultiplier;
  const mouthThreshold = rules.mouthExpansionThreshold * rules.flowMultiplier;

  const stack: number[] = [];

  for (let idx = 0; idx < size; idx += 1) {
    if (types[idx] !== 'land') continue;
    if (accumulation[idx] >= threshold) {
      types[idx] = 'river';
      stack.push(idx);
    }
  }

  while (stack.length) {
    const current = stack.pop()!;
    const dir = flow[current];
    if (dir >= 0) {
      const cx = current % width;
      const cy = Math.floor(current / width);
      const nx = cx + D8[dir][0];
      const ny = cy + D8[dir][1];
      if (nx >= 0 && ny >= 0 && nx < width && ny < height) {
        const nIdx = ny * width + nx;
        if (types[nIdx] === 'land' && accumulation[nIdx] >= tributaryThreshold) {
          types[nIdx] = 'river';
          stack.push(nIdx);
        }
      }
    }
    for (const source of upstream[current]) {
      if (types[source] === 'land' && accumulation[source] >= tributaryThreshold) {
        types[source] = 'river';
        stack.push(source);
      }
    }
  }

  const mouthQueue: number[] = [];
  for (let idx = 0; idx < size; idx += 1) {
    if (types[idx] !== 'river') continue;
    const dir = flow[idx];
    if (dir < 0) continue;
    const cx = idx % width;
    const cy = Math.floor(idx / width);
    const nx = cx + D8[dir][0];
    const ny = cy + D8[dir][1];
    if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;
    const downstreamIdx = ny * width + nx;
    if (types[downstreamIdx] === 'ocean' || types[downstreamIdx] === 'lake') {
      mouthQueue.push(idx);
    }
  }

  const visited = new Uint8Array(size);
  const maxSteps = 4;
  while (mouthQueue.length) {
    const start = mouthQueue.shift()!;
    const queue: Array<{ idx: number; depth: number }> = [{ idx: start, depth: 0 }];
    while (queue.length) {
      const { idx, depth } = queue.shift()!;
      if (visited[idx]) continue;
      visited[idx] = 1;
      if (accumulation[idx] >= mouthThreshold * Math.max(0.25, 1 - depth * 0.2)) {
        types[idx] = 'river';
        const cx = idx % width;
        const cy = Math.floor(idx / width);
        for (let n = 0; n < 4; n += 1) {
          const [dx, dy] = D8[n * 2];
          const nx = cx + dx;
          const ny = cy + dy;
          if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;
          const nIdx = ny * width + nx;
          if (types[nIdx] === 'land' && accumulation[nIdx] >= tributaryThreshold * 0.6) {
            types[nIdx] = 'river';
            queue.push({ idx: nIdx, depth: depth + 1 });
          }
        }
        if (depth < maxSteps) {
          for (const up of upstream[idx]) {
            if (!visited[up] && types[up] === 'land') {
              queue.push({ idx: up, depth: depth + 1 });
            }
          }
        }
      }
    }
  }
}

function layMarshes(
  width: number,
  height: number,
  types: HydrologyTile[],
  rules: WaterRuleSet
) {
  if (rules.marshiness <= 0) return;
  const size = width * height;
  const marshStrength = rules.marshiness;
  const ring = Math.max(1, Math.trunc(rules.marshRingWidth));
  const newMarsh = new Uint8Array(size);

  for (let idx = 0; idx < size; idx += 1) {
    if (types[idx] !== 'lake' && types[idx] !== 'river' && types[idx] !== 'ocean') continue;
    const cx = idx % width;
    const cy = Math.floor(idx / width);
    for (let dy = -ring; dy <= ring; dy += 1) {
      for (let dx = -ring; dx <= ring; dx += 1) {
        if (dx === 0 && dy === 0) continue;
        const nx = cx + dx;
        const ny = cy + dy;
        if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;
        const nIdx = ny * width + nx;
        if (types[nIdx] !== 'land') continue;
        const distance = Math.hypot(dx, dy);
        const weight = Math.max(0, 1 - distance / (ring + 0.5));
        if (weight * marshStrength >= 0.4) {
          newMarsh[nIdx] = 1;
        }
      }
    }
  }

  for (let idx = 0; idx < size; idx += 1) {
    if (newMarsh[idx]) {
      types[idx] = 'marsh';
    }
  }
}

function bridgeDiagonals(width: number, height: number, types: HydrologyTile[]) {
  const size = width * height;
  const isWater = (type: HydrologyTile) => type !== 'land';
  for (let idx = 0; idx < size; idx += 1) {
    if (types[idx] !== 'land') continue;
    const x = idx % width;
    const y = Math.floor(idx / width);
    const diagPairs: Array<[[number, number], [number, number]]> = [
      [[-1, -1], [1, 1]],
      [[-1, 1], [1, -1]]
    ];
    for (const pair of diagPairs) {
      const [a, b] = pair;
      const ax = x + a[0];
      const ay = y + a[1];
      const bx = x + b[0];
      const by = y + b[1];
      if (ax < 0 || ay < 0 || ax >= width || ay >= height) continue;
      if (bx < 0 || by < 0 || bx >= width || by >= height) continue;
      const aIdx = ay * width + ax;
      const bIdx = by * width + bx;
      if (isWater(types[aIdx]) && isWater(types[bIdx])) {
        types[idx] = 'marsh';
        break;
      }
    }
  }
}

function normalizeCoastline(width: number, height: number, types: HydrologyTile[]) {
  const size = width * height;
  const coastline: number[] = [];
  for (let idx = 0; idx < size; idx += 1) {
    if (types[idx] !== 'land') continue;
    const x = idx % width;
    const y = Math.floor(idx / width);
    const touchesOcean = D8.some(([dx, dy]) => {
      const nx = x + dx;
      const ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= width || ny >= height) return false;
      return types[ny * width + nx] === 'ocean';
    });
    if (touchesOcean) {
      coastline.push(idx);
    }
  }

  if (!coastline.length) return;

  const visited = new Uint8Array(size);
  let largestSize = 0;
  const keep = new Set<number>();
  const queue: number[] = [];
  const components: number[][] = [];

  for (const start of coastline) {
    if (visited[start]) continue;
    queue.length = 0;
    queue.push(start);
    visited[start] = 1;
    const component: number[] = [];
    while (queue.length) {
      const current = queue.shift()!;
      component.push(current);
      const cx = current % width;
      const cy = Math.floor(current / width);
      for (const [dx, dy] of D8) {
        const nx = cx + dx;
        const ny = cy + dy;
        if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;
        const nIdx = ny * width + nx;
        if (visited[nIdx]) continue;
        if (types[nIdx] !== 'land') continue;
        const touchesOcean = D8.some(([ox, oy]) => {
          const px = nx + ox;
          const py = ny + oy;
          if (px < 0 || py < 0 || px >= width || py >= height) return false;
          return types[py * width + px] === 'ocean';
        });
        if (!touchesOcean) continue;
        visited[nIdx] = 1;
        queue.push(nIdx);
      }
    }
    if (component.length > largestSize) {
      largestSize = component.length;
      keep.clear();
      component.forEach(index => keep.add(index));
    }
    components.push(component);
  }

  if (!keep.size || keep.size === coastline.length) return;

  const removed = new Set<number>();
  const flood: number[] = [];

  components.forEach(component => {
    if (!component.length || keep.has(component[0])) return;
    component.forEach(idx => {
      if (!removed.has(idx)) {
        flood.push(idx);
        removed.add(idx);
      }
    });
    while (flood.length) {
      const current = flood.pop()!;
      types[current] = 'ocean';
      const cx = current % width;
      const cy = Math.floor(current / width);
      for (const [dx, dy] of D8) {
        const nx = cx + dx;
        const ny = cy + dy;
        if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;
        const nIdx = ny * width + nx;
        if (types[nIdx] !== 'land') continue;
        if (keep.has(nIdx) || removed.has(nIdx)) continue;
        removed.add(nIdx);
        flood.push(nIdx);
      }
    }
  });
}

function pruneSingletons(
  width: number,
  height: number,
  types: HydrologyTile[],
  filled: Float64Array,
  maxFraction: number
) {
  const size = width * height;
  const singles: Array<{ idx: number; priority: number }> = [];
  const directions = D8;
  for (let idx = 0; idx < size; idx += 1) {
    if (types[idx] === 'land') continue;
    const x = idx % width;
    const y = Math.floor(idx / width);
    let neighbors = 0;
    for (let n = 0; n < directions.length; n += 1) {
      const nx = x + directions[n][0];
      const ny = y + directions[n][1];
      if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;
      const nIdx = ny * width + nx;
      if (types[nIdx] !== 'land') {
        neighbors += 1;
        if (neighbors > 0) break;
      }
    }
    if (neighbors === 0) {
      singles.push({ idx, priority: filled[idx] });
    }
  }

  const allowance = Math.max(0, Math.floor(size * maxFraction));
  if (singles.length <= allowance) {
    return;
  }

  singles.sort((a, b) => a.priority - b.priority);
  for (let i = 0; i < singles.length - allowance; i += 1) {
    types[singles[i].idx] = 'land';
  }
}

export interface HydrologyResult {
  types: HydrologyTile[][];
  flowDirections: Array<Array<{ dx: number; dy: number } | null>>;
  flowAccumulation: number[][];
  filledElevation: number[][];
  rules: WaterRuleSet;
  seaLevel: number;
}

export function generateHydrology(input: HydrologyInput): HydrologyResult {
  const { width, height, elevations, seed, biome, world } = input;
  const rules = resolveWaterRules(biome, world, width, height);
  const size = width * height;
  const elevationGrid = new Float64Array(size);
  for (let y = 0; y < height; y += 1) {
    const row = elevations[y] || [];
    for (let x = 0; x < width; x += 1) {
      elevationGrid[y * width + x] = clamp(row[x] ?? 0, 0, 1);
    }
  }

  const filled = priorityFlood(width, height, elevationGrid, rules.seaLevel);
  const { types: baseTypes, spill } = classifyLakes(width, height, elevationGrid, filled, rules.seaLevel, rules);
  const flow = computeFlowDirections(width, height, elevationGrid, filled, baseTypes, seed);
  const accumulation = computeAccumulation(width, height, flow, baseTypes, filled);
  const upstream = buildUpstreamGraph(width, height, flow);

  applyRiverClassification(width, height, baseTypes, accumulation, flow, upstream, rules);
  layMarshes(width, height, baseTypes, rules);
  bridgeDiagonals(width, height, baseTypes);
  normalizeCoastline(width, height, baseTypes);
  pruneSingletons(width, height, baseTypes, spill, rules.maxSingletonFraction);

  const typesMatrix = toMatrix<HydrologyTile>(width, height, baseTypes);
  const filledMatrix = toMatrix<number>(width, height, filled);
  const flowMatrix: Array<Array<{ dx: number; dy: number } | null>> = [];
  const accumulationMatrix = toMatrix<number>(width, height, accumulation);

  for (let y = 0; y < height; y += 1) {
    const row: Array<{ dx: number; dy: number } | null> = [];
    for (let x = 0; x < width; x += 1) {
      const dir = flow[y * width + x];
      if (dir < 0) {
        row.push(null);
      } else {
        row.push({ dx: D8[dir][0], dy: D8[dir][1] });
      }
    }
    flowMatrix.push(row);
  }

  return {
    types: typesMatrix,
    flowDirections: flowMatrix,
    flowAccumulation: accumulationMatrix,
    filledElevation: filledMatrix,
    rules,
    seaLevel: rules.seaLevel
  };
}
