# 🏰 WSET Level 2 Quiz — Loire Valley Edition

A multiplayer wine quiz app for WSET Level 2 exam prep. Play solo or head-to-head against your wife or an AI sommelier.

## Quick Start

```bash
# 1. Clone and install
git clone https://github.com/YOUR_USERNAME/wset-quiz.git
cd wset-quiz
npm install

# 2. Set up Firebase (see below)

# 3. Run locally
npm run dev

# 4. Deploy to GitHub Pages
npm run deploy
```

## Firebase Setup (5 minutes)

Multiplayer requires Firebase Realtime Database. Solo + AI modes work without it.

1. Go to [Firebase Console](https://console.firebase.google.com)
2. **Create project** → name it `wset-quiz` → skip Google Analytics
3. Click the **web icon** `</>` → register app → copy the config
4. Paste config into `src/firebase.js` (replace the placeholder values)
5. Go to **Build → Realtime Database → Create Database**
   - Region: `europe-west1`
   - Start in **locked mode**
6. Go to **Rules** tab and paste the rules from `src/firebase.js` comments
7. Done!

## Deploy to GitHub Pages

```bash
# First time: create repo on GitHub, then:
git init
git remote add origin https://github.com/YOUR_USERNAME/wset-quiz.git

# Update vite.config.js base path to match your repo name:
# base: '/wset-quiz/'

# Deploy:
npm run deploy
```

Your app will be live at `https://YOUR_USERNAME.github.io/wset-quiz/`

## Features

### Solo Modes
- **Study Mode** — 15 questions, no timer
- **Speed Round** — 20 questions, 15s each
- **Weak Spots** — targets your wrong answers
- **Marathon** — all 115 questions
- **Mock Exam** — 50 questions, 60 min, pass/fail at 55%
- **Daily Challenge** — 10 questions, streak tracker

### Study Tools
- **Flashcards** — 67 cards with instant recall quizzes
- **Spot the Difference** — 15 side-by-side comparison drills
- **Confidence Betting** — metacognition training
- **Wine Map** — interactive world map with 34 WSET regions, grapes, climate, and study notes

### Multiplayer: Le Chemin du Château
A Loire Valley board game! Race from vineyard to château along a winding 16-space path.
- **vs Partner** — create room, share 4-digit code, play simultaneously
- **vs AI** — 5 difficulty levels (Novice 35% → Master of Wine 95%)
- 60 seconds per question, answers hidden until both submit
- Correct answer = advance one space on the board
- **Mens erger je niet!** — land on opponent's space to bump them back 2
- First to the château wins (or highest position after 30 questions)

## Project Structure

```
src/
├── App.jsx                    # Router: solo ↔ multiplayer
├── main.jsx                   # Entry point
├── firebase.js                # Firebase config + room management
├── components/
│   ├── SoloQuiz.jsx          # Full solo experience (all modes)
│   ├── MultiplayerGame.jsx   # Multiplayer lobby + game + results
│   ├── GameBoard.jsx         # Loire Valley board (winding path, bump logic)
│   ├── WineMap.jsx           # Interactive world wine region map
│   └── LoireSVG.jsx          # Château and river decorations
├── data/
│   └── questions.js          # 115 Qs + 67 flashcards + 15 comparisons
├── multiplayer/
│   └── ai.js                 # AI opponent logic
└── utils/
    ├── theme.js              # Colors, fonts, shared styles
    └── helpers.js            # Shuffle, storage, utilities
```

## Tech Stack

- **React 18** + **Vite** — fast dev + builds
- **Firebase Realtime DB** — multiplayer sync (free tier)
- **GitHub Pages** — hosting (free)
- **Zero CSS frameworks** — all inline styles, Loire Valley theme
