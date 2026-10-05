import React from 'react';
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
