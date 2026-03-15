import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { useDailyAyah } from '../hooks/useDailyAyah';
import { useAuthStore, useTasbihStore } from '../store';
import { useFavorites } from '../hooks/useFavorites';
import AdBanner from '../components/AdBanner';

function Stat({ label, value, color }) {
  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 32, fontWeight: 600, color: color || '#e0e0f8', lineHeight: 1 }}>
        {value}
      </div>
      <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 10, letterSpacing: '0.18em', color: 'rgba(255,255,255,0.35)', marginTop: 4, textTransform: 'uppercase' }}>
        {label}
      </div>
    </div>
  );
}

export default function Home() {
  const { ayah, loading } = useDailyAyah();
  const fav = useFavorites();
  const [toast, setToast] = useState('');

  const handleFavAyah = async () => {
    if (!ayah) return;
    const [sure, ayahNo] = (ayah.verse || '1:1').split(':').map(Number);
    try {
      const added = await fav.toggleFavorite({
        sureNo: sure, ayahNo: ayahNo,
        arabic: ayah.arabic, translation: ayah.turkish,
        source: 'diyanet', sureName: ayah.surah,
      });
      setToast(added ? '⭐ Favorilere eklendi' : '✕ Çıkarıldı');
      setTimeout(() => setToast(''), 2000);
    } catch {}
  };
  const { user } = useAuthStore();
  const { totalCount, dailyCount, streakDays } = useTasbihStore();
  const [showFull, setShowFull] = useState(false);

  return (
    <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', background: 'radial-gradient(ellipse at 50% 30%, #111130 0%, #06060f 70%)' }}>
      <div className="stars" />
      {toast && (
        <div style={{ position: 'fixed', top: 20, left: '50%', transform: 'translateX(-50%)', zIndex: 200, background: 'rgba(14,14,44,0.95)', border: '1px solid rgba(245,184,0,0.3)', color: '#f5b800', fontFamily: "'DM Sans', sans-serif", fontSize: 13, padding: '10px 20px', borderRadius: 20, pointerEvents: 'none' }}>
          {toast}
        </div>
      )}

      {/* Header */}
      <motion.header
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        style={{ padding: '24px 20px 0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'relative', zIndex: 1 }}
      >
        <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 22, fontWeight: 400, color: '#f5b800', letterSpacing: '0.04em' }}>
          Nur Tasbih
        </div>
        {user ? (
          <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>
            {user.email}
          </div>
        ) : (
          <Link to="/settings" style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: 'rgba(245,184,0,0.7)', textDecoration: 'none' }}>
            Giriş Yap →
          </Link>
        )}
      </motion.header>

      {/* Opening verse */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.9, delay: 0.15 }}
        style={{ textAlign: 'center', padding: '40px 28px 32px', position: 'relative', zIndex: 1 }}
      >
        <div style={{
          fontFamily: "'Scheherazade New', serif",
          fontSize: 'clamp(1.6rem, 6vw, 2.4rem)',
          color: '#f5b800',
          direction: 'rtl',
          lineHeight: 1.7,
          textShadow: '0 0 40px rgba(245,184,0,0.25)',
          marginBottom: 14,
        }}>
          اللَّهُ نُورُ السَّمَاوَاتِ وَالْأَرْضِ
        </div>
        <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 16, fontStyle: 'italic', color: 'rgba(255,255,255,0.45)' }}>
          "Allah göklerin ve yerin nurudur." — Nûr 35
        </div>
      </motion.div>

      {/* Stats */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.7, delay: 0.3 }}
        style={{
          margin: '0 16px',
          borderRadius: 16,
          background: 'rgba(14,14,44,0.5)',
          border: '1px solid rgba(245,184,0,0.1)',
          padding: '20px 24px',
          display: 'flex',
          justifyContent: 'space-around',
          position: 'relative', zIndex: 1,
        }}
      >
        <Stat label="Bugün"   value={dailyCount.toLocaleString('tr')} color="#f5b800" />
        <div style={{ width: 1, background: 'rgba(255,255,255,0.07)' }} />
        <Stat label="Toplam"  value={totalCount.toLocaleString('tr')} />
        <div style={{ width: 1, background: 'rgba(255,255,255,0.07)' }} />
        <Stat label="Seri"    value={`${streakDays}🔥`} />
      </motion.div>

      {/* CTA */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.45 }}
        style={{ padding: '20px 16px', position: 'relative', zIndex: 1 }}
      >
        <Link to="/tasbih" style={{
          display: 'block', width: '100%', textAlign: 'center',
          padding: '16px 0', borderRadius: 14,
          background: 'linear-gradient(135deg, rgba(245,184,0,0.15), rgba(245,184,0,0.08))',
          border: '1px solid rgba(245,184,0,0.3)',
          color: '#f5b800',
          fontFamily: "'Cormorant Garamond', serif",
          fontSize: 20, fontWeight: 600, letterSpacing: '0.05em',
          textDecoration: 'none',
          boxShadow: '0 0 30px rgba(245,184,0,0.08)',
        }}>
          📿 Tesbihe Başla
        </Link>
      </motion.div>

      {/* Daily Ayah */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.8, delay: 0.6 }}
        style={{ margin: '0 16px', position: 'relative', zIndex: 1 }}
      >
        <div style={{
          borderRadius: 16,
          background: 'rgba(10,10,28,0.6)',
          border: '1px solid rgba(255,255,255,0.06)',
          padding: '20px 20px',
        }}>
          <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 10, color: 'rgba(245,184,0,0.5)', letterSpacing: '0.2em', marginBottom: 14, textTransform: 'uppercase' }}>
            Günün Ayeti
          </div>
          {loading ? (
            <div style={{ textAlign: 'center', color: 'rgba(255,255,255,0.2)', fontFamily: "'DM Sans', sans-serif", fontSize: 13 }}>Yükleniyor...</div>
          ) : ayah ? (
            <>
              <div style={{ fontFamily: "'Scheherazade New', serif", fontSize: 'clamp(1.3rem, 4vw, 1.8rem)', color: '#e0d0a0', direction: 'rtl', lineHeight: 1.8, textAlign: 'right', marginBottom: 14 }}>
                {ayah.arabic}
              </div>
              <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 15, fontStyle: 'italic', color: 'rgba(255,255,255,0.55)', lineHeight: 1.6 }}>
                {ayah.turkish}
              </div>
              {ayah.surah && (
                <div style={{ marginTop: 10, fontFamily: "'DM Mono', monospace", fontSize: 10, color: 'rgba(255,255,255,0.2)', letterSpacing: '0.1em' }}>
                  {ayah.surah} · {ayah.verse}
                </div>
              )}
              <button onClick={handleFavAyah} style={{ marginTop: 12, padding: '6px 14px', borderRadius: 20, border: 'none', cursor: 'pointer', background: 'rgba(245,184,0,0.08)', color: 'rgba(245,184,0,0.6)', fontFamily: "'DM Sans', sans-serif", fontSize: 11 }}>
                ☆ Favori
              </button>
            </>
          ) : null}
        </div>
      </motion.div>

      {/* Ad */}
      <div style={{ marginTop: 'auto', paddingBottom: 80, position: 'relative', zIndex: 1 }}>
        <AdBanner position="inline" />
      </div>
    </div>
  );
}
