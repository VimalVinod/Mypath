const fs = require('fs');

const layoutPath = 'src/components/SidebarLayout.tsx';
let layoutCode = fs.readFileSync(layoutPath, 'utf8');

// The profile block starts at: {/* User Avatar Block — always centered */}
// and ends after the `{!collapsed && (...)}` block which contains {displayName}
// We want to replace this whole block to have conditional sizing and no pencil button.

const profileRegex = /\{\/\* User Avatar Block — always centered \*\/\}([\s\S]*?)<\/div>\s*\}\)\s*<\/div>/;

const newProfileBlock = `{/* User Avatar Block — always centered */}
      <div className="sidebar-profile-area" style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: collapsed ? '1.5rem 0.75rem' : '1.5rem 1.25rem',
        borderBottom: '1px solid rgba(255,255,255,0.05)',
        gap: '0.6rem',
      }}>
        {/* Avatar without pencil button */}
        <div style={{ position: 'relative', display: 'inline-block' }}>
          <div style={{
            width: collapsed ? '44px' : '80px',
            height: collapsed ? '44px' : '80px',
            borderRadius: '50%',
            background: avatarUrl ? 'transparent' : getAvatarColor(displayName),
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
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt="Profile"
                style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }}
              />
            ) : (
              initials
            )}
          </div>
        </div>

        {/* Name only — no email */}
        {!collapsed && (
          <div style={{ minWidth: 0, marginTop: '0.2rem', textAlign: 'center' }}>
            <div style={{ fontWeight: 600, color: '#F4F4F5', fontSize: '1rem', lineHeight: 1.3, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '180px' }}>
              {displayName}
            </div>
          </div>
        )}
      </div>`;

if(layoutCode.match(profileRegex)) {
    layoutCode = layoutCode.replace(profileRegex, newProfileBlock);
    fs.writeFileSync(layoutPath, layoutCode);
    console.log("SidebarLayout updated.");
} else {
    console.log("Regex for SidebarLayout didn't match.");
}


const cssPath = 'src/styles/responsive.css';
let cssCode = fs.readFileSync(cssPath, 'utf8');

// We need to increase the active opportunities tab size for PC version.
// On PC, it uses .desktop-active-opps. Let's add some extra styling for it globally (which affects PC).
if(!cssCode.includes('.desktop-active-opps .container')) {
  const pcActiveOppsStyles = `
/* Enhance PC Active Opportunities section */
.desktop-active-opps .container {
  padding: 2.5rem 0 !important;
}
.desktop-active-opps h2 {
  font-size: 1.75rem !important;
  margin-top: 0.5rem !important;
}
.desktop-active-opps span {
  font-size: 0.8rem !important;
}
.desktop-active-opps button {
  padding: 0.6rem 1rem !important;
  font-size: 0.9rem !important;
}
`;
  cssCode = cssCode.replace('  .desktop-active-opps {', pcActiveOppsStyles + '\\n  .desktop-active-opps {');
  fs.writeFileSync(cssPath, cssCode);
  console.log("responsive.css updated for PC active opps.");
} else {
  console.log("PC active opps CSS already updated.");
}
