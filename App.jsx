import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store';
import NavBar from './components/NavBar';
import Home from './pages/Home';
import TasbihPage from './pages/Tasbih';
import PrayerTimes from './pages/PrayerTimes';
import QuranRadio from './pages/QuranRadio';
import Premium from './pages/Premium';
import Settings from './pages/Settings';
import DreamInterpretation from './pages/DreamInterpretation';

export default function App() {
  const refreshUser = useAuthStore(s => s.refreshUser);
  useEffect(() => { refreshUser(); }, []);

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/"         element={<Home />} />
        <Route path="/tasbih"   element={<TasbihPage />} />
        <Route path="/prayer"   element={<PrayerTimes />} />
        <Route path="/quran"    element={<QuranRadio />} />
        <Route path="/premium"  element={<Premium />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/dream"    element={<DreamInterpretation />} />
        <Route path="*"         element={<Navigate to="/" replace />} />
      </Routes>
      <NavBar />
    </BrowserRouter>
  );
}
