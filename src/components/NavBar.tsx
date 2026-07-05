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

const linkStyle: CSSProperties = {
  color: '#595959',
  textDecoration: 'none',
  fontSize: 14,
  padding: '4px 0',
};

const activeLinkStyle: React.CSSProperties = {
  ...linkStyle,
  color: '#2E75B6',
  fontWeight: 600,
  borderBottom: '2px solid #2E75B6',
};

function navLinkStyle({ isActive }: { isActive: boolean }): CSSProperties {
  return isActive ? activeLinkStyle : linkStyle;
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
      {status === 'signed-in' && (
        <button
          onClick={handleSignOut}
          style={{
            marginLeft: 'auto',
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
      )}
    </nav>
  );
}
