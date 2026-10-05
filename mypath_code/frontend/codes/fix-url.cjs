const fs = require('fs');

const files = [
  'src/components/SidebarLayout.tsx',
  'src/context/AppContext.tsx'
];

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  content = content.replace(/mypath-backend-two\.vercel\.app/g, 'mypath-hub.vercel.app');
  fs.writeFileSync(file, content, 'utf8');
});
console.log("Replaced wrong URL!");
