import React from 'react';
import { useApp } from '../context/AppContext';
import { SidebarLayout } from '../components/SidebarLayout';
import { Search } from 'lucide-react';
import { ExamCard } from '../components/ExamCard';

export const BrowseExamsPage: React.FC = () => {
  const { exams } = useApp();

  return (
    <SidebarLayout pageTitle="Browse Exams" activeNav="exams">
      <div style={{ marginBottom: '1.5rem' }}>
        <p style={{ fontSize: '0.9rem', color: '#64748B', margin: 0 }}>
          Discover and explore all available government exams.
        </p>
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
        gap: '1.25rem'
      }}>
        {exams.length > 0 ? (
          exams.map(exam => (
            <ExamCard key={exam.id} exam={exam} />
          ))
        ) : (
          <div style={{
            gridColumn: '1 / -1',
            backgroundColor: '#FFFFFF',
            borderRadius: '14px',
            border: '1px solid #E2E8F0',
            padding: '4rem 2rem',
            textAlign: 'center',
            boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
          }}>
            <div style={{ width: '56px', height: '56px', backgroundColor: '#EFF6FF', borderRadius: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem' }}>
              <Search size={26} color="#2563EB" />
            </div>
            <h2 style={{ color: '#0F172A', marginBottom: '0.5rem', fontSize: '1.2rem', fontWeight: 700 }}>No Exams Found</h2>
            <p style={{ color: '#64748B', fontSize: '0.9rem', maxWidth: '400px', margin: '0 auto' }}>
              There are currently no exams available in the database.
            </p>
          </div>
        )}
      </div>
    </SidebarLayout>
  );
};

export default BrowseExamsPage;

