import React, { useState, useRef, useEffect, useCallback } from "react";
import { C as _C, F, FS } from '../utils/theme.js';
const C = { ..._C, red: "#8B3A3A", redLt: "rgba(139,58,58,0.08)", rose: "#C27D7D" };


// ── Wine Region Data (WSET Level 2 Syllabus) ──
const REGIONS = [
  // FRANCE
  { id: "champagne", name: "Champagne", country: "France", lat: 49.0, lng: 3.9, color: C.gold,
    grapes: ["Chardonnay", "Pinot Noir", "Pinot Meunier"],
    style: "Sparkling", climate: "Cool continental",
    notes: "Traditional method sparkling. Non-vintage blends dominate. Chalky soils give finesse and acidity. Must be from the Champagne AOC." },
  { id: "alsace", name: "Alsace", country: "France", lat: 48.3, lng: 7.4, color: C.vine,
    grapes: ["Riesling", "Gewürztraminer", "Pinot Gris", "Muscat"],
    style: "White (aromatic)", climate: "Cool, dry (rain shadow of Vosges)",
    notes: "Varietal labelling — unusual for France. Grand Cru system. Vendange Tardive (late harvest) and SGN (noble rot) sweet styles." },
  { id: "burgundy", name: "Burgundy", country: "France", lat: 47.0, lng: 4.8, color: C.red,
    grapes: ["Pinot Noir", "Chardonnay"],
    style: "Red & White", climate: "Cool continental",
    notes: "Single-variety focus. Classified by vineyard: Grand Cru → Premier Cru → Village → Regional. Chablis (Chardonnay, unoaked) in the north." },
  { id: "loire", name: "Loire Valley", country: "France", lat: 47.4, lng: 1.5, color: C.river,
    grapes: ["Sauvignon Blanc", "Chenin Blanc", "Cabernet Franc", "Melon de Bourgogne"],
    style: "White, Red, Rosé, Sparkling, Sweet", climate: "Cool maritime to continental",
    notes: "Longest wine river in France. Key AOCs: Sancerre, Pouilly-Fumé (Sauvignon Blanc), Vouvray (Chenin), Muscadet (Melon de Bourgogne)." },
  { id: "bordeaux", name: "Bordeaux", country: "France", lat: 44.8, lng: -0.6, color: C.slateDk,
    grapes: ["Cabernet Sauvignon", "Merlot", "Cabernet Franc", "Sauvignon Blanc", "Sémillon"],
    style: "Red (blends), Dry & Sweet White", climate: "Moderate maritime",
    notes: "Left Bank: Cabernet Sauvignon dominant (Médoc, Graves). Right Bank: Merlot dominant (Saint-Émilion, Pomerol). Sauternes for sweet wines." },
  { id: "rhone", name: "Rhône Valley", country: "France", lat: 44.4, lng: 4.8, color: C.bad,
    grapes: ["Syrah", "Grenache", "Mourvèdre", "Viognier"],
    style: "Red, White, Rosé", climate: "Continental (N) to Mediterranean (S)",
    notes: "Northern Rhône: Syrah (Hermitage, Côte-Rôtie). Southern Rhône: Grenache blends (Châteauneuf-du-Pape). Rosé from Tavel." },
  { id: "languedoc", name: "Languedoc-Roussillon", country: "France", lat: 43.2, lng: 3.0, color: C.textMd,
    grapes: ["Grenache", "Syrah", "Mourvèdre", "Carignan"],
    style: "Red, Rosé, Sweet (VDN)", climate: "Mediterranean",
    notes: "France's largest wine region by volume. IGP Pays d'Oc for varietal wines. Fortified Muscats and Banyuls." },
  { id: "provence", name: "Provence", country: "France", lat: 43.5, lng: 6.1, color: C.rose,
    grapes: ["Grenache", "Cinsault", "Mourvèdre", "Rolle/Vermentino"],
    style: "Rosé (mainly)", climate: "Mediterranean",
    notes: "World's most famous rosé region. Pale, dry, elegant style. AOCs include Côtes de Provence, Bandol." },

  // ITALY
  { id: "piedmont", name: "Piedmont", country: "Italy", lat: 44.7, lng: 8.0, color: C.red,
    grapes: ["Nebbiolo", "Barbera", "Dolcetto", "Cortese", "Moscato"],
    style: "Red, Sparkling (Asti)", climate: "Continental",
    notes: "Barolo and Barbaresco: 100% Nebbiolo, DOCG, long ageing. Asti: sweet sparkling Moscato. Gavi: dry Cortese white." },
  { id: "veneto", name: "Veneto", country: "Italy", lat: 45.5, lng: 11.5, color: C.vine,
    grapes: ["Corvina", "Garganega", "Glera", "Pinot Grigio"],
    style: "Red, White, Sparkling", climate: "Moderate continental",
    notes: "Prosecco (Glera, Tank Method). Soave (Garganega). Valpolicella and Amarone (Corvina — dried grape method/appassimento)." },
  { id: "tuscany", name: "Tuscany", country: "Italy", lat: 43.3, lng: 11.3, color: C.bad,
    grapes: ["Sangiovese", "Cabernet Sauvignon", "Merlot"],
    style: "Red", climate: "Mediterranean/Continental",
    notes: "Chianti and Chianti Classico: Sangiovese. Brunello di Montalcino: 100% Sangiovese, DOCG. Super Tuscans: international varieties." },
  { id: "sicily", name: "Sicily", country: "Italy", lat: 37.5, lng: 14.0, color: C.gold,
    grapes: ["Nero d'Avola", "Grillo", "Catarratto"],
    style: "Red, White, Sweet (Marsala)", climate: "Hot Mediterranean",
    notes: "Italy's largest island. Nero d'Avola: rich, full reds. Etna wines gaining prestige. Marsala: fortified." },

  // SPAIN
  { id: "rioja", name: "Rioja", country: "Spain", lat: 42.5, lng: -2.5, color: C.red,
    grapes: ["Tempranillo", "Garnacha", "Graciano", "Viura"],
    style: "Red (mainly)", climate: "Continental/Mediterranean",
    notes: "Spain's most famous. Oak-aged classifications: Joven → Crianza → Reserva → Gran Reserva. American and French oak." },
  { id: "ribera", name: "Ribera del Duero", country: "Spain", lat: 41.6, lng: -3.7, color: C.slateDk,
    grapes: ["Tempranillo (Tinto Fino)"],
    style: "Red", climate: "Extreme continental",
    notes: "High altitude (800m+). Intense, structured reds. Tempranillo called Tinto Fino locally. Day/night temperature contrast preserves acidity." },
  { id: "rias", name: "Rías Baixas", country: "Spain", lat: 42.3, lng: -8.7, color: C.river,
    grapes: ["Albariño"],
    style: "White", climate: "Cool maritime (Atlantic)",
    notes: "Northwest Spain, green and rainy. Albariño: aromatic, crisp, peachy whites. Granite soils. Often compared to Vinho Verde." },
  { id: "jerez", name: "Jerez (Sherry)", country: "Spain", lat: 36.7, lng: -6.1, color: C.gold,
    grapes: ["Palomino", "Pedro Ximénez", "Moscatel"],
    style: "Fortified", climate: "Hot Mediterranean",
    notes: "Solera system ageing. Fino/Manzanilla: under flor, dry, light. Amontillado: flor then oxidative. Oloroso: fully oxidative, rich. PX: sweet." },

  // PORTUGAL
  { id: "douro", name: "Douro / Port", country: "Portugal", lat: 41.2, lng: -7.8, color: C.bad,
    grapes: ["Touriga Nacional", "Touriga Franca", "Tinta Roriz", "Tinta Barroca"],
    style: "Fortified (Port), Red", climate: "Hot continental",
    notes: "Port: fortified during fermentation. Ruby: fruity, young. Tawny: oxidative, nutty. Vintage/LBV/Vintage. Dry Douro reds increasingly important." },
  { id: "vinhov", name: "Vinho Verde", country: "Portugal", lat: 41.8, lng: -8.4, color: C.vine,
    grapes: ["Alvarinho", "Loureiro", "Arinto"],
    style: "White (light, fresh)", climate: "Cool maritime",
    notes: "Far northwest. Light, often slightly spritz, low alcohol. Drink young. Alvarinho (same as Albariño) for premium versions." },

  // GERMANY
  { id: "mosel", name: "Mosel", country: "Germany", lat: 49.9, lng: 6.9, color: C.vine,
    grapes: ["Riesling"],
    style: "White (dry to sweet)", climate: "Cool continental",
    notes: "Steep slate slopes. Prädikat system: Kabinett → Spätlese → Auslese → BA → TBA. Low alcohol. Thrilling acidity. Trocken = dry." },
  { id: "rheingau", name: "Rheingau", country: "Germany", lat: 50.0, lng: 8.0, color: C.gold,
    grapes: ["Riesling", "Spätburgunder (Pinot Noir)"],
    style: "White, Red", climate: "Cool continental",
    notes: "South-facing Rhine slopes. Richer Rieslings than Mosel. Historic estates. VDP classification system." },

  // NEW WORLD
  { id: "napa", name: "Napa Valley", country: "USA", lat: 38.5, lng: -122.3, color: C.red,
    grapes: ["Cabernet Sauvignon", "Chardonnay", "Merlot"],
    style: "Red, White", climate: "Warm Mediterranean",
    notes: "California's most prestigious. Bold Cabernet Sauvignons. Sub-AVAs: Oakville, Rutherford, Stags Leap. Fog influence from bay." },
  { id: "oregon", name: "Oregon", country: "USA", lat: 45.3, lng: -122.8, color: C.vine,
    grapes: ["Pinot Noir", "Pinot Gris", "Chardonnay"],
    style: "Red, White", climate: "Cool maritime",
    notes: "Willamette Valley: Oregon's Burgundy. Cool climate Pinot Noir. Volcanic and sedimentary soils. Small, artisan producers." },

  { id: "mendoza", name: "Mendoza", country: "Argentina", lat: -33.0, lng: -68.5, color: C.bad,
    grapes: ["Malbec", "Cabernet Sauvignon", "Torrontés"],
    style: "Red", climate: "Hot, dry, high altitude",
    notes: "Andes foothills, 800-1500m altitude. Malbec capital of the world. Intense sun, cool nights. Uco Valley for premium wines." },
  { id: "chile", name: "Central Chile", country: "Chile", lat: -34.0, lng: -71.0, color: C.vine,
    grapes: ["Cabernet Sauvignon", "Carménère", "Sauvignon Blanc"],
    style: "Red, White", climate: "Mediterranean",
    notes: "Maipo Valley: Cabernet. Casablanca/Leyda: cool-climate Sauvignon Blanc. Carménère: Chile's signature grape (ex-Bordeaux)." },

  { id: "barossa", name: "Barossa Valley", country: "Australia", lat: -34.5, lng: 138.9, color: C.red,
    grapes: ["Shiraz", "Cabernet Sauvignon", "Grenache"],
    style: "Red (full-bodied)", climate: "Warm, dry",
    notes: "Australia's most iconic. Old-vine Shiraz — some 150+ years old. Rich, powerful, often oaked. Eden Valley (cooler) for Riesling." },
  { id: "margaret", name: "Margaret River", country: "Australia", lat: -33.9, lng: 115.0, color: C.slateDk,
    grapes: ["Cabernet Sauvignon", "Chardonnay", "Sauvignon Blanc-Sémillon"],
    style: "Red, White", climate: "Mediterranean maritime",
    notes: "Western Australia. Bordeaux-style Cabernet blends. Elegant Chardonnay. SBS (Sauvignon-Sémillon blend) is a specialty." },

  { id: "marlborough", name: "Marlborough", country: "New Zealand", lat: -41.5, lng: 173.9, color: C.vine,
    grapes: ["Sauvignon Blanc", "Pinot Noir"],
    style: "White, Red", climate: "Cool maritime",
    notes: "Pungent, herbaceous Sauvignon Blanc — the NZ style that conquered the world. Also excellent sparkling and Pinot Noir." },
  { id: "otago", name: "Central Otago", country: "New Zealand", lat: -45.0, lng: 169.2, color: C.bad,
    grapes: ["Pinot Noir"],
    style: "Red", climate: "Cool continental (southernmost)",
    notes: "World's southernmost wine region. Stunning Pinot Noir. Intense, cherry-fruited. Dramatic mountain scenery." },

  { id: "stellenbosch", name: "Stellenbosch", country: "South Africa", lat: -33.9, lng: 18.8, color: C.gold,
    grapes: ["Cabernet Sauvignon", "Pinotage", "Chenin Blanc", "Syrah"],
    style: "Red, White", climate: "Mediterranean",
    notes: "South Africa's Napa. Bordeaux-style reds. Pinotage: unique SA crossing (Pinot Noir × Cinsault). Old-vine Chenin Blanc." },
];

// ── Continent SVG Paths (simplified but recognizable) ──
// Using a Natural Earth–style projection, viewBox 0 0 1000 500
const CONTINENTS = [
  // Europe
  { d: "M480 80 L490 75 L510 78 L525 85 L530 95 L540 90 L545 100 L540 110 L535 115 L525 112 L530 120 L528 130 L520 135 L510 140 L505 148 L498 152 L492 155 L495 148 L488 145 L480 150 L475 145 L472 138 L478 130 L475 120 L468 115 L470 108 L465 100 L470 92 L475 85 Z", fill: C.land },
  // British Isles
  { d: "M455 82 L462 78 L466 85 L464 95 L458 100 L454 95 L450 90 L452 85 Z", fill: C.land },
  // Scandinavia
  { d: "M500 40 L510 35 L520 40 L525 55 L520 70 L510 75 L505 70 L495 65 L490 55 L492 45 Z", fill: C.land },
  // Africa
  { d: "M470 160 L500 155 L520 160 L535 170 L540 190 L545 210 L540 240 L535 270 L525 290 L515 310 L505 325 L495 330 L488 325 L480 310 L470 290 L462 270 L458 240 L455 220 L450 200 L455 180 L460 170 Z", fill: C.land },
  // Asia
  { d: "M540 90 L560 80 L590 70 L620 60 L660 55 L700 50 L740 55 L770 65 L790 80 L800 100 L790 120 L780 130 L770 140 L755 148 L740 150 L720 155 L700 160 L680 155 L660 150 L640 155 L620 160 L600 155 L580 150 L560 145 L550 140 L545 130 L540 120 L535 110 Z", fill: C.land },
  // India
  { d: "M640 155 L655 160 L660 180 L655 200 L645 215 L635 210 L628 195 L625 175 L630 165 Z", fill: C.land },
  // Southeast Asia
  { d: "M720 155 L735 160 L740 175 L735 185 L725 180 L718 170 L715 160 Z", fill: C.land },
  // Japan/Korea
  { d: "M790 80 L798 85 L800 100 L795 110 L788 105 L785 92 Z", fill: C.land },
  // North America
  { d: "M80 45 L120 35 L160 30 L200 35 L240 50 L260 60 L280 75 L290 95 L285 115 L275 130 L265 145 L260 155 L250 160 L240 165 L225 168 L210 160 L195 155 L180 160 L170 165 L160 158 L155 148 L148 140 L135 135 L120 130 L105 120 L95 110 L85 100 L78 90 L75 75 L78 55 Z", fill: C.land },
  // Central America
  { d: "M195 155 L210 160 L220 165 L225 175 L220 182 L210 185 L200 180 L192 172 L190 165 Z", fill: C.land },
  // South America
  { d: "M225 185 L245 180 L265 185 L280 195 L290 215 L295 240 L290 270 L280 300 L270 330 L260 360 L250 385 L240 395 L235 390 L230 370 L225 340 L220 310 L215 280 L210 250 L208 225 L210 205 L215 195 Z", fill: C.land },
  // Australia
  { d: "M730 290 L760 280 L790 285 L810 295 L820 310 L815 330 L800 345 L780 350 L760 345 L742 335 L730 320 L725 305 Z", fill: C.land },
  // New Zealand
  { d: "M838 340 L842 335 L846 340 L848 355 L844 365 L840 368 L836 360 L835 350 Z", fill: C.land },
  // Greenland
  { d: "M340 15 L370 10 L395 15 L400 30 L390 42 L370 45 L350 40 L338 30 Z", fill: C.land },
  // Iceland
  { d: "M428 40 L440 38 L448 42 L445 48 L435 50 L428 46 Z", fill: C.land },
  // Indonesia
  { d: "M715 210 L725 208 L740 210 L755 212 L770 215 L780 218 L775 225 L760 222 L740 220 L720 218 Z", fill: C.land },
  // Madagascar
  { d: "M560 290 L565 285 L570 295 L568 310 L562 315 L558 305 Z", fill: C.land },
];

// Convert lat/lng to map coordinates (Natural Earth-ish)
function project(lat, lng) {
  const x = ((lng + 180) / 360) * 1000;
  const y = ((90 - lat) / 180) * 500;
  return { x, y };
}

// ── Main Component ──────────────────────────
export default function WineWorldMap({ onBack }) {
  const [selected, setSelected] = useState(null);
  const [hovered, setHovered] = useState(null);
  const [filter, setFilter] = useState("all"); // all | france | italy | spain | newworld
  const [search, setSearch] = useState("");
  const svgRef = useRef(null);
  const panelRef = useRef(null);

  const filteredRegions = REGIONS.filter(r => {
    if (filter === "france") return r.country === "France";
    if (filter === "italy") return r.country === "Italy";
    if (filter === "spain") return r.country === "Spain" || r.country === "Portugal";
    if (filter === "newworld") return !["France","Italy","Spain","Portugal","Germany","Austria"].includes(r.country);
    return true;
  }).filter(r => {
    if (!search) return true;
    const s = search.toLowerCase();
    return r.name.toLowerCase().includes(s) || r.country.toLowerCase().includes(s) ||
           r.grapes.some(g => g.toLowerCase().includes(s));
  });

  // Scroll panel into view when region selected
  useEffect(() => {
    if (selected && panelRef.current) {
      panelRef.current.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  }, [selected]);

  const selectedRegion = selected ? REGIONS.find(r => r.id === selected) : null;

  return (
    <div style={{ minHeight: "100vh", background: C.bg, fontFamily: F }}>
      <div style={{ maxWidth: 900, margin: "0 auto", padding: "20px 16px 40px" }}>

        {/* Back button */}
        {onBack && <button style={{ fontSize: 14, color: C.textLt, background: "none", border: "none", cursor: "pointer", fontFamily: FS, marginBottom: 12 }} onClick={onBack}>← Back to menu</button>}

        {/* Header */}
        <div style={{ marginBottom: 16 }}>
          <h1 style={{ fontFamily: F, fontSize: 28, color: C.slateDk, fontWeight: 400, margin: "0 0 4px" }}>
            Carte des Vignobles du Monde
          </h1>
          <p style={{ fontFamily: FS, fontSize: 13, color: C.textLt, margin: 0 }}>
            WSET Level 2 Wine Regions · Click any marker to explore
          </p>
        </div>

        {/* Filters */}
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 12, alignItems: "center" }}>
          {[
            { id: "all", label: "All Regions", emoji: "🌍" },
            { id: "france", label: "France", emoji: "🇫🇷" },
            { id: "italy", label: "Italy", emoji: "🇮🇹" },
            { id: "spain", label: "Iberia", emoji: "🇪🇸" },
            { id: "newworld", label: "New World", emoji: "🌏" },
          ].map(f => (
            <button key={f.id} onClick={() => { setFilter(f.id); setSelected(null); }}
              style={{
                padding: "6px 12px", borderRadius: 20, border: `1.5px solid ${filter === f.id ? C.river : C.bgDeep}`,
                background: filter === f.id ? C.riverLt : C.white,
                fontFamily: FS, fontSize: 12, fontWeight: 500, cursor: "pointer",
                color: filter === f.id ? C.slateDk : C.textMd, transition: "all 0.15s",
              }}>
              {f.emoji} {f.label}
            </button>
          ))}
          <input type="text" placeholder="Search grape or region…" value={search} onChange={e => setSearch(e.target.value)}
            style={{
              marginLeft: "auto", padding: "6px 12px", borderRadius: 20, border: `1px solid ${C.bgDeep}`,
              fontFamily: FS, fontSize: 12, color: C.text, background: C.white, outline: "none", width: 180,
            }} />
        </div>

        {/* Map */}
        <div style={{
          background: C.ocean, borderRadius: 16, overflow: "hidden",
          border: `1px solid ${C.bgDeep}`, boxShadow: "0 2px 12px rgba(0,0,0,0.04)",
          position: "relative", marginBottom: 16,
        }}>
          <svg ref={svgRef} viewBox="0 0 1000 500" style={{ width: "100%", display: "block" }}>
            {/* Ocean background */}
            <rect width="1000" height="500" fill={C.ocean} />

            {/* Subtle latitude lines */}
            {[100, 150, 200, 250, 300, 350, 400].map(y => (
              <line key={y} x1="0" y1={y} x2="1000" y2={y} stroke="rgba(120,152,171,0.06)" strokeWidth="0.5" />
            ))}

            {/* Continents */}
            {CONTINENTS.map((c, i) => (
              <path key={i} d={c.d} fill={c.fill} stroke={C.landStroke} strokeWidth="0.8" />
            ))}

            {/* Equator */}
            <line x1="0" y1="250" x2="1000" y2="250" stroke="rgba(120,152,171,0.1)" strokeWidth="0.5" strokeDasharray="8 4" />

            {/* Region markers */}
            {filteredRegions.map(r => {
              const { x, y } = project(r.lat, r.lng);
              const isSelected = selected === r.id;
              const isHovered = hovered === r.id;
              const radius = isSelected ? 8 : isHovered ? 7 : 5;
              return (
                <g key={r.id} style={{ cursor: "pointer" }}
                   onClick={() => setSelected(isSelected ? null : r.id)}
                   onMouseEnter={() => setHovered(r.id)}
                   onMouseLeave={() => setHovered(null)}>
                  {/* Pulse ring for selected */}
                  {isSelected && (
                    <circle cx={x} cy={y} r={14} fill="none" stroke={r.color} strokeWidth="1.5" opacity="0.3">
                      <animate attributeName="r" from="8" to="18" dur="1.5s" repeatCount="indefinite" />
                      <animate attributeName="opacity" from="0.4" to="0" dur="1.5s" repeatCount="indefinite" />
                    </circle>
                  )}
                  {/* Glow */}
                  <circle cx={x} cy={y} r={radius + 4} fill={r.color} opacity={isSelected ? 0.15 : isHovered ? 0.1 : 0} style={{ transition: "all 0.2s" }} />
                  {/* Marker */}
                  <circle cx={x} cy={y} r={radius} fill={r.color} stroke={C.white} strokeWidth={isSelected ? 2.5 : 1.5}
                    opacity={isSelected ? 1 : 0.85} style={{ transition: "all 0.2s ease" }} />
                  {/* Label on hover/select */}
                  {(isSelected || isHovered) && (
                    <g>
                      <rect x={x - r.name.length * 3.2 - 6} y={y - radius - 20} width={r.name.length * 6.4 + 12} height={16} rx="4" fill="rgba(58,52,45,0.85)" />
                      <text x={x} y={y - radius - 8} textAnchor="middle" fontSize="8" fill={C.white} fontFamily={FS} fontWeight="600">{r.name}</text>
                    </g>
                  )}
                </g>
              );
            })}
          </svg>

          {/* Region count badge */}
          <div style={{
            position: "absolute", bottom: 10, left: 12, padding: "4px 10px",
            background: "rgba(255,255,255,0.85)", borderRadius: 12,
            fontFamily: FS, fontSize: 11, color: C.textMd, backdropFilter: "blur(4px)",
          }}>
            {filteredRegions.length} regions
          </div>
        </div>

        {/* Detail Panel */}
        {selectedRegion && (
          <div ref={panelRef} style={{
            background: C.white, borderRadius: 16, border: `1px solid ${C.bgDeep}`,
            boxShadow: "0 2px 12px rgba(0,0,0,0.04)", padding: "22px 20px",
            animation: "slideUp 0.3s ease",
          }}>
            <style>{`@keyframes slideUp { from { opacity:0; transform:translateY(10px); } to { opacity:1; transform:translateY(0); } }`}</style>
            <div style={{ display: "flex", alignItems: "flex-start", gap: 14, marginBottom: 14 }}>
              <div style={{
                width: 44, height: 44, borderRadius: 12, background: selectedRegion.color + "18",
                display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                border: `2px solid ${selectedRegion.color}30`,
              }}>
                <div style={{ width: 14, height: 14, borderRadius: "50%", background: selectedRegion.color }} />
              </div>
              <div style={{ flex: 1 }}>
                <h2 style={{ fontFamily: F, fontSize: 24, color: C.slateDk, fontWeight: 400, margin: "0 0 2px" }}>
                  {selectedRegion.name}
                </h2>
                <p style={{ fontFamily: FS, fontSize: 13, color: C.textLt, margin: 0 }}>
                  {selectedRegion.country} · {selectedRegion.climate}
                </p>
              </div>
              <button onClick={() => setSelected(null)} style={{
                width: 30, height: 30, borderRadius: 8, border: `1px solid ${C.bgDeep}`,
                background: C.bg, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
                fontFamily: FS, fontSize: 14, color: C.textLt,
              }}>✕</button>
            </div>

            {/* Style badge */}
            <div style={{
              display: "inline-block", padding: "4px 12px", borderRadius: 16,
              background: selectedRegion.color + "10", border: `1px solid ${selectedRegion.color}25`,
              fontFamily: FS, fontSize: 11, color: selectedRegion.color, fontWeight: 600,
              marginBottom: 14, letterSpacing: "0.03em",
            }}>
              {selectedRegion.style}
            </div>

            {/* Grapes */}
            <div style={{ marginBottom: 14 }}>
              <p style={{ fontFamily: FS, fontSize: 10, color: C.textLt, margin: "0 0 6px", textTransform: "uppercase", letterSpacing: "0.08em" }}>Key Grapes</p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
                {selectedRegion.grapes.map(g => (
                  <span key={g} style={{
                    padding: "5px 11px", borderRadius: 8, fontFamily: FS, fontSize: 12,
                    background: C.vineLt, color: C.vine, fontWeight: 500,
                    border: `1px solid rgba(106,125,92,0.12)`,
                  }}>🍇 {g}</span>
                ))}
              </div>
            </div>

            {/* Notes */}
            <div style={{
              padding: "14px 16px", borderRadius: 10, background: C.bg,
              border: `1px solid ${C.bgDeep}`,
            }}>
              <p style={{ fontFamily: FS, fontSize: 10, color: C.textLt, margin: "0 0 6px", textTransform: "uppercase", letterSpacing: "0.08em" }}>WSET Study Notes</p>
              <p style={{ fontFamily: FS, fontSize: 13, lineHeight: 1.65, color: C.text, margin: 0 }}>
                {selectedRegion.notes}
              </p>
            </div>

            {/* Quick facts */}
            <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
              <div style={{ flex: 1, padding: "10px 12px", borderRadius: 8, background: C.riverLt, textAlign: "center" }}>
                <p style={{ fontFamily: FS, fontSize: 10, color: C.textLt, margin: "0 0 2px", textTransform: "uppercase" }}>Climate</p>
                <p style={{ fontFamily: F, fontSize: 14, color: C.slateDk, margin: 0 }}>{selectedRegion.climate}</p>
              </div>
              <div style={{ flex: 1, padding: "10px 12px", borderRadius: 8, background: C.goldLt, textAlign: "center" }}>
                <p style={{ fontFamily: FS, fontSize: 10, color: C.textLt, margin: "0 0 2px", textTransform: "uppercase" }}>Grapes</p>
                <p style={{ fontFamily: F, fontSize: 14, color: C.gold, margin: 0 }}>{selectedRegion.grapes.length}</p>
              </div>
              <div style={{ flex: 1, padding: "10px 12px", borderRadius: 8, background: C.redLt, textAlign: "center" }}>
                <p style={{ fontFamily: FS, fontSize: 10, color: C.textLt, margin: "0 0 2px", textTransform: "uppercase" }}>Style</p>
                <p style={{ fontFamily: F, fontSize: 14, color: C.red, margin: 0 }}>{selectedRegion.style.split(",")[0]}</p>
              </div>
            </div>
          </div>
        )}

        {/* Region List */}
        {!selectedRegion && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 8 }}>
            {filteredRegions.map(r => (
              <button key={r.id} onClick={() => setSelected(r.id)}
                style={{
                  ...({ background: C.white, borderRadius: 12, border: `1px solid ${C.bgDeep}`, boxShadow: "0 1px 4px rgba(0,0,0,0.02)" }),
                  padding: "12px 14px", cursor: "pointer", textAlign: "left", transition: "all 0.15s",
                  display: "flex", alignItems: "center", gap: 10,
                }}>
                <div style={{ width: 10, height: 10, borderRadius: "50%", background: r.color, flexShrink: 0 }} />
                <div>
                  <p style={{ fontFamily: FS, fontSize: 13, fontWeight: 600, color: C.text, margin: "0 0 1px" }}>{r.name}</p>
                  <p style={{ fontFamily: FS, fontSize: 11, color: C.textLt, margin: 0 }}>{r.country} · {r.grapes[0]}</p>
                </div>
              </button>
            ))}
          </div>
        )}

      </div>
    </div>
  );
}
