import React from 'react';
import { motion } from 'framer-motion';
import { useNotifications } from '../hooks/useNotifications';

const PRAYER_ORDER = ['Fajr', 'Sunrise', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'];
const PRAYER_ICONS = { Fajr:'🌙', Sunrise:'🌅', Dhuhr:'☀️', Asr:'🌤', Maghrib:'🌇', Isha:'🌃' };

export default function NotificationSettings({ timings, accent = '#f5b800' }) {
  const { permission, prefs, savePrefs, requestPermission, PRAYER_LABELS } = useNotifications(timings);

  const toggleEnabled = async () => {
    if (!prefs.enabled) {
      const granted = await requestPermission();
      if (!granted) return;
    }
    savePrefs({ enabled: !prefs.enabled });
  };

  const togglePrayer = (key) => {
    savePrefs({ prayers: { ...prefs.prayers, [key]: !prefs.prayers[key] } });
  };

  return (
    <div>
      {/* Ana toggle */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '14px 16px',
        borderBottom: '1px solid rgba(255,255,255,0.05)',
      }}>
        <span style={{ fontSize: 18 }}>🔔</span>
        <span style={{ flex: 1, fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: '#c0c0d8' }}>
          Namaz Vakti Bildirimleri
        </span>
        <div onClick={toggleEnabled} style={{
          width: 44, height: 24, borderRadius: 12, cursor: 'pointer',
          background: prefs.enabled ? `${accent}40` : 'rgba(255,255,255,0.08)',
          border: `1px solid ${prefs.enabled ? `${accent}60` : 'rgba(255,255,255,0.1)'}`,
          position: 'relative', transition: 'all 0.2s',
        }}>
          <div style={{
            position: 'absolute', top: 3,
            left: prefs.enabled ? 22 : 3,
            width: 16, height: 16, borderRadius: '50%',
            background: prefs.enabled ? accent : 'rgba(255,255,255,0.3)',
            transition: 'left 0.2s',
          }} />
        </div>
      </div>

      {/* İzin reddedildi uyarısı */}
      {permission === 'denied' && (
        <div style={{ padding: '10px 16px', background: 'rgba(240,96,96,0.08)', borderBottom: '1px solid rgba(240,96,96,0.1)' }}>
          <p style={{ margin: 0, fontFamily: "'DM Sans', sans-serif", fontSize: 11, color: '#f06060' }}>
            Bildirim izni reddedildi. Tarayıcı ayarlarından izin verin.
          </p>
        </div>
      )}

      {/* Bildirim aktifse detaylar */}
      {prefs.enabled && (
        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}>
          {/* Kaç dakika önce */}
          <div style={{ padding: '12px 16px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
            <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, color: 'rgba(255,255,255,0.3)', letterSpacing: '0.15em', marginBottom: 10 }}>
              VAKİTTEN ÖNCE
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              {[0, 5, 10, 15].map(min => (
                <button key={min} onClick={() => savePrefs({ minutesBefore: min })} style={{
                  flex: 1, padding: '8px 0', borderRadius: 8, cursor: 'pointer',
                  background: prefs.minutesBefore === min ? `${accent}18` : 'rgba(255,255,255,0.04)',
                  border: `1px solid ${prefs.minutesBefore === min ? `${accent}40` : 'rgba(255,255,255,0.06)'}`,
                  color: prefs.minutesBefore === min ? accent : 'rgba(255,255,255,0.4)',
                  fontFamily: "'DM Mono', monospace", fontSize: 11,
                }}>
                  {min === 0 ? 'Tam' : `${min}dk`}
                </button>
              ))}
            </div>
          </div>

          {/* Vakit seçimi */}
          <div style={{ padding: '10px 16px 4px' }}>
            <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, color: 'rgba(255,255,255,0.3)', letterSpacing: '0.15em', marginBottom: 8 }}>
              BİLDİRİM GELSİN
            </div>
            {PRAYER_ORDER.map((key, i) => (
              <div key={key} onClick={() => togglePrayer(key)} style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '10px 0',
                borderBottom: i < PRAYER_ORDER.length - 1 ? '1px solid rgba(255,255,255,0.03)' : 'none',
                cursor: 'pointer',
              }}>
                <span style={{ fontSize: 16 }}>{PRAYER_ICONS[key]}</span>
                <span style={{ flex: 1, fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: 'rgba(255,255,255,0.6)' }}>
                  {PRAYER_LABELS[key]}
                </span>
                <div style={{
                  width: 18, height: 18, borderRadius: 5,
                  background: prefs.prayers[key] ? `${accent}20` : 'transparent',
                  border: `1.5px solid ${prefs.prayers[key] ? accent : 'rgba(255,255,255,0.15)'}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  {prefs.prayers[key] && <span style={{ color: accent, fontSize: 11, lineHeight: 1 }}>✓</span>}
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      )}
    </div>
  );
}
