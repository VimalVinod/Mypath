const fs = require('fs');
let lines = fs.readFileSync('src/components/SidebarLayout.tsx', 'utf8').split('\n');

// Find where sidebar-logo-area starts
const startIdx = lines.findIndex(l => l.includes('className="sidebar-logo-area"'));
const endIdx = lines.findIndex((l, i) => i > startIdx && l.includes('{/* User Avatar Block */}'));

// Replace everything between startIdx and endIdx with the correct block
const replacement = `      <div className="sidebar-logo-area" style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: collapsed ? 'center' : 'space-between',
        padding: '1.5rem 1.25rem 1rem',
        borderBottom: '1px solid rgba(255,255,255,0.05)',
      }}>
        {!collapsed && (
          <img src={logoImg} alt="MyPath" style={{ height: '56px', objectFit: 'contain' }} />
        )}
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
          </button>
          <button
            onClick={() => setCollapsed(c => !c)}
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
            onMouseEnter={e => { e.currentTarget.style.color = '#fff'; e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; }}
            onMouseLeave={e => { e.currentTarget.style.color = '#71717A'; e.currentTarget.style.background = 'transparent'; }}
          >
            {collapsed ? <ChevronRight size={17} /> : <Menu size={17} />}
          </button>
        </div>
      </div>
`;

lines.splice(startIdx, endIdx - startIdx, replacement);

fs.writeFileSync('src/components/SidebarLayout.tsx', lines.join('\n'), 'utf8');
console.log("Fixed syntax block!");
