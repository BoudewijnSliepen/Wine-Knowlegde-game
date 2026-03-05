// ═══════════════════════════════════════════════
// Firebase Configuration
// ═══════════════════════════════════════════════
//
// SETUP INSTRUCTIONS:
// 1. Go to https://console.firebase.google.com
// 2. Click "Add project" → name it "wset-quiz" → disable Google Analytics (optional)
// 3. In the project dashboard, click the web icon </> to add a web app
// 4. Copy the firebaseConfig object and paste it below
// 5. Go to "Build" → "Realtime Database" → "Create Database"
//    - Choose your region (europe-west1 recommended)
//    - Start in "locked mode" (we'll add rules below)
// 6. Go to "Realtime Database" → "Rules" tab and paste:
//
//    {
//      "rules": {
//        "rooms": {
//          "$roomId": {
//            // Anyone can read room metadata (to join)
//            ".read": true,
//            // Only allow creating new rooms, not overwriting
//            ".write": true,
//            "players": {
//              "$playerId": {
//                ".write": true
//              }
//            },
//            "answers": {
//              "$playerId": {
//                // Can only write your own answer
//                ".write": true,
//                // Can only READ if both players have answered OR timer expired
//                ".read": "data.parent().child('p1').exists() && data.parent().child('p2').exists() || data.parent().parent().child('revealed').val() === true"
//              }
//            },
//            "currentQ": { ".write": true },
//            "revealed": { ".write": true },
//            "ready": { ".write": true },
//            "status": { ".write": true }
//          }
//        }
//      }
//    }
//
// ═══════════════════════════════════════════════

import { initializeApp } from 'firebase/app';
import { getDatabase, ref, set, get, push, onValue, remove, update, onDisconnect } from 'firebase/database';

// ⬇️ PASTE YOUR FIREBASE CONFIG HERE ⬇️
const firebaseConfig = {
  apiKey: "AIzaSyAMVv3cPAqiom-Ikkny8xqDbS0zOSH-8pg",
  authDomain: "wset-quiz.firebaseapp.com",
  databaseURL: "https://wset-quiz-default-rtdb.firebaseio.com",
  projectId: "wset-quiz",
  storageBucket: "wset-quiz.firebasestorage.app",
  messagingSenderId: "658105767563",
  appId: "1:658105767563:web:0900040c71cdce27a1668e"
};
// ⬆️ PASTE YOUR FIREBASE CONFIG HERE ⬆️

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

// ── Room Management ─────────────────────────────

function generateRoomCode() {
  return Math.floor(1000 + Math.random() * 9000).toString();
}

export async function createRoom(playerName) {
  let code = generateRoomCode();
  // Ensure unique code
  let attempts = 0;
  while (attempts < 10) {
    const snapshot = await get(ref(db, `rooms/${code}`));
    if (!snapshot.exists()) break;
    code = generateRoomCode();
    attempts++;
  }

  const roomRef = ref(db, `rooms/${code}`);
  await set(roomRef, {
    host: playerName,
    status: 'waiting',       // waiting | playing | finished
    currentQ: 0,
    revealed: false,
    createdAt: Date.now(),
    players: {
      p1: { name: playerName, score: 0, ready: false }
    },
    answers: {},
    ready: { p1: false, p2: false },
  });

  // Clean up room if host disconnects during waiting
  onDisconnect(ref(db, `rooms/${code}/status`)).set('abandoned');

  return { code, playerId: 'p1' };
}

export async function joinRoom(code, playerName) {
  const roomRef = ref(db, `rooms/${code}`);
  const snapshot = await get(roomRef);

  if (!snapshot.exists()) throw new Error('Room not found');

  const room = snapshot.val();
  if (room.status !== 'waiting') throw new Error('Game already in progress');
  if (room.players?.p2) throw new Error('Room is full');

  await update(ref(db, `rooms/${code}/players`), {
    p2: { name: playerName, score: 0, ready: false }
  });

  await update(ref(db, `rooms/${code}`), {
    status: 'playing'
  });

  return { code, playerId: 'p2' };
}

export function subscribeToRoom(code, callback) {
  const roomRef = ref(db, `rooms/${code}`);
  return onValue(roomRef, (snapshot) => {
    callback(snapshot.val());
  });
}

export async function submitAnswer(code, playerId, questionIdx, answerIdx, timeLeft) {
  await set(ref(db, `rooms/${code}/answers/${playerId}`), {
    qi: questionIdx,
    answer: answerIdx,
    timeLeft: timeLeft,
    submittedAt: Date.now()
  });
}

export async function revealAnswers(code) {
  await update(ref(db, `rooms/${code}`), { revealed: true });
}

export async function setReady(code, playerId, ready) {
  await set(ref(db, `rooms/${code}/ready/${playerId}`), ready);
}

export async function advanceQuestion(code, nextQ) {
  await update(ref(db, `rooms/${code}`), {
    currentQ: nextQ,
    revealed: false,
    answers: {},
    ready: { p1: false, p2: false }
  });
}

export async function updatePlayerScore(code, playerId, score) {
  await set(ref(db, `rooms/${code}/players/${playerId}/score`), score);
}

export async function setRoomStatus(code, status) {
  await set(ref(db, `rooms/${code}/status`), status);
}

export async function cleanupRoom(code) {
  await remove(ref(db, `rooms/${code}`));
}

export async function setRoomQuestions(code, questions) {
  // Store compact question data so both players see the same questions
  const compact = questions.map(q => ({ q: q.q, o: q.o, a: q.a, cat: q.cat, exp: q.exp }));
  await set(ref(db, `rooms/${code}/questions`), compact);
}

export { db, ref, onValue };
