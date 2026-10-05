const fs = require('fs');
const path = 'src/pages/DashboardPage.tsx';

const newCode = `import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { SidebarLayout } from '../components/SidebarLayout';
import { ShieldAlert, BookOpen, Compass, ArrowRight } from 'lucide-react';

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
    days.push(null);
  }
  for (let i = 1; i <= daysInMonth; i++) {
    days.push(new Date(currentYear, currentMonth, i));
  }

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
        {/* Ongoing Exams Card - Subtle Blue Tint */}
        <div style={{ backgroundColor: '#F8FAFC', borderRadius: '12px', border: '1px solid #E2E8F0', padding: '1.75rem 1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
          <div>
            <div style={{ fontSize: '2.5rem', fontWeight: 800, color: '#0F172A', lineHeight: 1 }}>{ongoingExams.length}</div>
            <div style={{ fontSize: '0.9rem', fontWeight: 600, color: '#475569', marginTop: '0.5rem' }}>Ongoing Exams</div>
          </div>
          <button onClick={() => navigate('/exams')} style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', padding: '0.5rem 1rem', borderRadius: '6px', fontSize: '0.8rem', fontWeight: 600, color: '#334155', cursor: 'pointer', boxShadow: '0 1px 2px rgba(0,0,0,0.02)' }}>View All</button>
        </div>

        {/* Upcoming Deadlines Card - Subtle Red/Orange Tint */}
        <div style={{ backgroundColor: '#FFFDF9', borderRadius: '12px', border: '1px solid #FEF3C7', padding: '1.75rem 1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
          <div>
            <div style={{ fontSize: '2.5rem', fontWeight: 800, color: '#0F172A', lineHeight: 1 }}>{upcomingDeadlines.length + 2}</div>
            <div style={{ fontSize: '0.9rem', fontWeight: 600, color: '#475569', marginTop: '0.5rem' }}>Upcoming Deadlines</div>
          </div>
          <button onClick={() => navigate('/tracker')} style={{ background: '#FFFFFF', border: '1px solid #FDE68A', padding: '0.5rem 1rem', borderRadius: '6px', fontSize: '0.8rem', fontWeight: 600, color: '#334155', cursor: 'pointer', boxShadow: '0 1px 2px rgba(0,0,0,0.02)' }}>View All</button>
        </div>

        {/* Bookmarks Card - Subtle Green Tint (Brand Color Aligned) */}
        <div style={{ backgroundColor: '#F0FDF4', borderRadius: '12px', border: '1px solid #DCFCE7', padding: '1.75rem 1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
          <div>
            <div style={{ fontSize: '2.5rem', fontWeight: 800, color: '#166534', lineHeight: 1 }}>{bookmarkedExams.length || 3}</div>
            <div style={{ fontSize: '0.9rem', fontWeight: 600, color: '#15803D', marginTop: '0.5rem' }}>Saved Bookmarks</div>
          </div>
          <button onClick={() => navigate('/tracker')} style={{ background: '#FFFFFF', border: '1px solid #BBF7D0', padding: '0.5rem 1rem', borderRadius: '6px', fontSize: '0.8rem', fontWeight: 600, color: '#166534', cursor: 'pointer', boxShadow: '0 1px 2px rgba(0,0,0,0.02)' }}>View All</button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '1.5rem', alignItems: 'start' }}>
        
        {/* LEFT COLUMN: Main Tracking & Calendar */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          {/* REAL CALENDAR WIDGET */}
          <div style={{ backgroundColor: '#FFFFFF', borderRadius: '14px', border: '1px solid #E2E8F0', padding: '2rem', boxShadow: '0 4px 12px rgba(0,0,0,0.03)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0, color: '#0F172A', textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                {currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
              </h2>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button onClick={prevMonth} style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '6px', padding: '0.4rem 0.8rem', cursor: 'pointer', fontWeight: 600, color: '#475569' }}>&lt;</button>
                <button onClick={nextMonth} style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '6px', padding: '0.4rem 0.8rem', cursor: 'pointer', fontWeight: 600, color: '#475569' }}>&gt;</button>
              </div>
            </div>

            {/* Calendar Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '0.5rem', textAlign: 'center', marginBottom: '1.5rem' }}>
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                <div key={day} style={{ fontSize: '0.75rem', fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', paddingBottom: '0.5rem' }}>{day}</div>
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
                      borderRadius: '10px',
                      cursor: 'pointer',
                      backgroundColor: isSelected ? '#059669' : (isToday ? '#F0FDF4' : 'transparent'),
                      color: isSelected ? '#FFFFFF' : (isToday ? '#059669' : '#1E293B'),
                      fontWeight: isSelected || isToday ? 800 : 500,
                      fontSize: '1rem',
                      position: 'relative',
                      border: isToday && !isSelected ? '1px solid #86EFAC' : '1px solid transparent',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    {date.getDate()}
                    {/* Event Dots */}
                    <div style={{ display: 'flex', gap: '3px', position: 'absolute', bottom: '15%' }}>
                      {hasDeadline && <span style={{ width: '5px', height: '5px', borderRadius: '50%', backgroundColor: isSelected ? '#FFFFFF' : '#EF4444' }} />}
                      {hasExam && <span style={{ width: '5px', height: '5px', borderRadius: '50%', backgroundColor: isSelected ? '#FFFFFF' : '#3B82F6' }} />}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Selected Date Details - Soft tinted background */}
            <div style={{ backgroundColor: '#F8FAFC', borderRadius: '10px', padding: '1.25rem', border: '1px solid #F1F5F9' }}>
              <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#64748B', marginBottom: '1rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Events for {selectedDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
              </div>
              {selectedDateEvents.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {selectedDateEvents.map((evt, idx) => {
                    const isDeadline = isSameDay(evt.deadline, selectedDate);
                    return (
                      <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '1rem', backgroundColor: '#FFFFFF', padding: '1rem', borderRadius: '8px', borderLeft: \`4px solid \${isDeadline ? '#EF4444' : '#3B82F6'}\`, boxShadow: '0 1px 2px rgba(0,0,0,0.02)' }}>
                        <div>
                          <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#0F172A' }}>{evt.name}</div>
                          <div style={{ fontSize: '0.8rem', color: '#64748B', marginTop: '0.1rem' }}>{isDeadline ? 'Application Deadline' : 'Exam Date'}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div style={{ fontSize: '0.9rem', color: '#94A3B8', fontStyle: 'italic', textAlign: 'center', padding: '1rem 0' }}>No events scheduled for this day.</div>
              )}
            </div>
          </div>

        </div>

        {/* RIGHT COLUMN: Auxiliary / Alerts */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          {/* Admit Card & Result Alerts */}
          <div style={{ backgroundColor: '#FFFFFF', borderRadius: '12px', border: '1px solid #E2E8F0', padding: '1.5rem', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', borderBottom: '1px solid #F1F5F9', paddingBottom: '0.75rem' }}>
              <h2 style={{ fontSize: '1.05rem', fontWeight: 700, margin: 0, color: '#0F172A', textTransform: 'uppercase', letterSpacing: '0.03em' }}>Alerts</h2>
              <button onClick={() => navigate('/notifications')} style={{ color: '#059669', background: 'none', border: 'none', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer' }}>View All</button>
            </div>
            {alerts.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {alerts.map(alert => (
                  <div key={alert.id} style={{ padding: '0.85rem', backgroundColor: alert.isUnread ? '#F0FDF4' : '#F8FAFC', borderRadius: '8px', border: '1px solid', borderColor: alert.isUnread ? '#DCFCE7' : '#F1F5F9' }}>
                    <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#0F172A', marginBottom: '0.2rem' }}>{alert.examName}</div>
                    <div style={{ fontSize: '0.8rem', color: '#475569' }}>{alert.reason}</div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ fontSize: '0.85rem', color: '#94A3B8' }}>No recent alerts.</div>
            )}
          </div>

          {/* Trending / Popular Exams */}
          <div style={{ backgroundColor: '#FFFFFF', borderRadius: '12px', border: '1px solid #E2E8F0', padding: '1.5rem', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', borderBottom: '1px solid #F1F5F9', paddingBottom: '0.75rem' }}>
              <h2 style={{ fontSize: '1.05rem', fontWeight: 700, margin: 0, color: '#0F172A', textTransform: 'uppercase', letterSpacing: '0.03em' }}>Trending Exams</h2>
              <button onClick={() => navigate('/exams')} style={{ color: '#059669', background: 'none', border: 'none', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer' }}>View All</button>
            </div>
            {trendingExams.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {trendingExams.map(exam => (
                  <div key={exam.id} style={{ padding: '0.75rem 0', borderBottom: '1px solid #F1F5F9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontSize: '0.9rem', fontWeight: 600, color: '#0F172A' }}>{exam.shortName}</div>
                      <div style={{ fontSize: '0.75rem', color: '#64748B' }}>{exam.organization}</div>
                    </div>
                    <ArrowRight size={14} color="#94A3B8" />
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ fontSize: '0.85rem', color: '#94A3B8' }}>No trending exams.</div>
            )}
          </div>

          {/* Combined: Career Guidance & Resources (Much larger and more prominent) */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1rem' }}>
            
            {/* Career Guidance - Highlighted with Brand Green Tint */}
            <div style={{ backgroundColor: '#059669', borderRadius: '12px', padding: '2rem 1.5rem', color: '#FFFFFF', boxShadow: '0 4px 12px rgba(5, 150, 105, 0.2)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
                <Compass size={24} color="#A7F3D0" />
                <h2 style={{ fontSize: '1.15rem', fontWeight: 800, margin: 0, textTransform: 'uppercase', letterSpacing: '0.03em' }}>Career Guidance</h2>
              </div>
              <p style={{ fontSize: '0.9rem', color: '#D1FAE5', margin: '0 0 1.5rem 0', lineHeight: 1.5 }}>
                Not sure which path to take? Take our detailed psychometric test to find your perfect fit in just 5 minutes.
              </p>
              <button onClick={() => navigate('/career-test')} style={{ width: '100%', padding: '0.85rem', backgroundColor: '#FFFFFF', color: '#059669', border: 'none', borderRadius: '8px', fontWeight: 700, fontSize: '0.9rem', cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem' }}>
                Start Assessment <ArrowRight size={16} />
              </button>
            </div>

            {/* Quick Resources - Solid Neutral Dark */}
            <div style={{ backgroundColor: '#0F172A', borderRadius: '12px', padding: '2rem 1.5rem', color: '#FFFFFF', boxShadow: '0 4px 12px rgba(15, 23, 42, 0.2)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
                <BookOpen size={24} color="#94A3B8" />
                <h2 style={{ fontSize: '1.15rem', fontWeight: 800, margin: 0, textTransform: 'uppercase', letterSpacing: '0.03em' }}>Quick Resources</h2>
              </div>
              <p style={{ fontSize: '0.9rem', color: '#94A3B8', margin: '0 0 1.5rem 0', lineHeight: 1.5 }}>
                Access customized syllabus and premium study materials curated for your bookmarked exams.
              </p>
              <button onClick={() => navigate('/study')} style={{ width: '100%', padding: '0.85rem', backgroundColor: '#1E293B', color: '#FFFFFF', border: '1px solid #334155', borderRadius: '8px', fontWeight: 700, fontSize: '0.9rem', cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem' }}>
                View Materials <ArrowRight size={16} />
              </button>
            </div>

          </div>

        </div>

      </div>
    </SidebarLayout>
  );
};
`;

fs.writeFileSync(path, newCode);
console.log('DashboardPage.tsx successfully styled with neutral shades, brand green, and larger auxiliary boxes.');
