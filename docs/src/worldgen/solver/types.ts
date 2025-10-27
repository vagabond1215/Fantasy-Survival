export type ParameterPath = string;

export interface ParameterDefinition {
  /**
   * Dot-separated path to the tunable value within the parameter vector.
   */
  readonly key: ParameterPath;
  /** Minimum inclusive bound for the parameter. */
  readonly min: number;
  /** Maximum inclusive bound for the parameter. */
  readonly max: number;
  /** Increment applied for each proposal step. */
  readonly step?: number;
}

export interface ParameterVector {
  [key: string]: number | ParameterVector;
}

export interface MetricDefinition {
  readonly key: string;
  readonly compute: (parameters: ParameterVector) => number;
}

export interface ObjectiveTarget {
  readonly metric: string;
  readonly target: number;
  readonly weight: number;
  readonly tolerance?: number;
}

export interface ObjectiveScore {
  readonly metric: string;
  readonly target: number;
  readonly value: number;
  readonly deviation: number;
  readonly weight: number;
  readonly tolerance: number;
  readonly penalty: number;
}

export interface EvaluationState {
  readonly metrics: Record<string, number>;
  readonly breakdown: ObjectiveScore[];
  readonly score: number;
}

export interface ProposalEvaluation extends EvaluationState {
  readonly iteration: number;
  readonly parameterKey: ParameterPath;
  readonly direction: 1 | -1;
  readonly delta: number;
  readonly accepted: boolean;
}

export interface RegenerationContext {
  readonly iteration: number;
  readonly reason: 'stagnation' | 'nan' | 'exhausted';
  readonly current: ParameterVector;
  readonly best: ParameterVector;
  readonly bestEvaluation: EvaluationState;
}

export interface SolverCallbacks {
  readonly onProposal?: (proposal: ProposalEvaluation) => void;
  readonly onRegeneration?: (context: RegenerationContext) => ParameterVector | void;
}

export interface AdjustmentSolverOptions {
  readonly parameters: ParameterDefinition[];
  readonly metrics: MetricDefinition[];
  readonly objectives: ObjectiveTarget[];
  readonly maxIterations?: number;
  readonly stagnationLimit?: number;
  readonly maxRegenerations?: number;
  readonly rng?: () => number;
}

export interface SolverResult extends EvaluationState {
  readonly parameters: ParameterVector;
  readonly iterations: number;
  readonly regenerations: number;
}

export interface HabitatProfile {
  readonly id: string;
  readonly name: string;
  readonly description?: string;
  readonly seed: ParameterVector;
  readonly objectives: ObjectiveTarget[];
}

export interface BuildWorldOptions {
  readonly difficulty?: string;
  readonly profileId?: string;
  readonly seed?: number | string;
  readonly overrides?: Partial<ParameterVector>;
  readonly objectives?: ObjectiveTarget[];
}

export interface BuildWorldResult extends SolverResult {
  readonly difficulty: string;
  readonly profile: HabitatProfile;
}
