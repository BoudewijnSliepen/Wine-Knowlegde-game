import React, { useState, useEffect, useCallback, useRef } from 'react';
import { C, F, FS, CATEGORIES, CAT_ICONS, RANKS, card, btnPrimary } from '../utils/theme.js';
import { shuffle, shuffleQuiz, shuffleQOptions, getRank, getNextRank, daysUntilExam,
         loadPlayer, savePlayer, loadLeaderboard, saveLeaderboard,
         loadDailyStreak, saveDailyStreak } from '../utils/helpers.js';
import { ChateauSilhouette, RiverWave } from './LoireSVG.jsx';
import { STUDY_CARDS, COMPARISONS, QUESTIONS } from '../data/questions.js';

export default function SoloQuiz({ onMultiplayer, onWineMap }) {
  const [screen, setScreen] = useState("splash");
  const [player, setPlayer] = useState(null);
  const [mode, setMode] = useState(null);
  const [quizQs, setQuizQs] = useState([]);
  const [qi, setQi] = useState(0);
  const [sel, setSel] = useState(null);
  const [showExp, setShowExp] = useState(false);
  const [sScore, setSScore] = useState(0);
  const [sCorrect, setSCorrect] = useState(0);
  const [sStreak, setSStreak] = useState(0);
  const [bStreak, setBStreak] = useState(0);
  const [tLeft, setTLeft] = useState(0);
  const [lb, setLb] = useState([]);
  const [catF, setCatF] = useState(null);
  const [animOk, setAnimOk] = useState(null);
  const [nameIn, setNameIn] = useState("");
  const tRef = useRef(null);
  const [loading, setLoading] = useState(true);
  const [fadeIn, setFadeIn] = useState(false);
  // Study block state
  const [studyCards, setStudyCards] = useState([]);
  const [studyIdx, setStudyIdx] = useState(0);
  const [studyFlipped, setStudyFlipped] = useState(false);
  const [studyTimer, setStudyTimer] = useState(900); // 15 min in seconds
  const [studyCat, setStudyCat] = useState(null); // null = all
  const [studyPaused, setStudyPaused] = useState(false);
  const [studyMarked, setStudyMarked] = useState(new Set());
  const [studyQuizSel, setStudyQuizSel] = useState(null); // null = not answered yet
  const [studyQuizScore, setStudyQuizScore] = useState({correct:0, total:0});
  const [studyShuffledQ, setStudyShuffledQ] = useState(null);
  const studyTimerRef = useRef(null);
  // Confidence betting
  const [confidence, setConfidence] = useState(null); // null, "sure", "think", "noidea"
  const [confStats, setConfStats] = useState({sure:{c:0,t:0},think:{c:0,t:0},noidea:{c:0,t:0}});
  // Comparison drills
  const [compIdx, setCompIdx] = useState(0);
  const [compQuizSel, setCompQuizSel] = useState(null);
  const [compScore, setCompScore] = useState({correct:0,total:0});
  const [compShuffledQ, setCompShuffledQ] = useState(null);
  // Daily challenge
  const [dailyStreak, setDailyStreak] = useState({count:0,lastDate:null});
  const [dailyDone, setDailyDone] = useState(false);
  // Mock exam
  const [mockTimer, setMockTimer] = useState(3600);
  const mockTimerRef = useRef(null);

  useEffect(() => { setTimeout(() => setFadeIn(true), 100); loadLeaderboard().then(l => { setLb(l); setLoading(false); }); loadDailyStreak().then(d => { setDailyStreak(d); const today = new Date().toISOString().slice(0,10); setDailyDone(d.lastDate === today); }); }, []);

  useEffect(() => {
    if ((mode === "speed" || mode === "daily") && screen === "quiz" && !showExp && tLeft > 0) { tRef.current = setTimeout(() => setTLeft(t => t - 1), 1000); return () => clearTimeout(tRef.current); }
    if (mode === "speed" && tLeft === 0 && screen === "quiz" && !showExp && sel === null) doAnswer(-1);
  }, [tLeft, screen, showExp, mode, sel]);

  // Mock exam timer
  useEffect(() => {
    if (mode === "mock" && screen === "quiz" && !showExp && mockTimer > 0) {
      mockTimerRef.current = setTimeout(() => setMockTimer(t => t - 1), 1000);
      return () => clearTimeout(mockTimerRef.current);
    }
  }, [mockTimer, screen, showExp, mode]);

  // Study block timer
  useEffect(() => {
    if (screen === "study" && !studyPaused && studyTimer > 0) {
      studyTimerRef.current = setTimeout(() => setStudyTimer(t => t - 1), 1000);
      return () => clearTimeout(studyTimerRef.current);
    }
  }, [studyTimer, screen, studyPaused]);

  // Shuffle study quiz when card changes
  useEffect(() => {
    if (studyCards.length > 0 && studyCards[studyIdx]?.quiz) {
      setStudyShuffledQ(shuffleQuiz(studyCards[studyIdx].quiz));
    }
  }, [studyIdx, studyCards]);

  // Shuffle comparison quiz when index changes
  useEffect(() => {
    if (screen === "compare" && COMPARISONS[compIdx]?.quiz) {
      setCompShuffledQ(shuffleQuiz(COMPARISONS[compIdx].quiz));
    }
  }, [compIdx, screen]);

  const startStudy = useCallback((cat = null) => {
    let cards = cat !== null ? STUDY_CARDS.filter(c => c.cat === cat) : [...STUDY_CARDS];
    // Shuffle
    for (let i = cards.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [cards[i], cards[j]] = [cards[j], cards[i]]; }
    setStudyCards(cards); setStudyIdx(0); setStudyFlipped(false); setStudyTimer(900);
    setStudyCat(cat); setStudyPaused(false); setStudyMarked(new Set()); setStudyQuizSel(null); setStudyQuizScore({correct:0,total:0}); setScreen("study");
  }, []);

  const startCompare = useCallback(() => {
    setCompIdx(0); setCompQuizSel(null); setCompScore({correct:0,total:0}); setScreen("compare");
  }, []);

  const startQ = useCallback((m, cf = null) => {
    setMode(m); setCatF(cf); setConfidence(null);
    setConfStats({sure:{c:0,t:0},think:{c:0,t:0},noidea:{c:0,t:0}});
    let qs = [...QUESTIONS];
    if (cf !== null) qs = qs.filter(q => q.cat === cf);
    if (m === "weak" && player) { const w = new Set(player.wrongIds || []); const wq = qs.filter(q => w.has(q.id)); qs = wq.length >= 5 ? wq : qs; }
    if (m === "mock") { qs = shuffle(qs).slice(0, 50); setMockTimer(3600); }
    else if (m === "daily") { qs = shuffle(qs).slice(0, 10); setTLeft(300); }
    else { qs = shuffle(qs).slice(0, m === "marathon" ? qs.length : m === "speed" ? 20 : 15); }
    setQuizQs(qs.map(shuffleQOptions)); setQi(0); setSel(null); setShowExp(false); setSScore(0); setSCorrect(0); setSStreak(0); setBStreak(0); setAnimOk(null);
    if (m === "speed") setTLeft(15);
    setScreen("quiz");
  }, [player]);

  const doAnswer = useCallback((idx) => {
    if (sel !== null) return;
    const q = quizQs[qi]; const ok = idx === q.a;
    setSel(idx); setAnimOk(ok); setShowExp(true);
    // Confidence tracking
    if (confidence) {
      setConfStats(prev => {
        const n = {...prev}; const k = confidence;
        n[k] = {c: n[k].c + (ok?1:0), t: n[k].t + 1};
        return n;
      });
    }
    let pts = 0, ns = sStreak;
    if (ok) { pts = 10; if (mode === "speed" && tLeft > 0) pts += Math.min(5, Math.ceil(tLeft / 3)); ns++; if (ns >= 10) pts *= 3; else if (ns >= 5) pts *= 2; setSStreak(ns); setBStreak(s => Math.max(s, ns)); setSCorrect(c => c + 1); }
    else { ns = 0; setSStreak(0); }
    setSScore(s => s + pts);
    if (player) {
      const u = { ...player }; u.totalPts = (u.totalPts||0)+pts; u.totalQs = (u.totalQs||0)+1; u.totalCorrect = (u.totalCorrect||0)+(ok?1:0); u.bestStreak = Math.max(u.bestStreak||0, ns);
      if (!u.catStats) u.catStats = {}; const cat = CATEGORIES[q.cat]; if (!u.catStats[cat]) u.catStats[cat] = {total:0,correct:0}; u.catStats[cat].total++; if (ok) u.catStats[cat].correct++;
      if (!ok) { if (!u.wrongIds) u.wrongIds = []; if (!u.wrongIds.includes(q.id)) u.wrongIds.push(q.id); } else { if (u.wrongIds) u.wrongIds = u.wrongIds.filter(id => id !== q.id); }
      u.lastPlayed = new Date().toISOString(); setPlayer(u); savePlayer(u);
    }
  }, [sel, quizQs, qi, mode, tLeft, sStreak, player, confidence]);

  const nextQ = useCallback(() => {
    if (qi + 1 >= quizQs.length) {
      if (player) { loadLeaderboard().then(l => { l.push({name:player.name,score:sScore,mode,date:new Date().toISOString(),correct:sCorrect,total:quizQs.length}); l.sort((a,b)=>b.score-a.score); const t=l.slice(0,50); setLb(t); saveLeaderboard(t); }); }
      // Daily streak
      if (mode === "daily") {
        const today = new Date().toISOString().slice(0,10);
        const yesterday = new Date(Date.now()-86400000).toISOString().slice(0,10);
        const newStreak = (dailyStreak.lastDate === yesterday || dailyStreak.lastDate === today) ? dailyStreak.count + (dailyStreak.lastDate === today ? 0 : 1) : 1;
        const ds = {count: newStreak, lastDate: today};
        setDailyStreak(ds); setDailyDone(true); saveDailyStreak(ds);
      }
      setScreen("results"); return;
    }
    setQi(i => i+1); setSel(null); setShowExp(false); setAnimOk(null); setConfidence(null);
    if (mode === "speed") setTLeft(15);
  }, [qi, quizQs, sScore, player, mode, sCorrect, dailyStreak]);

  const login = useCallback(async (name) => {
    if (!name.trim()) return; const n = name.trim();
    let p = await loadPlayer(n);
    if (!p) p = {name:n,totalPts:0,totalQs:0,totalCorrect:0,bestStreak:0,catStats:{},wrongIds:[],lastPlayed:new Date().toISOString()};
    await savePlayer(p); setPlayer(p); setScreen("menu");
  }, []);

  const days = daysUntilExam();
  const rank = player ? getRank(player.totalPts, RANKS) : null;
  const nxRank = player ? getNextRank(player.totalPts, RANKS) : null;

  // ── Shared styles ─────────────────────────
  // card and btnPrimary imported from theme

  // ── LOADING ─────────────────────────────────
  if (loading) return <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: C.bg }}><div style={{ fontSize: 48 }}>🏰</div><p style={{ color: C.slate, fontSize: 17, marginTop: 16, fontFamily: F, fontStyle: "italic" }}>Opening the château gates...</p></div>;

  // ── SPLASH ──────────────────────────────────
  if (screen === "splash") return (
    <div style={{ minHeight: "100vh", background: C.bg, fontFamily: F, opacity: fadeIn ? 1 : 0, transition: "opacity 0.8s ease", display: "flex", flexDirection: "column" }}>
      <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "40px 24px", maxWidth: 460, margin: "0 auto", width: "100%" }}>
        <ChateauSilhouette />
        <h1 style={{ fontFamily: F, fontSize: 40, fontWeight: 400, color: C.slateDk, margin: "8px 0 0 0", letterSpacing: "0.02em" }}>WSET Level 2</h1>
        <p style={{ fontFamily: F, fontSize: 18, color: C.river, fontStyle: "italic", margin: "4px 0 28px 0", letterSpacing: "0.04em" }}>sur les bords de la Loire</p>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", margin: "0 0 30px 0", padding: "16px 32px", background: C.riverLt, borderRadius: 14, border: "1px solid rgba(120,152,171,0.1)" }}>
          <span style={{ fontFamily: F, fontSize: 50, fontWeight: 400, color: C.slate, lineHeight: 1 }}>{days}</span>
          <span style={{ fontSize: 11, color: C.textLt, marginTop: 6, letterSpacing: "0.1em", textTransform: "uppercase", fontFamily: FS }}>jours avant l'examen</span>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 10, width: "100%", maxWidth: 300 }}>
          <input style={{ padding: "13px 18px", borderRadius: 10, border: `1px solid ${C.bgDeep}`, background: C.white, color: C.text, fontSize: 16, fontFamily: FS, outline: "none", textAlign: "center", boxShadow: "0 1px 3px rgba(0,0,0,0.03)" }} placeholder="Your name..." value={nameIn} onChange={e => setNameIn(e.target.value)} onKeyDown={e => e.key === "Enter" && login(nameIn)} autoFocus />
          <button style={btnPrimary} onClick={() => login(nameIn)}>Entrez →</button>
        </div>
        <p style={{ fontSize: 12, color: C.textLt, marginTop: 12, fontFamily: FS }}>Each player uses their own name to track progress</p>
      </div>
      <RiverWave />
    </div>
  );

  // ── MENU ────────────────────────────────────
  if (screen === "menu") {
    const acc = player.totalQs > 0 ? Math.round((player.totalCorrect/player.totalQs)*100) : 0;
    const prog = nxRank ? Math.min(100, ((player.totalPts-rank.min)/(nxRank.min-rank.min))*100) : 100;
    const wc = (player.wrongIds||[]).length;
    return (
      <div style={{ minHeight: "100vh", background: C.bg, fontFamily: F }}>
        <div style={{ maxWidth: 580, margin: "0 auto", padding: "20px 16px 40px" }}>
          {/* Player card */}
          <div style={{ ...card, padding: "18px 20px", marginBottom: 22 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
              <div><span style={{ fontSize: 24, marginRight: 8 }}>{rank.emoji}</span><span style={{ fontFamily: F, fontSize: 22, color: C.text }}>{player.name}</span></div>
              <button style={{ padding: "4px 10px", borderRadius: 6, border: `1px solid ${C.bgDeep}`, background: "transparent", color: C.textLt, fontSize: 11, cursor: "pointer", fontFamily: FS }} onClick={() => { setScreen("splash"); setPlayer(null); setNameIn(""); }}>Switch</button>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
              <span style={{ color: C.gold, fontSize: 12, fontWeight: 600, letterSpacing: "0.07em", textTransform: "uppercase", fontFamily: FS }}>{rank.name}</span>
              <span style={{ color: C.gold, fontSize: 12, fontWeight: 600, fontFamily: FS }}>{player.totalPts} pts</span>
            </div>
            <div style={{ height: 5, borderRadius: 3, background: C.bgDeep, marginBottom: 5, overflow: "hidden" }}>
              <div style={{ height: "100%", borderRadius: 3, background: `linear-gradient(90deg, ${C.river}, ${C.gold})`, width: `${prog}%`, transition: "width 0.5s ease" }}/>
            </div>
            {nxRank && <p style={{ fontSize: 11, color: C.textLt, margin: "0 0 12px 0", fontFamily: FS }}>{nxRank.min-player.totalPts} pts to {nxRank.emoji} {nxRank.name}</p>}
            <div style={{ display: "flex", gap: 6 }}>
              {[[player.totalQs,"Questions"],[`${acc}%`,"Accuracy"],[player.bestStreak||0,"Best Streak"],[days,"Days Left"]].map(([v,l],i) => (
                <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", padding: "9px 2px", background: i===3 ? C.goldLt : C.bgDeep+"55", borderRadius: 8 }}>
                  <span style={{ fontSize: 17, color: i===3 ? C.gold : C.text, fontFamily: F }}>{v}</span>
                  <span style={{ fontSize: 9, color: C.textLt, marginTop: 2, textTransform: "uppercase", letterSpacing: "0.06em", fontFamily: FS }}>{l}</span>
                </div>
              ))}
            </div>
          </div>

          <h2 style={{ fontFamily: F, fontSize: 19, color: C.slateDk, margin: "0 0 10px 0", fontWeight: 400 }}>Bloc d'étude — 15 minutes</h2>
          <div style={{ ...card, padding: "16px 18px", marginBottom: 24, cursor: "pointer", display: "flex", alignItems: "center", gap: 14, background: `linear-gradient(135deg, rgba(120,152,171,0.06) 0%, ${C.white} 100%)` }} onClick={() => startStudy()}>
            <span style={{ fontSize: 32 }}>📚</span>
            <div style={{ flex: 1 }}>
              <span style={{ fontSize: 14, fontWeight: 600, color: C.text, fontFamily: FS, display: "block", marginBottom: 2 }}>Study Block — All Categories</span>
              <span style={{ fontSize: 12, color: C.textLt, fontFamily: FS, lineHeight: 1.4, display: "block" }}>Flip through {STUDY_CARDS.length} revision cards in 15 minutes. Mark tricky ones to revisit.</span>
            </div>
            <span style={{ fontSize: 13, color: C.river, fontFamily: FS }}>→</span>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 6, marginBottom: 24, marginTop: -16 }}>
            {CATEGORIES.map((cat, i) => (
              <button key={i} style={{ padding: "8px 6px", borderRadius: 8, border: `1px solid ${C.bgDeep}`, background: C.white, cursor: "pointer", fontFamily: FS, fontSize: 10, color: C.textMd, display: "flex", flexDirection: "column", alignItems: "center", gap: 3, boxShadow: "0 1px 2px rgba(0,0,0,0.02)" }} onClick={() => startStudy(i)}>
                <span style={{ fontSize: 14 }}>{CAT_ICONS[i]}</span>
                <span style={{ lineHeight: 1.2, textAlign: "center" }}>{cat}</span>
              </button>
            ))}
          </div>

          {/* Daily Challenge */}
          <div style={{ ...card, padding: "16px 18px", marginBottom: 16, cursor: dailyDone ? "default" : "pointer", background: dailyDone ? C.vineLt : `linear-gradient(135deg, ${C.goldLt} 0%, ${C.white} 100%)`, border: dailyDone ? `1px solid rgba(106,125,92,0.2)` : `1px solid rgba(196,152,59,0.2)`, opacity: dailyDone ? 0.7 : 1 }} onClick={() => !dailyDone && startQ("daily")}>
            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
              <span style={{ fontSize: 30 }}>{dailyDone ? "✅" : "☀️"}</span>
              <div style={{ flex: 1 }}>
                <span style={{ fontSize: 14, fontWeight: 600, color: C.text, fontFamily: FS, display: "block" }}>{dailyDone ? "Today's Challenge Complete!" : "Daily Challenge — 5 Minutes"}</span>
                <span style={{ fontSize: 12, color: C.textLt, fontFamily: FS }}>{dailyDone ? "Come back tomorrow!" : "10 mixed questions, 5-min timer"}</span>
              </div>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                <span style={{ fontSize: 22, fontFamily: F, color: C.gold }}>{dailyStreak.count}</span>
                <span style={{ fontSize: 9, color: C.textLt, textTransform: "uppercase", letterSpacing: "0.06em", fontFamily: FS }}>🔥 streak</span>
              </div>
            </div>
          </div>

          <h2 style={{ fontFamily: F, fontSize: 19, color: C.slateDk, margin: "0 0 10px 0", fontWeight: 400 }}>Choisissez votre défi</h2>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 16 }}>
            {[["📖","Study Mode","15 Qs · No timer","study",true],["⚡","Speed Round","20 Qs · 15s each","speed",true],["🎯","Weak Spots",wc>=3?`${wc} to review`:"Answer more first","weak",wc>=3],["🏰","Marathon","All questions","marathon",true]].map(([ic,nm,ds,m,en]) => (
              <button key={m} style={{ ...card, display: "flex", flexDirection: "column", alignItems: "flex-start", padding: "14px 16px", cursor: en ? "pointer" : "default", textAlign: "left", fontFamily: FS, opacity: en ? 1 : 0.35 }} onClick={() => en && startQ(m)}>
                <span style={{ fontSize: 24, marginBottom: 6 }}>{ic}</span>
                <span style={{ fontSize: 13, fontWeight: 600, color: C.text, marginBottom: 2 }}>{nm}</span>
                <span style={{ fontSize: 11, color: C.textLt, lineHeight: 1.4 }}>{ds}</span>
              </button>
            ))}
          </div>

          {/* Mock Exam + Comparison Drills */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 24 }}>
            <button style={{ ...card, display: "flex", flexDirection: "column", alignItems: "flex-start", padding: "14px 16px", cursor: "pointer", textAlign: "left", fontFamily: FS, background: `linear-gradient(135deg, rgba(184,84,80,0.04) 0%, ${C.white} 100%)`, borderColor: "rgba(184,84,80,0.15)" }} onClick={() => startQ("mock")}>
              <span style={{ fontSize: 24, marginBottom: 6 }}>📝</span>
              <span style={{ fontSize: 13, fontWeight: 600, color: C.text, marginBottom: 2 }}>Mock Exam</span>
              <span style={{ fontSize: 11, color: C.textLt, lineHeight: 1.4 }}>50 Qs · 60 min · Pass at 55%</span>
            </button>
            <button style={{ ...card, display: "flex", flexDirection: "column", alignItems: "flex-start", padding: "14px 16px", cursor: "pointer", textAlign: "left", fontFamily: FS, background: `linear-gradient(135deg, rgba(120,152,171,0.04) 0%, ${C.white} 100%)`, borderColor: "rgba(120,152,171,0.15)" }} onClick={() => startCompare()}>
              <span style={{ fontSize: 24, marginBottom: 6 }}>🔀</span>
              <span style={{ fontSize: 13, fontWeight: 600, color: C.text, marginBottom: 2 }}>Spot the Difference</span>
              <span style={{ fontSize: 11, color: C.textLt, lineHeight: 1.4 }}>{COMPARISONS.length} comparison drills</span>
            </button>
          </div>

          <h2 style={{ fontFamily: F, fontSize: 19, color: C.slateDk, margin: "0 0 10px 0", fontWeight: 400 }}>Par catégorie</h2>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, marginBottom: 24 }}>
            {CATEGORIES.map((cat,i) => {
              const cs = player.catStats?.[cat]; const ca = cs&&cs.total>0 ? Math.round((cs.correct/cs.total)*100) : null;
              return (
                <button key={i} style={{ ...card, display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 14px", cursor: "pointer", fontFamily: FS }} onClick={() => startQ("study", i)}>
                  <span style={{ display: "flex", alignItems: "center", gap: 7 }}><span style={{ fontSize: 15 }}>{CAT_ICONS[i]}</span><span style={{ fontSize: 12, color: C.textMd, fontWeight: 500 }}>{cat}</span></span>
                  {ca !== null ? <span style={{ fontSize: 14, fontWeight: 700, color: ca >= 80 ? C.ok : ca >= 50 ? C.gold : C.bad, fontFamily: F }}>{ca}%</span> : <span style={{ fontSize: 9, color: C.textLt, letterSpacing: "0.08em", textTransform: "uppercase" }}>NEW</span>}
                </button>
              );
            })}
          </div>

          {/* Wine Map */}
          <button style={{ ...card, display: "flex", alignItems: "center", gap: 14, padding: "16px 18px", marginBottom: 10, cursor: "pointer", width: "100%", textAlign: "left", background: `linear-gradient(135deg, rgba(106,125,92,0.04) 0%, ${C.white} 100%)`, border: `1px solid rgba(106,125,92,0.15)` }} onClick={() => onWineMap && onWineMap()}>
            <span style={{ fontSize: 30 }}>🗺</span>
            <div>
              <span style={{ fontSize: 14, fontWeight: 600, color: C.slateDk, fontFamily: FS, display: "block" }}>Wine Map</span>
              <span style={{ fontSize: 12, color: C.textLt, fontFamily: FS }}>Explore 34 wine regions around the world</span>
            </div>
          </button>

          {/* Multiplayer */}
          <button style={{ ...card, display: "flex", alignItems: "center", gap: 14, padding: "16px 18px", marginBottom: 24, cursor: "pointer", width: "100%", textAlign: "left", background: `linear-gradient(135deg, rgba(86,107,125,0.03) 0%, ${C.white} 100%)`, border: `1px solid rgba(86,107,125,0.15)` }} onClick={() => onMultiplayer && onMultiplayer(player.name)}>
            <span style={{ fontSize: 30 }}>⚔️</span>
            <div>
              <span style={{ fontSize: 14, fontWeight: 600, color: C.slateDk, fontFamily: FS, display: "block" }}>Le Chemin du Château</span>
              <span style={{ fontSize: 12, color: C.textLt, fontFamily: FS }}>Board game — race to the château vs wife or AI</span>
            </div>
          </button>

          <h2 style={{ fontFamily: F, fontSize: 19, color: C.slateDk, margin: "0 0 10px 0", fontWeight: 400 }}>Classement</h2>
          <div style={{ ...card, overflow: "hidden" }}>
            {lb.length === 0 ? <p style={{ color: C.textLt, fontSize: 13, textAlign: "center", padding: "22px 16px", fontFamily: FS }}>Complete a quiz to appear here!</p>
            : lb.slice(0,10).map((e,i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", padding: "9px 14px", borderBottom: `1px solid ${C.bgDeep}50`, gap: 8, background: e.name===player.name ? C.goldLt : "transparent" }}>
                <span style={{ width: 28, fontSize: 13, fontWeight: 600, color: C.gold, fontFamily: F }}>{i===0?"🥇":i===1?"🥈":i===2?"🥉":`${i+1}`}</span>
                <span style={{ flex: 1, fontSize: 13, fontWeight: 500, color: C.text, fontFamily: FS }}>{e.name}</span>
                <span style={{ fontSize: 10, color: C.textLt, textTransform: "capitalize", padding: "2px 7px", background: C.riverLt, borderRadius: 5, fontFamily: FS }}>{e.mode}</span>
                <span style={{ fontSize: 13, fontWeight: 600, color: C.gold, width: 52, textAlign: "right", fontFamily: F }}>{e.score}</span>
              </div>
            ))}
          </div>
          <div style={{ marginTop: 20 }}><RiverWave /></div>
        </div>
      </div>
    );
  }

  // ── STUDY BLOCK ──────────────────────────────
  if (screen === "study") {
    const sc = studyCards[studyIdx];
    const mins = Math.floor(studyTimer / 60);
    const secs = studyTimer % 60;
    const timeStr = `${mins}:${secs.toString().padStart(2, "0")}`;
    const timePct = (studyTimer / 900) * 100;
    const isMarked = studyMarked.has(studyIdx);
    const markedCount = studyMarked.size;
    const totalCards = studyCards.length;

    return (
      <div style={{ minHeight: "100vh", background: C.bg, fontFamily: F }}>
        <div style={{ maxWidth: 580, margin: "0 auto", padding: "16px 16px 40px" }}>

          {/* Header */}
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
            <button style={{ width: 34, height: 34, borderRadius: 8, border: `1px solid ${C.bgDeep}`, background: C.white, color: C.textLt, fontSize: 15, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: FS }} onClick={() => setScreen("menu")}>✕</button>
            <div style={{ flex: 1, height: 4, borderRadius: 2, background: C.bgDeep, overflow: "hidden" }}>
              <div style={{ height: "100%", background: studyTimer > 180 ? `linear-gradient(90deg, ${C.river}, ${C.vine})` : studyTimer > 60 ? C.gold : C.bad, borderRadius: 2, width: `${timePct}%`, transition: "width 1s linear" }}/>
            </div>
            <span style={{ fontSize: 16, fontFamily: F, color: studyTimer <= 60 ? C.bad : studyTimer <= 180 ? C.gold : C.slate, fontWeight: 400, minWidth: 48, textAlign: "right" }}>
              {studyTimer <= 0 ? "⏰" : `⏱ ${timeStr}`}
            </span>
          </div>

          {/* Timer done banner */}
          {studyTimer <= 0 && (
            <div style={{ ...card, padding: "14px 16px", marginBottom: 12, background: C.goldLt, textAlign: "center" }}>
              <p style={{ fontFamily: F, fontSize: 17, color: C.gold, margin: "0 0 4px 0", fontStyle: "italic" }}>Temps écoulé! Time's up!</p>
              <p style={{ fontFamily: FS, fontSize: 12, color: C.textMd, margin: 0 }}>You can keep reviewing or jump into a quiz now.</p>
            </div>
          )}

          {/* Card counter & controls */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 10, color: C.textMd, padding: "3px 10px", background: C.riverLt, borderRadius: 16, letterSpacing: "0.06em", textTransform: "uppercase", fontFamily: FS }}>
                <span>{sc ? CAT_ICONS[sc.cat] : ""}</span>{sc ? CATEGORIES[sc.cat] : ""}
              </span>
              <span style={{ fontSize: 12, color: C.textLt, fontFamily: FS }}>{studyIdx + 1} / {totalCards}</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              {markedCount > 0 && <span style={{ fontSize: 11, color: C.gold, fontFamily: FS }}>🔖 {markedCount} marked</span>}
              <button style={{ padding: "4px 10px", borderRadius: 6, border: `1px solid ${C.bgDeep}`, background: studyPaused ? C.goldLt : "transparent", color: studyPaused ? C.gold : C.textLt, fontSize: 11, cursor: "pointer", fontFamily: FS }} onClick={() => setStudyPaused(p => !p)}>
                {studyPaused ? "▶ Resume" : "⏸ Pause"}
              </button>
            </div>
          </div>

          {/* Flashcard */}
          {sc && (
            <div
              onClick={() => { if (!studyFlipped) setStudyFlipped(true); }}
              style={{
                ...card,
                padding: "28px 24px",
                marginBottom: 14,
                minHeight: studyFlipped ? "auto" : 200,
                cursor: studyFlipped ? "default" : "pointer",
                display: "flex",
                flexDirection: "column",
                justifyContent: "center",
                background: studyFlipped
                  ? `linear-gradient(135deg, rgba(106,125,92,0.04) 0%, ${C.white} 100%)`
                  : C.white,
                borderColor: studyFlipped ? "rgba(106,125,92,0.2)" : C.bgDeep,
                transition: "all 0.25s ease",
                position: "relative",
              }}
            >
              {/* Flip hint */}
              <div style={{ position: "absolute", top: 12, right: 14, fontSize: 10, color: C.textLt, fontFamily: FS, letterSpacing: "0.04em", textTransform: "uppercase", opacity: 0.6 }}>
                {studyFlipped ? "answer" : "tap to flip"}
              </div>
              {/* Bookmark button */}
              <button
                onClick={(e) => { e.stopPropagation(); setStudyMarked(prev => { const n = new Set(prev); if (n.has(studyIdx)) n.delete(studyIdx); else n.add(studyIdx); return n; }); }}
                style={{ position: "absolute", top: 10, left: 14, fontSize: 18, background: "transparent", border: "none", cursor: "pointer", padding: "2px", opacity: isMarked ? 1 : 0.3 }}
              >
                {isMarked ? "🔖" : "🏷"}
              </button>

              {!studyFlipped ? (
                <div style={{ textAlign: "center", padding: "10px 0" }}>
                  <p style={{ fontFamily: F, fontSize: 22, color: C.text, margin: 0, lineHeight: 1.45, fontWeight: 400 }}>{sc.front}</p>
                </div>
              ) : (
                <div style={{ padding: "4px 0" }}>
                  <p style={{ fontFamily: FS, fontSize: 14, color: C.textMd, margin: 0, lineHeight: 1.7, whiteSpace: "pre-wrap" }}>{sc.back}</p>
                </div>
              )}
            </div>
          )}

          {/* Mini-quiz after flip */}
          {studyFlipped && sc && studyShuffledQ && (
            <div style={{ ...card, padding: "16px 18px", marginBottom: 14, background: studyQuizSel !== null ? (studyQuizSel === studyShuffledQ.a ? "rgba(92,138,83,0.03)" : "rgba(184,84,80,0.03)") : C.white }}>
              <p style={{ fontFamily: FS, fontSize: 12, color: C.textLt, margin: "0 0 4px 0", letterSpacing: "0.06em", textTransform: "uppercase", fontWeight: 600 }}>
                {studyQuizSel !== null ? (studyQuizSel === studyShuffledQ.a ? "✓ Correct!" : "✗ Not quite") : "Quick check"}
              </p>
              <p style={{ fontFamily: F, fontSize: 16, color: C.text, margin: "0 0 12px 0", lineHeight: 1.45 }}>{studyShuffledQ.q}</p>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {studyShuffledQ.o.map((opt, i) => {
                  let bg = C.white, bdr = C.bgDeep, tc = C.text;
                  if (studyQuizSel !== null) {
                    if (i === studyShuffledQ.a) { bg = "rgba(92,138,83,0.08)"; bdr = "rgba(92,138,83,0.35)"; }
                    else if (i === studyQuizSel && i !== studyShuffledQ.a) { bg = "rgba(184,84,80,0.06)"; bdr = "rgba(184,84,80,0.3)"; }
                    else { tc = C.textLt; }
                  }
                  return (
                    <button key={i} style={{
                      display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", borderRadius: 8,
                      border: `1px solid ${bdr}`, background: bg, cursor: studyQuizSel !== null ? "default" : "pointer",
                      textAlign: "left", fontFamily: FS, color: tc, fontSize: 13, transition: "all 0.15s ease",
                    }} onClick={() => {
                      if (studyQuizSel !== null) return;
                      setStudyQuizSel(i);
                      setStudyQuizScore(prev => ({correct: prev.correct + (i === studyShuffledQ.a ? 1 : 0), total: prev.total + 1}));
                      // Auto-mark if wrong
                      if (i !== studyShuffledQ.a) setStudyMarked(prev => { const n = new Set(prev); n.add(studyIdx); return n; });
                    }} disabled={studyQuizSel !== null}>
                      <span style={{ width: 22, height: 22, borderRadius: 6, background: studyQuizSel !== null && i === studyShuffledQ.a ? "rgba(92,138,83,0.12)" : C.riverLt, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 700, color: studyQuizSel !== null && i === studyShuffledQ.a ? C.ok : C.slate, flexShrink: 0 }}>{String.fromCharCode(65+i)}</span>
                      <span>{opt}</span>
                    </button>
                  );
                })}
              </div>
              {/* Retention score */}
              {studyQuizSel !== null && studyQuizScore.total > 0 && (
                <div style={{ marginTop: 10, display: "flex", alignItems: "center", gap: 8 }}>
                  <div style={{ flex: 1, height: 3, borderRadius: 2, background: C.bgDeep, overflow: "hidden" }}>
                    <div style={{ height: "100%", borderRadius: 2, background: studyQuizScore.correct/studyQuizScore.total >= 0.7 ? C.ok : C.gold, width: `${(studyQuizScore.correct/studyQuizScore.total)*100}%`, transition: "width 0.3s ease" }}/>
                  </div>
                  <span style={{ fontSize: 11, color: C.textMd, fontFamily: FS, fontWeight: 500 }}>{studyQuizScore.correct}/{studyQuizScore.total} retained</span>
                </div>
              )}
            </div>
          )}

          {/* Navigation */}
          <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
            <button
              style={{ flex: 1, padding: "12px", borderRadius: 10, border: `1px solid ${C.bgDeep}`, background: C.white, color: studyIdx > 0 ? C.textMd : C.textLt, fontSize: 14, cursor: studyIdx > 0 ? "pointer" : "default", fontFamily: FS, opacity: studyIdx > 0 ? 1 : 0.4 }}
              onClick={() => { if (studyIdx > 0) { setStudyIdx(i => i - 1); setStudyFlipped(false); setStudyQuizSel(null); } }}
              disabled={studyIdx <= 0}
            >
              ← Previous
            </button>
            {studyFlipped && studyQuizSel !== null ? (
              <button
                style={{ flex: 1, ...btnPrimary, fontSize: 14, opacity: studyIdx < totalCards - 1 ? 1 : 0.4 }}
                onClick={() => { if (studyIdx < totalCards - 1) { setStudyIdx(i => i + 1); setStudyFlipped(false); setStudyQuizSel(null); } }}
                disabled={studyIdx >= totalCards - 1}
              >
                Next Card →
              </button>
            ) : studyFlipped ? (
              <button style={{ flex: 1, padding: "12px", borderRadius: 10, border: `1px solid ${C.bgDeep}`, background: C.bgDeep+"55", color: C.textLt, fontSize: 13, fontFamily: FS, cursor: "default" }} disabled>
                Answer to continue
              </button>
            ) : (
              <button
                style={{ flex: 1, ...btnPrimary, fontSize: 14 }}
                onClick={() => setStudyFlipped(true)}
              >
                Flip Card
              </button>
            )}
          </div>

          {/* Marked cards quick jump */}
          {markedCount > 0 && (
            <div style={{ ...card, padding: "12px 14px", marginBottom: 14 }}>
              <p style={{ fontSize: 11, color: C.textMd, margin: "0 0 8px 0", fontFamily: FS, fontWeight: 600, letterSpacing: "0.04em", textTransform: "uppercase" }}>🔖 Marked for review</p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
                {[...studyMarked].map(idx => (
                  <button key={idx} style={{ padding: "4px 10px", borderRadius: 6, border: `1px solid ${C.goldLt}`, background: idx === studyIdx ? C.goldLt : "transparent", color: C.gold, fontSize: 11, cursor: "pointer", fontFamily: FS, fontWeight: 500 }}
                    onClick={() => { setStudyIdx(idx); setStudyFlipped(false); setStudyQuizSel(null); }}>
                    {studyCards[idx]?.front?.split("—")[0]?.trim() || `Card ${idx+1}`}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Quick actions */}
          <div style={{ display: "flex", gap: 8 }}>
            <button style={{ flex: 1, padding: "10px", borderRadius: 8, border: `1px solid ${C.bgDeep}`, background: C.white, color: C.textMd, fontSize: 12, cursor: "pointer", fontFamily: FS }}
              onClick={() => { const cards = [...studyCards]; for (let i = cards.length-1; i > 0; i--) { const j = Math.floor(Math.random()*(i+1)); [cards[i],cards[j]]=[cards[j],cards[i]]; } setStudyCards(cards); setStudyIdx(0); setStudyFlipped(false); setStudyMarked(new Set()); setStudyQuizSel(null); setStudyQuizScore({correct:0,total:0}); }}>
              🔀 Shuffle
            </button>
            <button style={{ flex: 1, padding: "10px", borderRadius: 8, border: `1px solid ${C.bgDeep}`, background: C.white, color: C.vine, fontSize: 12, cursor: "pointer", fontFamily: FS }}
              onClick={() => setScreen("menu")}>
              ✓ Done — Back to Menu
            </button>
          </div>

        </div>
      </div>
    );
  }

  // ── COMPARISON DRILLS ────────────────────────
  if (screen === "compare") {
    const comp = COMPARISONS[compIdx];
    const totalComps = COMPARISONS.length;
    return (
      <div style={{ minHeight: "100vh", background: C.bg, fontFamily: F }}>
        <div style={{ maxWidth: 580, margin: "0 auto", padding: "16px 16px 40px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
            <button style={{ width: 34, height: 34, borderRadius: 8, border: `1px solid ${C.bgDeep}`, background: C.white, color: C.textLt, fontSize: 15, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: FS }} onClick={() => setScreen("menu")}>✕</button>
            <div style={{ flex: 1, height: 4, borderRadius: 2, background: C.bgDeep, overflow: "hidden" }}>
              <div style={{ height: "100%", background: `linear-gradient(90deg, ${C.river}, ${C.vine})`, borderRadius: 2, width: `${((compIdx+(compQuizSel!==null?1:0))/totalComps)*100}%`, transition: "width 0.4s ease" }}/>
            </div>
            <span style={{ fontSize: 12, color: C.textLt, fontFamily: FS }}>{compIdx+1}/{totalComps}</span>
            {compScore.total > 0 && <span style={{ fontSize: 12, color: C.gold, fontFamily: FS, fontWeight: 600 }}>{compScore.correct}/{compScore.total}</span>}
          </div>

          <h3 style={{ fontFamily: F, fontSize: 20, color: C.slateDk, margin: "0 0 14px 0", fontWeight: 400, textAlign: "center" }}>{comp.title}</h3>

          {/* Side by side comparison */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 14 }}>
            {[comp.a, comp.b].map((side, si) => (
              <div key={si} style={{ ...card, padding: "14px 12px" }}>
                <h4 style={{ fontFamily: FS, fontSize: 13, fontWeight: 700, color: si === 0 ? C.river : C.vine, margin: "0 0 10px 0", textAlign: "center" }}>{side.label}</h4>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {side.points.map((pt, pi) => (
                    <div key={pi} style={{ fontSize: 12, color: C.textMd, fontFamily: FS, lineHeight: 1.5, padding: "5px 8px", background: si===0 ? C.riverLt : C.vineLt, borderRadius: 6 }}>{pt}</div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Quiz */}
          {compShuffledQ && (
          <div style={{ ...card, padding: "14px 16px", marginBottom: 14 }}>
            <p style={{ fontFamily: FS, fontSize: 11, color: C.textLt, margin: "0 0 4px 0", letterSpacing: "0.06em", textTransform: "uppercase", fontWeight: 600 }}>
              {compQuizSel !== null ? (compQuizSel === compShuffledQ.a ? "✓ Correct!" : "✗ Not quite") : "Can you tell the difference?"}
            </p>
            <p style={{ fontFamily: F, fontSize: 16, color: C.text, margin: "0 0 10px 0", lineHeight: 1.45 }}>{compShuffledQ.q}</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
              {compShuffledQ.o.map((opt, i) => {
                let bg = C.white, bdr = C.bgDeep, tc = C.text;
                if (compQuizSel !== null) {
                  if (i === compShuffledQ.a) { bg = "rgba(92,138,83,0.08)"; bdr = "rgba(92,138,83,0.35)"; }
                  else if (i === compQuizSel && i !== compShuffledQ.a) { bg = "rgba(184,84,80,0.06)"; bdr = "rgba(184,84,80,0.3)"; }
                  else { tc = C.textLt; }
                }
                return (
                  <button key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", borderRadius: 8, border: `1px solid ${bdr}`, background: bg, cursor: compQuizSel !== null ? "default" : "pointer", textAlign: "left", fontFamily: FS, color: tc, fontSize: 13 }}
                    onClick={() => { if (compQuizSel !== null) return; setCompQuizSel(i); setCompScore(prev => ({correct: prev.correct + (i === compShuffledQ.a ? 1 : 0), total: prev.total + 1})); }}
                    disabled={compQuizSel !== null}>
                    <span style={{ width: 22, height: 22, borderRadius: 6, background: compQuizSel !== null && i === compShuffledQ.a ? "rgba(92,138,83,0.12)" : C.riverLt, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 700, color: compQuizSel !== null && i === compShuffledQ.a ? C.ok : C.slate, flexShrink: 0 }}>{String.fromCharCode(65+i)}</span>
                    <span>{opt}</span>
                  </button>
                );
              })}
            </div>
          </div>
          )}

          {/* Navigation */}
          <div style={{ display: "flex", gap: 8 }}>
            <button style={{ flex: 1, padding: "12px", borderRadius: 10, border: `1px solid ${C.bgDeep}`, background: C.white, color: compIdx > 0 ? C.textMd : C.textLt, fontSize: 14, cursor: compIdx > 0 ? "pointer" : "default", fontFamily: FS, opacity: compIdx > 0 ? 1 : 0.4 }}
              onClick={() => { if (compIdx > 0) { setCompIdx(i => i-1); setCompQuizSel(null); } }} disabled={compIdx <= 0}>
              ← Previous
            </button>
            {compQuizSel !== null ? (
              compIdx < totalComps - 1 ? (
                <button style={{ flex: 1, ...btnPrimary, fontSize: 14 }}
                  onClick={() => { setCompIdx(i => i+1); setCompQuizSel(null); }}>
                  Next Comparison →
                </button>
              ) : (
                <button style={{ flex: 1, ...btnPrimary, fontSize: 14 }} onClick={() => setScreen("menu")}>
                  Done! {compScore.correct}/{compScore.total} →
                </button>
              )
            ) : (
              <button style={{ flex: 1, padding: "12px", borderRadius: 10, border: `1px solid ${C.bgDeep}`, background: C.bgDeep+"55", color: C.textLt, fontSize: 13, fontFamily: FS, cursor: "default" }} disabled>
                Answer to continue
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ── QUIZ ────────────────────────────────────
  if (screen === "quiz") {
    const q = quizQs[qi]; const pp = ((qi + (showExp?1:0))/quizQs.length)*100;
    const sm = sStreak>=10?"3×":sStreak>=5?"2×":"";
    const needConf = !confidence && !showExp && mode !== "speed"; // confidence step (skip in speed mode)
    const mockMins = Math.floor(mockTimer/60); const mockSecs = mockTimer%60;
    const dailyMins = Math.floor(tLeft/60); const dailySecs = tLeft%60;
    return (
      <div style={{ minHeight: "100vh", background: C.bg, fontFamily: F }}>
        <div style={{ maxWidth: 580, margin: "0 auto", padding: "16px 16px 40px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
            <button style={{ width: 34, height: 34, borderRadius: 8, border: `1px solid ${C.bgDeep}`, background: C.white, color: C.textLt, fontSize: 15, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: FS }} onClick={() => setScreen("menu")}>✕</button>
            <div style={{ flex: 1, height: 4, borderRadius: 2, background: C.bgDeep, overflow: "hidden" }}><div style={{ height: "100%", background: mode==="mock" ? `linear-gradient(90deg, ${C.bad}, ${C.gold})` : `linear-gradient(90deg, ${C.river}, ${C.vine})`, borderRadius: 2, width: `${pp}%`, transition: "width 0.4s ease" }}/></div>
            <span style={{ fontSize: 12, color: C.textLt, fontFamily: FS }}>{qi+1}/{quizQs.length}</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: C.gold, display: "flex", alignItems: "center", gap: 7, fontFamily: FS }}>{mode==="mock" ? `${sCorrect}/${qi+(showExp?1:0)} correct` : `${sScore} pts`}{sm && <span style={{ fontSize: 10, background: C.goldLt, color: C.gold, padding: "2px 7px", borderRadius: 5 }}>🔥 {sm}</span>}</span>
            {sStreak>=3 && mode!=="mock" && <span style={{ fontSize: 11, color: C.gold, fontFamily: FS }}>Streak: {sStreak}</span>}
            {mode==="speed" && <span style={{ fontSize: 19, fontFamily: F, color: tLeft<=5?C.bad:C.slate }}>⏱ {tLeft}s</span>}
            {mode==="mock" && <span style={{ fontSize: 16, fontFamily: F, color: mockTimer<=300?C.bad:mockTimer<=600?C.gold:C.slate }}>⏱ {mockMins}:{mockSecs.toString().padStart(2,"0")}</span>}
            {mode==="daily" && <span style={{ fontSize: 16, fontFamily: F, color: tLeft<=60?C.bad:tLeft<=120?C.gold:C.slate }}>⏱ {dailyMins}:{dailySecs.toString().padStart(2,"0")}</span>}
          </div>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 10, color: C.textMd, padding: "3px 10px", background: C.riverLt, borderRadius: 16, marginBottom: 10, letterSpacing: "0.06em", textTransform: "uppercase", fontFamily: FS }}><span>{CAT_ICONS[q.cat]}</span>{CATEGORIES[q.cat]}</div>
          <div style={{ ...card, marginBottom: 16, padding: "20px 18px" }}>
            <p style={{ fontFamily: F, fontSize: 19, lineHeight: 1.55, color: C.text, margin: 0 }}>{q.q}</p>
          </div>

          {/* Confidence betting step */}
          {needConf && (
            <div style={{ marginBottom: 14 }}>
              <p style={{ fontSize: 11, color: C.textLt, margin: "0 0 8px 0", fontFamily: FS, letterSpacing: "0.06em", textTransform: "uppercase", fontWeight: 600 }}>How confident are you?</p>
              <div style={{ display: "flex", gap: 6 }}>
                {[["sure","💪","Sure"],["think","🤔","Think so"],["noidea","😬","No idea"]].map(([k,em,lb]) => (
                  <button key={k} style={{ flex: 1, padding: "10px 8px", borderRadius: 8, border: `1px solid ${C.bgDeep}`, background: C.white, cursor: "pointer", fontFamily: FS, fontSize: 12, color: C.textMd, display: "flex", flexDirection: "column", alignItems: "center", gap: 3, boxShadow: "0 1px 3px rgba(0,0,0,0.02)" }}
                    onClick={() => setConfidence(k)}>
                    <span style={{ fontSize: 20 }}>{em}</span><span>{lb}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Answer options — shown after confidence pick (or always in speed mode) */}
          {(confidence || mode === "speed") && (
            <div style={{ display: "flex", flexDirection: "column", gap: 7, marginBottom: 14 }}>
              {q.o.map((opt,i) => {
                let bg = C.white, bdr = C.bgDeep, tc = C.text, lBg = C.riverLt, lc = C.slate;
                if (showExp) {
                  if (i===q.a) { bg = "rgba(92,138,83,0.05)"; bdr = "rgba(92,138,83,0.3)"; lBg = "rgba(92,138,83,0.1)"; lc = C.ok; }
                  else if (i===sel&&i!==q.a) { bg = "rgba(184,84,80,0.04)"; bdr = "rgba(184,84,80,0.25)"; lBg = "rgba(184,84,80,0.08)"; lc = C.bad; }
                  else { tc = C.textLt; lBg = C.bgDeep+"55"; lc = C.textLt; }
                }
                return (
                  <button key={i} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", borderRadius: 10, border: `1px solid ${bdr}`, background: bg, cursor: showExp?"default":"pointer", textAlign: "left", fontFamily: FS, color: tc, boxShadow: "0 1px 3px rgba(0,0,0,0.02)", transition: "all 0.15s ease" }} onClick={() => doAnswer(i)} disabled={showExp}>
                    <span style={{ width: 26, height: 26, borderRadius: 6, background: lBg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, color: lc, flexShrink: 0, fontFamily: FS }}>{String.fromCharCode(65+i)}</span>
                    <span style={{ fontSize: 13, lineHeight: 1.4 }}>{opt}</span>
                  </button>
                );
              })}
            </div>
          )}

          {showExp && (
            <div style={{ ...card, padding: "14px 16px" }}>
              {animOk ? <div style={{ color: C.ok, fontWeight: 600, fontSize: 14, marginBottom: 8, fontFamily: FS }}>✓ Correct!{confidence === "noidea" && " (Lucky guess?)"}{mode!=="mock" && ` +${sStreak>=10?30:sStreak>=5?20:10}`}{mode==="speed"&&tLeft>0?` +${Math.min(5,Math.ceil(tLeft/3))} speed bonus`:""}</div>
                       : <div style={{ color: C.bad, fontWeight: 600, fontSize: 14, marginBottom: 8, fontFamily: FS }}>✗ {sel===-1?"Temps écoulé!":"Pas tout à fait"}{confidence === "sure" && " — overconfident!"}</div>}
              {confidence && (
                <div style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 10, padding: "3px 10px", borderRadius: 10, marginBottom: 8, fontFamily: FS, color: C.textMd, background: confidence==="sure" ? (animOk ? "rgba(92,138,83,0.06)" : "rgba(184,84,80,0.06)") : confidence==="noidea" ? (animOk ? "rgba(196,152,59,0.1)" : "rgba(184,84,80,0.06)") : "rgba(120,152,171,0.08)" }}>
                  {confidence==="sure" ? "💪" : confidence==="think" ? "🤔" : "😬"} You said "{confidence==="sure"?"Sure":confidence==="think"?"Think so":"No idea"}" — {animOk?"right!":"wrong"}
                </div>
              )}
              <p style={{ fontSize: 13, lineHeight: 1.6, color: C.textMd, margin: "0 0 12px 0", fontFamily: FS }}>{q.exp}</p>
              <button style={{ ...btnPrimary, width: "100%", fontSize: 14 }} onClick={nextQ}>{qi+1>=quizQs.length?"Voir les résultats →":"Question suivante →"}</button>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ── RESULTS ─────────────────────────────────
  if (screen === "results") {
    const pct = quizQs.length>0 ? Math.round((sCorrect/quizQs.length)*100) : 0;
    const isMock = mode === "mock";
    const isDaily = mode === "daily";
    const passed = pct >= 55;
    const grade = isMock ? (passed ? "PASS" : "FAIL") : pct>=90?"Exceptionnel!":pct>=75?"Excellent!":pct>=55?"Réussi!":"Continuez!";
    const gc = isMock ? (passed ? C.ok : C.bad) : pct>=90?C.ok:pct>=75?C.gold:pct>=55?C.river:C.bad;
    const hasConf = confStats.sure.t + confStats.think.t + confStats.noidea.t > 0;
    return (
      <div style={{ minHeight: "100vh", background: C.bg, fontFamily: F, display: "flex", flexDirection: "column" }}>
        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
          <div style={{ ...card, padding: "28px 22px", maxWidth: 420, width: "100%", textAlign: "center" }}>

            {/* Mock exam banner */}
            {isMock && (
              <div style={{ padding: "10px 16px", borderRadius: 10, marginBottom: 16, background: passed ? "rgba(92,138,83,0.06)" : "rgba(184,84,80,0.06)", border: `1px solid ${passed ? "rgba(92,138,83,0.2)" : "rgba(184,84,80,0.2)"}` }}>
                <span style={{ fontFamily: FS, fontSize: 11, letterSpacing: "0.08em", textTransform: "uppercase", color: C.textMd }}>📝 Mock Exam Result</span>
              </div>
            )}
            {isDaily && (
              <div style={{ padding: "10px 16px", borderRadius: 10, marginBottom: 16, background: C.goldLt, border: `1px solid rgba(196,152,59,0.2)` }}>
                <span style={{ fontFamily: FS, fontSize: 12, color: C.gold, fontWeight: 600 }}>☀️ Daily Challenge — 🔥 {dailyStreak.count} day streak!</span>
              </div>
            )}

            <div style={{ width: 96, height: 96, borderRadius: "50%", border: `3px solid ${gc}30`, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 14px" }}>
              <span style={{ fontFamily: F, fontSize: 36, color: gc }}>{pct}%</span>
            </div>
            <h2 style={{ fontFamily: F, fontSize: 26, margin: "0 0 4px 0", color: gc, fontWeight: 400 }}>{grade}</h2>
            <p style={{ color: C.textMd, fontSize: 14, margin: "0 0 18px 0", fontFamily: FS }}>{sCorrect} of {quizQs.length} correct</p>

            {!isMock && (
              <div style={{ display: "flex", gap: 8, justifyContent: "center", marginBottom: 16 }}>
                {[[sScore,"Points"],[bStreak,"Best Streak"],[`${rank?.emoji} ${rank?.name}`,"Rank"]].map(([v,l],i) => (
                  <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", padding: "10px 6px", background: C.bgDeep+"55", borderRadius: 10 }}>
                    <span style={{ fontSize: 14, color: C.gold, fontFamily: F }}>{v}</span>
                    <span style={{ fontSize: 9, color: C.textLt, marginTop: 3, textTransform: "uppercase", letterSpacing: "0.04em", fontFamily: FS }}>{l}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Confidence calibration */}
            {hasConf && (
              <div style={{ textAlign: "left", padding: "12px 14px", background: C.bgDeep+"55", borderRadius: 10, marginBottom: 16 }}>
                <p style={{ fontFamily: FS, fontSize: 11, fontWeight: 600, color: C.textMd, margin: "0 0 8px 0", letterSpacing: "0.04em", textTransform: "uppercase" }}>Confidence Calibration</p>
                {[["sure","💪 Sure",confStats.sure],["think","🤔 Think so",confStats.think],["noidea","😬 No idea",confStats.noidea]].map(([k,label,st]) => {
                  if (st.t === 0) return null;
                  const pctC = Math.round((st.c/st.t)*100);
                  const isGood = (k==="sure" && pctC >= 80) || (k==="noidea" && pctC <= 30);
                  const isBad = (k==="sure" && pctC < 50) || (k==="noidea" && pctC > 60);
                  return (
                    <div key={k} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 5 }}>
                      <span style={{ fontSize: 12, fontFamily: FS, width: 90, color: C.textMd }}>{label}</span>
                      <div style={{ flex: 1, height: 4, borderRadius: 2, background: C.bgDeep, overflow: "hidden" }}>
                        <div style={{ height: "100%", borderRadius: 2, width: `${pctC}%`, background: isGood ? C.ok : isBad ? C.bad : C.gold }}/>
                      </div>
                      <span style={{ fontSize: 11, fontFamily: FS, color: isGood ? C.ok : isBad ? C.bad : C.textMd, fontWeight: 600, width: 50, textAlign: "right" }}>{st.c}/{st.t} ({pctC}%)</span>
                    </div>
                  );
                })}
                <p style={{ fontSize: 10, color: C.textLt, margin: "6px 0 0 0", fontFamily: FS, fontStyle: "italic" }}>
                  {confStats.sure.t > 0 && confStats.sure.c/confStats.sure.t < 0.5 ? "You're overconfident on 'Sure' answers — slow down!" :
                   confStats.noidea.t > 0 && confStats.noidea.c/confStats.noidea.t > 0.6 ? "You know more than you think! Trust yourself." :
                   "Good calibration — your confidence matches your knowledge."}
                </p>
              </div>
            )}

            {isMock && (
              <p style={{ fontSize: 13, color: gc, margin: "0 0 16px 0", fontWeight: 600, fontFamily: FS }}>
                {passed ? `You passed! ${pct}% vs 55% pass mark.` : `${pct}% — you need 55% to pass. Keep going!`}
              </p>
            )}
            {!isMock && (
              <p style={{ fontSize: 13, color: C.textMd, margin: "0 0 16px 0", fontStyle: "italic" }}>{pct>=55?"55% is the WSET pass mark — you'd pass!":"55% is the pass mark — keep practising!"}</p>
            )}

            <div style={{ display: "flex", gap: 8 }}>
              <button style={{ ...btnPrimary, flex: 1, fontSize: 13 }} onClick={() => startQ(mode, catF)}>{isMock ? "Retake Exam" : "Encore une fois"}</button>
              <button style={{ flex: 1, padding: "12px", borderRadius: 10, border: `1px solid ${C.bgDeep}`, background: "transparent", color: C.textMd, fontSize: 13, cursor: "pointer", fontFamily: FS }} onClick={() => setScreen("menu")}>Menu</button>
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
