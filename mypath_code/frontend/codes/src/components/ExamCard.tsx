import React from 'react';
import { Exam } from '../types';
import { useApp } from '../context/AppContext';
import { Bookmark, Clock, CheckCircle, AlertCircle, ArrowUpRight } from 'lucide-react';

interface ExamCardProps {
  exam: Exam;
}

export const ExamCard: React.FC<ExamCardProps> = ({ exam }) => {
  const { navigate, trackerItems, toggleBookmark } = useApp();

  const isBookmarked = trackerItems.some(item => item.examId === exam.id);

  const getMatchBadge = () => {
    if (exam.matchLevel === 'Eligible') {
      return (
        <span className="badge badge-eligible">
          <CheckCircle size={12} /> Eligible
        </span>
      );
    }
    if (exam.matchLevel === 'Probably Eligible') {
      return (
        <span className="badge badge-amber">
          <AlertCircle size={12} /> Prob. Eligible
        </span>
      );
    }
    return (
      <span className="badge badge-neutral">
        Not Eligible
      </span>
    );
  };

  return (
    <div 
      className="card card-hover" 
      style={{ 
        display: 'flex', 
        flexDirection: 'column', 
        justifyContent: 'space-between',
        padding: '1.4rem',
        cursor: 'pointer'
      }}
      onClick={() => navigate(`/exams/${exam.id}`)}
    >
      <div>
        {/* Top meta tags row - boAt Style solid dark badge */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.85rem' }}>
          <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
            <span className="badge badge-dark">
              {exam.type}
            </span>
            {getMatchBadge()}
          </div>

          <button
            onClick={(e) => {
              e.stopPropagation();
              toggleBookmark(exam.id);
            }}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: isBookmarked ? 'var(--brand-red)' : 'var(--text-muted)',
              padding: '0.2rem',
              display: 'flex',
              alignItems: 'center'
            }}
            title={isBookmarked ? 'Remove Bookmark' : 'Bookmark Exam'}
          >
            <Bookmark size={18} fill={isBookmarked ? 'var(--brand-red)' : 'none'} />
          </button>
        </div>

        {/* Title & Organization */}
        <h3 style={{ fontSize: '1.18rem', fontWeight: 800, marginBottom: '0.25rem', lineHeight: 1.25, color: 'var(--text-primary)' }}>
          {exam.shortName}
        </h3>
        <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: '0.85rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.03em' }}>
          {exam.organization}
        </p>

        {/* Description snippet */}
        <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1rem', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', lineHeight: 1.5 }}>
          {exam.description}
        </p>

        {/* Key Eligibility Chips */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', marginBottom: '1.25rem' }}>
          <span style={{ fontSize: '0.75rem', fontWeight: 600, backgroundColor: 'var(--surface-alt)', padding: '0.2rem 0.5rem', borderRadius: '4px', color: 'var(--text-primary)' }}>
            {exam.state}
          </span>
          {exam.tags.slice(0, 2).map((t, i) => (
            <span key={i} style={{ fontSize: '0.75rem', fontWeight: 600, backgroundColor: 'var(--surface-alt)', padding: '0.2rem 0.5rem', borderRadius: '4px', color: 'var(--text-secondary)' }}>
              #{t.toUpperCase()}
            </span>
          ))}
        </div>
      </div>

      <div>
        {/* Deadline countdown & action */}
        <div style={{ borderTop: '1px solid var(--border)', paddingTop: '0.85rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.82rem', color: exam.daysRemaining <= 7 ? 'var(--error)' : 'var(--text-secondary)', fontWeight: 700 }}>
            <Clock size={14} />
            <span>{exam.daysRemaining} days remaining</span>
          </div>

          <span 
            style={{ 
              display: 'inline-flex', 
              alignItems: 'center', 
              gap: '0.2rem', 
              fontSize: '0.8rem', 
              fontWeight: 700, 
              textTransform: 'uppercase', 
              color: 'var(--text-primary)',
              letterSpacing: '0.04em'
            }}
          >
            Details <ArrowUpRight size={14} />
          </span>
        </div>
      </div>
    </div>
  );
};
