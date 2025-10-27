export class AdjustmentSolver {
  constructor({
    parameters = {},
    evaluate,
    regenerate,
    maxIterations = 5,
    chunkSize = 16,
    chunkRows = 1,
    chunkColumns = 1,
    gridWidth = 0,
    gridHeight = 0
  } = {}) {
    this.parameters = { ...parameters };
    this.evaluate = typeof evaluate === 'function' ? evaluate : () => null;
    this.regenerate = typeof regenerate === 'function' ? regenerate : () => null;
    this.maxIterations = Math.max(1, Math.trunc(maxIterations));
    this.chunkSize = Math.max(1, Math.trunc(chunkSize));
    this.chunkRows = Math.max(1, Math.trunc(chunkRows));
    this.chunkColumns = Math.max(1, Math.trunc(chunkColumns));
    this.gridWidth = Math.max(0, Math.trunc(gridWidth));
    this.gridHeight = Math.max(0, Math.trunc(gridHeight));
    this.metricsHistory = [];
    this.messages = [];
    this.fullRerender = false;
    this.dirtyChunks = new Set();
    this.bestSolution = null;
  }

  markAllDirty() {
    this.fullRerender = true;
    this.dirtyChunks.clear();
  }

  markChunkDirty(row, column) {
    if (this.fullRerender) return;
    const r = Math.trunc(row);
    const c = Math.trunc(column);
    if (Number.isNaN(r) || Number.isNaN(c)) return;
    if (r < 0 || c < 0 || r >= this.chunkRows || c >= this.chunkColumns) return;
    this.dirtyChunks.add(`${r}:${c}`);
  }

  markTileDirty(x, y) {
    if (this.fullRerender) return;
    const tx = Math.trunc(x);
    const ty = Math.trunc(y);
    if (Number.isNaN(tx) || Number.isNaN(ty)) return;
    if (tx < 0 || ty < 0 || tx >= this.gridWidth || ty >= this.gridHeight) return;
    const chunkRow = Math.floor(ty / this.chunkSize);
    const chunkColumn = Math.floor(tx / this.chunkSize);
    this.markChunkDirty(chunkRow, chunkColumn);
  }

  addMessage(message) {
    if (!message || typeof message !== 'string') return;
    const trimmed = message.trim();
    if (trimmed) {
      this.messages.push(trimmed);
    }
  }

  computeScore(metrics) {
    if (!metrics) return Number.NEGATIVE_INFINITY;
    if (Number.isFinite(metrics.score)) {
      return metrics.score;
    }
    const landRatio = Number.isFinite(metrics.landRatio) ? metrics.landRatio : 0;
    const oreRatio = Number.isFinite(metrics.oreRatio) ? metrics.oreRatio : 0;
    const waterPenalty = metrics.origin?.isWater ? 0.25 : 0;
    return landRatio - oreRatio * 0.2 - waterPenalty;
  }

  getDirtyChunks() {
    if (this.fullRerender) {
      return [];
    }
    const entries = [];
    for (const key of this.dirtyChunks) {
      const [row, column] = key.split(':').map(value => Number.parseInt(value, 10));
      if (Number.isFinite(row) && Number.isFinite(column)) {
        entries.push({ row, column });
      }
    }
    return entries;
  }

  solve(externalContext = {}) {
    const context = { ...externalContext, solver: this };
    let metrics = null;
    let iteration = 0;
    let finalParameters = { ...this.parameters };
    let finalMetrics = null;

    for (; iteration < this.maxIterations; iteration++) {
      const currentParameters = { ...this.parameters };
      metrics = this.evaluate({
        parameters: currentParameters,
        iteration,
        context
      });

      if (!metrics) {
        break;
      }

      const score = this.computeScore(metrics);
      metrics.score = score;
      this.metricsHistory.push(metrics);

      const best = this.bestSolution;
      const satisfied = metrics.satisfied === true;
      const beatsBest =
        !best ||
        (satisfied && best.metrics?.satisfied !== true) ||
        (satisfied === (best.metrics?.satisfied === true) && score > best.score);
      if (beatsBest) {
        const metricsCopy = {
          ...metrics,
          origin: metrics.origin ? { ...metrics.origin } : metrics.origin,
          stats: metrics.stats ? { ...metrics.stats } : metrics.stats
        };
        this.bestSolution = {
          score,
          metrics: metricsCopy,
          parameters: currentParameters
        };
      }

      finalParameters = currentParameters;
      finalMetrics = metrics;

      if (metrics.satisfied === true) {
        break;
      }

      const update = this.regenerate({
        parameters: { ...this.parameters },
        metrics,
        iteration,
        context
      });

      if (!update) {
        break;
      }

      if (update.parameters && typeof update.parameters === 'object') {
        this.parameters = { ...this.parameters, ...update.parameters };
      }

      if (Array.isArray(update.messages)) {
        update.messages.forEach(message => this.addMessage(message));
      }

      if (update.message) {
        this.addMessage(update.message);
      }

      if (update.markAllDirty) {
        this.markAllDirty();
      }

      if (Array.isArray(update.markTiles)) {
        update.markTiles.forEach(tile => {
          if (tile && Number.isFinite(tile.x) && Number.isFinite(tile.y)) {
            this.markTileDirty(tile.x, tile.y);
          }
        });
      }

      if (Array.isArray(update.markChunks)) {
        update.markChunks.forEach(chunk => {
          if (chunk && Number.isFinite(chunk.row) && Number.isFinite(chunk.column)) {
            this.markChunkDirty(chunk.row, chunk.column);
          }
        });
      }

      if (update.stop === true) {
        break;
      }
    }

    let revertedToBest = false;
    if (this.bestSolution) {
      const finalScore = this.computeScore(finalMetrics);
      const best = this.bestSolution;
      const shouldUseBest =
        !finalMetrics ||
        !finalMetrics.satisfied ||
        best.metrics?.satisfied === true ||
        best.score > finalScore;
      if (shouldUseBest) {
        finalParameters = { ...best.parameters };
        finalMetrics = best.metrics;
        const current = this.parameters;
        if (
          !current ||
          current.xStart !== finalParameters.xStart ||
          current.yStart !== finalParameters.yStart ||
          (current.originShiftX || 0) !== (finalParameters.originShiftX || 0) ||
          (current.originShiftY || 0) !== (finalParameters.originShiftY || 0)
        ) {
          this.markAllDirty();
          revertedToBest = true;
        }
      }
    }

    this.parameters = { ...finalParameters };

    return {
      parameters: { ...this.parameters },
      metrics: finalMetrics,
      history: this.metricsHistory.slice(),
      messages: this.messages.slice(),
      iterations: this.metricsHistory.length,
      dirty: {
        full: this.fullRerender || revertedToBest,
        chunks: this.getDirtyChunks()
      }
    };
  }
}

export default AdjustmentSolver;
