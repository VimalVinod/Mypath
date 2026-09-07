import React from 'react';
import { useApp } from '../context/AppContext';
import { Navbar } from '../components/Navbar';
import { MobileNav } from '../components/MobileNav';
import { Footer } from '../components/Footer';
import { ExamCard } from '../components/ExamCard';
import { Target, Clock, BookmarkCheck, ArrowRight, Sparkles, ChevronRight, AlertCircle } from 'lucide-react';

export const DashboardPage: React.FC = () => {
  const { userProfile, exams, trackerItems, navigate, careerResult } = useApp();

  const matchedExams = exams.filter(e => e.matchLevel === 'Eligible' || e.matchLevel === 'Probably Eligible');
  const upcomingDeadlines = [...exams].sort((a, b) => a.daysRemaining - b.daysRemaining).slice(0, 4);
  const activeApplications = trackerItems.filter(t => t.status === 'Applied' || t.status === 'Under Review');

  const todayFormatted = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' });

  return (
    <div style={{ minHeight: '100vh', backgroundColor: 'var(--bg-subtle)' }}>
      <Navbar />

      <main className="container" style={{ padding: '2.5rem 1.5rem' }}>
        
        {/* Profile Incomplete Banner (If user has not completed onboarding) */}
        {!userProfile.isOnboarded && (
          <div 
            style={{ 
              backgroundColor: '#FFFFFF', 
              border: '1.5px solid var(--border-dark)', 
              borderRadius: 'var(--radius-card)', 
              padding: '1.25rem 1.5rem', 
              marginBottom: '2rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '1rem',
              boxShadow: 'var(--shadow-sm)'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <AlertCircle size={22} color="var(--brand-red)" />
              <div>
                <h4 style={{ fontSize: '0.95rem', textTransform: 'uppercase', color: 'var(--text-primary)' }}>Profile Setup Incomplete</h4>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                  Complete your degree, age, category, and domicile to enable accurate eligibility matching.
                </p>
              </div>
            </div>
            <button 
              className="btn btn-primary btn-sm"
              onClick={() => navigate('/onboarding')}
            >
              Complete Setup
            </button>
          </div>
        )}

        {/* Top Greeting Bar */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '2rem' }}>
          <div>
            <span className="badge badge-dark" style={{ marginBottom: '0.5rem' }}>
              ASPIRANT DASHBOARD
            </span>
            <h1 style={{ fontSize: '2.2rem', textTransform: 'uppercase', marginBottom: '0.25rem' }}>
              Welcome back{userProfile.name ? `, ${userProfile.name.split(' ')[0]}` : ''}
            </h1>
            <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)' }}>
              {todayFormatted} • Profile Status: <span style={{ color: userProfile.isOnboarded ? 'var(--success)' : 'var(--brand-red)', fontWeight: 700 }}>
                {userProfile.isOnboarded ? 'Active & Verified' : 'Incomplete Setup'}
              </span>
            </p>
          </div>

          <button 
            className="btn btn-ghost btn-sm"
            onClick={() => navigate('/profile')}
          >
            Edit Profile
          </button>
        </div>

        {/* Career Test Prompt Banner (if not yet completed) */}
        {!careerResult && (
          <div 
            style={{ 
              backgroundColor: '#09090B', 
              color: '#FFFFFF',
              borderRadius: 'var(--radius-card)', 
              padding: '1.5rem 2rem', 
              marginBottom: '2rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '1rem',
              boxShadow: 'var(--shadow-md)'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div style={{ width: '42px', height: '42px', borderRadius: '8px', backgroundColor: '#27272A', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Sparkles size={20} color="var(--brand-red)" />
              </div>
              <div>
                <h4 style={{ fontSize: '1.05rem', color: '#FFFFFF', textTransform: 'uppercase', marginBottom: '0.2rem' }}>Take the 5-Min Career Quiz</h4>
                <p style={{ fontSize: '0.85rem', color: '#A1A1AA' }}>
                  Discover which competitive exam pathways align with your academic background and traits.
                </p>
              </div>
            </div>
            <button 
              className="btn btn-brand btn-sm"
              onClick={() => navigate('/career-test')}
            >
              Start Quiz
            </button>
          </div>
        )}

        {/* 3 Stat Cards - Puma/boAt Clean Metric Blocks */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.25rem', marginBottom: '2.5rem' }}>
          <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', padding: '1.5rem' }}>
            <div style={{ width: '48px', height: '48px', borderRadius: '8px', backgroundColor: '#09090B', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Target size={22} color="#FFFFFF" />
            </div>
            <div>
              <span style={{ fontSize: '2rem', fontWeight: 800, fontFamily: 'var(--font-heading)', color: 'var(--text-primary)', lineHeight: 1 }}>
                {matchedExams.length}
              </span>
              <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.03em', marginTop: '0.25rem' }}>Matched Exams</p>
            </div>
          </div>

          <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', padding: '1.5rem' }}>
            <div style={{ width: '48px', height: '48px', borderRadius: '8px', backgroundColor: 'var(--brand-red)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Clock size={22} color="#FFFFFF" />
            </div>
            <div>
              <span style={{ fontSize: '2rem', fontWeight: 800, fontFamily: 'var(--font-heading)', color: 'var(--text-primary)', lineHeight: 1 }}>
                {upcomingDeadlines.length}
              </span>
              <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.03em', marginTop: '0.25rem' }}>Upcoming Deadlines</p>
            </div>
          </div>

          <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', padding: '1.5rem' }}>
            <div style={{ width: '48px', height: '48px', borderRadius: '8px', backgroundColor: 'var(--surface-alt)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <BookmarkCheck size={22} color="var(--text-primary)" />
            </div>
            <div>
              <span style={{ fontSize: '2rem', fontWeight: 800, fontFamily: 'var(--font-heading)', color: 'var(--text-primary)', lineHeight: 1 }}>
                {activeApplications.length}
              </span>
              <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.03em', marginTop: '0.25rem' }}>Applications In Progress</p>
            </div>
          </div>
        </div>

        {/* Main Content Grid: Matched Exams + Upcoming Deadlines Widget */}
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '2rem', alignItems: 'start' }}>
          
          {/* Left: Matched For You */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <h2>Matched For You</h2>
              <a href="#" onClick={(e) => { e.preventDefault(); navigate('/exams'); }} style={{ fontSize: '0.9rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                View All <ArrowRight size={15} />
              </a>
            </div>

            {matchedExams.length === 0 ? (
              <div className="card" style={{ padding: '2rem', textAlign: 'center' }}>
                <p style={{ color: 'var(--text-secondary)', marginBottom: '1rem' }}>
                  No matched exams found yet. Complete your profile details to match active notifications.
                </p>
                <button className="btn btn-primary btn-sm" onClick={() => navigate('/onboarding')}>
                  Update Profile Details
                </button>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.25rem' }}>
                {matchedExams.slice(0, 4).map(exam => (
                  <ExamCard key={exam.id} exam={exam} />
                ))}
              </div>
            )}
          </div>

          {/* Right Sidebar: Upcoming Deadlines Widget */}
          <div className="card" style={{ padding: '1.5rem' }}>
            <h3 style={{ fontSize: '1.15rem', marginBottom: '1rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.75rem' }}>
              Upcoming Deadlines
            </h3>

            {upcomingDeadlines.length === 0 ? (
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>No upcoming deadlines right now.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {upcomingDeadlines.map(exam => (
                  <div 
                    key={exam.id} 
                    style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}
                    onClick={() => navigate(`/exams/${exam.id}`)}
                  >
                    <div>
                      <h4 style={{ fontSize: '0.9rem', marginBottom: '0.15rem' }}>{exam.shortName}</h4>
                      <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>{exam.deadlineDate}</p>
                    </div>
                    <span className={`badge ${exam.daysRemaining <= 7 ? 'badge-warning' : 'badge-amber'}`}>
                      {exam.daysRemaining}d left
                    </span>
                  </div>
                ))}
              </div>
            )}

            <button 
              className="btn btn-ghost btn-full btn-sm" 
              style={{ marginTop: '1.5rem' }}
              onClick={() => navigate('/tracker')}
            >
              Open Application Tracker <ChevronRight size={14} />
            </button>
          </div>

        </div>

      </main>

      <Footer />
      <MobileNav />
    </div>
  );
};
