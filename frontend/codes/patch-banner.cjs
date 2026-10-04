const fs = require('fs');
let content = fs.readFileSync('src/pages/DashboardPage.tsx', 'utf8');

const regex = /<SidebarLayout pageTitle="Dashboard" activeNav="dashboard">/;
const replacement = `<SidebarLayout pageTitle="Dashboard" activeNav="dashboard">

      {!userProfile?.isProfileComplete && (
        <div style={{
          backgroundColor: '#EFF6FF',
          border: '1px solid #BFDBFE',
          borderRadius: '12px',
          padding: '1.25rem',
          marginBottom: '1.75rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <div>
            <h3 style={{ margin: 0, color: '#1E3A8A', fontSize: '1.05rem', fontWeight: 600 }}>Action Required: Complete your profile</h3>
            <p style={{ margin: '0.25rem 0 0', color: '#1E40AF', fontSize: '0.9rem' }}>Fill in your details to see exams matched to your eligibility.</p>
          </div>
          <button 
            onClick={() => navigate('/profile')}
            style={{ backgroundColor: '#2563EB', color: '#fff', border: 'none', padding: '0.6rem 1.25rem', borderRadius: '8px', fontWeight: 600, cursor: 'pointer' }}
          >
            Complete Profile
          </button>
        </div>
      )}`;

content = content.replace(regex, replacement);
fs.writeFileSync('src/pages/DashboardPage.tsx', content, 'utf8');
console.log("Injected profile banner!");
