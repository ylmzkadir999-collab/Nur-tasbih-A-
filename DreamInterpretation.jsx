/**
 * İslami Rüya Tabiri
 *
 * Veri: İbn Sirin + genel İslami kaynaklara dayalı 
 *       statik veritabanı (offline çalışır)
 * AI:   Claude API ile derin yorum (premium)
 * Arama: Türkçe + Arapça anahtar kelime
 */

import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuthStore, apiFetch } from '../store';
import AdBanner from '../components/AdBanner';

// ── Rüya veritabanı ───────────────────────────────────────────
const DREAMS = [
  // Su
  { id: 1, keyword: ['su', 'nehir', 'deniz', 'ırmak'], title: 'Su Görmek', icon: '💧',
    short: 'Berrak su: helal rızık ve bereket. Bulanık su: sıkıntı ve fitne.',
    detail: 'İbn Sirin\'e göre berrak, soğuk su içmek sıhhat ve uzun ömrü; bulanık su ise hastalık veya üzüntüyü simgeler. Akan nehir, bol rızık ve hayırlı bir yolculuğa işaret eder.',
    source: 'İbn Sirin', category: 'doğa' },
  { id: 2, keyword: ['yağmur'], title: 'Yağmur Görmek', icon: '🌧️',
    short: 'Rahmet, bereket ve duaların kabulü.',
    detail: 'Rüyada yağmur yağdığını görmek, Allah\'ın rahmetinin bollaşacağına ve bereketli bir dönemin geleceğine işaret eder. Şiddetli yağmur bazen belayı da simgeler.',
    source: 'İbn Sirin', category: 'doğa' },
  // Hayvanlar
  { id: 3, keyword: ['yılan', 'yılan görmek'], title: 'Yılan Görmek', icon: '🐍',
    short: 'Düşman veya tehlike. Beyaz yılan: korkusuz bir düşman.',
    detail: 'İbn Sirin: Yılan genellikle gizli bir düşmanı simgeler. Yılanı öldürmek, düşmanı yenmek demektir. Yılanın ısırması, düşmanın zarar vermesi anlamına gelebilir.',
    source: 'İbn Sirin', category: 'hayvan' },
  { id: 4, keyword: ['aslan', 'arslan'], title: 'Aslan Görmek', icon: '🦁',
    short: 'Güçlü bir kral veya zalim bir yönetici.',
    detail: 'Aslan, güç ve otorite sembolüdür. Aslana binmek yüksek makama ulaşmayı; aslanın saldırması ise güçlü bir düşmanla karşılaşmayı gösterir.',
    source: 'İbn Sirin', category: 'hayvan' },
  { id: 5, keyword: ['kuş', 'kuşlar', 'uçmak'], title: 'Kuş / Uçmak', icon: '🕊️',
    short: 'Özgürlük, ruhani yükseliş ve hayırlı haberler.',
    detail: 'Beyaz kuş ruhani arınmayı; güvercin huzur ve sevgiyi simgeler. Rüyada uçmak, manevi bir yükseliş veya seyahate çıkacağına işaret eder.',
    source: 'İbn Sirin', category: 'hayvan' },
  // Kişiler
  { id: 6, keyword: ['peygamber', 'hz muhammed', 'rasulullah'], title: 'Hz. Peygamber\'i Görmek', icon: '☪️',
    short: 'Müjde, hidayet ve büyük hayır.',
    detail: 'Alimler ittifakla kabul etmiştir: Hz. Peygamber\'i (s.a.v.) rüyada görmek haktır, çünkü şeytan onun suretine giremez. Bu rüya büyük bir müjdedir ve hidayete nail olunacağına işaret eder.',
    source: 'Alimler İcmaı', category: 'kişi' },
  { id: 7, keyword: ['melek', 'melekler'], title: 'Melek Görmek', icon: '👼',
    short: 'Hayır, rahmet ve ilahi müjde.',
    detail: 'Melekleri görmek, kişinin salih amellerde bulunduğunun ve Allah\'ın rahmetine mazhar olduğunun işareti sayılır.',
    source: 'İbn Sirin', category: 'kişi' },
  // Mekan
  { id: 8, keyword: ['kabe', 'mekke', 'hac'], title: 'Kabe / Mekke Görmek', icon: '🕋',
    short: 'Hac, tövbe, günahlardan arınma ve büyük hayır.',
    detail: 'Kabe\'yi görmek veya tavaf etmek, hacca gitmeye, tövbeye ve günahlardan arınmaya işaret eder. Dini görevlerin yerine getirileceğine müjde sayılır.',
    source: 'İbn Sirin', category: 'mekan' },
  { id: 9, keyword: ['cami', 'mescit'], title: 'Cami Görmek', icon: '🕌',
    short: 'Huzur, ibadet ve hayırlı bir topluluk.',
    detail: 'Camiye girmek veya namaz kılmak, dini yaşantının güçleneceğine ve manevi bir huzura kavuşulacağına işaret eder.',
    source: 'İbn Sirin', category: 'mekan' },
  // Olaylar
  { id: 10, keyword: ['ölüm', 'ölmek', 'vefat'], title: 'Ölüm Görmek', icon: '⚫',
    short: 'Genellikle kötü değil: tövbe, yeni başlangıç veya uzun ömür.',
    detail: 'İbn Sirin\'e göre kendi ölümünü görmek çoğu zaman olumsuz değildir; günahlardan arınma, uzun ömür veya bir işin sona erip yenisinin başlamasını simgeler.',
    source: 'İbn Sirin', category: 'olay' },
  { id: 11, keyword: ['ateş', 'yangın', 'alev'], title: 'Ateş Görmek', icon: '🔥',
    short: 'Ateşin yönüne göre değişir: ısıtıcı ateş bereket, yakıcı ateş fitne.',
    detail: 'Aydınlık veren ateş ilim ve nur simgedir. Yakıp yakan ateş ise harp, fitne veya ceza anlamına gelebilir. Bağlamına göre yorumlanmalıdır.',
    source: 'İbn Sirin', category: 'olay' },
  { id: 12, keyword: ['altın', 'gümüş', 'para', 'hazine'], title: 'Altın / Para Görmek', icon: '💰',
    short: 'Erkek için üzüntü, kadın için süs ve mutluluk anlamına gelebilir.',
    detail: 'İbn Sirin: Altın takan veya altın bulan erkek, keder ve endişeyi simgeler. Ancak altın için çalışıp kazanmak, helal rızık demektir. Kadın için altın takı sevinci simgeler.',
    source: 'İbn Sirin', category: 'nesne' },
  { id: 13, keyword: ['diş', 'dişler', 'diş düşmesi'], title: 'Diş Düşmesi', icon: '🦷',
    short: 'Aile üyelerinden birinin hastalanması veya vefatı.',
    detail: 'Diş düşmesi rüyaları aile bağlarıyla ilişkilendirilir. Alt dişler baba tarafını, üst dişler anne tarafını simgeler. Tek diş düşerse bir yakının rahatsızlığına işaret edebilir.',
    source: 'İbn Sirin', category: 'beden' },
  { id: 14, keyword: ['saç', 'saç uzatmak', 'saç kesmek'], title: 'Saç Görmek', icon: '💇',
    short: 'Uzayan saç: ömür ve bereket. Dökülen saç: mal kaybı veya üzüntü.',
    detail: 'Saçın uzadığını görmek uzun ömür ve bolluğa; döküldüğünü görmek ise mal veya itibar kaybına işaret edebilir.',
    source: 'İbn Sirin', category: 'beden' },
  { id: 15, keyword: ['namaz', 'namaz kılmak'], title: 'Namaz Kılmak', icon: '🙏',
    short: 'Hayırlı bir işe başlanması, dua ve isteklerin kabulü.',
    detail: 'Namazı tam ve düzgün kılmak, ibadetlere bağlılık ve hayırlı işlere yönelme olarak yorumlanır. Namazı aksatmak ise dikkat gerektiren bir uyarıdır.',
    source: 'İbn Sirin', category: 'ibadet' },
  { id: 16, keyword: ['oruç', 'iftar', 'ramazan'], title: 'Oruç / Ramazan', icon: '🌙',
    short: 'Sabır, bereket ve manevi kazanç.',
    detail: 'Ramazan ayını veya oruç tutmayı görmek, manevi arınma, sabır ve ihsanın artacağına işaret eder.',
    source: 'İbn Sirin', category: 'ibadet' },
  { id: 17, keyword: ['bal', 'bal arısı'], title: 'Bal Görmek', icon: '🍯',
    short: 'Helal kazanç, tatlı söz ve ilim.',
    detail: 'Bal yemek, helal ve meşru yollarla elde edilecek kazanca, tatlı sözlere ve ilme işaret eder.',
    source: 'İbn Sirin', category: 'nesne' },
  { id: 18, keyword: ['çocuk', 'bebek', 'doğum'], title: 'Çocuk Görmek', icon: '👶',
    short: 'Sevinç, yeni başlangıç ve hayır.',
    detail: 'Erkek çocuk görmek güç ve mutluluk; kız çocuğu görmek ise bereket ve rahmet simgesidir. Doğum genellikle yeni bir projenin veya fırsatın başlangıcını müjdeler.',
    source: 'İbn Sirin', category: 'kişi' },
];

const CATEGORIES = [
  { id: 'hepsi', label: 'Hepsi' },
  { id: 'doğa',   label: '🌿 Doğa' },
  { id: 'hayvan', label: '🐾 Hayvan' },
  { id: 'kişi',   label: '👤 Kişi' },
  { id: 'mekan',  label: '🏛️ Mekan' },
  { id: 'olay',   label: '⚡ Olay' },
  { id: 'nesne',  label: '💎 Nesne' },
  { id: 'beden',  label: '🫀 Beden' },
  { id: 'ibadet', label: '☪️ İbadet' },
];

const C = {
  bg:   '#06060f', card: 'rgba(14,14,44,0.6)',
  gold: '#f5b800', muted: 'rgba(255,255,255,0.35)',
  border: 'rgba(255,255,255,0.06)',
};

export default function DreamInterpretation() {
  const { isPremium, token } = useAuthStore();
  const [search,    setSearch]    = useState('');
  const [category,  setCategory]  = useState('hepsi');
  const [selected,  setSelected]  = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResult,  setAiResult]  = useState('');
  const [customDream, setCustomDream] = useState('');
  const [showCustom,  setShowCustom]  = useState(false);

  // Filtrelenmiş rüyalar
  const filtered = useMemo(() => {
    return DREAMS.filter(d => {
      const matchCat = category === 'hepsi' || d.category === category;
      const q = search.toLowerCase().trim();
      const matchSearch = !q || d.title.toLowerCase().includes(q) ||
        d.keyword.some(k => k.includes(q)) ||
        d.short.toLowerCase().includes(q);
      return matchCat && matchSearch;
    });
  }, [search, category]);

  // AI yorumu
  const askAI = async (dream) => {
    if (!token) return;
    setAiLoading(true); setAiResult('');
    try {
      const res = await fetch('/api/ai/dream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ dream: dream || selected?.title, detail: selected?.detail }),
      });
      if (!res.ok || !res.body) throw new Error();
      const reader  = res.body.getReader();
      const decoder = new TextDecoder();
      let buf = '';
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        const lines = buf.split('\n'); buf = lines.pop() ?? '';
        for (const line of lines) {
          if (line.startsWith('data: ') && line !== 'data: [DONE]') {
            try { const d = JSON.parse(line.slice(6)); if (d.text) setAiResult(p => p + d.text); }
            catch {}
          }
        }
      }
    } catch { setAiResult('AI yorumu şu an kullanılamıyor.'); }
    finally { setAiLoading(false); }
  };

  return (
    <div style={{ minHeight: '100dvh', background: C.bg, paddingBottom: 90 }}>
      <div className="stars" />

      {/* Başlık */}
      <div style={{ position: 'relative', zIndex: 1, padding: '36px 20px 16px', textAlign: 'center' }}>
        <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, color: 'rgba(245,184,0,0.5)', letterSpacing: '0.3em', marginBottom: 10 }}>
          İSLAMİ RÜYA TABİRİ
        </div>
        <div style={{ fontFamily: "'Scheherazade New', serif", fontSize: 22, color: C.gold, marginBottom: 4, direction: 'rtl' }}>
          الرُّؤْيَا الصَّالِحَةُ مِنَ اللَّهِ
        </div>
        <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, color: C.muted }}>
          Salih rüya Allah'tandır — Buhari
        </div>
      </div>

      {/* Arama */}
      <div style={{ position: 'relative', zIndex: 1, padding: '0 16px 12px' }}>
        <div style={{ position: 'relative' }}>
          <input
            value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Rüyanda ne gördün? (su, yılan, Kabe...)"
            style={{
              width: '100%', padding: '11px 16px 11px 38px', borderRadius: 12, boxSizing: 'border-box',
              background: C.card, border: `1px solid ${C.border}`, color: '#d0d0e8',
              fontFamily: "'DM Sans', sans-serif", fontSize: 13, outline: 'none',
            }}
          />
          <span style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)', color: C.muted, fontSize: 14 }}>🔍</span>
        </div>
      </div>

      {/* Kategori filtresi */}
      <div style={{ position: 'relative', zIndex: 1, padding: '0 16px 16px', display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 8 }}>
        {CATEGORIES.map(c => (
          <button key={c.id} onClick={() => setCategory(c.id)} style={{
            padding: '5px 12px', borderRadius: 20, cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0,
            fontFamily: "'DM Sans', sans-serif", fontSize: 11, fontWeight: 600,
            background: category === c.id ? 'rgba(245,184,0,0.15)' : 'transparent',
            border: `1px solid ${category === c.id ? C.gold : C.border}`,
            color: category === c.id ? C.gold : C.muted,
          }}>
            {c.label}
          </button>
        ))}
      </div>

      {/* AI ile özel rüya yorumu */}
      {token && (
        <div style={{ position: 'relative', zIndex: 1, margin: '0 16px 16px' }}>
          <button onClick={() => setShowCustom(v => !v)} style={{
            width: '100%', padding: '12px 16px', borderRadius: 12, cursor: 'pointer',
            background: 'linear-gradient(135deg, rgba(245,184,0,0.1), rgba(124,92,191,0.1))',
            border: `1px solid rgba(245,184,0,0.3)`,
            color: C.gold, fontFamily: "'DM Sans', sans-serif", fontSize: 13, fontWeight: 600,
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          }}>
            🤖 AI ile Özel Rüya Yorumu
            {!isPremium() && <span style={{ fontSize: 9, padding: '2px 6px', borderRadius: 10, background: 'rgba(245,184,0,0.15)', border: '1px solid rgba(245,184,0,0.3)' }}>Premium</span>}
          </button>

          <AnimatePresence>
            {showCustom && (
              <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                style={{ marginTop: 10, padding: 14, borderRadius: 12, background: C.card, border: `1px solid ${C.border}` }}>
                <textarea
                  value={customDream} onChange={e => setCustomDream(e.target.value)}
                  placeholder="Rüyanı detaylıca anlat... (örn: Camide namaz kılıyordum, birden selam verdim...)"
                  rows={3}
                  style={{
                    width: '100%', padding: '10px 12px', borderRadius: 10, boxSizing: 'border-box',
                    background: 'rgba(255,255,255,0.03)', border: `1px solid ${C.border}`,
                    color: '#d0d0e8', fontFamily: "'DM Sans', sans-serif", fontSize: 12,
                    resize: 'none', outline: 'none', marginBottom: 10,
                  }}
                />
                {!isPremium() ? (
                  <div style={{ textAlign: 'center', fontSize: 11, color: C.muted }}>
                    AI yorumu için <span style={{ color: C.gold }}>Premium</span> gerekiyor
                  </div>
                ) : (
                  <button onClick={() => askAI(customDream)} disabled={!customDream.trim() || aiLoading} style={{
                    width: '100%', padding: '10px 0', borderRadius: 10,
                    background: 'rgba(245,184,0,0.15)', border: `1px solid ${C.gold}50`,
                    color: C.gold, fontFamily: "'DM Sans', sans-serif", fontSize: 13,
                    cursor: 'pointer', opacity: !customDream.trim() || aiLoading ? 0.5 : 1,
                  }}>
                    {aiLoading ? 'Yorumlanıyor...' : '✦ Rüyamı Yorumla'}
                  </button>
                )}

                {aiResult && (
                  <div style={{ marginTop: 12, padding: '12px 14px', borderRadius: 10, background: 'rgba(245,184,0,0.05)', border: `1px solid rgba(245,184,0,0.15)` }}>
                    <div style={{ fontSize: 9, color: C.gold, letterSpacing: '0.15em', marginBottom: 6 }}>AI YORUMU</div>
                    <p style={{ fontSize: 12, color: '#d0d0e8', lineHeight: 1.8, margin: 0 }}>{aiResult}</p>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* Rüya kartları */}
      <div style={{ position: 'relative', zIndex: 1, padding: '0 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        {filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 0' }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>🌙</div>
            <div style={{ fontSize: 13, color: C.muted }}>"{search}" için tabir bulunamadı</div>
            {token && <div style={{ fontSize: 11, color: 'rgba(245,184,0,0.5)', marginTop: 8 }}>AI ile özel yorum yaptırabilirsiniz ↑</div>}
          </div>
        ) : filtered.map(dream => (
          <motion.div
            key={dream.id}
            onClick={() => { setSelected(selected?.id === dream.id ? null : dream); setAiResult(''); }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            style={{
              padding: '14px 16px', borderRadius: 14, cursor: 'pointer',
              background: selected?.id === dream.id ? 'rgba(245,184,0,0.06)' : C.card,
              border: `1px solid ${selected?.id === dream.id ? 'rgba(245,184,0,0.3)' : C.border}`,
              transition: 'all 0.2s',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
              <span style={{ fontSize: 24, flexShrink: 0 }}>{dream.icon}</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 17, color: selected?.id === dream.id ? C.gold : '#e0e0f8', fontWeight: 600, marginBottom: 4 }}>
                  {dream.title}
                </div>
                <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: C.muted, lineHeight: 1.6 }}>
                  {dream.short}
                </div>
              </div>
              <span style={{ color: C.muted, fontSize: 12 }}>{selected?.id === dream.id ? '▲' : '▼'}</span>
            </div>

            {/* Detay */}
            <AnimatePresence>
              {selected?.id === dream.id && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                  style={{ overflow: 'hidden', marginTop: 12, paddingTop: 12, borderTop: `1px solid ${C.border}` }}>
                  <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: '#b0b0d0', lineHeight: 1.8, margin: '0 0 10px' }}>
                    {dream.detail}
                  </p>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, color: 'rgba(245,184,0,0.4)' }}>
                      Kaynak: {dream.source}
                    </span>
                    {token && isPremium() && (
                      <button onClick={e => { e.stopPropagation(); askAI(dream.title); }} disabled={aiLoading} style={{
                        padding: '5px 12px', borderRadius: 20, cursor: 'pointer',
                        background: 'rgba(245,184,0,0.1)', border: `1px solid rgba(245,184,0,0.3)`,
                        color: C.gold, fontFamily: "'DM Sans', sans-serif", fontSize: 10,
                      }}>
                        {aiLoading ? '...' : '🤖 AI Yorum'}
                      </button>
                    )}
                  </div>

                  {aiResult && (
                    <div style={{ marginTop: 12, padding: '10px 12px', borderRadius: 10, background: 'rgba(245,184,0,0.05)', border: `1px solid rgba(245,184,0,0.15)` }}>
                      <div style={{ fontSize: 9, color: C.gold, letterSpacing: '0.15em', marginBottom: 4 }}>AI YORUMU</div>
                      <p style={{ fontSize: 12, color: '#d0d0e8', lineHeight: 1.8, margin: 0 }}>{aiResult}</p>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        ))}
      </div>

      <div style={{ margin: '16px 0 0' }}>
        <AdBanner position="bottom" />
      </div>
    </div>
  );
}
