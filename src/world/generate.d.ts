import type { WorldTileData } from './types';
import type { CanonicalSeed } from './seed.js';
declare const TemperatureBandLabels: readonly ["frigid", "cold", "cool", "mild", "warm", "hot"];
export declare const TemperatureBandCode: {
    readonly Frigid: 0;
    readonly Cold: 1;
    readonly Cool: 2;
    readonly Mild: 3;
    readonly Warm: 4;
    readonly Hot: 5;
};
export type TemperatureBandCode = typeof TemperatureBandCode[keyof typeof TemperatureBandCode];
export type TemperatureBandLabel = (typeof TemperatureBandLabels)[number];
declare const MoistureBandLabels: readonly ["arid", "semi-arid", "moderate", "humid", "wet"];
export declare const MoistureBandCode: {
    readonly Arid: 0;
    readonly SemiArid: 1;
    readonly Moderate: 2;
    readonly Humid: 3;
    readonly Wet: 4;
};
export type MoistureBandCode = typeof MoistureBandCode[keyof typeof MoistureBandCode];
export type MoistureBandLabel = (typeof MoistureBandLabels)[number];
declare const RunoffLevelLabels: readonly ["minimal", "seasonal", "perennial"];
export declare const RunoffLevelCode: {
    readonly Minimal: 0;
    readonly Seasonal: 1;
    readonly Perennial: 2;
};
export type RunoffLevelCode = typeof RunoffLevelCode[keyof typeof RunoffLevelCode];
export type RunoffLevelLabel = (typeof RunoffLevelLabels)[number];
declare const BiomeIds: readonly ["mountain-alpine", "mountain-cloudforest", "wetland-floodplain", "coastal-mangrove", "temperate-coastal-rainforest", "equatorial-rainforest", "tropical-monsoon-forest", "tropical-savanna", "mediterranean-scrub", "temperate-maritime", "temperate-broadleaf", "boreal-conifer"];
export declare const BiomeCode: {
    readonly MountainAlpine: 0;
    readonly MountainCloudforest: 1;
    readonly WetlandFloodplain: 2;
    readonly CoastalMangrove: 3;
    readonly TemperateCoastalRainforest: 4;
    readonly EquatorialRainforest: 5;
    readonly TropicalMonsoonForest: 6;
    readonly TropicalSavanna: 7;
    readonly MediterraneanScrub: 8;
    readonly TemperateMaritime: 9;
    readonly TemperateBroadleaf: 10;
    readonly BorealConifer: 11;
};
export type BiomeCode = typeof BiomeCode[keyof typeof BiomeCode];
export type BiomeId = (typeof BiomeIds)[number];
export declare function biomeCodeToId(code: BiomeCode): BiomeId;
export declare function biomeIdToCode(id: string): BiomeCode;
type GenerationTuning = {
    readonly elevationBias?: number;
    readonly temperatureBias?: number;
    readonly moistureBias?: number;
    readonly spawnSuggestionCount?: number;
};
export type WorldParams = {
    readonly width: number;
    readonly height: number;
    readonly seed?: CanonicalSeed;
    readonly seedString?: string;
    readonly params?: GenerationTuning;
};
type GenerationConfig = {
    readonly width: number;
    readonly height: number;
    readonly elevationBias: number;
    readonly temperatureBias: number;
    readonly moistureBias: number;
    readonly spawnSuggestionCount: number;
};
export type WorldArtifact = {
    readonly seed: CanonicalSeed;
    readonly params: Readonly<GenerationConfig>;
    readonly dimensions: Readonly<{
        width: number;
        height: number;
        size: number;
    }>;
    readonly layers: Readonly<{
        elevation: Float32Array;
        temperature: Float32Array;
        moisture: Float32Array;
        runoff: Float32Array;
        biome: Uint8Array;
        ore: Float32Array;
        stone: Float32Array;
        water: Float32Array;
        fertility: Float32Array;
    }>;
    readonly tiles: readonly WorldTileData[];
    readonly spawnSuggestions: Uint32Array;
};
export declare function generateWorld(params: WorldParams): Promise<WorldArtifact>;
export {};
