import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { LogIn, Eye, EyeOff, Mic, KeyRound } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { authService } from '../services/authService';
import { Button } from '../components/common/Button';
import { Modal } from '../components/common/Modal';

export const LoginPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();
  const { success, error } = useToast();

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  // Forgot Password State
  const [forgotModalOpen, setForgotModalOpen] = useState(false);
  const [forgotIdentifier, setForgotIdentifier] = useState('');
  const [forgotNewPassword, setForgotNewPassword] = useState('');
  const [forgotConfirmPassword, setForgotConfirmPassword] = useState('');
  const [showForgotPass, setShowForgotPass] = useState(false);
  const [forgotLoading, setForgotLoading] = useState(false);

  const from = location.state?.from?.pathname || '/explore';

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!identifier.trim() || !password) return;

    try {
      setLoading(true);
      const data = await login({
        identifier: identifier.trim(),
        password,
      });

      if (data.success) {
        success(`Welcome back, ${data.user.name.split(' ')[0]}!`);
        navigate(from, { replace: true });
      }
    } catch (err) {
      error(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();

    if (!forgotIdentifier.trim() || !forgotNewPassword) {
      error('Please fill in all fields.');
      return;
    }

    if (forgotNewPassword.length < 6) {
      error('New password must be at least 6 characters long.');
      return;
    }

    if (forgotNewPassword !== forgotConfirmPassword) {
      error('Passwords do not match. Please verify your new password.');
      return;
    }

    try {
      setForgotLoading(true);
      const data = await authService.resetPassword({
        identifier: forgotIdentifier.trim(),
        newPassword: forgotNewPassword,
        confirmPassword: forgotConfirmPassword,
      });

      if (data.success) {
        success(data.message || 'Password reset successfully! Please sign in.');
        setIdentifier(forgotIdentifier.trim());
        setForgotModalOpen(false);
        setForgotIdentifier('');
        setForgotNewPassword('');
        setForgotConfirmPassword('');
      }
    } catch (err) {
      error(err.message || 'Failed to reset password. Please check your email/username.');
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
              Enter your username or email address to access your speaking practice account.
            </p>
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
                autoFocus
              />
            </div>

            <div className="form-group">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <label className="form-label">Password</label>
                <button
                  type="button"
                  onClick={() => {
                    setForgotIdentifier(identifier);
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

      {/* Forgot Password Modal */}
      <Modal
        isOpen={forgotModalOpen}
        onClose={() => setForgotModalOpen(false)}
        title="Reset Account Password"
        subtitle="Enter your username or email and choose a new password."
      >
        <form onSubmit={handleResetPassword}>
          <div className="form-group">
            <label className="form-label">Email or Username</label>
            <input
              type="text"
              className="form-input"
              placeholder="e.g. mahendra or mahendra@example.com"
              value={forgotIdentifier}
              onChange={(e) => setForgotIdentifier(e.target.value)}
              required
              autoFocus
            />
          </div>

          <div className="form-group">
            <label className="form-label">New Password</label>
            <div style={styles.passwordWrapper}>
              <input
                type={showForgotPass ? 'text' : 'password'}
                className="form-input"
                placeholder="At least 6 characters"
                value={forgotNewPassword}
                onChange={(e) => setForgotNewPassword(e.target.value)}
                required
                minLength={6}
              />
              <button
                type="button"
                onClick={() => setShowForgotPass(!showForgotPass)}
                style={styles.eyeBtn}
                aria-label="Toggle password visibility"
              >
                {showForgotPass ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Confirm New Password</label>
            <input
              type={showForgotPass ? 'text' : 'password'}
              className="form-input"
              placeholder="Re-enter your new password"
              value={forgotConfirmPassword}
              onChange={(e) => setForgotConfirmPassword(e.target.value)}
              required
              minLength={6}
            />
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
              icon={<KeyRound size={16} />}
            >
              Reset Password
            </Button>
          </div>
        </form>
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
    marginBottom: '28px',
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
