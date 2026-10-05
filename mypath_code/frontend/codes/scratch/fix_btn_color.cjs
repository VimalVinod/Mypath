const fs = require('fs');
const path = 'src/pages/LandingPage.tsx';
let code = fs.readFileSync(path, 'utf8');

const oldButton = `<button 
                onClick={() => navigate('/exams')}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', backgroundColor: '#000000', color: '#FFFFFF', padding: '0.75rem 1.5rem', fontSize: '1rem', fontWeight: 600, border: 'none', borderRadius: '8px', cursor: 'pointer' }}
              >`;

const newButton = `<button 
                onClick={() => navigate('/exams')}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', backgroundColor: '#FFFFFF', color: '#000000', padding: '0.75rem 1.5rem', fontSize: '1rem', fontWeight: 700, border: 'none', borderRadius: '8px', cursor: 'pointer' }}
              >`;

if (code.includes(oldButton)) {
  code = code.replace(oldButton, newButton);
  fs.writeFileSync(path, code);
  console.log('Fixed button color for black background.');
} else {
  console.log('Could not find black button block.');
}
