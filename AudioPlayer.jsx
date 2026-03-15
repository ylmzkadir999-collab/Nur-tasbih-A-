import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const RECITERS = [
  { id: 'alafasy',  name: 'Mishary Al-Afasy',           nameAr: 'مشاري العفاسي',     url: 'https://backup.quraan.com/alafasy128.mp3',  color: '#f5b800' },
  { id: 'sudais',   name: 'Abdul Rahman Al-Sudais',     nameAr: 'عبد الرحمن السديس', url: 'https://backup.quraan.com/sudaes128.mp3',   color: '#0d9e6e' },
  { id: 'muaiqly',  name: "Maher Al-Mu'aiqly",          nameAr: 'ماهر المعيقلي',     url: 'https://backup.quraan.com/muaiqly128.mp3', color: '#7c5cbf' },
];

export default function AudioPlayer() {
  const [open, setOpen]     = useState(false);
  const [playing, setPlaying] = useState(false);
  const [loading, setLoading] = useState(false);
  const [reciter, setReciter] = useState(RECITERS[0]);
  const [error, setError]   = useState(null);
  const audioRef = useRef(null);

  useEffect(() => {
    const a = new Audio();
    a.preload = 'none';
    a.onplay    = () => { setPlaying(true);  setLoading(false); setError(null); };
    a.onpause   = () => setPlaying(false);
    a.onwaiting = () => setLoading(true);
    a.oncanplay = () => setLoading(false);
    a.onerror   = () => { setError('Akış yüklenemedi'); setLoading(false); setPlaying(false); };
    audioRef.current = a;
    return () => { a.pause(); a.src = ''; };
  }, []);

  const switchReciter = useCallback((r) => {
    const a = audioRef.current;
    if (!a) return;
    a.pause(); a.src = '';
    setReciter(r); setError(null); setLoading(true);
    a.src = r.url;
    a.play().catch(() => { setLoading(false); setError('Akış başlatılamadı'); });
  }, []);

  const togglePlay = useCallback(() => {
    const a = audioRef.current;
    if (!a) return;
    if (playing) { a.pause(); return; }
    setError(null); setLoading(true);
    if (!a.src) a.src = reciter.url;
    a.play().catch(() => { setLoading(false); setError('Akış başlatılamadı'); });
  }, [playing, reciter]);

  return (
    <>
      {/* Floating pill button */}
      <motion.button
        whileTap={{ scale: 0.93 }}
        onClick={() => setOpen(v => !v)}
        style={{
          position: 'fixed', right: 16,
          bottom: playing ? 76 : 16,
          zIndex: 50,
          background: 'rgba(14,14,44,0.85)',
          border: `1px solid ${playing ? 'rgba(245,184,0,0.35)' : 'rgba(255,255,255,0.08)'}`,
          borderRadius: 40,
          padding: '8px 14px',
          display: 'flex', alignItems: 'center', gap: 8,
          cursor: 'pointer',
          boxShadow: playing ? '0 0 20px rgba(245,184,0,0.18)' : 'none',
          backdropFilter: 'blur(16px)',
          transition: 'bottom 0.3s ease',
        }}
      >
        {playing
          ? <div className="audio-wave flex gap-0.5 items-end" style={{ height: 18 }}>{[1,2,3,4,5].map(i => <span key={i} />)}</div>
          : <span style={{ fontSize: 16 }}>🎙</span>
        }
        <span style={{ fontSize: 12, color: playing ? '#f5b800' : '#888', fontFamily: "'DM Sans', sans-serif", whiteSpace: 'nowrap' }}>
          Kuran Radyo
        </span>
      </motion.button>

      {/* Dropdown panel */}
      <AnimatePresence>
        {open && (
          <>
            <div style={{ position: 'fixed', inset: 0, zIndex: 48 }} onClick={() => setOpen(false)} />
            <motion.div
              initial={{ opacity: 0, y: 12, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 12, scale: 0.96 }}
              transition={{ duration: 0.18, ease: [0.22,1,0.36,1] }}
              style={{
                position: 'fixed', right: 16, zIndex: 49,
                bottom: playing ? 136 : 76,
                width: 280,
                background: 'rgba(10,10,30,0.95)',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: 16,
                padding: 16,
                backdropFilter: 'blur(20px)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <span style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 15, color: '#f5b800' }}>Kuran Radyo</span>
                <button onClick={() => setOpen(false)} style={{ background: 'none', border: 'none', color: '#666', cursor: 'pointer', fontSize: 18, lineHeight: 1 }}>×</button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 12 }}>
                {RECITERS.map(r => (
                  <button key={r.id} onClick={() => switchReciter(r)} style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '10px 12px', borderRadius: 10, cursor: 'pointer',
                    background: reciter.id === r.id ? `${r.color}12` : 'rgba(255,255,255,0.03)',
                    border: `1px solid ${reciter.id === r.id ? `${r.color}40` : 'rgba(255,255,255,0.05)'}`,
                    textAlign: 'left',
                  }}>
                    <div style={{
                      width: 32, height: 32, borderRadius: '50%', display: 'flex',
                      alignItems: 'center', justifyContent: 'center', fontSize: 13,
                      background: `${r.color}18`, border: `1px solid ${r.color}30`,
                      color: r.color, flexShrink: 0,
                    }}>
                      {reciter.id === r.id && playing ? '▶' : '♪'}
                    </div>
                    <div>
                      <div style={{ fontSize: 12, color: '#d0d0e8', fontFamily: "'DM Sans', sans-serif", lineHeight: 1.3 }}>{r.name}</div>
                      <div style={{ fontFamily: "'Scheherazade New', serif", fontSize: 13, color: r.color, opacity: 0.7 }}>{r.nameAr}</div>
                    </div>
                  </button>
                ))}
              </div>

              <button onClick={togglePlay} style={{
                width: '100%', padding: '10px 0', borderRadius: 10, cursor: 'pointer',
                background: 'rgba(245,184,0,0.1)', border: '1px solid rgba(245,184,0,0.25)',
                color: '#f5b800', fontFamily: "'DM Sans', sans-serif", fontSize: 13,
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              }}>
                {loading
                  ? <><svg className="animate-spin" width={14} height={14} viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" opacity=".25"/><path fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" opacity=".75"/></svg>Yükleniyor</>
                  : playing ? '⏸ Durdur' : '▶ Dinle'
                }
              </button>

              {error && <p style={{ textAlign: 'center', marginTop: 8, fontSize: 11, color: '#f06060', fontFamily: "'DM Sans', sans-serif" }}>{error}</p>}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
