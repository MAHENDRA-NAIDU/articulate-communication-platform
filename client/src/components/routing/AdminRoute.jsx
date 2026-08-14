import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

export const AdminRoute = ({ children }) => {
  const { isAuthenticated, isAdmin, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div style={styles.loaderContainer}>
        <div className="animate-spin" style={styles.spinner} />
        <p style={styles.loaderText}>Verifying administrator privileges...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (!isAdmin) {
    return <Navigate to="/" replace />;
  }

  return children;
};

const styles = {
  loaderContainer: {
    minHeight: '60vh',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '16px',
  },
  spinner: {
    width: '36px',
    height: '36px',
    border: '3px solid #EDE7DD',
    borderTopColor: '#191716',
    borderRadius: '50%',
  },
  loaderText: {
    color: '#8C827A',
    fontSize: '0.95rem',
  },
};
