export const difficulties = [
  { id: 'easy', name: 'Easy' },
  { id: 'normal', name: 'Medium' },
  { id: 'hard', name: 'Hard' }
];

export const difficultySettings = {
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
