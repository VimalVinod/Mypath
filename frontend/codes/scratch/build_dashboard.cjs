const fs = require('fs');
const path = 'src/pages/DashboardPage.tsx';

const newCode = `import React from 'react';
import { useApp } from '../context/AppContext';
import { SidebarLayout } from '../components/SidebarLayout';
import { ShieldAlert } from 'lucide-react'; // Keeping ShieldAlert only for the critical warning

export const DashboardPage: React.FC = () => {
  const { currentUser, userProfile, navigate, trackerItems, exams, notifications } = useApp();

  const displayName =
    userProfile?.accountName ||
    currentUser?.displayName ||
    currentUser?.email?.split('@')[0] ||
    'User';

  const greeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 17) return 'Good Afternoon';
    return 'Good Evening';
  };

  // 1. Upcoming Deadlines
  const upcomingDeadlines = trackerItems
    .filter(t => t.deadlineDate)
    .sort((a, b) => new Date(a.deadlineDate).getTime() - new Date(b.deadlineDate).getTime())
    .slice(0, 3);

  // 2. Ongoing Exams (Exams with active application dates)
  const ongoingExams = exams
    .filter(e => e.matchLevel !== 'Not Eligible' && e.daysRemaining > 0)
    .sort((a, b) => a.daysRemaining - b.daysRemaining)
    .slice(0, 3);

  // 3. Bookmarks
  const bookmarkedExams = trackerItems
    .filter(t => t.status === 'Bookmarked')
    .slice(0, 3);

  // 4. Alerts (Mock notifications subset)
  const alerts = notifications.filter(n => n.reason.includes('Admit') || n.reason.includes('Result') || n.reason.includes('Deadline')).slice(0, 3);

  // 5. Trending Exams
  const trendingExams = exams.filter(e => e.tags.includes('trending') || e.tags.includes('upsc')).slice(0, 3);

  return (
    <SidebarLayout pageTitle="Dashboard" activeNav="dashboard">
      
      {/* Header Greeting */}
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.8rem', fontWeight: 800, color: '#0F172A', margin: 0, lineHeight: 1.2 }}>
          {greeting()}, {displayName}!
        </h1>
        <p style={{ color: '#64748B', fontSize: '0.95rem', margin: '0.3rem 0 0 0' }}>Here is your daily overview.</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem', alignItems: 'start' }}>
        
        {/* LEFT COLUMN: Main Tracking */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          {/* Ongoing Exams */}
          <div style={{ backgroundColor: '#FFFFFF', borderRadius: '12px', border: '1px solid #E2E8F0', padding: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', borderBottom: '1px solid #F1F5F9', paddingBottom: '0.75rem' }}>
              <h2 style={{ fontSize: '1.05rem', fontWeight: 700, margin: 0, color: '#0F172A', textTransform: 'uppercase', letterSpacing: '0.03em' }}>Ongoing Exams</h2>
            </div>
            {ongoingExams.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {ongoingExams.map(exam => (
                  <div key={exam.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontSize: '0.95rem', fontWeight: 600, color: '#1E293B' }}>{exam.shortName}</div>
                      <div style={{ fontSize: '0.8rem', color: '#64748B' }}>{exam.organization}</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#059669' }}>{exam.daysRemaining} days left</div>
                      <button onClick={() => navigate('/exams')} style={{ fontSize: '0.75rem', fontWeight: 600, color: '#3B82F6', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>Apply Now</button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ fontSize: '0.85rem', color: '#94A3B8' }}>No ongoing exams match your profile currently.</div>
            )}
          </div>

          {/* Upcoming Deadlines */}
          <div style={{ backgroundColor: '#FFFFFF', borderRadius: '12px', border: '1px solid #E2E8F0', padding: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', borderBottom: '1px solid #F1F5F9', paddingBottom: '0.75rem' }}>
              <h2 style={{ fontSize: '1.05rem', fontWeight: 700, margin: 0, color: '#0F172A', textTransform: 'uppercase', letterSpacing: '0.03em' }}>Upcoming Deadlines</h2>
              <button onClick={() => navigate('/tracker')} style={{ color: '#3B82F6', background: 'none', border: 'none', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer' }}>View All</button>
            </div>
            {upcomingDeadlines.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {upcomingDeadlines.map(item => (
                  <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontSize: '0.95rem', fontWeight: 600, color: '#1E293B' }}>{item.examName}</div>
                      <div style={{ fontSize: '0.8rem', color: '#64748B' }}>{item.organization}</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#DC2626' }}>{new Date(item.deadlineDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ fontSize: '0.85rem', color: '#94A3B8' }}>No upcoming deadlines in your tracker.</div>
            )}
          </div>

          {/* Bookmarks */}
          <div style={{ backgroundColor: '#FFFFFF', borderRadius: '12px', border: '1px solid #E2E8F0', padding: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', borderBottom: '1px solid #F1F5F9', paddingBottom: '0.75rem' }}>
              <h2 style={{ fontSize: '1.05rem', fontWeight: 700, margin: 0, color: '#0F172A', textTransform: 'uppercase', letterSpacing: '0.03em' }}>Your Bookmarks</h2>
              <button onClick={() => navigate('/tracker')} style={{ color: '#3B82F6', background: 'none', border: 'none', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer' }}>View All</button>
            </div>
            {bookmarkedExams.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {bookmarkedExams.map(item => (
                  <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontSize: '0.95rem', fontWeight: 600, color: '#1E293B' }}>{item.examName}</div>
                      <div style={{ fontSize: '0.8rem', color: '#64748B' }}>{item.organization}</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <span style={{ padding: '0.2rem 0.5rem', backgroundColor: '#F3F4F6', color: '#4B5563', borderRadius: '4px', fontSize: '0.7rem', fontWeight: 600 }}>Bookmarked</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ fontSize: '0.85rem', color: '#94A3B8' }}>You have not bookmarked any exams yet.</div>
            )}
          </div>

          {/* Mini Calendar Timeline */}
          <div style={{ backgroundColor: '#FFFFFF', borderRadius: '12px', border: '1px solid #E2E8F0', padding: '1.5rem' }}>
            <div style={{ marginBottom: '1rem', borderBottom: '1px solid #F1F5F9', paddingBottom: '0.75rem' }}>
              <h2 style={{ fontSize: '1.05rem', fontWeight: 700, margin: 0, color: '#0F172A', textTransform: 'uppercase', letterSpacing: '0.03em' }}>Calendar Timeline</h2>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
              {upcomingDeadlines.length > 0 ? upcomingDeadlines.map((item, idx) => (
                <div key={idx} style={{ display: 'flex', gap: '1rem' }}>
                  <div style={{ minWidth: '40px', textAlign: 'center' }}>
                    <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#DC2626', textTransform: 'uppercase' }}>
                      {new Date(item.deadlineDate).toLocaleDateString('en-US', { month: 'short' })}
                    </div>
                    <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#0F172A', lineHeight: 1 }}>
                      {new Date(item.deadlineDate).getDate()}
                    </div>
                  </div>
                  <div style={{ flex: 1, paddingBottom: idx === upcomingDeadlines.length - 1 ? 0 : '0.8rem', borderBottom: idx === upcomingDeadlines.length - 1 ? 'none' : '1px dashed #E2E8F0' }}>
                    <div style={{ fontSize: '0.9rem', fontWeight: 600, color: '#1E293B' }}>{item.examName}</div>
                    <div style={{ fontSize: '0.8rem', color: '#64748B' }}>Application Deadline</div>
                  </div>
                </div>
              )) : (
                <div style={{ fontSize: '0.85rem', color: '#94A3B8' }}>No upcoming events in timeline.</div>
              )}
            </div>
          </div>

        </div>

        {/* RIGHT COLUMN: Auxiliary / Alerts */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          {/* Profile Completeness */}
          {!userProfile?.isProfileComplete ? (
            <div style={{ backgroundColor: '#FFF7ED', border: '1px solid #FED7AA', borderRadius: '12px', padding: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                <ShieldAlert size={16} color="#C2410C" />
                <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#9A3412', margin: 0 }}>Action Required</h3>
              </div>
              <p style={{ fontSize: '0.85rem', color: '#C2410C', margin: '0 0 1rem 0' }}>Complete your profile to unlock personalized exam matching.</p>
              <button onClick={() => navigate('/profile')} style={{ width: '100%', padding: '0.6rem', backgroundColor: '#EA580C', color: '#FFFFFF', border: 'none', borderRadius: '6px', fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer' }}>Complete Profile</button>
            </div>
          ) : (
            <div style={{ backgroundColor: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: '12px', padding: '1.25rem' }}>
              <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#166534', margin: '0 0 0.25rem 0' }}>Profile 100% Complete</h3>
              <p style={{ fontSize: '0.85rem', color: '#15803D', margin: 0 }}>You are receiving optimal exam recommendations.</p>
            </div>
          )}

          {/* Career Guidance Test */}
          <div style={{ backgroundColor: '#F8FAFC', borderRadius: '12px', border: '1px solid #E2E8F0', padding: '1.5rem' }}>
            <h2 style={{ fontSize: '1.05rem', fontWeight: 700, margin: '0 0 0.5rem 0', color: '#0F172A', textTransform: 'uppercase', letterSpacing: '0.03em' }}>Career Guidance</h2>
            <p style={{ fontSize: '0.85rem', color: '#475569', margin: '0 0 1rem 0' }}>Not sure which path to take? Take our psychometric test to find your fit.</p>
            <button onClick={() => navigate('/career-test')} style={{ width: '100%', padding: '0.6rem', backgroundColor: '#0F172A', color: '#FFFFFF', border: 'none', borderRadius: '6px', fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer' }}>Start Assessment</button>
          </div>

          {/* Admit Card & Result Alerts */}
          <div style={{ backgroundColor: '#FFFFFF', borderRadius: '12px', border: '1px solid #E2E8F0', padding: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', borderBottom: '1px solid #F1F5F9', paddingBottom: '0.75rem' }}>
              <h2 style={{ fontSize: '1.05rem', fontWeight: 700, margin: 0, color: '#0F172A', textTransform: 'uppercase', letterSpacing: '0.03em' }}>Alerts</h2>
              <button onClick={() => navigate('/notifications')} style={{ color: '#3B82F6', background: 'none', border: 'none', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer' }}>View All</button>
            </div>
            {alerts.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {alerts.map(alert => (
                  <div key={alert.id} style={{ padding: '0.75rem', backgroundColor: '#F8FAFC', borderRadius: '8px', border: '1px solid #F1F5F9' }}>
                    <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#1E293B', marginBottom: '0.2rem' }}>{alert.examName}</div>
                    <div style={{ fontSize: '0.8rem', color: '#475569' }}>{alert.reason}</div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ fontSize: '0.85rem', color: '#94A3B8' }}>No recent alerts.</div>
            )}
          </div>

          {/* Trending / Popular Exams */}
          <div style={{ backgroundColor: '#FFFFFF', borderRadius: '12px', border: '1px solid #E2E8F0', padding: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', borderBottom: '1px solid #F1F5F9', paddingBottom: '0.75rem' }}>
              <h2 style={{ fontSize: '1.05rem', fontWeight: 700, margin: 0, color: '#0F172A', textTransform: 'uppercase', letterSpacing: '0.03em' }}>Trending Exams</h2>
              <button onClick={() => navigate('/exams')} style={{ color: '#3B82F6', background: 'none', border: 'none', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer' }}>View All</button>
            </div>
            {trendingExams.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {trendingExams.map(exam => (
                  <div key={exam.id} style={{ padding: '0.5rem 0', borderBottom: '1px solid #F8FAFC' }}>
                    <div style={{ fontSize: '0.9rem', fontWeight: 600, color: '#1E293B' }}>{exam.shortName}</div>
                    <div style={{ fontSize: '0.75rem', color: '#64748B' }}>{exam.organization}</div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ fontSize: '0.85rem', color: '#94A3B8' }}>No trending exams.</div>
            )}
          </div>

          {/* Quick Resume / Study Material */}
          <div style={{ backgroundColor: '#FFFFFF', borderRadius: '12px', border: '1px solid #E2E8F0', padding: '1.5rem' }}>
            <h2 style={{ fontSize: '1.05rem', fontWeight: 700, margin: '0 0 0.5rem 0', color: '#0F172A', textTransform: 'uppercase', letterSpacing: '0.03em' }}>Quick Resources</h2>
            <p style={{ fontSize: '0.85rem', color: '#475569', margin: '0 0 1rem 0' }}>Access syllabus and study materials for your tracked exams.</p>
            <button onClick={() => navigate('/study')} style={{ width: '100%', padding: '0.6rem', backgroundColor: '#F1F5F9', color: '#334155', border: '1px solid #E2E8F0', borderRadius: '6px', fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer' }}>View Study Materials</button>
          </div>

        </div>

      </div>
    </SidebarLayout>
  );
};
`;

fs.writeFileSync(path, newCode);
console.log('Successfully wrote the new DashboardPage.tsx structure.');
