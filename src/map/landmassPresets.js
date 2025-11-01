export const LANDMASS_PRESETS = Object.freeze({
  continent: {
    maskStrength: 0.55,
    maskBias: 0,
    worldScaleFactor: 1.2,
    waterCoverageTarget: 0.32,
    minOceanFraction: 0.02,
    openLandBias: 0
  },
  island: {
    maskStrength: 0.82,
    maskBias: -0.06,
    worldScaleFactor: 0.9,
    waterCoverageTarget: 0.5,
    minOceanFraction: 0.14,
    openLandBias: -0.1
  },
  archipelago: {
    maskStrength: 0.68,
    maskBias: -0.04,
    worldScaleFactor: 0.95,
    waterCoverageTarget: 0.42,
    minOceanFraction: 0.1,
    openLandBias: -0.06
  },
  coastal: {
    maskStrength: 0.5,
    maskBias: -0.01,
    worldScaleFactor: 1.15,
    waterCoverageTarget: 0.35,
    minOceanFraction: 0.05,
    openLandBias: -0.02
  },
  pangea: {
    maskStrength: 0.38,
    maskBias: 0.08,
    worldScaleFactor: 1.45,
    waterCoverageTarget: 0.24,
    minOceanFraction: 0.02,
    openLandBias: 0.08
  },
  inland: {
    maskStrength: 0.34,
    maskBias: 0.1,
    worldScaleFactor: 1.35,
    waterCoverageTarget: 0.26,
    minOceanFraction: 0.02,
    openLandBias: 0.06
  }
});

export const DEFAULT_LANDMASS_TYPE = 'continent';

export function resolveLandmassPreset(type) {
  if (!type) {
    return LANDMASS_PRESETS[DEFAULT_LANDMASS_TYPE];
  }
  return LANDMASS_PRESETS[type] || LANDMASS_PRESETS[DEFAULT_LANDMASS_TYPE];
}
