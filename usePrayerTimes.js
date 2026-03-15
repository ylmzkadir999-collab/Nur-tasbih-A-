import { useState, useEffect } from 'react';

const CACHE_KEY = 'nur_prayer_cache';
const CACHE_TTL = 60 * 60 * 1000; // 1 saat

// Türkiye şehirleri için varsayılan koordinatlar
export const TURKEY_CITIES = [
  { name: 'İstanbul',  lat: 41.0082, lng: 28.9784 },
  { name: 'Ankara',    lat: 39.9334, lng: 32.8597 },
  { name: 'İzmir',     lat: 38.4192, lng: 27.1287 },
  { name: 'Bursa',     lat: 40.1826, lng: 29.0665 },
  { name: 'Antalya',   lat: 36.8969, lng: 30.7133 },
  { name: 'Konya',     lat: 37.8713, lng: 32.4846 },
  { name: 'Adana',     lat: 37.0000, lng: 35.3213 },
  { name: 'Gaziantep', lat: 37.0662, lng: 37.3833 },
  { name: 'Kayseri',   lat: 38.7312, lng: 35.4787 },
  { name: 'Trabzon',   lat: 41.0015, lng: 39.7178 },
];

const PRAYER_NAMES = {
  Fajr:    'İmsak',
  Sunrise: 'Güneş',
  Dhuhr:   'Öğle',
  Asr:     'İkindi',
  Maghrib: 'Akşam',
  Isha:    'Yatsı',
};

function getNextPrayer(timings) {
  const now = new Date();
  const nowMinutes = now.getHours() * 60 + now.getMinutes();

  const prayers = ['Fajr', 'Sunrise', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'];
  for (const key of prayers) {
    const [h, m] = timings[key].split(':').map(Number);
    const prayerMinutes = h * 60 + m;
    if (prayerMinutes > nowMinutes) {
      const diff = prayerMinutes - nowMinutes;
      return { key, name: PRAYER_NAMES[key], time: timings[key], diffMinutes: diff };
    }
  }
  // Gün bitti, yarın Fajr
  const [h, m] = timings['Fajr'].split(':').map(Number);
  const fajrMinutes = h * 60 + m;
  const diff = (24 * 60 - nowMinutes) + fajrMinutes;
  return { key: 'Fajr', name: 'İmsak', time: timings['Fajr'], diffMinutes: diff };
}

function formatCountdown(minutes) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h > 0) return `${h} sa ${m} dk`;
  return `${m} dk`;
}

export function usePrayerTimes(lat, lng, cityName) {
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);
  const [tick, setTick]       = useState(0);

  // Her dakika countdown güncelle
  useEffect(() => {
    const t = setInterval(() => setTick(v => v + 1), 60_000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (!lat || !lng) { setLoading(false); return; }

    const cacheKey = `${CACHE_KEY}_${lat.toFixed(2)}_${lng.toFixed(2)}`;
    try {
      const cached = JSON.parse(localStorage.getItem(cacheKey) || 'null');
      if (cached && Date.now() - cached.ts < CACHE_TTL) {
        setData({ ...cached.data, next: getNextPrayer(cached.data.timings) });
        setLoading(false);
        return;
      }
    } catch {}

    const ctrl = new AbortController();
    const today = new Date();
    const dd = String(today.getDate()).padStart(2, '0');
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const yyyy = today.getFullYear();

    fetch(
      `https://api.aladhan.com/v1/timings/${dd}-${mm}-${yyyy}?latitude=${lat}&longitude=${lng}&method=13`,
      { signal: ctrl.signal }
    )
      .then(r => r.json())
      .then(res => {
        if (res.code !== 200) throw new Error('API hatası');
        const timings = res.data.timings;
        const prayerData = {
          timings,
          city: cityName || 'Konumunuz',
          date: res.data.date.readable,
          hijri: `${res.data.date.hijri.day} ${res.data.date.hijri.month.en} ${res.data.date.hijri.year}`,
        };
        localStorage.setItem(cacheKey, JSON.stringify({ ts: Date.now(), data: prayerData }));
        setData({ ...prayerData, next: getNextPrayer(timings) });
        setLoading(false);
      })
      .catch(err => {
        if (err.name !== 'AbortError') { setError('Namaz vakitleri alınamadı'); setLoading(false); }
      });

    return () => ctrl.abort();
  }, [lat, lng]);

  // tick değişince next prayer güncelle
  useEffect(() => {
    if (data?.timings) {
      setData(d => ({ ...d, next: getNextPrayer(d.timings) }));
    }
  }, [tick]);

  return { data, loading, error, formatCountdown, PRAYER_NAMES };
}
