import React from 'react';
import { Link } from 'react-router-dom';
import { Mic, Heart } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export const Footer = () => {
  const { isAuthenticated, user } = useAuth();

  return (
    <footer style={styles.footer}>
      <div className="container" style={styles.container}>
        <div className="footer-grid" style={styles.grid}>
          {/* Brand Col */}
          <div style={styles.brandCol}>
            <div style={styles.logoRow}>
              <div style={styles.logoBadge}>
                <Mic size={16} color="#FFFFFF" />
              </div>
              <span style={styles.brandName}>Articulate</span>
            </div>
            <p style={styles.brandDesc}>
              A dedicated community platform for students, job seekers, and learners to
              practice speaking through short video uploads and receive constructive,
              kind feedback.
            </p>
            <div style={styles.mottoBadge}>
              <span>Speak. Practice. Improve.</span>
            </div>
          </div>

          {/* Quick Links */}
          <div style={styles.col}>
            <h4 style={styles.colHeading}>Explore</h4>
            <ul style={styles.linkList}>
              <li>
                <Link to="/" style={styles.link}>Home</Link>
              </li>
              <li>
                <Link to="/explore" style={styles.link}>Speaking Feed</Link>
              </li>
              <li>
                <Link to="/upload" style={styles.link}>Upload Practice</Link>
              </li>
              <li>
                <Link to="/about" style={styles.link}>About & How It Works</Link>
              </li>
            </ul>
          </div>

          {/* Account / Topics */}
          <div style={styles.col}>
            <h4 style={styles.colHeading}>Account & Community</h4>
            <ul style={styles.linkList}>
              {isAuthenticated ? (
                <>
                  <li>
                    <Link to={`/profile/${user?._id}`} style={styles.link}>My Profile</Link>
                  </li>
                  <li>
                    <Link to="/upload" style={styles.link}>New Video Drill</Link>
                  </li>
                </>
              ) : (
                <>
                  <li>
                    <Link to="/login" style={styles.link}>Sign In</Link>
                  </li>
                  <li>
                    <Link to="/register" style={styles.link}>Create Free Account</Link>
                  </li>
                </>
              )}
              <li>
                <Link to="/explore?category=Self+Introduction" style={styles.link}>Self Introductions</Link>
              </li>
              <li>
                <Link to="/explore?category=Interview+Practice" style={styles.link}>Interview Drills</Link>
              </li>
            </ul>
          </div>

          {/* Guidelines */}
          <div style={styles.col}>
            <h4 style={styles.colHeading}>Community Promise</h4>
            <p style={styles.guidelineText}>
              Every learner here is building confidence. We prioritize encouragement,
              practical speaking tips, and positive constructive growth.
            </p>
          </div>
        </div>

        <div className="footer-bottom-bar" style={styles.bottomBar}>
          <div style={styles.copyright}>
            © {new Date().getFullYear()} Articulate — Communication Practice & Peer Feedback Platform. All rights reserved.
          </div>
          <div style={styles.bottomMeta}>
            <span>Crafted with</span>
            <Heart size={14} color="#E05D38" fill="#E05D38" />
            <span>for learners, students & job seekers.</span>
          </div>
        </div>
      </div>
    </footer>
  );
};

const styles = {
  footer: {
    backgroundColor: '#FAF7F2',
    borderTop: '1px solid #EDE7DD',
    padding: '64px 0 32px 0',
    marginTop: 'auto',
  },
  container: {
    display: 'flex',
    flexDirection: 'column',
    gap: '48px',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: '2fr 1fr 1fr 1.5fr',
    gap: '40px',
  },
  brandCol: {
    display: 'flex',
    flexDirection: 'column',
    gap: '14px',
  },
  logoRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
  logoBadge: {
    width: '32px',
    height: '32px',
    borderRadius: '8px',
    backgroundColor: '#E05D38',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandName: {
    fontFamily: 'var(--font-serif)',
    fontSize: '1.25rem',
    fontWeight: '700',
    color: '#1C1917',
  },
  brandDesc: {
    fontSize: '0.9rem',
    color: '#6E675F',
    lineHeight: '1.6',
    maxWidth: '320px',
  },
  mottoBadge: {
    display: 'inline-flex',
    padding: '4px 10px',
    borderRadius: '6px',
    backgroundColor: '#F3ECE1',
    color: '#1C1917',
    fontSize: '0.78rem',
    fontWeight: '700',
    width: 'fit-content',
    letterSpacing: '0.02em',
  },
  col: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  colHeading: {
    fontSize: '0.85rem',
    fontWeight: '700',
    color: '#1C1917',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
  },
  linkList: {
    listStyle: 'none',
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
  },
  link: {
    fontSize: '0.9rem',
    color: '#6E675F',
    transition: 'color 0.15s',
  },
  guidelineText: {
    fontSize: '0.88rem',
    color: '#6E675F',
    lineHeight: '1.6',
  },
  bottomBar: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: '24px',
    borderTop: '1px solid #E2DACD',
    flexWrap: 'wrap',
    gap: '12px',
  },
  copyright: {
    fontSize: '0.85rem',
    color: '#8C827A',
  },
  bottomMeta: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    fontSize: '0.85rem',
    color: '#8C827A',
  },
};

// Add responsive rules in CSS
if (typeof document !== 'undefined') {
  const styleEl = document.createElement('style');
  styleEl.innerHTML = `
    @media (max-width: 900px) {
      .footer-grid {
        grid-template-columns: 1fr 1fr !important;
        gap: 30px !important;
      }
    }
    @media (max-width: 600px) {
      .footer-grid {
        grid-template-columns: 1fr !important;
        gap: 28px !important;
      }
      .footer-bottom-bar {
        flex-direction: column !important;
        align-items: flex-start !important;
      }
    }
  `;
  document.head.appendChild(styleEl);
}
