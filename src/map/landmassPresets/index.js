const modules = import.meta.glob('./*.js', { eager: true, import: 'default' });

const entries = Object.entries(modules)
  .filter(([path]) => !path.endsWith('/index.js'))
  .map(([path, config]) => {
    const match = path.match(/\.\/(.+)\.js$/);
    const name = match ? match[1] : path;
    const normalized = config && typeof config === 'object' ? config : {};
    return [name, Object.freeze({ ...normalized })];
  })
  .sort(([a], [b]) => a.localeCompare(b));

export const LANDMASS_PRESETS = Object.freeze(
  entries.reduce((acc, [key, value]) => {
    acc[key] = value;
    return acc;
  }, {})
);

export const DEFAULT_LANDMASS_TYPE = 'continent';

export function resolveLandmassPreset(type) {
  if (!type || typeof type !== 'string') {
    return LANDMASS_PRESETS[DEFAULT_LANDMASS_TYPE];
  }

  return (
    LANDMASS_PRESETS[type] || LANDMASS_PRESETS[DEFAULT_LANDMASS_TYPE]
  );
}
