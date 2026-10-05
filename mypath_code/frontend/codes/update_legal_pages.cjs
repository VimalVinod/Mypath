const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, 'src', 'pages');

const privacyContent = `import React from 'react';
import { Navbar } from '../components/Navbar';
import { Footer } from '../components/Footer';

export const PrivacyPolicyPage: React.FC = () => {
  return (
    <div style={{ backgroundColor: 'var(--bg-canvas)', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Navbar />
      <main className="container" style={{ flex: 1, padding: '4rem 0', maxWidth: '800px' }}>
        <h1 style={{ marginBottom: '2rem' }}>Privacy Policy</h1>
        <div style={{ lineHeight: '1.6', color: 'var(--text-secondary)' }}>
          <p><strong>Last Updated:</strong> {new Date().toLocaleDateString()}</p>
          
          <h2 style={{ marginTop: '2rem', marginBottom: '1rem', color: 'var(--text-primary)' }}>1. Introduction</h2>
          <p>Welcome to MyPath ("we," "our," or "us"). We respect your privacy and are committed to protecting your personal data. This privacy policy will inform you as to how we look after your personal data when you visit our website and tell you about your privacy rights and how the law protects you.</p>

          <h2 style={{ marginTop: '2rem', marginBottom: '1rem', color: 'var(--text-primary)' }}>2. The Data We Collect About You</h2>
          <p>Personal data, or personal information, means any information about an individual from which that person can be identified. We may collect, use, store and transfer different kinds of personal data about you which we have grouped together as follows:</p>
          <ul style={{ marginLeft: '1.5rem', marginTop: '0.5rem', marginBottom: '1rem' }}>
            <li><strong>Identity Data:</strong> includes first name, last name, username or similar identifier, and date of birth.</li>
            <li><strong>Contact Data:</strong> includes billing address, delivery address, email address and telephone numbers.</li>
            <li><strong>Technical Data:</strong> includes internet protocol (IP) address, your login data, browser type and version, time zone setting and location, browser plug-in types and versions, operating system and platform, and other technology on the devices you use to access this website.</li>
            <li><strong>Profile Data:</strong> includes your username and password, educational background, exam preferences, interests, preferences, feedback and survey responses.</li>
            <li><strong>Usage Data:</strong> includes information about how you use our website and services.</li>
          </ul>

          <h2 style={{ marginTop: '2rem', marginBottom: '1rem', color: 'var(--text-primary)' }}>3. How We Use Your Personal Data</h2>
          <p>We will only use your personal data when the law allows us to. Most commonly, we will use your personal data in the following circumstances:</p>
          <ul style={{ marginLeft: '1.5rem', marginTop: '0.5rem', marginBottom: '1rem' }}>
            <li>Where we need to perform the contract we are about to enter into or have entered into with you.</li>
            <li>Where it is necessary for our legitimate interests (or those of a third party) and your interests and fundamental rights do not override those interests.</li>
            <li>Where we need to comply with a legal obligation.</li>
          </ul>

          <h2 style={{ marginTop: '2rem', marginBottom: '1rem', color: 'var(--text-primary)' }}>4. Data Security</h2>
          <p>We have put in place appropriate security measures to prevent your personal data from being accidentally lost, used or accessed in an unauthorized way, altered or disclosed. In addition, we limit access to your personal data to those employees, agents, contractors and other third parties who have a business need to know. They will only process your personal data on our instructions and they are subject to a duty of confidentiality.</p>

          <h2 style={{ marginTop: '2rem', marginBottom: '1rem', color: 'var(--text-primary)' }}>5. Your Legal Rights</h2>
          <p>Under certain circumstances, you have rights under data protection laws in relation to your personal data, including the right to request access, correction, erasure, restriction, transfer, to object to processing, to portability of data and (where the lawful ground of processing is consent) to withdraw consent.</p>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default PrivacyPolicyPage;
`;

const termsContent = `import React from 'react';
import { Navbar } from '../components/Navbar';
import { Footer } from '../components/Footer';

export const TermsPage: React.FC = () => {
  return (
    <div style={{ backgroundColor: 'var(--bg-canvas)', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Navbar />
      <main className="container" style={{ flex: 1, padding: '4rem 0', maxWidth: '800px' }}>
        <h1 style={{ marginBottom: '2rem' }}>Terms and Conditions</h1>
        <div style={{ lineHeight: '1.6', color: 'var(--text-secondary)' }}>
          <p><strong>Last Updated:</strong> {new Date().toLocaleDateString()}</p>
          
          <h2 style={{ marginTop: '2rem', marginBottom: '1rem', color: 'var(--text-primary)' }}>1. Agreement to Terms</h2>
          <p>These Terms and Conditions constitute a legally binding agreement made between you, whether personally or on behalf of an entity ("you") and MyPath ("we," "us" or "our"), concerning your access to and use of our website as well as any other media form, media channel, mobile website or mobile application related, linked, or otherwise connected thereto.</p>
          
          <h2 style={{ marginTop: '2rem', marginBottom: '1rem', color: 'var(--text-primary)' }}>2. Intellectual Property Rights</h2>
          <p>Unless otherwise indicated, the Site is our proprietary property and all source code, databases, functionality, software, website designs, audio, video, text, photographs, and graphics on the Site (collectively, the "Content") and the trademarks, service marks, and logos contained therein (the "Marks") are owned or controlled by us or licensed to us, and are protected by copyright and trademark laws and various other intellectual property rights and unfair competition laws.</p>
          
          <h2 style={{ marginTop: '2rem', marginBottom: '1rem', color: 'var(--text-primary)' }}>3. User Representations</h2>
          <p>By using the Site, you represent and warrant that: (1) all registration information you submit will be true, accurate, current, and complete; (2) you will maintain the accuracy of such information and promptly update such registration information as necessary; (3) you have the legal capacity and you agree to comply with these Terms and Conditions; (4) you will not access the Site through automated or non-human means, whether through a bot, script, or otherwise.</p>
          
          <h2 style={{ marginTop: '2rem', marginBottom: '1rem', color: 'var(--text-primary)' }}>4. Prohibited Activities</h2>
          <p>You may not access or use the Site for any purpose other than that for which we make the Site available. The Site may not be used in connection with any commercial endeavors except those that are specifically endorsed or approved by us.</p>
          <p>As a user of the Site, you agree not to: systematically retrieve data or other content from the Site to create or compile, directly or indirectly, a collection, compilation, database, or directory without written permission from us.</p>
          
          <h2 style={{ marginTop: '2rem', marginBottom: '1rem', color: 'var(--text-primary)' }}>5. Modifications and Interruptions</h2>
          <p>We reserve the right to change, modify, or remove the contents of the Site at any time or for any reason at our sole discretion without notice. However, we have no obligation to update any information on our Site. We will not be liable to you or any third party for any modification, price change, suspension, or discontinuance of the Site.</p>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default TermsPage;
`;

const cookiesContent = `import React from 'react';
import { Navbar } from '../components/Navbar';
import { Footer } from '../components/Footer';

export const CookiePolicyPage: React.FC = () => {
  return (
    <div style={{ backgroundColor: 'var(--bg-canvas)', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Navbar />
      <main className="container" style={{ flex: 1, padding: '4rem 0', maxWidth: '800px' }}>
        <h1 style={{ marginBottom: '2rem' }}>Cookie Policy</h1>
        <div style={{ lineHeight: '1.6', color: 'var(--text-secondary)' }}>
          <p><strong>Last Updated:</strong> {new Date().toLocaleDateString()}</p>
          
          <h2 style={{ marginTop: '2rem', marginBottom: '1rem', color: 'var(--text-primary)' }}>1. What Are Cookies</h2>
          <p>As is common practice with almost all professional websites, this site uses cookies, which are tiny files that are downloaded to your computer, to improve your experience. This page describes what information they gather, how we use it, and why we sometimes need to store these cookies. We will also share how you can prevent these cookies from being stored however this may downgrade or 'break' certain elements of the sites functionality.</p>
          
          <h2 style={{ marginTop: '2rem', marginBottom: '1rem', color: 'var(--text-primary)' }}>2. How We Use Cookies</h2>
          <p>We use cookies for a variety of reasons detailed below. Unfortunately, in most cases, there are no industry standard options for disabling cookies without completely disabling the functionality and features they add to this site. It is recommended that you leave on all cookies if you are not sure whether you need them or not in case they are used to provide a service that you use.</p>
          
          <h2 style={{ marginTop: '2rem', marginBottom: '1rem', color: 'var(--text-primary)' }}>3. Disabling Cookies</h2>
          <p>You can prevent the setting of cookies by adjusting the settings on your browser (see your browser Help for how to do this). Be aware that disabling cookies will affect the functionality of this and many other websites that you visit. Disabling cookies will usually result in also disabling certain functionality and features of this site. Therefore it is recommended that you do not disable cookies.</p>
          
          <h2 style={{ marginTop: '2rem', marginBottom: '1rem', color: 'var(--text-primary)' }}>4. The Cookies We Set</h2>
          <ul style={{ marginLeft: '1.5rem', marginTop: '0.5rem', marginBottom: '1rem' }}>
            <li><strong>Account related cookies:</strong> If you create an account with us then we will use cookies for the management of the signup process and general administration. These cookies will usually be deleted when you log out however in some cases they may remain afterwards to remember your site preferences when logged out.</li>
            <li><strong>Login related cookies:</strong> We use cookies when you are logged in so that we can remember this fact. This prevents you from having to log in every single time you visit a new page. These cookies are typically removed or cleared when you log out to ensure that you can only access restricted features and areas when logged in.</li>
            <li><strong>Site preferences cookies:</strong> In order to provide you with a great experience on this site we provide the functionality to set your preferences for how this site runs when you use it. In order to remember your preferences we need to set cookies so that this information can be called whenever you interact with a page is affected by your preferences.</li>
          </ul>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default CookiePolicyPage;
`;

const refundContent = `import React from 'react';
import { Navbar } from '../components/Navbar';
import { Footer } from '../components/Footer';

export const RefundPolicyPage: React.FC = () => {
  return (
    <div style={{ backgroundColor: 'var(--bg-canvas)', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Navbar />
      <main className="container" style={{ flex: 1, padding: '4rem 0', maxWidth: '800px' }}>
        <h1 style={{ marginBottom: '2rem' }}>Refund Policy</h1>
        <div style={{ lineHeight: '1.6', color: 'var(--text-secondary)' }}>
          <p><strong>Last Updated:</strong> {new Date().toLocaleDateString()}</p>
          
          <h2 style={{ marginTop: '2rem', marginBottom: '1rem', color: 'var(--text-primary)' }}>1. General Policy</h2>
          <p>We stand behind our products and your satisfaction with them is important to us. However, because our products are digital goods delivered via Internet download or API access, we generally offer no refunds.</p>
          
          <h2 style={{ marginTop: '2rem', marginBottom: '1rem', color: 'var(--text-primary)' }}>2. Subscription Cancellations</h2>
          <p>If you purchase a subscription service, you may cancel it at any time. Your cancellation will take effect at the end of the current paid term. If you cancel, you will not receive a refund for any service already paid for, but you will not be charged again in the future.</p>
          
          <h2 style={{ marginTop: '2rem', marginBottom: '1rem', color: 'var(--text-primary)' }}>3. Exceptional Circumstances</h2>
          <p>Refund requests made after you have downloaded our product are handled on a case by case basis and are issued at our sole discretion. Refund requests, if any, must be made within thirty (30) days of your original purchase.</p>
          
          <h2 style={{ marginTop: '2rem', marginBottom: '1rem', color: 'var(--text-primary)' }}>4. Non-Refundable Items</h2>
          <p>The following items are non-refundable:</p>
          <ul style={{ marginLeft: '1.5rem', marginTop: '0.5rem', marginBottom: '1rem' }}>
            <li>Digital products that have been accessed or downloaded.</li>
            <li>Consulting or advisory services that have already been rendered.</li>
            <li>Custom development work once the project has commenced.</li>
          </ul>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default RefundPolicyPage;
`;

fs.writeFileSync(path.join(srcDir, 'PrivacyPolicyPage.tsx'), privacyContent);
fs.writeFileSync(path.join(srcDir, 'TermsPage.tsx'), termsContent);
fs.writeFileSync(path.join(srcDir, 'CookiePolicyPage.tsx'), cookiesContent);
fs.writeFileSync(path.join(srcDir, 'RefundPolicyPage.tsx'), refundContent);

console.log("Pages updated successfully.");
