/**
 * useFavorites — Favori ayet yönetimi
 * Backend sync + localStorage cache
 */

import { useState, useEffect, useCallback } from 'react';
import { useAuthStore, apiFetch } from '../store';

const LOCAL_KEY = 'nur_favorites_cache';

export function useFavorites() {
  const { token } = useAuthStore();
  const [favorites, setFavorites] = useState([]);
  const [loading,   setLoading]   = useState(false);

  // Yükleme — önce cache, sonra backend
  const load = useCallback(async () => {
    // localStorage cache
    try {
      const cached = JSON.parse(localStorage.getItem(LOCAL_KEY) || '[]');
      if (cached.length) setFavorites(cached);
    } catch {}

    if (!token) return;
    try {
      setLoading(true);
      const data = await apiFetch('/quran/favorites');
      setFavorites(data.favorites || []);
      localStorage.setItem(LOCAL_KEY, JSON.stringify(data.favorites || []));
    } catch { /* offline — cache'den devam */ }
    finally { setLoading(false); }
  }, [token]);

  useEffect(() => { load(); }, [token]);

  // Favoride mi?
  const isFavorite = useCallback((sureNo, ayahNo) => {
    return favorites.some(f => f.sure_no === sureNo && f.ayah_no === ayahNo);
  }, [favorites]);

  // Favori ID'si
  const getFavoriteId = useCallback((sureNo, ayahNo) => {
    return favorites.find(f => f.sure_no === sureNo && f.ayah_no === ayahNo)?.id || null;
  }, [favorites]);

  // Ekle
  const addFavorite = useCallback(async ({ sureNo, ayahNo, arabic, translation, source, sureName }) => {
    // Optimistic update
    const temp = {
      id: Date.now(), sure_no: sureNo, ayah_no: ayahNo,
      arabic, translation, source: source || 'yazir',
      sure_name: sureName, created_at: Math.floor(Date.now()/1000),
    };
    const next = [temp, ...favorites];
    setFavorites(next);
    localStorage.setItem(LOCAL_KEY, JSON.stringify(next));

    if (!token) return;
    try {
      const res = await apiFetch('/quran/favorites', {
        method: 'POST',
        body: JSON.stringify({
          sure_no: sureNo, ayah_no: ayahNo,
          arabic, translation,
          source: source || 'yazir',
          sure_name: sureName || null,
        }),
      });
      // Gerçek ID ile güncelle
      const updated = next.map(f => f.id === temp.id ? { ...f, id: res.id } : f);
      setFavorites(updated);
      localStorage.setItem(LOCAL_KEY, JSON.stringify(updated));
    } catch (e) {
      // Rollback
      setFavorites(favorites);
      localStorage.setItem(LOCAL_KEY, JSON.stringify(favorites));
      throw e;
    }
  }, [favorites, token]);

  // Kaldır
  const removeFavorite = useCallback(async (sureNo, ayahNo) => {
    const prev = favorites;
    const next = favorites.filter(f => !(f.sure_no === sureNo && f.ayah_no === ayahNo));
    setFavorites(next);
    localStorage.setItem(LOCAL_KEY, JSON.stringify(next));

    if (!token) return;
    try {
      await apiFetch(`/quran/favorites/ayah/${sureNo}/${ayahNo}`, { method: 'DELETE' });
    } catch {
      setFavorites(prev);
      localStorage.setItem(LOCAL_KEY, JSON.stringify(prev));
    }
  }, [favorites, token]);

  // Toggle
  const toggleFavorite = useCallback(async (params) => {
    const { sureNo, ayahNo } = params;
    if (isFavorite(sureNo, ayahNo)) {
      await removeFavorite(sureNo, ayahNo);
      return false;
    } else {
      await addFavorite(params);
      return true;
    }
  }, [isFavorite, addFavorite, removeFavorite]);

  return { favorites, loading, isFavorite, getFavoriteId, addFavorite, removeFavorite, toggleFavorite, reload: load };
}
