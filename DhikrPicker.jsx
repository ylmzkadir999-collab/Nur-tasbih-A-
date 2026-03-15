import React, { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { DHIKR_LIST, useTasbihStore } from '../store';
import { THEMES } from '../utils/themes';

export default function DhikrPicker() {
  const { selectedDhikr, setDhikr, theme: themeId } = useTasbihStore();
  const theme = THEMES[themeId] || THEMES.black;
  const [open, setOpen] = useState(false);
  const current = DHIKR_LIST.find(d => d.id === selectedDhikr) || DHIKR_LIST[0];

  return (
    <div style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen(v => !v)}
        style={{
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '8px 16px', borderRadius: 40, cursor: 'pointer',
          background: theme.btnBg, border: `1px solid ${theme.btnBorder}`,
          color: theme.accent, fontFamily: "'DM Sans', sans-serif", fontSize: 13,
        }}
      >
        <span style={{ fontFamily: "'Scheherazade New', serif", fontSize: 18, direction: 'rtl' }}>{current.arabic}</span>
        <span style={{ opacity: 0.7 }}>{current.transliteration}</span>
        <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor" style={{ opacity: 0.5 }}>
          <path d="M2 4l4 4 4-4" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" />
        </svg>
      </button>

      <AnimatePresence>
        {open && (
          <>
            <div style={{ position: 'fixed', inset: 0, zIndex: 10 }} onClick={() => setOpen(false)} />
            <motion.div
              initial={{ opacity: 0, y: 6, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 6, scale: 0.97 }}
              transition={{ duration: 0.14 }}
              style={{
                position: 'absolute', bottom: '110%', left: 0, zIndex: 11,
                minWidth: 260,
                background: 'rgba(10,10,30,0.98)',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: 14,
                overflow: 'hidden',
                backdropFilter: 'blur(20px)',
              }}
            >
              {DHIKR_LIST.map((d, i) => (
                <button key={d.id} onClick={() => { setDhikr(d.id); setOpen(false); }} style={{
                  display: 'flex', alignItems: 'center', gap: 12, width: '100%',
                  padding: '12px 16px', cursor: 'pointer', textAlign: 'left',
                  background: d.id === selectedDhikr ? `${theme.accent}12` : 'transparent',
                  borderBottom: i < DHIKR_LIST.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none',
                  border: 'none',
                }}>
                  <div>
                    <div style={{ fontFamily: "'Scheherazade New', serif", fontSize: 20, color: theme.accent, direction: 'rtl' }}>{d.arabic}</div>
                    <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: 'rgba(255,255,255,0.65)', marginTop: 2 }}>{d.transliteration}</div>
                    <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, color: 'rgba(255,255,255,0.35)', marginTop: 1 }}>{d.translation}</div>
                  </div>
                  <div style={{ marginLeft: 'auto', fontFamily: "'DM Mono', monospace", fontSize: 11, color: theme.accent, opacity: 0.5 }}>×{d.target}</div>
                </button>
              ))}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
