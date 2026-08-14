import React from 'react';
import { Video, MessageSquareQuote } from 'lucide-react';
import { Button } from './Button';

export const EmptyState = ({
  icon = null,
  title = 'Nothing here yet',
  description = 'Be the first person to share your speaking practice.',
  actionLabel = null,
  onAction = null,
  style = {},
}) => {
  return (
    <div style={{ ...styles.container, ...style }} className="animate-fade-up">
      <div style={styles.iconCircle}>
        {icon || <Video size={32} color="#E05D38" />}
      </div>
      <h3 style={styles.title}>{title}</h3>
      <p style={styles.description}>{description}</p>
      {actionLabel && onAction && (
        <div style={styles.actionWrapper}>
          <Button variant="primary" onClick={onAction}>
            {actionLabel}
          </Button>
        </div>
      )}
    </div>
  );
};

const styles = {
  container: {
    padding: '60px 24px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    textAlign: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: '20px',
    border: '1px dashed #DDD5C8',
    margin: '20px 0',
  },
  iconCircle: {
    width: '64px',
    height: '64px',
    borderRadius: '50%',
    backgroundColor: '#FCEDE8',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: '16px',
  },
  title: {
    fontSize: '1.25rem',
    fontWeight: '700',
    color: '#1C1917',
    marginBottom: '6px',
  },
  description: {
    color: '#78716C',
    fontSize: '0.95rem',
    maxWidth: '400px',
    lineHeight: '1.5',
  },
  actionWrapper: {
    marginTop: '20px',
  },
};
