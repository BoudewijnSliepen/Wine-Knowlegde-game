// ═══════════════════════════════════════════════
// AI Opponent — "The Sommelier Bot"
// ═══════════════════════════════════════════════
// Client-side AI that simulates a human opponent.
// Picks correct answer X% of the time based on level.
// Adds realistic "thinking" delay so it feels human.

export const AI_LEVELS = [
  { id: 'novice',       name: 'Novice',           pct: 35,  emoji: '🍇', thinkRange: [8, 25] },
  { id: 'enthusiast',   name: 'Enthusiast',        pct: 55,  emoji: '🍷', thinkRange: [5, 18] },
  { id: 'student',      name: 'WSET Student',      pct: 70,  emoji: '📖', thinkRange: [4, 14] },
  { id: 'sommelier',    name: 'Sommelier',         pct: 85,  emoji: '🥂', thinkRange: [3, 10] },
  { id: 'master',       name: 'Master of Wine',    pct: 95,  emoji: '👑', thinkRange: [2, 7]  },
];

export function getAILevel(id) {
  return AI_LEVELS.find(l => l.id === id) || AI_LEVELS[2];
}

/**
 * Simulate AI answering a question.
 * @param {object} question - { a: correctIndex, o: [...options] }
 * @param {string} levelId - AI difficulty level
 * @returns {Promise<{ answer: number, thinkTime: number }>}
 */
export function aiAnswer(question, levelId) {
  const level = getAILevel(levelId);
  const correct = Math.random() * 100 < level.pct;
  const [minThink, maxThink] = level.thinkRange;
  const thinkTime = minThink + Math.random() * (maxThink - minThink);

  let answer;
  if (correct) {
    answer = question.a;
  } else {
    // Pick a random wrong answer
    const wrongOptions = question.o
      .map((_, i) => i)
      .filter(i => i !== question.a);
    answer = wrongOptions[Math.floor(Math.random() * wrongOptions.length)];
  }

  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({ answer, thinkTime: Math.round(thinkTime) });
    }, thinkTime * 1000);
  });
}
