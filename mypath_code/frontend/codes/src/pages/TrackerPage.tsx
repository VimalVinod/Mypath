import React from 'react';
import { useApp } from '../context/AppContext';
import { SidebarLayout } from '../components/SidebarLayout';
import { ListChecks, Clock, ArrowRight, Compass } from 'lucide-react';

export const TrackerPage: React.FC = () => {
  const { navigate, trackerItems, updateTrackerStatus } = useApp();

  const statusColors: Record<string, { bg: string; color: string }> = {
    'Bookmarked':       { bg: '#EFF6FF', color: '#2563EB' },
    'Applied':          { bg: '#ECFDF5', color: '#059669' },
    'Under Review':     { bg: '#FFFBEB', color: '#D97706' },
    'Completed/Expired':{ bg: '#F1F5F9', color: '#64748B' },
  };

  return (
    <SidebarLayout pageTitle="My Tracker" activeNav="tracker">
      <div style={{ marginBottom: '1.5rem' }}>
        <p style={{ fontSize: '0.9rem', color: '#64748B', margin: 0 }}>
          Keep track of the exams you are preparing for or have applied to.
        </p>
      </div>

      {trackerItems.length === 0 ? (
        <div style={{
          backgroundColor: '#FFFFFF',
          borderRadius: '14px',
          border: '1px solid #E2E8F0',
          padding: '4rem 2rem',
          textAlign: 'center',
          boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
        }}>
          <div style={{ width: '56px', height: '56px', backgroundColor: '#F5F3FF', borderRadius: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem' }}>
            <ListChecks size={26} color="#7C3AED" />
          </div>
          <h2 style={{ color: '#0F172A', marginBottom: '0.5rem', fontSize: '1.2rem', fontWeight: 700 }}>Your tracker is empty</h2>
          <p style={{ color: '#64748B', fontSize: '0.9rem', maxWidth: '360px', margin: '0 auto 1.5rem' }}>
            You haven't bookmarked any exams yet. Browse exams and save the ones you're interested in.
          </p>
          <button
            onClick={() => navigate('/exams')}
            style={{ padding: '0.65rem 1.5rem', backgroundColor: '#2563EB', color: '#FFFFFF', border: 'none', borderRadius: '8px', fontWeight: 600, cursor: 'pointer', fontSize: '0.9rem', display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
          >
            <Compass size={16} /> Explore Exams
          </button>
        </div>
      ) : (
        <div style={{ backgroundColor: '#FFFFFF', borderRadius: '14px', border: '1px solid #E2E8F0', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
          {/* Table Header */}
          <div className="tracker-table-row" style={{ display: 'grid', gridTemplateColumns: '1fr 160px 160px 140px', gap: '1rem', padding: '0.875rem 1.5rem', backgroundColor: '#F8FAFC', borderBottom: '1px solid #E2E8F0' }}>
            {['Exam', 'Organization', 'Deadline', 'Status'].map(h => (
              <span key={h} style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</span>
            ))}
          </div>

          {/* Rows */}
          {trackerItems.map((item, idx) => {
            const sc = statusColors[item.status] || statusColors['Bookmarked'];
            return (
              <div key={item.id} className="tracker-table-row" style={{ display: 'grid', gridTemplateColumns: '1fr 160px 160px 140px', gap: '1rem', padding: '1rem 1.5rem', borderBottom: idx < trackerItems.length - 1 ? '1px solid #F1F5F9' : 'none', alignItems: 'center' }}>
                <div>
                  <div style={{ fontWeight: 600, color: '#0F172A', fontSize: '0.9rem' }}>{item.examName}</div>
                </div>
                <div style={{ fontSize: '0.85rem', color: '#475569' }}>{item.organization}</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.85rem', color: '#EF4444', fontWeight: 500 }}>
                  <Clock size={13} /> {item.deadlineDate || '—'}
                </div>
                <div>
                  <select
                    value={item.status}
                    onChange={e => updateTrackerStatus(item.id, e.target.value as any)}
                    style={{ fontSize: '0.78rem', fontWeight: 600, color: sc.color, backgroundColor: sc.bg, border: 'none', borderRadius: '6px', padding: '0.3rem 0.6rem', cursor: 'pointer', outline: 'none' }}
                  >
                    {['Bookmarked', 'Applied', 'Under Review', 'Completed/Expired'].map(s => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </SidebarLayout>
  );
};

export default TrackerPage;

