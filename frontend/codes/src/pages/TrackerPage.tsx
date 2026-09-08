import React from 'react';
import { useApp } from '../context/AppContext';
import { Navbar } from '../components/Navbar';
import { Footer } from '../components/Footer';

export const TrackerPage: React.FC = () => {
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
            My Tracker
          </h1>
          <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
            Keep track of the exams you are preparing for or have applied to.
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
          <h2 style={{ color: 'var(--text-primary)', marginBottom: '0.5rem' }}>Tracker is empty</h2>
          <p>You are not tracking any exams yet. Go to Browse Exams to get started.</p>
          <button 
            className="btn btn-primary"
            style={{ marginTop: '1.5rem' }}
            onClick={() => navigate('/exams')}
          >
            Explore Exams
          </button>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default TrackerPage;
