import { useState, useEffect } from 'react';

const CACHE_KEY = 'nur_ayah_cache';

const FALLBACK = {
  arabic: 'اللَّهُ نُورُ السَّمَاوَاتِ وَالْأَرْضِ',
  turkish: "Allah, göklerin ve yerin nurudur.",
  surah: 'An-Nur',
  verse: '24:35',
};

export function useDailyAyah() {
  const [ayah, setAyah] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const today = new Date().toISOString().split('T')[0];
    try {
      const cached = JSON.parse(localStorage.getItem(CACHE_KEY) || 'null');
      if (cached?.date === today) { setAyah(cached.data); setLoading(false); return; }
    } catch {}

    const ctrl = new AbortController();

    fetch('https://api.alquran.cloud/v1/ayah/random', { signal: ctrl.signal })
      .then(r => r.json())
      .then(res => {
        const ar = res?.data;
        if (!ar?.number) { setAyah(FALLBACK); setLoading(false); return; }
        return fetch(`https://api.alquran.cloud/v1/ayah/${ar.number}/tr.diyanet`, { signal: ctrl.signal })
          .then(r => r.json())
          .then(trRes => {
            const data = {
              arabic: ar.text,
              turkish: trRes?.data?.text || '',
              surah: ar.surah?.englishName || '',
              surahAr: ar.surah?.name || '',
              verse: `${ar.surah?.number}:${ar.numberInSurah}`,
            };
            localStorage.setItem(CACHE_KEY, JSON.stringify({ date: today, data }));
            setAyah(data);
            setLoading(false);
          });
      })
      .catch(() => { setAyah(FALLBACK); setLoading(false); });

    return () => ctrl.abort();
  }, []);

  return { ayah, loading };
}
