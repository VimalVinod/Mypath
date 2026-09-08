import React from 'react';
import { useApp } from '../context/AppContext';
import { Navbar } from '../components/Navbar';
import { Footer } from '../components/Footer';
import { ExamCard } from '../components/ExamCard';
import { 
  ArrowRight, 
  Compass,
  ChevronRight,
  ChevronLeft,
  CheckCircle,
  Bell,
  Target
} from 'lucide-react';
import bannerOneImg from '../assets/banner-one.png';
import bannerTwoImg from '../assets/banner-two.png';
import bannerThreeImg from '../assets/banner-three.png';

type BannerItem = 
  | { id: string; type: 'image'; image: string; alt: string }
  | { id: string; type: 'placeholder'; label: string };

export const LandingPage: React.FC = () => {
  const { navigate, exams, currentUser } = useApp();
  const trendingExams = exams.slice(0, 3);

  const banners: BannerItem[] = [
    {
      id: 'banner-one',
      type: 'image',
      image: bannerOneImg,
      alt: 'MyPath — Your Path Starts Here'
    },
    {
      id: 'banner-two',
      type: 'image',
      image: bannerTwoImg,
      alt: 'Don’t Miss the Exams You’re Eligible For — MyPath'
    },
    {
      id: 'banner-three',
      type: 'image',
      image: bannerThreeImg,
      alt: 'Your Exams. Your Path. — MyPath'
    }
  ];

  const [currentSlide, setCurrentSlide] = React.useState(0);
  const [isPaused, setIsPaused] = React.useState(false);

  React.useEffect(() => {
    if (isPaused || banners.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % banners.length);
    }, 6000);
    return () => clearInterval(interval);
  }, [isPaused, banners.length]);

  const prevSlide = () => {
    setCurrentSlide((prev) => (prev === 0 ? banners.length - 1 : prev - 1));
  };

  const nextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % banners.length);
  };

  return (
    <div style={{ backgroundColor: 'var(--bg-canvas)', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Navbar />

      {/* Hero Section */}
      <section 
        className="hero-section" 
        style={{ backgroundColor: '#000000', overflow: 'hidden' }}
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

          {/* Carousel Navigation Controls (Visible only when multiple slides exist) */}
          {banners.length > 1 && (
            <>
              {/* Left Arrow Button */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  prevSlide();
                }}
                aria-label="Previous Slide"
                className="carousel-arrow carousel-arrow-left"
                style={{
                  position: 'absolute',
                  left: '20px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  width: '38px',
                  height: '38px',
                  borderRadius: '50%',
                  backgroundColor: 'rgba(20, 20, 20, 0.55)',
                  backdropFilter: 'blur(8px)',
                  WebkitBackdropFilter: 'blur(8px)',
                  color: '#FFFFFF',
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  zIndex: 10,
                  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.4)',
                  transition: 'all 0.2s ease'
                }}
              >
                <ChevronLeft size={20} />
              </button>

              {/* Right Arrow Button */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  nextSlide();
                }}
                aria-label="Next Slide"
                className="carousel-arrow carousel-arrow-right"
                style={{
                  position: 'absolute',
                  right: '20px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  width: '38px',
                  height: '38px',
                  borderRadius: '50%',
                  backgroundColor: 'rgba(20, 20, 20, 0.55)',
                  backdropFilter: 'blur(8px)',
                  WebkitBackdropFilter: 'blur(8px)',
                  color: '#FFFFFF',
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  zIndex: 10,
                  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.4)',
                  transition: 'all 0.2s ease'
                }}
              >
                <ChevronRight size={20} />
              </button>

              {/* Indicator Dots */}
              <div 
                className="carousel-dots-container"
                style={{
                  position: 'absolute',
                  bottom: '22px',
                  left: '50%',
                  transform: 'translateX(-50%)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  zIndex: 10,
                  backgroundColor: 'rgba(0, 0, 0, 0.5)',
                  padding: '6px 16px',
                  borderRadius: '999px',
                  backdropFilter: 'blur(8px)'
                }}
              >
                {banners.map((_, idx) => (
                  <button
                    key={idx}
                    type="button"
                    className="carousel-dot"
                    onClick={(e) => {
                      e.stopPropagation();
                      setCurrentSlide(idx);
                    }}
                    aria-label={`Go to slide ${idx + 1}`}
                    style={{
                      width: currentSlide === idx ? '30px' : '8px',
                      height: '8px',
                      borderRadius: '4px',
                      backgroundColor: currentSlide === idx ? '#FFFFFF' : 'rgba(255, 255, 255, 0.45)',
                      border: 'none',
                      padding: 0,
                      cursor: 'pointer',
                      transition: 'all 0.3s ease'
                    }}
                  />
                ))}
              </div>
            </>
          )}
        </div>
      </section>

      {/* Featured / Trending Exams */}
      <section style={{ padding: '4.5rem 0', backgroundColor: 'var(--bg-subtle)', borderBottom: '1px solid var(--border)' }}>
        <div className="container">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '2.5rem', flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: 'var(--brand-red)', display: 'inline-block' }} />
                <span style={{ fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--brand-red)' }}>
                  Now Open For Application
                </span>
              </div>
              <h2 style={{ fontSize: '2.2rem', textTransform: 'uppercase' }}>Active Opportunities</h2>
            </div>
            
            <button 
              className="btn btn-ghost btn-sm"
              onClick={() => navigate('/exams')}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
            >
              View All <ChevronRight size={16} />
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem' }}>
            {trendingExams.map(exam => (
              <ExamCard key={exam.id} exam={exam} />
            ))}
          </div>
        </div>
      </section>

      {/* Interactive Career Quiz Banner - Clean Solid High-Contrast */}
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
      <section className="feature-section" style={{ backgroundColor: '#FFFFFF', borderTop: '1px solid var(--border)' }}>
        <div className="container feature-flex">
          <div className="feature-text-block">
            <h2 className="feature-heading" style={{ color: '#09090B' }}>
              Find Exams You Actually Qualify For.
            </h2>
            <p className="feature-description" style={{ color: '#52525B' }}>
              Stop wasting hours reading through complex official notifications. Input your age, education, and background once, and we'll instantly show you every central and state government exam you are eligible to take.
            </p>
          </div>
          <div className="feature-image-block">
            {/* Placeholder for future PNG image */}
            <div style={{ width: '100%', maxWidth: '450px', aspectRatio: '4/3', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#F4F4F5', borderRadius: '24px', border: '1px dashed #E4E4E7', color: '#A1A1AA', fontSize: '0.9rem' }}>
              [ Image Placeholder ]
            </div>
          </div>
        </div>
      </section>

      {/* Feature 2: Application Tracking */}
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
      </section>

      {/* Feature 3: Deadline Alerts */}
      <section className="feature-section" style={{ backgroundColor: '#09090B', color: '#FFFFFF' }}>
        <div className="container feature-flex">
          <div className="feature-text-block">
            <h2 className="feature-heading" style={{ color: '#FFFFFF' }}>
              Never Miss a Deadline Again.
            </h2>
            <p className="feature-description" style={{ color: '#A1A1AA' }}>
              Missing an application window can set your career back by an entire year. Our smart notification system sends you timely reminders before applications close and when admit cards are released.
            </p>
          </div>
          <div className="feature-image-block">
            {/* Placeholder for future PNG image */}
            <div style={{ width: '100%', maxWidth: '450px', aspectRatio: '4/3', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#18181B', borderRadius: '24px', border: '1px dashed #27272A', color: '#71717A', fontSize: '0.9rem' }}>
              [ Image Placeholder ]
            </div>
          </div>
        </div>
      </section>



      <Footer />
    </div>
  );
};
