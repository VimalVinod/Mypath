const fs = require('fs');
let content = fs.readFileSync('src/components/SidebarLayout.tsx', 'utf8');

const regex = /\{!collapsed && \(\s*<img src=\{logoImg\}[^\n]*\n\s*\)\}\s*<button\s*onClick=\{\(\) => setCollapsed\(c => !c\)\}\s*style=\{\{/i;

const replacement = `{!collapsed && (
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

const contentRegex = regex.exec(content);
if (contentRegex) {
  content = content.replace(regex, replacement);
  content = content.replace(/\{collapsed \? <ChevronRight size=\{17\} \/> : <Menu size=\{17\} \/>\}\s*<\/button>/, `{collapsed ? <ChevronRight size={17} /> : <Menu size={17} />}\n            </button>\n          </div>`);
  fs.writeFileSync('src/components/SidebarLayout.tsx', content, 'utf8');
  console.log("Success");
} else {
  console.log("Still failed.");
}
