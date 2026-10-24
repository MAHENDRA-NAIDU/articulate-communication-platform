import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { UserPlus, Eye, EyeOff, Mic, KeyRound, Mail, ArrowLeft, RotateCw, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { authService } from '../services/authService';
import { Button } from '../components/common/Button';

export const RegisterPage = () => {
  const navigate = useNavigate();
  const { register } = useAuth();
  const { success, error } = useToast();

  // Registration step: 'form' | 'verify'
  const [step, setStep] = useState('form');

  // Form State
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [adminSecret, setAdminSecret] = useState('');
  const [showAdminField, setShowAdminField] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  // OTP Verification State
  const [pendingEmail, setPendingEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [verifyLoading, setVerifyLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [resendTimer, setResendTimer] = useState(60);
  const [bounceError, setBounceError] = useState(null);

  // Countdown timer for OTP resend
  useEffect(() => {
    let interval = null;
    if (step === 'verify' && resendTimer > 0) {
      interval = setInterval(() => {
        setResendTimer((prev) => prev - 1);
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [step, resendTimer]);

  const handleRegisterSubmit = async (e) => {
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
      const cleanEmail = email.trim().toLowerCase();
      const data = await register({
        name: name.trim(),
        username: username.trim().toLowerCase(),
        email: cleanEmail,
        password,
        confirmPassword,
        adminSecret: showAdminField && adminSecret.trim() ? adminSecret.trim() : undefined,
      });

      if (data.pendingVerification || data.success) {
        setPendingEmail(data.email || cleanEmail);
        setStep('verify');
        setResendTimer(60);
        setOtp('');
        setBounceError(null);
        success(data.message || 'Verification code dispatched. Please check your inbox.');
      }
    } catch (err) {
      error(err.message || 'Registration failed. Please check your inputs.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifySubmit = async (e) => {
    e.preventDefault();

    const cleanOtp = otp.trim();
    if (!cleanOtp || cleanOtp.length !== 6) {
      error('Please enter the complete 6-digit verification code.');
      return;
    }

    try {
      setVerifyLoading(true);
      const data = await authService.verifyEmail({
        email: pendingEmail,
        otp: cleanOtp,
      });

      if (data.success) {
        success('Email verified successfully! You can now sign in.');
        navigate('/login', {
          state: {
            identifier: pendingEmail,
            verifiedNotice: true,
          },
        });
      }
    } catch (err) {
      if (err.data?.bounced) {
        setBounceError(err.message);
      }
      error(err.message || 'Verification failed. Please check your code.');
    } finally {
      setVerifyLoading(false);
    }
  };

  const handleResendOTP = async () => {
    if (resendTimer > 0 || resendLoading) return;

    try {
      setResendLoading(true);
      const data = await authService.resendOTP(pendingEmail);
      setBounceError(null);
      success(data.message || 'A fresh verification code has been dispatched.');
      setResendTimer(60);
      setOtp('');
    } catch (err) {
      if (err.data?.bounced) {
        setBounceError(err.message);
      }
      error(err.message || 'Unable to resend code. Please verify your email address.');
    } finally {
      setResendLoading(false);
    }
  };

  return (
    <div style={styles.page}>
      <div className="container-narrow" style={styles.container}>
        <div className="card" style={styles.card}>
          {step === 'form' ? (
            <>
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

              <form onSubmit={handleRegisterSubmit}>
                {/* Full Name */}
                <div className="form-group">
                  <label className="form-label">Full Name</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. Enter Your Name"
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
                    placeholder="e.g. Enter Your Username"
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
                    placeholder="e.g. email@gmail.com"
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
            </>
          ) : (
            <>
              {/* Step 2: Email OTP Verification */}
              <div style={styles.header}>
                <div style={{ ...styles.logoBadge, backgroundColor: '#2E7D32' }}>
                  <Mail size={22} color="#FFFFFF" />
                </div>
                <h1 className="heading-display" style={styles.title}>
                  Verify Your Email
                </h1>
                <p style={styles.subtitle}>
                  We dispatched a 6-digit verification code to{' '}
                  <strong style={{ color: '#1C1917' }}>{pendingEmail}</strong>.
                  If this mailbox exists, check your inbox and spam folder to activate your account.
                </p>
              </div>

              {bounceError && (
                <div style={styles.bounceAlert}>
                  <p style={{ fontWeight: '600', color: '#B91C1C', marginBottom: '4px' }}>Delivery Notice</p>
                  <p style={{ fontSize: '0.84rem', color: '#7F1D1D', margin: 0 }}>{bounceError}</p>
                </div>
              )}

              <form onSubmit={handleVerifySubmit}>
                <div className="form-group" style={{ textAlign: 'center' }}>
                  <label className="form-label" style={{ marginBottom: '12px' }}>
                    6-Digit Verification Code
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    maxLength={6}
                    className="form-input"
                    placeholder="000000"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/[^0-9]/g, ''))}
                    required
                    autoFocus
                    style={styles.otpInput}
                  />
                  <span className="form-hint" style={{ marginTop: '10px', display: 'block' }}>
                    Code expires in 10 minutes. Check your spam folder if you don't see it.
                  </span>
                </div>

                <div style={{ marginTop: '24px' }}>
                  <Button
                    type="submit"
                    variant="primary"
                    size="lg"
                    loading={verifyLoading}
                    icon={<CheckCircle2 size={18} />}
                    style={{ width: '100%' }}
                  >
                    Verify & Activate Account
                  </Button>
                </div>
              </form>

              {/* Resend & Back Section */}
              <div style={styles.resendSection}>
                <div style={{ marginBottom: '16px' }}>
                  {resendTimer > 0 ? (
                    <span style={styles.timerText}>
                      Resend code available in <strong>{resendTimer}s</strong>
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={handleResendOTP}
                      disabled={resendLoading}
                      style={styles.resendBtn}
                    >
                      <RotateCw size={14} className={resendLoading ? 'spin' : ''} />
                      <span>{resendLoading ? 'Sending...' : 'Resend Verification Code'}</span>
                    </button>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => setStep('form')}
                  style={styles.backBtn}
                >
                  <ArrowLeft size={14} />
                  <span>Edit Registration Details</span>
                </button>
              </div>
            </>
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
    width: '46px',
    height: '46px',
    borderRadius: '14px',
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
  otpInput: {
    fontSize: '1.8rem',
    fontWeight: '700',
    letterSpacing: '8px',
    textAlign: 'center',
    padding: '12px',
    maxWidth: '240px',
    margin: '0 auto',
    fontFamily: 'monospace',
    border: '2px solid #EADBCE',
    borderRadius: '12px',
    backgroundColor: '#FAF7F2',
  },
  resendSection: {
    textAlign: 'center',
    marginTop: '28px',
    paddingTop: '20px',
    borderTop: '1px solid #F3ECE1',
  },
  timerText: {
    fontSize: '0.88rem',
    color: '#8C827A',
  },
  resendBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    background: 'none',
    border: 'none',
    color: '#E05D38',
    fontSize: '0.88rem',
    fontWeight: '700',
    cursor: 'pointer',
    padding: '6px 12px',
    borderRadius: '6px',
  },
  backBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    background: 'none',
    border: 'none',
    color: '#6E675F',
    fontSize: '0.85rem',
    cursor: 'pointer',
    padding: '4px 8px',
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
  bounceAlert: {
    backgroundColor: '#FEF2F2',
    border: '1px solid #FCA5A5',
    borderRadius: '8px',
    padding: '12px 14px',
    marginBottom: '20px',
    textAlign: 'left',
  },
};
