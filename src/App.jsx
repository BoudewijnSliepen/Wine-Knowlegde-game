import React, { useState } from 'react';
import SoloQuiz from './components/SoloQuiz.jsx';
import MultiplayerGame from './components/MultiplayerGame.jsx';
import WineWorldMap from './components/WineMap.jsx';
import { QUESTIONS } from './data/questions.js';

// App routes between Solo, Multiplayer, and Wine Map
export default function App() {
  const [route, setRoute] = useState('solo'); // 'solo' | 'multiplayer' | 'winemap'
  const [playerName, setPlayerName] = useState('');

  // Multiplayer needs a player name — SoloQuiz handles its own login
  // When entering multiplayer from solo, pass the logged-in name
  if (route === 'multiplayer' && playerName) {
    return (
      <MultiplayerGame
        playerName={playerName}
        questions={QUESTIONS}
        onExit={() => setRoute('solo')}
      />
    );
  }

  if (route === 'winemap') {
    return (
      <WineWorldMap onBack={() => setRoute('solo')} />
    );
  }

  // Solo quiz is the default — it has its own splash/login/menu
  return (
    <SoloQuiz
      onMultiplayer={(name) => { setPlayerName(name); setRoute('multiplayer'); }}
      onWineMap={() => setRoute('winemap')}
    />
  );
}
