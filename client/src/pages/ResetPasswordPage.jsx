import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams, useParams } from 'react-router-dom';
import { KeyRound, Eye, EyeOff, CheckCircle, AlertTriangle, ArrowLeft } from 'lucide-react';
import { authService } from '../services/authService';
import { useToast } from '../context/ToastContext';
import { Button } from '../components/common/Button';

export const ResetPasswordPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const params = useParams();
  const { success, error } = useToast();

  const [token, setToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [successReset, setSuccessReset] = useState(false);
  const [hasTokenFromUrl, setHasTokenFromUrl] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Extract and sanitize recovery token from URL parameters
  useEffect(() => {
    const rawToken = searchParams.get('token') || params.token || '';
    if (rawToken.trim()) {
      setToken(rawToken.trim());
      setHasTokenFromUrl(true);

      // Sanitize token from the visible URL bar to prevent shoulder-surfing & history leakage
      try {
        window.history.replaceState({}, document.title, window.location.pathname);
      } catch (_) {
        // Safe fallback if history API is restricted
      }
    }
  }, [searchParams, params.token]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!token || !token.trim()) {
      setErrorMessage('Please enter your 6-digit recovery code or recovery token from your email.');
      return;
    }

    if (newPassword.length < 6) {
      setErrorMessage('New password must be at least 6 characters long.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMessage('Passwords do not match. Please ensure both fields match.');
      return;
    }

    try {
      setLoading(true);
      setErrorMessage('');
      const data = await authService.resetPassword({
        token: token.trim(),
        newPassword,
        confirmPassword,
      });

      if (data.success) {
        setSuccessReset(true);
        success('Password updated successfully! You can now sign in.');
      }
    } catch (err) {
      setErrorMessage(
        err.message || 'Unable to reset password. The recovery code or link may be invalid or expired.'
      );
      error(err.message || 'Password reset failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.page}>
      <div className="container-narrow" style={styles.container}>
        <div className="card" style={styles.card}>
          {/* Header */}
          <div style={styles.header}>
            <div style={styles.iconBadge}>
              <KeyRound size={22} color="#FFFFFF" />
            </div>
            <h1 className="heading-display" style={styles.title}>
              Reset Your Password
            </h1>
            <p style={styles.subtitle}>
              Choose a strong, new password for your Articulate account.
            </p>
          </div>

          {successReset ? (
            /* Success State */
            <div style={{ textAlign: 'center', padding: '16px 0' }}>
              <div
                style={{
                  width: '56px',
                  height: '56px',
                  borderRadius: '50%',
                  backgroundColor: '#E8F5E9',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: '16px',
                }}
              >
                <CheckCircle size={32} color="#2E7D32" />
              </div>
              <h3 style={{ fontSize: '1.2rem', color: '#191716', margin: '0 0 10px 0' }}>
                Password Reset Successfully!
              </h3>
              <p style={{ color: '#5C554E', fontSize: '0.94rem', lineHeight: '1.6', margin: '0 0 24px 0' }}>
                Your account password has been updated. All previous sessions have been invalidated for security. You can now sign in with your new credentials.
              </p>
              <Button
                variant="primary"
                size="lg"
                onClick={() => navigate('/login')}
                style={{ width: '100%' }}
              >
                Sign In to Articulate
              </Button>
            </div>
          ) : (
            /* Reset Password Form */
            <form onSubmit={handleSubmit}>
              {errorMessage && (
                <div
                  style={{
                    padding: '14px',
                    backgroundColor: '#FDECEA',
                    color: '#C62828',
                    borderRadius: '10px',
                    fontSize: '0.88rem',
                    lineHeight: '1.5',
                    marginBottom: '20px',
                    border: '1px solid #F5C6CB',
                  }}
                >
                  {errorMessage}
                </div>
              )}

              {hasTokenFromUrl ? (
                <div
                  style={{
                    padding: '10px 14px',
                    backgroundColor: '#F0F9F1',
                    borderRadius: '8px',
                    border: '1px solid #D2EFD7',
                    color: '#2E7D32',
                    fontSize: '0.85rem',
                    marginBottom: '18px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                  }}
                >
                  <CheckCircle size={16} color="#2E7D32" />
                  <span>Recovery link verified. Choose your new password below.</span>
                </div>
              ) : (
                <div className="form-group">
                  <label className="form-label">Recovery Code or Link Token</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Enter 6-digit code or paste recovery token"
                    value={token}
                    onChange={(e) => setToken(e.target.value.trim())}
                    required
                    autoFocus
                  />
                  <span className="form-hint">
                    Enter the 6-digit code sent to your email address.
                  </span>
                </div>
              )}

              <div className="form-group">
                <label className="form-label">New Password</label>
                <div style={styles.passwordWrapper}>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    className="form-input"
                    placeholder="Enter new password (min. 6 characters)"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                    minLength={6}
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    style={styles.eyeBtn}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
                <span className="form-hint">At least 6 characters required.</span>
              </div>

              <div className="form-group">
                <label className="form-label">Confirm New Password</label>
                <div style={styles.passwordWrapper}>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    className="form-input"
                    placeholder="Re-enter your new password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    minLength={6}
                  />
                </div>
              </div>

              <div style={{ marginTop: '28px' }}>
                <Button
                  type="submit"
                  variant="primary"
                  size="lg"
                  loading={loading}
                  icon={<KeyRound size={18} />}
                  style={{ width: '100%' }}
                >
                  Update Password
                </Button>
              </div>

              <div style={{ textAlign: 'center', marginTop: '20px' }}>
                <Link to="/login" style={styles.backLink}>
                  <ArrowLeft size={16} style={{ marginRight: '6px' }} />
                  Back to Sign In
                </Link>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

const styles = {
  page: {
    padding: '60px 0 100px 0',
    display: 'flex',
    alignItems: 'center',
    minHeight: 'calc(100vh - 72px - 280px)',
  },
  container: {
    maxWidth: '460px',
  },
  card: {
    padding: '40px 36px',
    backgroundColor: '#FFFFFF',
    borderRadius: '16px',
    border: '1px solid #EADBCE',
    boxShadow: '0 4px 24px rgba(0, 0, 0, 0.04)',
  },
  header: {
    textAlign: 'center',
    marginBottom: '28px',
  },
  iconBadge: {
    width: '48px',
    height: '48px',
    borderRadius: '12px',
    backgroundColor: '#E05D38',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: '16px',
    boxShadow: '0 4px 12px rgba(224, 93, 56, 0.3)',
  },
  title: {
    fontSize: '1.6rem',
    fontWeight: '700',
    color: '#191716',
    margin: '0 0 8px 0',
  },
  subtitle: {
    fontSize: '0.94rem',
    color: '#736B63',
    lineHeight: '1.5',
    margin: 0,
  },
  passwordWrapper: {
    position: 'relative',
  },
  eyeBtn: {
    position: 'absolute',
    right: '12px',
    top: '50%',
    transform: 'translateY(-50%)',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    color: '#8C827A',
    padding: '4px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  backLink: {
    display: 'inline-flex',
    alignItems: 'center',
    color: '#736B63',
    fontSize: '0.88rem',
    fontWeight: '500',
    textDecoration: 'none',
    transition: 'color 0.2s',
  },
};

export default ResetPasswordPage;
