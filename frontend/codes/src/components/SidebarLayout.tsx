import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import {
  LayoutDashboard, Search, ListChecks, User, Bell, BookOpen,
  LogOut, ChevronRight, Menu, X, RefreshCw
} from 'lucide-react';
import logoImg from '../assets/logo_stacked_white.png';

const BRAND_GREEN = '#10B981';
const SIDEBAR_BG = '#121212';

// Profile picture options served from /public/profile-pictures/
const AVATAR_OPTIONS = [
  '/profile-pictures/avatar-1.jpeg',
  '/profile-pictures/avatar-2.jpeg',
  '/profile-pictures/avatar-3.jpeg',
  '/profile-pictures/avatar-4.jpeg',
  '/profile-pictures/avatar-5.jpeg',
];

interface SidebarLayoutProps {
  children: React.ReactNode;
  pageTitle: string;
  activeNav: 'dashboard' | 'exams' | 'tracker' | 'materials' | 'profile' | 'notifications';
}

const NAV_ITEMS = [
  { key: 'dashboard',     label: 'Dashboard',       icon: LayoutDashboard, path: '/dashboard' },
  { key: 'exams',         label: 'Browse Exams',    icon: Search,          path: '/exams' },
  { key: 'tracker',       label: 'My Tracker',      icon: ListChecks,      path: '/tracker' },
  { key: 'materials',     label: 'Study Materials', icon: BookOpen,        path: '/materials' },
  { key: 'profile',       label: 'Profile',         icon: User,            path: '/profile' },
  { key: 'notifications', label: 'Notifications',   icon: Bell,            path: '/notifications' },
];

export const SidebarLayout: React.FC<SidebarLayoutProps> = ({ children, pageTitle, activeNav }) => {
  const { navigate, userProfile, currentUser, logoutUser, unreadNotificationCount, updateUserProfile, linkGoogleAccount, linkPasswordAccount } = useApp();
  const [collapsed, setCollapsed] = useState(false);
  const [accountTabOpen, setAccountTabOpen] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [editAccountName, setEditAccountName] = useState('');
  const [pickerOpen, setPickerOpen] = useState(false);

  const displayName = userProfile?.accountName || currentUser?.displayName || currentUser?.email?.split('@')[0] || 'User';
  const initials = displayName.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2);
  const selectedAvatar = userProfile?.avatarUrl || '';

  const handleRefresh = async () => {
    alert("Your page will be refreshing in a couple of seconds...");
    try {
      // Hit the Vercel backend to force a sync
      await fetch("https://mypath-backend-two.vercel.app/match-user", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: currentUser?.uid })
      });
      // Force reload the dashboard
      window.location.reload();
    } catch (e) {
      console.error(e);
      window.location.reload();
    }
  };

  const SidebarContent = () => (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>

      {/* Logo + Collapse Toggle */}
      <div className="sidebar-logo-area" style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: collapsed ? 'center' : 'space-between',
        padding: '1.5rem 1.25rem 1rem',
        borderBottom: '1px solid rgba(255,255,255,0.05)',
      }}>
        {!collapsed && (
          <img src={logoImg} alt="MyPath" style={{ height: '56px', objectFit: 'contain' }} />
        )}
        <button
          onClick={() => setCollapsed(c => !c)}
          style={{
            background: 'transparent',
            border: 'none',
            borderRadius: '8px',
            padding: '0.4rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            color: '#71717A',
            transition: 'color 0.15s, background 0.15s',
          }}
          onMouseEnter={e => { e.currentTarget.style.color = '#fff'; e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; }}
          onMouseLeave={e => { e.currentTarget.style.color = '#71717A'; e.currentTarget.style.background = 'transparent'; }}
        >
          {collapsed ? <ChevronRight size={17} /> : <Menu size={17} />}
        </button>
      </div>

      {/* User Avatar Block */}
      <div className="sidebar-profile-area" style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: collapsed ? '1.5rem 0.75rem' : '1.5rem 1.25rem',
        borderBottom: '1px solid rgba(255,255,255,0.05)',
        gap: '0.6rem',
      }}>
        {/* Avatar - display only, editing is inside Manage Account popup */}
        <div style={{ position: 'relative' }}>
          {selectedAvatar ? (
            <img
              src={selectedAvatar}
              alt="Avatar"
              style={{
                width: '56px', height: '56px', borderRadius: '50%',
                objectFit: 'cover', border: '2px solid rgba(255,255,255,0.15)',
                display: 'block',
              }}
            />
          ) : (
            <div style={{
              width: '56px', height: '56px', borderRadius: '50%',
              backgroundColor: '#10B981',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '1.1rem', fontWeight: 700, color: '#fff',
              flexShrink: 0, border: '2px solid rgba(255,255,255,0.1)',
            }}>
              {initials}
            </div>
          )}
        </div>

        {!collapsed && (
          <div style={{ minWidth: 0, width: '100%', textAlign: 'center' }}>
            <div style={{ fontWeight: 600, color: '#F4F4F5', fontSize: '0.9rem', lineHeight: 1.3, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {displayName}
            </div>

            <button
              onClick={() => setAccountTabOpen(true)}
              style={{
                marginTop: '0.6rem',
                padding: '0.3rem 1rem',
                backgroundColor: BRAND_GREEN,
                color: '#fff',
                border: 'none',
                borderRadius: '999px',
                fontSize: '0.75rem',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'background-color 0.2s',
                width: '100%',
              }}
            >
              Manage Account
            </button>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="sidebar-nav" style={{ flex: 1, padding: '1rem 0', display: 'flex', flexDirection: 'column', gap: '0.15rem' }}>
        {!collapsed && (
          <div className="sidebar-nav-header" style={{ fontSize: '0.65rem', fontWeight: 600, color: '#52525B', letterSpacing: '0.1em', textTransform: 'uppercase', padding: '0 1.25rem', marginBottom: '0.5rem' }}>
            MAIN MENU
          </div>
        )}
        {NAV_ITEMS.map(item => {
          const Icon = item.icon;
          const isActive = activeNav === item.key;
          return (
            <button
              className={`sidebar-nav-btn${isActive ? ' active' : ''}${item.key === 'notifications' ? ' mobile-hidden' : ''}`}
              key={item.key}
              onClick={() => navigate(item.path)}
              title={collapsed ? item.label : undefined}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.8rem',
                padding: collapsed ? '0.75rem 0' : '0.75rem 1.25rem',
                borderRadius: '0px',
                border: 'none',
                cursor: 'pointer',
                backgroundColor: isActive ? 'rgba(16,185,129,0.12)' : 'transparent',
                color: isActive ? BRAND_GREEN : '#A1A1AA',
                fontWeight: isActive ? 600 : 500,
                fontSize: '0.9rem',
                textAlign: 'left',
                width: '100%',
                justifyContent: collapsed ? 'center' : 'flex-start',
                transition: 'all 0.15s ease',
                borderLeft: isActive ? `3px solid ${BRAND_GREEN}` : '3px solid transparent',
              }}
              onMouseEnter={e => { if (!isActive) { e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.05)'; e.currentTarget.style.color = '#F4F4F5'; } }}
              onMouseLeave={e => { if (!isActive) { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = '#A1A1AA'; } }}
            >
              <Icon size={18} strokeWidth={isActive ? 2.5 : 2} />
              <span className="sidebar-nav-label" style={{ flex: 1, display: collapsed ? 'none' : undefined }}>{item.label}</span>
              {!collapsed && item.key === 'notifications' && unreadNotificationCount > 0 && (
                <span className="sidebar-nav-badge" style={{
                  backgroundColor: isActive ? 'rgba(16,185,129,0.3)' : '#EF4444',
                  color: '#fff',
                  borderRadius: '999px',
                  fontSize: '0.65rem',
                  fontWeight: 700,
                  padding: '0.1rem 0.4rem',
                  minWidth: '16px',
                  textAlign: 'center',
                }}>
                  {unreadNotificationCount}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Sign Out */}
      <div className="sidebar-signout" style={{ padding: '0.75rem', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
        <button
          onClick={logoutUser}
          title={collapsed ? 'Sign Out' : undefined}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.8rem',
            padding: collapsed ? '0.75rem 0' : '0.75rem 1.25rem',
            borderRadius: '0px',
            border: 'none',
            cursor: 'pointer',
            backgroundColor: 'transparent',
            color: '#71717A',
            fontWeight: 500,
            fontSize: '0.9rem',
            width: '100%',
            justifyContent: collapsed ? 'center' : 'flex-start',
            transition: 'all 0.15s ease',
          }}
          onMouseEnter={e => { e.currentTarget.style.backgroundColor = 'rgba(239,68,68,0.1)'; e.currentTarget.style.color = '#EF4444'; }}
          onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = '#71717A'; }}
        >
          <LogOut size={18} />
          {!collapsed && <span>Sign Out</span>}
        </button>
      </div>

      {/* Account Management Modal — outside sidebar so position:fixed works on mobile */}
    </div>
  );

  const sidebarWidth = collapsed ? '76px' : '260px';

  // Modal content (shared between desktop sidebar click and mobile avatar click)
  const AccountModal = accountTabOpen ? (
    <div
      onClick={() => setAccountTabOpen(false)}
      style={{
        position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 300,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          backgroundColor: '#FFFFFF', borderRadius: '16px',
          padding: '1.5rem', width: '90%', maxWidth: '380px',
          maxHeight: '85vh', overflowY: 'auto',
          boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
          <h2 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 700, color: '#0F172A' }}>Manage Account</h2>
          <button onClick={() => setAccountTabOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748B', display: 'flex' }}>
            <X size={20} />
          </button>
        </div>

        {/* User info with avatar + pencil edit */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.25rem' }}>
          {/* Avatar + pencil icon */}
          <div style={{ position: 'relative', flexShrink: 0 }}>
            {selectedAvatar ? (
              <img src={selectedAvatar} alt="Avatar" style={{ width: '60px', height: '60px', borderRadius: '50%', objectFit: 'cover', display: 'block' }} />
            ) : (
              <div style={{ width: '60px', height: '60px', borderRadius: '50%', backgroundColor: '#10B981', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem', fontWeight: 700, color: '#fff' }}>
                {initials}
              </div>
            )}
            {/* Pencil edit button */}
            <button
              onClick={() => setPickerOpen(p => !p)}
              style={{
                position: 'absolute', bottom: 0, right: 0,
                width: '22px', height: '22px', borderRadius: '50%',
                backgroundColor: '#0F172A', border: '2px solid #fff',
                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                padding: 0,
              }}
              title="Change profile picture"
            >
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
              </svg>
            </button>
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: '#0F172A', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{displayName}</h3>
            <p style={{ margin: '0.2rem 0 0', color: '#64748B', fontSize: '0.85rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{userProfile?.email || currentUser?.email || 'No email connected'}</p>
          </div>
        </div>

        {/* Inline image picker (shown when pencil clicked) */}
        {pickerOpen && (
          <div style={{
            display: 'flex', gap: '10px', flexWrap: 'wrap', justifyContent: 'center',
            background: '#F8FAFC', borderRadius: '12px', padding: '0.85rem',
            border: '1px solid #E2E8F0', marginBottom: '1rem',
          }}>
            {AVATAR_OPTIONS.map((src) => (
              <button
                key={src}
                onClick={() => { updateUserProfile?.({ avatarUrl: src }); setPickerOpen(false); }}
                style={{
                  width: '52px', height: '52px', borderRadius: '50%', padding: 0,
                  border: selectedAvatar === src ? '3px solid #10B981' : '3px solid transparent',
                  cursor: 'pointer', overflow: 'hidden', flexShrink: 0,
                  boxShadow: selectedAvatar === src ? '0 0 0 1px #10B981' : 'none',
                }}
              >
                <img src={src} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              </button>
            ))}
          </div>
        )}

        <div style={{ borderTop: '1px solid #E2E8F0', paddingTop: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>

          {/* Edit Account Name */}
          <div style={{ padding: '1rem', background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '12px' }}>
            <h4 style={{ margin: '0 0 0.75rem', color: '#0F172A', fontSize: '0.95rem', fontWeight: 600 }}>Display Name</h4>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <input
                type="text"
                value={editAccountName}
                onChange={e => setEditAccountName(e.target.value)}
                placeholder="Enter display name"
                style={{ flex: 1, padding: '0.6rem', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '0.9rem' }}
              />
              <button
                onClick={() => { if (updateUserProfile) updateUserProfile({ accountName: editAccountName }); }}
                style={{ padding: '0.6rem 1rem', backgroundColor: BRAND_GREEN, color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 600, fontSize: '0.9rem', cursor: 'pointer' }}
              >
                Save
              </button>
            </div>
          </div>

          <h4 style={{ margin: 0, color: '#475569', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>Authentication Methods</h4>

          {/* Google Auth */}
          <div style={{ padding: '1rem', background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '12px' }}>
            <h3 style={{ fontSize: '0.95rem', fontWeight: 600, color: '#0F172A', marginBottom: '0.75rem', marginTop: 0 }}>Google Sign-In</h3>
            {userProfile?.authProviders?.includes('google.com') ? (
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '0.4rem 0.8rem', backgroundColor: '#F0FDF4', color: '#166534', borderRadius: '6px', fontSize: '0.85rem', fontWeight: 600 }}>
                ✔ Connected
              </div>
            ) : (
              <button onClick={linkGoogleAccount} style={{ padding: '0.6rem 1rem', width: '100%', backgroundColor: '#fff', color: '#334155', border: '1px solid #CBD5E1', borderRadius: '8px', fontWeight: 600, fontSize: '0.9rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" style={{ width: '18px', height: '18px' }} />
                Link Google Account
              </button>
            )}
          </div>

          {/* Password Auth */}
          <div style={{ padding: '1rem', background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '12px' }}>
            <h3 style={{ fontSize: '0.95rem', fontWeight: 600, color: '#0F172A', marginBottom: '0.75rem', marginTop: 0 }}>Email & Password</h3>
            {userProfile?.authProviders?.includes('password') ? (
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '0.4rem 0.8rem', backgroundColor: '#F0FDF4', color: '#166534', borderRadius: '6px', fontSize: '0.85rem', fontWeight: 600 }}>
                ✔ Connected
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <input
                  type="password"
                  placeholder="Enter a new password"
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  style={{ padding: '0.7rem', borderRadius: '8px', border: '1px solid #CBD5E1', backgroundColor: '#fff', color: '#0F172A', fontSize: '0.9rem' }}
                />
                {newPassword.length > 0 && newPassword.length < 6 && (
                  <span style={{ fontSize: '0.75rem', color: '#EF4444' }}>Minimum 6 characters required</span>
                )}
                <button
                  onClick={() => linkPasswordAccount(newPassword)}
                  disabled={!newPassword || newPassword.length < 6}
                  style={{ padding: '0.7rem 1rem', backgroundColor: '#0F172A', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 600, fontSize: '0.9rem', cursor: newPassword && newPassword.length >= 6 ? 'pointer' : 'not-allowed', opacity: newPassword && newPassword.length >= 6 ? 1 : 0.5 }}
                >
                  Set Password
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Sign Out Button */}
        <div style={{ borderTop: '1px solid #E2E8F0', paddingTop: '1.25rem', marginTop: '0.5rem' }}>
          <button
            onClick={() => { setAccountTabOpen(false); logoutUser(); }}
            style={{ width: '100%', padding: '0.85rem', backgroundColor: '#FEF2F2', color: '#DC2626', border: '1px solid #FECACA', borderRadius: '12px', fontWeight: 600, fontSize: '1rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
          >
            <LogOut size={18} />
            Sign Out
          </button>
        </div>
      </div>
    </div>
  ) : null;

  return (
    <div className="app-container" style={{ display: 'flex', minHeight: '100vh', backgroundColor: '#F1F5F9', fontFamily: 'Inter, sans-serif' }}>

      {/* Modal rendered at root level — position:fixed escapes sidebar context on all screen sizes */}
      {AccountModal}

      {/* Sidebar */}
      <aside className="sidebar-container" style={{
        width: sidebarWidth,
        minWidth: sidebarWidth,
        backgroundColor: SIDEBAR_BG,
        height: '100vh',
        position: 'sticky',
        top: 0,
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        overflow: 'hidden',
        zIndex: 30,
        display: 'flex',
        flexDirection: 'column',
      }}>
        <SidebarContent />
      </aside>

      {/* Main area */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>

        {/* Top bar */}
        <header className="main-header" style={{
          backgroundColor: '#FFFFFF',
          borderBottom: '1px solid #E2E8F0',
          padding: '0 2rem',
          height: '56px',
          display: 'flex',
          alignItems: 'center',
          position: 'sticky',
          top: 0,
          zIndex: 20,
          boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
        }}>
          {/* Mobile: Profile avatar on the left */}
          <div className="mobile-only" style={{ display: 'none', alignItems: 'center' }}>
            <button
              onClick={() => setAccountTabOpen(true)}
              style={{
                width: '36px', height: '36px', borderRadius: '50%',
                border: 'none', cursor: 'pointer', padding: 0, overflow: 'hidden',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                backgroundColor: '#10B981', fontSize: '0.85rem', fontWeight: 700, color: '#fff',
              }}
            >
              {selectedAvatar
                ? <img src={selectedAvatar} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                : initials}
            </button>
          </div>

          <h1 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#0F172A', margin: 0, flex: 1, textAlign: 'center' }}>{pageTitle}</h1>

          {/* Mobile: Notification bell on the right */}
          <div className="mobile-only" style={{ display: 'none', alignItems: 'center' }}>
            <button
              onClick={() => navigate('/notifications')}
              style={{
                background: 'transparent', border: 'none', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                position: 'relative', padding: '0.4rem',
              }}
            >
              <Bell size={22} color="#A1A1AA" />
              {unreadNotificationCount > 0 && (
                <span style={{
                  position: 'absolute', top: 0, right: 0,
                  backgroundColor: '#EF4444', color: '#fff',
                  borderRadius: '50%', width: '14px', height: '14px',
                  fontSize: '0.55rem', fontWeight: 700,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  {unreadNotificationCount}
                </span>
              )}
            </button>
          </div>
        </header>

        {/* Page content */}
        <main className="main-content main-body" style={{ flex: 1, padding: '1.75rem 2rem', overflowY: 'auto' }}>
          {children}
        </main>
      </div>
    </div>
  );
};

