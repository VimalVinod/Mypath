import React from 'react';
import { SidebarLayout } from './SidebarLayout';

export const DashboardSkeleton: React.FC = () => {
  return (
    <SidebarLayout pageTitle="Dashboard" activeNav="dashboard">
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
    </SidebarLayout>
  );
};
