const fs = require('fs');

const landingPath = 'src/pages/LandingPage.tsx';

let code = `import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { ChevronRight, ShieldCheck, Zap, LineChart, Target, Compass, ChevronLeft } from 'lucide-react';
import { Footer } from '../components/Footer';

// Define our banners
const banners = [
  {
    id: 1,
    type: 'image',
    image: '/assets/banner-one.png',
    alt: 'One Stop Destination for Exam Tracking',
    label: ''
  },
  {
    id: 2,
    type: 'image',
    image: '/assets/banner-two.png',
    alt: 'Never Miss a Deadline',
    label: ''
  },
  {
    id: 3,
    type: 'image',
    image: '/assets/banner-three.png',
    alt: 'Advanced Tracking Technology',
    label: ''
  }
];

export const LandingPage: React.FC = () => {
  const { currentUser, navigate, trendingExams } = useApp();
  const [currentSlide, setCurrentSlide] = useState(0);

  // Auto-advance carousel
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % banners.length);
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  const nextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % banners.length);
  };

  const prevSlide = () => {
    setCurrentSlide((prev) => (prev === 0 ? banners.length - 1 : prev - 1));
  };

  return (
    <div className="landing-page fade-in">
      {/* Header (Top Navigation) */}
      <header className="landing-header">
        <div className="container" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div className="brand" onClick={() => navigate('/')} style={{ cursor: 'pointer' }}>
            <img src="/assets/logo.png" alt="MyPath Logo" style={{ height: '32px' }} />
          </div>
          
          <nav className="landing-nav">
            {currentUser ? (
              <button className="btn btn-brand" onClick={() => navigate('/dashboard')}>
                Go to Dashboard
              </button>
            ) : (
              <>
                <button 
                  className="btn btn-ghost" 
                  onClick={() => navigate('/login')}
                  style={{ fontWeight: 600 }}
                >
                  LOG IN
                </button>
                <button 
                  className="btn btn-brand" 
                  onClick={() => navigate('/login')}
                >
                  GET STARTED FREE
                </button>
              </>
            )}
          </nav>
        </div>
      </header>

      {/* Modern Banner Carousel */}
      <section 
        style={{ 
          paddingTop: 'var(--header-height)',
          backgroundColor: '#000000',
          position: 'relative',
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center'
        }}
      >
        <div style={{ position: 'relative', width: '100%' }}>
          {/* Banner Slider */}
          <div 
            className="hero-banner-container"
            style={{ 
              position: 'relative',
              width: '100%',
              margin: '0 auto',
              overflow: 'hidden',
              cursor: 'pointer',
              backgroundColor: '#000000'
            }}
          >
            {banners.map((banner, idx) => (
              <div 
                key={banner.id}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: '100%',
                  opacity: currentSlide === idx ? 1 : 0,
                  pointerEvents: currentSlide === idx ? 'auto' : 'none',
                  transition: 'opacity 0.8s ease-in-out',
                  userSelect: 'none'
                }}
              >
                {banner.type === 'image' ? (
                  <img 
                    src={banner.image} 
                    alt={banner.alt}
                    className="hero-banner-img"
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover',
                      display: 'block'
                    }}
                  />
                ) : (
                  <div 
                    style={{
                      width: '100%',
                      height: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      backgroundColor: '#06090d',
                      background: 'radial-gradient(ellipse at center, #1e293b 0%, #06090d 70%)'
                    }}
                  >
                    <div 
                      style={{
                        padding: '3rem 5rem',
                        borderRadius: '16px',
                        border: '2px dashed #475569',
                        backgroundColor: 'rgba(15, 23, 42, 0.75)',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '12px',
                        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5)'
                      }}
                    >
                      <h2 
                        style={{
                          fontSize: '2.5rem',
                          fontWeight: 700,
                          color: '#E2E8F0',
                          letterSpacing: '0.04em',
                          margin: 0
                        }}
                      >
                        {banner.label}
                      </h2>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Carousel Navigation Controls */}
          {banners.length > 1 && (
            <>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); prevSlide(); }}
                className="carousel-arrow carousel-arrow-left"
                style={{
                  position: 'absolute', left: '20px', top: '50%', transform: 'translateY(-50%)', width: '38px', height: '38px', borderRadius: '50%', backgroundColor: 'rgba(20, 20, 20, 0.55)', backdropFilter: 'blur(8px)', color: '#FFFFFF', border: '1px solid rgba(255, 255, 255, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', zIndex: 10, boxShadow: '0 4px 12px rgba(0, 0, 0, 0.4)', transition: 'all 0.2s ease'
                }}
              >
                <ChevronLeft size={20} />
              </button>

              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); nextSlide(); }}
                className="carousel-arrow carousel-arrow-right"
                style={{
                  position: 'absolute', right: '20px', top: '50%', transform: 'translateY(-50%)', width: '38px', height: '38px', borderRadius: '50%', backgroundColor: 'rgba(20, 20, 20, 0.55)', backdropFilter: 'blur(8px)', color: '#FFFFFF', border: '1px solid rgba(255, 255, 255, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', zIndex: 10, boxShadow: '0 4px 12px rgba(0, 0, 0, 0.4)', transition: 'all 0.2s ease'
                }}
              >
                <ChevronRight size={20} />
              </button>

              <div 
                className="carousel-dots-container"
                style={{
                  position: 'absolute', bottom: '22px', left: '50%', transform: 'translateX(-50%)', display: 'flex', alignItems: 'center', gap: '10px', zIndex: 10, backgroundColor: 'rgba(0, 0, 0, 0.5)', padding: '6px 16px', borderRadius: '999px', backdropFilter: 'blur(8px)'
                }}
              >
                {banners.map((_, idx) => (
                  <button
                    key={idx}
                    type="button"
                    className="carousel-dot"
                    onClick={(e) => { e.stopPropagation(); setCurrentSlide(idx); }}
                    style={{
                      width: currentSlide === idx ? '30px' : '8px', height: '8px', borderRadius: '4px', backgroundColor: currentSlide === idx ? '#FFFFFF' : 'rgba(255, 255, 255, 0.45)', border: 'none', padding: 0, cursor: 'pointer', transition: 'all 0.3s ease'
                    }}
                  />
                ))}
              </div>
            </>
          )}
        </div>
      </section>

      {/* Interactive Career Quiz Banner */}
      <section style={{ padding: '4.5rem 0', backgroundColor: 'var(--bg-subtle)' }}>
        <div className="container">
          <div 
            style={{ 
              backgroundColor: '#09090B', 
              color: '#FFFFFF',
              borderRadius: 'var(--radius-card)', 
              padding: '3rem 3.5rem', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '2rem',
              boxShadow: 'var(--shadow-lg)'
            }}
          >
            <div style={{ maxWidth: '600px' }}>
              <span className="badge badge-brand" style={{ marginBottom: '1rem' }}>
                <Compass size={14} /> 5-MINUTE PSYCHOMETRIC TEST
              </span>
              <h3 style={{ fontSize: '2rem', marginBottom: '0.75rem', color: '#FFFFFF', textTransform: 'uppercase' }}>
                Not Sure Which Exam Path Fits You?
              </h3>
              <p style={{ color: '#A1A1AA', fontSize: '1.05rem', lineHeight: 1.6 }}>
                Take our structured 8-question assessment to discover whether Civil Services, Banking, Defense, Technical PSUs, or Regulatory bodies align with your strengths.
              </p>
            </div>

            <button 
              className="btn btn-brand btn-lg"
              onClick={() => navigate(currentUser ? '/career-test' : '/login')}
            >
              Start Free Assessment <ArrowRight size={18} />
            </button>
          </div>
        </div>
      </section>

      {/* Feature 1: Eligibility Matching */}
      <section className="feature-section" style={{ backgroundColor: '#FFFFFF', borderTop: '1px solid var(--border)', padding: '5rem 0' }}>
        <div className="container" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2.5rem' }}>
          
          <div style={{ width: '100%', maxWidth: '1200px', margin: '0 auto', display: 'flex', justifyContent: 'center' }}>
            {/* Feature 1 Image Placeholder */}
            <div style={{ width: '100%', aspectRatio: '1918/908', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#F4F4F5', borderRadius: '24px', border: '1px dashed var(--border)', color: '#A1A1AA', fontSize: '1.25rem', fontWeight: 600 }}>
              [ Image Placeholder - Find Exams ]
            </div>
          </div>
          
          <div className="feature-text-block" style={{ textAlign: 'center', maxWidth: '700px', margin: '0 auto' }}>
            <h2 className="feature-heading" style={{ color: '#09090B', margin: '0 auto 1rem auto' }}>
              Find Exams You Actually Qualify For.
            </h2>
            <p className="feature-description" style={{ color: '#52525B', margin: '0 auto' }}>
              Stop wasting hours reading through complex official notifications. Input your age, education, and background once, and we'll instantly show you relevant central and state government exams you might be eligible to take.
            </p>
          </div>
        </div>
      </section>

      {/* Feature 2: Application Tracking */}
      <section className="feature-section" style={{ backgroundColor: 'var(--bg-subtle)', borderTop: '1px solid var(--border)', padding: '5rem 0' }}>
        <div className="container" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2.5rem' }}>
          
          <div style={{ width: '100%', maxWidth: '1200px', margin: '0 auto', display: 'flex', justifyContent: 'center' }}>
            {/* Dashboard Screenshot - Standard light shadow, NO black border */}
            <div style={{ width: '100%', borderRadius: '24px', overflow: 'hidden', boxShadow: '0 10px 30px rgba(0,0,0,0.1)' }}>
              <img src="/dashboard-screenshot.png" alt="Dashboard Preview" style={{ width: '100%', height: 'auto', display: 'block' }} />
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
      </section>

      {/* Feature 3: Deadline Alerts */}
      <section className="feature-section" style={{ backgroundColor: '#09090B', color: '#FFFFFF', padding: '5rem 0' }}>
        <div className="container" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2.5rem' }}>
          
          <div style={{ width: '100%', maxWidth: '1200px', margin: '0 auto', display: 'flex', justifyContent: 'center' }}>
            {/* Feature 3 Image Placeholder */}
            <div style={{ width: '100%', aspectRatio: '1918/908', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#18181B', borderRadius: '24px', border: '1px dashed #27272A', color: '#71717A', fontSize: '1.25rem', fontWeight: 600 }}>
              [ Image Placeholder - Deadlines ]
            </div>
          </div>
          
          <div className="feature-text-block" style={{ textAlign: 'center', maxWidth: '700px', margin: '0 auto' }}>
            <h2 className="feature-heading" style={{ color: '#FFFFFF', margin: '0 auto 1rem auto' }}>
              Never Miss a Deadline Again.
            </h2>
            <p className="feature-description" style={{ color: '#A1A1AA', margin: '0 auto' }}>
              Missing an application window can set your career back by an entire year. Our smart notification system sends you timely reminders before applications close and when admit cards are released.
            </p>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};
`;

fs.writeFileSync(landingPath, code);
console.log('Successfully rewrote LandingPage.tsx layout.');
