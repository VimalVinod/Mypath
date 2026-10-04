const fs = require('fs');
let content = fs.readFileSync('src/components/SidebarLayout.tsx', 'utf8');

// 1. Add RefreshCw to lucide-react imports
content = content.replace('LogOut, ChevronRight, Menu, X', 'LogOut, ChevronRight, Menu, X, RefreshCw');

// 2. Add handleRefresh inside the component
const insertAfter = `  const selectedAvatar = userProfile?.avatarUrl || '';`;
const refreshFunc = `

  const handleRefresh = async () => {
    alert("Your page will be refreshing in a couple of seconds...");
    try {
      // Hit the Vercel backend to force a sync
      await fetch("https://mypath-backend-two.vercel.app/match-user", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: currentUser?.uid })
      });
      // Force reload the dashboard
      window.location.reload();
    } catch (e) {
      console.error(e);
      window.location.reload();
    }
  };`;
content = content.replace(insertAfter, insertAfter + refreshFunc);

// 3. Add the Refresh button right above Sign Out
const signoutArea = `{/* Sign Out */}
        <div className="sidebar-signout" style={{ padding: '0.75rem', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
          <button`;

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

content = content.replace(signoutArea, newSignoutArea);

fs.writeFileSync('src/components/SidebarLayout.tsx', content, 'utf8');
console.log("Patched SidebarLayout.tsx!");
