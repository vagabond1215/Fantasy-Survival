// @ts-nocheck
import store from './state.js';
import { PROFICIENCY_DEFINITIONS } from './proficiencies.js';
import { setPeople, refreshStats } from './people.js';

const SKILL_MAP = new Map(PROFICIENCY_DEFINITIONS.map(def => [def.id, def]));

const MALE_NAMES = [
  'Alden',
  'Bram',
  'Cedric',
  'Doran',
  'Eamon',
  'Gareth',
  'Hadrian',
  'Ivor',
  'Lysander',
  'Marek',
  'Niall',
  'Oren',
  'Percival',
  'Quentin',
  'Rowan',
  'Silas',
  'Theron',
  'Ulric',
  'Varek',
  'Wystan'
];

const FEMALE_NAMES = [
  'Aislin',
  'Bria',
  'Celes',
  'Daphne',
  'Elowen',
  'Fiora',
  'Gwyn',
  'Helena',
  'Isolde',
  'Junia',
  'Kaela',
  'Lira',
  'Mira',
  'Nerine',
  'Odette',
  'Petra',
  'Quilla',
  'Rhosyn',
  'Selene',
  'Thalia',
  'Vessa',
  'Wren'
];

const SURNAMES = [
  'Amberfall',
  'Blackbriar',
  'Coppervein',
  'Dawnbreak',
  'Eldercrest',
  'Frostmere',
  'Galehart',
  'Hawthorne',
  'Ironwood',
  'Lakeshore',
  'Moonridge',
  'Nightbloom',
  'Oakenshield',
  'Riversong',
  'Stormwatch',
  'Thornfield',
  'Umberlyn',
  'Valewind',
  'Wilderose',
  'Yarwick'
];

const SKILL_TALENT_BACKGROUND = {
  hunting: 'spent adolescence shadowing veteran hunters through the border woods',
  tracking: 'learned to read faint trails while running long scouting patrols',
  foraging: 'studied plant lore from a kindly travelling herbalist',
  gathering: 'knows how to comb the wilds for every loose branch or stone',
  fishing: 'worked the riverboats casting nets since childhood',
  agriculture: 'tended terraced fields with extended kin back home',
  herbalism: 'apprenticed under a village apothecary drying roots and leaves',
  woodcutting: 'was raised among timber camps and swung an axe before dawn each day',
  carpentry: 'served as a carpenter’s apprentice crafting beams and joints',
  masonry: 'helped raise keep walls from painstakingly cut stone',
  mining: 'hauled carts through narrow mines for many seasons',
  smelting: 'kept smoky bloomery furnaces stoked for a merchant caravan',
  smithing: 'apprenticed under a travelling blacksmith at a roaring forge',
  leatherworking: 'kept tannery vats bubbling and pliable back in town',
  weaving: 'learned the rhythm of the loom from a patient aunt',
  pottery: 'spent years at the wheel shaping clay for market stalls',
  crafting: 'keeps nimble hands busy fashioning useful trinkets',
  cooking: 'ran a crowded cookfire for a mercenary band',
  swimming: 'ferried messages by swimming swift rivers unassisted',
  construction: 'coordinated work crews to raise palisades and scaffolds',
  combat: 'trained relentlessly with the militia in formation drills'
};

const SKILL_DEFICIENCY_CAUSES = {
  hunting: 'has an aversion to gore and drawn-out chases',
  tracking: 'struggles to focus on faint signs in the underbrush',
  foraging: 'mixes up similar herbs unless closely guided',
  gathering: 'tires quickly hauling loose salvage',
  fishing: 'gets seasick even on placid waters',
  agriculture: 'suffers from pollen that blankets the spring fields',
  herbalism: 'sneezes constantly around drying herbs',
  woodcutting: 'worries about misjudging a tree’s fall',
  carpentry: 'fumbles with precise joinery and measurements',
  masonry: 'finds hefting stone exhausting after a short while',
  mining: 'feels uneasy deep underground',
  smelting: 'coughs in the heavy furnace smoke',
  smithing: 'wilts in the forge heat',
  leatherworking: 'never got used to the tannery stench',
  weaving: 'grows impatient at the loom',
  pottery: 'dislikes the feel of wet clay under their nails',
  crafting: 'prefers not to fuss with fine details',
  cooking: 'second-guesses seasoning and timing',
  swimming: 'still remembers nearly drowning as a child',
  construction: 'struggles with heights and scaffolding',
  combat: 'hesitates when blades are drawn'
};

const SKILL_INTEREST_PURSUITS = {
  hunting: 'keeps a journal of animal movements around camp',
  tracking: 'enjoys mapping the prints discovered near the settlement',
  foraging: 'collects unusual berries and edible roots for fun',
  fishing: 'mends nets and whittles floats during downtime',
  agriculture: 'experiments with seed rows in spare plots',
  herbalism: 'presses herbs into journals to study them later',
  carpentry: 'carves small keepsakes from leftover lumber',
  masonry: 'sketches arch designs on scrap parchment',
  smithing: 'tinkers with broken tools to see how they are made',
  cooking: 'tries new spice blends at the communal hearth',
  weaving: 'braids cordage into intricate patterns',
  pottery: 'shapes clay charms and beads to trade with others',
  leatherworking: 'crafts small pouches for friends and family',
  combat: 'keeps weapon drills sharp even after duties end'
};

const PRONOUNS = {
  male: { subject: 'He', object: 'him', possessive: 'his' },
  female: { subject: 'She', object: 'her', possessive: 'her' }
};

let personCounter = 1;

function createRng(seed) {
  if (seed === undefined || seed === null) {
    return Math.random;
  }
  let value = typeof seed === 'number' ? seed : 0;
  if (Number.isNaN(value)) {
    value = 0;
  }
  if (typeof seed === 'string') {
    for (let i = 0; i < seed.length; i++) {
      value = (value + seed.charCodeAt(i) * 13) >>> 0;
    }
  }
  value = (value || Date.now()) >>> 0;
  return function rng() {
    value += 0x6d2b79f5;
    let t = value;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function randomChoice(list, rng) {
  if (!Array.isArray(list) || !list.length) return null;
  const index = Math.floor(rng() * list.length) % list.length;
  return list[index];
}

function randomInt(rng, min, max) {
  const low = Math.ceil(min);
  const high = Math.floor(max);
  return Math.floor(rng() * (high - low + 1)) + low;
}

function pickName(sex, rng, pools) {
  const pool = sex === 'female' ? pools.female : pools.male;
  if (pool.available.length === 0) {
    pool.available = [...pool.source];
  }
  const index = Math.floor(rng() * pool.available.length);
  const [name] = pool.available.splice(index, 1);
  return name;
}

function joinWithAnd(names = []) {
  const filtered = names.filter(Boolean);
  if (!filtered.length) return '';
  if (filtered.length === 1) return filtered[0];
  if (filtered.length === 2) return `${filtered[0]} and ${filtered[1]}`;
  const head = filtered.slice(0, -1).join(', ');
  const tail = filtered[filtered.length - 1];
  return `${head}, and ${tail}`;
}

function getSkillName(id) {
  return SKILL_MAP.get(id)?.name || id;
}

function describeTalentReason(skillId) {
  return SKILL_TALENT_BACKGROUND[skillId] || `has a knack for ${getSkillName(skillId).toLowerCase()}`;
}

function describeDeficiencyReason(skillId) {
  return SKILL_DEFICIENCY_CAUSES[skillId] || `struggles with ${getSkillName(skillId).toLowerCase()}`;
}

function describeInterest(skillId) {
  return (
    SKILL_INTEREST_PURSUITS[skillId] ||
    `enjoys practising ${getSkillName(skillId).toLowerCase()} during quiet moments`
  );
}

function buildSkillProfile(rng) {
  const skillRatings = {};
  const skillIds = PROFICIENCY_DEFINITIONS.map(def => def.id);
  skillIds.forEach(id => {
    skillRatings[id] = 30 + Math.round(rng() * 20);
  });

  const available = [...skillIds];
  const pickUnique = (count, exclude = new Set()) => {
    const choices = available.filter(id => !exclude.has(id));
    const selected = [];
    for (let i = 0; i < count && choices.length; i++) {
      const index = Math.floor(rng() * choices.length);
      const [id] = choices.splice(index, 1);
      exclude.add(id);
      selected.push(id);
    }
    return selected;
  };

  const excluded = new Set();
  const talentIds = pickUnique(2, excluded);
  const deficiencyIds = pickUnique(1, excluded);

  talentIds.forEach(id => {
    skillRatings[id] = 70 + Math.round(rng() * 20);
  });
  deficiencyIds.forEach(id => {
    skillRatings[id] = 10 + Math.round(rng() * 12);
  });

  const interestIds = new Set(talentIds);
  if (rng() > 0.4) {
    const extraInterest = pickUnique(1, new Set([...excluded, ...interestIds]));
    extraInterest.forEach(id => interestIds.add(id));
  }

  const talents = talentIds.map(id => ({
    id,
    name: getSkillName(id),
    level: skillRatings[id],
    reason: describeTalentReason(id)
  }));
  const deficiencies = deficiencyIds.map(id => ({
    id,
    name: getSkillName(id),
    level: skillRatings[id],
    reason: describeDeficiencyReason(id)
  }));
  const interests = Array.from(interestIds)
    .filter(id => !deficiencyIds.includes(id))
    .map(id => ({ id, label: getSkillName(id), reason: describeInterest(id) }));

  return { skillRatings, talents, deficiencies, interests };
}

function createBasePerson({ sex, age, surname, householdId, rng }) {
  const pools = createBasePerson.namePools || {
    male: { available: [...MALE_NAMES], source: MALE_NAMES },
    female: { available: [...FEMALE_NAMES], source: FEMALE_NAMES }
  };
  createBasePerson.namePools = pools;
  const givenName = pickName(sex, rng, pools);
  const id = `pop-${String(personCounter++).padStart(3, '0')}`;
  const { skillRatings, talents, deficiencies, interests } = buildSkillProfile(rng);
  return {
    id,
    givenName,
    surname,
    name: `${givenName} ${surname}`,
    age,
    sex,
    householdId,
    relationships: [],
    family: [],
    interests,
    talents,
    deficiencies,
    skillRatings,
    backstory: '',
    job: null,
    assignment: null
  };
}

function linkRelationship(a, b, typeA, typeB) {
  if (!a.relationships.some(rel => rel.id === b.id && rel.relation === typeA)) {
    a.relationships.push({ id: b.id, relation: typeA });
  }
  if (!b.relationships.some(rel => rel.id === a.id && rel.relation === typeB)) {
    b.relationships.push({ id: a.id, relation: typeB });
  }
}

function summarizeChildren(children, byId) {
  if (!children.length) return '';
  const names = children
    .map(rel => byId.get(rel.id)?.givenName || byId.get(rel.id)?.name)
    .filter(Boolean);
  if (!names.length) return '';
  if (names.length === 1) {
    return names[0];
  }
  return `${names.length} children (${names.join(', ')})`;
}

function generateBackstories(people) {
  const byId = new Map(people.map(person => [person.id, person]));
  people.forEach(person => {
    const pronoun = PRONOUNS[person.sex] || { subject: 'They', object: 'them', possessive: 'their' };
    const spouseRel = person.relationships.find(rel => rel.relation === 'spouse');
    const parentRels = person.relationships.filter(rel => rel.relation === 'parent');
    const childRels = person.relationships.filter(rel => rel.relation === 'child');
    const spouseName = spouseRel ? byId.get(spouseRel.id)?.givenName || byId.get(spouseRel.id)?.name : null;
    const parentNames = parentRels
      .map(rel => byId.get(rel.id)?.givenName || byId.get(rel.id)?.name)
      .filter(Boolean);
    const childSummary = summarizeChildren(childRels, byId);
    const talent = person.talents[0];
    const deficiency = person.deficiencies[0];
    const interest = person.interests[0];

    const familyParts = [];
    if (parentNames.length) {
      familyParts.push(`grew up learning from ${joinWithAnd(parentNames)}`);
    }
    if (spouseName) {
      familyParts.push(`now shares a home with ${spouseName}`);
    }
    if (childSummary) {
      familyParts.push(`looks after ${childSummary}`);
    }
    if (!familyParts.length) {
      familyParts.push('carved out a life on the frontier with little help');
    }

    const talentSentence = talent
      ? `${pronoun.subject} ${talent.reason}, honing ${pronoun.possessive} ${talent.name.toLowerCase()} talents.`
      : `${pronoun.subject} applies a steady hand to any task at hand.`;
    const deficiencySentence = deficiency
      ? `However, ${pronoun.subject.toLowerCase()} ${deficiency.reason}, so ${pronoun.subject.toLowerCase()} prefers others handle ${deficiency.name.toLowerCase()} when possible.`
      : '';
    const interestSentence = interest
      ? `In quieter moments, ${pronoun.subject.toLowerCase()} ${interest.reason}.`
      : '';

    const summary = `${person.name} ${familyParts.join(' and ')}. ${talentSentence} ${deficiencySentence} ${interestSentence}`
      .replace(/\s+/g, ' ')
      .trim();
    person.backstory = summary;
    person.family = person.relationships.map(rel => ({ ...rel }));
  });
}

function generateHouseholds(size, rng) {
  const population = [];
  const households = [];
  const surnamePool = [...SURNAMES];
  const takeSurname = () => {
    if (!surnamePool.length) {
      surnamePool.push(...SURNAMES);
    }
    const index = Math.floor(rng() * surnamePool.length);
    return surnamePool.splice(index, 1)[0];
  };

  const coupleCount = Math.max(1, Math.min(Math.floor(size / 3), Math.floor(size / 2)));

  for (let i = 0; i < coupleCount && population.length + 2 <= size; i++) {
    const surname = takeSurname();
    const householdId = `household-${i + 1}`;
    const male = createBasePerson({ sex: 'male', age: randomInt(rng, 20, 45), surname, householdId, rng });
    const female = createBasePerson({ sex: 'female', age: randomInt(rng, 18, 42), surname, householdId, rng });
    households.push({ id: householdId, surname, adults: [male, female], children: [] });
    population.push(male, female);
  }

  let householdIndex = households.length;
  while (population.length < size) {
    const assignToFamily = households.length && rng() < 0.7;
    if (assignToFamily) {
      const home = households[Math.floor(rng() * households.length)];
      const sex = rng() < 0.5 ? 'male' : 'female';
      const age = randomInt(rng, 14, Math.min(22, 45));
      const child = createBasePerson({ sex, age, surname: home.surname, householdId: home.id, rng });
      home.children.push(child);
      population.push(child);
    } else {
      const surname = takeSurname();
      const householdId = `household-${++householdIndex}`;
      const sex = rng() < 0.5 ? 'male' : 'female';
      const age = randomInt(rng, 18, 45);
      const single = createBasePerson({ sex, age, surname, householdId, rng });
      households.push({ id: householdId, surname, adults: [single], children: [] });
      population.push(single);
    }
  }

  households.forEach(home => {
    if (home.adults.length >= 2) {
      const [a, b] = home.adults;
      linkRelationship(a, b, 'spouse', 'spouse');
    }
    home.children.forEach(child => {
      home.adults.forEach(parent => {
        linkRelationship(parent, child, 'parent', 'child');
      });
    });
  });

  return population;
}

export function initializePopulation(size, options = {}) {
  const populationSize = Math.max(1, Math.trunc(Number(size) || 0));
  const rng = createRng(options.seed);
  personCounter = 1;
  createBasePerson.namePools = {
    male: { available: [...MALE_NAMES], source: MALE_NAMES },
    female: { available: [...FEMALE_NAMES], source: FEMALE_NAMES }
  };
  const people = generateHouseholds(populationSize, rng);
  generateBackstories(people);
  setPeople(people);
  return people;
}

export function getPopulation() {
  if (!(store.people instanceof Map)) {
    return [];
  }
  return [...store.people.values()].map(person => ({ ...person }));
}

function evaluateJobFit(person, jobDefinition = {}) {
  const preferred = Array.isArray(jobDefinition.preferredSkills) && jobDefinition.preferredSkills.length
    ? jobDefinition.preferredSkills
    : [jobDefinition.id];
  let bestSkill = preferred[0];
  let bestScore = Number.MIN_SAFE_INTEGER;
  preferred.forEach(skillId => {
    const rating = Number(person.skillRatings?.[skillId]);
    if (Number.isFinite(rating) && rating > bestScore) {
      bestSkill = skillId;
      bestScore = rating;
    }
  });
  if (!Number.isFinite(bestScore)) {
    bestScore = Number(person.skillRatings?.[bestSkill]) || 0;
  }
  let score = bestScore;
  const hasTalent = (person.talents || []).some(talent => talent.id === bestSkill);
  const hasInterest = (person.interests || []).some(interest => interest.id === bestSkill);
  const hasDeficiency = (person.deficiencies || []).some(def => def.id === bestSkill);
  if (hasTalent) score += 7;
  if (hasInterest) score += 5;
  if (hasDeficiency) score -= 12;
  const experienceBonus = Math.min(6, Math.max(0, (person.age || 0) - 20) * 0.3);
  score = Math.max(0, score + experienceBonus);
  return { score, focusSkill: bestSkill };
}

export function syncJobAssignments(jobAssignments = {}, jobDefinitions = []) {
  if (!(store.people instanceof Map)) {
    store.people = new Map();
  }
  const definitions = Array.isArray(jobDefinitions) ? jobDefinitions : [];
  const summary = {};
  const adults = [];
  const assignedIds = new Set();

  store.people.forEach(person => {
    if (!person) return;
    person.job = null;
    if (person.assignment) {
      delete person.assignment;
    }
    if (!Array.isArray(person.relationships) && Array.isArray(person.family)) {
      person.relationships = [...person.family];
    }
    if ((person.age || 0) >= 16) {
      adults.push(person);
    }
  });

  definitions.forEach(def => {
    const desired = Math.max(0, Math.trunc(Number(jobAssignments?.[def.id] ?? 0)));
    if (!desired) {
      summary[def.id] = [];
      if (jobAssignments) jobAssignments[def.id] = 0;
      return;
    }
    const candidates = adults
      .filter(person => !assignedIds.has(person.id))
      .map(person => ({ person, ...evaluateJobFit(person, def) }))
      .sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        if (b.person.age !== a.person.age) return b.person.age - a.person.age;
        return a.person.name.localeCompare(b.person.name);
      });
    const selected = candidates.slice(0, desired);
    summary[def.id] = [];
    selected.forEach(entry => {
      const { person, score, focusSkill } = entry;
      person.job = def.id;
      person.assignment = {
        jobId: def.id,
        score,
        focusSkill
      };
      assignedIds.add(person.id);
      summary[def.id].push({
        id: person.id,
        name: person.name,
        age: person.age,
        sex: person.sex,
        score: Math.round(score * 10) / 10,
        focusSkill,
        focusSkillName: getSkillName(focusSkill)
      });
    });
    if (jobAssignments) {
      jobAssignments[def.id] = summary[def.id].length;
    }
  });

  store.people.forEach((person, id) => {
    const relationships = Array.isArray(person.relationships)
      ? person.relationships
      : Array.isArray(person.family)
        ? [...person.family]
        : [];
    store.people.set(id, {
      ...person,
      relationships,
      family: relationships,
      assignment: person.job ? person.assignment : null
    });
  });

  refreshStats();
  return summary;
}

export function getJobAssignmentsSummary() {
  if (!(store.people instanceof Map)) return {};
  const summary = {};
  store.people.forEach(person => {
    if (!person?.job) return;
    if (!summary[person.job]) {
      summary[person.job] = [];
    }
    const assignment = person.assignment || {};
    summary[person.job].push({
      id: person.id,
      name: person.name,
      age: person.age,
      sex: person.sex,
      score: assignment.score != null ? Math.round(assignment.score * 10) / 10 : null,
      focusSkill: assignment.focusSkill || null,
      focusSkillName: assignment.focusSkill ? getSkillName(assignment.focusSkill) : null
    });
  });
  Object.values(summary).forEach(list => {
    list.sort((a, b) => {
      const scoreA = a.score ?? 0;
      const scoreB = b.score ?? 0;
      if (scoreB !== scoreA) return scoreB - scoreA;
      return a.name.localeCompare(b.name);
    });
  });
  return summary;
}

export function getLaborerList() {
  if (!(store.people instanceof Map)) return [];
  const laborers = [];
  store.people.forEach(person => {
    if (!person?.job && (person.age || 0) >= 16) {
      laborers.push({
        id: person.id,
        name: person.name,
        age: person.age,
        sex: person.sex
      });
    }
  });
  return laborers;
}
