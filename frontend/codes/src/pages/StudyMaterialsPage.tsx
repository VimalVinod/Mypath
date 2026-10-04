import React from 'react';
import { SidebarLayout } from '../components/SidebarLayout';

export const StudyMaterialsPage: React.FC = () => {
  return (
    <SidebarLayout pageTitle="Study Material" activeNav="materials">
      <div style={{ backgroundColor: '#FFFFFF', borderRadius: '14px', border: '1px solid #E2E8F0', padding: '3rem 2rem', textAlign: 'center' }}>
        <h2 style={{ fontSize: '1.25rem', color: '#0F172A', marginBottom: '0.5rem' }}>Study Material</h2>
        <p style={{ color: '#64748B' }}>This section is coming soon. Here you will be able to access study materials, syllabuses, and previous year question papers for your tracked exams.</p>
      </div>
    </SidebarLayout>
  );
};
