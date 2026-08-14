import React, { useEffect } from 'react';
import { X } from 'lucide-react';

export const Modal = ({
  isOpen,
  onClose,
  title,
  subtitle,
  children,
  maxWidth = '540px',
  footer = null,
}) => {
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.body.style.overflow = 'unset';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div style={styles.backdrop} onClick={onClose}>
      <div
        className="animate-scale-in"
        style={{ ...styles.modalCard, maxWidth }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={styles.header}>
          <div>
            {title && <h3 style={styles.title}>{title}</h3>}
            {subtitle && <p style={styles.subtitle}>{subtitle}</p>}
          </div>
          <button
            onClick={onClose}
            style={styles.closeButton}
            aria-label="Close dialog"
          >
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div style={styles.body}>{children}</div>

        {/* Footer */}
        {footer && <div style={styles.footer}>{footer}</div>}
      </div>
    </div>
  );
};

const styles = {
  backdrop: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(25, 23, 22, 0.65)',
    backdropFilter: 'blur(6px)',
    WebkitBackdropFilter: 'blur(6px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 9999, // Ensure it is above the sticky navbar (1000)
    padding: '24px 16px',
    overflowY: 'auto',
  },
  modalCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: '20px',
    border: '1px solid #EDE7DD',
    boxShadow: '0 25px 60px -10px rgba(0, 0, 0, 0.35)',
    width: '100%',
    maxHeight: 'calc(100vh - 48px)',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    margin: 'auto',
    position: 'relative',
  },
  header: {
    padding: '20px 24px 16px 24px',
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    borderBottom: '1px solid #F3ECE1',
    flexShrink: 0,
  },
  title: {
    fontSize: '1.25rem',
    fontWeight: '700',
    color: '#1C1917',
  },
  subtitle: {
    fontSize: '0.88rem',
    color: '#78716C',
    marginTop: '4px',
  },
  closeButton: {
    background: 'none',
    border: 'none',
    color: '#8C827A',
    cursor: 'pointer',
    padding: '6px',
    borderRadius: '8px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.15s',
  },
  body: {
    padding: '20px 24px',
    overflowY: 'auto',
    flexGrow: 1,
    maxHeight: 'calc(100vh - 170px)',
  },
  footer: {
    padding: '16px 24px',
    borderTop: '1px solid #F3ECE1',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: '12px',
    backgroundColor: '#FAF7F2',
    flexShrink: 0,
  },
};
