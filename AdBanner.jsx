import React, { useEffect, useRef, useState } from 'react';
import { useAuthStore } from '../store';

const AD_CLIENT = 'ca-pub-XXXXXXXXXXXXXXXX'; // ← Gerçek AdSense ID'nizi girin
const AD_SLOT   = '1234567890';

export default function AdBanner({ position = 'bottom' }) {
  const user     = useAuthStore((s) => s.user);
  const token    = useAuthStore((s) => s.token);
  const ref      = useRef(null);
  const [inView, setInView]     = useState(false);
  const [verified, setVerified] = useState(false); // backend dogrulamasi tamamlandi mi

  // Backend'den gelen user.subscription_status'a guveniriz
  // refreshUser her sayfa yuklenisinde calisir ve gercek degeri yazar
  // localStorage manipulasyonu refreshUser sonrasi etkisiz kalir
  const isPremium = user?.subscription_status === 'premium' &&
    (!user.subscription_expiry || user.subscription_expiry > Math.floor(Date.now() / 1000));

  // Token varsa refreshUser bitmesini bekle (guvensiz flash onle)
  useEffect(() => {
    if (!token) {
      setVerified(true); // misafir — hemen goster
      return;
    }
    // user yuklendiginde verified yap
    if (user) setVerified(true);
  }, [user, token]);

  // Intersection observer — lazy load
  useEffect(() => {
    if (isPremium || !verified) return;
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) setInView(true); }, { threshold: 0.1 });
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, [isPremium, verified]);

  // AdSense script inject
  useEffect(() => {
    if (!inView || isPremium) return;
    if (!document.querySelector('script[data-adsense]')) {
      const s = document.createElement('script');
      s.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${AD_CLIENT}`;
      s.async = true;
      s.crossOrigin = 'anonymous';
      s.dataset.adsense = '1';
      s.onload = () => { try { (window.adsbygoogle = window.adsbygoogle || []).push({}); } catch {} };
      document.head.appendChild(s);
    } else {
      try { (window.adsbygoogle = window.adsbygoogle || []).push({}); } catch {}
    }
  }, [inView, isPremium]);

  // Premium dogrulanmis — reklam gosterme
  if (verified && isPremium) return null;

  // Dogrulama bekleniyor — bos placeholder (flash yok)
  if (!verified) {
    return <div style={{ minHeight: position === 'bottom' ? 60 : 90 }} />;
  }

  const h = position === 'bottom' ? 60 : 90;

  return (
    <div
      ref={ref}
      style={{
        width: '100%', minHeight: h, overflow: 'hidden', position: 'relative',
        background: 'rgba(6,6,15,0.92)',
        borderTop: position === 'bottom' ? '1px solid rgba(255,255,255,0.04)' : 'none',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}
    >
      {inView ? (
        <ins className="adsbygoogle"
          style={{ display: 'block', width: '100%', minHeight: h }}
          data-ad-client={AD_CLIENT}
          data-ad-slot={AD_SLOT}
          data-ad-format="auto"
          data-full-width-responsive="true"
        />
      ) : (
        <div style={{ opacity: 0.07, fontSize: 10, letterSpacing: '0.3em', color: '#fff', fontFamily: "'DM Sans', sans-serif" }}>
          REKLAM
        </div>
      )}
      {import.meta.env.DEV && inView && (
        <div style={{ position: 'absolute', inset: 0, border: '1px dashed rgba(245,184,0,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
          <span style={{ fontSize: 9, color: 'rgba(245,184,0,0.4)', letterSpacing: '0.2em', fontFamily: "'DM Mono', monospace" }}>ADSENSE ALANI</span>
        </div>
      )}
    </div>
  );
}
