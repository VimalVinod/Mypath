import React from 'react';
import { useApp } from '../context/AppContext';
import { LayoutDashboard, Compass, BookmarkCheck, User } from 'lucide-react';

export const MobileNav: React.FC = () => {
  const { currentPath, navigate } = useApp();

  const isPublicRoute = currentPath === '/' || currentPath === '/login' || currentPath === '/signup';
  if (isPublicRoute) return null;

  return (
    <nav className="mobile-nav">
      <div className="mobile-nav-items">
        <button 
          className={`mobile-nav-item ${currentPath === '/dashboard' ? 'active' : ''}`}
          onClick={() => navigate('/dashboard')}
          style={{ background: 'none', border: 'none', cursor: 'pointer' }}
        >
          <LayoutDashboard size={20} />
          <span>Dashboard</span>
        </button>

        <button 
          className={`mobile-nav-item ${currentPath === '/exams' || currentPath === '/exams/detail' ? 'active' : ''}`}
          onClick={() => navigate('/exams')}
          style={{ background: 'none', border: 'none', cursor: 'pointer' }}
        >
          <Compass size={20} />
          <span>Exams</span>
        </button>

        <button 
          className={`mobile-nav-item ${currentPath === '/tracker' ? 'active' : ''}`}
          onClick={() => navigate('/tracker')}
          style={{ background: 'none', border: 'none', cursor: 'pointer' }}
        >
          <BookmarkCheck size={20} />
          <span>Tracker</span>
        </button>

        <button 
          className={`mobile-nav-item ${currentPath === '/profile' ? 'active' : ''}`}
          onClick={() => navigate('/profile')}
          style={{ background: 'none', border: 'none', cursor: 'pointer' }}
        >
          <User size={20} />
          <span>Profile</span>
        </button>
      </div>
    </nav>
  );
};
