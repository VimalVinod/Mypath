const fs = require('fs');
let content = fs.readFileSync('src/components/SidebarLayout.tsx', 'utf8');

// The exact string to replace:
const targetString = `          {!collapsed && (
            <img src={logoImg} alt="MyPath" style={{ height: '56px', objectFit: 'contain' }} />
          )}
          <button
            onClick={() => setCollapsed(c => !c)}
            style={{`;

const replacementString = `          {!collapsed && (
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
              style={{`;

// Replace using literal string replacement but handling windows newlines
let normalizedContent = content.replace(/\r\n/g, '\n');
let normalizedTarget = targetString.replace(/\r\n/g, '\n');

if (normalizedContent.includes(normalizedTarget)) {
  normalizedContent = normalizedContent.replace(normalizedTarget, replacementString);
  // Also fix the closing div!
  normalizedContent = normalizedContent.replace(/<Menu size=\{17\} \/>\}\s*<\/button>/, `<Menu size={17} />}\n            </button>\n          </div>`);
  fs.writeFileSync('src/components/SidebarLayout.tsx', normalizedContent, 'utf8');
  console.log("Replaced successfully!");
} else {
  console.log("Could not find target string.");
}

