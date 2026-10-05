const fs = require('fs');

const path = 'src/components/SidebarLayout.tsx';
let code = fs.readFileSync(path, 'utf8');

// 1. Ensure useApp imports the auth methods and BookOpen is imported
if (!code.includes('linkGoogleAccount')) {
  code = code.replace(
    /const \{ navigate, userProfile, currentUser, logoutUser, unreadNotificationCount \} = useApp\(\);/,
    `const { navigate, userProfile, currentUser, logoutUser, unreadNotificationCount, updateUserProfile, linkGoogleAccount, linkPasswordAccount } = useApp();`
  );
}
if (!code.includes('BookOpen')) {
  code = code.replace(
    /LayoutDashboard, Search, ListChecks, User, Bell,/,
    `LayoutDashboard, Search, ListChecks, User, Bell, BookOpen,`
  );
}

// 2. Add states
if (!code.includes('accountTabOpen')) {
  code = code.replace(
    /const \[collapsed, setCollapsed\] = useState\(false\);/,
    `const [collapsed, setCollapsed] = useState(false);\n  const [accountTabOpen, setAccountTabOpen] = useState(false);\n  const [newPassword, setNewPassword] = useState('');\n  const [pickerOpen, setPickerOpen] = useState(false);`
  );
}

// 3. Add getAvatarColor if missing
const avatarColorCode = `
// Avatar color palette
const AVATAR_COLORS = [
  { bg: '#3B82F6', text: '#FFFFFF' }, // Blue
  { bg: '#EF4444', text: '#FFFFFF' }, // Red
  { bg: '#10B981', text: '#FFFFFF' }, // Emerald
  { bg: '#F59E0B', text: '#FFFFFF' }, // Amber
  { bg: '#8B5CF6', text: '#FFFFFF' }, // Purple
  { bg: '#EC4899', text: '#FFFFFF' }, // Pink
  { bg: '#06B6D4', text: '#FFFFFF' }, // Cyan
  { bg: '#F97316', text: '#FFFFFF' }  // Orange
];

const getAvatarColor = (name: string) => {
  if (!name) return AVATAR_COLORS[0].bg;
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length].bg;
};
`;
if (!code.includes('getAvatarColor')) {
  code = code.replace(
    /interface SidebarLayoutProps \{/,
    avatarColorCode + '\ninterface SidebarLayoutProps {'
  );
}

// 4. Update types and Nav items
code = code.replace(
  /activeNav: 'dashboard' \| 'exams' \| 'tracker' \| 'profile' \| 'notifications';/,
  `activeNav: 'dashboard' | 'exams' | 'tracker' | 'materials' | 'profile' | 'notifications';`
);

if (!code.includes("path: '/materials'")) {
  code = code.replace(
    /\{ key: 'tracker',       label: 'My Tracker',   icon: ListChecks,      path: '\/tracker' \},/,
    `{ key: 'tracker',       label: 'My Tracker',   icon: ListChecks,      path: '/tracker' },\n  { key: 'materials',     label: 'Study Materials', icon: BookOpen,      path: '/materials' },`
  );
}

// 5. Replace User Avatar Block with the collapsing version
const oldAvatarRegex = /\{\/\* User Avatar Block \*\/\}.*?\{\/\* Navigation \*\/\}/s;
const newAvatarArea = `{/* User Avatar Block */}
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: collapsed ? '1.5rem 0.75rem' : '1.5rem 1.25rem',
        borderBottom: '1px solid rgba(255,255,255,0.05)',
        gap: '0.6rem',
        transition: 'all 0.3s ease'
      }}>
        <div 
          onClick={() => {
            if (window.innerWidth <= 768) {
              setAccountTabOpen(true);
            }
          }}
          style={{ position: 'relative', display: 'inline-block', cursor: 'pointer' }}
        >
          <div style={{
            width: collapsed ? '44px' : '80px',
            height: collapsed ? '44px' : '80px',
            borderRadius: '50%',
            background: getAvatarColor(displayName),
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: collapsed ? '1.1rem' : '1.5rem',
            fontWeight: 700,
            color: '#fff',
            flexShrink: 0,
            overflow: 'hidden',
            transition: 'all 0.3s ease'
          }}>
            {userProfile?.avatarUrl ? (
              <img
                src={userProfile.avatarUrl}
                alt="Profile"
                style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }}
              />
            ) : (
              initials
            )}
          </div>
        </div>
        {!collapsed && (
          <div style={{ minWidth: 0, marginTop: '0.2rem', textAlign: 'center' }}>
            <div style={{ fontWeight: 600, color: '#F4F4F5', fontSize: '1rem', lineHeight: 1.3, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '180px' }}>
              {displayName}
            </div>
            {/* Pencil button is removed completely as per user request */}
          </div>
        )}
      </div>

      {/* Navigation */}`;

if (code.match(oldAvatarRegex)) {
  code = code.replace(oldAvatarRegex, newAvatarArea);
}

// 6. Add popup modal at the end before </div> } )
const popupCode = `
      {/* Mobile Account / Auth Popup Modal */}
      {accountTabOpen && (
        <div
          className="mobile-only profile-picker-overlay"
          onClick={() => setAccountTabOpen(false)}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 100,
            background: 'rgba(0,0,0,0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1rem'
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              width: '100%',
              maxWidth: '450px',
              maxHeight: '90vh',
              overflowY: 'auto',
              background: '#FFFFFF',
              borderRadius: '24px',
              padding: '1.5rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '1.5rem',
              color: '#0F172A',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
            }}
          >
            {/* Header with Back and Close */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <button onClick={() => setAccountTabOpen(false)} style={{ background: 'transparent', border: 'none', color: '#64748B', padding: '0.5rem', cursor: 'pointer', display: 'flex' }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
              </button>
              <span style={{ fontWeight: 700, fontSize: '1.1rem', color: '#0F172A' }}>Account & Auth</span>
              <button onClick={() => setAccountTabOpen(false)} style={{ background: 'transparent', border: 'none', color: '#64748B', padding: '0.5rem', cursor: 'pointer', display: 'flex' }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
              </button>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
              <div style={{ position: 'relative' }}>
                <div style={{
                  width: '64px',
                  height: '64px',
                  borderRadius: '50%',
                  background: getAvatarColor(displayName),
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '1.25rem',
                  fontWeight: 700,
                  overflow: 'hidden',
                  color: '#FFFFFF'
                }}>
                  {userProfile?.avatarUrl ? <img src={userProfile.avatarUrl} style={{width:'100%', height:'100%', objectFit:'cover'}} /> : initials}
                </div>
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 700, color: '#0F172A', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{displayName}</h3>
                <p style={{ margin: '0.2rem 0 0 0', color: '#64748B', fontSize: '0.9rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{userProfile?.email || currentUser?.email || 'No email connected'}</p>
              </div>
            </div>
            
            <div style={{ borderTop: '1px solid #E2E8F0', paddingTop: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <h4 style={{ margin: '0', color: '#475569', fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>Authentication Methods</h4>
              
              {/* Google Auth Block */}
              <div style={{ padding: '1rem', background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '12px' }}>
                <h3 style={{ fontSize: '1rem', fontWeight: 600, color: '#0F172A', marginBottom: '0.75rem', marginTop: 0 }}>Google Sign-In</h3>
                {userProfile?.authProviders?.includes('google.com') ? (
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '0.4rem 0.8rem', backgroundColor: '#F0FDF4', color: '#166534', borderRadius: '6px', fontSize: '0.85rem', fontWeight: 600 }}>
                    ✔ Connected
                  </div>
                ) : (
                  <button type="button" onClick={linkGoogleAccount} style={{ padding: '0.6rem 1rem', width: '100%', backgroundColor: '#FFFFFF', color: '#334155', border: '1px solid #CBD5E1', borderRadius: '8px', fontWeight: 600, fontSize: '0.9rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                    <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" style={{ width: '18px', height: '18px' }} />
                    Link Google Account
                  </button>
                )}
              </div>

              {/* Password Auth Block */}
              <div style={{ padding: '1rem', background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '12px' }}>
                <h3 style={{ fontSize: '1rem', fontWeight: 600, color: '#0F172A', marginBottom: '0.75rem', marginTop: 0 }}>Email & Password</h3>
                {userProfile?.authProviders?.includes('password') ? (
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '0.4rem 0.8rem', backgroundColor: '#F0FDF4', color: '#166534', borderRadius: '6px', fontSize: '0.85rem', fontWeight: 600 }}>
                    ✔ Connected
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    <input 
                      type="password" 
                      placeholder="Enter a new password" 
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      style={{ padding: '0.7rem', borderRadius: '8px', border: '1px solid #CBD5E1', backgroundColor: '#FFFFFF', color: '#0F172A', fontSize: '0.9rem' }} 
                    />
                    {newPassword.length > 0 && newPassword.length < 6 && (
                      <span style={{ fontSize: '0.75rem', color: '#EF4444' }}>Minimum 6 characters required</span>
                    )}
                    <button type="button" onClick={() => linkPasswordAccount(newPassword)} disabled={!newPassword || newPassword.length < 6} style={{ padding: '0.7rem 1rem', backgroundColor: '#0F172A', color: '#FFFFFF', border: 'none', borderRadius: '8px', fontWeight: 600, fontSize: '0.9rem', cursor: newPassword && newPassword.length >= 6 ? 'pointer' : 'not-allowed', opacity: newPassword && newPassword.length >= 6 ? 1 : 0.5 }}>
                      Set Password
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Sign Out Button */}
            <div style={{ borderTop: '1px solid #E2E8F0', paddingTop: '1.25rem', marginTop: '0.5rem' }}>
              <button
                onClick={() => {
                  setAccountTabOpen(false);
                  logoutUser();
                }}
                style={{
                  width: '100%',
                  padding: '0.85rem',
                  backgroundColor: '#FEF2F2',
                  color: '#DC2626',
                  border: '1px solid #FECACA',
                  borderRadius: '12px',
                  fontWeight: 600,
                  fontSize: '1rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem',
                  transition: 'background-color 0.2s'
                }}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>
                Sign Out
              </button>
            </div>
            
          </div>
        </div>
      )}
`;

if (!code.includes('Mobile Account / Auth Popup Modal')) {
  code = code.replace(
    /<\/aside>/,
    popupCode + '\n      </aside>'
  );
}

fs.writeFileSync(path, code);
console.log('SidebarLayout successfully rebuilt from scratch backups with all final changes!');
