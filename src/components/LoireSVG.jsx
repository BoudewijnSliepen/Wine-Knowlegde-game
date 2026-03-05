import React from 'react';

export function ChateauSilhouette({ opacity = 0.8 }) {
  return (
    <svg viewBox="0 0 800 180" style={{ width: "100%", opacity, display: "block" }} fill="none">
      <path d="M0 155 Q200 140 400 150 Q600 160 800 145 L800 180 L0 180Z" fill="rgba(120,152,171,0.06)" />
      <rect x="80" y="95" width="40" height="60" rx="1" fill="rgba(86,107,125,0.06)"/>
      <polygon points="80,95 100,72 120,95" fill="rgba(86,107,125,0.06)"/>
      <rect x="60" y="110" width="20" height="45" rx="1" fill="rgba(86,107,125,0.04)"/>
      <polygon points="60,110 70,94 80,110" fill="rgba(86,107,125,0.04)"/>
      <rect x="310" y="70" width="180" height="85" rx="2" fill="rgba(86,107,125,0.06)"/>
      <polygon points="310,70 400,30 490,70" fill="rgba(86,107,125,0.07)"/>
      <rect x="280" y="82" width="30" height="73" rx="1" fill="rgba(86,107,125,0.05)"/>
      <polygon points="280,82 295,55 310,82" fill="rgba(86,107,125,0.05)"/>
      <rect x="490" y="82" width="30" height="73" rx="1" fill="rgba(86,107,125,0.05)"/>
      <polygon points="490,82 505,55 520,82" fill="rgba(86,107,125,0.05)"/>
      <rect x="345" y="95" width="10" height="16" rx="5" fill="rgba(86,107,125,0.03)"/>
      <rect x="380" y="95" width="10" height="16" rx="5" fill="rgba(86,107,125,0.03)"/>
      <rect x="415" y="95" width="10" height="16" rx="5" fill="rgba(86,107,125,0.03)"/>
      <rect x="650" y="85" width="45" height="70" rx="1" fill="rgba(86,107,125,0.05)"/>
      <polygon points="650,85 672,58 695,85" fill="rgba(86,107,125,0.06)"/>
      <ellipse cx="180" cy="138" rx="22" ry="18" fill="rgba(106,125,92,0.05)"/>
      <ellipse cx="565" cy="136" rx="28" ry="20" fill="rgba(106,125,92,0.04)"/>
      <ellipse cx="745" cy="140" rx="20" ry="15" fill="rgba(106,125,92,0.05)"/>
    </svg>
  );
}

export function RiverWave() {
  return (
    <svg viewBox="0 0 800 30" style={{ width: "100%", display: "block" }}>
      <path d="M0 15 Q100 5 200 15 Q300 25 400 15 Q500 5 600 15 Q700 25 800 15 L800 30 L0 30Z" fill="rgba(120,152,171,0.06)"/>
    </svg>
  );
}
