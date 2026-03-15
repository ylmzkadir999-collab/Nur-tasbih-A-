import { useState, useEffect, useCallback } from 'react';

// Kabe koordinatları
const KAABA = { lat: 21.4225, lng: 39.8262 };

function calculateQibla(userLat, userLng) {
  const φ1 = (userLat  * Math.PI) / 180;
  const φ2 = (KAABA.lat * Math.PI) / 180;
  const Δλ = ((KAABA.lng - userLng) * Math.PI) / 180;

  const y = Math.sin(Δλ) * Math.cos(φ2);
  const x = Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);
  const θ = Math.atan2(y, x);
  const bearing = ((θ * 180) / Math.PI + 360) % 360;
  return Math.round(bearing);
}

function getDistance(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return Math.round(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}

export function useQibla(lat, lng) {
  const [compass, setCompass] = useState(null);
  const [hasCompass, setHasCompass] = useState(false);
  const [permissionDenied, setPermissionDenied] = useState(false);

  const qiblaAngle = lat && lng ? calculateQibla(lat, lng) : null;
  const distance   = lat && lng ? getDistance(lat, lng, KAABA.lat, KAABA.lng) : null;

  // Pusula için DeviceOrientationEvent
  const requestCompass = useCallback(async () => {
    if (typeof DeviceOrientationEvent === 'undefined') return;

    // iOS 13+ permission
    if (typeof DeviceOrientationEvent.requestPermission === 'function') {
      try {
        const perm = await DeviceOrientationEvent.requestPermission();
        if (perm !== 'granted') { setPermissionDenied(true); return; }
      } catch { setPermissionDenied(true); return; }
    }

    const handler = (e) => {
      if (e.webkitCompassHeading !== undefined) {
        setCompass(Math.round(e.webkitCompassHeading));
        setHasCompass(true);
      } else if (e.alpha !== null) {
        setCompass(Math.round(360 - e.alpha));
        setHasCompass(true);
      }
    };

    window.addEventListener('deviceorientationabsolute', handler, true);
    window.addEventListener('deviceorientation', handler, true);
    return () => {
      window.removeEventListener('deviceorientationabsolute', handler, true);
      window.removeEventListener('deviceorientation', handler, true);
    };
  }, []);

  // Pusula varsa kıble oku yönü = qiblaAngle - compass
  const qiblaFromNorth = qiblaAngle;
  const needleRotation = compass !== null && qiblaAngle !== null
    ? qiblaAngle - compass
    : null;

  return {
    qiblaAngle,
    distance,
    compass,
    hasCompass,
    permissionDenied,
    needleRotation,
    requestCompass,
    calculateQibla,
  };
}
