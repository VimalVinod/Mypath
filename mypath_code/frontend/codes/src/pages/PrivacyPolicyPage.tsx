import React from 'react';
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
