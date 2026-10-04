const fs = require('fs');

const path = 'c:/Users/sindh/Documents/codes/mypath/frontend/codes/src/pages/LandingPage.tsx';
let code = fs.readFileSync(path, 'utf8');

// 1. Extract the Active Opportunities block
const activeOppRegex = /\{\/\* Active Opportunities Header moved above the banner \*\/\}\s*<div style=\{\{ backgroundColor: 'var\(--bg-subtle\)', borderBottom: '1px solid var\(--border\)' \}\}>([\s\S]*?)<\/div>\s*<\/div>\s*<\/div>/;
const match = code.match(activeOppRegex);

if (match) {
  const activeOppBlock = match[0];
  const innerContent = match[1];

  // We want to create two versions:
  const mobileBlock = `{/* Active Opportunities (Mobile Only - Above Banner) */}
        <div className="mobile-active-opps" style={{ backgroundColor: 'var(--bg-subtle)', borderBottom: '1px solid var(--border)' }}>${innerContent}</div>
          </div>
        </div>`;
        
  const desktopBlock = `{/* Active Opportunities (Desktop Only - Below Banner) */}
        <div className="desktop-active-opps" style={{ backgroundColor: 'var(--bg-subtle)', borderBottom: '1px solid var(--border)' }}>${innerContent}</div>
          </div>
        </div>`;

  // Remove the original block completely first
  code = code.replace(activeOppRegex, '');

  // Find where the Hero Section starts
  const heroSectionRegex = /\{\/\* Hero Section \*\/\}\s*<section/;
  
  // Insert mobileBlock BEFORE Hero Section
  code = code.replace(heroSectionRegex, `${mobileBlock}\n\n        {/* Hero Section */}\n        <section`);

  // Find where the Hero Section ends
  // It ends at </section> just before {/* Interactive Career Quiz Banner...
  const endOfHeroRegex = /<\/section>\s*\{\/\* Interactive Career Quiz Banner/;
  
  // Insert desktopBlock AFTER Hero Section
  code = code.replace(endOfHeroRegex, `</section>\n\n        ${desktopBlock}\n\n        {/* Interactive Career Quiz Banner`);
} else {
  console.log("Could not find Active Opportunities block.");
}

// 2. Fix the glowy effect and banner full screen on desktop
// The glow effect is: boxShadow: `0 -20px ...`
// We will change the style on the wrapper div
const wrapperRegex = /<div style=\{\{\s*position: 'relative',\s*width: 'calc\(100% - 1rem\)',\s*margin: '0 auto',\s*borderRadius: '24px',\s*boxShadow: `0 -20px 40px -10px \$\{shadowColors\[currentSlide\]\}, 0 20px 40px -10px \$\{shadowColors\[currentSlide\]\}`,\s*transition: 'box-shadow 0\.8s ease-in-out'\s*\}\}>/g;

const newWrapper = `<div 
            className="hero-banner-wrapper"
            style={{ 
              position: 'relative', 
              margin: '0 auto',
              transition: 'box-shadow 0.8s ease-in-out',
              '--dynamic-glow': shadowColors[currentSlide]
            } as React.CSSProperties}>`;
            
code = code.replace(wrapperRegex, newWrapper);

// 3. Fix the hero-banner-container itself
const containerRegex = /className="hero-banner-container"\s*style=\{\{\s*position: 'relative',\s*width: '100%',\s*margin: '0 auto',\s*overflow: 'hidden',\s*borderRadius: '24px',\s*cursor: 'pointer',\s*backgroundColor: '#000000'\s*\}\}/g;

const newContainer = `className="hero-banner-container"
              style={{ 
                position: 'relative',
                width: '100%',
                margin: '0 auto',
                overflow: 'hidden',
                cursor: 'pointer',
                backgroundColor: '#000000'
              }}`;

code = code.replace(containerRegex, newContainer);

fs.writeFileSync(path, code);
console.log('LandingPage.tsx processed successfully');
