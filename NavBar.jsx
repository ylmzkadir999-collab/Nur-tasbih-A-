import React from 'react';
import { NavLink } from 'react-router-dom';

const links = [
  { to: '/',        icon: '🏠', label: 'Ana Sayfa' },
  { to: '/tasbih',  icon: '📿', label: 'Tesbih'   },
  { to: '/prayer',  icon: '🕌', label: 'Vakitler'  },
  { to: '/quran',   icon: '📖', label: 'Kuran'     },
  { to: '/premium', icon: '✦',  label: 'Premium'   },
  { to: '/dream',   icon: '🌙', label: 'Rüya'     },
  { to: '/settings',icon: '⚙️', label: 'Ayarlar'  },
];

export default function NavBar() {
  return (
    <nav style={{
      position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 40,
      background: 'rgba(6,6,15,0.97)',
      borderTop: '1px solid rgba(255,255,255,0.05)',
      backdropFilter: 'blur(20px)',
      display: 'flex',
      paddingBottom: 'env(safe-area-inset-bottom)',
    }}>
      {links.map(({ to, icon, label }) => (
        <NavLink key={to} to={to} end={to === '/'} style={({ isActive }) => ({
          flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center',
          padding: '10px 0 8px', textDecoration: 'none',
          color: isActive ? '#f5b800' : 'rgba(255,255,255,0.3)',
          fontSize: 14, gap: 2, transition: 'color 0.15s',
        })}>
          <span>{icon}</span>
          <span style={{ fontSize: 8, letterSpacing: '0.06em', fontFamily: "'DM Sans', sans-serif" }}>{label}</span>
        </NavLink>
      ))}
    </nav>
  );
}
