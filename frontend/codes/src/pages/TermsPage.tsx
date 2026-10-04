import React from 'react';
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
