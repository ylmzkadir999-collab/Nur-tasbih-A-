import React, { memo } from 'react';
import { motion } from 'framer-motion';
import { THEMES } from '../utils/themes';

const TOTAL = 33;
const CX = 160, CY = 160, R = 118, BEAD_R = 11;

function getPos(i) {
  const a = (i / TOTAL) * 2 * Math.PI - Math.PI / 2;
  return { x: CX + R * Math.cos(a), y: CY + R * Math.sin(a) };
}

const POSITIONS = Array.from({ length: TOTAL }, (_, i) => getPos(i));

const Beads = memo(function Beads({ count, themeId }) {
  const theme = THEMES[themeId] || THEMES.black;
  const active = count % TOTAL;
  const rounds = Math.floor(count / TOTAL);
  const justActive = active - 1; // index of last-tapped

  return (
    <svg viewBox="0 0 320 320" width="100%" style={{ maxWidth: 300, display: 'block', margin: '0 auto', filter: theme.glow ? `drop-shadow(0 0 18px ${theme.accent}55)` : 'none' }}>
      <defs>
        <radialGradient id={`bh-${themeId}`} cx="35%" cy="32%" r="62%">
          <stop offset="0%" stopColor={theme.beadHighlight} />
          <stop offset="100%" stopColor={theme.beadFill} />
        </radialGradient>
        <radialGradient id="shine" cx="30%" cy="28%" r="55%">
          <stop offset="0%" stopColor="rgba(255,255,255,0.38)" />
          <stop offset="100%" stopColor="rgba(255,255,255,0)" />
        </radialGradient>
        <filter id="bshadow" x="-30%" y="-30%" width="160%" height="160%">
          <feDropShadow dx="0" dy="2" stdDeviation="3" floodOpacity="0.6" />
        </filter>
      </defs>

      {/* String circle */}
      <circle cx={CX} cy={CY} r={R} fill="none"
        stroke={theme.stringStroke} strokeWidth="1.5"
        strokeDasharray="5 8"
        style={{ animation: 'dashScroll 4s linear infinite', transformOrigin: `${CX}px ${CY}px` }} />

      {/* Top knot */}
      <g filter="url(#bshadow)">
        <circle cx={CX} cy={CY - R - BEAD_R} r={7}
          fill={`url(#bh-${themeId})`} stroke={theme.beadStroke} strokeWidth="1" />
        <circle cx={CX} cy={CY - R - BEAD_R} r={7} fill="url(#shine)" />
      </g>
      <line x1={CX} y1={CY - R - BEAD_R - 7} x2={CX} y2={CY - R - BEAD_R - 20}
        stroke={theme.stringStroke} strokeWidth="1.5" />
      <circle cx={CX} cy={CY - R - BEAD_R - 24} r={5}
        fill={`url(#bh-${themeId})`} stroke={theme.beadStroke} strokeWidth="1" />

      {/* Beads */}
      {POSITIONS.map((pos, i) => {
        const isLit = i < active;
        const isNew = i === justActive && count > 0;
        return (
          <g key={i}>
            {isNew && (
              <circle cx={pos.x} cy={pos.y} r={BEAD_R + 8}
                fill="none" stroke={theme.accent} strokeWidth="1"
                opacity="0"
                style={{ animation: 'rippleBurst 0.55s ease-out forwards' }} />
            )}
            <motion.g
              animate={isNew ? { scale: [1, 1.28, 1] } : { scale: 1 }}
              transition={{ duration: 0.22, ease: [0.34, 1.56, 0.64, 1] }}
              style={{ transformOrigin: `${pos.x}px ${pos.y}px` }}
            >
              <circle cx={pos.x} cy={pos.y} r={BEAD_R}
                fill={isLit ? `url(#bh-${themeId})` : theme.beadFill}
                stroke={isLit ? theme.beadStroke : 'rgba(255,255,255,0.05)'}
                strokeWidth={isLit ? 1.5 : 0.6}
                opacity={isLit ? 1 : 0.3}
                filter="url(#bshadow)" />
              <circle cx={pos.x - 3} cy={pos.y - 3} r={BEAD_R * 0.5}
                fill="url(#shine)" opacity={isLit ? 0.75 : 0.15} />
            </motion.g>
          </g>
        );
      })}

      {/* Centre count */}
      <text x={CX} y={CY - 6} textAnchor="middle"
        fill={theme.counter} fontSize="36"
        fontFamily="'Cormorant Garamond', serif" fontWeight="600"
        style={{ userSelect: 'none' }}>
        {count}
      </text>
      <text x={CX} y={CY + 14} textAnchor="middle"
        fill={theme.accent} fontSize="9"
        fontFamily="'DM Sans', sans-serif" opacity="0.6"
        style={{ userSelect: 'none', letterSpacing: '0.15em' }}>
        {active}/{TOTAL}{rounds > 0 ? ` × ${rounds + 1}` : ''}
      </text>
    </svg>
  );
});

export default Beads;
