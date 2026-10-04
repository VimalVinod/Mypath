import React from 'react';
import { useApp } from '../context/AppContext';
import { SidebarLayout } from '../components/SidebarLayout';
import { Search } from 'lucide-react';

export const BrowseExamsPage: React.FC = () => {
  const { navigate } = useApp();

  return (
    <SidebarLayout pageTitle="Browse Exams" activeNav="exams">
      <div style={{ marginBottom: '1.5rem' }}>
        <p style={{ fontSize: '0.9rem', color: '#64748B', margin: 0 }}>
          Discover and explore government exams that match your qualifications.
        </p>
      </div>

      <div style={{
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
        <h2 style={{ color: '#0F172A', marginBottom: '0.5rem', fontSize: '1.2rem', fontWeight: 700 }}>Exam Database Coming Soon</h2>
        <p style={{ color: '#64748B', fontSize: '0.9rem', maxWidth: '400px', margin: '0 auto' }}>
          We are building the exam database. Check back soon — your eligible exams will appear here automatically based on your profile.
        </p>
      </div>
    </SidebarLayout>
  );
};

export default BrowseExamsPage;

