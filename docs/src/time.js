import store from './state.js';
import { applyJobProductivity, resetDailyJobProgress } from './jobProductivity.js';

export const DAYS_PER_MONTH = 28;
export const HOURS_PER_DAY = 24;
const DAWN_HOUR = 6;

export const DARK_AGE_YEAR_RANGE = { min: 410, max: 987 };

export function randomDarkAgeYear() {
  const span = DARK_AGE_YEAR_RANGE.max - DARK_AGE_YEAR_RANGE.min + 1;
  return DARK_AGE_YEAR_RANGE.min + Math.floor(Math.random() * span);
}

const MONTH_DEFINITIONS = [
  { name: 'Frostmelt', season: 'Thawbound' },
  { name: 'Dawnforge', season: 'Thawbound' },
  { name: 'Seedwane', season: 'Thawbound' },
  { name: 'Raincall', season: 'Sunheight' },
  { name: 'Suncrest', season: 'Sunheight' },
  { name: 'Highember', season: 'Sunheight' },
  { name: 'Harvestgale', season: 'Emberwane' },
  { name: 'Emberfall', season: 'Emberwane' },
  { name: 'Gloamreach', season: 'Emberwane' },
  { name: 'Stormwrack', season: 'Frostshroud' },
  { name: 'Nightveil', season: 'Frostshroud' },
  { name: 'Deepfrost', season: 'Frostshroud' },
  { name: 'Ghostmoon', season: 'Frostshroud' }
];

export const MONTHS_PER_YEAR = MONTH_DEFINITIONS.length;
export const MONTH_NAMES = MONTH_DEFINITIONS.map(def => def.name);

const SEASON_DETAILS = {
  Thawbound: { icon: '🌿', months: [] },
  Sunheight: { icon: '🔥', months: [] },
  Emberwane: { icon: '🍂', months: [] },
  Frostshroud: { icon: '❄️', months: [] }
};

MONTH_DEFINITIONS.forEach((definition, index) => {
  const season = SEASON_DETAILS[definition.season];
  if (season) {
    season.months.push(index + 1);
  }
});

Object.values(SEASON_DETAILS).forEach(details => {
  details.months.sort((a, b) => a - b);
});

const WEATHER_PATTERNS = [
  { name: 'Clear', icon: '☀️', weights: { Thawbound: 3, Sunheight: 4, Emberwane: 3, Frostshroud: 2 } },
  { name: 'Cloudy', icon: '☁️', weights: { Thawbound: 2, Sunheight: 2, Emberwane: 3, Frostshroud: 3 } },
  { name: 'Rain', icon: '🌧️', weights: { Thawbound: 3, Sunheight: 3, Emberwane: 2, Frostshroud: 1 } },
  { name: 'Storm', icon: '⛈️', weights: { Thawbound: 1, Sunheight: 2, Emberwane: 1, Frostshroud: 1 } },
  { name: 'Snow', icon: '❄️', weights: { Thawbound: 0, Sunheight: 0, Emberwane: 1, Frostshroud: 4 } },
  { name: 'Fog', icon: '🌫️', weights: { Thawbound: 1, Sunheight: 1, Emberwane: 2, Frostshroud: 2 } }
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
  if (!Number.isFinite(store.time.month)) {
    store.time.month = 1;
  } else if (store.time.month < 1) {
    store.time.month = 1;
  } else if (store.time.month > MONTHS_PER_YEAR) {
    store.time.month = ((Math.floor(store.time.month) - 1) % MONTHS_PER_YEAR) + 1;
  }
  if (!Number.isFinite(store.time.year) || store.time.year < DARK_AGE_YEAR_RANGE.min) {
    store.time.year = DARK_AGE_YEAR_RANGE.min;
  } else {
    store.time.year = Math.floor(store.time.year);
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

function getDayStampFromTime(time = ensureTimeStructure()) {
  const year = Number.isFinite(time.year) ? Math.floor(time.year) : 0;
  const month = Number.isFinite(time.month) ? Math.floor(time.month) : 1;
  const day = Number.isFinite(time.day) ? Math.floor(time.day) : 1;
  const monthIndex = ((month - 1) % MONTHS_PER_YEAR + MONTHS_PER_YEAR) % MONTHS_PER_YEAR;
  return year * MONTHS_PER_YEAR * DAYS_PER_MONTH + monthIndex * DAYS_PER_MONTH + (day - 1);
}

export function getSeasonForMonth(month = 1) {
  const base = Number.isFinite(month) ? Math.floor(month) : 1;
  const normalized = ((base - 1) % MONTHS_PER_YEAR + MONTHS_PER_YEAR) % MONTHS_PER_YEAR;
  return MONTH_DEFINITIONS[normalized]?.season || Object.keys(SEASON_DETAILS)[0];
}

export function getMonthName(month = 1) {
  const base = Number.isFinite(month) ? Math.floor(month) : 1;
  const normalized = ((base - 1) % MONTHS_PER_YEAR + MONTHS_PER_YEAR) % MONTHS_PER_YEAR;
  return MONTH_DEFINITIONS[normalized]?.name || MONTH_NAMES[0];
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
  if (increment <= 0) return;
  resetDailyJobProgress(getDayStampFromTime(time));
  let remaining = increment;
  while (remaining > 0) {
    const dayStamp = getDayStampFromTime(time);
    const hoursUntilMidnight = HOURS_PER_DAY - time.hour;
    const step = Math.min(remaining, hoursUntilMidnight);
    if (step > 0) {
      applyJobProductivity(step, { dayStamp });
      time.hour += step;
      remaining -= step;
    } else {
      // Safeguard against floating point rounding issues.
      time.hour += remaining;
      remaining = 0;
    }
    if (time.hour >= HOURS_PER_DAY - 1e-9) {
      time.hour -= HOURS_PER_DAY;
      advanceDay();
      resetDailyJobProgress(getDayStampFromTime(time));
    }
  }
}

export function info() {
  const time = ensureTimeStructure();
  return { ...time, monthName: getMonthName(time.month) };
}

export function toAbsoluteHours(time = {}) {
  const base = info();
  const year = Number.isFinite(time.year) ? Math.floor(time.year) : base.year;
  const month = Number.isFinite(time.month) ? Math.floor(time.month) : base.month;
  const day = Number.isFinite(time.day) ? Math.floor(time.day) : base.day;
  const hour = Number.isFinite(time.hour) ? Number(time.hour) : base.hour;
  const normalizedMonth = ((month - 1) % MONTHS_PER_YEAR + MONTHS_PER_YEAR) % MONTHS_PER_YEAR;
  const normalizedDay = Math.max(1, day);
  const totalMonths = year * MONTHS_PER_YEAR + normalizedMonth;
  const totalDays = totalMonths * DAYS_PER_MONTH + (normalizedDay - 1);
  return totalDays * HOURS_PER_DAY + hour;
}

export function getCurrentAbsoluteHours() {
  return toAbsoluteHours(info());
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
