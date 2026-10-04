import React from 'react';
import { ShieldAlert, ArrowRight, Clock } from 'lucide-react';

export const FullPageSkeleton: React.FC = () => {
  const SIDEBAR_BG = '#121212';
  
  return (
    <div className="app-container" style={{ display: 'flex', minHeight: '100vh', backgroundColor: '#F1F5F9', fontFamily: 'Inter, sans-serif' }}>
      
      {/* Skeleton Sidebar */}
      <aside className="sidebar-container" style={{
        width: '260px',
        minWidth: '260px',
        backgroundColor: SIDEBAR_BG,
        height: '100vh',
        position: 'sticky',
        top: 0,
        zIndex: 30,
        display: 'flex',
        flexDirection: 'column',
      }}>
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
          <div className="sidebar-logo-area" style={{ padding: '1.25rem' }}>
            <div className="skeleton-box" style={{ width: '80%', height: '32px', borderRadius: '6px', backgroundColor: '#2A2A2A' }}></div>
          </div>
          
          <nav className="sidebar-nav" style={{ flex: 1, padding: '1rem 0', display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
            <div className="sidebar-nav-header" style={{ padding: '0 1.25rem', marginBottom: '0.5rem' }}>
              <div className="skeleton-box" style={{ width: '40px', height: '10px', borderRadius: '4px', backgroundColor: '#2A2A2A' }}></div>
            </div>
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className={`sidebar-nav-btn ${i === 6 ? 'mobile-hidden' : ''}`} style={{ padding: '0.75rem 1.25rem', display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
                <div className="skeleton-box" style={{ width: '24px', height: '24px', borderRadius: '4px', backgroundColor: '#2A2A2A', flexShrink: 0 }}></div>
                <div className="skeleton-box sidebar-nav-label" style={{ width: '50%', height: '14px', borderRadius: '4px', backgroundColor: '#2A2A2A' }}></div>
              </div>
            ))}
          </nav>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="main-content" style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        
        {/* Skeleton Header */}
        <header className="main-header" style={{
          backgroundColor: '#FFFFFF',
          borderBottom: '1px solid #E2E8F0',
          padding: '0 1rem',
          height: '56px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          position: 'sticky',
          top: 0,
          zIndex: 20,
          boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
        }}>
          <div className="mobile-only" style={{ display: 'none', alignItems: 'center' }}>
            <div className="skeleton-box" style={{ width: '36px', height: '36px', borderRadius: '50%' }}></div>
          </div>
          <div style={{ flex: 1, display: 'flex', justifyContent: 'center' }}>
            <div className="skeleton-box" style={{ width: '120px', height: '24px', borderRadius: '6px' }}></div>
          </div>
          <div className="mobile-only" style={{ display: 'none', alignItems: 'center' }}>
            <div className="skeleton-box" style={{ width: '30px', height: '30px', borderRadius: '50%' }}></div>
          </div>
        </header>

        {/* Dashboard Skeleton Grid */}
        <div style={{ padding: '1.75rem 2rem', flex: 1 }}>
          <div className="dashboard-stats-grid" style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '1.25rem',
            marginBottom: '1.75rem'
          }}>
            {[1, 2, 3, 4].map(card => (
              <div key={card} className="stat-card" style={{
                backgroundColor: '#FFFFFF',
                borderRadius: '14px',
                padding: '1.25rem 1.5rem',
                border: '1px solid #E2E8F0',
                boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '1rem',
              }}>
                <div className="skeleton-box" style={{ width: '42px', height: '42px', borderRadius: '10px', flexShrink: 0 }}></div>
                <div className="skeleton-stat-text-wrapper" style={{ minWidth: 0, width: '100%', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                  <div className="skeleton-box" style={{ width: '40px', height: '28px', borderRadius: '6px' }}></div>
                  <div className="skeleton-box" style={{ width: '85%', height: '14px', borderRadius: '4px', marginTop: '0.2rem' }}></div>
                  <div className="skeleton-box" style={{ width: '65%', height: '12px', borderRadius: '4px' }}></div>
                </div>
              </div>
            ))}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1.25rem', alignItems: 'start' }}>
            <div className="dashboard-deadlines-card deadlines-card" style={{ backgroundColor: '#FFFFFF', borderRadius: '14px', border: '1px solid #E2E8F0', padding: '1.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
                <div className="skeleton-box" style={{ width: '180px', height: '20px', borderRadius: '6px' }}></div>
                <div className="skeleton-box" style={{ width: '60px', height: '16px', borderRadius: '4px' }}></div>
              </div>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <div style={{ 
                  padding: '2.5rem 1.5rem', 
                  textAlign: 'center', 
                  border: '1px dashed #CBD5E1', 
                  borderRadius: '12px', 
                  backgroundColor: '#F8FAFC',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.6rem'
                }}>
                  <div className="skeleton-box" style={{ width: '48px', height: '48px', borderRadius: '50%', marginBottom: '0.5rem' }}></div>
                  <div className="skeleton-box" style={{ width: '180px', height: '18px', borderRadius: '4px' }}></div>
                  <div className="skeleton-box" style={{ width: '220px', height: '12px', borderRadius: '4px' }}></div>
                  <div className="skeleton-box" style={{ width: '190px', height: '12px', borderRadius: '4px' }}></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};
