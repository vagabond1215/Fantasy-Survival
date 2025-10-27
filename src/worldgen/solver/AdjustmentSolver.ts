import {
  AdjustmentSolverOptions,
  EvaluationState,
  ObjectiveTarget,
  ParameterDefinition,
  ParameterPath,
  ParameterVector,
  ProposalEvaluation,
  RegenerationContext,
  SolverCallbacks,
  SolverResult
} from './types';
import {
  cloneParameters,
  getParameterValue,
  setParameterValue,
  snapParameterValue
} from '../utils/parameters';
import { scoreObjectives } from '../utils/objectives';

const EPSILON = 1e-6;

function cloneEvaluation(evaluation: EvaluationState): EvaluationState {
  return {
    score: evaluation.score,
    metrics: { ...evaluation.metrics },
    breakdown: evaluation.breakdown.map(entry => ({ ...entry }))
  };
}

interface CandidateState {
  readonly parameters: ParameterVector;
  readonly evaluation: EvaluationState;
  readonly parameterKey: ParameterPath;
  readonly direction: 1 | -1;
}

export class AdjustmentSolver {
  private readonly parameters: ParameterDefinition[];

  private readonly metrics: AdjustmentSolverOptions['metrics'];

  private readonly objectives: ObjectiveTarget[];

  private readonly rng: () => number;

  private readonly maxIterations: number;

  private readonly stagnationLimit: number;

  private readonly maxRegenerations: number;

  constructor(options: AdjustmentSolverOptions) {
    this.parameters = options.parameters;
    this.metrics = options.metrics;
    this.objectives = options.objectives;
    this.rng = options.rng || Math.random;
    this.maxIterations = options.maxIterations ?? 240;
    this.stagnationLimit = options.stagnationLimit ?? 8;
    this.maxRegenerations = options.maxRegenerations ?? 4;
  }

  solve(initial: ParameterVector, callbacks: SolverCallbacks = {}): SolverResult {
    let current = cloneParameters(initial);
    let currentEvaluation = this.evaluate(current);
    let best = { parameters: cloneParameters(current), evaluation: cloneEvaluation(currentEvaluation) };

    const { onProposal, onRegeneration } = callbacks;

    let regenerations = 0;
    let stagnation = 0;
    let iteration = 0;

    while (iteration < this.maxIterations) {
      iteration += 1;
      let improved = false;

      for (const definition of this.parameters) {
        const candidates = this.propose(current, definition, currentEvaluation, iteration);

        let acceptedCandidate: CandidateState | null = null;

        for (const candidate of candidates) {
          const delta = candidate.evaluation.score - currentEvaluation.score;
          const proposal: ProposalEvaluation = {
            ...candidate.evaluation,
            iteration,
            parameterKey: candidate.parameterKey,
            direction: candidate.direction,
            delta,
            accepted: false
          };
          onProposal?.(proposal);

          if (!Number.isFinite(candidate.evaluation.score)) {
            continue;
          }

          if (candidate.evaluation.score + EPSILON < best.evaluation.score) {
            best = {
              parameters: cloneParameters(candidate.parameters),
              evaluation: cloneEvaluation(candidate.evaluation)
            };
          }

          if (candidate.evaluation.score + EPSILON < currentEvaluation.score) {
            if (!acceptedCandidate || candidate.evaluation.score < acceptedCandidate.evaluation.score) {
              acceptedCandidate = candidate;
            }
          }
        }

        if (acceptedCandidate) {
          const delta = acceptedCandidate.evaluation.score - currentEvaluation.score;
          current = cloneParameters(acceptedCandidate.parameters);
          currentEvaluation = cloneEvaluation(acceptedCandidate.evaluation);
          improved = true;
          onProposal?.({
            ...currentEvaluation,
            iteration,
            parameterKey: acceptedCandidate.parameterKey,
            direction: acceptedCandidate.direction,
            delta,
            accepted: true
          });
        }
      }

      if (currentEvaluation.score + EPSILON < best.evaluation.score) {
        best = { parameters: cloneParameters(current), evaluation: cloneEvaluation(currentEvaluation) };
      }

      if (improved) {
        stagnation = 0;
      } else {
        stagnation += 1;
      }

      if (stagnation >= this.stagnationLimit || !Number.isFinite(currentEvaluation.score)) {
        if (regenerations >= this.maxRegenerations) {
          break;
        }

        const reason: RegenerationContext['reason'] = !Number.isFinite(currentEvaluation.score)
          ? 'nan'
          : 'stagnation';

        const next = onRegeneration?.({
          iteration,
          reason,
          current: cloneParameters(current),
          best: cloneParameters(best.parameters),
          bestEvaluation: best.evaluation
        });

        if (next) {
          current = cloneParameters(next);
        } else {
          current = this.randomizeAround(best.parameters);
        }

        currentEvaluation = this.evaluate(current);
        stagnation = 0;
        regenerations += 1;

        if (!Number.isFinite(currentEvaluation.score)) {
          currentEvaluation = cloneEvaluation(best.evaluation);
          current = cloneParameters(best.parameters);
        }
      }
    }

    return {
      parameters: best.parameters,
      ...best.evaluation,
      iterations: iteration,
      regenerations
    };
  }

  private propose(
    source: ParameterVector,
    definition: ParameterDefinition,
    currentEvaluation: EvaluationState,
    iteration: number
  ): CandidateState[] {
    const base = getParameterValue(source, definition.key);
    const step = definition.step ?? 1;

    const attempt = (direction: 1 | -1): CandidateState | null => {
      const raw = base + step * direction;
      const value = snapParameterValue(raw, step, definition.min, definition.max);
      if (Math.abs(value - base) < EPSILON) {
        return null;
      }

      const candidate = cloneParameters(source);
      setParameterValue(candidate, definition.key, value);
      const evaluation = this.evaluate(candidate);
      return {
        parameters: candidate,
        evaluation: cloneEvaluation(evaluation),
        parameterKey: definition.key,
        direction
      };
    };

    const up = attempt(1);
    const down = attempt(-1);
    const proposals: CandidateState[] = [];
    if (up) proposals.push(up);
    if (down) proposals.push(down);

    proposals.sort((a, b) => a.evaluation.score - b.evaluation.score);
    return proposals;
  }

  private evaluate(parameters: ParameterVector): EvaluationState {
    const metrics: Record<string, number> = {};

    for (const metric of this.metrics) {
      metrics[metric.key] = metric.compute(parameters);
    }

    const { breakdown, score } = scoreObjectives(metrics, this.objectives);

    return {
      metrics,
      breakdown,
      score
    };
  }

  private randomizeAround(reference: ParameterVector): ParameterVector {
    const candidate = cloneParameters(reference);
    for (const definition of this.parameters) {
      const spread = (definition.max - definition.min) || 1;
      const jitter = (this.rng() - 0.5) * spread * 0.25;
      const base = getParameterValue(reference, definition.key);
      const stepped = snapParameterValue(
        base + jitter,
        definition.step ?? 1,
        definition.min,
        definition.max
      );
      setParameterValue(candidate, definition.key, stepped);
    }
    return candidate;
  }
}
