import { resolveWaterRules } from './waterRules.js';
class MinHeap {
    constructor() {
        this.heap = [];
    }
    push(node) {
        this.heap.push(node);
        this.bubbleUp(this.heap.length - 1);
    }
    pop() {
        if (!this.heap.length)
            return null;
        const root = this.heap[0];
        const last = this.heap.pop();
        if (this.heap.length) {
            this.heap[0] = last;
            this.bubbleDown(0);
        }
        return root;
    }
    bubbleUp(index) {
        let current = index;
        while (current > 0) {
            const parent = Math.floor((current - 1) / 2);
            if (this.heap[parent].value <= this.heap[current].value)
                break;
            [this.heap[parent], this.heap[current]] = [this.heap[current], this.heap[parent]];
            current = parent;
        }
    }
    bubbleDown(index) {
        let current = index;
        const length = this.heap.length;
        while (current < length) {
            const left = current * 2 + 1;
            const right = current * 2 + 2;
            let smallest = current;
            if (left < length && this.heap[left].value < this.heap[smallest].value) {
                smallest = left;
            }
            if (right < length && this.heap[right].value < this.heap[smallest].value) {
                smallest = right;
            }
            if (smallest === current)
                break;
            [this.heap[current], this.heap[smallest]] = [this.heap[smallest], this.heap[current]];
            current = smallest;
        }
    }
}
const D8 = [
    [1, 0],
    [1, 1],
    [0, 1],
    [-1, 1],
    [-1, 0],
    [-1, -1],
    [0, -1],
    [1, -1]
];
function clamp(value, min, max) {
    if (!Number.isFinite(value))
        return min;
    if (value < min)
        return min;
    if (value > max)
        return max;
    return value;
}
function hashCoord(seed, index) {
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
function priorityFlood(width, height, elevations, seaLevel) {
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
    for (let current = heap.pop(); current; current = heap.pop()) {
        const { index, value } = current;
        const x = index % width;
        const y = Math.floor(index / width);
        for (let n = 0; n < D8.length; n += 1) {
            const dx = D8[n][0];
            const dy = D8[n][1];
            const nx = x + dx;
            const ny = y + dy;
            if (nx < 0 || ny < 0 || nx >= width || ny >= height)
                continue;
            const nIdx = ny * width + nx;
            if (visited[nIdx])
                continue;
            visited[nIdx] = 1;
            const candidate = Math.max(elevations[nIdx], value);
            filled[nIdx] = candidate;
            heap.push({ index: nIdx, value: candidate });
        }
    }
    return filled;
}
function toMatrix(width, height, data) {
    const matrix = [];
    for (let y = 0; y < height; y += 1) {
        const row = [];
        for (let x = 0; x < width; x += 1) {
            row.push(data[y * width + x]);
        }
        matrix.push(row);
    }
    return matrix;
}
function classifyLakes(width, height, elevations, filled, seaLevel, rules) {
    const size = width * height;
    const types = new Array(size).fill('land');
    const spill = new Float64Array(size);
    spill.set(filled);
    const visited = new Uint8Array(size);
    const epsilon = 1e-5;
    const lakeCells = [];
    const minDepth = rules.lakeMinDepth;
    const minArea = rules.lakeMinArea;
    const softDepth = Math.max(minDepth * 0.6, 0.006);
    for (let idx = 0; idx < size; idx += 1) {
        if (visited[idx])
            continue;
        const waterDepth = filled[idx] - elevations[idx];
        if (filled[idx] <= seaLevel + epsilon || waterDepth < softDepth) {
            continue;
        }
        const queue = [idx];
        const basin = [];
        let maxDepth = waterDepth;
        let total = 0;
        const targetLevel = filled[idx];
        while (queue.length) {
            const current = queue.pop();
            if (visited[current])
                continue;
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
                if (nx < 0 || ny < 0 || nx >= width || ny >= height)
                    continue;
                const nIdx = ny * width + nx;
                if (visited[nIdx])
                    continue;
                queue.push(nIdx);
            }
        }
        if (!basin.length)
            continue;
        if (total >= minArea || maxDepth >= minDepth * 1.35) {
            for (const cell of basin) {
                types[cell] = 'lake';
            }
            lakeCells.push(...basin);
        }
    }
    const oceanVisited = new Uint8Array(size);
    const queue = [];
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
        const current = queue.shift();
        const cx = current % width;
        const cy = Math.floor(current / width);
        for (let n = 0; n < D8.length; n += 1) {
            const nx = cx + D8[n][0];
            const ny = cy + D8[n][1];
            if (nx < 0 || ny < 0 || nx >= width || ny >= height)
                continue;
            const nIdx = ny * width + nx;
            if (oceanVisited[nIdx])
                continue;
            if (filled[nIdx] <= seaLevel + epsilon && types[nIdx] !== 'lake') {
                types[nIdx] = 'ocean';
                oceanVisited[nIdx] = 1;
                queue.push(nIdx);
            }
        }
    }
    return { types, spill };
}
function computeFlowDirections(width, height, elevations, filled, types, seed) {
    const size = width * height;
    const flow = new Int8Array(size);
    flow.fill(-1);
    const epsilon = 1e-6;
    for (let idx = 0; idx < size; idx += 1) {
        if (types[idx] === 'ocean')
            continue;
        const cx = idx % width;
        const cy = Math.floor(idx / width);
        let bestDir = -1;
        let bestFall = -Infinity;
        let bestElev = elevations[idx];
        for (let n = 0; n < D8.length; n += 1) {
            const nx = cx + D8[n][0];
            const ny = cy + D8[n][1];
            if (nx < 0 || ny < 0 || nx >= width || ny >= height)
                continue;
            const nIdx = ny * width + nx;
            const fall = filled[idx] - filled[nIdx];
            if (fall > bestFall + epsilon) {
                bestFall = fall;
                bestDir = n;
                bestElev = elevations[nIdx];
            }
            else if (Math.abs(fall - bestFall) <= epsilon && fall > -epsilon) {
                if (elevations[nIdx] < bestElev - epsilon) {
                    bestDir = n;
                    bestElev = elevations[nIdx];
                }
                else if (Math.abs(elevations[nIdx] - bestElev) <= epsilon) {
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
                if (nx < 0 || ny < 0 || nx >= width || ny >= height)
                    continue;
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
function computeAccumulation(width, height, flow, types, filled) {
    const size = width * height;
    const order = Array.from({ length: size }, (_, index) => index);
    order.sort((a, b) => filled[a] - filled[b]);
    const accumulation = new Float64Array(size);
    accumulation.fill(1);
    for (const idx of order) {
        const dir = flow[idx];
        if (dir < 0)
            continue;
        const cx = idx % width;
        const cy = Math.floor(idx / width);
        const nx = cx + D8[dir][0];
        const ny = cy + D8[dir][1];
        if (nx < 0 || ny < 0 || nx >= width || ny >= height)
            continue;
        const nIdx = ny * width + nx;
        accumulation[nIdx] += accumulation[idx];
    }
    return accumulation;
}
function buildUpstreamGraph(width, height, flow) {
    const size = width * height;
    const upstream = Array.from({ length: size }, () => []);
    for (let idx = 0; idx < size; idx += 1) {
        const dir = flow[idx];
        if (dir < 0)
            continue;
        const cx = idx % width;
        const cy = Math.floor(idx / width);
        const nx = cx + D8[dir][0];
        const ny = cy + D8[dir][1];
        if (nx < 0 || ny < 0 || nx >= width || ny >= height)
            continue;
        const nIdx = ny * width + nx;
        upstream[nIdx].push(idx);
    }
    return upstream;
}
function applyRiverClassification(width, height, types, accumulation, flow, upstream, rules) {
    const size = width * height;
    const threshold = rules.riverFlowThreshold * rules.flowMultiplier;
    const tributaryThreshold = rules.tributaryThreshold * rules.flowMultiplier;
    const mouthThreshold = rules.mouthExpansionThreshold * rules.flowMultiplier;
    const stack = [];
    for (let idx = 0; idx < size; idx += 1) {
        if (types[idx] !== 'land')
            continue;
        if (accumulation[idx] >= threshold) {
            types[idx] = 'river';
            stack.push(idx);
        }
    }
    while (stack.length) {
        const current = stack.pop();
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
    const mouthQueue = [];
    for (let idx = 0; idx < size; idx += 1) {
        if (types[idx] !== 'river')
            continue;
        const dir = flow[idx];
        if (dir < 0)
            continue;
        const cx = idx % width;
        const cy = Math.floor(idx / width);
        const nx = cx + D8[dir][0];
        const ny = cy + D8[dir][1];
        if (nx < 0 || ny < 0 || nx >= width || ny >= height)
            continue;
        const downstreamIdx = ny * width + nx;
        if (types[downstreamIdx] === 'ocean' || types[downstreamIdx] === 'lake') {
            mouthQueue.push(idx);
        }
    }
    const visited = new Uint8Array(size);
    const maxSteps = 4;
    while (mouthQueue.length) {
        const start = mouthQueue.shift();
        const queue = [{ idx: start, depth: 0 }];
        while (queue.length) {
            const { idx, depth } = queue.shift();
            if (visited[idx])
                continue;
            visited[idx] = 1;
            if (accumulation[idx] >= mouthThreshold * Math.max(0.25, 1 - depth * 0.2)) {
                types[idx] = 'river';
                const cx = idx % width;
                const cy = Math.floor(idx / width);
                for (let n = 0; n < 4; n += 1) {
                    const [dx, dy] = D8[n * 2];
                    const nx = cx + dx;
                    const ny = cy + dy;
                    if (nx < 0 || ny < 0 || nx >= width || ny >= height)
                        continue;
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
function layMarshes(width, height, types, rules) {
    if (rules.marshiness <= 0)
        return;
    const size = width * height;
    const marshStrength = rules.marshiness;
    const ring = Math.max(1, Math.trunc(rules.marshRingWidth));
    const newMarsh = new Uint8Array(size);
    for (let idx = 0; idx < size; idx += 1) {
        if (types[idx] !== 'lake' && types[idx] !== 'river' && types[idx] !== 'ocean')
            continue;
        const cx = idx % width;
        const cy = Math.floor(idx / width);
        for (let dy = -ring; dy <= ring; dy += 1) {
            for (let dx = -ring; dx <= ring; dx += 1) {
                if (dx === 0 && dy === 0)
                    continue;
                const nx = cx + dx;
                const ny = cy + dy;
                if (nx < 0 || ny < 0 || nx >= width || ny >= height)
                    continue;
                const nIdx = ny * width + nx;
                if (types[nIdx] !== 'land')
                    continue;
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
function bridgeDiagonals(width, height, types) {
    const size = width * height;
    const isWater = (type) => type !== 'land';
    for (let idx = 0; idx < size; idx += 1) {
        if (types[idx] !== 'land')
            continue;
        const x = idx % width;
        const y = Math.floor(idx / width);
        const diagPairs = [
            [[-1, -1], [1, 1]],
            [[-1, 1], [1, -1]]
        ];
        for (const pair of diagPairs) {
            const [a, b] = pair;
            const ax = x + a[0];
            const ay = y + a[1];
            const bx = x + b[0];
            const by = y + b[1];
            if (ax < 0 || ay < 0 || ax >= width || ay >= height)
                continue;
            if (bx < 0 || by < 0 || bx >= width || by >= height)
                continue;
            const aIdx = ay * width + ax;
            const bIdx = by * width + bx;
            if (isWater(types[aIdx]) && isWater(types[bIdx])) {
                types[idx] = 'marsh';
                break;
            }
        }
    }
}
function normalizeCoastline(width, height, types) {
    const size = width * height;
    const coastline = [];
    for (let idx = 0; idx < size; idx += 1) {
        if (types[idx] !== 'land')
            continue;
        const x = idx % width;
        const y = Math.floor(idx / width);
        const touchesOcean = D8.some(([dx, dy]) => {
            const nx = x + dx;
            const ny = y + dy;
            if (nx < 0 || ny < 0 || nx >= width || ny >= height)
                return false;
            return types[ny * width + nx] === 'ocean';
        });
        if (touchesOcean) {
            coastline.push(idx);
        }
    }
    if (!coastline.length)
        return;
    const visited = new Uint8Array(size);
    let largestSize = 0;
    const keep = new Set();
    const queue = [];
    const components = [];
    for (const start of coastline) {
        if (visited[start])
            continue;
        queue.length = 0;
        queue.push(start);
        visited[start] = 1;
        const component = [];
        while (queue.length) {
            const current = queue.shift();
            component.push(current);
            const cx = current % width;
            const cy = Math.floor(current / width);
            for (const [dx, dy] of D8) {
                const nx = cx + dx;
                const ny = cy + dy;
                if (nx < 0 || ny < 0 || nx >= width || ny >= height)
                    continue;
                const nIdx = ny * width + nx;
                if (visited[nIdx])
                    continue;
                if (types[nIdx] !== 'land')
                    continue;
                const touchesOcean = D8.some(([ox, oy]) => {
                    const px = nx + ox;
                    const py = ny + oy;
                    if (px < 0 || py < 0 || px >= width || py >= height)
                        return false;
                    return types[py * width + px] === 'ocean';
                });
                if (!touchesOcean)
                    continue;
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
    if (!keep.size || keep.size === coastline.length)
        return;
    const removed = new Set();
    const flood = [];
    components.forEach(component => {
        if (!component.length || keep.has(component[0]))
            return;
        component.forEach(idx => {
            if (!removed.has(idx)) {
                flood.push(idx);
                removed.add(idx);
            }
        });
        while (flood.length) {
            const current = flood.pop();
            types[current] = 'ocean';
            const cx = current % width;
            const cy = Math.floor(current / width);
            for (const [dx, dy] of D8) {
                const nx = cx + dx;
                const ny = cy + dy;
                if (nx < 0 || ny < 0 || nx >= width || ny >= height)
                    continue;
                const nIdx = ny * width + nx;
                if (types[nIdx] !== 'land')
                    continue;
                if (keep.has(nIdx) || removed.has(nIdx))
                    continue;
                removed.add(nIdx);
                flood.push(nIdx);
            }
        }
    });
}
function pruneSingletons(width, height, types, filled, maxFraction) {
    const size = width * height;
    const singles = [];
    const directions = D8;
    for (let idx = 0; idx < size; idx += 1) {
        if (types[idx] === 'land')
            continue;
        const x = idx % width;
        const y = Math.floor(idx / width);
        let neighbors = 0;
        for (let n = 0; n < directions.length; n += 1) {
            const nx = x + directions[n][0];
            const ny = y + directions[n][1];
            if (nx < 0 || ny < 0 || nx >= width || ny >= height)
                continue;
            const nIdx = ny * width + nx;
            if (types[nIdx] !== 'land') {
                neighbors += 1;
                if (neighbors > 0)
                    break;
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

const WATER_CLASSIFICATIONS = new Set(['water', 'ocean', 'lake', 'river', 'marsh']);

function computeWaterCoverage(width, height, types, filled, elevations, seaLevel) {
    const size = width * height;
    const depthThreshold = 1e-4;
    const epsilon = 1e-6;
    let waterCells = 0;
    for (let idx = 0; idx < size; idx += 1) {
        const type = types[idx];
        const depth = filled[idx] - elevations[idx];
        if (elevations[idx] <= seaLevel + epsilon || WATER_CLASSIFICATIONS.has(type)) {
            waterCells += 1;
            continue;
        }
        if (depth > depthThreshold && type === 'lake') {
            waterCells += 1;
        }
    }
    return waterCells / size;
}

function computeElevationCoverage(elevationGrid, seaLevel) {
    let waterCells = 0;
    for (let idx = 0; idx < elevationGrid.length; idx += 1) {
        if (elevationGrid[idx] <= seaLevel) {
            waterCells += 1;
        }
    }
    return waterCells / Math.max(1, elevationGrid.length);
}

function buildHydrologyState({ width, height, elevationGrid, rules, seed, seaLevel }) {
    const filled = priorityFlood(width, height, elevationGrid, seaLevel);
    const { types, spill } = classifyLakes(width, height, elevationGrid, filled, seaLevel, rules);
    const flow = computeFlowDirections(width, height, elevationGrid, filled, types, seed);
    const accumulation = computeAccumulation(width, height, flow, types, filled);
    const upstream = buildUpstreamGraph(width, height, flow);
    applyRiverClassification(width, height, types, accumulation, flow, upstream, rules);
    pruneDisconnectedRivers(width, height, types, flow);
    layMarshes(width, height, types, rules);
    bridgeDiagonals(width, height, types);
    normalizeCoastline(width, height, types);
    pruneSingletons(width, height, types, spill, rules.maxSingletonFraction);
    return { filled, types, spill, flow, accumulation };
}

function pruneDisconnectedRivers(width, height, types, flow) {
    const size = width * height;
    const neighbors = D8;
    const visitedGlobal = new Uint8Array(size);
    for (let idx = 0; idx < size; idx += 1) {
        if (types[idx] !== 'river')
            continue;
        if (visitedGlobal[idx])
            continue;
        const stack = [idx];
        const component = [];
        let reachesWater = false;
        while (stack.length) {
            const current = stack.pop();
            if (visitedGlobal[current])
                continue;
            visitedGlobal[current] = 1;
            component.push(current);
            const cx = current % width;
            const cy = Math.floor(current / width);
            if (types[current] === 'lake' || types[current] === 'ocean') {
                reachesWater = true;
                continue;
            }
            const dir = flow[current];
            if (dir >= 0) {
                const nx = cx + neighbors[dir][0];
                const ny = cy + neighbors[dir][1];
                if (nx >= 0 && ny >= 0 && nx < width && ny < height) {
                    const nextIdx = ny * width + nx;
                    if (!visitedGlobal[nextIdx]) {
                        stack.push(nextIdx);
                    }
                }
            }
            for (let n = 0; n < neighbors.length; n += 1) {
                const nx = cx + neighbors[n][0];
                const ny = cy + neighbors[n][1];
                if (nx < 0 || ny < 0 || nx >= width || ny >= height)
                    continue;
                const nIdx = ny * width + nx;
                if (types[nIdx] === 'lake' || types[nIdx] === 'ocean') {
                    reachesWater = true;
                }
                if (types[nIdx] === 'river' && !visitedGlobal[nIdx]) {
                    stack.push(nIdx);
                }
            }
        }
        if (!reachesWater) {
            for (const cell of component) {
                types[cell] = 'land';
                flow[cell] = -1;
            }
        }
    }
}

export function generateHydrology(input) {
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
    const targetCoverage = 0.32;
    const tolerance = 0.05;
    const maxIterations = 6;
    const baseStep = 0.012;
    let seaLevel = clamp(rules.seaLevel, 0.02, 0.95);
    let bestResult = null;
    const adjustmentHistory = [];
    let lowerBound = null;
    let upperBound = null;
    let lowerCoverage = null;
    let upperCoverage = null;
    let lastSeaLevel = seaLevel;
    const minOceanFraction = 0.02;
    for (let iteration = 0; iteration < maxIterations; iteration += 1) {
        const state = buildHydrologyState({ width, height, elevationGrid, rules, seed, seaLevel });
        const coverage = computeElevationCoverage(elevationGrid, seaLevel);
        const surfaceCoverage = computeWaterCoverage(width, height, state.types, state.filled, elevationGrid, seaLevel);
        const delta = Math.abs(coverage - targetCoverage);
        let oceanCells = 0;
        for (let i = 0; i < state.types.length; i += 1) {
            if (state.types[i] === 'ocean') {
                oceanCells += 1;
            }
        }
        const oceanFraction = oceanCells / size;
        adjustmentHistory.push({ iteration: iteration + 1, seaLevel, coverage, surfaceCoverage });
        if ((!bestResult || delta < bestResult.delta) && (oceanFraction >= minOceanFraction || !bestResult)) {
            bestResult = {
                ...state,
                coverage,
                surfaceCoverage,
                delta,
                seaLevel,
                iterations: iteration + 1,
                oceanFraction
            };
        }
        if (delta <= tolerance && oceanFraction >= minOceanFraction) {
            break;
        }
        if (coverage > targetCoverage) {
            upperBound = seaLevel;
            upperCoverage = coverage;
            if (lowerBound !== null) {
                const span = upperCoverage - lowerCoverage;
                if (span > 1e-6) {
                    const estimate = lowerBound + ((targetCoverage - lowerCoverage) / span) * (upperBound - lowerBound);
                    const clamped = clamp(estimate, 0.02, 0.98);
                    if (Math.abs(clamped - seaLevel) > 1e-5) {
                        seaLevel = clamped;
                    }
                    else {
                        seaLevel = clamp((lowerBound + upperBound) / 2, 0.02, 0.98);
                    }
                }
                else {
                    seaLevel = clamp((lowerBound + upperBound) / 2, 0.02, 0.98);
                }
            }
            else {
                seaLevel = clamp(seaLevel - baseStep, 0.02, 0.98);
            }
        }
        else {
            lowerBound = seaLevel;
            lowerCoverage = coverage;
            if (upperBound !== null) {
                const span = upperCoverage - lowerCoverage;
                if (span > 1e-6) {
                    const estimate = lowerBound + ((targetCoverage - lowerCoverage) / span) * (upperBound - lowerBound);
                    const clamped = clamp(estimate, 0.02, 0.98);
                    if (Math.abs(clamped - seaLevel) > 1e-5) {
                        seaLevel = clamped;
                    }
                    else {
                        seaLevel = clamp((lowerBound + upperBound) / 2, 0.02, 0.98);
                    }
                }
                else {
                    seaLevel = clamp((lowerBound + upperBound) / 2, 0.02, 0.98);
                }
            }
            else {
                seaLevel = clamp(seaLevel + baseStep, 0.02, 0.98);
            }
        }
        if (Math.abs(seaLevel - lastSeaLevel) < 1e-5 && lowerBound !== null && upperBound !== null) {
            break;
        }
        lastSeaLevel = seaLevel;
    }
    const finalResult = bestResult ?? buildHydrologyState({ width, height, elevationGrid, rules, seed, seaLevel });
    const adjustedSeaLevel = finalResult.seaLevel ?? seaLevel;
    const coverage = finalResult.coverage ?? computeElevationCoverage(elevationGrid, adjustedSeaLevel);
    const surfaceCoverage = finalResult.surfaceCoverage ?? computeWaterCoverage(width, height, finalResult.types, finalResult.filled, elevationGrid, adjustedSeaLevel);
    const iterations = finalResult.iterations ?? maxIterations;
    const filledMatrix = toMatrix(width, height, finalResult.filled);
    const typesMatrix = toMatrix(width, height, finalResult.types);
    const flowMatrix = [];
    const accumulationMatrix = toMatrix(width, height, finalResult.accumulation);
    for (let y = 0; y < height; y += 1) {
        const row = [];
        for (let x = 0; x < width; x += 1) {
            const dir = finalResult.flow[y * width + x];
            if (dir < 0) {
                row.push(null);
            }
            else {
                row.push({ dx: D8[dir][0], dy: D8[dir][1] });
            }
        }
        flowMatrix.push(row);
    }
    const waterTableMatrix = filledMatrix;
    const adjustedRules = { ...rules, seaLevel: adjustedSeaLevel };
    const percent = (coverage * 100).toFixed(2);
    const surfacePercent = (surfaceCoverage * 100).toFixed(2);
    const seaLevelLabel = adjustedSeaLevel.toFixed(3);
    if (typeof console !== 'undefined' && typeof console.debug === 'function') {
        console.debug(`[hydrology] water coverage ${percent}% (surface ${surfacePercent}%) after ${iterations} pass(es) (seaLevel=${seaLevelLabel})`);
    }
    return {
        types: typesMatrix,
        flowDirections: flowMatrix,
        flowAccumulation: accumulationMatrix,
        filledElevation: waterTableMatrix,
        waterTable: waterTableMatrix,
        rules: adjustedRules,
        seaLevel: adjustedSeaLevel,
        waterCoverage: coverage,
        surfaceWaterCoverage: surfaceCoverage,
        waterAdjustmentHistory: adjustmentHistory
    };
}
