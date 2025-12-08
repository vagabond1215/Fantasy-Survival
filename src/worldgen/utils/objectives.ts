import { ObjectiveScore, ObjectiveTarget } from '../solver/types';

export function scoreObjectives(
  metrics: Record<string, number | string>,
  objectives: ObjectiveTarget[]
): { breakdown: ObjectiveScore[]; score: number } {
  const breakdown = objectives.map(objective => {
    const value = Number(metrics[objective.metric] ?? 0);
    const deviation = value - objective.target;
    const absolute = Math.abs(deviation);
    const tolerance = objective.tolerance ?? 0;
    const penalty = Math.max(0, absolute - tolerance) * objective.weight;
    return {
      metric: objective.metric,
      target: objective.target,
      value,
      deviation,
      weight: objective.weight,
      tolerance,
      penalty
    } satisfies ObjectiveScore;
  });

  const score = breakdown.reduce((sum, entry) => sum + entry.penalty, 0);
  return { breakdown, score };
}
