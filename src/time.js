import store from './state.js';

export const DAYS_PER_MONTH = 28;
export const MONTHS_PER_YEAR = 13;
const HOURS_PER_DAY = 24;
const DAWN_HOUR = 6;

const SEASON_DETAILS = {
  Spring: { icon: '🌱', months: [1, 2, 3] },
  Summer: { icon: '☀️', months: [4, 5, 6] },
  Autumn: { icon: '🍂', months: [7, 8, 9] },
  Winter: { icon: '❄️', months: [10, 11, 12, 13] }
};

const WEATHER_PATTERNS = [
  { name: 'Clear', icon: '☀️', weights: { Spring: 3, Summer: 4, Autumn: 3, Winter: 2 } },
  { name: 'Cloudy', icon: '☁️', weights: { Spring: 2, Summer: 2, Autumn: 3, Winter: 3 } },
  { name: 'Rain', icon: '🌧️', weights: { Spring: 3, Summer: 3, Autumn: 2, Winter: 1 } },
  { name: 'Storm', icon: '⛈️', weights: { Spring: 1, Summer: 2, Autumn: 1, Winter: 1 } },
  { name: 'Snow', icon: '❄️', weights: { Spring: 0, Summer: 0, Autumn: 1, Winter: 4 } },
  { name: 'Fog', icon: '🌫️', weights: { Spring: 1, Summer: 1, Autumn: 2, Winter: 2 } }
];

const DAY_PERIODS = [
  { key: 'night', label: 'Night', icon: '🌙', start: 0, end: 4 },
  { key: 'dawn', label: 'Dawn', icon: '🌅', start: 4, end: 7 },
  { key: 'day', label: 'Day', icon: '☀️', start: 7, end: 18 },
  { key: 'dusk', label: 'Dusk', icon: '🌇', start: 18, end: 21 },
  { key: 'night', label: 'Night', icon: '🌙', start: 21, end: 24 }
];

function normalizeHour(hour = 0) {
  const normalized = Number.isFinite(hour) ? hour : 0;
  return ((normalized % HOURS_PER_DAY) + HOURS_PER_DAY) % HOURS_PER_DAY;
}

function ensureTimeStructure() {
  if (!store.time) {
    store.time = {};
  }
  if (!Number.isFinite(store.time.day) || store.time.day < 1) {
    store.time.day = 1;
  }
  if (!Number.isFinite(store.time.month) || store.time.month < 1) {
    store.time.month = 1;
  }
  if (!Number.isFinite(store.time.year) || store.time.year < 1) {
    store.time.year = 1;
  }
  if (!Number.isFinite(store.time.hour)) {
    store.time.hour = DAWN_HOUR;
  }
  store.time.season = getSeasonForMonth(store.time.month);
  if (!store.time.weather) {
    store.time.weather = 'Clear';
  }
  return store.time;
}

export function getSeasonForMonth(month = 1) {
  const base = Number.isFinite(month) ? Math.floor(month) : 1;
  const normalized = ((base - 1) % MONTHS_PER_YEAR + MONTHS_PER_YEAR) % MONTHS_PER_YEAR + 1;
  return (
    Object.entries(SEASON_DETAILS).find(([, details]) => details.months.includes(normalized))?.[0] || 'Spring'
  );
}

function chooseWeather(season, previous) {
  const options = WEATHER_PATTERNS.map(pattern => ({
    name: pattern.name,
    icon: pattern.icon,
    weight: pattern.weights?.[season] ?? 0
  })).filter(option => option.weight > 0);

  if (!options.length) {
    return previous || 'Clear';
  }

  if (previous) {
    const prior = options.find(option => option.name === previous);
    if (prior) {
      prior.weight += 1.5;
    }
  }

  const totalWeight = options.reduce((sum, option) => sum + option.weight, 0);
  if (totalWeight <= 0) {
    return previous || options[0].name;
  }

  let roll = Math.random() * totalWeight;
  for (const option of options) {
    roll -= option.weight;
    if (roll <= 0) {
      return option.name;
    }
  }

  return options[options.length - 1].name;
}

export function getSeasonDetails(season) {
  const name = season || 'Unknown';
  const details = SEASON_DETAILS[name];
  if (!details) {
    return { name, icon: '❔', months: [] };
  }
  return { name, icon: details.icon, months: [...details.months] };
}

export function getWeatherDetails(condition) {
  const entry = WEATHER_PATTERNS.find(pattern => pattern.name === condition);
  if (!entry) {
    return { name: condition || 'Unknown', icon: '❔' };
  }
  return { name: entry.name, icon: entry.icon };
}

export function getDayPeriod(hour = store.time?.hour) {
  const normalized = normalizeHour(hour);
  const period = DAY_PERIODS.find(p => normalized >= p.start && normalized < p.end) || DAY_PERIODS[0];
  return { key: period.key, label: period.label, icon: period.icon, start: period.start, end: period.end };
}

export function advanceDay() {
  const time = ensureTimeStructure();
  time.day += 1;
  if (time.day > DAYS_PER_MONTH) {
    time.day = 1;
    time.month += 1;
    if (time.month > MONTHS_PER_YEAR) {
      time.month = 1;
      time.year += 1;
    }
  }
  time.season = getSeasonForMonth(time.month);
  time.weather = chooseWeather(time.season, time.weather);
}

export function advanceHours(hours = 1) {
  const time = ensureTimeStructure();
  const increment = Math.max(0, Number.isFinite(hours) ? hours : 0);
  time.hour += increment;
  while (time.hour >= HOURS_PER_DAY) {
    time.hour -= HOURS_PER_DAY;
    advanceDay();
  }
}

export function info() {
  const time = ensureTimeStructure();
  return { ...time };
}

export { info as timeInfo };

export function resetToDawn() {
  const time = ensureTimeStructure();
  time.hour = DAWN_HOUR;
}

export function isMealTime() {
  const time = ensureTimeStructure();
  return Math.floor(normalizeHour(time.hour)) === 12;
}

export function isNightfall() {
  const time = ensureTimeStructure();
  return normalizeHour(time.hour) >= 20;
}
