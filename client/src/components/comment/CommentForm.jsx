import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Send, Sparkles, MessageSquarePlus } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../common/Button';

const PROMPT_SUGGESTIONS = [
  'Pacing & Speed',
  'Eye Contact & Posture',
  'Filler Words (um/ah)',
  'Clarity of Ideas',
  'Structure (STAR method)',
];

export const CommentForm = ({ onSubmit, loading = false }) => {
  const { isAuthenticated, user } = useAuth();
  const [content, setContent] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!content.trim() || loading) return;
    onSubmit(content.trim());
    setContent('');
  };

  const handleSuggestionClick = (suggestion) => {
    setContent((prev) =>
      prev ? `${prev} Feedback on ${suggestion}: ` : `Feedback on ${suggestion}: `
    );
  };

  if (!isAuthenticated) {
    return (
      <div style={styles.authNoticeCard}>
        <MessageSquarePlus size={22} color="#E05D38" />
        <div style={{ flex: 1 }}>
          <h4 style={styles.authNoticeTitle}>Join the conversation</h4>
          <p style={styles.authNoticeDesc}>
            Log in or create a free account to give constructive feedback and help this speaker grow.
          </p>
        </div>
        <div style={styles.authButtons}>
          <Link to="/login">
            <Button variant="outline" size="sm">
              Log In
            </Button>
          </Link>
          <Link to="/register">
            <Button variant="primary" size="sm">
              Register
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} style={styles.form}>
      {/* Suggestions Row */}
      <div style={styles.suggestionsRow}>
        <span style={styles.suggestionLabel}>
          <Sparkles size={13} color="#E05D38" /> Feedback prompts:
        </span>
        <div style={styles.suggestionPills}>
          {PROMPT_SUGGESTIONS.map((sug) => (
            <button
              key={sug}
              type="button"
              onClick={() => handleSuggestionClick(sug)}
              style={styles.suggestionPill}
            >
              + {sug}
            </button>
          ))}
        </div>
      </div>

      {/* Input container */}
      <div style={styles.inputContainer}>
        <div style={styles.avatarWrapper}>
          {user?.profileImage ? (
            <img
              src={user.profileImage}
              alt={user.name}
              referrerPolicy="no-referrer"
              style={styles.avatar}
            />
          ) : (
            <div style={styles.avatarFallback}>
              {user?.name?.charAt(0).toUpperCase() || 'U'}
            </div>
          )}
        </div>

        <div style={styles.textareaWrapper}>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Share constructive feedback... (e.g. What went well? What could be improved regarding pacing, clarity, or confidence?)"
            maxLength={1000}
            rows={3}
            style={styles.textarea}
            required
          />

          <div style={styles.footerRow}>
            <span style={styles.charCount}>
              {content.length}/1000 characters
            </span>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              loading={loading}
              disabled={!content.trim()}
              icon={<Send size={14} />}
            >
              Post Feedback
            </Button>
          </div>
        </div>
      </div>
    </form>
  );
};

const styles = {
  form: {
    backgroundColor: '#FFFFFF',
    borderRadius: '16px',
    border: '1px solid #EDE7DD',
    padding: '20px',
    marginBottom: '28px',
    boxShadow: 'var(--shadow-sm)',
  },
  suggestionsRow: {
    display: 'flex',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: '8px',
    marginBottom: '16px',
    paddingBottom: '12px',
    borderBottom: '1px solid #F3ECE1',
  },
  suggestionLabel: {
    fontSize: '0.8rem',
    fontWeight: '700',
    color: '#1C1917',
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
  },
  suggestionPills: {
    display: 'flex',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: '6px',
  },
  suggestionPill: {
    fontSize: '0.75rem',
    fontWeight: '600',
    color: '#6E675F',
    backgroundColor: '#FAF7F2',
    border: '1px solid #E2DACD',
    borderRadius: '999px',
    padding: '3px 10px',
    cursor: 'pointer',
    transition: 'all 0.15s',
  },
  inputContainer: {
    display: 'flex',
    gap: '12px',
    alignItems: 'flex-start',
  },
  avatarWrapper: {
    flexShrink: 0,
  },
  avatar: {
    width: '38px',
    height: '38px',
    borderRadius: '50%',
    objectFit: 'cover',
    border: '1px solid #E2DACD',
  },
  avatarFallback: {
    width: '38px',
    height: '38px',
    borderRadius: '50%',
    backgroundColor: '#FCEDE8',
    color: '#E05D38',
    fontWeight: '700',
    fontSize: '0.9rem',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  textareaWrapper: {
    flexGrow: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
  },
  textarea: {
    width: '100%',
    padding: '12px 14px',
    fontFamily: 'var(--font-sans)',
    fontSize: '0.92rem',
    color: '#1C1917',
    backgroundColor: '#FAF7F2',
    border: '1px solid #E2DACD',
    borderRadius: '10px',
    outline: 'none',
    resize: 'vertical',
    minHeight: '80px',
    transition: 'border-color 0.15s, background-color 0.15s',
  },
  footerRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  charCount: {
    fontSize: '0.78rem',
    color: '#8C827A',
  },
  authNoticeCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: '16px',
    border: '1px dashed #DDD5C8',
    padding: '24px',
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
    marginBottom: '28px',
    flexWrap: 'wrap',
  },
  authNoticeTitle: {
    fontSize: '1rem',
    fontWeight: '700',
    color: '#1C1917',
    marginBottom: '4px',
  },
  authNoticeDesc: {
    fontSize: '0.88rem',
    color: '#6E675F',
    lineHeight: '1.4',
  },
  authButtons: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    flexShrink: 0,
  },
};
