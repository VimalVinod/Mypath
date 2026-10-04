import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { SidebarLayout } from '../components/SidebarLayout';
import {
  Bell, BookOpen, Compass, TrendingUp, ChevronRight,
  GripVertical, Settings2, CalendarDays, Target, Flame,
  Clock4, CheckCircle, AlertCircle
} from 'lucide-react';

const getDaysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
const getFirstDayOfMonth = (year: number, month: number) => new Date(year, month, 1).getDay();
const isSameDay = (d1: Date, d2: Date) =>
  d1.getFullYear() === d2.getFullYear() && d1.getMonth() === d2.getMonth() && d1.getDate() === d2.getDate();

const ACCENT = '#4F46E5'; // single consistent accent â€” indigo

export const DashboardPage: React.FC = () => {
  const { currentUser, userProfile, navigate, trackerItems, exams, notifications } = useApp();

  const [calDate, setCalDate] = useState(new Date());
  const [selDate, setSelDate] = useState(new Date());
  const [widgetOrder, setWidgetOrder] = useState<string[]>(['alerts', 'trending', 'career', 'resources']);
  const [isEditing, setIsEditing] = useState(false);
  const [dragOver, setDragOver] = useState<string | null>(null);

  const displayName = userProfile?.accountName || currentUser?.displayName || currentUser?.email?.split('@')[0] || 'User';
  const firstName = displayName.split(' ')[0];

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  // Data
  const strictlyEligible = exams.filter(e => e.matchLevel === 'Eligible' && e.daysRemaining > 0);
  const maybeEligible = exams.filter(e => e.matchLevel === 'Probably Eligible' && e.daysRemaining > 0);
  const deadlines = trackerItems.filter(t => t.deadlineDate);
  const bookmarks = trackerItems.filter(t => t.status === 'Bookmarked');

  // ?????? Stat Cards ??????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????
  const stats = [
    { label: 'Eligible Exams', value: strictlyEligible.length, icon: Target, color: ACCENT, note: maybeEligible.length > 0 ? `+ ${maybeEligible.length} to verify` : 'you qualify for', onClick: () => navigate('/exams') },
    { label: 'Upcoming Deadlines', value: deadlines.length, icon: Clock4, color: '#DC2626', note: 'in the next 30 days', onClick: () => navigate('/tracker') },
    { label: 'Bookmarked', value: bookmarks.length, icon: BookOpen, color: '#059669', note: 'saved exams', onClick: () => navigate('/tracker') },
    { label: 'Unread Alerts', value: unreadCount, icon: Bell, color: '#D97706', note: 'notifications', onClick: () => navigate('/notifications') },
  ];

  // â”€â”€â”€ Widgets â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const widgetDefs: Record<string, { label: string; node: React.ReactNode }> = {
    alerts: {
      label: 'Alerts',
      node: (
        <div style={{ background: '#fff', border: '1px solid #E4E4E7', borderRadius: '16px', overflow: 'hidden' }}>
          {/* Header bar â€” single accent stripe */}
          <div style={{ background: ACCENT, padding: '1rem 1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Bell size={16} color="#fff" />
              <span style={{ fontWeight: 700, fontSize: '0.9rem', color: '#fff', letterSpacing: '0.04em', textTransform: 'uppercase' }}>Alerts</span>
              {unreadCount > 0 && (
                <span style={{ background: '#fff', color: ACCENT, fontSize: '0.7rem', fontWeight: 800, padding: '0.1rem 0.45rem', borderRadius: '20px', lineHeight: 1.5 }}>
                  {unreadCount} new
                </span>
              )}
            </div>
            <button onClick={() => navigate('/notifications')} style={{ color: 'rgba(255,255,255,0.8)', background: 'none', border: '1px solid rgba(255,255,255,0.3)', padding: '0.25rem 0.6rem', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer' }}>
              See all
            </button>
          </div>
          <div style={{ padding: '0.75rem' }}>
            {alerts.length > 0 ? alerts.map((a, i) => (
              <div key={a.id} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', padding: '0.75rem 0.5rem', borderBottom: i < alerts.length - 1 ? '1px solid #F4F4F5' : 'none' }}>
                <div style={{ flexShrink: 0, marginTop: '2px' }}>
                  {a.isUnread
                    ? <AlertCircle size={15} color="#DC2626" />
                    : <CheckCircle size={15} color="#A1A1AA" />}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: '0.5rem' }}>
                    <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#18181B', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{a.examName}</span>
                    {a.isUnread && <span style={{ flexShrink: 0, width: 7, height: 7, borderRadius: '50%', background: '#DC2626', display: 'inline-block' }} />}
                  </div>
                  <p style={{ margin: '0.15rem 0 0', fontSize: '0.78rem', color: '#52525B', lineHeight: 1.4 }}>{a.reason}</p>
                </div>
              </div>
            )) : (
              <div style={{ padding: '1.5rem', textAlign: 'center', color: '#A1A1AA', fontSize: '0.85rem' }}>No recent alerts.</div>
            )}
          </div>
        </div>
      )
    },

    trending: {
      label: 'Trending Exams',
      node: (
        <div style={{ background: '#fff', border: '1px solid #E4E4E7', borderRadius: '16px', overflow: 'hidden' }}>
          <div style={{ padding: '1rem 1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #F4F4F5' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Flame size={17} color="#F97316" />
              <span style={{ fontWeight: 700, fontSize: '0.9rem', color: '#18181B', letterSpacing: '0.01em' }}>Trending Exams</span>
            </div>
            <button onClick={() => navigate('/exams')} style={{ color: ACCENT, background: 'none', border: 'none', fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.15rem' }}>
              Explore <ChevronRight size={13} />
            </button>
          </div>
          <div style={{ padding: '0.5rem 0.75rem' }}>
            {trending.length > 0 ? trending.map((exam, i) => (
              <div key={exam.id} onClick={() => navigate('/exams')} style={{ display: 'flex', alignItems: 'center', gap: '0.875rem', padding: '0.7rem 0.5rem', borderBottom: i < trending.length - 1 ? '1px solid #F9FAFB' : 'none', cursor: 'pointer', borderRadius: '8px', transition: 'background 0.15s' }}
                onMouseEnter={e => e.currentTarget.style.background = '#F9FAFB'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                {/* Rank badge */}
                <div style={{ width: 28, height: 28, borderRadius: '8px', background: i === 0 ? '#FEF3C7' : i === 1 ? '#F1F5F9' : '#F9FAFB', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: 800, color: i === 0 ? '#D97706' : '#64748B' }}>#{i + 1}</span>
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '0.87rem', fontWeight: 700, color: '#111827', lineHeight: 1.2 }}>{exam.shortName}</div>
                  <div style={{ fontSize: '0.73rem', color: '#6B7280', marginTop: '0.15rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{exam.organization}</div>
                </div>
                <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  {exam.daysRemaining <= 30 && (
                    <span style={{ fontSize: '0.68rem', fontWeight: 700, color: '#DC2626', background: '#FEF2F2', padding: '0.15rem 0.45rem', borderRadius: '20px' }}>
                      {exam.daysRemaining}d left
                    </span>
                  )}
                  <ChevronRight size={14} color="#D1D5DB" />
                </div>
              </div>
            )) : (
              <div style={{ padding: '1.5rem', textAlign: 'center', color: '#A1A1AA', fontSize: '0.85rem' }}>No trending exams.</div>
            )}
          </div>
        </div>
      )
    },

    career: {
      label: 'Career Guidance',
      node: (
        <div style={{ background: '#0F0F23', borderRadius: '16px', padding: '1.5rem', position: 'relative', overflow: 'hidden' }}>
          {/* decorative bg shapes */}
          <div style={{ position: 'absolute', top: -30, right: -30, width: 130, height: 130, borderRadius: '50%', background: 'rgba(79,70,229,0.15)', pointerEvents: 'none' }} />
          <div style={{ position: 'absolute', bottom: -20, left: -20, width: 90, height: 90, borderRadius: '50%', background: 'rgba(99,102,241,0.1)', pointerEvents: 'none' }} />
          <div style={{ position: 'relative', zIndex: 1 }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', background: 'rgba(79,70,229,0.25)', padding: '0.25rem 0.6rem', borderRadius: '20px', marginBottom: '0.875rem' }}>
              <Compass size={13} color="#818CF8" />
              <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#818CF8', letterSpacing: '0.05em', textTransform: 'uppercase' }}>Career Test</span>
            </div>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#fff', margin: '0 0 0.5rem', lineHeight: 1.3 }}>
              Find your perfect<br />exam match
            </h3>
            <p style={{ fontSize: '0.82rem', color: '#9CA3AF', margin: '0 0 1.25rem', lineHeight: 1.5 }}>
              Take our 5-minute psychometric test to discover which government exams suit your skills and personality.
            </p>
            <button onClick={() => navigate('/career-test')} style={{ width: '100%', padding: '0.75rem', background: ACCENT, color: '#fff', border: 'none', borderRadius: '10px', fontWeight: 700, fontSize: '0.9rem', cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.4rem', letterSpacing: '0.01em' }}
              onMouseEnter={e => e.currentTarget.style.background = '#4338CA'}
              onMouseLeave={e => e.currentTarget.style.background = ACCENT}>
              Start Assessment â†’
            </button>
          </div>
        </div>
      )
    },

    resources: {
      label: 'Study Resources',
      node: (
        <div style={{ background: '#F9FAFB', border: '1px solid #E4E4E7', borderRadius: '16px', padding: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
            <BookOpen size={17} color="#059669" />
            <span style={{ fontWeight: 700, fontSize: '0.9rem', color: '#111827' }}>Study Resources</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {[
              { label: 'Syllabus & Pattern', desc: 'For your bookmarked exams', color: '#4F46E5', bg: '#EEF2FF' },
              { label: 'Previous Papers', desc: '10+ years of question banks', color: '#059669', bg: '#ECFDF5' },
              { label: 'Current Affairs', desc: 'Daily updates & notes', color: '#D97706', bg: '#FFFBEB' },
            ].map(item => (
              <button key={item.label} onClick={() => navigate('/materials')} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem', background: '#fff', border: '1px solid #E4E4E7', borderRadius: '10px', cursor: 'pointer', textAlign: 'left', width: '100%' }}
                onMouseEnter={e => e.currentTarget.style.borderColor = '#C7D2FE'}
                onMouseLeave={e => e.currentTarget.style.borderColor = '#E4E4E7'}>
                <div style={{ width: 36, height: 36, borderRadius: '8px', background: item.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <BookOpen size={16} color={item.color} />
                </div>
                <div>
                  <div style={{ fontSize: '0.83rem', fontWeight: 700, color: '#111827' }}>{item.label}</div>
                  <div style={{ fontSize: '0.73rem', color: '#6B7280' }}>{item.desc}</div>
                </div>
                <ChevronRight size={14} color="#D1D5DB" style={{ marginLeft: 'auto', flexShrink: 0 }} />
              </button>
            ))}
          </div>
        </div>
      )
    }
  };

  return (
    <SidebarLayout pageTitle="Dashboard" activeNav="dashboard">

      {/* â”€â”€ Header â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <div style={{ marginBottom: '1.75rem' }}>
        <p style={{ margin: 0, fontSize: '0.83rem', color: '#6B7280', fontWeight: 500 }}>{greeting} <span>&#128075;</span></p>
        <h1 style={{ margin: '0.15rem 0 0', fontSize: '1.6rem', fontWeight: 800, color: '#111827', letterSpacing: '-0.02em', lineHeight: 1.2 }}>{firstName}</h1>
      </div>

      {/* â”€â”€ Stat Cards â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <div className="dashboard-stats-row" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: '1rem', marginBottom: '1.75rem' }}>
        {stats.map(s => {
          const Icon = s.icon;
          return (
            <button key={s.label} onClick={s.onClick} style={{ all: 'unset', display: 'flex', flexDirection: 'column', gap: '0.6rem', background: '#fff', border: '1px solid #E4E4E7', borderRadius: '14px', padding: '1.25rem', cursor: 'pointer', boxShadow: '0 1px 2px rgba(0,0,0,0.04)', transition: 'box-shadow 0.15s' }}
              onMouseEnter={e => (e.currentTarget as HTMLElement).style.boxShadow = '0 4px 12px rgba(0,0,0,0.08)'}
              onMouseLeave={e => (e.currentTarget as HTMLElement).style.boxShadow = '0 1px 2px rgba(0,0,0,0.04)'}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ padding: '0.5rem', background: `${s.color}12`, borderRadius: '8px' }}>
                  <Icon size={18} color={s.color} />
                </div>
                <ChevronRight size={14} color="#D1D5DB" />
              </div>
              <div>
                <div style={{ fontSize: '2rem', fontWeight: 800, color: '#111827', lineHeight: 1 }}>{s.value}</div>
                <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#374151', marginTop: '0.2rem' }}>{s.label}</div>
                <div style={{ fontSize: '0.72rem', color: '#9CA3AF', marginTop: '0.1rem' }}>{s.note}</div>
              </div>
            </button>
          );
        })}
      </div>

      {/* â”€â”€ Main Grid â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <div className="dashboard-main-grid" style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.1fr) minmax(0, 0.9fr)', gap: '1.25rem', alignItems: 'start' }}>

        {/* LEFT: Calendar */}
        <div style={{ background: '#fff', border: '1px solid #E4E4E7', borderRadius: '16px', padding: '1.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
          {/* Cal header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
            <div>
              <div style={{ fontSize: '0.72rem', fontWeight: 600, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Exam Calendar</div>
              <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#111827', marginTop: '0.15rem' }}>
                {calDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
              </div>
            </div>
            <div style={{ display: 'flex', gap: '0.35rem' }}>
              {['<', '>'].map((sym, di) => (
                <button key={sym} onClick={di === 0 ? () => setCalDate(new Date(yr, mo - 1, 1)) : () => setCalDate(new Date(yr, mo + 1, 1))} style={{ width: 32, height: 32, borderRadius: '8px', border: '1px solid #E4E4E7', background: '#fff', cursor: 'pointer', fontSize: '1rem', fontWeight: 700, color: '#374151', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {sym}
                </button>
              ))}
            </div>
          </div>

          {/* Day headers */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '2px', marginBottom: '0.5rem' }}>
            {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(d => (
              <div key={d} style={{ textAlign: 'center', fontSize: '0.7rem', fontWeight: 700, color: '#9CA3AF', padding: '0.3rem 0' }}>{d}</div>
            ))}
          </div>

          {/* Days grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '2px' }}>
            {calDays.map((date, idx) => {
              if (!date) return <div key={`e-${idx}`} />;
              const isSel = isSameDay(date, selDate);
              const isTod = isSameDay(date, new Date());
              const hasDeadline = allEvents.some(e => isSameDay(e.deadline, date));
              const hasExam = allEvents.some(e => isSameDay(e.exam, date));
              return (
                <div key={idx} onClick={() => setSelDate(date)} style={{ aspectRatio: '1/1', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', borderRadius: '8px', cursor: 'pointer', background: isSel ? ACCENT : isTod ? '#EEF2FF' : 'transparent', color: isSel ? '#fff' : isTod ? ACCENT : '#374151', fontWeight: isTod || isSel ? 700 : 400, fontSize: '0.83rem', position: 'relative', transition: 'background 0.1s' }}
                  onMouseEnter={e => { if (!isSel) e.currentTarget.style.background = '#F3F4F6'; }}
                  onMouseLeave={e => { if (!isSel) e.currentTarget.style.background = isTod ? '#EEF2FF' : 'transparent'; }}>
                  {date.getDate()}
                  {(hasDeadline || hasExam) && (
                    <div style={{ display: 'flex', gap: '2px', position: 'absolute', bottom: 3 }}>
                      {hasDeadline && <span style={{ width: 4, height: 4, borderRadius: '50%', background: isSel ? 'rgba(255,255,255,0.6)' : '#DC2626' }} />}
                      {hasExam && <span style={{ width: 4, height: 4, borderRadius: '50%', background: isSel ? 'rgba(255,255,255,0.6)' : '#059669' }} />}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Legend */}
          <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem', paddingTop: '0.875rem', borderTop: '1px solid #F3F4F6' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#DC2626', display: 'inline-block' }} />
              <span style={{ fontSize: '0.72rem', color: '#6B7280' }}>Deadline</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#059669', display: 'inline-block' }} />
              <span style={{ fontSize: '0.72rem', color: '#6B7280' }}>Exam date</span>
            </div>
          </div>

          {/* Selected day events */}
          {selEvents.length > 0 && (
            <div style={{ marginTop: '0.875rem', paddingTop: '0.875rem', borderTop: '1px solid #F3F4F6' }}>
              <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>
                {selDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              </div>
              {selEvents.map((ev, i) => {
                const isDeadline = isSameDay(ev.deadline, selDate);
                return (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', padding: '0.6rem 0.75rem', background: '#F9FAFB', borderRadius: '8px', marginBottom: '0.35rem', borderLeft: `3px solid ${isDeadline ? '#DC2626' : '#059669'}` }}>
                    <div>
                      <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#111827' }}>{ev.name}</div>
                      <div style={{ fontSize: '0.72rem', color: '#6B7280' }}>{isDeadline ? 'Application deadline' : 'Exam date'}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* RIGHT: Reorderable Widgets */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {widgetOrder.map(id => {
            const def = widgetDefs[id];
            return (
              <div key={id} draggable={isEditing}
                onDragStart={e => onDragStart(e, id)}
                onDragOver={e => { e.preventDefault(); setDragOver(id); }}
                onDragLeave={() => setDragOver(null)}
                onDrop={e => onDrop(e, id)}
                style={{ position: 'relative', outline: dragOver === id ? `2px dashed ${ACCENT}` : 'none', borderRadius: '16px', transition: 'outline 0.1s' }}>
                {isEditing && (
                  <div style={{ position: 'absolute', top: '0.75rem', right: '0.75rem', zIndex: 20, display: 'flex', alignItems: 'center', gap: '0.35rem', background: '#fff', border: '1px solid #E4E4E7', borderRadius: '8px', padding: '0.25rem 0.5rem', cursor: 'grab', boxShadow: '0 2px 4px rgba(0,0,0,0.08)' }}>
                    <GripVertical size={14} color="#9CA3AF" />
                    <span style={{ fontSize: '0.7rem', fontWeight: 600, color: '#6B7280' }}>Drag</span>
                  </div>
                )}
                {def.node}
              </div>
            );
          })}
        </div>
      </div>

      {/* â”€â”€ Quick Actions Bar â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}


    </SidebarLayout>
  );
};

export default DashboardPage;


