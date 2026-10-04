const fs = require('fs');
let content = fs.readFileSync('src/components/SidebarLayout.tsx', 'utf8');

const regex = /\{\/\*\s*Sign Out\s*\*\/\}\s*<div className="sidebar-signout"[^>]*>\s*<button/i;
const newSignoutArea = `{/* Refresh and Sign Out Area */}
        <div className="sidebar-signout" style={{ padding: '0.75rem', borderTop: '1px solid rgba(255,255,255,0.05)', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          
          <button
            onClick={handleRefresh}
            title={collapsed ? 'Refresh Dashboard' : undefined}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.8rem',
              padding: collapsed ? '0.75rem 0' : '0.75rem 1.25rem',
              borderRadius: '0px',
              border: 'none',
              cursor: 'pointer',
              backgroundColor: 'transparent',
              color: '#38BDF8',
              fontWeight: 500,
              fontSize: '0.9rem',
              width: '100%',
              justifyContent: collapsed ? 'center' : 'flex-start',
              transition: 'all 0.15s ease',
            }}
            onMouseEnter={e => { e.currentTarget.style.backgroundColor = 'rgba(56, 189, 248, 0.1)'; }}
            onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'transparent'; }}
          >
            <RefreshCw size={18} />
            {!collapsed && <span>Refresh Data</span>}
          </button>

          <button`;

if (regex.test(content)) {
  content = content.replace(regex, newSignoutArea);
  fs.writeFileSync('src/components/SidebarLayout.tsx', content, 'utf8');
  console.log("Regex match successful, patched file!");
} else {
  console.log("Regex STILL failed to match!");
}
