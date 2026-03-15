import { useState, useEffect } from 'react';
import { TURKEY_CITIES } from './usePrayerTimes';

const LOC_KEY = 'nur_location';

export function useLocation() {
  const [location, setLocation]       = useState(null); // { lat, lng, city, manual }
  const [locLoading, setLocLoading]   = useState(false);
  const [locError, setLocError]       = useState(null);

  // Kayıtlı konumu yükle
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(LOC_KEY) || 'null');
      if (saved) setLocation(saved);
    } catch {}
  }, []);

  const saveLocation = (loc) => {
    setLocation(loc);
    localStorage.setItem(LOC_KEY, JSON.stringify(loc));
  };

  const detectLocation = () => {
    if (!navigator.geolocation) {
      setLocError('Tarayıcınız konum desteklemiyor');
      return;
    }
    setLocLoading(true);
    setLocError(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        // En yakın şehri bul
        const { latitude: lat, longitude: lng } = pos.coords;
        let nearest = TURKEY_CITIES[0];
        let minDist = Infinity;
        for (const city of TURKEY_CITIES) {
          const d = Math.sqrt((city.lat - lat) ** 2 + (city.lng - lng) ** 2);
          if (d < minDist) { minDist = d; nearest = city; }
        }
        saveLocation({ lat, lng, city: nearest.name, manual: false });
        setLocLoading(false);
      },
      (err) => {
        setLocError('Konum alınamadı. Şehir seçin.');
        setLocLoading(false);
      },
      { timeout: 8000, enableHighAccuracy: false }
    );
  };

  const selectCity = (city) => {
    saveLocation({ lat: city.lat, lng: city.lng, city: city.name, manual: true });
  };

  const clearLocation = () => {
    setLocation(null);
    localStorage.removeItem(LOC_KEY);
  };

  return { location, locLoading, locError, detectLocation, selectCity, clearLocation };
}
