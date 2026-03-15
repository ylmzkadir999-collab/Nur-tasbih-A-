import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { usePrayerTimes, TURKEY_CITIES } from '../hooks/usePrayerTimes';
import { useQibla } from '../hooks/useQibla';
import { useLocation } from '../hooks/useLocation';
import { useTasbihStore } from '../store';
import { THEMES } from '../utils/themes';

const PRAYER_ICONS = {
  Fajr:    '🌙',
  Sunrise: '🌅',
  Dhuhr:   '☀️',
  Asr:     '🌤',
  Maghrib: '🌇',
  Isha:    '🌃',
};

const PRAYER_ORDER = ['Fajr', 'Sunrise', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'];

export default function PrayerTimes() {
  const { theme: themeId } = useTasbihStore();
  const theme = THEMES[themeId] || THEMES.black;

  const { location, locLoading, locError, detectLocation, selectCity, clearLocation } = useLocation();
  const { data, loading, error, formatCountdown, PRAYER_NAMES } = usePrayerTimes(
    location?.lat, location?.lng, location?.city
  );
  const { qiblaAngle, distance, needleRotation, requestCompass, hasCompass, permissionDenied } = useQibla(
    location?.lat, location?.lng
  );

  const [showCityPicker, setShowCityPicker] = useState(false);
  const [activeTab, setActiveTab] = useState('vakitler'); // vakitler | kıble

  const accent = theme.accent;

  return (
    <div style={{
      minHeight: '100dvh',
      background: theme.bg,
      paddingBottom: 90,
    }}>
      <div className="stars" />

      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        style={{ position: 'relative', zIndex: 1, padding: '20px 16px 0' }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <h1 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 24, fontWeight: 400, color: accent, margin: 0 }}>
            Namaz Vakitleri
          </h1>
          {/* Konum butonu */}
          <button
            onClick={() => setShowCityPicker(v => !v)}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '7px 12px', borderRadius: 20,
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.1)',
              color: location ? accent : 'rgba(255,255,255,0.4)',
              fontFamily: "'DM Sans', sans-serif", fontSize: 12, cursor: 'pointer',
            }}
          >
            📍 {location?.city || 'Şehir Seç'}
          </button>
        </div>

        {/* Tab bar */}
        <div style={{ display: 'flex', gap: 4, background: 'rgba(255,255,255,0.04)', borderRadius: 12, padding: 4 }}>
          {[['vakitler', '🕌 Vakitler'], ['kıble', '🧭 Kıble']].map(([id, label]) => (
            <button key={id} onClick={() => setActiveTab(id)} style={{
              flex: 1, padding: '9px 0', borderRadius: 9, cursor: 'pointer',
              background: activeTab === id ? `${accent}18` : 'transparent',
              border: `1px solid ${activeTab === id ? `${accent}35` : 'transparent'}`,
              color: activeTab === id ? accent : 'rgba(255,255,255,0.4)',
              fontFamily: "'DM Sans', sans-serif", fontSize: 13, transition: 'all 0.2s',
            }}>
              {label}
            </button>
          ))}
        </div>
      </motion.div>

      {/* City picker dropdown */}
      <AnimatePresence>
        {showCityPicker && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            style={{
              position: 'relative', zIndex: 10,
              margin: '8px 16px 0',
              background: 'rgba(10,10,28,0.97)',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: 14, overflow: 'hidden',
              backdropFilter: 'blur(20px)',
            }}
          >
            {/* GPS */}
            <button
              onClick={() => { detectLocation(); setShowCityPicker(false); }}
              disabled={locLoading}
              style={{
                width: '100%', padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 10,
                background: 'transparent', border: 'none', borderBottom: '1px solid rgba(255,255,255,0.05)',
                color: accent, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif", fontSize: 13,
              }}
            >
              📡 {locLoading ? 'Konum alınıyor...' : 'GPS ile Otomatik Tespit'}
            </button>
            {/* Şehirler */}
            <div style={{ maxHeight: 260, overflowY: 'auto' }}>
              {TURKEY_CITIES.map((city, i) => (
                <button key={city.name} onClick={() => { selectCity(city); setShowCityPicker(false); }} style={{
                  width: '100%', padding: '11px 16px', display: 'flex', alignItems: 'center',
                  background: location?.city === city.name ? `${accent}10` : 'transparent',
                  border: 'none', borderBottom: i < TURKEY_CITIES.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none',
                  color: location?.city === city.name ? accent : 'rgba(255,255,255,0.65)',
                  cursor: 'pointer', fontFamily: "'DM Sans', sans-serif", fontSize: 13, textAlign: 'left',
                }}>
                  {city.name}
                  {location?.city === city.name && <span style={{ marginLeft: 'auto', fontSize: 10 }}>✓</span>}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* İçerik */}
      <div style={{ position: 'relative', zIndex: 1, padding: '12px 16px 0' }}>

        {/* Konum yok */}
        {!location && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            style={{
              textAlign: 'center', padding: '48px 24px',
              background: 'rgba(14,14,44,0.4)',
              border: '1px solid rgba(255,255,255,0.06)',
              borderRadius: 20, marginTop: 8,
            }}
          >
            <div style={{ fontSize: 48, marginBottom: 16 }}>🕌</div>
            <p style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 20, color: 'rgba(255,255,255,0.6)', margin: '0 0 20px' }}>
              Namaz vakitleri için konum seçin
            </p>
            <button
              onClick={detectLocation}
              disabled={locLoading}
              style={{
                padding: '12px 24px', borderRadius: 12, cursor: 'pointer',
                background: `${accent}18`, border: `1px solid ${accent}40`,
                color: accent, fontFamily: "'DM Sans', sans-serif", fontSize: 14,
              }}
            >
              {locLoading ? '📡 Alınıyor...' : '📡 Konumumu Kullan'}
            </button>
            {locError && <p style={{ marginTop: 10, fontSize: 12, color: '#f06060', fontFamily: "'DM Sans', sans-serif" }}>{locError}</p>}
          </motion.div>
        )}

        {/* === VAKİTLER TAB === */}
        {location && activeTab === 'vakitler' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>

            {/* Bir sonraki vakit */}
            {data?.next && (
              <div style={{
                borderRadius: 18,
                background: `linear-gradient(135deg, ${accent}18, ${accent}08)`,
                border: `1px solid ${accent}30`,
                padding: '20px 20px',
                marginBottom: 12,
                boxShadow: theme.glow ? `0 0 30px ${accent}12` : 'none',
              }}>
                <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: `${accent}80`, letterSpacing: '0.2em', marginBottom: 8 }}>
                  SONRAKİ VAKİT
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div>
                    <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 30, color: accent, fontWeight: 600, lineHeight: 1 }}>
                      {PRAYER_ICONS[data.next.key]} {data.next.name}
                    </div>
                    <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 22, color: 'rgba(255,255,255,0.7)', marginTop: 4 }}>
                      {data.next.time}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, color: 'rgba(255,255,255,0.35)', marginBottom: 4 }}>kalan</div>
                    <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 22, color: 'rgba(255,255,255,0.8)', fontWeight: 600 }}>
                      {formatCountdown(data.next.diffMinutes)}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Tüm vakitler */}
            {loading && (
              <div style={{ textAlign: 'center', padding: 40, color: 'rgba(255,255,255,0.3)', fontFamily: "'DM Sans', sans-serif", fontSize: 13 }}>
                Yükleniyor...
              </div>
            )}
            {error && (
              <div style={{ textAlign: 'center', padding: 20, color: '#f06060', fontFamily: "'DM Sans', sans-serif", fontSize: 13 }}>
                {error}
              </div>
            )}
            {data && (
              <>
                <div style={{ borderRadius: 16, background: 'rgba(14,14,44,0.5)', border: '1px solid rgba(255,255,255,0.05)', overflow: 'hidden' }}>
                  {PRAYER_ORDER.map((key, i) => {
                    const isNext = data.next?.key === key;
                    return (
                      <motion.div
                        key={key}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.05 }}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 14,
                          padding: '14px 16px',
                          borderBottom: i < PRAYER_ORDER.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none',
                          background: isNext ? `${accent}0a` : 'transparent',
                        }}
                      >
                        <span style={{ fontSize: 20, width: 28, textAlign: 'center' }}>{PRAYER_ICONS[key]}</span>
                        <span style={{ flex: 1, fontFamily: "'DM Sans', sans-serif", fontSize: 14, color: isNext ? accent : 'rgba(255,255,255,0.7)', fontWeight: isNext ? 500 : 400 }}>
                          {PRAYER_NAMES[key]}
                        </span>
                        <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 16, color: isNext ? accent : 'rgba(255,255,255,0.5)' }}>
                          {data.timings[key]}
                        </span>
                        {isNext && (
                          <span style={{ width: 6, height: 6, borderRadius: '50%', background: accent, boxShadow: `0 0 6px ${accent}` }} />
                        )}
                      </motion.div>
                    );
                  })}
                </div>

                {/* Hicri tarih */}
                <div style={{ textAlign: 'center', marginTop: 12, padding: '10px 0' }}>
                  <span style={{ fontFamily: "'Scheherazade New', serif", fontSize: 15, color: `${accent}60`, direction: 'rtl' }}>
                    {data.hijri}
                  </span>
                </div>
              </>
            )}
          </motion.div>
        )}

        {/* === KIBLE TAB === */}
        {location && activeTab === 'kıble' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ paddingTop: 8 }}>

            {/* Kabe mesafesi */}
            {distance && (
              <div style={{
                textAlign: 'center', padding: '16px 0 20px',
                borderBottom: '1px solid rgba(255,255,255,0.05)',
                marginBottom: 24,
              }}>
                <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: 'rgba(255,255,255,0.3)', letterSpacing: '0.2em', marginBottom: 6 }}>
                  KA'BE'YE MESAFE
                </div>
                <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 36, color: accent, fontWeight: 600 }}>
                  {distance.toLocaleString('tr')} km
                </div>
              </div>
            )}

            {/* Pusula dairesi */}
            {qiblaAngle !== null && (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20 }}>

                {/* Pusula SVG */}
                <div style={{ position: 'relative', width: 240, height: 240 }}>
                  {/* Dış halka */}
                  <svg width="240" height="240" viewBox="0 0 240 240" style={{ position: 'absolute', inset: 0 }}>
                    <circle cx="120" cy="120" r="114" fill="none"
                      stroke={`${accent}20`} strokeWidth="1.5"
                      strokeDasharray="4 6" />
                    <circle cx="120" cy="120" r="100" fill="rgba(14,14,44,0.6)"
                      stroke={`${accent}15`} strokeWidth="1" />
                    {/* Yön işaretleri */}
                    {[['K', 0], ['D', 90], ['G', 180], ['B', 270]].map(([label, deg]) => {
                      const rad = (deg - 90) * Math.PI / 180;
                      const x = 120 + 88 * Math.cos(rad);
                      const y = 120 + 88 * Math.sin(rad);
                      return (
                        <text key={label} x={x} y={y} textAnchor="middle" dominantBaseline="middle"
                          fill={deg === 0 ? accent : `${accent}50`}
                          fontSize="13" fontFamily="'DM Mono', monospace" fontWeight={deg === 0 ? '600' : '400'}>
                          {label}
                        </text>
                      );
                    })}
                  </svg>

                  {/* Dönen Kabe ibresi */}
                  <motion.div
                    animate={{ rotate: needleRotation ?? qiblaAngle }}
                    transition={{ type: 'spring', stiffness: 60, damping: 15 }}
                    style={{
                      position: 'absolute', inset: 0,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}
                  >
                    <svg width="240" height="240" viewBox="0 0 240 240">
                      {/* İbre */}
                      <line x1="120" y1="120" x2="120" y2="36"
                        stroke={accent} strokeWidth="2.5" strokeLinecap="round" />
                      <polygon points="120,28 114,44 126,44"
                        fill={accent} />
                      {/* Kabe ikonu */}
                      <text x="120" y="22" textAnchor="middle" fontSize="14">🕋</text>
                      {/* Ters ibre */}
                      <line x1="120" y1="120" x2="120" y2="200"
                        stroke={`${accent}30`} strokeWidth="1.5" strokeLinecap="round" />
                    </svg>
                  </motion.div>

                  {/* Merkez nokta */}
                  <div style={{
                    position: 'absolute', top: '50%', left: '50%',
                    transform: 'translate(-50%, -50%)',
                    width: 12, height: 12, borderRadius: '50%',
                    background: accent, boxShadow: `0 0 12px ${accent}`,
                  }} />
                </div>

                {/* Derece */}
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 28, color: accent, fontWeight: 600 }}>
                    {qiblaAngle}°
                  </div>
                  <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: 'rgba(255,255,255,0.4)', marginTop: 4 }}>
                    Kuzeyden saat yönünde
                  </div>
                </div>

                {/* Canlı pusula butonu */}
                {!hasCompass && !permissionDenied && (
                  <button onClick={requestCompass} style={{
                    padding: '10px 20px', borderRadius: 12, cursor: 'pointer',
                    background: `${accent}10`, border: `1px solid ${accent}30`,
                    color: accent, fontFamily: "'DM Sans', sans-serif", fontSize: 13,
                  }}>
                    🧭 Canlı Pusula Aç
                  </button>
                )}
                {hasCompass && (
                  <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, color: `${accent}60` }}>
                    ✓ Canlı pusula aktif — telefonu çevir
                  </div>
                )}
                {permissionDenied && (
                  <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, color: '#f06060' }}>
                    Pusula izni verilmedi. Derece değerini kullanabilirsiniz.
                  </div>
                )}
              </div>
            )}
          </motion.div>
        )}
      </div>
    </div>
  );
}
