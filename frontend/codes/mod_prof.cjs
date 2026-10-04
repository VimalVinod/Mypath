const fs = require('fs');
const path = 'C:/Users/sindh/Documents/codes/mypath/frontend/codes/src/pages/ProfilePage.tsx';
let c = fs.readFileSync(path, 'utf8');

c = c.replace(/const \{ currentUser, userProfile, updateUserProfile, navigate, logoutUser, deleteAccount \} = useApp\(\);/,
"const { currentUser, userProfile, updateUserProfile, navigate, logoutUser, deleteAccount, linkGoogleAccount, linkPasswordAccount } = useApp();\n  const [newPassword, setNewPassword] = useState('');");

const authSection = `
          {/* Section: Authentication Methods */}
          <section style={{ backgroundColor: '#FFFFFF', borderRadius: '12px', border: '1px solid #E2E8F0', padding: '2rem', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
            <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.15rem', fontWeight: 700, margin: 0, marginBottom: '1.5rem', color: '#0F172A', borderBottom: '1px solid #E2E8F0', paddingBottom: '1rem' }}>
              <ShieldAlert size={20} color="#10B981" /> Authentication Methods
            </h2>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
              
              {/* Google Link */}
              <div style={{ padding: '1rem', border: '1px solid #E2E8F0', borderRadius: '8px' }}>
                <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '0.5rem' }}>Google Sign-In</h3>
                {userProfile?.authProviders?.includes('google.com') ? (
                  <span style={{ display: 'inline-block', padding: '0.4rem 0.8rem', backgroundColor: '#F0FDF4', color: '#166534', borderRadius: '6px', fontSize: '0.85rem', fontWeight: 500 }}>✓ Connected</span>
                ) : (
                  <button type="button" onClick={linkGoogleAccount} style={{ padding: '0.5rem 1rem', backgroundColor: '#FFFFFF', color: '#334155', border: '1px solid #CBD5E1', borderRadius: '6px', fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" style={{ width: '16px', height: '16px' }} />
                    Link Google Account
                  </button>
                )}
              </div>

              {/* Password Link */}
              <div style={{ padding: '1rem', border: '1px solid #E2E8F0', borderRadius: '8px' }}>
                <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '0.5rem' }}>Email & Password</h3>
                {userProfile?.authProviders?.includes('password') ? (
                  <span style={{ display: 'inline-block', padding: '0.4rem 0.8rem', backgroundColor: '#F0FDF4', color: '#166534', borderRadius: '6px', fontSize: '0.85rem', fontWeight: 500 }}>✓ Connected</span>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    <input 
                      type="password" 
                      placeholder="Enter a new password" 
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      style={{ padding: '0.5rem', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '0.85rem' }} 
                    />
                    <button type="button" onClick={() => linkPasswordAccount(newPassword)} disabled={!newPassword || newPassword.length < 6} style={{ padding: '0.5rem 1rem', backgroundColor: '#0F172A', color: '#FFFFFF', border: 'none', borderRadius: '6px', fontWeight: 600, fontSize: '0.85rem', cursor: newPassword && newPassword.length >= 6 ? 'pointer' : 'not-allowed', opacity: newPassword && newPassword.length >= 6 ? 1 : 0.5 }}>
                      Set Password
                    </button>
                  </div>
                )}
              </div>

            </div>
          </section>
`;

c = c.replace(/\{\/\* Section 2: Address \*\/\}/, authSection + '\n          {/* Section 2: Address */}');

fs.writeFileSync(path, c);
console.log('ProfilePage updated');
