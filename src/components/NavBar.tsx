/**
 * NavBar — persistent navigation bar shown on every authenticated page.
 * Links to role-gated pages only render when the user's role allows access,
 * so there is never a link that leads to an "access denied" screen.
 */

import type { CSSProperties } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '@auth/AuthContext';
import { t } from '@i18n/strings';
import type { Lang } from '@i18n/strings';

const TEAL = '#0F6E56';

const linkStyle: CSSProperties = {
  color: '#595959',
  textDecoration: 'none',
  fontSize: 14,
  padding: '4px 0',
};

const activeLinkStyle: CSSProperties = {
  ...linkStyle,
  color: TEAL,
  fontWeight: 600,
  borderBottom: `2px solid ${TEAL}`,
};

function navLinkStyle({ isActive }: { isActive: boolean }): CSSProperties {
  return isActive ? activeLinkStyle : linkStyle;
}

function LogoBadge() {
  return (
    <div
      style={{
        width: 28,
        height: 28,
        borderRadius: 6,
        background: TEAL,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
      }}
    >
      <span style={{ color: '#fff', fontSize: 13, fontWeight: 700, lineHeight: 1 }}>STEM.</span>
    </div>
  );
}

function UserAvatar({ name, email }: { name: string | null; email: string }) {
  const initial = (name ?? email).charAt(0).toUpperCase();
  return (
    <div
      aria-hidden
      style={{
        width: 30,
        height: 30,
        borderRadius: '50%',
        background: '#E1F5EE',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
      }}
    >
      <span style={{ color: TEAL, fontSize: 13, fontWeight: 700, lineHeight: 1 }}>{initial}</span>
    </div>
  );
}

export function NavBar({ lang }: { lang: Lang }) {
  const { profile, status, signOut } = useAuth();
  const navigate = useNavigate();
  const role = profile?.role;

  const handleSignOut = () => {
    void signOut().then(() => navigate('/login', { replace: true }));
  };

  return (
    <nav
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 40,
        display: 'flex',
        gap: 20,
        alignItems: 'center',
        padding: '10px 16px',
        background: 'rgba(255,255,255,0.96)',
        borderBottom: '1px solid #E8ECF0',
        backdropFilter: 'blur(4px)',
      }}
    >
      {/* Brand */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginRight: 8 }}>
        <LogoBadge />
        <span style={{ fontSize: 15, fontWeight: 500, color: TEAL, lineHeight: 1 }}>
          {t('appName', lang)}
        </span>
      </div>

      {/* Nav links */}
      <NavLink to="/" style={navLinkStyle}>{t('navGame', lang)}</NavLink>
      <NavLink to="/library" style={navLinkStyle}>{t('navLibrary', lang)}</NavLink>
      <NavLink to="/achievements" style={navLinkStyle}>{t('navAchievements', lang)}</NavLink>
      {(role === 'instructor' || role === 'admin') && (
        <NavLink to="/instructor" style={navLinkStyle}>{t('navInstructor', lang)}</NavLink>
      )}
      {(role === 'researcher' || role === 'admin') && (
        <NavLink to="/research" style={navLinkStyle}>{t('navResearch', lang)}</NavLink>
      )}
      {(role === 'instructor' || role === 'admin') && (
        <NavLink to="/editor" style={navLinkStyle}>{t('navEditor', lang)}</NavLink>
      )}

      {/* Right side: avatar + sign-out */}
      {status === 'signed-in' && profile && (
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 12 }}>
          <UserAvatar name={profile.name} email={profile.email} />
          <button
            onClick={handleSignOut}
            style={{
              border: 'none',
              background: 'none',
              color: '#8C8C8C',
              fontSize: 13,
              cursor: 'pointer',
              padding: '4px 0',
            }}
          >
            {t('navSignOut', lang)}
          </button>
        </div>
      )}
    </nav>
  );
}
