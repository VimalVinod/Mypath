import React from 'react';
import { useApp } from '../context/AppContext';
import { SidebarLayout } from '../components/SidebarLayout';
import { Bell, CheckCheck, AlertCircle, CheckCircle, Clock } from 'lucide-react';

const timeAgo = (iso: string): string => {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
};

export const NotificationsPage: React.FC = () => {
  const { notifications, markNotificationRead, unreadNotificationCount } = useApp();

  const markAllRead = () => {
    notifications.filter(n => n.isUnread).forEach(n => markNotificationRead(n.id));
  };

  const unread = notifications.filter(n => n.isUnread);
  const read = notifications.filter(n => !n.isUnread);

  return (
    <SidebarLayout pageTitle="Notifications" activeNav="notifications">

      {/* Header row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 800, color: '#111827' }}>Notifications</h1>
          <p style={{ margin: '0.2rem 0 0', fontSize: '0.85rem', color: '#6B7280' }}>
            {unreadNotificationCount > 0 ? `${unreadNotificationCount} unread` : 'All caught up!'}
          </p>
        </div>
        {unreadNotificationCount > 0 && (
          <button
            onClick={markAllRead}
            style={{
              display: 'flex', alignItems: 'center', gap: '0.4rem',
              padding: '0.45rem 0.9rem', background: '#fff',
              border: '1px solid #D1D5DB', borderRadius: '8px',
              fontSize: '0.82rem', fontWeight: 600, color: '#374151', cursor: 'pointer',
            }}
          >
            <CheckCheck size={15} />
            Mark all read
          </button>
        )}
      </div>

      {notifications.length === 0 ? (
        <div style={{ background: '#fff', borderRadius: '14px', border: '1px solid #E4E4E7', padding: '4rem 2rem', textAlign: 'center' }}>
          <div style={{ width: 56, height: 56, background: '#EEF2FF', borderRadius: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem' }}>
            <Bell size={26} color="#4F46E5" />
          </div>
          <h2 style={{ color: '#111827', fontSize: '1.1rem', fontWeight: 700, marginBottom: '0.4rem' }}>No notifications yet</h2>
          <p style={{ color: '#6B7280', fontSize: '0.88rem' }}>You'll get notified about deadlines, results, and updates here.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

          {/* Unread Section */}
          {unread.length > 0 && (
            <div>
              <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.6rem' }}>
                New — {unread.length}
              </div>
              <div style={{ background: '#fff', borderRadius: '14px', border: '1px solid #E4E4E7', overflow: 'hidden' }}>
                {unread.map((n, i) => (
                  <div
                    key={n.id}
                    onClick={() => markNotificationRead(n.id)}
                    style={{
                      display: 'flex', alignItems: 'flex-start', gap: '0.875rem',
                      padding: '1rem 1.25rem',
                      borderBottom: i < unread.length - 1 ? '1px solid #F3F4F6' : 'none',
                      background: '#FAFAFF', cursor: 'pointer',
                      transition: 'background 0.15s',
                    }}
                    onMouseEnter={e => (e.currentTarget.style.background = '#F0F0FF')}
                    onMouseLeave={e => (e.currentTarget.style.background = '#FAFAFF')}
                  >
                    {/* Icon */}
                    <div style={{ width: 38, height: 38, borderRadius: '10px', background: '#EEF2FF', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <AlertCircle size={18} color="#4F46E5" />
                    </div>
                    {/* Content */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem' }}>
                        <span style={{ fontWeight: 700, fontSize: '0.88rem', color: '#111827' }}>{n.examName}</span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', flexShrink: 0 }}>
                          <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#4F46E5' }} />
                          <span style={{ fontSize: '0.72rem', color: '#9CA3AF', whiteSpace: 'nowrap' }}>
                            <Clock size={11} style={{ display: 'inline', marginRight: 2 }} />{timeAgo(n.timestamp)}
                          </span>
                        </div>
                      </div>
                      <p style={{ margin: '0.2rem 0 0', fontSize: '0.83rem', color: '#374151', lineHeight: 1.5 }}>{n.reason}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Read Section */}
          {read.length > 0 && (
            <div>
              <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.6rem' }}>
                Earlier
              </div>
              <div style={{ background: '#fff', borderRadius: '14px', border: '1px solid #E4E4E7', overflow: 'hidden' }}>
                {read.map((n, i) => (
                  <div
                    key={n.id}
                    style={{
                      display: 'flex', alignItems: 'flex-start', gap: '0.875rem',
                      padding: '1rem 1.25rem',
                      borderBottom: i < read.length - 1 ? '1px solid #F3F4F6' : 'none',
                    }}
                  >
                    {/* Icon */}
                    <div style={{ width: 38, height: 38, borderRadius: '10px', background: '#F9FAFB', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <CheckCircle size={18} color="#9CA3AF" />
                    </div>
                    {/* Content */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem' }}>
                        <span style={{ fontWeight: 600, fontSize: '0.88rem', color: '#374151' }}>{n.examName}</span>
                        <span style={{ fontSize: '0.72rem', color: '#9CA3AF', whiteSpace: 'nowrap', flexShrink: 0 }}>
                          <Clock size={11} style={{ display: 'inline', marginRight: 2 }} />{timeAgo(n.timestamp)}
                        </span>
                      </div>
                      <p style={{ margin: '0.2rem 0 0', fontSize: '0.83rem', color: '#6B7280', lineHeight: 1.5 }}>{n.reason}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>
      )}
    </SidebarLayout>
  );
};
