import React from 'react';
import { Link } from 'react-router-dom';
import { Compass, Home, ArrowLeft } from 'lucide-react';
import { Button } from '../components/common/Button';

export const NotFoundPage = () => {
  return (
    <div style={styles.page}>
      <div className="container" style={styles.container}>
        <div style={styles.badge}>404 Error</div>
        <h1 className="heading-display" style={styles.title}>
          Speaking Drill Not Found
        </h1>
        <p style={styles.subtitle}>
          The practice video or page you were searching for might have been moved, deleted, or doesn't exist.
        </p>
        <div style={styles.btnRow}>
          <Link to="/">
            <Button variant="primary" size="md" icon={<Home size={16} />}>
              Back to Home
            </Button>
          </Link>
          <Link to="/explore">
            <Button variant="outline" size="md" icon={<Compass size={16} />}>
              Explore Speaking Videos
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
};

const styles = {
  page: {
    padding: '80px 0 120px 0',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    textAlign: 'center',
  },
  container: {
    maxWidth: '560px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
  },
  badge: {
    fontFamily: 'var(--font-serif)',
    fontSize: '2rem',
    fontWeight: '800',
    color: '#E05D38',
    marginBottom: '8px',
  },
  title: {
    fontSize: 'clamp(2rem, 3.5vw, 2.6rem)',
    color: '#1C1917',
    marginBottom: '12px',
  },
  subtitle: {
    fontSize: '1rem',
    color: '#6E675F',
    lineHeight: '1.6',
    marginBottom: '28px',
  },
  btnRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
};
