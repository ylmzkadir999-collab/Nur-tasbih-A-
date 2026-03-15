import { useRef, useCallback, useEffect } from 'react';
import { useTasbihStore } from '../store';

/* Synthesize a wooden-bead click with Web Audio API */
function synthesizeClick(ctx) {
  const dur = 0.045;
  const buf = ctx.createBuffer(1, ctx.sampleRate * dur, ctx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < data.length; i++) {
    const t = i / ctx.sampleRate;
    // Fundamental + harmonic, exponential decay
    data[i] =
      Math.sin(2 * Math.PI * 900 * t) * Math.exp(-80 * t) * 0.28 +
      Math.sin(2 * Math.PI * 1600 * t) * Math.exp(-120 * t) * 0.12;
  }
  return buf;
}

export function useSound() {
  const ctxRef    = useRef(null);
  const bufRef    = useRef(null);
  const soundEnabled = useTasbihStore((s) => s.soundEnabled);

  useEffect(() => () => { ctxRef.current?.close(); }, []);

  const ensureCtx = useCallback(() => {
    if (ctxRef.current) return ctxRef.current.state !== 'closed';
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return false;
    ctxRef.current = new AC();
    bufRef.current = synthesizeClick(ctxRef.current);
    return true;
  }, []);

  const playClick = useCallback(() => {
    if (!soundEnabled) return;
    if (!ensureCtx()) return;
    const ctx = ctxRef.current;
    if (ctx.state === 'suspended') ctx.resume();
    try {
      const src = ctx.createBufferSource();
      src.buffer = bufRef.current;
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.75, ctx.currentTime);
      src.connect(gain);
      gain.connect(ctx.destination);
      src.start(ctx.currentTime);
    } catch {}
  }, [soundEnabled, ensureCtx]);

  return { playClick };
}

export function vibrate(ms = 10) {
  try { if ('vibrate' in navigator) navigator.vibrate(ms); } catch {}
}
