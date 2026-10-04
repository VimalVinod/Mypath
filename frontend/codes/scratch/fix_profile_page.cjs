const fs = require('fs');

const path = 'src/pages/ProfilePage.tsx';
let code = fs.readFileSync(path, 'utf8');

const missingHeader = `          {/* Section 2: Address */}
          <section className="profile-form-section" style={{ backgroundColor: '#FFFFFF', borderRadius: '12px', border: '1px solid #E2E8F0', padding: '2rem', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
            <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.05rem', fontWeight: 700, borderBottom: '1px solid #E2E8F0', paddingBottom: '1rem', marginBottom: '1.5rem', color: '#0F172A' }}>
              <MapPin size={18} color="#10B981" /> Address & Domicile
            </h2>
            <div className="profile-form-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#475569', marginBottom: '0.5rem' }}>State *</label>`;

code = code.replace(
  /            <div className="profile-form-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1\.5rem', marginBottom: '1\.5rem' }}>\s*<div>\s*<label style={{ display: 'block', fontSize: '0\.85rem', fontWeight: 600, color: '#475569', marginBottom: '0\.5rem' }}>State \*/,
  missingHeader
);

fs.writeFileSync(path, code);
console.log('Restored Section 2 Address Header in ProfilePage');
