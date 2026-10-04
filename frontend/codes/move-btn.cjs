const fs = require('fs');
let content = fs.readFileSync('src/components/SidebarLayout.tsx', 'utf8');

// 1. Revert desktop signout
const desktopRegex = /\{\/\*\s*Refresh and Sign Out Area\s*\*\/\}[\s\S]*?(<button\s*onClick=\{logoutUser\})/;
content = content.replace(desktopRegex, `{/* Sign Out */}
        <div className="sidebar-signout" style={{ padding: '0.75rem', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
          $1`);

// 2. Revert mobile signout
const mobileRegex = /\{\/\*\s*Refresh and Sign Out Button\s*\*\/\}[\s\S]*?(<button\s*onClick=\{\(\) => \{\s*setAccountTabOpen\(false\);\s*logoutUser\(\);\s*\}\})/;
content = content.replace(mobileRegex, `{/* Sign Out Button */}
          <div style={{ borderTop: '1px solid #E2E8F0', paddingTop: '1.25rem', marginTop: '0.5rem' }}>
            $1`);

// 3. Inject new small button in sidebar-logo-area
const topMenuRegex = /(<div className="sidebar-logo-area"[^>]*>[\s\S]*?\{!collapsed && \([\s\S]*?<img src=\{logoImg\}[^>]*>[\s\S]*?\}\))(\s*<button\s*onClick=\{\(\) => setCollapsed\(c => !c\)\})/;
const newTopMenu = `$1
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
            <button
              onClick={handleRefresh}
              title="Refresh Data"
              style={{
                background: 'transparent',
                border: 'none',
                borderRadius: '8px',
                padding: '0.4rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                color: '#71717A',
                transition: 'color 0.15s, background 0.15s',
              }}
              onMouseEnter={e => { e.currentTarget.style.color = '#38BDF8'; e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; }}
              onMouseLeave={e => { e.currentTarget.style.color = '#71717A'; e.currentTarget.style.background = 'transparent'; }}
            >
              <RefreshCw size={17} />
            </button>$2`;

if (topMenuRegex.test(content)) {
  content = content.replace(topMenuRegex, newTopMenu);
} else {
  console.log("Failed to match top menu regex!");
}

// Don't forget to close the div for the gap flex box
const topMenuCloseRegex = /(<Menu size=\{17\} \/>\}\s*<\/button>)/;
content = content.replace(topMenuCloseRegex, `$1\n          </div>`);


fs.writeFileSync('src/components/SidebarLayout.tsx', content, 'utf8');
console.log("Moved refresh button!");
