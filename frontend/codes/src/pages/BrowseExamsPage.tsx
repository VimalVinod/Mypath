import React from 'react';
import { useApp } from '../context/AppContext';
import { Navbar } from '../components/Navbar';
import { Footer } from '../components/Footer';

export const BrowseExamsPage: React.FC = () => {
  const { navigate } = useApp();

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: 'var(--bg-subtle)' }}>
      <Navbar />

      <main style={{ flex: 1, maxWidth: '1100px', width: '100%', margin: '0 auto', padding: '2rem 1.5rem' }}>
        <div style={{ marginBottom: '2rem' }}>
          <h1 style={{ 
            fontSize: '1.75rem', 
            fontWeight: 800, 
            fontFamily: 'var(--font-heading)', 
            color: 'var(--text-primary)',
            marginBottom: '0.25rem'
          }}>
            Browse Exams
          </h1>
          <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
            Discover and explore exams that match your qualifications.
          </p>
        </div>

        <div style={{
          backgroundColor: '#FFFFFF',
          borderRadius: 'var(--radius-card)',
          border: '1.5px solid var(--border)',
          padding: '3rem',
          textAlign: 'center',
          color: 'var(--text-muted)'
        }}>
          <h2 style={{ color: 'var(--text-primary)', marginBottom: '0.5rem' }}>No exams found</h2>
          <p>We are currently updating our database. Please check back later.</p>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default BrowseExamsPage;
