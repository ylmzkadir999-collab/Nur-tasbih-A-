import React, { useCallback, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { useTasbihStore, useAuthStore, DHIKR_LIST, apiFetch } from '../store';
import { useSound, vibrate } from '../hooks/useSound';
import { THEMES } from '../utils/themes';
import Beads from '../components/Beads';
import DhikrPicker from '../components/DhikrPicker';
import AdBanner from '../components/AdBanner';

const SYNC_BATCH = 25;

export default function TasbihPage() {
  const {
    count, dailyCount, totalCount, streakDays,
    theme: themeId, selectedDhikr, soundEnabled, vibrationEnabled,
    increment, undo, reset, toggleSound, toggleVibration, syncStats,
  } = useTasbihStore();

  const { token } = useAuthStore();
  const { playClick } = useSound();
  const theme = THEMES[themeId] || THEMES.black;
  const currentDhikr = DHIKR_LIST.find(d => d.id === selectedDhikr) || DHIKR_LIST[0];
  const pendingRef = useRef(0);

  // Sync stats on mount
  useEffect(() => {
    if (!token) return;
    apiFetch('/tasbih/stats').then(d => syncStats(d)).catch(() => {});
  }, [token]);

  // Flush pending to server
  const flush = useCallback(async (count) => {
    if (!token || count < 1) return;
    try {
      await apiFetch('/tasbih/session', {
        method: 'POST',
        body: JSON.stringify({ count, dhikr: selectedDhikr }),
      });
    } catch {}
  }, [token, selectedDhikr]);

  useEffect(() => {
    return () => { if (pendingRef.current > 0) flush(pendingRef.current); };
  }, [flush]);

  const handleTap = useCallback(() => {
    increment();
    playClick();
    if (vibrationEnabled) vibrate(9);
    pendingRef.current++;
    if (pendingRef.current >= SYNC_BATCH) {
      flush(pendingRef.current);
      pendingRef.current = 0;
    }
  }, [increment, playClick, vibrationEnabled, flush]);

  const handleUndo = useCallback(() => {
    undo();
    pendingRef.current = Math.max(0, pendingRef.current - 1);
  }, [undo]);

  const handleReset = useCallback(() => {
    if (pendingRef.current > 0) { flush(pendingRef.current); pendingRef.current = 0; }
    reset();
  }, [flush, reset]);

  // Keyboard / spacebar
  useEffect(() => {
    const h = (e) => { if (e.code === 'Space' || e.code === 'Enter') { e.preventDefault(); handleTap(); } };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [handleTap]);

  const progress = count % 33;
  const pct = (progress / 33) * 100;

  return (
    <div
      style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', background: theme.bg, position: 'relative' }}
      onClick={handleTap}
    >
      {/* Ambient glow */}
      {theme.glow && (
        <div style={{
          position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0,
          background: `radial-gradient(ellipse at 50% 45%, ${theme.accent}0a 0%, transparent 62%)`,
        }} />
      )}

      {/* Stats row */}
      <div style={{ position: 'relative', zIndex: 1, display: 'flex', justifyContent: 'center', padding: '16px 16px 0' }}>
        <div style={{
          display: 'flex', gap: 28,
          background: 'rgba(14,14,44,0.55)',
          border: '1px solid rgba(255,255,255,0.06)',
          borderRadius: 40, padding: '10px 24px',
          backdropFilter: 'blur(16px)',
        }} onClick={e => e.stopPropagation()}>
          {[
            { label: 'Bugün',  value: dailyCount.toLocaleString('tr') },
            { label: 'Toplam', value: totalCount.toLocaleString('tr') },
            { label: 'Seri',   value: `${streakDays}🔥` },
          ].map(({ label, value }) => (
            <div key={label} style={{ textAlign: 'center' }}>
              <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 22, fontWeight: 600, color: theme.counter }}>{value}</div>
              <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 9, color: 'rgba(255,255,255,0.35)', letterSpacing: '0.12em', textTransform: 'uppercase' }}>{label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Bead visual + tap zone */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', position: 'relative', zIndex: 1, paddingBottom: 180, paddingTop: 12 }}>

        {/* Arabic dhikr */}
        <motion.div
          key={selectedDhikr}
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          style={{ fontFamily: "'Scheherazade New', serif", fontSize: 'clamp(1.5rem, 6vw, 2.2rem)', color: theme.accent, direction: 'rtl', marginBottom: 16, textShadow: theme.glow ? `0 0 30px ${theme.accent}44` : 'none' }}
        >
          {currentDhikr.arabic}
        </motion.div>

        {/* Beads */}
        <div style={{ width: '100%', maxWidth: 300, padding: '0 16px' }}>
          <Beads count={count} themeId={themeId} />
        </div>

        {/* Progress bar */}
        <div style={{ width: '100%', maxWidth: 260, margin: '12px auto 0', padding: '0 16px' }} onClick={e => e.stopPropagation()}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
            <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: 'rgba(255,255,255,0.3)' }}>{currentDhikr.transliteration}</span>
            <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: theme.accent, opacity: 0.6 }}>×{currentDhikr.target}</span>
          </div>
          <div style={{ height: 2, background: 'rgba(255,255,255,0.07)', borderRadius: 2, overflow: 'hidden' }}>
            <motion.div
              style={{ height: '100%', background: theme.accent, borderRadius: 2 }}
              animate={{ width: `${pct}%` }}
              transition={{ ease: 'easeOut', duration: 0.2 }}
            />
          </div>
        </div>

        {/* Tap hint */}
        <motion.p
          animate={{ opacity: [0.25, 0.5, 0.25] }}
          transition={{ duration: 2.5, repeat: Infinity }}
          style={{ marginTop: 20, fontFamily: "'DM Sans', sans-serif", fontSize: 10, letterSpacing: '0.35em', textTransform: 'uppercase', color: theme.accent, opacity: 0.35 }}
        >
          Dokun
        </motion.p>
      </div>

      {/* Bottom controls */}
      <div
        style={{ position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 20 }}
        onClick={e => e.stopPropagation()}
      >
        <AdBanner position="bottom" />
        <div style={{
          background: 'rgba(6,6,15,0.92)',
          borderTop: '1px solid rgba(255,255,255,0.05)',
          backdropFilter: 'blur(20px)',
          padding: '12px 16px',
          paddingBottom: 'calc(12px + env(safe-area-inset-bottom))',
        }}>
          {/* Dhikr picker */}
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 12 }}>
            <DhikrPicker />
          </div>

          {/* Action buttons */}
          <div style={{ display: 'flex', gap: 10, maxWidth: 320, margin: '0 auto' }}>
            {/* Undo */}
            <button onClick={handleUndo} style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '11px 0', borderRadius: 12, cursor: 'pointer', background: theme.btnBg, border: `1px solid ${theme.btnBorder}`, color: theme.accent, fontFamily: "'DM Sans', sans-serif", fontSize: 13 }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/>
              </svg>
              Geri Al
            </button>

            {/* Reset */}
            <button onClick={handleReset} style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '11px 0', borderRadius: 12, cursor: 'pointer', background: theme.btnBg, border: `1px solid ${theme.btnBorder}`, color: theme.accent, fontFamily: "'DM Sans', sans-serif", fontSize: 13 }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/>
              </svg>
              Sıfırla
            </button>

            {/* Sound */}
            <button onClick={toggleSound} style={{ padding: '11px 14px', borderRadius: 12, cursor: 'pointer', background: theme.btnBg, border: `1px solid ${theme.btnBorder}`, color: soundEnabled ? theme.accent : 'rgba(255,255,255,0.2)' }}>
              {soundEnabled ? '🔊' : '🔇'}
            </button>

            {/* Vibrate */}
            <button onClick={toggleVibration} style={{ padding: '11px 14px', borderRadius: 12, cursor: 'pointer', background: theme.btnBg, border: `1px solid ${theme.btnBorder}`, color: vibrationEnabled ? theme.accent : 'rgba(255,255,255,0.2)' }}>
              📳
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
