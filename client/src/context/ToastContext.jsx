import React, { createContext, useContext, useState, useCallback } from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

const ToastContext = createContext(null);

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  const showToast = useCallback(
    (message, type = 'info', duration = 4500) => {
      const id = Date.now() + Math.random().toString(36).substring(2, 7);
      const newToast = { id, message, type };

      setToasts((prev) => [...prev, newToast]);

      if (duration > 0) {
        setTimeout(() => {
          removeToast(id);
        }, duration);
      }
    },
    [removeToast]
  );

  const success = useCallback((msg, duration) => showToast(msg, 'success', duration), [showToast]);
  const error = useCallback((msg, duration) => showToast(msg, 'error', duration), [showToast]);
  const info = useCallback((msg, duration) => showToast(msg, 'info', duration), [showToast]);

  return (
    <ToastContext.Provider value={{ showToast, success, error, info, removeToast }}>
      {children}
      <div className="toast-container" style={styles.container}>
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className="animate-fade-up"
            style={{
              ...styles.toast,
              ...(toast.type === 'success' ? styles.success : {}),
              ...(toast.type === 'error' ? styles.error : {}),
              ...(toast.type === 'info' ? styles.info : {}),
            }}
          >
            <div style={styles.iconWrapper}>
              {toast.type === 'success' && <CheckCircle2 size={18} color="#2E7D32" />}
              {toast.type === 'error' && <AlertCircle size={18} color="#D32F2F" />}
              {toast.type === 'info' && <Info size={18} color="#E05D38" />}
            </div>
            <div style={styles.message}>{toast.message}</div>
            <button
              onClick={() => removeToast(toast.id)}
              style={styles.closeBtn}
              aria-label="Close notification"
            >
              <X size={15} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};

const styles = {
  container: {
    position: 'fixed',
    bottom: '24px',
    right: '24px',
    zIndex: 9999,
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
    maxWidth: '420px',
    width: 'calc(100% - 48px)',
    pointerEvents: 'none',
  },
  toast: {
    pointerEvents: 'auto',
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '12px 16px',
    backgroundColor: '#FFFFFF',
    borderRadius: '12px',
    boxShadow: '0 10px 30px rgba(0, 0, 0, 0.12), 0 2px 6px rgba(0, 0, 0, 0.04)',
    border: '1px solid #EDE7DD',
    color: '#1C1917',
    fontSize: '0.92rem',
    fontWeight: '500',
  },
  success: {
    borderLeft: '4px solid #2E7D32',
  },
  error: {
    borderLeft: '4px solid #D32F2F',
  },
  info: {
    borderLeft: '4px solid #E05D38',
  },
  iconWrapper: {
    display: 'flex',
    alignItems: 'center',
    flexShrink: 0,
  },
  message: {
    flexGrow: 1,
    lineHeight: '1.4',
  },
  closeBtn: {
    background: 'none',
    border: 'none',
    color: '#8C827A',
    cursor: 'pointer',
    padding: '4px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: '4px',
    transition: 'color 0.15s',
  },
};
