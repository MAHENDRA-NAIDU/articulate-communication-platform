import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { UserPlus, Eye, EyeOff, Mic, ShieldAlert, KeyRound } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Button } from '../components/common/Button';

export const RegisterPage = () => {
  const navigate = useNavigate();
  const { register } = useAuth();
  const { success, error } = useToast();

  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [adminSecret, setAdminSecret] = useState('');
  const [showAdminField, setShowAdminField] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!name.trim() || !username.trim() || !email.trim() || !password) {
      error('Please fill out all required fields.');
      return;
    }

    if (password.length < 6) {
      error('Password must be at least 6 characters long.');
      return;
    }

    if (password !== confirmPassword) {
      error('Passwords do not match. Please verify your password.');
      return;
    }

    try {
      setLoading(true);
      const data = await register({
        name: name.trim(),
        username: username.trim().toLowerCase(),
        email: email.trim().toLowerCase(),
        password,
        confirmPassword,
        adminSecret: showAdminField && adminSecret.trim() ? adminSecret.trim() : undefined,
      });

      if (data.success) {
        success('Account created successfully! Welcome to Articulate.');
        navigate('/explore');
      }
    } catch (err) {
      error(err.message || 'Registration failed. Please check your inputs.');
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
            <div style={styles.logoBadge}>
              <Mic size={20} color="#FFFFFF" />
            </div>
            <h1 className="heading-display" style={styles.title}>
              Create Your Account
            </h1>
            <p style={styles.subtitle}>
              Join a warm, focused community to practice speaking and receive constructive feedback.
            </p>
          </div>

          <form onSubmit={handleSubmit}>
            {/* Full Name */}
            <div className="form-group">
              <label className="form-label">Full Name</label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g. Mahendra Rao"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                maxLength={60}
              />
            </div>

            {/* Username */}
            <div className="form-group">
              <label className="form-label">Username</label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g. mahendra"
                value={username}
                onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                required
                minLength={3}
                maxLength={30}
              />
              <span className="form-hint">Only letters, numbers, and underscores allowed.</span>
            </div>

            {/* Email */}
            <div className="form-group">
              <label className="form-label">Email Address</label>
              <input
                type="email"
                className="form-input"
                placeholder="e.g. mahendra@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            {/* Password */}
            <div className="form-group">
              <label className="form-label">Password</label>
              <div style={styles.passwordWrapper}>
                <input
                  type={showPassword ? 'text' : 'password'}
                  className="form-input"
                  placeholder="At least 6 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
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

            {/* Confirm Password */}
            <div className="form-group">
              <label className="form-label">Confirm Password</label>
              <input
                type={showPassword ? 'text' : 'password'}
                className="form-input"
                placeholder="Re-enter your password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />
            </div>

            {/* Admin Invite Key Toggle */}
            <div style={styles.adminKeySection}>
              <button
                type="button"
                onClick={() => setShowAdminField(!showAdminField)}
                style={styles.adminKeyToggle}
              >
                <KeyRound size={14} color="#8C827A" />
                <span>{showAdminField ? 'Hide Administrator key field' : 'Have an Admin Invite key?'}</span>
              </button>

              {showAdminField && (
                <div className="form-group" style={{ marginTop: '10px' }}>
                  <input
                    type="password"
                    className="form-input"
                    placeholder="Enter Server Admin Invite Secret"
                    value={adminSecret}
                    onChange={(e) => setAdminSecret(e.target.value)}
                  />
                  <span className="form-hint">
                    Validated securely on the backend. Only for authorized system moderators.
                  </span>
                </div>
              )}
            </div>

            <div style={{ marginTop: '24px' }}>
              <Button
                type="submit"
                variant="primary"
                size="lg"
                loading={loading}
                icon={<UserPlus size={18} />}
                style={{ width: '100%' }}
              >
                Create Account
              </Button>
            </div>
          </form>

          <div style={styles.footer}>
            <p style={styles.footerText}>
              Already have an account?{' '}
              <Link to="/login" style={styles.footerLink}>
                Sign in here
              </Link>
            </p>
          </div>
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
    justifyContent: 'center',
  },
  container: {
    maxWidth: '500px',
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
    lineHeight: '1.5',
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
  adminKeySection: {
    marginTop: '6px',
    marginBottom: '16px',
  },
  adminKeyToggle: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    background: 'none',
    border: 'none',
    color: '#8C827A',
    fontSize: '0.82rem',
    cursor: 'pointer',
    fontWeight: '600',
    padding: '4px 0',
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
