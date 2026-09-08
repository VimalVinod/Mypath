import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Navbar } from '../components/Navbar';
import { Footer } from '../components/Footer';
import { LogOut, Trash2, User } from 'lucide-react';

export const ProfilePage: React.FC = () => {
  const { currentUser, userProfile, logoutUser, deleteAccount, navigate } = useApp();
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<boolean>(false);

  const displayName =
    userProfile?.name ||
    currentUser?.displayName ||
    userProfile?.username ||
    currentUser?.email?.split('@')[0] ||
    'User';

  const handleSignOut = async () => {
    await logoutUser();
  };

  const handleDeleteAccount = async () => {
    setIsDeleting(true);
    setDeleteError(null);
    try {
      await deleteAccount();
    } catch (err: any) {
      let msg = err?.message || 'Failed to delete account.';
      if (
        err?.code === 'auth/requires-recent-login' ||
        (err?.message && (
          err.message.includes('requires recent authentication') ||
          err.message.includes('sensitive and requires recent')
        ))
      ) {
        msg = 'This operation requires recent authentication. Please re-login before deleting your account.';
      }
      setDeleteError(msg);
      setShowDeleteConfirm(false);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: 'var(--bg-subtle)' }}>
      <Navbar />

      <main style={{ flex: 1, maxWidth: '800px', width: '100%', margin: '0 auto', padding: '2rem 1.5rem' }}>
        <div style={{ marginBottom: '2rem' }}>
          <h1 style={{ 
            fontSize: '1.75rem', 
            fontWeight: 800, 
            fontFamily: 'var(--font-heading)', 
            color: 'var(--text-primary)',
            marginBottom: '0.25rem'
          }}>
            My Profile
          </h1>
          <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
            Manage your account settings and preferences.
          </p>
        </div>

        {/* Profile Card */}
        <div style={{
          backgroundColor: '#FFFFFF',
          borderRadius: 'var(--radius-card)',
          border: '1.5px solid var(--border)',
          padding: '2rem',
          marginBottom: '2rem'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', marginBottom: '2rem' }}>
            <div style={{
              width: '64px',
              height: '64px',
              borderRadius: '50%',
              backgroundColor: '#09090B',
              color: '#FFFFFF',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 700,
              fontSize: '1.5rem',
              fontFamily: 'var(--font-heading)',
            }}>
              {displayName.charAt(0).toUpperCase()}
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: '1.25rem' }}>{displayName}</div>
              <div style={{ color: 'var(--text-secondary)' }}>{currentUser?.email || ''}</div>
              {userProfile?.username && (
                <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                  @{userProfile.username}
                </div>
              )}
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', borderTop: '1px solid var(--border)', paddingTop: '2rem' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '0.5rem' }}>Account Actions</h3>
            
            {deleteError && (
              <div
                role="alert"
                style={{
                  backgroundColor: 'var(--error-bg)',
                  border: '1px solid var(--error)',
                  color: 'var(--error)',
                  padding: '0.65rem 0.85rem',
                  borderRadius: '6px',
                  marginBottom: '1rem',
                  fontSize: '0.8rem',
                }}
              >
                {deleteError}
              </div>
            )}

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem' }}>
              <button
                onClick={handleSignOut}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.6rem',
                  padding: '0.75rem 1.25rem',
                  backgroundColor: '#FFFFFF',
                  border: '1.5px solid var(--border)',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '0.9rem',
                  fontWeight: 600,
                  color: 'var(--text-primary)',
                  transition: 'background-color 0.15s',
                }}
                onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'var(--bg-subtle)')}
                onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}
              >
                <LogOut size={18} />
                Sign Out
              </button>

              {!showDeleteConfirm ? (
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.6rem',
                    padding: '0.75rem 1.25rem',
                    backgroundColor: '#FFFFFF',
                    border: '1.5px solid var(--error-bg)',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '0.9rem',
                    fontWeight: 600,
                    color: 'var(--error)',
                    transition: 'background-color 0.15s',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'var(--error-bg)')}
                  onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}
                >
                  <Trash2 size={18} />
                  Delete Account
                </button>
              ) : (
                <div style={{
                  padding: '1rem',
                  backgroundColor: 'var(--error-bg)',
                  borderRadius: '6px',
                  border: '1px solid var(--error)',
                  width: '100%'
                }}>
                  <p style={{ fontSize: '0.9rem', color: 'var(--error)', fontWeight: 600, marginBottom: '0.75rem' }}>
                    Are you sure? This permanently deletes your account and all data.
                  </p>
                  <div style={{ display: 'flex', gap: '0.75rem' }}>
                    <button
                      onClick={handleDeleteAccount}
                      disabled={isDeleting}
                      style={{
                        padding: '0.6rem 1.25rem',
                        backgroundColor: 'var(--error)',
                        color: '#FFFFFF',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: isDeleting ? 'not-allowed' : 'pointer',
                        fontSize: '0.85rem',
                        fontWeight: 700,
                      }}
                    >
                      {isDeleting ? 'Deleting...' : 'Yes, Delete Account'}
                    </button>
                    <button
                      onClick={() => setShowDeleteConfirm(false)}
                      style={{
                        padding: '0.6rem 1.25rem',
                        backgroundColor: 'transparent',
                        color: 'var(--text-primary)',
                        border: '1px solid var(--border)',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontSize: '0.85rem',
                        fontWeight: 600,
                      }}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default ProfilePage;
