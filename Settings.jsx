import React, { useState } from 'react';
import { useAuthStore, useTasbihStore, apiFetch, PREMIUM_THEMES } from '../store';
import { THEMES } from '../utils/themes';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import NotificationSettings from '../components/NotificationSettings';

function Section({ title, children }) {
  return (
    <div style={{ marginBottom: 24 }}>
      <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: 'rgba(245,184,0,0.5)', letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: 10 }}>{title}</div>
      <div style={{ borderRadius: 14, background: 'rgba(14,14,44,0.5)', border: '1px solid rgba(255,255,255,0.05)', overflow: 'hidden' }}>
        {children}
      </div>
    </div>
  );
}

function Row({ icon, label, children, onClick, last }) {
  return (
    <div onClick={onClick} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px', borderBottom: last ? 'none' : '1px solid rgba(255,255,255,0.04)', cursor: onClick ? 'pointer' : 'default' }}>
      <span style={{ fontSize: 18 }}>{icon}</span>
      <span style={{ flex: 1, fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: '#c0c0d8' }}>{label}</span>
      {children}
    </div>
  );
}

export default function Settings() {
  const { user, login, register, logout, token, isPremium, setThemeSecure } = useAuthStore();
  const { theme: themeId, soundEnabled, vibrationEnabled, toggleSound, toggleVibration } = useTasbihStore();
  const navigate = useNavigate();

  const [mode, setMode]         = useState('login');
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading]   = useState(false);
  const [themeLoading, setThemeLoading] = useState(null);
  const [error, setError]       = useState('');
  const [success, setSuccess]   = useState('');
  const [themeError, setThemeError] = useState('');

  // Şifre değiştirme state
  const [showPwChange, setShowPwChange]   = useState(false);
  const [curPw,   setCurPw]               = useState('');
  const [newPw,   setNewPw]               = useState('');
  const [pwLoading, setPwLoading]         = useState(false);
  const [pwMsg,   setPwMsg]               = useState('');

  // Hesap silme state
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletePassword,  setDeletePassword]  = useState('');
  const [deleteLoading,   setDeleteLoading]   = useState(false);
  const [deleteError,     setDeleteError]     = useState('');

  const handlePasswordChange = async () => {
    if (!curPw || !newPw) { setPwMsg('Tüm alanları doldurun'); return; }
    if (newPw.length < 8) { setPwMsg('Yeni şifre en az 8 karakter'); return; }
    setPwLoading(true); setPwMsg('');
    try {
      await apiFetch('/auth/password', { method: 'PUT', body: JSON.stringify({ current_password: curPw, new_password: newPw }) });
      setPwMsg('✓ Şifre güncellendi');
      setCurPw(''); setNewPw('');
      setTimeout(() => { setShowPwChange(false); setPwMsg(''); }, 1500);
    } catch (e) { setPwMsg(e.message || 'Hata'); }
    finally { setPwLoading(false); }
  };

  const handleDeleteAccount = async () => {
    if (!deletePassword) { setDeleteError('Şifrenizi girin'); return; }
    setDeleteLoading(true); setDeleteError('');
    try {
      await apiFetch('/auth/account', { method: 'DELETE', body: JSON.stringify({ password: deletePassword }) });
      logout();
      window.location.href = '/';
    } catch (e) { setDeleteError(e.message || 'Hata'); }
    finally { setDeleteLoading(false); }
  };

  const handleAuth = async (e) => {
    e.preventDefault();
    setError(''); setSuccess(''); setLoading(true);
    try {
      if (mode === 'login') await login(email, password);
      else await register(email, password);
      setSuccess(mode === 'login' ? 'Giriş yapıldı!' : 'Hesap oluşturuldu!');
      setEmail(''); setPassword('');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Tema secimi: backend dogrular, localStorage manipulasyonu islemiyor
  const handleThemeSelect = async (t) => {
    if (t.premium && !isPremium()) {
      navigate('/premium');
      return;
    }
    setThemeError('');
    setThemeLoading(t.id);
    try {
      await setThemeSecure(t.id);
    } catch (err) {
      // Backend 403 veya baska hata → kullaniciya goster, tema degismez
      if (err.message?.includes('Premium')) {
        navigate('/premium');
      } else {
        setThemeError(err.message);
      }
    } finally {
      setThemeLoading(null);
    }
  };

  const input = {
    width: '100%', padding: '11px 14px', borderRadius: 10,
    background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
    color: '#e0e0f0', fontFamily: "'DM Sans', sans-serif", fontSize: 13,
    outline: 'none', boxSizing: 'border-box', marginBottom: 10,
  };
  const btn = (primary) => ({
    width: '100%', padding: '12px 0', borderRadius: 10, cursor: 'pointer',
    background: primary ? 'rgba(245,184,0,0.12)' : 'rgba(255,255,255,0.04)',
    border: `1px solid ${primary ? 'rgba(245,184,0,0.3)' : 'rgba(255,255,255,0.08)'}`,
    color: primary ? '#f5b800' : 'rgba(255,255,255,0.5)',
    fontFamily: "'DM Sans', sans-serif", fontSize: 13, marginBottom: 8,
  });

  return (
    <div style={{ minHeight: '100dvh', background: '#06060f', padding: '24px 16px 100px' }}>
      <div className="stars" />
      <div style={{ position: 'relative', zIndex: 1, maxWidth: 480, margin: '0 auto' }}>
        <h1 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 26, fontWeight: 400, color: '#f5b800', marginBottom: 24 }}>Ayarlar</h1>

        {/* Auth */}
        {user ? (
          <Section title="Hesap">
            <Row icon="👤" label={user.email}>
              <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: isPremium() ? '#f5b800' : 'rgba(255,255,255,0.3)', background: isPremium() ? 'rgba(245,184,0,0.1)' : 'rgba(255,255,255,0.05)', padding: '3px 8px', borderRadius: 10 }}>
                {isPremium() ? '✦ Premium' : 'Ücretsiz'}
              </span>
            </Row>
            {!isPremium() && (
              <Row icon="✦" label="Premium'a Geç" onClick={() => navigate('/premium')}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="2"><path d="M9 18l6-6-6-6"/></svg>
              </Row>
            )}
            <Row icon="🚪" label="Çıkış Yap" onClick={logout} last>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="rgba(255,100,80,0.6)" strokeWidth="2"><path d="M9 18l6-6-6-6"/></svg>
            </Row>
          </Section>
        ) : (
          <Section title="Hesap">
            <div style={{ padding: 16 }}>
              <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
                {['login','register'].map(m => (
                  <button key={m} onClick={() => { setMode(m); setError(''); setSuccess(''); }} style={{ flex: 1, padding: '8px 0', borderRadius: 8, cursor: 'pointer', background: mode === m ? 'rgba(245,184,0,0.1)' : 'rgba(255,255,255,0.03)', border: `1px solid ${mode === m ? 'rgba(245,184,0,0.25)' : 'rgba(255,255,255,0.06)'}`, color: mode === m ? '#f5b800' : 'rgba(255,255,255,0.4)', fontFamily: "'DM Sans', sans-serif", fontSize: 12 }}>
                    {m === 'login' ? 'Giriş Yap' : 'Kayıt Ol'}
                  </button>
                ))}
              </div>
              <form onSubmit={handleAuth}>
                <input style={input} type="email" placeholder="E-posta" value={email} onChange={e => setEmail(e.target.value)} required />
                <input style={input} type="password" placeholder="Şifre" value={password} onChange={e => setPassword(e.target.value)} required minLength={6} />
                {error   && <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: '#f06060', marginBottom: 8 }}>{error}</p>}
                {success && <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: '#0d9e6e', marginBottom: 8 }}>{success}</p>}
                <button type="submit" disabled={loading} style={btn(true)}>
                  {loading ? 'Lütfen bekleyin...' : mode === 'login' ? 'Giriş Yap' : 'Hesap Oluştur'}
                </button>
              </form>
              <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, color: 'rgba(255,255,255,0.25)', textAlign: 'center' }}>
                Hesabınız olmadan misafir olarak kullanabilirsiniz
              </p>
            </div>
          </Section>
        )}

        {/* Tema */}
        <Section title="Tema">
          {themeError && (
            <div style={{ padding: '8px 16px', background: 'rgba(240,96,96,0.1)', borderBottom: '1px solid rgba(240,96,96,0.15)' }}>
              <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: '#f06060', margin: 0 }}>{themeError}</p>
            </div>
          )}
          {Object.values(THEMES).map((t, i, arr) => {
            const locked    = t.premium && !isPremium();
            const isActive  = themeId === t.id;
            const isLoading = themeLoading === t.id;
            return (
              <Row key={t.id} icon={isLoading ? '⏳' : locked ? '🔒' : '🎨'} label={t.name}
                last={i === arr.length - 1}
                onClick={() => handleThemeSelect(t)}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  {t.premium && (
                    <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, color: locked ? 'rgba(255,255,255,0.3)' : '#f5b800', background: locked ? 'rgba(255,255,255,0.05)' : 'rgba(245,184,0,0.1)', padding: '2px 6px', borderRadius: 10 }}>
                      {locked ? 'Kilitli' : 'Premium'}
                    </span>
                  )}
                  <div style={{
                    width: 16, height: 16, borderRadius: '50%',
                    background: locked ? 'rgba(255,255,255,0.1)' : t.accent,
                    border: `2px solid ${isActive ? t.accent : 'transparent'}`,
                    boxShadow: isActive ? `0 0 8px ${t.accent}80` : 'none',
                    opacity: locked ? 0.4 : 1,
                  }} />
                </div>
              </Row>
            );
          })}
          <div style={{ padding: '10px 16px', borderTop: '1px solid rgba(255,255,255,0.04)' }}>
            <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, color: 'rgba(255,255,255,0.2)', margin: 0 }}>
              🔒 Tema seçimi sunucuda doğrulanır — bypass edilemez
            </p>
          </div>
        </Section>

        {/* Bildirimler */}
        <Section title="Bildirimler">
          <NotificationSettings accent={theme?.accent || '#f5b800'} />
        </Section>

        {/* Ses & Titreşim */}
        <Section title="Ses & Titreşim">
          <Row icon="🔊" label="Tık Sesi" onClick={toggleSound}>
            <div style={{ width: 40, height: 22, borderRadius: 11, background: soundEnabled ? 'rgba(245,184,0,0.3)' : 'rgba(255,255,255,0.08)', border: `1px solid ${soundEnabled ? 'rgba(245,184,0,0.4)' : 'rgba(255,255,255,0.1)'}`, position: 'relative', transition: 'all 0.2s' }}>
              <div style={{ position: 'absolute', top: 2, left: soundEnabled ? 20 : 2, width: 16, height: 16, borderRadius: '50%', background: soundEnabled ? '#f5b800' : 'rgba(255,255,255,0.3)', transition: 'left 0.2s' }} />
            </div>
          </Row>
          <Row icon="📳" label="Titreşim" onClick={toggleVibration} last>
            <div style={{ width: 40, height: 22, borderRadius: 11, background: vibrationEnabled ? 'rgba(245,184,0,0.3)' : 'rgba(255,255,255,0.08)', border: `1px solid ${vibrationEnabled ? 'rgba(245,184,0,0.4)' : 'rgba(255,255,255,0.1)'}`, position: 'relative', transition: 'all 0.2s' }}>
              <div style={{ position: 'absolute', top: 2, left: vibrationEnabled ? 20 : 2, width: 16, height: 16, borderRadius: '50%', background: vibrationEnabled ? '#f5b800' : 'rgba(255,255,255,0.3)', transition: 'left 0.2s' }} />
            </div>
          </Row>
        </Section>

        {/* Şifre Değiştir */}
        {token && (
          <Section title="Güvenlik">
            <Row icon="🔑" label="Şifre Değiştir" onClick={() => setShowPwChange(v => !v)}>
              <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>
                {showPwChange ? '▲' : '▼'}
              </span>
            </Row>
            {showPwChange && (
              <div style={{ padding: '12px 16px 16px', borderTop: '1px solid rgba(255,255,255,0.04)' }}>
                {['Mevcut Şifre', 'Yeni Şifre (min 8)'].map((placeholder, i) => (
                  <input key={i}
                    type="password"
                    placeholder={placeholder}
                    value={i === 0 ? curPw : newPw}
                    onChange={e => i === 0 ? setCurPw(e.target.value) : setNewPw(e.target.value)}
                    style={{ display: 'block', width: '100%', padding: '10px 14px', borderRadius: 10, boxSizing: 'border-box', marginBottom: 8, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: '#d0d0e8', fontFamily: "'DM Sans', sans-serif", fontSize: 13, outline: 'none' }}
                  />
                ))}
                {pwMsg && <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: pwMsg.startsWith('✓') ? '#0d9e6e' : '#f06060', margin: '0 0 8px' }}>{pwMsg}</p>}
                <button onClick={handlePasswordChange} disabled={pwLoading} style={{ padding: '10px 20px', borderRadius: 10, border: 'none', cursor: 'pointer', background: 'rgba(245,184,0,0.15)', color: '#f5b800', fontFamily: "'DM Sans', sans-serif", fontSize: 13, fontWeight: 600 }}>
                  {pwLoading ? 'Güncelleniyor...' : 'Güncelle'}
                </button>
              </div>
            )}
            <Row icon="🗑" label="Hesabı Sil" onClick={() => setShowDeleteModal(true)} last>
              <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, color: '#f06060' }}>Kalıcı</span>
            </Row>
          </Section>
        )}

        {/* Hesap Silme Modal */}
        {showDeleteModal && (
          <div style={{ position: 'fixed', inset: 0, zIndex: 100, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
            <div style={{ background: '#0f0f28', borderRadius: 18, border: '1px solid rgba(255,255,255,0.08)', padding: 24, width: '100%', maxWidth: 360 }}>
              <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 22, color: '#f06060', marginBottom: 8 }}>Hesabı Sil</div>
              <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: 'rgba(255,255,255,0.4)', marginBottom: 16, lineHeight: 1.6 }}>
                Tüm verileriniz (tesbih, favoriler, hatim ilerlemeniz) kalıcı olarak silinecek. Bu işlem geri alınamaz.
              </p>
              <input
                type="password" placeholder="Şifrenizi onaylayın"
                value={deletePassword}
                onChange={e => setDeletePassword(e.target.value)}
                style={{ display: 'block', width: '100%', padding: '10px 14px', borderRadius: 10, boxSizing: 'border-box', marginBottom: 8, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(240,96,96,0.3)', color: '#d0d0e8', fontFamily: "'DM Sans', sans-serif", fontSize: 13, outline: 'none' }}
              />
              {deleteError && <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: '#f06060', margin: '0 0 10px' }}>{deleteError}</p>}
              <div style={{ display: 'flex', gap: 10 }}>
                <button onClick={() => { setShowDeleteModal(false); setDeletePassword(''); setDeleteError(''); }} style={{ flex: 1, padding: '11px 0', borderRadius: 10, border: '1px solid rgba(255,255,255,0.1)', background: 'transparent', color: 'rgba(255,255,255,0.4)', cursor: 'pointer', fontFamily: "'DM Sans', sans-serif", fontSize: 13 }}>İptal</button>
                <button onClick={handleDeleteAccount} disabled={deleteLoading} style={{ flex: 1, padding: '11px 0', borderRadius: 10, border: 'none', background: 'rgba(240,96,96,0.15)', color: '#f06060', cursor: 'pointer', fontFamily: "'DM Sans', sans-serif", fontSize: 13, fontWeight: 600 }}>
                  {deleteLoading ? 'Siliniyor...' : 'Kalıcı Sil'}
                </button>
              </div>
            </div>
          </div>
        )}

        <Section title="Hakkında">
          <Row icon="🌙" label="Nur Tasbih" >
            <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: 'rgba(255,255,255,0.2)' }}>v1.0.0</span>
          </Row>
          <Row icon="🇹🇷" label="Türkiye'de geliştirildi">
            <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: 'rgba(255,255,255,0.2)' }}>2025</span>
          </Row>
          <Row icon="📖" label="Kuran: AlQuran Cloud API" >
            <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: 'rgba(255,255,255,0.2)' }}>Ücretsiz</span>
          </Row>
          <Row icon="🎙" label="Ses: Mishary Al-Afasy" last>
            <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: 'rgba(255,255,255,0.2)' }}>Islamic Network</span>
          </Row>
        </Section>
      </div>
    </div>
  );
}
