const fs = require('fs');
const path = 'src/pages/LandingPage.tsx';
let code = fs.readFileSync(path, 'utf8');

const feature2Old = `{/* Feature 2: Application Tracking */}
      <section className="feature-section" style={{ backgroundColor: 'var(--bg-subtle)', borderTop: '1px solid var(--border)' }}>
        <div className="container feature-flex feature-reverse">
          <div className="feature-image-block">
            {/* Placeholder for future PNG image */}
            <div style={{ width: '100%', maxWidth: '450px', aspectRatio: '4/3', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFFFFF', borderRadius: '24px', border: '1px dashed var(--border)', color: '#A1A1AA', fontSize: '0.9rem' }}>
              [ Image Placeholder ]
            </div>
          </div>
          <div className="feature-text-block">
            <h2 className="feature-heading" style={{ color: '#09090B' }}>
              Track Everything in One Place.
            </h2>
            <p className="feature-description" style={{ color: '#52525B' }}>
              No more spreadsheets or scattered sticky notes. Keep track of your application statuses, admit card releases, and exam dates across dozens of organizations in a single, organized view.
            </p>
          </div>
        </div>
      </section>`;

const feature2New = `{/* Feature 2: Application Tracking (Dashboard Centered) */}
      <section className="feature-section" style={{ backgroundColor: 'var(--bg-subtle)', borderTop: '1px solid var(--border)', padding: '5rem 0' }}>
        <div className="container" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2.5rem' }}>
          
          <div style={{ width: '100%', maxWidth: '900px', margin: '0 auto', display: 'flex', justifyContent: 'center' }}>
            {/* Dashboard Placeholder - Landscape covering ~80% */}
            <div style={{ width: '100%', aspectRatio: '16/9', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFFFFF', borderRadius: '24px', border: '1px dashed var(--border)', color: '#A1A1AA', fontSize: '1.25rem', fontWeight: 600, boxShadow: '0 20px 40px -10px rgba(0,0,0,0.05)' }}>
              [ Dashboard Image Placeholder ]
            </div>
          </div>
          
          <div className="feature-text-block" style={{ textAlign: 'center', maxWidth: '700px', margin: '0 auto' }}>
            <h2 className="feature-heading" style={{ color: '#09090B', margin: '0 auto 1rem auto' }}>
              Track Everything in One Place.
            </h2>
            <p className="feature-description" style={{ color: '#52525B', margin: '0 auto' }}>
              No more spreadsheets or scattered sticky notes. Keep track of your application statuses, admit card releases, and exam dates across dozens of organizations in a single, organized view.
            </p>
          </div>

        </div>
      </section>`;

if (code.includes(feature2Old)) {
  code = code.replace(feature2Old, feature2New);
  fs.writeFileSync(path, code);
  console.log('Feature 2 restructured successfully.');
} else {
  console.log('Feature 2 exact text not found.');
}
