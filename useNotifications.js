import { useState, useEffect, useCallback } from 'react';

const NOTIF_KEY = 'nur_notif_prefs';

const PRAYER_LABELS = {
  Fajr:    'İmsak',
  Sunrise: 'Güneş',
  Dhuhr:   'Öğle',
  Asr:     'İkindi',
  Maghrib: 'Akşam',
  Isha:    'Yatsı',
};

const DEFAULT_PREFS = {
  enabled: false,
  prayers: { Fajr: true, Sunrise: false, Dhuhr: true, Asr: true, Maghrib: true, Isha: true },
  minutesBefore: 5, // kaç dakika önce bildirim gelsin
};

export function useNotifications(prayerTimings) {
  const [permission, setPermission] = useState(
    typeof Notification !== 'undefined' ? Notification.permission : 'default'
  );
  const [prefs, setPrefs] = useState(() => {
    try {
      return { ...DEFAULT_PREFS, ...JSON.parse(localStorage.getItem(NOTIF_KEY) || '{}') };
    } catch { return DEFAULT_PREFS; }
  });
  const [scheduled, setScheduled] = useState([]);

  const savePrefs = useCallback((newPrefs) => {
    const merged = { ...prefs, ...newPrefs };
    setPrefs(merged);
    localStorage.setItem(NOTIF_KEY, JSON.stringify(merged));
  }, [prefs]);

  // İzin iste
  const requestPermission = useCallback(async () => {
    if (typeof Notification === 'undefined') return false;
    if (Notification.permission === 'granted') { setPermission('granted'); return true; }
    const result = await Notification.requestPermission();
    setPermission(result);
    if (result === 'granted') savePrefs({ enabled: true });
    return result === 'granted';
  }, [savePrefs]);

  // Bildirimleri planla
  const scheduleNotifications = useCallback(() => {
    if (!prayerTimings || permission !== 'granted' || !prefs.enabled) return;

    // Eski timeout'ları temizle
    scheduled.forEach(id => clearTimeout(id));
    const newScheduled = [];

    const now = new Date();
    Object.entries(prefs.prayers).forEach(([key, active]) => {
      if (!active || !prayerTimings[key]) return;

      const [h, m] = prayerTimings[key].split(':').map(Number);
      const prayerTime = new Date();
      prayerTime.setHours(h, m, 0, 0);

      // minutesBefore öncesinde bildirim
      const notifTime = new Date(prayerTime.getTime() - prefs.minutesBefore * 60_000);

      const diff = notifTime.getTime() - now.getTime();
      if (diff < 0) return; // Geçmiş vakit

      const id = setTimeout(() => {
        // SW varsa SW üzerinden, yoksa direkt
        if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
          navigator.serviceWorker.controller.postMessage({
            type: 'SHOW_NOTIFICATION',
            title: `🕌 ${PRAYER_LABELS[key]} Vakti`,
            body: prefs.minutesBefore > 0
              ? `${prefs.minutesBefore} dakika sonra ${PRAYER_LABELS[key]} vakti giriyor`
              : `${PRAYER_LABELS[key]} vakti girdi`,
            tag: `prayer-${key}`,
            url: '/prayer',
          });
        } else if (permission === 'granted') {
          new Notification(`🕌 ${PRAYER_LABELS[key]} Vakti`, {
            body: prefs.minutesBefore > 0
              ? `${prefs.minutesBefore} dakika sonra ${PRAYER_LABELS[key]} vakti`
              : `${PRAYER_LABELS[key]} vakti girdi`,
            icon: '/icon-192.png',
            tag: `prayer-${key}`,
            silent: false,
          });
        }
      }, diff);

      newScheduled.push(id);
    });

    setScheduled(newScheduled);
    return newScheduled.length;
  }, [prayerTimings, permission, prefs, scheduled]);

  // Vakit değişince yeniden planla
  useEffect(() => {
    if (prayerTimings && prefs.enabled && permission === 'granted') {
      scheduleNotifications();
    }
    return () => scheduled.forEach(id => clearTimeout(id));
  }, [prayerTimings, prefs.enabled, permission]);

  return {
    permission,
    prefs,
    savePrefs,
    requestPermission,
    scheduleNotifications,
    PRAYER_LABELS,
    DEFAULT_PREFS,
  };
}
