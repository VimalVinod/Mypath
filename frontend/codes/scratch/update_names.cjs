const fs = require('fs');

// 1. types/index.ts
const typesPath = 'src/types/index.ts';
let typesCode = fs.readFileSync(typesPath, 'utf8');
typesCode = typesCode.replace(/fathersName: string;\s*mothersName: string;/g, 'accountName?: string;');
fs.writeFileSync(typesPath, typesCode);
console.log('Updated types/index.ts');

// 2. context/AppContext.tsx
const appCtxPath = 'src/context/AppContext.tsx';
let appCtxCode = fs.readFileSync(appCtxPath, 'utf8');
appCtxCode = appCtxCode.replace(/fathersName: '',\s*mothersName: '',/g, "accountName: '',");
fs.writeFileSync(appCtxPath, appCtxCode);
console.log('Updated context/AppContext.tsx');

// 3. pages/ProfilePage.tsx
// (Already removed fathersName/mothersName UI from ProfilePage? No, I only removed Auth block.)
// Let's remove fathersName and mothersName inputs from ProfilePage.
const profilePath = 'src/pages/ProfilePage.tsx';
let profileCode = fs.readFileSync(profilePath, 'utf8');

// We know what the fields look like from earlier.
const fatherRegex = /<div>\s*<label[^>]*>Father's Name<\/label>\s*<input[^>]*name="fathersName"[^>]*\/>\s*<\/div>/g;
const motherRegex = /<div>\s*<label[^>]*>Mother's Name<\/label>\s*<input[^>]*name="mothersName"[^>]*\/>\s*<\/div>/g;

profileCode = profileCode.replace(fatherRegex, '');
profileCode = profileCode.replace(motherRegex, '');

fs.writeFileSync(profilePath, profileCode);
console.log('Updated pages/ProfilePage.tsx');

// 4. components/SidebarLayout.tsx
const sidebarPath = 'src/components/SidebarLayout.tsx';
let sidebarCode = fs.readFileSync(sidebarPath, 'utf8');

// Change displayName logic
sidebarCode = sidebarCode.replace(
  /const displayName = userProfile\?\.name \|\| currentUser\?\.displayName \|\| currentUser\?\.email\?\.split\('@'\)\[0\] \|\| 'User';/g,
  "const displayName = userProfile?.accountName || currentUser?.displayName || currentUser?.email?.split('@')[0] || 'User';"
);

// We need state for editing account name inside the popup
if (!sidebarCode.includes('editAccountName')) {
  sidebarCode = sidebarCode.replace(
    /const \[newPassword, setNewPassword\] = useState\(''\);/,
    `const [newPassword, setNewPassword] = useState('');\n  const [editAccountName, setEditAccountName] = useState('');`
  );
  
  // When opening the modal, set editAccountName to current displayName
  sidebarCode = sidebarCode.replace(
    /setAccountTabOpen\(true\)/g,
    `{ setAccountTabOpen(true); setEditAccountName(userProfile?.accountName || currentUser?.displayName || currentUser?.email?.split('@')[0] || 'User'); }`
  );
}

// Add Account Name edit box in the modal
// Looking for: <h4 style={{ margin: '0', color: '#475569', fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>Authentication Methods</h4>
const authHeader = `<h4 style={{ margin: '0', color: '#475569', fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>Authentication Methods</h4>`;
const accountNameSection = `
              {/* Edit Account Name Section */}
              <div style={{ padding: '1rem', background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '12px', marginBottom: '0.5rem' }}>
                <h4 style={{ margin: '0 0 0.75rem 0', color: '#0F172A', fontSize: '1rem', fontWeight: 600 }}>Account Display Name</h4>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <input 
                    type="text" 
                    value={editAccountName}
                    onChange={(e) => setEditAccountName(e.target.value)}
                    placeholder="Enter account name"
                    style={{ flex: 1, padding: '0.6rem', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '0.9rem' }} 
                  />
                  <button 
                    type="button" 
                    onClick={() => {
                      if (updateUserProfile) updateUserProfile({ accountName: editAccountName });
                    }}
                    style={{ padding: '0.6rem 1rem', backgroundColor: '#10B981', color: '#FFFFFF', border: 'none', borderRadius: '8px', fontWeight: 600, fontSize: '0.9rem', cursor: 'pointer' }}
                  >
                    Save
                  </button>
                </div>
              </div>
              
              ` + authHeader;

if (!sidebarCode.includes('Account Display Name')) {
  sidebarCode = sidebarCode.replace(authHeader, accountNameSection);
}

fs.writeFileSync(sidebarPath, sidebarCode);
console.log('Updated components/SidebarLayout.tsx');

