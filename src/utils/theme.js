// ═══════════════════════════════════════════════
// Loire Valley Theme
// ═══════════════════════════════════════════════

export const C = {
  bg: "#FAF6F0", bgDeep: "#EDE5D8", white: "#FFFFFF",
  slate: "#566B7D", slateDk: "#3E5060",
  river: "#7898AB", riverLt: "rgba(120,152,171,0.10)",
  vine: "#6A7D5C", vineLt: "rgba(106,125,92,0.08)",
  gold: "#C4983B", goldLt: "rgba(196,152,59,0.08)",
  text: "#3A342D", textMd: "#6B5F52", textLt: "#9A8E80",
  ok: "#5C8A53", bad: "#B85450",
};

export const F = "'EB Garamond', Georgia, serif";
export const FS = "'DM Sans', 'Segoe UI', sans-serif";

export const CATEGORIES = [
  "Grape Varieties",
  "Regions & Countries",
  "Winemaking",
  "Wine Styles & Labels",
  "Sparkling & Fortified",
  "Food & Wine Pairing",
];

export const CAT_ICONS = ["🍇", "🗺", "🏺", "🏷", "🥂", "🍽"];

export const RANKS = [
  { name: "Grape Picker", min: 0, emoji: "🍇" },
  { name: "Cellar Hand", min: 100, emoji: "🪣" },
  { name: "Barrel Maker", min: 300, emoji: "🪵" },
  { name: "Wine Steward", min: 600, emoji: "🍷" },
  { name: "Sommelier", min: 1000, emoji: "🥂" },
  { name: "Master Sommelier", min: 1500, emoji: "👑" },
  { name: "Master of Wine", min: 2500, emoji: "⭐" },
];

// ── Shared styles ─────────────────────────────
export const card = {
  background: C.white,
  borderRadius: 14,
  border: `1px solid ${C.bgDeep}`,
  boxShadow: "0 1px 6px rgba(0,0,0,0.03)",
};

export const btnPrimary = {
  padding: "13px 26px",
  borderRadius: 10,
  border: "none",
  background: `linear-gradient(135deg, ${C.slate} 0%, ${C.slateDk} 100%)`,
  color: C.white,
  fontFamily: FS,
  fontWeight: 600,
  cursor: "pointer",
  letterSpacing: "0.02em",
};
