import React, { useEffect, useRef } from 'react';
import { C, F, FS } from '../utils/theme.js';

// ═══════════════════════════════════════════════
// Loire Valley Board — "Le Chemin du Château"
// ═══════════════════════════════════════════════
// A winding path through vineyards to a château.
// 16 spaces (0=start, 15=finish).
// Land on opponent → bump them back 2 spaces.
// First to the château wins.

const BOARD_SPACES = 16; // 0..15

// The winding path coordinates (x, y) for each space on a 400×520 board
// Snakes from bottom-left upward toward the château
const PATH = [
  { x: 60,  y: 480, label: "🍇" },   // 0  Start - vineyard
  { x: 140, y: 470 },                  // 1
  { x: 220, y: 455 },                  // 2
  { x: 300, y: 440 },                  // 3
  { x: 360, y: 410 },                  // 4  — bend
  { x: 340, y: 365 },                  // 5
  { x: 270, y: 345 },                  // 6
  { x: 190, y: 335 },                  // 7
  { x: 110, y: 320, label: "🌊" },    // 8  — river crossing
  { x: 80,  y: 275 },                  // 9
  { x: 120, y: 230 },                  // 10
  { x: 200, y: 210 },                  // 11
  { x: 280, y: 195 },                  // 12
  { x: 340, y: 165 },                  // 13 — approach
  { x: 310, y: 120 },                  // 14
  { x: 240, y: 80, label: "🏰" },     // 15 Finish - château!
];

// Special space effects
const SPACE_TYPES = {
  0:  { bg: "rgba(106,125,92,0.15)", ring: "#6A7D5C" },  // vineyard green
  8:  { bg: "rgba(120,152,171,0.15)", ring: "#7898AB" },  // river blue
  15: { bg: "rgba(196,152,59,0.15)", ring: "#C4983B" },   // château gold
};

export default function GameBoard({ p1Pos, p2Pos, p1Name, p2Name, totalSpaces = BOARD_SPACES, highlight = null, bumped = null }) {
  const canvasW = 420;
  const canvasH = 540;

  // Draw the path as SVG
  const pathD = PATH.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');

  return (
    <div style={{ position: "relative", width: "100%", maxWidth: canvasW, margin: "0 auto" }}>
      <svg viewBox={`0 0 ${canvasW} ${canvasH}`} style={{ width: "100%", display: "block" }}>

        {/* Background — sky gradient */}
        <defs>
          <linearGradient id="skyGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#E8DFD4" />
            <stop offset="100%" stopColor="#FAF6F0" />
          </linearGradient>
          <linearGradient id="riverGrad" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="rgba(120,152,171,0.08)" />
            <stop offset="50%" stopColor="rgba(120,152,171,0.15)" />
            <stop offset="100%" stopColor="rgba(120,152,171,0.08)" />
          </linearGradient>
        </defs>
        <rect width={canvasW} height={canvasH} fill="url(#skyGrad)" rx="16" />

        {/* Vineyard rows — background texture */}
        {[380, 400, 420, 440, 460].map((y, i) => (
          <g key={`vine-${i}`} opacity={0.12}>
            {Array.from({ length: 8 + i }, (_, j) => (
              <circle key={j} cx={30 + j * 45 + (i % 2 ? 22 : 0)} cy={y} r={3} fill="#6A7D5C" />
            ))}
          </g>
        ))}

        {/* River band */}
        <path d="M0 290 Q100 275 200 295 Q300 315 420 285 L420 320 Q300 345 200 325 Q100 305 0 320Z" fill="url(#riverGrad)" />

        {/* Château at the top */}
        <g transform="translate(200, 30)" opacity={0.35}>
          <rect x="-30" y="10" width="60" height="40" rx="1" fill="#566B7D" />
          <polygon points="-30,10 0,-15 30,10" fill="#566B7D" />
          <rect x="-45" y="20" width="15" height="30" rx="1" fill="#566B7D" opacity="0.7" />
          <polygon points="-45,20 -37,5 -30,20" fill="#566B7D" opacity="0.7" />
          <rect x="30" y="20" width="15" height="30" rx="1" fill="#566B7D" opacity="0.7" />
          <polygon points="30,20 37,5 45,20" fill="#566B7D" opacity="0.7" />
        </g>

        {/* Path — dotted trail */}
        <path d={pathD} fill="none" stroke={C.bgDeep} strokeWidth="28" strokeLinecap="round" strokeLinejoin="round" opacity="0.6" />
        <path d={pathD} fill="none" stroke={C.white} strokeWidth="22" strokeLinecap="round" strokeLinejoin="round" opacity="0.7" />

        {/* Spaces */}
        {PATH.map((p, i) => {
          const sp = SPACE_TYPES[i];
          const isHighlight = highlight === i;
          const isBumped = bumped === i;
          return (
            <g key={i}>
              {/* Space circle */}
              <circle cx={p.x} cy={p.y} r={isHighlight ? 18 : 16}
                fill={sp ? sp.bg : "rgba(255,255,255,0.85)"}
                stroke={isHighlight ? C.gold : sp ? sp.ring : C.bgDeep}
                strokeWidth={isHighlight ? 2.5 : 1.5}
              />
              {/* Bump animation ring */}
              {isBumped && (
                <circle cx={p.x} cy={p.y} r={22} fill="none" stroke={C.bad} strokeWidth="2" opacity="0.5">
                  <animate attributeName="r" from="16" to="28" dur="0.6s" fill="freeze" />
                  <animate attributeName="opacity" from="0.6" to="0" dur="0.6s" fill="freeze" />
                </circle>
              )}
              {/* Space number or label */}
              <text x={p.x} y={p.y + (p.label ? 1 : 4)} textAnchor="middle" fontSize={p.label ? 14 : 9}
                fill={sp ? sp.ring : C.textLt} fontFamily={FS} fontWeight="600">
                {p.label || i}
              </text>
            </g>
          );
        })}

        {/* Player tokens */}
        <PlayerToken pos={p1Pos} color={C.river} emoji="🍷" offset={-10} />
        <PlayerToken pos={p2Pos} color={C.vine} emoji="🥂" offset={10} />

      </svg>

      {/* Legend */}
      <div style={{ display: "flex", justifyContent: "center", gap: 20, padding: "8px 0", fontFamily: FS, fontSize: 12 }}>
        <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
          <span style={{ width: 10, height: 10, borderRadius: "50%", background: C.river, display: "inline-block" }} />
          {p1Name}
        </span>
        <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
          <span style={{ width: 10, height: 10, borderRadius: "50%", background: C.vine, display: "inline-block" }} />
          {p2Name}
        </span>
      </div>
    </div>
  );
}

function PlayerToken({ pos, color, emoji, offset }) {
  const clampedPos = Math.max(0, Math.min(pos, PATH.length - 1));
  const p = PATH[clampedPos];
  // Offset tokens horizontally so they don't overlap on same space
  const tx = p.x + offset;
  const ty = p.y - 22;

  return (
    <g style={{ transition: "transform 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)" }}
       transform={`translate(${tx}, ${ty})`}>
      {/* Shadow */}
      <ellipse cx="0" cy="24" rx="8" ry="3" fill="rgba(0,0,0,0.08)" />
      {/* Token body */}
      <circle cx="0" cy="0" r="13" fill={color} opacity="0.9" />
      <circle cx="0" cy="0" r="11" fill="white" opacity="0.15" />
      <text x="0" y="5" textAnchor="middle" fontSize="13">{emoji}</text>
    </g>
  );
}

// ── Board game logic helpers ────────────────

/**
 * Calculate new positions after a round.
 * @returns {{ p1: number, p2: number, p1Bumped: boolean, p2Bumped: boolean }}
 */
export function calculateMoves(p1Pos, p2Pos, p1Correct, p2Correct) {
  let p1 = p1Pos;
  let p2 = p2Pos;
  let p1Bumped = false;
  let p2Bumped = false;

  // Move correct players forward
  if (p1Correct) p1 = Math.min(p1 + 1, BOARD_SPACES - 1);
  if (p2Correct) p2 = Math.min(p2 + 1, BOARD_SPACES - 1);

  // Bump check — "mens erger je niet!"
  // If players land on the same space (and it's not start or finish)
  if (p1 === p2 && p1 > 0 && p1 < BOARD_SPACES - 1) {
    // The player who JUST moved there bumps the other back 2
    if (p1Correct && !p2Correct) {
      // P1 moved onto P2's space → P2 gets bumped back
      p2 = Math.max(0, p2 - 2);
      p2Bumped = true;
    } else if (p2Correct && !p1Correct) {
      // P2 moved onto P1's space → P1 gets bumped back
      p1 = Math.max(0, p1 - 2);
      p1Bumped = true;
    } else if (p1Correct && p2Correct) {
      // Both moved to same space — the one who answered FASTER stays
      // (handled by caller with time data — default: both stay, no bump)
    }
  }

  return { p1, p2, p1Bumped, p2Bumped };
}

export { BOARD_SPACES, PATH };
