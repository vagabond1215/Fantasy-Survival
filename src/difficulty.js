export const difficulties = [
  { id: 'easy', name: 'Easy' },
  { id: 'normal', name: 'Medium' },
  { id: 'hard', name: 'Hard' }
];

export const defaultWorldParameters = {
  oreDensity: 55,
  waterTable: 50,
  temperature: 50,
  rainfall: 50,
  mountains: 50,
  rivers100: 45,
  lakes100: 35,
  advanced: {
    elevationBase: 50,
    elevationVariance: 50,
    elevationScale: 50,
    vegetationScale: 50,
    oreNoiseScale: 50,
    oreThresholdOffset: 50,
    waterGuaranteeRadius: 50,
    waterFlowMultiplier: 50
  }
};

function clamp01(value) {
  const normalized = Number.isFinite(value) ? value : 0;
  if (normalized < 0) return 0;
  if (normalized > 100) return 100;
  return Math.round(normalized);
}

function normalizeAdvanced(advanced = {}) {
  const resolved = { ...defaultWorldParameters.advanced, ...advanced };
  return Object.fromEntries(
    Object.entries(resolved).map(([key, value]) => [key, clamp01(value)])
  );
}

export function resolveWorldParameters(partial = {}) {
  const resolved = {
    ...defaultWorldParameters,
    ...partial,
    advanced: normalizeAdvanced(partial.advanced)
  };
  return {
    ...resolved,
    oreDensity: clamp01(resolved.oreDensity),
    waterTable: clamp01(resolved.waterTable),
    temperature: clamp01(resolved.temperature),
    rainfall: clamp01(resolved.rainfall),
    mountains: clamp01(resolved.mountains),
    rivers100: clamp01(resolved.rivers100),
    lakes100: clamp01(resolved.lakes100)
  };
}

const STARTING_KITS = {
  easy: {
    people: 9,
    foodDays: 7,
    firewoodDays: 7,
    tools: {
      'stone hand axe': 1,
      'stone knife': 1,
      bow: 1,
      'wooden arrow': 10,
      'wooden shovel': 1,
      'wooden hammer': 1
    }
  },
  normal: {
    people: 7,
    foodDays: 3,
    firewoodDays: 3,
    tools: {
      'stone hand axe': 1,
      'stone knife': 1
    }
  },
  hard: {
    people: 5,
    foodDays: 0,
    firewoodDays: 0,
    tools: {}
  }
};

const SCORE_WEIGHTS = {
  // Weight tuning: negative values ease play, positive values increase challenge.
  oreDensity: -8,
  waterTable: -6,
  temperature: -5,
  rainfall: -4,
  mountains: 7,
  rivers100: -3,
  lakes100: -2,
  advanced: {
    // Fine-tune bias so custom tweaks can slightly shift score without dominating.
    elevationVariance: 3,
    elevationScale: 2,
    vegetationScale: -1,
    oreNoiseScale: 2,
    oreThresholdOffset: -3,
    waterGuaranteeRadius: -2,
    waterFlowMultiplier: -2
  }
};

export function difficultyScore(parameters = {}) {
  const resolved = resolveWorldParameters(parameters);
  let score = 50;

  const apply = (value, weight) => {
    const centered = (value - 50) / 50; // Normalise to -1..1 around median settings.
    score += centered * weight;
  };

  apply(resolved.oreDensity, SCORE_WEIGHTS.oreDensity);
  apply(resolved.waterTable, SCORE_WEIGHTS.waterTable);
  apply(resolved.temperature, SCORE_WEIGHTS.temperature);
  apply(resolved.rainfall, SCORE_WEIGHTS.rainfall);
  apply(resolved.mountains, SCORE_WEIGHTS.mountains);
  apply(resolved.rivers100, SCORE_WEIGHTS.rivers100);
  apply(resolved.lakes100, SCORE_WEIGHTS.lakes100);

  const advWeights = SCORE_WEIGHTS.advanced;
  Object.entries(advWeights).forEach(([key, weight]) => {
    if (key in resolved.advanced) {
      apply(resolved.advanced[key], weight);
    }
  });

  return Math.round(Math.min(100, Math.max(1, score)));
}

function withWorld(startKey, worldOverrides = {}) {
  const startSource = STARTING_KITS[startKey] || STARTING_KITS.normal;
  const start = {
    ...startSource,
    tools: { ...startSource.tools }
  };
  return {
    start,
    world: resolveWorldParameters(worldOverrides)
  };
}

export const difficultySettings = {
  easy: withWorld('easy', {
    oreDensity: 78,
    waterTable: 70,
    temperature: 65,
    rainfall: 62,
    mountains: 35,
    rivers100: 72,
    lakes100: 68,
    advanced: {
      vegetationScale: 62,
      oreThresholdOffset: 68,
      waterGuaranteeRadius: 70,
      waterFlowMultiplier: 45
    }
  }),
  normal: withWorld('normal', {
    oreDensity: 55,
    waterTable: 50,
    temperature: 50,
    rainfall: 50,
    mountains: 50,
    rivers100: 45,
    lakes100: 35
  }),
  hard: withWorld('hard', {
    oreDensity: 38,
    waterTable: 40,
    temperature: 42,
    rainfall: 38,
    mountains: 68,
    rivers100: 32,
    lakes100: 28,
    advanced: {
      elevationVariance: 68,
      elevationScale: 64,
      oreNoiseScale: 62,
      oreThresholdOffset: 38,
      waterGuaranteeRadius: 32,
      waterFlowMultiplier: 62
    }
  }),
  custom: withWorld('normal')
};

export function getDifficultyPreset(id = 'normal') {
  return difficultySettings[id] || difficultySettings.normal;
}
