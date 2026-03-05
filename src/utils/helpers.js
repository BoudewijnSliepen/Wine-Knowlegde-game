// ═══════════════════════════════════════════════
// Utility Functions
// ═══════════════════════════════════════════════

export function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Shuffle answer options for a quiz question (study card / comparison) */
export function shuffleQuiz(quiz) {
  if (!quiz) return quiz;
  const indices = quiz.o.map((_, i) => i);
  for (let i = indices.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [indices[i], indices[j]] = [indices[j], indices[i]];
  }
  return { q: quiz.q, o: indices.map(i => quiz.o[i]), a: indices.indexOf(quiz.a) };
}

/** Shuffle answer options for a full QUESTIONS-style object (preserves id, cat, exp, etc.) */
export function shuffleQOptions(q) {
  const indices = q.o.map((_, i) => i);
  for (let i = indices.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [indices[i], indices[j]] = [indices[j], indices[i]];
  }
  return { ...q, o: indices.map(i => q.o[i]), a: indices.indexOf(q.a) };
}

export function getRank(pts, RANKS) {
  let r = RANKS[0];
  for (const rank of RANKS) { if (pts >= rank.min) r = rank; }
  return r;
}

export function getNextRank(pts, RANKS) {
  for (const rank of RANKS) { if (pts < rank.min) return rank; }
  return null;
}

export function daysUntilExam() {
  const exam = new Date(2026, 2, 22);
  const now = new Date();
  return Math.max(0, Math.ceil((exam - now) / 86400000));
}

// ── localStorage persistence ────────────────────

export async function loadPlayer(name) {
  try { const r = localStorage.getItem("wset-player:" + name); return r ? JSON.parse(r) : null; }
  catch { return null; }
}

export async function savePlayer(data) {
  try { localStorage.setItem("wset-player:" + data.name, JSON.stringify(data)); }
  catch (e) { console.error("Save", e); }
}

export async function loadLeaderboard() {
  try { const r = localStorage.getItem("wset-leaderboard"); return r ? JSON.parse(r) : []; }
  catch { return []; }
}

export async function saveLeaderboard(lb) {
  try { localStorage.setItem("wset-leaderboard", JSON.stringify(lb)); }
  catch (e) { console.error("LB", e); }
}

export async function loadDailyStreak() {
  try { const r = localStorage.getItem("wset-daily-streak"); return r ? JSON.parse(r) : { count: 0, lastDate: null }; }
  catch { return { count: 0, lastDate: null }; }
}

export async function saveDailyStreak(data) {
  try { localStorage.setItem("wset-daily-streak", JSON.stringify(data)); }
  catch (e) { console.error("Daily save", e); }
}
