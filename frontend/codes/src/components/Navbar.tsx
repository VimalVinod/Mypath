import React from 'react';
import { useApp } from '../context/AppContext';
import { Bell, Search } from 'lucide-react';
import logoWhiteImg from '../assets/logo_white_text.png';

export const Navbar: React.FC = () => {
  const { currentPath, navigate, userProfile, unreadNotificationCount } = useApp();

  const isPublicRoute = currentPath === '/' || currentPath === '/login' || currentPath === '/signup';

  return (
    <nav className="navbar" style={{ backgroundColor: '#000000', borderBottom: '1px solid #1C1C1E', padding: '0.65rem 0' }}>
      <div 
        className="nav-container" 
        style={{ 
          maxWidth: '100%', 
          padding: '0 2.5rem', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'space-between' 
        }}
      >
        {/* Crisp Logo with White Text */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '2.5rem' }}>
          <a 
            href="#home" 
            className="logo"
            onClick={(e) => {
              e.preventDefault();
              navigate(userProfile.isOnboarded ? '/dashboard' : '/');
            }}
            style={{ display: 'flex', alignItems: 'center' }}
          >
            <img 
              src={logoWhiteImg} 
              alt="MyPath Logo" 
              className="navbar-brand-logo"
              style={{ 
                height: '50px', 
                width: 'auto', 
                objectFit: 'contain',
                display: 'block'
              }} 
            />
          </a>

          {/* Desktop Nav Links - All White Text */}
          {!isPublicRoute ? (
            <ul className="nav-links">
              <li>
                <a 
                  href="/dashboard" 
                  onClick={(e) => { e.preventDefault(); navigate('/dashboard'); }} 
                  className={`nav-link ${currentPath === '/dashboard' ? 'active' : ''}`}
                  style={{ color: '#FFFFFF' }}
                >
                  Dashboard
                </a>
              </li>
              <li>
                <a 
                  href="/exams" 
                  onClick={(e) => { e.preventDefault(); navigate('/exams'); }} 
                  className={`nav-link ${currentPath === '/exams' || currentPath === '/exams/detail' ? 'active' : ''}`}
                  style={{ color: '#FFFFFF' }}
                >
                  Browse Exams
                </a>
              </li>
            </ul>
          ) : null}
        </div>


        {/* Auth / User Actions */}
        <div className="nav-auth-desktop" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          {isPublicRoute ? (
            <>
              <button 
                className="btn btn-ghost btn-sm" 
                onClick={() => navigate('/login')}
                style={{ color: '#FFFFFF', border: 'none', fontWeight: 600 }}
              >
                Log In
              </button>
              <button 
                className="btn btn-sm" 
                onClick={() => navigate('/signup')}
                style={{ 
                  backgroundColor: '#FFFFFF', 
                  color: '#000000', 
                  fontWeight: 700, 
                  border: 'none',
                  borderRadius: '4px',
                  padding: '0.5rem 1.1rem'
                }}
              >
                Get Started Free
              </button>
            </>
          ) : (
            <>
              {/* Notification Bell */}
              <button 
                className="btn btn-ghost"
                style={{ position: 'relative', padding: '0.5rem', borderRadius: '50%', color: '#FFFFFF' }}
                onClick={() => navigate('/dashboard')}
                title="Notifications"
              >
                <Bell size={18} color="#FFFFFF" />
                {unreadNotificationCount > 0 && (
                  <span 
                    style={{
                      position: 'absolute',
                      top: '4px',
                      right: '4px',
                      width: '8px',
                      height: '8px',
                      backgroundColor: 'var(--brand-red)',
                      borderRadius: '50%',
                      border: '1.5px solid #000000'
                    }}
                  />
                )}
              </button>

              {/* Profile Avatar button */}
              <button 
                className="btn btn-ghost"
                style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '0.5rem',
                  padding: '0.4rem 0.85rem',
                  borderRadius: '999px',
                  backgroundColor: '#1C1C1E',
                  border: '1.5px solid #333333'
                }}
                onClick={() => navigate('/profile')}
              >
                <div 
                  style={{ 
                    width: '26px', 
                    height: '26px', 
                    borderRadius: '50%', 
                    backgroundColor: '#FFFFFF',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 700,
                    color: '#000000',
                    fontSize: '0.78rem'
                  }}
                >
                  {userProfile.name.charAt(0)}
                </div>
                <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#FFFFFF' }}>
                  {userProfile.name.split(' ')[0]}
                </span>
              </button>
            </>
          )}
        </div>
      </div>
    </nav>
  );
};
