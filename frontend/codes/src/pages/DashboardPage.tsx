import React, { useState } from 'react';
import { useApp } from '../context/AppContext';

export const DashboardPage: React.FC = () => {
  const { currentUser, userProfile, logoutUser, deleteAccount } = useApp();
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);

  const displayName =
    userProfile?.name ||
    currentUser?.displayName ||
    userProfile?.username ||
    currentUser?.email ||
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
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#F8FAFC',
        padding: '2rem',
      }}
    >
      <div
        className="card"
        style={{
          maxWidth: '520px',
          width: '100%',
          padding: '2.5rem',
          backgroundColor: '#FFFFFF',
          borderRadius: '12px',
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
          border: '1px solid #E2E8F0',
          textAlign: 'center',
        }}
      >
        <h1
          style={{
            fontSize: '1.75rem',
            fontWeight: 700,
            marginBottom: '1.5rem',
            color: '#0F172A',
          }}
        >
          Logged in as: {displayName}
        </h1>

        {deleteError && (
          <div
            role="alert"
            style={{
              backgroundColor: '#FEF2F2',
              border: '1px solid #F87171',
              color: '#DC2626',
              padding: '0.85rem 1rem',
              borderRadius: '8px',
              marginBottom: '1.5rem',
              fontSize: '0.9rem',
              textAlign: 'left',
            }}
          >
            {deleteError}
          </div>
        )}

        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={handleSignOut}
            style={{
              padding: '0.75rem 1.5rem',
              fontWeight: 600,
              cursor: 'pointer',
              borderRadius: '6px',
              border: '1px solid #CBD5E1',
              backgroundColor: '#F1F5F9',
              color: '#334155',
            }}
          >
            Sign Out
          </button>
          <button
            type="button"
            className="btn btn-danger"
            disabled={isDeleting}
            onClick={handleDeleteAccount}
            style={{
              padding: '0.75rem 1.5rem',
              fontWeight: 600,
              cursor: isDeleting ? 'not-allowed' : 'pointer',
              borderRadius: '6px',
              border: 'none',
              backgroundColor: '#DC2626',
              color: '#FFFFFF',
            }}
          >
            {isDeleting ? 'Deleting...' : 'Delete Account'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;
