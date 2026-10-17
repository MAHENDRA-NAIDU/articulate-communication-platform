import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { LogIn, Eye, EyeOff, Mic, KeyRound, Mail, CheckCircle, AlertCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { authService } from '../services/authService';
import { Button } from '../components/common/Button';
import { Modal } from '../components/common/Modal';

export const LoginPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, googleSignIn } = useAuth();
  const { success, error, info } = useToast();

  const [identifier, setIdentifier] = useState(location.state?.identifier || '');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [unverifiedEmail, setUnverifiedEmail] = useState('');

  // Google Sign-In State
  const googleBtnRef = useRef(null);
  const [googleLoading, setGoogleLoading] = useState(false);
  const rawClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
  const googleClientId = typeof rawClientId === 'string' ? rawClientId.trim() : '';
  const isGoogleConfigured = Boolean(
    googleClientId &&
    !googleClientId.includes('your_google_client_id') &&
    googleClientId !== 'undefined'
  );

  // Forgot Password Recovery State
  const [forgotModalOpen, setForgotModalOpen] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotSubmitted, setForgotSubmitted] = useState(false);
  const [forgotError, setForgotError] = useState('');

  const from = location.state?.from?.pathname || '/explore';

  // Handle verified notice from registration
  useEffect(() => {
    if (location.state?.verifiedNotice) {
      info('Your email has been verified. Please sign in to continue.');
    }
  }, [location.state]);

  // Initialize Google Identity Services
  useEffect(() => {
    if (!isGoogleConfigured) return;

    let attempts = 0;
    const interval = setInterval(() => {
      attempts++;
      if (window.google?.accounts?.id && googleBtnRef.current) {
        clearInterval(interval);
        try {
          window.google.accounts.id.initialize({
            client_id: googleClientId,
            callback: handleGoogleCredentialResponse,
          });
          const containerWidth = googleBtnRef.current.offsetWidth || 360;
          const safeWidth = Math.min(400, Math.max(200, containerWidth));
          window.google.accounts.id.renderButton(googleBtnRef.current, {
            theme: 'outline',
            size: 'large',
            width: safeWidth,
            text: 'continue_with',
            shape: 'rectangular',
            logo_alignment: 'left',
          });
        } catch (err) {
          console.warn('[Google GIS] Render notice:', err.message);
        }
      }
      if (attempts > 50) clearInterval(interval);
    }, 150);

    return () => clearInterval(interval);
  }, [isGoogleConfigured, googleClientId]);

  const handleGoogleCredentialResponse = async (response) => {
    try {
      setGoogleLoading(true);
      const data = await googleSignIn(response.credential);
      if (data.success) {
        success(`Welcome, ${data.user.name.split(' ')[0]}!`);
        navigate(from, { replace: true });
      }
    } catch (err) {
      error(err.message || 'Google sign-in failed. Please try again.');
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleGoogleFallbackClick = () => {
    info(
      'Google Sign-In is configured on the backend. Add your Google Cloud Client ID to VITE_GOOGLE_CLIENT_ID in client/.env to activate the button.'
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!identifier.trim() || !password) return;

    try {
      setLoading(true);
      setUnverifiedEmail('');
      const data = await login({
        identifier: identifier.trim(),
        password,
      });

      if (data.success) {
        success(`Welcome back, ${data.user.name.split(' ')[0]}!`);
        navigate(from, { replace: true });
      }
    } catch (err) {
      if (err.pendingVerification || (err.message && err.message.toLowerCase().includes('verify your email'))) {
        setUnverifiedEmail(err.email || identifier.trim());
      }
      error(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotSubmit = async (e) => {
    e.preventDefault();
    if (!forgotEmail.trim()) return;

    try {
      setForgotLoading(true);
      setForgotError('');
      await authService.forgotPassword(forgotEmail.trim());
      setForgotSubmitted(true);
    } catch (err) {
      setForgotError(err.message || 'Unable to request password recovery. Please try again.');
    } finally {
      setForgotLoading(false);
    }
  };

  return (
    <div style={styles.page}>
      <div className="container-narrow" style={styles.container}>
        <div className="card" style={styles.card}>
          {/* Header */}
          <div style={styles.header}>
            <div style={styles.logoBadge}>
              <Mic size={20} color="#FFFFFF" />
            </div>
            <h1 className="heading-display" style={styles.title}>
              Sign In to Articulate
            </h1>
            <p style={styles.subtitle}>
              Access your communication practice dashboard and personalized feedback.
            </p>
          </div>

          {/* Unverified Email Warning Banner */}
          {unverifiedEmail && (
            <div style={styles.unverifiedBanner}>
              <AlertCircle size={18} color="#D97706" style={{ flexShrink: 0, marginTop: '2px' }} />
              <div>
                <strong style={{ color: '#92400E', display: 'block', marginBottom: '4px' }}>
                  Email Verification Required
                </strong>
                <p style={{ margin: 0, fontSize: '0.85rem', color: '#B45309', lineHeight: '1.4' }}>
                  Please verify your email before logging in.
                </p>
                <div style={{ marginTop: '8px' }}>
                  <Link
                    to="/register"
                    style={{ fontSize: '0.84rem', fontWeight: '700', color: '#92400E', textDecoration: 'underline' }}
                  >
                    Enter verification code or resend →
                  </Link>
                </div>
              </div>
            </div>
          )}

          {/* Google Sign-In Option */}
          <div style={{ marginBottom: '20px' }}>
            {isGoogleConfigured ? (
              <div
                id="googleSignInBtn"
                ref={googleBtnRef}
                style={{ minHeight: '44px', display: 'flex', justifyContent: 'center' }}
              />
            ) : (
              <button
                type="button"
                onClick={handleGoogleFallbackClick}
                style={styles.googleCustomBtn}
              >
                <svg width="18" height="18" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
                <span>Continue with Google</span>
              </button>
            )}
          </div>

          {/* Divider */}
          <div style={styles.divider}>
            <span style={styles.dividerLine} />
            <span style={styles.dividerText}>or continue with email</span>
            <span style={styles.dividerLine} />
          </div>

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">Email or Username</label>
              <input
                type="text"
                className="form-input"
                placeholder="Enter email or username"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                required
                autoFocus={!location.state?.identifier}
              />
            </div>

            <div className="form-group">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <label className="form-label">Password</label>
                <button
                  type="button"
                  onClick={() => {
                    setForgotEmail(identifier.includes('@') ? identifier.trim() : '');
                    setForgotSubmitted(false);
                    setForgotError('');
                    setForgotModalOpen(true);
                  }}
                  style={styles.forgotBtn}
                >
                  Forgot Password?
                </button>
              </div>

              <div style={styles.passwordWrapper}>
                <input
                  type={showPassword ? 'text' : 'password'}
                  className="form-input"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
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
            </div>

            <div style={{ marginTop: '24px' }}>
              <Button
                type="submit"
                variant="primary"
                size="lg"
                loading={loading}
                icon={<LogIn size={18} />}
                style={{ width: '100%' }}
              >
                Sign In
              </Button>
            </div>
          </form>

          <div style={styles.footer}>
            <p style={styles.footerText}>
              Don't have an account yet?{' '}
              <Link to="/register" style={styles.footerLink}>
                Register here
              </Link>
            </p>
          </div>
        </div>
      </div>

      {/* Secure Password Recovery Modal */}
      <Modal
        isOpen={forgotModalOpen}
        onClose={() => setForgotModalOpen(false)}
        title={forgotSubmitted ? 'Check Your Inbox' : 'Reset Your Password'}
        subtitle={
          forgotSubmitted
            ? 'Password recovery instructions have been dispatched.'
            : 'Enter your registered email address and we will send you a secure recovery link.'
        }
      >
        {forgotSubmitted ? (
          <div style={{ textAlign: 'center', padding: '12px 0 8px 0' }}>
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
            <p style={{ fontSize: '0.96rem', color: '#191716', lineHeight: '1.6', margin: '0 0 16px 0' }}>
              If an account is associated with <strong>{forgotEmail}</strong>, you will receive a secure password recovery link shortly.
            </p>
            <div
              style={{
                padding: '14px',
                backgroundColor: '#FAF7F2',
                borderRadius: '10px',
                border: '1px solid #EADBCE',
                fontSize: '0.85rem',
                color: '#736B63',
                lineHeight: '1.5',
                textAlign: 'left',
                marginBottom: '24px',
              }}
            >
              <strong>Security Note:</strong> The link will expire in 15 minutes. Please check your spam folder if you do not receive it within a few minutes.
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <Button
                type="button"
                variant="primary"
                onClick={() => setForgotModalOpen(false)}
              >
                Return to Sign In
              </Button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleForgotSubmit}>
            {forgotError && (
              <div
                style={{
                  padding: '12px',
                  backgroundColor: '#FDECEA',
                  color: '#C62828',
                  borderRadius: '8px',
                  fontSize: '0.88rem',
                  marginBottom: '16px',
                  border: '1px solid #F5C6CB',
                }}
              >
                {forgotError}
              </div>
            )}
            <div className="form-group">
              <label className="form-label">Account Email Address</label>
              <input
                type="email"
                className="form-input"
                placeholder="name@example.com"
                value={forgotEmail}
                onChange={(e) => setForgotEmail(e.target.value)}
                required
                autoFocus
              />
              <span className="form-hint">
                A single-use, time-limited recovery link will be sent to this email.
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '24px' }}>
              <Button
                type="button"
                variant="outline"
                onClick={() => setForgotModalOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                loading={forgotLoading}
                icon={<Mail size={16} />}
              >
                Send Recovery Link
              </Button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
};

const styles = {
  page: {
    padding: '60px 0 100px 0',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  container: {
    maxWidth: '460px',
  },
  card: {
    padding: '40px 36px',
    backgroundColor: '#FFFFFF',
  },
  header: {
    textAlign: 'center',
    marginBottom: '24px',
  },
  logoBadge: {
    width: '42px',
    height: '42px',
    borderRadius: '12px',
    backgroundColor: '#E05D38',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    margin: '0 auto 16px auto',
  },
  title: {
    fontSize: '1.8rem',
    color: '#1C1917',
    marginBottom: '8px',
  },
  subtitle: {
    fontSize: '0.92rem',
    color: '#6E675F',
  },
  unverifiedBanner: {
    display: 'flex',
    gap: '12px',
    padding: '12px 14px',
    backgroundColor: '#FEF3C7',
    border: '1px solid #FCD34D',
    borderRadius: '10px',
    marginBottom: '20px',
  },
  googleCustomBtn: {
    width: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '10px',
    padding: '11px 16px',
    backgroundColor: '#FFFFFF',
    border: '1px solid #D1D5DB',
    borderRadius: '8px',
    fontSize: '0.92rem',
    fontWeight: '600',
    color: '#374151',
    cursor: 'pointer',
    transition: 'background-color 0.15s, border-color 0.15s',
  },
  divider: {
    display: 'flex',
    alignItems: 'center',
    margin: '20px 0',
    gap: '12px',
  },
  dividerLine: {
    flex: 1,
    height: '1px',
    backgroundColor: '#E5E7EB',
  },
  dividerText: {
    fontSize: '0.78rem',
    color: '#9CA3AF',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    fontWeight: '600',
  },
  forgotBtn: {
    background: 'none',
    border: 'none',
    color: '#E05D38',
    fontSize: '0.82rem',
    fontWeight: '600',
    cursor: 'pointer',
    padding: 0,
    transition: 'opacity 0.15s',
  },
  passwordWrapper: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
  },
  eyeBtn: {
    position: 'absolute',
    right: '12px',
    background: 'none',
    border: 'none',
    color: '#8C827A',
    cursor: 'pointer',
    padding: '4px',
  },
  footer: {
    textAlign: 'center',
    marginTop: '24px',
    paddingTop: '20px',
    borderTop: '1px solid #F3ECE1',
  },
  footerText: {
    fontSize: '0.9rem',
    color: '#6E675F',
  },
  footerLink: {
    fontWeight: '700',
    color: '#E05D38',
  },
};
