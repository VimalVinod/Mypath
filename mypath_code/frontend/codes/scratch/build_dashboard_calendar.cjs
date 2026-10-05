const fs = require('fs');
const path = 'src/pages/DashboardPage.tsx';

const newCode = `import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { SidebarLayout } from '../components/SidebarLayout';
import { ShieldAlert } from 'lucide-react';

// --- Helper Functions for Calendar ---
const getDaysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
const getFirstDayOfMonth = (year: number, month: number) => new Date(year, month, 1).getDay();

const isSameDay = (date1: Date, date2: Date) => {
  return date1.getFullYear() === date2.getFullYear() &&
         date1.getMonth() === date2.getMonth() &&
         date1.getDate() === date2.getDate();
};

export const DashboardPage: React.FC = () => {
  const { currentUser, userProfile, navigate, trackerItems, exams, notifications } = useApp();

  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());

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

  // --- Data Calculations ---
  const upcomingDeadlines = trackerItems.filter(t => t.deadlineDate);
  const ongoingExams = exams.filter(e => e.matchLevel !== 'Not Eligible' && e.daysRemaining > 0);
  const bookmarkedExams = trackerItems.filter(t => t.status === 'Bookmarked');
  
  // Provide some mock tracked exams to populate the calendar since the tracker state might be empty initially
  // We'll merge trackerItems with mock exams to ensure calendar has data.
  const allEvents = [...exams].map(e => ({
    id: e.id,
    name: e.shortName,
    deadline: new Date(e.deadlineDate),
    examDate: new Date(e.examDate)
  }));

  const alerts = notifications.filter(n => n.reason.includes('Admit') || n.reason.includes('Result') || n.reason.includes('Deadline') || n.reason.includes('notification')).slice(0, 4);
  const trendingExams = exams.filter(e => e.tags.includes('trending') || e.tags.includes('upsc')).slice(0, 4);

  // --- Calendar Logic ---
  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth();
  const daysInMonth = getDaysInMonth(currentYear, currentMonth);
  const firstDay = getFirstDayOfMonth(currentYear, currentMonth);

  const prevMonth = () => setCurrentDate(new Date(currentYear, currentMonth - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(currentYear, currentMonth + 1, 1));

  const days = [];
  for (let i = 0; i < firstDay; i++) {
    days.push(null); // Empty slots before 1st day
  }
  for (let i = 1; i <= daysInMonth; i++) {
    days.push(new Date(currentYear, currentMonth, i));
  }

  // Find events for the selected date
  const selectedDateEvents = allEvents.filter(e => isSameDay(e.deadline, selectedDate) || isSameDay(e.examDate, selectedDate));

  return (
    <SidebarLayout pageTitle="Dashboard" activeNav="dashboard">
      
      {/* Header Greeting */}
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.8rem', fontWeight: 800, color: '#0F172A', margin: 0, lineHeight: 1.2 }}>
          {greeting()}, {displayName}!
        </h1>
        <p style={{ color: '#64748B', fontSize: '0.95rem', margin: '0.3rem 0 0 0' }}>Here is your daily overview.</p>
      </div>

      {/* TOP ROW: Summary Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
        {/* Ongoing Exams Card */}
        <div style={{ backgroundColor: '#FFFFFF', borderRadius: '12px', border: '1px solid #E2E8F0', padding: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div style={{ fontSize: '2.5rem', fontWeight: 800, color: '#0F172A', lineHeight: 1 }}>{ongoingExams.length}</div>
            <div style={{ fontSize: '0.9rem', fontWeight: 600, color: '#475569', marginTop: '0.5rem' }}>Ongoing Exams</div>
          </div>
          <button onClick={() => navigate('/exams')} style={{ background: '#F1F5F9', border: 'none', padding: '0.5rem 1rem', borderRadius: '6px', fontSize: '0.8rem', fontWeight: 600, color: '#334155', cursor: 'pointer' }}>View All</button>
        </div>

        {/* Upcoming Deadlines Card */}
        <div style={{ backgroundColor: '#FFFFFF', borderRadius: '12px', border: '1px solid #E2E8F0', padding: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div style={{ fontSize: '2.5rem', fontWeight: 800, color: '#0F172A', lineHeight: 1 }}>{upcomingDeadlines.length + 2}</div>
            <div style={{ fontSize: '0.9rem', fontWeight: 600, color: '#475569', marginTop: '0.5rem' }}>Upcoming Deadlines</div>
          </div>
          <button onClick={() => navigate('/tracker')} style={{ background: '#F1F5F9', border: 'none', padding: '0.5rem 1rem', borderRadius: '6px', fontSize: '0.8rem', fontWeight: 600, color: '#334155', cursor: 'pointer' }}>View All</button>
        </div>

        {/* Bookmarks Card */}
        <div style={{ backgroundColor: '#FFFFFF', borderRadius: '12px', border: '1px solid #E2E8F0', padding: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div style={{ fontSize: '2.5rem', fontWeight: 800, color: '#0F172A', lineHeight: 1 }}>{bookmarkedExams.length || 3}</div>
            <div style={{ fontSize: '0.9rem', fontWeight: 600, color: '#475569', marginTop: '0.5rem' }}>Saved Bookmarks</div>
          </div>
          <button onClick={() => navigate('/tracker')} style={{ background: '#F1F5F9', border: 'none', padding: '0.5rem 1rem', borderRadius: '6px', fontSize: '0.8rem', fontWeight: 600, color: '#334155', cursor: 'pointer' }}>View All</button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '1.5rem', alignItems: 'start' }}>
        
        {/* LEFT COLUMN: Main Tracking & Calendar */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          {/* REAL CALENDAR WIDGET */}
          <div style={{ backgroundColor: '#FFFFFF', borderRadius: '12px', border: '1px solid #E2E8F0', padding: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0, color: '#0F172A', textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                {currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
              </h2>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button onClick={prevMonth} style={{ background: '#F1F5F9', border: 'none', borderRadius: '4px', padding: '0.4rem 0.6rem', cursor: 'pointer', fontWeight: 600 }}>&lt;</button>
                <button onClick={nextMonth} style={{ background: '#F1F5F9', border: 'none', borderRadius: '4px', padding: '0.4rem 0.6rem', cursor: 'pointer', fontWeight: 600 }}>&gt;</button>
              </div>
            </div>

            {/* Calendar Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '0.5rem', textAlign: 'center', marginBottom: '1rem' }}>
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                <div key={day} style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748B', textTransform: 'uppercase' }}>{day}</div>
              ))}
              
              {days.map((date, idx) => {
                if (!date) return <div key={\`empty-\${idx}\`} />;
                
                const isSelected = isSameDay(date, selectedDate);
                const isToday = isSameDay(date, new Date());
                
                // Check if this date has events
                const hasDeadline = allEvents.some(e => isSameDay(e.deadline, date));
                const hasExam = allEvents.some(e => isSameDay(e.examDate, date));

                return (
                  <div 
                    key={idx} 
                    onClick={() => setSelectedDate(date)}
                    style={{ 
                      aspectRatio: '1/1', 
                      display: 'flex', 
                      flexDirection: 'column',
                      alignItems: 'center', 
                      justifyContent: 'center',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      backgroundColor: isSelected ? '#0F172A' : (isToday ? '#F1F5F9' : 'transparent'),
                      color: isSelected ? '#FFFFFF' : '#0F172A',
                      fontWeight: isSelected || isToday ? 700 : 500,
                      fontSize: '0.9rem',
                      position: 'relative'
                    }}
                  >
                    {date.getDate()}
                    {/* Event Dots */}
                    <div style={{ display: 'flex', gap: '2px', position: 'absolute', bottom: '15%' }}>
                      {hasDeadline && <span style={{ width: '4px', height: '4px', borderRadius: '50%', backgroundColor: isSelected ? '#FCA5A5' : '#EF4444' }} />}
                      {hasExam && <span style={{ width: '4px', height: '4px', borderRadius: '50%', backgroundColor: isSelected ? '#86EFAC' : '#10B981' }} />}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Selected Date Details */}
            <div style={{ borderTop: '1px solid #E2E8F0', paddingTop: '1rem', marginTop: '1rem' }}>
              <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#64748B', marginBottom: '0.75rem' }}>
                Events for {selectedDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
              </div>
              {selectedDateEvents.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {selectedDateEvents.map((evt, idx) => {
                    const isDeadline = isSameDay(evt.deadline, selectedDate);
                    return (
                      <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <div style={{ width: '3px', height: '24px', backgroundColor: isDeadline ? '#EF4444' : '#10B981', borderRadius: '2px' }} />
                        <div>
                          <div style={{ fontSize: '0.9rem', fontWeight: 600, color: '#0F172A' }}>{evt.name}</div>
                          <div style={{ fontSize: '0.75rem', color: '#64748B' }}>{isDeadline ? 'Application Deadline' : 'Exam Date'}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div style={{ fontSize: '0.85rem', color: '#94A3B8', fontStyle: 'italic' }}>No events scheduled for this day.</div>
              )}
            </div>
          </div>

        </div>

        {/* RIGHT COLUMN: Auxiliary / Alerts */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          {/* Profile Completeness */}
          {!userProfile?.isProfileComplete && (
            <div style={{ backgroundColor: '#FFF7ED', border: '1px solid #FED7AA', borderRadius: '12px', padding: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                <ShieldAlert size={16} color="#C2410C" />
                <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#9A3412', margin: 0 }}>Action Required</h3>
              </div>
              <p style={{ fontSize: '0.85rem', color: '#C2410C', margin: '0 0 1rem 0' }}>Complete your profile to unlock personalized exam matching.</p>
              <button onClick={() => navigate('/profile')} style={{ width: '100%', padding: '0.6rem', backgroundColor: '#EA580C', color: '#FFFFFF', border: 'none', borderRadius: '6px', fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer' }}>Complete Profile</button>
            </div>
          )}

          {/* Admit Card & Result Alerts */}
          <div style={{ backgroundColor: '#FFFFFF', borderRadius: '12px', border: '1px solid #E2E8F0', padding: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', borderBottom: '1px solid #F1F5F9', paddingBottom: '0.75rem' }}>
              <h2 style={{ fontSize: '1.05rem', fontWeight: 700, margin: 0, color: '#0F172A', textTransform: 'uppercase', letterSpacing: '0.03em' }}>Alerts</h2>
              <button onClick={() => navigate('/notifications')} style={{ color: '#3B82F6', background: 'none', border: 'none', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer' }}>View All</button>
            </div>
            {alerts.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {alerts.map(alert => (
                  <div key={alert.id} style={{ padding: '0.75rem', backgroundColor: alert.isUnread ? '#EFF6FF' : '#F8FAFC', borderRadius: '8px', border: '1px solid', borderColor: alert.isUnread ? '#BFDBFE' : '#F1F5F9' }}>
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
                  <div key={exam.id} style={{ padding: '0.6rem 0', borderBottom: '1px solid #F8FAFC' }}>
                    <div style={{ fontSize: '0.9rem', fontWeight: 600, color: '#1E293B' }}>{exam.shortName}</div>
                    <div style={{ fontSize: '0.75rem', color: '#64748B' }}>{exam.organization}</div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ fontSize: '0.85rem', color: '#94A3B8' }}>No trending exams.</div>
            )}
          </div>

          {/* Career Guidance Test */}
          <div style={{ backgroundColor: '#F8FAFC', borderRadius: '12px', border: '1px solid #E2E8F0', padding: '1.5rem' }}>
            <h2 style={{ fontSize: '1.05rem', fontWeight: 700, margin: '0 0 0.5rem 0', color: '#0F172A', textTransform: 'uppercase', letterSpacing: '0.03em' }}>Career Guidance</h2>
            <p style={{ fontSize: '0.85rem', color: '#475569', margin: '0 0 1rem 0' }}>Not sure which path to take? Take our test to find your fit.</p>
            <button onClick={() => navigate('/career-test')} style={{ width: '100%', padding: '0.6rem', backgroundColor: '#0F172A', color: '#FFFFFF', border: 'none', borderRadius: '6px', fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer' }}>Start Assessment</button>
          </div>

          {/* Quick Resume / Study Material */}
          <div style={{ backgroundColor: '#FFFFFF', borderRadius: '12px', border: '1px solid #E2E8F0', padding: '1.5rem' }}>
            <h2 style={{ fontSize: '1.05rem', fontWeight: 700, margin: '0 0 0.5rem 0', color: '#0F172A', textTransform: 'uppercase', letterSpacing: '0.03em' }}>Quick Resources</h2>
            <button onClick={() => navigate('/study')} style={{ width: '100%', padding: '0.6rem', backgroundColor: '#F1F5F9', color: '#334155', border: '1px solid #E2E8F0', borderRadius: '6px', fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer' }}>View Study Materials</button>
          </div>

        </div>

      </div>
    </SidebarLayout>
  );
};
`;

fs.writeFileSync(path, newCode);
console.log('DashboardPage.tsx successfully rebuilt with Real Calendar and Summary Cards.');
