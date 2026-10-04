const fs = require('fs');
let content = fs.readFileSync('src/components/SidebarLayout.tsx', 'utf8');

const regex = /\{\/\*\s*Sign Out Button\s*\*\/\}\s*<div style=\{\{ borderTop: '1px solid #E2E8F0', paddingTop: '1\.25rem', marginTop: '0\.5rem' \}\}>/i;

const newSignoutMobile = `{/* Refresh and Sign Out Button */}
          <div style={{ borderTop: '1px solid #E2E8F0', paddingTop: '1.25rem', marginTop: '0.5rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <button
              onClick={() => { setAccountTabOpen(false); handleRefresh(); }}
              style={{ width: '100%', padding: '0.85rem', backgroundColor: '#F0F9FF', color: '#0369A1', border: '1px solid #BAE6FD', borderRadius: '12px', fontWeight: 600, fontSize: '1rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
            >
              <RefreshCw size={18} />
              Refresh Dashboard
            </button>`;

if (regex.test(content)) {
  content = content.replace(regex, newSignoutMobile);
  fs.writeFileSync('src/components/SidebarLayout.tsx', content, 'utf8');
  console.log("Regex match successful, patched mobile!");
} else {
  console.log("Regex STILL failed to match for mobile!");
}
