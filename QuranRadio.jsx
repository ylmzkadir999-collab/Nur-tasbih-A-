/**
 * Kuran Radyosu — Nur Tasbih v7
 * - Sure modu: kullanıcı sure seçer
 * - Hatim modu: kaldığı yerden devam eder
 * - Elmalı Hamdi Yazır / Diyanet meali
 * - Ayet bazı ses (Alafasy), cache-first
 */

import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuran } from '../hooks/useQuran';
import { useFavorites } from '../hooks/useFavorites';

// ─── Renk Paleti ─────────────────────────────────────────────────────────────
const C = {
  bg:      '#06060f',
  card:    'rgba(14,14,44,0.6)',
  border:  'rgba(255,255,255,0.06)',
  gold:    '#f5b800',
  goldD:   'rgba(245,184,0,0.15)',
  goldB:   'rgba(245,184,0,0.35)',
  green:   '#0d9e6e',
  text:    '#d0d0e8',
  muted:   'rgba(255,255,255,0.35)',
  dim:     'rgba(255,255,255,0.12)',
};

const ff = {
  arabic: "'Scheherazade New', 'Traditional Arabic', serif",
  title:  "'Cormorant Garamond', serif",
  ui:     "'DM Sans', sans-serif",
  mono:   "'DM Mono', monospace",
};

const RECITERS = [
  { id: 'alafasy',  name: 'Alafasy',   nameAr: 'الأفاسي',   color: '#f5b800' },
  { id: 'husary',   name: 'Husary',    nameAr: 'الحصري',    color: '#0d9e6e' },
  { id: 'minshawi', name: 'Minshawi',  nameAr: 'المنشاوي',  color: '#7c5cbf' },
];

export default function QuranRadio() {
  const q = useQuran();
  const fav = useFavorites();
  const [favToast,  setFavToast]  = useState('');
  const [reciter,   setReciter]   = useState('alafasy');
  const audioRef = useRef(null);

  const [tab, setTab]           = useState('player');

  const handleFavorite = async () => {
    if (!q.ayahData) return;
    try {
      const added = await fav.toggleFavorite({
        sureNo:      q.currentSure,
        ayahNo:      q.currentAyah,
        arabic:      q.ayahData.arabic,
        translation: q.translation === 'yazir' ? q.ayahData.yazir : q.ayahData.diyanet,
        source:      q.translation,
        sureName:    q.currentSureInfo?.turkishName,
      });
      setFavToast(added ? '⭐ Favorilere eklendi' : '✕ Favorilerden çıkarıldı');
      setTimeout(() => setFavToast(''), 2000);
    } catch { setFavToast('Hata oluştu'); setTimeout(() => setFavToast(''), 2000); }
  };

  const handleShare = async () => {
    if (!q.ayahData) return;
    const text = q.ayahData.arabic + '\n\n' +
      (q.translation === 'yazir' ? q.ayahData.yazir : q.ayahData.diyanet) +
      '\n\n— ' + (q.currentSureInfo?.turkishName || '') + ' ' + q.currentSure + ':' + q.currentAyah +
      '\n\nNur Tasbih';
    if (navigator.share) {
      navigator.share({ text }).catch(() => {});
    } else {
      navigator.clipboard?.writeText(text);
      setFavToast('📋 Kopyalandı');
      setTimeout(() => setFavToast(''), 2000);
    }
  };  // 'player' | 'sureler'
  const [searchQ, setSearchQ]   = useState('');

  // Audio element'i hook'a bağla
  useEffect(() => {
    if (audioRef.current) q.getAudioRef(audioRef.current);
  }, []);

  // Filtrelenmiş sure listesi
  const filteredSures = q.sureList.filter(s =>
    !searchQ ||
    s.turkishName?.toLowerCase().includes(searchQ.toLowerCase()) ||
    String(s.number).includes(searchQ)
  );

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div style={{ minHeight: '100dvh', background: C.bg, paddingBottom: 90 }}>
      {/* Toast */}
      {favToast && (
        <div style={{ position: 'fixed', top: 20, left: '50%', transform: 'translateX(-50%)', zIndex: 200, background: 'rgba(14,14,44,0.95)', border: '1px solid rgba(245,184,0,0.3)', color: C.gold, fontFamily: ff.ui, fontSize: 13, padding: '10px 20px', borderRadius: 20, pointerEvents: 'none' }}>
          {favToast}
        </div>
      )}
      <div className="stars" />

      {/* Gizli audio element */}
      <audio ref={audioRef} preload="auto" style={{ display: 'none' }} />

      {/* ── Başlık ── */}
      <div style={{ position: 'relative', zIndex: 1, padding: '36px 20px 16px', textAlign: 'center' }}>
        <div style={{ fontFamily: ff.mono, fontSize: 9, color: 'rgba(245,184,0,0.5)', letterSpacing: '0.3em', marginBottom: 10 }}>
          NUR · KURAN RADYOSU
        </div>
        <div style={{ fontFamily: ff.arabic, fontSize: 26, color: C.gold, marginBottom: 4, direction: 'rtl' }}>
          بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ
        </div>
        <div style={{ fontFamily: ff.ui, fontSize: 11, color: C.muted }}>
          Bismillâhirrahmânirrahîm
        </div>
      </div>

      {/* ── Hafız seçici ── */}
      <div style={{ position: 'relative', zIndex: 1, display: 'flex', gap: 6, padding: '0 16px 12px' }}>
        {RECITERS.map(r => (
          <button key={r.id} onClick={() => setReciter(r.id)} style={{
            flex: 1, padding: '7px 0', borderRadius: 10, cursor: 'pointer',
            fontFamily: "'DM Sans', sans-serif", fontSize: 10, fontWeight: 600,
            background: reciter === r.id ? r.color + '15' : 'transparent',
            border: `1px solid ${reciter === r.id ? r.color : 'rgba(255,255,255,0.08)'}`,
            color: reciter === r.id ? r.color : 'rgba(255,255,255,0.3)',
            transition: 'all 0.2s',
          }}>
            {r.name}
          </button>
        ))}
      </div>

      {/* ── Mod seçici ── */}
      <div style={{ position: 'relative', zIndex: 1, display: 'flex', gap: 8, padding: '0 16px 16px' }}>
        {[['sure', '📖 Sure Modu'], ['hatim', '🔄 Hatim Modu']].map(([m, label]) => (
          <button key={m} onClick={() => { q.setMode(m); if (m === 'hatim') q.resumeHatim(); }}
            style={{
              flex: 1, padding: '10px 0', borderRadius: 12, cursor: 'pointer',
              fontFamily: ff.ui, fontSize: 12, fontWeight: 600,
              background: q.mode === m ? C.goldD : 'transparent',
              border: `1.5px solid ${q.mode === m ? C.gold : C.dim}`,
              color: q.mode === m ? C.gold : C.muted,
              transition: 'all 0.2s',
            }}>
            {label}
          </button>
        ))}
      </div>

      {/* ── Hatim ilerleme (hatim modunda) ── */}
      <AnimatePresence>
        {q.mode === 'hatim' && (
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            style={{ position: 'relative', zIndex: 1, margin: '0 16px 14px', padding: '12px 16px', borderRadius: 12, background: C.card, border: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: 22 }}>📜</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontFamily: ff.ui, fontSize: 11, color: C.muted, marginBottom: 4 }}>
                Hatim İlerlemeniz
              </div>
              <div style={{ fontFamily: ff.ui, fontSize: 12, color: C.text }}>
                {q.hatimProgress.completed > 0
                  ? `${q.hatimProgress.completed}. hatmi tamamladınız · `
                  : ''}
                Sure {q.hatimProgress.sure} · Ayet {q.hatimProgress.ayah}
              </div>
            </div>
            <div style={{ fontFamily: ff.mono, fontSize: 10, color: C.gold }}>
              %{Math.round(((q.hatimProgress.sure - 1) / 114) * 100)}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Tab bar ── */}
      <div style={{ position: 'relative', zIndex: 1, display: 'flex', margin: '0 16px 16px', borderRadius: 12, background: C.card, border: `1px solid ${C.border}`, overflow: 'hidden' }}>
        {[['player', '▶ Oynatıcı'], ['sureler', '☰ Sureler']].map(([t, label]) => (
          <button key={t} onClick={() => setTab(t)} style={{
            flex: 1, padding: '11px 0', border: 'none', cursor: 'pointer',
            fontFamily: ff.ui, fontSize: 12, fontWeight: 600,
            background: tab === t ? C.goldD : 'transparent',
            color: tab === t ? C.gold : C.muted,
            borderBottom: tab === t ? `2px solid ${C.gold}` : '2px solid transparent',
            transition: 'all 0.15s',
          }}>
            {label}
          </button>
        ))}
      </div>

      {/* ══ OYNATICI TABI ══════════════════════════════════════════════════ */}
      {tab === 'player' && (
        <div style={{ position: 'relative', zIndex: 1 }}>

          {/* Sure başlığı */}
          <div style={{ textAlign: 'center', padding: '0 16px 20px' }}>
            <div style={{ fontFamily: ff.title, fontSize: 32, color: C.gold, fontWeight: 300 }}>
              {q.currentSureInfo?.turkishName || '—'}
            </div>
            <div style={{ fontFamily: ff.ui, fontSize: 11, color: C.muted, marginTop: 4 }}>
              {q.currentSureInfo?.numberOfAyahs} ayet · {q.currentSureInfo?.revelationType === 'Meccan' ? 'Mekkî' : 'Medenî'}
            </div>
          </div>

          {/* Ayet kartı */}
          <div style={{ margin: '0 16px 16px', padding: '24px 20px', borderRadius: 18, background: C.card, border: `1px solid ${C.border}`, minHeight: 200 }}>
            {q.isLoading ? (
              <div style={{ textAlign: 'center', padding: 40 }}>
                <div style={{ fontFamily: ff.mono, fontSize: 11, color: C.muted }}>Yükleniyor...</div>
              </div>
            ) : q.error ? (
              <div style={{ textAlign: 'center', padding: 20 }}>
                <div style={{ fontSize: 28, marginBottom: 8 }}>⚠️</div>
                <div style={{ fontFamily: ff.ui, fontSize: 12, color: '#f06060' }}>{q.error}</div>
              </div>
            ) : q.ayahData ? (
              <AnimatePresence mode="wait">
                <motion.div key={`${q.currentSure}-${q.currentAyah}`}
                  initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.25 }}>

                  {/* Ayet numarası */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                    <div style={{ fontFamily: ff.mono, fontSize: 10, color: C.muted }}>
                      {q.currentSure}:{q.currentAyah}
                    </div>
                    <div style={{ width: 28, height: 28, borderRadius: '50%', background: C.goldD, border: `1px solid ${C.goldB}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: ff.mono, fontSize: 9, color: C.gold }}>
                      {q.currentAyah}
                    </div>
                  </div>

                  {/* Arapça metin */}
                  <div style={{ fontFamily: ff.arabic, fontSize: 26, color: '#ffe9a0', lineHeight: 2, textAlign: 'right', direction: 'rtl', marginBottom: 20, padding: '12px 0', borderBottom: `1px solid ${C.border}` }}>
                    {q.ayahData.arabic}
                  </div>

                  {/* Meal seçici */}
                  <div style={{ display: 'flex', gap: 6, marginBottom: 14 }}>
                    {[['yazir', 'Elmalı Yazır'], ['diyanet', 'Diyanet']].map(([key, label]) => (
                      <button key={key} onClick={() => q.setTranslation(key)} style={{
                        padding: '5px 12px', borderRadius: 20, cursor: 'pointer',
                        fontFamily: ff.ui, fontSize: 10, fontWeight: 600,
                        background: q.translation === key ? C.goldD : 'transparent',
                        border: `1px solid ${q.translation === key ? C.gold : C.dim}`,
                        color: q.translation === key ? C.gold : C.muted,
                        transition: 'all 0.15s',
                      }}>
                        {label}
                      </button>
                    ))}
                  </div>

                  {/* Meal metni */}
                  <div style={{ fontFamily: ff.ui, fontSize: 13, color: C.text, lineHeight: 1.8 }}>
                    {q.translation === 'yazir'
                      ? q.ayahData.yazir
                      : q.ayahData.diyanet}
                  </div>

                  {/* Favori + Paylaş */}
                  <div style={{ display: 'flex', gap: 8, marginTop: 16, justifyContent: 'flex-end' }}>
                    <button onClick={handleFavorite} style={{
                      padding: '7px 14px', borderRadius: 20, cursor: 'pointer', border: 'none',
                      background: fav.isFavorite(q.currentSure, q.currentAyah) ? 'rgba(245,184,0,0.2)' : C.dim,
                      color: fav.isFavorite(q.currentSure, q.currentAyah) ? C.gold : C.muted,
                      fontFamily: ff.ui, fontSize: 12, transition: 'all 0.15s',
                    }}>
                      {fav.isFavorite(q.currentSure, q.currentAyah) ? '⭐ Favorilerde' : '☆ Favori'}
                    </button>
                    <button onClick={handleShare} style={{
                      padding: '7px 14px', borderRadius: 20, cursor: 'pointer', border: 'none',
                      background: C.dim, color: C.muted,
                      fontFamily: ff.ui, fontSize: 12,
                    }}>
                      ↗ Paylaş
                    </button>
                  </div>
                </motion.div>
              </AnimatePresence>
            ) : null}
          </div>

          {/* Progress bar */}
          <div style={{ margin: '0 16px 16px' }}>
            <div style={{ height: 3, background: C.dim, borderRadius: 99, overflow: 'hidden' }}>
              <motion.div
                style={{ height: '100%', background: C.gold, borderRadius: 99 }}
                animate={{ width: `${q.progress * 100}%` }}
                transition={{ duration: 0.3 }}
              />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6, fontFamily: ff.mono, fontSize: 9, color: C.muted }}>
              <span>Ayet {q.currentAyah}</span>
              <span>{q.totalAyahs} ayet</span>
            </div>
          </div>

          {/* Kontroller */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 16, padding: '4px 16px 20px' }}>

            {/* Önceki */}
            <button onClick={q.prevAyah} disabled={q.currentSure === 1 && q.currentAyah === 1}
              style={{ width: 48, height: 48, borderRadius: '50%', border: `1px solid ${C.dim}`, background: 'transparent', color: C.muted, fontSize: 18, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: (q.currentSure === 1 && q.currentAyah === 1) ? 0.3 : 1 }}>
              ⏮
            </button>

            {/* Çal/Duraklat */}
            <button onClick={q.togglePlay}
              style={{ width: 68, height: 68, borderRadius: '50%', border: `2px solid ${C.gold}`, background: C.goldD, color: C.gold, fontSize: 26, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: `0 0 24px rgba(245,184,0,0.2)`, transition: 'all 0.2s' }}>
              {q.isLoading ? '⏳' : q.isPlaying ? '⏸' : '▶'}
            </button>

            {/* Sonraki */}
            <button onClick={q.nextAyah}
              style={{ width: 48, height: 48, borderRadius: '50%', border: `1px solid ${C.dim}`, background: 'transparent', color: C.muted, fontSize: 18, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              ⏭
            </button>
          </div>

          {/* Hafız bilgisi */}
          <div style={{ textAlign: 'center', padding: '0 16px', fontFamily: ff.mono, fontSize: 9, color: C.dim, letterSpacing: '0.1em' }}>
            HAFIZ MİŞARI RÂŞİD EL-AFÂSÎ · 128kbps
          </div>
        </div>
      )}

      {/* ══ SURELER TABI ══════════════════════════════════════════════════ */}
      {tab === 'sureler' && (
        <div style={{ position: 'relative', zIndex: 1, padding: '0 16px' }}>

          {/* Arama */}
          <div style={{ position: 'relative', marginBottom: 14 }}>
            <input
              value={searchQ}
              onChange={e => setSearchQ(e.target.value)}
              placeholder="Sure ara... (Bakara, 2...)"
              style={{
                width: '100%', padding: '11px 16px 11px 38px', borderRadius: 12, boxSizing: 'border-box',
                background: C.card, border: `1px solid ${C.border}`, color: C.text,
                fontFamily: ff.ui, fontSize: 13, outline: 'none',
              }}
            />
            <span style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)', color: C.muted, fontSize: 14 }}>
              🔍
            </span>
          </div>

          {/* Sure listesi */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {filteredSures.map(sure => {
              const isActive = sure.number === q.currentSure;
              return (
                <button key={sure.number}
                  onClick={() => { q.selectSure(sure.number); setTab('player'); }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 14,
                    padding: '12px 14px', borderRadius: 12, cursor: 'pointer', textAlign: 'left',
                    background: isActive ? C.goldD : C.card,
                    border: `1px solid ${isActive ? C.goldB : C.border}`,
                    transition: 'all 0.15s',
                  }}>
                  {/* Sure numarası */}
                  <div style={{ width: 32, height: 32, borderRadius: '50%', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: isActive ? C.goldD : C.dim, border: `1px solid ${isActive ? C.gold : 'transparent'}` }}>
                    <span style={{ fontFamily: ff.mono, fontSize: 10, color: isActive ? C.gold : C.muted }}>
                      {sure.number}
                    </span>
                  </div>
                  {/* İsim */}
                  <div style={{ flex: 1 }}>
                    <div style={{ fontFamily: ff.title, fontSize: 16, color: isActive ? C.gold : C.text }}>
                      {sure.turkishName}
                    </div>
                    <div style={{ fontFamily: ff.ui, fontSize: 10, color: C.muted, marginTop: 1 }}>
                      {sure.numberOfAyahs} ayet · {sure.revelationType === 'Meccan' ? 'Mekkî' : 'Medenî'}
                    </div>
                  </div>
                  {/* Arapça isim */}
                  <div style={{ fontFamily: ff.arabic, fontSize: 18, color: isActive ? C.gold : C.muted, direction: 'rtl' }}>
                    {sure.name}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
