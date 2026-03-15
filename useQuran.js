/**
 * useQuran v2 — Bug fix + sure otomatik geçiş
 *
 * Fix: isPlaying stale closure → useRef ile takip
 * Fix: sure bitti → sonraki sure otomatik başlıyor
 * Fix: AudioPlayer çakışması → bu hook tek audio kaynağı
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuthStore, apiFetch } from '../store';

const AUDIO_BASE = 'https://cdn.islamic.network/quran/audio/128/ar.alafasy';
const QURAN_API  = 'https://api.alquran.cloud/v1';
const CACHE_KEY  = 'nur_quran_cache_v1';
const HATIM_KEY  = 'nur_hatim_progress';

// 114 sure → ayet sayısı
const SURE_AYET = [7,286,200,176,120,165,206,75,129,109,123,111,43,52,99,128,111,110,98,135,112,78,118,64,77,227,93,88,69,60,34,30,73,54,45,83,182,88,75,85,54,53,89,59,37,35,31,34,45,60,49,38,29,45,55,57,107,26,22,22,128,33,63,60,65,22,54,93,34,75,28,36,40,31,21,28,27,33,30,197,50,23,43,25,33,28,22,35,22,26,197,32,20,21,101,33,51,27,37,73,33,50,10,65,65,42,18,84,54,29,42,56,29,19,36,26,72,20,111,78,28,34,45,24,43,89,25,35,38,29,18,45,60,49,38,29];

function toGlobalAyah(sureNo, ayahNo) {
  let total = 0;
  for (let i = 0; i < sureNo - 1; i++) total += SURE_AYET[i];
  return total + ayahNo;
}

function getCache() {
  try { return JSON.parse(localStorage.getItem(CACHE_KEY) || '{}'); }
  catch { return {}; }
}
function setCache(data) {
  try { localStorage.setItem(CACHE_KEY, JSON.stringify(data)); }
  catch {}
}

export function useQuran() {
  const { token } = useAuthStore();

  const [isPlaying,   setIsPlaying]   = useState(false);
  const [isLoading,   setIsLoading]   = useState(false);
  const [currentSure, setCurrentSure] = useState(1);
  const [currentAyah, setCurrentAyah] = useState(1);
  const [mode,        setMode]        = useState('sure');
  const [translation, setTranslation] = useState('yazir');
  const [ayahData,    setAyahData]    = useState(null);
  const [sureList,    setSureList]    = useState([]);
  const [error,       setError]       = useState(null);
  const [hatimProgress, setHatimProgress] = useState(() => {
    try { return JSON.parse(localStorage.getItem(HATIM_KEY) || '{"sure":1,"ayah":1,"completed":0}'); }
    catch { return { sure: 1, ayah: 1, completed: 0 }; }
  });

  const audioRef    = useRef(null);
  const abortRef    = useRef(null);

  // ✅ FIX: stale closure önlemek için ref ile tut
  const isPlayingRef  = useRef(false);
  const currentRef    = useRef({ sure: 1, ayah: 1 });
  const modeRef       = useRef('sure');
  const hatimRef      = useRef(hatimProgress);

  // Ref'leri state ile senkron tut
  useEffect(() => { isPlayingRef.current = isPlaying; }, [isPlaying]);
  useEffect(() => { currentRef.current = { sure: currentSure, ayah: currentAyah }; }, [currentSure, currentAyah]);
  useEffect(() => { modeRef.current = mode; }, [mode]);
  useEffect(() => { hatimRef.current = hatimProgress; }, [hatimProgress]);

  // Backend'den hatim progress yükle
  useEffect(() => {
    if (!token) return;
    apiFetch('/quran/hatim').then(data => {
      if (data?.sure_no) {
        const prog = { sure: data.sure_no, ayah: data.ayah_no, completed: data.completed || 0 };
        setHatimProgress(prog);
        localStorage.setItem(HATIM_KEY, JSON.stringify(prog));
      }
    }).catch(() => {});
  }, [token]);

  // Sure listesi
  useEffect(() => {
    const cache = getCache();
    if (cache._sureList) { setSureList(cache._sureList); return; }
    fetch(`${QURAN_API}/surah`)
      .then(r => r.json())
      .then(d => {
        if (d.code === 200) {
          const list = d.data.map(s => ({
            number: s.number, name: s.name,
            turkishName: TR_SURE_NAMES[s.number] || s.englishName,
            numberOfAyahs: s.numberOfAyahs,
            revelationType: s.revelationType,
          }));
          setSureList(list);
          const c = getCache(); c._sureList = list; setCache(c);
        }
      }).catch(() => {});
  }, []);

  // Ayet verisi çek
  const fetchAyah = useCallback(async (sure, ayah) => {
    setIsLoading(true); setError(null);
    const cacheKey = `s${sure}`;
    const cache    = getCache();
    let sureData   = cache[cacheKey];

    if (!sureData) {
      try {
        if (abortRef.current) abortRef.current.abort();
        abortRef.current = new AbortController();
        const res  = await fetch(`${QURAN_API}/surah/${sure}/editions/quran-uthmani,tr.yazir,tr.diyanet`, { signal: abortRef.current.signal });
        const json = await res.json();
        if (json.code === 200) {
          const [arabic, yazir, diyanet] = json.data;
          sureData = arabic.ayahs.map((a, i) => ({
            numberInSurah: a.numberInSurah,
            globalNumber:  a.number,
            arabic:        a.text,
            yazir:         yazir.ayahs[i]?.text  || '',
            diyanet:       diyanet.ayahs[i]?.text || '',
          }));
          cache[cacheKey] = sureData;
          setCache(cache);
        }
      } catch (e) {
        if (e.name !== 'AbortError') { setError('Kuran verisi yüklenemedi.'); setIsLoading(false); }
        return;
      }
    }
    if (sureData[ayah - 1]) setAyahData(sureData[ayah - 1]);
    setIsLoading(false);
  }, []);

  useEffect(() => { fetchAyah(currentSure, currentAyah); }, [currentSure, currentAyah]);

  // ── Ses çal ──────────────────────────────────────────────────
  const playAudio = useCallback((sure, ayah) => {
    const url = `${AUDIO_BASE}/${toGlobalAyah(sure, ayah)}.mp3`;
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = url;
      audioRef.current.load();
      audioRef.current.play()
        .then(() => { setIsPlaying(true); isPlayingRef.current = true; })
        .catch(() => { setIsPlaying(false); isPlayingRef.current = false; });
    }
  }, []);

  // ── Çal / Duraklat ───────────────────────────────────────────
  const togglePlay = useCallback(() => {
    if (!audioRef.current) return;
    if (isPlayingRef.current) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      playAudio(currentRef.current.sure, currentRef.current.ayah);
    }
  }, [playAudio]);

  // ── ✅ FIX: Sonraki ayet — ref kullanıyor, stale closure yok ──
  const nextAyah = useCallback(() => {
    const { sure, ayah } = currentRef.current;
    const maxAyah = SURE_AYET[sure - 1];

    if (ayah < maxAyah) {
      // Aynı sure, sonraki ayet
      const next = ayah + 1;
      setCurrentAyah(next);
      currentRef.current = { sure, ayah: next };
      if (isPlayingRef.current) playAudio(sure, next);

    } else if (sure < 114) {
      // ✅ Sure bitti → sonraki sure otomatik başlıyor
      const nextSure = sure + 1;
      setCurrentSure(nextSure);
      setCurrentAyah(1);
      currentRef.current = { sure: nextSure, ayah: 1 };

      // Ayet verisini önceden yükle
      fetchAyah(nextSure, 1);

      // Ses devam ediyorsa sonraki sureyi çal
      if (isPlayingRef.current) {
        // Kısa gecikme — fetching sırasında oluşabilecek çakışmayı önle
        setTimeout(() => playAudio(nextSure, 1), 300);
      }

      // Hatim modunda kaydet
      if (modeRef.current === 'hatim') {
        const prog = { sure: nextSure, ayah: 1, completed: hatimRef.current.completed };
        setHatimProgress(prog);
        localStorage.setItem(HATIM_KEY, JSON.stringify(prog));
        if (token) apiFetch('/quran/hatim', { method: 'PUT', body: JSON.stringify({ sure_no: nextSure, ayah_no: 1, completed: prog.completed }) }).catch(() => {});
      }

    } else {
      // Hatim tamamlandı (114. sure bitti)
      if (modeRef.current === 'hatim') {
        const prog = { sure: 1, ayah: 1, completed: hatimRef.current.completed + 1 };
        setHatimProgress(prog);
        localStorage.setItem(HATIM_KEY, JSON.stringify(prog));
        setCurrentSure(1); setCurrentAyah(1);
        currentRef.current = { sure: 1, ayah: 1 };
        if (token) apiFetch('/quran/hatim', { method: 'PUT', body: JSON.stringify({ sure_no: 1, ayah_no: 1, completed: prog.completed }) }).catch(() => {});
        if (isPlayingRef.current) setTimeout(() => playAudio(1, 1), 300);
      } else {
        setIsPlaying(false); isPlayingRef.current = false;
      }
    }
  }, [playAudio, fetchAyah, token]);

  // Önceki ayet
  const prevAyah = useCallback(() => {
    const { sure, ayah } = currentRef.current;
    if (ayah > 1) {
      const prev = ayah - 1;
      setCurrentAyah(prev); currentRef.current = { sure, ayah: prev };
      if (isPlayingRef.current) playAudio(sure, prev);
    } else if (sure > 1) {
      const prevSure = sure - 1;
      const prevAyahCount = SURE_AYET[prevSure - 1];
      setCurrentSure(prevSure); setCurrentAyah(prevAyahCount);
      currentRef.current = { sure: prevSure, ayah: prevAyahCount };
      if (isPlayingRef.current) playAudio(prevSure, prevAyahCount);
    }
  }, [playAudio]);

  // Sure seç
  const selectSure = useCallback((sureNo) => {
    setCurrentSure(sureNo); setCurrentAyah(1);
    currentRef.current = { sure: sureNo, ayah: 1 };
    setIsPlaying(false); isPlayingRef.current = false;
    if (audioRef.current) audioRef.current.pause();
  }, []);

  // Hatim moduna geç
  const resumeHatim = useCallback(() => {
    setMode('hatim'); modeRef.current = 'hatim';
    setCurrentSure(hatimRef.current.sure);
    setCurrentAyah(hatimRef.current.ayah);
    currentRef.current = { sure: hatimRef.current.sure, ayah: hatimRef.current.ayah };
  }, []);

  // Audio element bağla — onended artık ref kullanıyor
  const getAudioRef = useCallback((el) => {
    audioRef.current = el;
    if (el) {
      el.onended = () => nextAyah(); // ✅ Her render'da güncelleniyor
      el.onerror = () => setError('Ses dosyası yüklenemedi.');
    }
  }, [nextAyah]);

  const currentSureInfo = sureList[currentSure - 1];
  const totalAyahs      = SURE_AYET[currentSure - 1];
  const progress        = currentAyah / totalAyahs;

  return {
    isPlaying, isLoading, error,
    currentSure, currentAyah, totalAyahs, progress,
    ayahData, sureList, mode, translation,
    hatimProgress, currentSureInfo,
    togglePlay, nextAyah, prevAyah,
    selectSure, setMode, setTranslation,
    resumeHatim, getAudioRef, SURE_AYET,
  };
}

const TR_SURE_NAMES = {
  1:'Fatiha',2:'Bakara',3:'Âl-i İmrân',4:'Nisâ',5:'Mâide',
  6:'Enâm',7:'Arâf',8:'Enfâl',9:'Tevbe',10:'Yûnus',
  11:'Hûd',12:'Yûsuf',13:'Rad',14:'İbrâhim',15:'Hicr',
  16:'Nahl',17:'İsrâ',18:'Kehf',19:'Meryem',20:'Tâhâ',
  21:'Enbiyâ',22:'Hac',23:"Mü'minûn",24:'Nûr',25:'Furkân',
  26:'Şuarâ',27:'Neml',28:'Kasas',29:'Ankebût',30:'Rûm',
  31:'Lokmân',32:'Secde',33:'Ahzâb',34:"Sebe'",35:'Fâtır',
  36:'Yâsin',37:'Sâffât',38:'Sâd',39:'Zümer',40:"Mü'min",
  41:'Fussilet',42:'Şûrâ',43:'Zuhruf',44:'Duhân',45:'Câsiye',
  46:'Ahkâf',47:'Muhammed',48:'Fetih',49:'Hucurât',50:'Kâf',
  51:'Zâriyât',52:'Tûr',53:'Necm',54:'Kamer',55:'Rahmân',
  56:'Vâkıa',57:'Hadîd',58:'Mücâdele',59:'Haşr',60:'Mümtehine',
  61:'Saf',62:'Cumâ',63:'Münâfikûn',64:'Teğâbün',65:'Talâk',
  66:'Tahrîm',67:'Mülk',68:'Kalem',69:'Hâkka',70:'Meâric',
  71:'Nûh',72:'Cin',73:'Müzzemmil',74:'Müddessir',75:'Kıyâme',
  76:'İnsân',77:'Mürselât',78:"Nebe'",79:'Nâziât',80:'Abese',
  81:'Tekvîr',82:'İnfitâr',83:'Mutaffifîn',84:'İnşikâk',85:'Burûc',
  86:'Târık',87:"A'lâ",88:'Ğâşiye',89:'Fecr',90:'Beled',
  91:'Şems',92:'Leyl',93:'Duhâ',94:'İnşirâh',95:'Tîn',
  96:'Alak',97:'Kadr',98:'Beyyine',99:'Zilzâl',100:'Âdiyât',
  101:'Kâria',102:'Tekâsür',103:'Asr',104:'Hümeze',105:'Fîl',
  106:'Kureyş',107:'Mâûn',108:'Kevser',109:'Kâfirûn',110:'Nasr',
  111:'Tebbet',112:'İhlâs',113:'Felak',114:'Nâs',
};
