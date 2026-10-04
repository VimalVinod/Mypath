import React from 'react';
import { useApp } from '../context/AppContext';
import { SidebarLayout } from '../components/SidebarLayout';
import { Bell, BellOff } from 'lucide-react';

export const NotificationsPage: React.FC = () => {
  const { notifications, markNotificationRead } = useApp();
  const unread = notifications.filter(n => n.isUnread);
  const read = notifications.filter(n => !n.isUnread);

  return (
    <SidebarLayout pageTitle="Notifications" activeNav="notifications">
      <div style={{ maxWidth: '720px' }}>

        {notifications.length === 0 ? (
          <div style={{
            backgroundColor: '#FFFFFF',
            borderRadius: '14px',
            border: '1px solid #E2E8F0',
            padding: '4rem 2rem',
            textAlign: 'center',
            boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
          }}>
            <div style={{ width: '56px', height: '56px', backgroundColor: '#FFF7ED', borderRadius: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem' }}>
              <BellOff size={26} color="#F59E0B" />
            </div>
            <h2 style={{ color: '#0F172A', marginBottom: '0.5rem', fontSize: '1.15rem', fontWeight: 700 }}>You're all caught up!</h2>
            <p style={{ color: '#64748B', fontSize: '0.9rem', margin: 0 }}>No notifications at this time. We'll let you know when new exams are added.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {unread.length > 0 && (
              <div>
                <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748B', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '0.75rem' }}>New</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {unread.map(n => (
                    <div key={n.id} onClick={() => markNotificationRead(n.id)} style={{ backgroundColor: '#F0FDF4', borderRadius: '12px', border: '1px solid #BBF7D0', padding: '1rem 1.25rem', cursor: 'pointer', display: 'flex', gap: '0.875rem', alignItems: 'flex-start' }}>
                      <div style={{ padding: '0.4rem', backgroundColor: '#6B8E23', borderRadius: '8px', flexShrink: 0 }}>
                        <Bell size={15} color="#fff" />
                      </div>
                      <div>
                        <div style={{ fontWeight: 600, color: '#0F172A', fontSize: '0.9rem' }}>{n.examName}</div>
                        <div style={{ fontSize: '0.82rem', color: '#475569', marginTop: '0.2rem' }}>{n.reason}</div>
                        <div style={{ fontSize: '0.75rem', color: '#94A3B8', marginTop: '0.25rem' }}>{n.timestamp}</div>
                      </div>
                      <span style={{ marginLeft: 'auto', width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#6B8E23', flexShrink: 0, marginTop: '0.25rem' }} />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {read.length > 0 && (
              <div>
                <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748B', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '0.75rem' }}>Earlier</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {read.map(n => (
                    <div key={n.id} style={{ backgroundColor: '#FFFFFF', borderRadius: '12px', border: '1px solid #E2E8F0', padding: '1rem 1.25rem', display: 'flex', gap: '0.875rem', alignItems: 'flex-start' }}>
                      <div style={{ padding: '0.4rem', backgroundColor: '#F1F5F9', borderRadius: '8px', flexShrink: 0 }}>
                        <Bell size={15} color="#94A3B8" />
                      </div>
                      <div>
                        <div style={{ fontWeight: 600, color: '#334155', fontSize: '0.9rem' }}>{n.examName}</div>
                        <div style={{ fontSize: '0.82rem', color: '#64748B', marginTop: '0.2rem' }}>{n.reason}</div>
                        <div style={{ fontSize: '0.75rem', color: '#94A3B8', marginTop: '0.25rem' }}>{n.timestamp}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </SidebarLayout>
  );
};

export default NotificationsPage;
