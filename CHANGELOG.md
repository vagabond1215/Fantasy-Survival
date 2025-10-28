# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]
### Added
- Redesigned Game Creation flow with step-by-step progress, difficulty customization,
  and advanced world-generation parameters.
- Build tooling based on Vite with scripts for development, builds, linting, formatting, testing, type-checking, and link verification.
- TypeScript configuration for JavaScript projects with `// @ts-check` enabled in browser and Node entry points.
- Repository standards files: `.editorconfig`, `CONTRIBUTING.md`, and `CHANGELOG.md`.
- Continuous integration workflow that runs linting, tests, and type-checking.
- Hydrology modules for elevation, water rules, and flow simulation powering rivers, lakes, wetlands, and coastal shaping with automated coverage tests.
- Deterministic world-generation solver with reusable parameter utilities, curated habitat profiles, and a `buildWorld` entry point for downstream systems.
- Shared random helpers that unify seeding across map generation and world building.
- Vitest coverage for the world-generation pipeline to guard deterministic outputs and profile selection.

### Changed
- Map generation now consumes the hydrology pipeline for water placement, with biome-aware marshes, widened river mouths, and richer terrain symbols.
- Difficulty settings expose a water-flow multiplier slider that feeds new hydrology thresholds in both the UI and presets.
- Landing map legend now opens from a floating help toggle with an accessible overlay, improving focus handling on the preview map.
