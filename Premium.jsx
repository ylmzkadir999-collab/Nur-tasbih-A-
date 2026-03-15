import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuthStore, useTasbihStore, apiFetch } from '../store';
import { THEMES } from '../utils/themes';
import { useNavigate, useSearchParams } from 'react-router-dom';

const PLANS = [
  { id: 'monthly', label: 'Aylık',  price: '₺49',  sub: '/ay',   color: '#f5b800' },
  { id: 'yearly',  label: 'Yıllık', price: '₺349', sub: '/yıl',  color: '#0d9e6e', badge: '%40 İndirim' },
];

const PERKS = [
  { icon: '🎨', title: 'Premium Temalar',        desc: 'Altın, Zümrüt ve Obsidyen temalar' },
  { icon: '📊', title: 'Gelişmiş İstatistikler', desc: 'Haftalık ve aylık analiz' },
  { icon: '🚫', title: 'Reklamsız Deneyim',      desc: 'Hiç reklam yok' },
  { icon: '📿', title: 'Özel Zikirler',          desc: "20'ye kadar özel zikir kaydet" },
  { icon: '☁️', title: 'Bulut Senkron',          desc: 'Tüm cihazlarda senkronizasyon' },
  { icon: '🔔', title: 'Öncelikli Bildirimler',  desc: 'Namaz vakti tam zamanında' },
];

const THEME_PREVIEWS = [
  { id: 'gold',     name: 'Altın',   color: '#f5b800' },
  { id: 'emerald',  name: 'Zümrüt',  color: '#0d9e6e' },
  { id: 'obsidian', name: 'Obsidyen', color: '#7c5cbf' },
];

export default function Premium() {
  const { user, isPremium, refreshUser, token } = useAuthStore();
  const { setTheme } = useTasbihStore();
  const navigate     = useNavigate();
  const [searchParams] = useSearchParams();

  const [selected, setSelected]   = useState('yearly');
  const [loading, setLoading]     = useState(false);
  const [showForm, setShowForm]   = useState(false);  // İyzico form modal
  const [formHtml, setFormHtml]   = useState('');
  const [statusMsg, setStatusMsg] = useState('');
  const formContainerRef          = useRef(null);

  // İyzico callback sonrası URL parametresini yakala
  useEffect(() => {
    const status = searchParams.get('status');
    if (status === 'success') {
      refreshUser();
      window.history.replaceState({}, '', '/premium');
    } else if (status === 'failed') {
      setStatusMsg('Ödeme başarısız. Lütfen tekrar deneyin.');
      window.history.replaceState({}, '', '/premium');
    } else if (status === 'error') {
      setStatusMsg('Bir hata oluştu. Lütfen tekrar deneyin.');
      window.history.replaceState({}, '', '/premium');
    }
  }, []);

  // İyzico form HTML inject edildiğinde script'leri çalıştır
  useEffect(() => {
    if (!formHtml || !formContainerRef.current) return;

    // Form HTML'ini inject et
    formContainerRef.current.innerHTML = formHtml;

    // İçindeki script tag'lerini çalıştır
    const scripts = formContainerRef.current.querySelectorAll('script');
    scripts.forEach(oldScript => {
      const newScript = document.createElement('script');
      if (oldScript.src) {
        newScript.src = oldScript.src;
        newScript.async = true;
      } else {
        newScript.textContent = oldScript.textContent;
      }
      oldScript.parentNode.replaceChild(newScript, oldScript);
    });
  }, [formHtml]);

  const handleSubscribe = async () => {
    if (!token) { navigate('/settings'); return; }
    setLoading(true);
    setStatusMsg('');

    try {
      const data = await apiFetch('/payment/init', {
        method: 'POST',
        body: JSON.stringify({
          plan: selected,
          buyer: {
            name:    user?.full_name?.split(' ')[0]         || 'Kullanıcı',
            surname: user?.full_name?.split(' ').slice(1).join(' ') || 'Nur',
          },
        }),
      });

      if (data.checkoutFormContent) {
        setFormHtml(data.checkoutFormContent);
        setShowForm(true);
      }
    } catch (e) {
      setStatusMsg(e.message || 'Ödeme başlatılamadı. Tekrar deneyin.');
    } finally {
      setLoading(false);
    }
  };

  // Premium aktif ekranı
  if (isPremium()) {
    return (
      <div style={{
        minHeight: '100dvh', display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        background: '#06060f', padding: 24, gap: 20,
      }}>
        <motion.div
          initial={{ scale: 0.6, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 200 }}
          style={{ textAlign: 'center' }}
        >
          <div style={{ fontSize: 64 }}>✦</div>
          <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 28, color: '#f5b800', marginTop: 12 }}>
            Premium Aktif
          </div>
          <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 14, color: 'rgba(255,255,255,0.5)', marginTop: 8 }}>
            Tüm özellikler kilitsiz. Hayırlı olsun! 🌙
          </p>
        </motion.div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'center' }}>
          {THEME_PREVIEWS.map(t => (
            <button key={t.id} onClick={() => { setTheme(t.id); navigate('/tasbih'); }} style={{
              padding: '10px 18px', borderRadius: 10, cursor: 'pointer',
              background: t.color + '18', border: `1px solid ${t.color}44`,
              color: t.color, fontFamily: "'DM Sans', sans-serif", fontSize: 13,
            }}>
              {t.name}
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100dvh', background: '#06060f', paddingBottom: 80 }}>
      <div className="stars" />

      {/* İyzico Form Modal */}
      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              position: 'fixed', inset: 0, zIndex: 100,
              background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              padding: 16,
            }}
          >
            <motion.div
              initial={{ scale: 0.92, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.92, opacity: 0 }}
              style={{
                background: '#0f0f28', borderRadius: 20,
                border: '1px solid rgba(255,255,255,0.08)',
                width: '100%', maxWidth: 480,
                maxHeight: '90dvh', overflowY: 'auto',
                padding: 20,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                <span style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 18, color: '#f5b800' }}>
                  Güvenli Ödeme
                </span>
                <button
                  onClick={() => setShowForm(false)}
                  style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', fontSize: 20, cursor: 'pointer' }}
                >
                  ✕
                </button>
              </div>

              {/* İyzico checkout form buraya inject edilir */}
              <div ref={formContainerRef} id="iyzipay-checkout-form" className="responsive" />

              <p style={{
                marginTop: 14, textAlign: 'center',
                fontFamily: "'DM Sans', sans-serif", fontSize: 10,
                color: 'rgba(255,255,255,0.2)',
              }}>
                🔒 256-bit SSL şifreleme · iyzico güvencesiyle
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Hero */}
      <div style={{ position: 'relative', zIndex: 1, textAlign: 'center', padding: '40px 20px 28px' }}>
        <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: 'rgba(245,184,0,0.6)', letterSpacing: '0.25em', marginBottom: 14 }}>
          NUR PREMIUM
        </div>
        <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 'clamp(2rem,8vw,3.2rem)', fontWeight: 300, color: '#ffe080', lineHeight: 1.15, marginBottom: 10 }}>
          Ruhani Deneyimi<br />Tamamla
        </div>
        <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 14, color: 'rgba(255,255,255,0.4)', maxWidth: 300, margin: '0 auto' }}>
          Premium temalar, reklamsız kullanım ve çok daha fazlası
        </p>
      </div>

      {/* Tema önizleme */}
      <div style={{ position: 'relative', zIndex: 1, display: 'flex', justifyContent: 'center', gap: 12, padding: '0 20px 28px', flexWrap: 'wrap' }}>
        {THEME_PREVIEWS.map(t => (
          <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 14px', borderRadius: 40, background: t.color + '10', border: `1px solid ${t.color}30` }}>
            <div style={{ width: 10, height: 10, borderRadius: '50%', background: t.color }} />
            <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: t.color }}>{t.name}</span>
            <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, color: 'rgba(255,255,255,0.25)', background: 'rgba(255,255,255,0.05)', padding: '2px 6px', borderRadius: 10 }}>
              Premium
            </span>
          </div>
        ))}
      </div>

      {/* Özellikler */}
      <div style={{ position: 'relative', zIndex: 1, padding: '0 16px', display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 28 }}>
        {PERKS.map(({ icon, title, desc }) => (
          <div key={title} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 16px', borderRadius: 14, background: 'rgba(14,14,44,0.5)', border: '1px solid rgba(255,255,255,0.05)' }}>
            <span style={{ fontSize: 22 }}>{icon}</span>
            <div>
              <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: '#d0d0e8', fontWeight: 500 }}>{title}</div>
              <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, color: 'rgba(255,255,255,0.35)', marginTop: 2 }}>{desc}</div>
            </div>
            <div style={{ marginLeft: 'auto', color: '#f5b800', fontSize: 14 }}>✓</div>
          </div>
        ))}
      </div>

      {/* Plan seçici */}
      <div style={{ position: 'relative', zIndex: 1, padding: '0 16px', display: 'flex', gap: 10, marginBottom: 20 }}>
        {PLANS.map(plan => (
          <button key={plan.id} onClick={() => setSelected(plan.id)} style={{
            flex: 1, padding: '18px 12px', borderRadius: 16, cursor: 'pointer',
            textAlign: 'center', position: 'relative',
            background: selected === plan.id ? plan.color + '14' : 'rgba(14,14,44,0.4)',
            border: `1.5px solid ${selected === plan.id ? plan.color : 'rgba(255,255,255,0.06)'}`,
            transition: 'all 0.2s',
          }}>
            {plan.badge && (
              <div style={{ position: 'absolute', top: -10, left: '50%', transform: 'translateX(-50%)', background: plan.color, color: '#06060f', fontSize: 9, fontFamily: "'DM Mono', monospace", padding: '3px 8px', borderRadius: 20, whiteSpace: 'nowrap', fontWeight: 600 }}>
                {plan.badge}
              </div>
            )}
            <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, color: 'rgba(255,255,255,0.45)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
              {plan.label}
            </div>
            <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 30, fontWeight: 600, color: selected === plan.id ? plan.color : '#d0d0e8', lineHeight: 1 }}>
              {plan.price}
            </div>
            <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, color: 'rgba(255,255,255,0.3)', marginTop: 4 }}>
              {plan.sub}
            </div>
          </button>
        ))}
      </div>

      {/* Hata/durum mesajı */}
      {statusMsg && (
        <div style={{ position: 'relative', zIndex: 1, margin: '0 16px 16px', padding: '12px 16px', borderRadius: 10, background: 'rgba(240,100,100,0.1)', border: '1px solid rgba(240,100,100,0.2)' }}>
          <p style={{ margin: 0, fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: '#f06060', textAlign: 'center' }}>
            {statusMsg}
          </p>
        </div>
      )}

      {/* Ödeme butonu */}
      <div style={{ position: 'relative', zIndex: 1, padding: '0 16px' }}>
        <button onClick={handleSubscribe} disabled={loading} style={{
          width: '100%', padding: '16px 0', borderRadius: 14, cursor: loading ? 'not-allowed' : 'pointer',
          background: 'linear-gradient(135deg, rgba(245,184,0,0.25), rgba(245,184,0,0.15))',
          border: '1px solid rgba(245,184,0,0.4)',
          color: '#f5b800', fontFamily: "'Cormorant Garamond', serif", fontSize: 20, fontWeight: 600,
          letterSpacing: '0.06em', opacity: loading ? 0.6 : 1, transition: 'opacity 0.2s',
        }}>
          {!token ? 'Giriş Yap' : loading ? 'Hazırlanıyor...' : "✦ Premium'a Geç"}
        </button>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, marginTop: 14 }}>
          <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 10, color: 'rgba(255,255,255,0.2)' }}>
            🔒 iyzico güvencesi
          </span>
          <span style={{ color: 'rgba(255,255,255,0.1)' }}>·</span>
          <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 10, color: 'rgba(255,255,255,0.2)' }}>
            Taksit imkânı
          </span>
          <span style={{ color: 'rgba(255,255,255,0.1)' }}>·</span>
          <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 10, color: 'rgba(255,255,255,0.2)' }}>
            İstediğiniz zaman iptal
          </span>
        </div>
      </div>
    </div>
  );
}
