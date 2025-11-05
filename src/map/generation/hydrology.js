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
const MARINE_TYPES = new Set([
    'ocean',
    'estuary',
    'delta',
    'mangrove_forest',
    'kelp_forest',
    'coral_reef',
    'polar_sea',
    'open_ocean',
    'abyssal_deep',
    'seamount'
]);
const STANDING_FRESHWATER_TYPES = new Set(['lake', 'pond']);
const WETLAND_TYPES = new Set(['marsh', 'swamp', 'bog', 'fen']);
const FLOWING_WATER_TYPES = new Set(['river', 'stream']);
function isMarine(type) {
    return MARINE_TYPES.has(type);
}
function isStandingWater(type) {
    return STANDING_FRESHWATER_TYPES.has(type) || WETLAND_TYPES.has(type);
}
function isWetland(type) {
    return WETLAND_TYPES.has(type);
}
function isFlowingWater(type) {
    return FLOWING_WATER_TYPES.has(type);
}
function directionIndex(dx, dy) {
    for (let i = 0; i < D8.length; i += 1) {
        if (D8[i][0] === dx && D8[i][1] === dy) {
            return i;
        }
    }
    return -1;
}
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
    const pondMaxArea = Math.max(minArea, rules.pondMaxArea ?? minArea);
    const pondMaxDepth = Math.max(0.004, Math.min(minDepth, rules.pondMaxDepth ?? minDepth * 0.85));
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
            const basinType = total <= pondMaxArea && maxDepth <= pondMaxDepth ? 'pond' : 'lake';
            for (const cell of basin) {
                types[cell] = basinType;
            }
            if (basinType === 'lake') {
                lakeCells.push(...basin);
            }
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
            if (filled[nIdx] <= seaLevel + epsilon && !STANDING_FRESHWATER_TYPES.has(types[nIdx])) {
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
        if (isMarine(types[idx]))
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
        if (isMarine(types[downstreamIdx]) || STANDING_FRESHWATER_TYPES.has(types[downstreamIdx])) {
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
    const streamThreshold = Math.max(2, (rules.streamFlowThreshold ?? threshold * 0.4) * (rules.flowMultiplier ?? 1));
    const streamTributary = Math.max(1.5, (rules.streamTributaryThreshold ?? tributaryThreshold * 0.5) * (rules.flowMultiplier ?? 1));
    const streamStack = [];
    for (let idx = 0; idx < size; idx += 1) {
        if (types[idx] !== 'land')
            continue;
        if (accumulation[idx] >= streamThreshold) {
            types[idx] = 'stream';
            streamStack.push(idx);
        }
    }
    while (streamStack.length) {
        const current = streamStack.pop();
        const dir = flow[current];
        if (dir >= 0) {
            const cx = current % width;
            const cy = Math.floor(current / width);
            const nx = cx + D8[dir][0];
            const ny = cy + D8[dir][1];
            if (nx >= 0 && ny >= 0 && nx < width && ny < height) {
                const nIdx = ny * width + nx;
                if (types[nIdx] === 'land' && accumulation[nIdx] >= streamTributary) {
                    types[nIdx] = 'stream';
                    streamStack.push(nIdx);
                }
            }
        }
        for (const source of upstream[current]) {
            if (types[source] === 'land' && accumulation[source] >= streamTributary) {
                types[source] = 'stream';
                streamStack.push(source);
            }
        }
    }
}

function selectCoastalMouth(width, height, types, elevations, filled, accumulation, seaLevel, rules) {
    const size = width * height;
    let bestIdx = -1;
    let bestScore = -Infinity;
    const lowlandBand = seaLevel + Math.max(0.03, rules.estuaryWideningDepth ?? 0.05);
    for (let idx = 0; idx < size; idx += 1) {
        const type = types[idx];
        if (type !== 'land' && type !== 'river' && type !== 'marsh')
            continue;
        const x = idx % width;
        const y = Math.floor(idx / width);
        let touchesOcean = false;
        for (const [dx, dy] of D8) {
            const nx = x + dx;
            const ny = y + dy;
            if (nx < 0 || ny < 0 || nx >= width || ny >= height)
                continue;
            if (isMarine(types[ny * width + nx])) {
                touchesOcean = true;
                break;
            }
        }
        if (!touchesOcean)
            continue;
        const elevation = elevations[idx];
        const level = filled[idx];
        const lowland = Math.max(0, lowlandBand - elevation);
        const slack = Math.max(0, seaLevel + 0.08 - level);
        const flow = accumulation[idx];
        const mouthWeight = (type === 'river' ? 1.15 : 1) + (type === 'marsh' ? 0.1 : 0);
        const score = flow * (1 + lowland * 5) * mouthWeight + slack * 150;
        if (score > bestScore) {
            bestScore = score;
            bestIdx = idx;
        }
    }
    return bestIdx;
}

function gatherTributarySources(mouthIdx, upstream, accumulation, rules, maxSources) {
    if (mouthIdx < 0)
        return [];
    const visited = new Uint8Array(upstream.length);
    const queue = [{ idx: mouthIdx, depth: 0 }];
    visited[mouthIdx] = 1;
    const threshold = Math.max(rules.riverFlowThreshold, rules.tributaryThreshold) * rules.flowMultiplier * 0.8;
    const candidates = [];
    while (queue.length) {
        const current = queue.shift();
        for (const up of upstream[current.idx]) {
            if (visited[up])
                continue;
            visited[up] = 1;
            const depth = current.depth + 1;
            const acc = accumulation[up];
            if (acc >= threshold) {
                candidates.push({ idx: up, acc, depth });
            }
            queue.push({ idx: up, depth });
        }
    }
    candidates.sort((a, b) => {
        if (b.acc !== a.acc)
            return b.acc - a.acc;
        return b.depth - a.depth;
    });
    const picked = [];
    for (const candidate of candidates) {
        picked.push(candidate.idx);
        if (picked.length >= maxSources)
            break;
    }
    return picked;
}

function routeRiverPath(width, height, start, target, filled, types, options) {
    if (start === target)
        return [start];
    const size = width * height;
    const heap = new MinHeap();
    const cost = new Float64Array(size);
    const visited = new Uint8Array(size);
    const prev = new Int32Array(size);
    cost.fill(Number.POSITIVE_INFINITY);
    prev.fill(-1);
    const slopeWeight = options.slopeWeight ?? 35;
    const heuristicWeight = options.heuristicWeight ?? 1;
    const radiusWeight = options.radiusWeight ?? 1.5;
    const elevationWeight = options.elevationWeight ?? 40;
    const avoidOcean = options.avoidOcean ?? false;
    const targetX = target % width;
    const targetY = Math.floor(target / width);
    const centerX = options.confluenceCenter?.x ?? targetX;
    const centerY = options.confluenceCenter?.y ?? targetY;
    const radius = Math.max(0, options.confluenceRadius ?? 0);
    const maxElevation = options.maxElevation ?? Number.POSITIVE_INFINITY;
    cost[start] = 0;
    heap.push({ index: start, value: 0 });
    for (let current = heap.pop(); current; current = heap.pop()) {
        const { index, value } = current;
        if (value > cost[index])
            continue;
        if (index === target)
            break;
        if (visited[index])
            continue;
        visited[index] = 1;
        const cx = index % width;
        const cy = Math.floor(index / width);
        for (let i = 0; i < D8.length; i += 1) {
            const dx = D8[i][0];
            const dy = D8[i][1];
            const nx = cx + dx;
            const ny = cy + dy;
            if (nx < 0 || ny < 0 || nx >= width || ny >= height)
                continue;
            const nIdx = ny * width + nx;
            if (avoidOcean && isMarine(types[nIdx]) && nIdx !== target)
                continue;
            const base = (i % 2 === 0) ? 1 : Math.SQRT2;
            const slope = Math.max(0, filled[nIdx] - filled[index]);
            const slopePenalty = slope * slopeWeight;
            const distanceFromCenter = Math.hypot(nx - centerX, ny - centerY);
            const radiusPenalty = distanceFromCenter > radius ? (distanceFromCenter - radius) * radiusWeight : 0;
            const elevationPenalty = filled[nIdx] > maxElevation ? (filled[nIdx] - maxElevation) * elevationWeight : 0;
            const penalty = slopePenalty + radiusPenalty + elevationPenalty;
            const newCost = cost[index] + base + penalty;
            if (newCost >= cost[nIdx])
                continue;
            cost[nIdx] = newCost;
            prev[nIdx] = index;
            const heuristic = Math.hypot(nx - targetX, ny - targetY) * heuristicWeight;
            heap.push({ index: nIdx, value: newCost + heuristic });
        }
    }
    if (prev[target] === -1)
        return null;
    const path = [target];
    let current = target;
    while (current !== start) {
        current = prev[current];
        if (current === -1)
            return null;
        path.push(current);
    }
    path.reverse();
    return path;
}

function markRiverPath(path, types, flow, width, height, options = {}) {
    if (!path || path.length === 0)
        return 0;
    const skipLast = options.skipLast ?? false;
    const limit = skipLast ? path.length - 1 : path.length;
    for (let i = 0; i < limit; i += 1) {
        const idx = path[i];
        if (!isMarine(types[idx]) && !STANDING_FRESHWATER_TYPES.has(types[idx])) {
            types[idx] = 'river';
        }
    }
    for (let i = 0; i < path.length - 1; i += 1) {
        const current = path[i];
        const next = path[i + 1];
        const cx = current % width;
        const cy = Math.floor(current / width);
        const nx = next % width;
        const ny = Math.floor(next / width);
        const dir = directionIndex(nx - cx, ny - cy);
        if (dir >= 0) {
            flow[current] = dir;
        }
    }
    return limit;
}

function widenRiverEstuary(width, height, path, types, filled, seaLevel, wideningDepth) {
    if (!path || !path.length)
        return;
    const delta = Math.max(0.01, wideningDepth ?? 0.05);
    for (const idx of path) {
        const level = filled[idx];
        if (level > seaLevel + delta)
            continue;
        const closeness = seaLevel + delta - level;
        const radius = Math.min(3, Math.max(1, Math.round(1 + closeness / delta)));
        const cx = idx % width;
        const cy = Math.floor(idx / width);
        for (let dy = -radius; dy <= radius; dy += 1) {
            for (let dx = -radius; dx <= radius; dx += 1) {
                const nx = cx + dx;
                const ny = cy + dy;
                if (nx < 0 || ny < 0 || nx >= width || ny >= height)
                    continue;
                if (Math.hypot(dx, dy) > radius + 0.25)
                    continue;
                const nIdx = ny * width + nx;
                if (isMarine(types[nIdx]) || STANDING_FRESHWATER_TYPES.has(types[nIdx]))
                    continue;
                types[nIdx] = 'river';
            }
        }
    }
}

function createDistributaries(width, height, mouthIdx, types, flow, filled, seaLevel, rules, seed) {
    if (mouthIdx < 0)
        return 0;
    const min = Math.max(1, rules.distributaryMin ?? 2);
    const max = Math.max(min, rules.distributaryMax ?? min);
    const span = max - min + 1;
    const mouthX = mouthIdx % width;
    const mouthY = Math.floor(mouthIdx / width);
    const radius = Math.max(2, rules.estuaryRadius ?? 4);
    const radiusSq = radius * radius;
    const candidates = [];
    for (let y = Math.max(0, mouthY - radius); y <= Math.min(height - 1, mouthY + radius); y += 1) {
        for (let x = Math.max(0, mouthX - radius); x <= Math.min(width - 1, mouthX + radius); x += 1) {
            const dx = x - mouthX;
            const dy = y - mouthY;
            if (dx * dx + dy * dy > radiusSq)
                continue;
            const idx = y * width + x;
            if (isMarine(types[idx])) {
                candidates.push(idx);
            }
        }
    }
    if (!candidates.length)
        return 0;
    const hashBase = hashCoord(seed ?? 0, mouthIdx);
    const desiredRaw = min + (span > 0 ? hashBase % span : 0);
    const desired = Math.min(max, Math.max(min, desiredRaw));
    let created = 0;
    const used = new Set();
    let attempts = 0;
    const maxAttempts = candidates.length * 4;
    while (created < desired && attempts < maxAttempts) {
        const hash = hashCoord(seed ?? 0, mouthIdx * 131 + created * 17 + attempts + 1);
        const target = candidates[hash % candidates.length];
        attempts += 1;
        if (used.has(target))
            continue;
        const path = routeRiverPath(width, height, mouthIdx, target, filled, types, {
            slopeWeight: 30,
            heuristicWeight: 0.9,
            radiusWeight: 1.2,
            confluenceCenter: { x: mouthX, y: mouthY },
            confluenceRadius: radius,
            maxElevation: seaLevel + (rules.estuaryWideningDepth ?? 0.06) * 1.4,
            elevationWeight: 90,
            avoidOcean: false
        });
        if (!path || path.length < 2)
            continue;
        markRiverPath(path, types, flow, width, height, { skipLast: isMarine(types[path[path.length - 1]]) });
        used.add(target);
        created += 1;
    }
    return created;
}

function applyEstuaryMorphology(width, height, mouthIdx, types, radius) {
    if (mouthIdx < 0 || radius <= 0)
        return;
    const mouthX = mouthIdx % width;
    const mouthY = Math.floor(mouthIdx / width);
    const radiusSq = radius * radius;
    const toOcean = [];
    const toMarsh = [];
    for (let y = Math.max(0, mouthY - radius); y <= Math.min(height - 1, mouthY + radius); y += 1) {
        for (let x = Math.max(0, mouthX - radius); x <= Math.min(width - 1, mouthX + radius); x += 1) {
            const dx = x - mouthX;
            const dy = y - mouthY;
            if (dx * dx + dy * dy > radiusSq)
                continue;
            const idx = y * width + x;
            if (types[idx] !== 'land')
                continue;
            let waterNeighbors = 0;
            let oceanNeighbors = 0;
            for (const [ox, oy] of D8) {
                const nx = x + ox;
                const ny = y + oy;
                if (nx < 0 || ny < 0 || nx >= width || ny >= height)
                    continue;
                const neighbor = types[ny * width + nx];
                if (neighbor !== 'land') {
                    waterNeighbors += 1;
                    if (isMarine(neighbor)) {
                        oceanNeighbors += 1;
                    }
                }
            }
            if (oceanNeighbors >= 3 || waterNeighbors >= 5) {
                toOcean.push(idx);
            }
            else if (waterNeighbors >= 3) {
                toMarsh.push(idx);
            }
        }
    }
    for (const idx of toOcean) {
        types[idx] = 'ocean';
    }
    for (const idx of toMarsh) {
        if (types[idx] === 'land') {
            types[idx] = 'marsh';
        }
    }
}

function enhanceRiverNetwork({ width, height, types, flow, accumulation, upstream, filled, rules, seed, seaLevel, elevations }) {
    const stats = { mainChannels: 0, tributaries: 0, distributaries: 0 };
    const mouthIdx = selectCoastalMouth(width, height, types, elevations, filled, accumulation, seaLevel, rules);
    if (mouthIdx < 0)
        return stats;
    const maxSources = Math.max(2, rules.distributaryMax ?? 3);
    const sources = gatherTributarySources(mouthIdx, upstream, accumulation, rules, maxSources);
    if (!sources.length)
        return stats;
    const center = { x: mouthIdx % width, y: Math.floor(mouthIdx / width) };
    const confluenceRadius = Math.max(2, rules.confluenceRadius ?? Math.round((rules.estuaryRadius ?? 4) * 0.75));
    let longestPath = [];
    for (let i = 0; i < sources.length; i += 1) {
        const sourceIdx = sources[i];
        const path = routeRiverPath(width, height, sourceIdx, mouthIdx, filled, types, {
            slopeWeight: 45,
            heuristicWeight: 1,
            radiusWeight: 2,
            confluenceCenter: center,
            confluenceRadius,
            maxElevation: seaLevel + (rules.estuaryWideningDepth ?? 0.06) * 1.25,
            elevationWeight: 70,
            avoidOcean: true
        });
        if (!path || path.length < 2)
            continue;
        markRiverPath(path, types, flow, width, height, { skipLast: false });
        if (path.length > longestPath.length) {
            longestPath = path;
        }
    }
    if (!longestPath.length) {
        if (types[mouthIdx] === 'land') {
            types[mouthIdx] = 'river';
        }
        return stats;
    }
    stats.mainChannels = longestPath.length;
    stats.tributaries = Math.max(0, sources.length - 1);
    widenRiverEstuary(width, height, longestPath, types, filled, seaLevel, rules.estuaryWideningDepth);
    const distributaries = createDistributaries(width, height, mouthIdx, types, flow, filled, seaLevel, rules, seed);
    stats.distributaries = distributaries;
    applyEstuaryMorphology(width, height, mouthIdx, types, Math.round(rules.estuaryRadius ?? 4));
    return stats;
}
function layMarshes(width, height, types, rules) {
    if (rules.marshiness <= 0)
        return;
    const size = width * height;
    const marshStrength = rules.marshiness;
    const ring = Math.max(1, Math.trunc(rules.marshRingWidth));
    const newMarsh = new Uint8Array(size);
    for (let idx = 0; idx < size; idx += 1) {
        if (!STANDING_FRESHWATER_TYPES.has(types[idx]) && !isFlowingWater(types[idx]) && !isMarine(types[idx]))
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
function refineWetlands(width, height, types, filled, elevations, accumulation, rules) {
    const size = width * height;
    const wetlandWeights = rules.wetlandWeights ?? { marsh: 0.4, swamp: 0.25, bog: 0.2, fen: 0.15 };
    const marshiness = rules.marshiness ?? 0;
    const peatPreference = clamp(rules.peatlandPreference ?? 0, 0, 1);
    const fenPreference = clamp(rules.fenPreference ?? 0.5, 0, 1);
    const peatFlowThreshold = Math.max(1.5, (rules.peatlandFlowThreshold ?? rules.streamFlowThreshold ?? 3) * (rules.flowMultiplier ?? 1));
    const shallowDepth = Math.max(0.008, (rules.pondMaxDepth ?? 0.012) * 1.2);
    for (let idx = 0; idx < size; idx += 1) {
        if (!isWetland(types[idx]))
            continue;
        const cx = idx % width;
        const cy = Math.floor(idx / width);
        let standingNeighbors = 0;
        let riverNeighbors = 0;
        let streamNeighbors = 0;
        let marineNeighbors = 0;
        let landNeighbors = 0;
        let flowSignal = 0;
        for (const [dx, dy] of D8) {
            const nx = cx + dx;
            const ny = cy + dy;
            if (nx < 0 || ny < 0 || nx >= width || ny >= height)
                continue;
            const nIdx = ny * width + nx;
            const neighbor = types[nIdx];
            if (neighbor === 'land') {
                landNeighbors += 1;
            }
            else if (isWetland(neighbor)) {
                // neighboring wetlands influence peat development but are handled via type reassignment
            }
            else if (STANDING_FRESHWATER_TYPES.has(neighbor)) {
                standingNeighbors += 1;
            }
            else if (neighbor === 'river') {
                riverNeighbors += 1;
                flowSignal += (accumulation[nIdx] ?? 0) * 0.8;
            }
            else if (neighbor === 'stream') {
                streamNeighbors += 1;
                flowSignal += (accumulation[nIdx] ?? 0) * 0.4;
            }
            else if (isMarine(neighbor)) {
                marineNeighbors += 1;
            }
        }
        const localDepth = Math.max(0, filled[idx] - elevations[idx]);
        const localFlow = accumulation[idx] ?? 0;
        const lowFlow = localFlow <= peatFlowThreshold * 0.85;
        const flowFactor = flowSignal / Math.max(1, riverNeighbors + streamNeighbors || 1);
        const baseMarsh = (wetlandWeights.marsh ?? 0.35) + marshiness * 0.25 + landNeighbors * 0.05 + flowFactor * 0.1;
        const baseSwamp = (wetlandWeights.swamp ?? 0.25) + riverNeighbors * 0.6 + streamNeighbors * 0.4 + marineNeighbors * 0.35 + Math.max(0, localDepth - shallowDepth) * 18 + marshiness * 0.2 + flowFactor * 0.35;
        let baseBog = (wetlandWeights.bog ?? 0.2) + (lowFlow ? 0.45 : 0.1) + peatPreference * 0.5 + (standingNeighbors === 0 ? 0.15 : 0) - flowFactor * 0.25;
        let baseFen = (wetlandWeights.fen ?? 0.2) + standingNeighbors * 0.45 + streamNeighbors * 0.25 + fenPreference * 0.5 + (lowFlow ? 0.2 : 0) + flowFactor * 0.2;
        if (!lowFlow) {
            baseBog *= 0.55;
            baseFen *= 0.8;
        }
        if (marineNeighbors > 0) {
            baseBog *= 0.8;
            baseFen *= 0.9;
        }
        const scores = {
            marsh: baseMarsh,
            swamp: baseSwamp,
            bog: baseBog,
            fen: baseFen
        };
        let bestType = 'marsh';
        let bestScore = -Infinity;
        for (const [key, value] of Object.entries(scores)) {
            if (value > bestScore) {
                bestScore = value;
                bestType = key;
            }
        }
        types[idx] = bestType;
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
function classifyMarineEdges(width, height, types, filled, elevations, seaLevel, rules, accumulation) {
    const latitudeBias = rules.latitudeBias ?? 0;
    const marineWeights = rules.marineEdgeWeights ?? {};
    const shallowDepth = Math.max(0.02, (rules.estuaryWideningDepth ?? 0.05) * 0.8);
    const deepThreshold = Math.max(0.08, shallowDepth * 2.2);
    const abyssalThreshold = Math.max(0.16, deepThreshold * 1.6);
    const tropicalFactor = Math.max(0, 0.6 - Math.abs(latitudeBias + 0.2));
    const temperateFactor = Math.max(0, 0.6 - Math.abs(latitudeBias - 0.1));
    const polarFactor = Math.max(0, latitudeBias);
    for (let idx = 0; idx < width * height; idx += 1) {
        if (types[idx] !== 'ocean')
            continue;
        const cx = idx % width;
        const cy = Math.floor(idx / width);
        const depth = Math.max(0, seaLevel - elevations[idx]);
        let landNeighbors = 0;
        let wetNeighbors = 0;
        let marineNeighbors = 0;
        let flowingNeighbors = 0;
        let flowSignal = 0;
        let slope = 0;
        for (const [dx, dy] of D8) {
            const nx = cx + dx;
            const ny = cy + dy;
            if (nx < 0 || ny < 0 || nx >= width || ny >= height)
                continue;
            const nIdx = ny * width + nx;
            const neighbor = types[nIdx];
            if (neighbor === 'land') {
                landNeighbors += 1;
            }
            else if (isWetland(neighbor) || STANDING_FRESHWATER_TYPES.has(neighbor)) {
                wetNeighbors += 1;
            }
            else if (neighbor === 'river' || neighbor === 'stream') {
                flowingNeighbors += 1;
                flowSignal += (accumulation[nIdx] ?? 0);
            }
            else if (isMarine(neighbor)) {
                marineNeighbors += 1;
            }
            const neighborDepth = Math.max(0, seaLevel - elevations[nIdx]);
            slope = Math.max(slope, Math.abs(neighborDepth - depth));
        }
        const nearCoast = landNeighbors > 0 || wetNeighbors > 0 || flowingNeighbors > 0;
        if (nearCoast) {
            const normalizedFlow = flowSignal / Math.max(1, flowingNeighbors);
            const estuaryScore = (marineWeights.estuary ?? 0.15) + normalizedFlow * 0.45 + flowingNeighbors * 0.25 + (depth < shallowDepth ? 0.25 : 0);
            const deltaScore = (marineWeights.delta ?? 0.14) + normalizedFlow * 0.5 + wetNeighbors * 0.35 + Math.max(0, flowingNeighbors - 1) * 0.25 + (depth < shallowDepth * 1.2 ? 0.15 : 0);
            const mangroveScore = (marineWeights.mangrove_forest ?? 0.1) + wetNeighbors * 0.55 + Math.max(0, -latitudeBias) * 0.35 + (rules.marshiness ?? 0) * 0.3;
            const kelpScore = (marineWeights.kelp_forest ?? 0.08) + temperateFactor * 0.4 + marineNeighbors * 0.1 + (depth >= shallowDepth && depth <= deepThreshold ? 0.25 : 0);
            const coralScore = (marineWeights.coral_reef ?? 0.08) + tropicalFactor * 0.5 + (depth <= shallowDepth ? 0.35 : 0.1) - Math.max(0, depth - deepThreshold) * 0.2;
            const openScore = (marineWeights.open_ocean ?? 0.12) + marineNeighbors * 0.2 + Math.max(0, deepThreshold - depth) * 0.15;
            const candidates = {
                estuary: estuaryScore,
                delta: deltaScore,
                mangrove_forest: mangroveScore,
                kelp_forest: kelpScore,
                coral_reef: coralScore,
                open_ocean: openScore
            };
            let bestType = 'estuary';
            let bestScore = -Infinity;
            for (const [key, value] of Object.entries(candidates)) {
                if (value > bestScore) {
                    bestScore = value;
                    bestType = key;
                }
            }
            types[idx] = bestType;
        }
        else {
            const polarScore = (marineWeights.polar_sea ?? 0.12) + polarFactor * 0.5 + (depth < deepThreshold ? 0.25 : 0);
            const openScore = (marineWeights.open_ocean ?? 0.2) + marineNeighbors * 0.25 + Math.max(0, deepThreshold - depth) * 0.3;
            const abyssalScore = (marineWeights.abyssal_deep ?? 0.12) + Math.max(0, depth - abyssalThreshold) * 0.5;
            const seamountScore = (marineWeights.seamount ?? 0.08) + Math.max(0, slope - 0.02) * 1.2 + (depth < abyssalThreshold ? 0.2 : 0);
            const candidates = {
                polar_sea: polarScore,
                open_ocean: openScore,
                abyssal_deep: abyssalScore,
                seamount: seamountScore
            };
            let bestType = 'open_ocean';
            let bestScore = -Infinity;
            for (const [key, value] of Object.entries(candidates)) {
                if (value > bestScore) {
                    bestScore = value;
                    bestType = key;
                }
            }
            types[idx] = bestType;
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
            return isMarine(types[ny * width + nx]);
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
                    return isMarine(types[py * width + px]);
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

const WATER_CLASSIFICATIONS = new Set([
    'water',
    ...MARINE_TYPES,
    ...STANDING_FRESHWATER_TYPES,
    ...WETLAND_TYPES,
    ...FLOWING_WATER_TYPES,
    'mangrove'
]);

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
        if (depth > depthThreshold && STANDING_FRESHWATER_TYPES.has(type)) {
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
    const riverStats = enhanceRiverNetwork({
        width,
        height,
        types,
        flow,
        accumulation,
        upstream,
        filled,
        rules,
        seed,
        seaLevel,
        elevations: elevationGrid
    });
    pruneDisconnectedRivers(width, height, types, flow);
    layMarshes(width, height, types, rules);
    bridgeDiagonals(width, height, types);
    refineWetlands(width, height, types, filled, elevationGrid, accumulation, rules);
    normalizeCoastline(width, height, types);
    classifyMarineEdges(width, height, types, filled, elevationGrid, seaLevel, rules, accumulation);
    pruneSingletons(width, height, types, spill, rules.maxSingletonFraction);
    return { filled, types, spill, flow, accumulation, riverStats };
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
            if (STANDING_FRESHWATER_TYPES.has(types[current]) || isMarine(types[current])) {
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
                if (STANDING_FRESHWATER_TYPES.has(types[nIdx]) || isMarine(types[nIdx])) {
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
    const targetCoverage = clamp(world?.waterCoverageTarget ?? 0.32, 0.08, 0.85);
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
    const minOceanFraction = clamp(world?.minOceanFraction ?? 0.02, 0, 0.6);
    for (let iteration = 0; iteration < maxIterations; iteration += 1) {
        const state = buildHydrologyState({ width, height, elevationGrid, rules, seed, seaLevel });
        const coverage = computeElevationCoverage(elevationGrid, seaLevel);
        const surfaceCoverage = computeWaterCoverage(width, height, state.types, state.filled, elevationGrid, seaLevel);
        const delta = Math.abs(coverage - targetCoverage);
        let oceanCells = 0;
        for (let i = 0; i < state.types.length; i += 1) {
            if (isMarine(state.types[i])) {
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
    const riverStats = finalResult.riverStats ?? { mainChannels: 0, tributaries: 0, distributaries: 0 };
    const percent = (coverage * 100).toFixed(2);
    const surfacePercent = (surfaceCoverage * 100).toFixed(2);
    const seaLevelLabel = adjustedSeaLevel.toFixed(3);
    if (typeof console !== 'undefined' && typeof console.debug === 'function') {
        console.debug(`[hydrology] water coverage ${percent}% (surface ${surfacePercent}%) after ${iterations} pass(es) (seaLevel=${seaLevelLabel}) | rivers main=${riverStats.mainChannels} trib=${riverStats.tributaries} dist=${riverStats.distributaries}`);
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
        waterAdjustmentHistory: adjustmentHistory,
        riverStats
    };
}
