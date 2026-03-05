import React, { useState, useEffect, useRef, useCallback } from 'react';
import { C, F, FS, CAT_ICONS, CATEGORIES, card, btnPrimary } from '../utils/theme.js';
import { shuffle, shuffleQOptions } from '../utils/helpers.js';
import { ChateauSilhouette, RiverWave } from './LoireSVG.jsx';
import GameBoard, { calculateMoves, BOARD_SPACES } from './GameBoard.jsx';
import { AI_LEVELS, getAILevel, aiAnswer } from '../multiplayer/ai.js';
import {
  createRoom, joinRoom, subscribeToRoom,
  submitAnswer, revealAnswers, setReady, advanceQuestion,
  updatePlayerScore, setRoomStatus, cleanupRoom, setRoomQuestions
} from '../firebase.js';

const MP_QUESTION_COUNT = 30;
const ROUND_TIMER = 60;

export default function MultiplayerGame({ playerName, questions, onExit }) {
  const [mpScreen, setMpScreen] = useState('lobby');
  const [roomCode, setRoomCode] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [playerId, setPlayerId] = useState(null);
  const [error, setError] = useState('');
  const [isAI, setIsAI] = useState(false);
  const [aiLevel, setAiLevel] = useState('student');

  const [room, setRoom] = useState(null);
  const [mpQuestions, setMpQuestions] = useState([]);
  const [qi, setQi] = useState(0);
  const [myAnswer, setMyAnswer] = useState(null);
  const [timer, setTimer] = useState(ROUND_TIMER);
  const [scores, setScores] = useState({ p1: 0, p2: 0 });
  const [boardPos, setBoardPos] = useState({ p1: 0, p2: 0 });
  const [bumped, setBumped] = useState(null);
  const [aiThinking, setAiThinking] = useState(false);
  const [aiAnswerVal, setAiAnswerVal] = useState(null);
  const [revealed, setRevealed] = useState(false);
  const [myReady, setMyReady] = useState(false);
  const timerRef = useRef(null);
  const unsubRef = useRef(null);
  const mpScreenRef = useRef(mpScreen);
  useEffect(() => { mpScreenRef.current = mpScreen; }, [mpScreen]);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      if (unsubRef.current) unsubRef.current();
    };
  }, []);

  const leaveGame = useCallback(() => {
    if (unsubRef.current) { unsubRef.current(); unsubRef.current = null; }
    if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null; }
    setRoom(null); setRoomCode(''); setPlayerId(null);
    setMpQuestions([]); setQi(0); setMyAnswer(null); setRevealed(false);
    setScores({ p1: 0, p2: 0 }); setBoardPos({ p1: 0, p2: 0 }); setBumped(null);
    setMyReady(false); setAiAnswerVal(null); setAiThinking(false);
    setTimer(ROUND_TIMER); setError('');
    setMpScreen('lobby');
  }, []);

  useEffect(() => {
    if (mpScreen === 'playing' && timer > 0 && !revealed) {
      timerRef.current = setTimeout(() => setTimer(t => t - 1), 1000);
      return () => clearTimeout(timerRef.current);
    }
    if (mpScreen === 'playing' && timer === 0 && !revealed) {
      handleTimeUp();
    }
  }, [timer, mpScreen, revealed]);

  const resetGameState = useCallback(() => {
    setQi(0); setMyAnswer(null); setAiAnswerVal(null);
    setRevealed(false); setMyReady(false);
    setScores({ p1: 0, p2: 0 }); setBoardPos({ p1: 0, p2: 0 }); setBumped(null);
    setTimer(ROUND_TIMER);
  }, []);

  // ── AI FLOW ────────────────────────────
  const startAIGame = useCallback(() => {
    const qs = shuffle([...questions]).slice(0, MP_QUESTION_COUNT).map(shuffleQOptions);
    setMpQuestions(qs);
    resetGameState();
    setMpScreen('playing');
    setIsAI(true);
    setAiThinking(true); setAiAnswerVal(null);
    aiAnswer(qs[0], aiLevel).then(r => { setAiAnswerVal(r.answer); setAiThinking(false); });
  }, [questions, aiLevel, resetGameState]);

  const triggerAI = useCallback((q) => {
    setAiThinking(true); setAiAnswerVal(null);
    aiAnswer(q, aiLevel).then(r => { setAiAnswerVal(r.answer); setAiThinking(false); });
  }, [aiLevel]);

  // ── ONLINE FLOW ────────────────────────
  const handleCreateRoom = useCallback(async () => {
    try {
      setError('');
      const { code, playerId: pid } = await createRoom(playerName);
      setRoomCode(code); setPlayerId(pid); setIsAI(false);
      setMpScreen('waiting');
      const qs = shuffle([...questions]).slice(0, MP_QUESTION_COUNT).map(shuffleQOptions);
      setMpQuestions(qs);
      await setRoomQuestions(code, qs);
      unsubRef.current = subscribeToRoom(code, (data) => setRoom(data));
    } catch (e) { setError(e.message); }
  }, [playerName, questions]);

  const handleJoinRoom = useCallback(async () => {
    try {
      setError('');
      if (!joinCode || joinCode.length !== 4) { setError('Enter a 4-digit room code'); return; }
      const { code, playerId: pid } = await joinRoom(joinCode, playerName);
      setRoomCode(code); setPlayerId(pid); setIsAI(false);
      unsubRef.current = subscribeToRoom(code, (data) => setRoom(data));
    } catch (e) { setError(e.message); }
  }, [joinCode, playerName]);

  // Detect opponent joined (host)
  useEffect(() => {
    if (!isAI && room?.status === 'playing' && mpScreenRef.current === 'waiting') {
      resetGameState();
      setMpScreen('playing');
    }
  }, [room?.status, isAI, resetGameState]);

  // Joiner loads shared questions
  useEffect(() => {
    if (!isAI && room?.questions && mpQuestions.length === 0) {
      const qs = Array.isArray(room.questions) ? room.questions : Object.values(room.questions);
      setMpQuestions(qs);
      resetGameState();
      setMpScreen('playing');
    }
  }, [room?.questions, isAI, mpQuestions.length]);

  // ── Answer handling ────────────────────
  const handleMyAnswer = useCallback((idx) => {
    if (myAnswer !== null || revealed) return;
    setMyAnswer(idx);
    if (!isAI) submitAnswer(roomCode, playerId, qi, idx, timer);
  }, [myAnswer, revealed, isAI, roomCode, playerId, qi, timer]);

  useEffect(() => {
    if (isAI && mpScreen === 'playing' && !revealed && myAnswer !== null && aiAnswerVal !== null) {
      doReveal(myAnswer, aiAnswerVal);
    }
  }, [myAnswer, aiAnswerVal, isAI, mpScreen, revealed]);

  useEffect(() => {
    if (!isAI && mpScreen === 'playing' && !revealed && room?.answers) {
      const opId = playerId === 'p1' ? 'p2' : 'p1';
      if (room.answers[playerId] && room.answers[opId]) {
        doReveal(room.answers[playerId].answer, room.answers[opId].answer);
      }
    }
  }, [room?.answers, isAI, mpScreen, revealed, playerId]);

  const handleTimeUp = useCallback(() => {
    if (revealed) return;
    if (myAnswer === null) {
      setMyAnswer(-1);
      if (!isAI) submitAnswer(roomCode, playerId, qi, -1, 0);
    }
    if (isAI && aiAnswerVal === null) setAiAnswerVal(-1);
    setTimeout(() => doReveal(myAnswer ?? -1, isAI ? (aiAnswerVal ?? -1) : -1), 500);
  }, [myAnswer, aiAnswerVal, isAI, revealed, roomCode, playerId, qi]);

  const doReveal = useCallback((myA, opA) => {
    if (revealed) return;
    setRevealed(true); setBumped(null);
    const q = mpQuestions[qi]; if (!q) return;
    const myOk = myA === q.a, opOk = opA === q.a;
    setScores(prev => ({ p1: prev.p1 + (myOk ? 1 : 0), p2: prev.p2 + (opOk ? 1 : 0) }));
    setBoardPos(prev => {
      const r = calculateMoves(prev.p1, prev.p2, myOk, opOk);
      if (r.p1Bumped) setBumped(r.p1);
      if (r.p2Bumped) setBumped(r.p2);
      return { p1: r.p1, p2: r.p2 };
    });
  }, [revealed, mpQuestions, qi]);

  const handleNextQuestion = useCallback(() => {
    if (boardPos.p1 >= BOARD_SPACES - 1 || boardPos.p2 >= BOARD_SPACES - 1 || qi + 1 >= mpQuestions.length) {
      setMpScreen('results'); return;
    }
    const next = qi + 1;
    setQi(next); setMyAnswer(null); setAiAnswerVal(null);
    setRevealed(false); setMyReady(false); setBumped(null); setTimer(ROUND_TIMER);
    if (isAI) triggerAI(mpQuestions[next]);
    if (!isAI) advanceQuestion(roomCode, next);
  }, [qi, mpQuestions, isAI, triggerAI, boardPos, roomCode]);

  const handleOnlineReady = useCallback(async () => {
    setMyReady(true);
    if (!isAI) await setReady(roomCode, playerId, true);
  }, [isAI, roomCode, playerId]);

  useEffect(() => {
    if (!isAI && room?.ready?.p1 && room?.ready?.p2 && revealed && playerId === 'p1') {
      handleNextQuestion();
    }
  }, [room?.ready, isAI, revealed, playerId]);

  useEffect(() => {
    if (!isAI && playerId === 'p2' && room && typeof room.currentQ === 'number' && room.currentQ !== qi && room.currentQ > 0) {
      setQi(room.currentQ); setMyAnswer(null); setRevealed(false);
      setMyReady(false); setBumped(null); setTimer(ROUND_TIMER);
    }
  }, [room?.currentQ, isAI, playerId]);

  // ── RENDER HELPERS ─────────────────────
  const opponentName = isAI ? `🤖 ${getAILevel(aiLevel).name}` : (() => {
    if (!room?.players) return 'Opponent';
    const opId = playerId === 'p1' ? 'p2' : 'p1';
    return room.players[opId]?.name || 'Opponent';
  })();
  const myName = playerName;
  const opAnswer = isAI ? aiAnswerVal : (() => {
    if (!room?.answers) return null;
    const opId = playerId === 'p1' ? 'p2' : 'p1';
    return room.answers[opId]?.answer ?? null;
  })();

  const BackBtn = ({ onClick, label }) => (
    <button style={{ fontSize: 13, color: C.textLt, background: "none", border: "none", cursor: "pointer", fontFamily: FS, marginBottom: 12, padding: "4px 0" }} onClick={onClick}>← {label || "Back"}</button>
  );

  // ── LOBBY ──────────────────────────────
  if (mpScreen === 'lobby') {
    return (
      <div style={{ minHeight: "100vh", background: C.bg, fontFamily: F }}>
        <div style={{ maxWidth: 480, margin: "0 auto", padding: "24px 16px 40px" }}>
          <BackBtn onClick={onExit} label="Back to menu" />
          <h1 style={{ fontFamily: F, fontSize: 28, color: C.slateDk, fontWeight: 400, margin: "0 0 4px 0" }}>Le Chemin du Château</h1>
          <p style={{ fontFamily: FS, fontSize: 13, color: C.textLt, margin: "0 0 28px 0" }}>Race along the Loire to the château · answer correctly to advance · land on your opponent to bump them back!</p>
          <div style={{ ...card, padding: "20px 18px", marginBottom: 12 }}>
            <h3 style={{ fontFamily: F, fontSize: 18, color: C.slateDk, fontWeight: 400, margin: "0 0 12px 0" }}>🤖 Play vs Computer</h3>
            <p style={{ fontFamily: FS, fontSize: 12, color: C.textLt, margin: "0 0 14px 0" }}>Choose opponent difficulty:</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 16 }}>
              {AI_LEVELS.map(level => (
                <button key={level.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 14px", borderRadius: 8, border: `1.5px solid ${aiLevel === level.id ? C.river : C.bgDeep}`, background: aiLevel === level.id ? C.riverLt : C.white, cursor: "pointer", fontFamily: FS, textAlign: "left", transition: "all 0.15s ease" }} onClick={() => setAiLevel(level.id)}>
                  <span style={{ fontSize: 20 }}>{level.emoji}</span>
                  <div style={{ flex: 1 }}><span style={{ fontSize: 13, fontWeight: 600, color: C.text }}>{level.name}</span></div>
                  <span style={{ fontSize: 12, fontFamily: F, color: aiLevel === level.id ? C.river : C.textLt, fontWeight: 600 }}>{level.pct}%</span>
                </button>
              ))}
            </div>
            <button style={{ ...btnPrimary, width: "100%", fontSize: 14 }} onClick={startAIGame}>Start Duel vs {getAILevel(aiLevel).emoji} {getAILevel(aiLevel).name}</button>
          </div>
          <div style={{ ...card, padding: "20px 18px", marginBottom: 12 }}>
            <h3 style={{ fontFamily: F, fontSize: 18, color: C.slateDk, fontWeight: 400, margin: "0 0 12px 0" }}>👥 Play Online</h3>
            <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
              <button style={{ ...btnPrimary, flex: 1, fontSize: 13, background: `linear-gradient(135deg, ${C.vine} 0%, #5a6d4e 100%)` }} onClick={handleCreateRoom}>Create Room</button>
            </div>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <input type="text" maxLength={4} placeholder="Room code" value={joinCode} onChange={e => setJoinCode(e.target.value.replace(/\D/g, ''))} style={{ flex: 1, padding: "11px 14px", borderRadius: 8, border: `1px solid ${C.bgDeep}`, fontFamily: F, fontSize: 20, textAlign: "center", letterSpacing: "0.3em", color: C.text, background: C.white, outline: "none" }} />
              <button style={{ ...btnPrimary, fontSize: 13, padding: "11px 20px" }} onClick={handleJoinRoom}>Join</button>
            </div>
            {error && <p style={{ color: C.bad, fontSize: 12, fontFamily: FS, marginTop: 8 }}>{error}</p>}
          </div>
          <ChateauSilhouette opacity={0.4} />
        </div>
      </div>
    );
  }

  // ── WAITING ────────────────────────────
  if (mpScreen === 'waiting') {
    return (
      <div style={{ minHeight: "100vh", background: C.bg, fontFamily: F, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ ...card, padding: "36px 32px", maxWidth: 380, width: "100%", textAlign: "center" }}>
          <p style={{ fontSize: 14, color: C.textMd, fontFamily: FS, margin: "0 0 8px 0" }}>Share this code with your opponent:</p>
          <div style={{ fontFamily: F, fontSize: 56, color: C.slateDk, letterSpacing: "0.2em", margin: "8px 0 20px" }}>{roomCode}</div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
            <div style={{ width: 8, height: 8, borderRadius: "50%", background: C.gold, animation: "pulse 1.5s infinite" }} />
            <span style={{ fontSize: 13, color: C.textLt, fontFamily: FS }}>Waiting for opponent…</span>
          </div>
          <button style={{ marginTop: 24, fontSize: 13, color: C.textLt, background: "none", border: "none", cursor: "pointer", fontFamily: FS, textDecoration: "underline" }} onClick={leaveGame}>Cancel</button>
          <style>{`@keyframes pulse { 0%,100% { opacity: 0.4; } 50% { opacity: 1; } }`}</style>
        </div>
      </div>
    );
  }

  // ── PLAYING ────────────────────────────
  if (mpScreen === 'playing') {
    const q = mpQuestions[qi];
    if (!q) return (
      <div style={{ minHeight: "100vh", background: C.bg, fontFamily: F, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ width: 8, height: 8, borderRadius: "50%", background: C.gold, animation: "pulse 1.5s infinite", margin: "0 auto 12px" }} />
          <p style={{ fontFamily: FS, fontSize: 14, color: C.textLt }}>Loading questions…</p>
          <button style={{ marginTop: 16, fontSize: 13, color: C.textLt, background: "none", border: "none", cursor: "pointer", fontFamily: FS, textDecoration: "underline" }} onClick={leaveGame}>Back to lobby</button>
          <style>{`@keyframes pulse { 0%,100% { opacity: 0.4; } 50% { opacity: 1; } }`}</style>
        </div>
      </div>
    );
    const timerPct = (timer / ROUND_TIMER) * 100;
    const myCorrect = myAnswer === q.a;
    const opCorrect = opAnswer === q.a;

    return (
      <div style={{ minHeight: "100vh", background: C.bg, fontFamily: F }}>
        <div style={{ maxWidth: 580, margin: "0 auto", padding: "16px 16px 40px" }}>
          <BackBtn onClick={leaveGame} label="Leave game" />
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
            <div style={{ textAlign: "left" }}>
              <p style={{ fontFamily: FS, fontSize: 11, color: C.textLt, margin: 0, letterSpacing: "0.04em" }}>{myName}</p>
              <p style={{ fontFamily: F, fontSize: 24, color: C.river, margin: 0 }}>{scores.p1}</p>
            </div>
            <div style={{ textAlign: "center", flex: 1 }}>
              <div style={{ fontFamily: F, fontSize: 28, color: timer <= 10 ? C.bad : timer <= 20 ? C.gold : C.slate }}>{timer}s</div>
              <div style={{ height: 3, borderRadius: 2, background: C.bgDeep, overflow: "hidden", margin: "4px 20px 0" }}>
                <div style={{ height: "100%", borderRadius: 2, background: timer <= 10 ? C.bad : timer <= 20 ? C.gold : `linear-gradient(90deg, ${C.river}, ${C.vine})`, width: `${timerPct}%`, transition: "width 1s linear" }}/>
              </div>
              <p style={{ fontFamily: FS, fontSize: 10, color: C.textLt, margin: "4px 0 0", letterSpacing: "0.06em", textTransform: "uppercase" }}>Q{qi + 1} of {mpQuestions.length}</p>
            </div>
            <div style={{ textAlign: "right" }}>
              <p style={{ fontFamily: FS, fontSize: 11, color: C.textLt, margin: 0, letterSpacing: "0.04em" }}>{opponentName}</p>
              <p style={{ fontFamily: F, fontSize: 24, color: C.vine, margin: 0 }}>{scores.p2}</p>
            </div>
          </div>
          <div style={{ position: "relative", height: 20, background: C.bgDeep+"55", borderRadius: 10, marginBottom: 14, overflow: "hidden" }}>
            <div style={{ position: "absolute", left: 2, top: 2, bottom: 2, width: `${Math.max(4, (boardPos.p1 / (BOARD_SPACES - 1)) * 100)}%`, background: `linear-gradient(90deg, ${C.river}, ${C.river}aa)`, borderRadius: 8, transition: "width 0.6s cubic-bezier(0.34,1.56,0.64,1)", display: "flex", alignItems: "center", justifyContent: "flex-end", paddingRight: 4 }}><span style={{ fontSize: 10 }}>🍷</span></div>
            <div style={{ position: "absolute", left: 2, top: 2, bottom: 2, width: `${Math.max(4, (boardPos.p2 / (BOARD_SPACES - 1)) * 100)}%`, background: `linear-gradient(90deg, ${C.vine}44, ${C.vine}88)`, borderRadius: 8, transition: "width 0.6s cubic-bezier(0.34,1.56,0.64,1)", display: "flex", alignItems: "center", justifyContent: "flex-end", paddingRight: 4 }}><span style={{ fontSize: 10 }}>🥂</span></div>
            <span style={{ position: "absolute", right: 6, top: 2, fontSize: 12 }}>🏰</span>
          </div>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 10, color: C.textMd, padding: "3px 10px", background: C.riverLt, borderRadius: 16, marginBottom: 10, letterSpacing: "0.06em", textTransform: "uppercase", fontFamily: FS }}><span>{CAT_ICONS[q.cat]}</span>{CATEGORIES[q.cat]}</div>
          <div style={{ ...card, marginBottom: 16, padding: "20px 18px" }}><p style={{ fontFamily: F, fontSize: 19, lineHeight: 1.55, color: C.text, margin: 0 }}>{q.q}</p></div>
          <div style={{ display: "flex", flexDirection: "column", gap: 7, marginBottom: 14 }}>
            {q.o.map((opt, i) => {
              let bg = C.white, bdr = C.bgDeep, tc = C.text, lBg = C.riverLt, lc = C.slate;
              if (revealed) {
                if (i === q.a) { bg = "rgba(92,138,83,0.06)"; bdr = "rgba(92,138,83,0.35)"; lBg = "rgba(92,138,83,0.12)"; lc = C.ok; }
                else if ((i === myAnswer && i !== q.a) || (i === opAnswer && i !== q.a)) { bg = "rgba(184,84,80,0.04)"; bdr = "rgba(184,84,80,0.2)"; }
                else { tc = C.textLt; lBg = C.bgDeep + "55"; lc = C.textLt; }
              } else if (i === myAnswer) { bg = C.riverLt; bdr = C.river; }
              const myPick = revealed && i === myAnswer, opPick = revealed && i === opAnswer;
              return (
                <button key={i} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", borderRadius: 10, border: `1px solid ${bdr}`, background: bg, cursor: revealed || myAnswer !== null ? "default" : "pointer", textAlign: "left", fontFamily: FS, color: tc, fontSize: 13, boxShadow: "0 1px 3px rgba(0,0,0,0.02)", transition: "all 0.15s ease" }} onClick={() => handleMyAnswer(i)} disabled={revealed || myAnswer !== null}>
                  <span style={{ width: 26, height: 26, borderRadius: 6, background: lBg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, color: lc, flexShrink: 0 }}>{String.fromCharCode(65 + i)}</span>
                  <span style={{ flex: 1, lineHeight: 1.4 }}>{opt}</span>
                  {revealed && <span style={{ display: "flex", gap: 4 }}>
                    {myPick && <span style={{ fontSize: 10, padding: "2px 6px", borderRadius: 4, background: myCorrect ? "rgba(92,138,83,0.1)" : "rgba(184,84,80,0.08)", color: myCorrect ? C.ok : C.bad, fontWeight: 600 }}>You</span>}
                    {opPick && <span style={{ fontSize: 10, padding: "2px 6px", borderRadius: 4, background: opCorrect ? "rgba(92,138,83,0.1)" : "rgba(184,84,80,0.08)", color: opCorrect ? C.ok : C.bad, fontWeight: 600 }}>{isAI ? '🤖' : 'Them'}</span>}
                  </span>}
                </button>
              );
            })}
          </div>
          {!revealed && myAnswer !== null && (
            <div style={{ ...card, padding: "14px 16px", textAlign: "center" }}>
              <p style={{ fontFamily: FS, fontSize: 13, color: C.textLt, margin: 0, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                <span style={{ width: 6, height: 6, borderRadius: "50%", background: C.gold, display: "inline-block", animation: "pulse 1.5s infinite" }} />
                {isAI && aiThinking ? "Sommelier Bot is thinking…" : isAI ? "Revealing…" : "Waiting for opponent…"}
              </p>
              <style>{`@keyframes pulse { 0%,100% { opacity: 0.3; } 50% { opacity: 1; } }`}</style>
            </div>
          )}
          {revealed && (
            <div style={{ ...card, padding: "16px 18px" }}>
              <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
                <div style={{ flex: 1, padding: "10px 12px", borderRadius: 8, textAlign: "center", background: myCorrect ? "rgba(92,138,83,0.05)" : "rgba(184,84,80,0.04)", border: `1px solid ${myCorrect ? "rgba(92,138,83,0.2)" : "rgba(184,84,80,0.15)"}` }}>
                  <p style={{ fontFamily: FS, fontSize: 10, color: C.textLt, margin: "0 0 2px", textTransform: "uppercase", letterSpacing: "0.06em" }}>You</p>
                  <p style={{ fontFamily: F, fontSize: 18, color: myCorrect ? C.ok : C.bad, margin: 0 }}>{myAnswer === -1 ? "⏱ Time's up" : myCorrect ? "✓ Correct" : "✗ Wrong"}</p>
                </div>
                <div style={{ flex: 1, padding: "10px 12px", borderRadius: 8, textAlign: "center", background: opCorrect ? "rgba(92,138,83,0.05)" : "rgba(184,84,80,0.04)", border: `1px solid ${opCorrect ? "rgba(92,138,83,0.2)" : "rgba(184,84,80,0.15)"}` }}>
                  <p style={{ fontFamily: FS, fontSize: 10, color: C.textLt, margin: "0 0 2px", textTransform: "uppercase", letterSpacing: "0.06em" }}>{opponentName}</p>
                  <p style={{ fontFamily: F, fontSize: 18, color: opCorrect ? C.ok : C.bad, margin: 0 }}>{opAnswer === -1 ? "⏱ Time's up" : opCorrect ? "✓ Correct" : "✗ Wrong"}</p>
                </div>
              </div>
              {bumped !== null && (
                <div style={{ textAlign: "center", padding: "8px 12px", marginBottom: 10, borderRadius: 8, background: "rgba(184,84,80,0.06)", border: "1px solid rgba(184,84,80,0.15)" }}>
                  <p style={{ fontFamily: F, fontSize: 16, color: C.bad, margin: 0 }}>💥 Mens erger je niet! Bumped back 2 spaces!</p>
                </div>
              )}
              <div style={{ marginBottom: 12 }}><GameBoard p1Pos={boardPos.p1} p2Pos={boardPos.p2} p1Name={myName} p2Name={opponentName} bumped={bumped} /></div>
              {(boardPos.p1 >= BOARD_SPACES - 1 || boardPos.p2 >= BOARD_SPACES - 1) && (
                <div style={{ textAlign: "center", padding: "12px", marginBottom: 10, borderRadius: 10, background: C.goldLt, border: "1px solid rgba(196,152,59,0.2)" }}>
                  <p style={{ fontFamily: F, fontSize: 22, color: C.gold, margin: 0 }}>🏰 {boardPos.p1 >= BOARD_SPACES - 1 ? myName : opponentName} reached the Château!</p>
                </div>
              )}
              <p style={{ fontSize: 13, lineHeight: 1.6, color: C.textMd, margin: "0 0 14px 0", fontFamily: FS }}>{q.exp}</p>
              {isAI ? (
                <button style={{ ...btnPrimary, width: "100%", fontSize: 14 }} onClick={handleNextQuestion}>
                  {boardPos.p1 >= BOARD_SPACES - 1 || boardPos.p2 >= BOARD_SPACES - 1 || qi + 1 >= mpQuestions.length ? "See Final Results →" : "Next Question →"}
                </button>
              ) : (
                <button style={{ ...btnPrimary, width: "100%", fontSize: 14, opacity: myReady ? 0.5 : 1 }} onClick={handleOnlineReady} disabled={myReady}>
                  {myReady ? "Waiting for opponent…" : "Ready for Next →"}
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    );
  }

  // ── RESULTS ────────────────────────────
  if (mpScreen === 'results') {
    const myScore = scores.p1, opScore = scores.p2;
    const iWon = boardPos.p1 > boardPos.p2 || (boardPos.p1 === boardPos.p2 && myScore > opScore);
    const tied = boardPos.p1 === boardPos.p2 && myScore === opScore;
    const reachedChateau = boardPos.p1 >= BOARD_SPACES - 1 || boardPos.p2 >= BOARD_SPACES - 1;
    const myPct = mpQuestions.length > 0 ? Math.round((myScore / mpQuestions.length) * 100) : 0;
    return (
      <div style={{ minHeight: "100vh", background: C.bg, fontFamily: F, display: "flex", flexDirection: "column" }}>
        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
          <div style={{ ...card, padding: "28px 22px", maxWidth: 440, width: "100%", textAlign: "center" }}>
            <p style={{ fontFamily: FS, fontSize: 11, letterSpacing: "0.08em", textTransform: "uppercase", color: C.textLt, margin: "0 0 8px" }}>🏰 Le Chemin du Château — Final</p>
            <h2 style={{ fontFamily: F, fontSize: 30, color: tied ? C.gold : iWon ? C.ok : C.bad, fontWeight: 400, margin: "0 0 6px" }}>{tied ? "Match Nul!" : iWon ? "Victoire!" : "Défaite"}</h2>
            {reachedChateau && <p style={{ fontFamily: FS, fontSize: 13, color: C.gold, margin: "0 0 12px", fontWeight: 600 }}>🏰 {boardPos.p1 >= BOARD_SPACES - 1 ? myName : opponentName} reached the Château!</p>}
            <div style={{ margin: "0 -10px 16px" }}><GameBoard p1Pos={boardPos.p1} p2Pos={boardPos.p2} p1Name={myName} p2Name={opponentName} /></div>
            <div style={{ display: "flex", gap: 12, marginBottom: 16 }}>
              <div style={{ flex: 1, padding: "12px 10px", borderRadius: 10, textAlign: "center", background: iWon || tied ? "rgba(92,138,83,0.04)" : C.bgDeep + "55", border: `1.5px solid ${iWon || tied ? "rgba(92,138,83,0.2)" : C.bgDeep}` }}>
                <p style={{ fontFamily: FS, fontSize: 10, color: C.textLt, margin: "0 0 2px", textTransform: "uppercase" }}>You</p>
                <p style={{ fontFamily: F, fontSize: 28, color: iWon || tied ? C.ok : C.textMd, margin: "0 0 1px" }}>{myScore}/{mpQuestions.length}</p>
                <p style={{ fontFamily: FS, fontSize: 11, color: C.textLt, margin: 0 }}>Space {boardPos.p1}/{BOARD_SPACES - 1}</p>
              </div>
              <div style={{ display: "flex", alignItems: "center" }}><span style={{ fontFamily: F, fontSize: 18, color: C.textLt }}>vs</span></div>
              <div style={{ flex: 1, padding: "12px 10px", borderRadius: 10, textAlign: "center", background: !iWon || tied ? "rgba(106,125,92,0.04)" : C.bgDeep + "55", border: `1.5px solid ${!iWon || tied ? "rgba(106,125,92,0.2)" : C.bgDeep}` }}>
                <p style={{ fontFamily: FS, fontSize: 10, color: C.textLt, margin: "0 0 2px", textTransform: "uppercase" }}>{opponentName}</p>
                <p style={{ fontFamily: F, fontSize: 28, color: !iWon || tied ? C.vine : C.textMd, margin: "0 0 1px" }}>{opScore}/{mpQuestions.length}</p>
                <p style={{ fontFamily: FS, fontSize: 11, color: C.textLt, margin: 0 }}>Space {boardPos.p2}/{BOARD_SPACES - 1}</p>
              </div>
            </div>
            <p style={{ fontSize: 13, color: C.textMd, margin: "0 0 20px 0", fontFamily: FS, fontStyle: "italic" }}>{myPct >= 55 ? "You'd pass the WSET exam!" : "Keep practising — 55% to pass."}</p>
            <div style={{ display: "flex", gap: 8 }}>
              <button style={{ ...btnPrimary, flex: 1, fontSize: 13 }} onClick={leaveGame}>Rematch</button>
              <button style={{ flex: 1, padding: "12px", borderRadius: 10, border: `1px solid ${C.bgDeep}`, background: "transparent", color: C.textMd, fontSize: 13, cursor: "pointer", fontFamily: FS }} onClick={onExit}>Menu</button>
            </div>
          </div>
        </div>
        <ChateauSilhouette opacity={0.5} />
        <RiverWave />
      </div>
    );
  }
  return null;
}
