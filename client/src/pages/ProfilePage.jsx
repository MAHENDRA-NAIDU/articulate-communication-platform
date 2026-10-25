import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  Calendar,
  Video,
  MessageSquare,
  Edit2,
  Trash2,
  Sparkles,
  PlusCircle,
  ShieldCheck,
  Award,
  Camera,
  UploadCloud,
  Image,
  KeyRound,
  Eye,
  EyeOff,
  Mail,
  CheckCircle,
  RefreshCw,
} from 'lucide-react';
import { userService } from '../services/userService';
import { authService } from '../services/authService';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { VideoCard } from '../components/video/VideoCard';
import { ProfileSkeleton, VideoGridSkeleton } from '../components/common/LoadingSkeleton';
import { Modal } from '../components/common/Modal';
import { EmptyState } from '../components/common/EmptyState';
import { Button } from '../components/common/Button';

export const ProfilePage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user: currentUser, updateUser, logout, isAdmin } = useAuth();
  const { success, error } = useToast();

  const [profileData, setProfileData] = useState(null);
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);

  // Edit Modal State
  const avatarInputRef = useRef(null);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editName, setEditName] = useState('');
  const [editUsername, setEditUsername] = useState('');
  const [editBio, setEditBio] = useState('');
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);

  // Delete Account Modal State
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deletingAccount, setDeletingAccount] = useState(false);

  // Change Password Modal State
  const [passwordModalOpen, setPasswordModalOpen] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPasswords, setShowPasswords] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);

  // Forgot Password Recovery State (from Profile)
  const [forgotModalOpen, setForgotModalOpen] = useState(false);
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotSuccess, setForgotSuccess] = useState(false);
  const [forgotCooldown, setForgotCooldown] = useState(0);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const data = await userService.getUserProfile(id);
      if (data.success && data.user) {
        setProfileData(data.user);
        setVideos(data.videos || []);
        setEditName(data.user.name);
        setEditUsername(data.user.username);
        setEditBio(data.user.bio || '');
        setAvatarPreview(data.user.profileImage || '');
      }
    } catch (err) {
      error(err.message || 'Unable to load user profile.');
      navigate('/');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) {
      fetchProfile();
    }
  }, [id]);

  const isOwner = currentUser && (currentUser._id === profileData?._id || isAdmin);

  const handleAvatarFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      error('Please select a valid image file (JPG, PNG, WEBP).');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      error('Image file is too large. Maximum size is 5MB.');
      return;
    }

    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
  };

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    if (!editName.trim()) return;

    try {
      setSavingProfile(true);
      const formData = new FormData();
      formData.append('name', editName.trim());
      if (editUsername.trim()) {
        formData.append('username', editUsername.trim().toLowerCase().replace(/^@/, ''));
      }
      formData.append('bio', editBio.trim());
      if (avatarFile) {
        formData.append('avatar', avatarFile);
      }

      const data = await userService.updateUserProfile(profileData._id, formData);

      if (data.success && data.user) {
        setProfileData((prev) => ({
          ...prev,
          name: data.user.name,
          username: data.user.username,
          bio: data.user.bio,
          profileImage: data.user.profileImage,
        }));

        if (currentUser && currentUser._id === profileData._id) {
          updateUser(data.user);
        }

        setEditModalOpen(false);
        setAvatarFile(null);
        success('Profile updated successfully!');
      }
    } catch (err) {
      error(err.message || 'Failed to update profile.');
    } finally {
      setSavingProfile(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (!currentPassword || !newPassword) {
      error('Please provide current and new password.');
      return;
    }
    if (newPassword.length < 6) {
      error('New password must be at least 6 characters long.');
      return;
    }
    if (newPassword !== confirmPassword) {
      error('New passwords do not match.');
      return;
    }

    try {
      setSavingPassword(true);
      const data = await authService.changePassword({
        currentPassword,
        newPassword,
        confirmPassword,
      });

      if (data.success) {
        success('Password updated successfully!');
        setPasswordModalOpen(false);
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      }
    } catch (err) {
      error(err.message || 'Failed to update password. Please verify current password.');
    } finally {
      setSavingPassword(false);
    }
  };

  // Cooldown timer for resending recovery email
  useEffect(() => {
    let timer;
    if (forgotCooldown > 0) {
      timer = setTimeout(() => setForgotCooldown(forgotCooldown - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [forgotCooldown]);

  const handleProfileForgotPassword = async () => {
    const targetEmail = currentUser?.email || profileData?.email;
    if (!targetEmail) {
      error('User email address is unavailable.');
      return;
    }

    try {
      setForgotLoading(true);
      const data = await authService.forgotPassword(targetEmail);
      if (data.success) {
        setForgotSuccess(true);
        setForgotCooldown(60);
        success('Password recovery email dispatched! Please check your inbox.');
      } else {
        error(data.message || 'Unable to send recovery email. Please try again.');
      }
    } catch (err) {
      error(err.message || 'Failed to send recovery email. Please try again later.');
    } finally {
      setForgotLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    try {
      setDeletingAccount(true);
      const data = await userService.deleteUserAccount(profileData._id);
      if (data.success) {
        success('Account and all practice drills were removed.');
        if (currentUser && currentUser._id === profileData._id) {
          await logout();
          navigate('/');
        } else {
          navigate('/admin');
        }
      }
    } catch (err) {
      error(err.message || 'Failed to delete account.');
    } finally {
      setDeletingAccount(false);
    }
  };

  if (loading) {
    return <ProfileSkeleton />;
  }

  if (!profileData) return null;

  return (
    <div style={styles.page}>
      <div className="container" style={styles.container}>
        {/* Profile Card Header */}
        <div className="card" style={styles.profileCard}>
          <div style={styles.profileHeaderContent}>
            {/* Avatar */}
            <div style={styles.avatarWrapper}>
              {profileData.profileImage ? (
                <img
                  src={profileData.profileImage}
                  alt={profileData.name}
                  referrerPolicy="no-referrer"
                  style={styles.avatarImg}
                />
              ) : (
                <div style={styles.avatarFallback}>
                  {profileData.name?.charAt(0).toUpperCase() || 'U'}
                </div>
              )}
            </div>

            {/* Info */}
            <div style={styles.profileInfo}>
              <div style={styles.nameRow}>
                <h1 style={styles.profileName}>{profileData.name}</h1>
                {profileData.role === 'admin' && (
                  <span className="badge-role-admin" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                    <ShieldCheck size={12} /> Administrator
                  </span>
                )}
              </div>
              <div style={styles.username}>@{profileData.username}</div>

              {profileData.bio && <p style={styles.bio}>{profileData.bio}</p>}

              <div style={styles.metaRow}>
                <span style={styles.metaItem}>
                  <Calendar size={15} /> Joined{' '}
                  {new Date(profileData.createdAt).toLocaleDateString('en-US', {
                    month: 'long',
                    year: 'numeric',
                  })}
                </span>
              </div>
            </div>

            {/* Actions for Profile Owner */}
            {isOwner && (
              <div style={styles.ownerActions}>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setEditModalOpen(true)}
                  icon={<Edit2 size={14} />}
                >
                  Edit Profile
                </Button>
                {currentUser && currentUser._id === profileData._id && (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPasswordModalOpen(true)}
                      icon={<KeyRound size={14} />}
                    >
                      Change Password
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setForgotModalOpen(true);
                        setForgotSuccess(false);
                      }}
                      icon={<Mail size={14} />}
                    >
                      Forgot Password?
                    </Button>
                  </>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setDeleteModalOpen(true)}
                  style={{ color: '#D32F2F' }}
                  icon={<Trash2 size={14} />}
                >
                  Delete Account
                </Button>
              </div>
            )}
          </div>

          {/* Stats Bar */}
          <div style={styles.statsBar}>
            <div style={styles.statBox}>
              <span style={styles.statNumber}>{videos.length}</span>
              <span style={styles.statLabel}>Speaking Videos</span>
            </div>
            <div style={styles.statDivider} />
            <div style={styles.statBox}>
              <span style={styles.statNumber}>
                {profileData.totalFeedbackReceived || 0}
              </span>
              <span style={styles.statLabel}>Feedback Received</span>
            </div>
            <div style={styles.statDivider} />
            <div style={styles.statBox}>
              <span style={styles.statNumber}>
                {videos.reduce((acc, v) => acc + (v.views || 0), 0)}
              </span>
              <span style={styles.statLabel}>Total Drill Views</span>
            </div>
          </div>
        </div>

        {/* Practice Videos Gallery */}
        <div style={styles.gallerySection}>
          <div style={styles.galleryHeader}>
            <h2 className="heading-display" style={styles.galleryTitle}>
              Practice Videos ({videos.length})
            </h2>
            {isOwner && (
              <Link to="/upload">
                <Button variant="primary" size="sm" icon={<PlusCircle size={15} />}>
                  Upload New Drill
                </Button>
              </Link>
            )}
          </div>

          {videos.length > 0 ? (
            <div className="grid-responsive">
              {videos.map((video) => (
                <VideoCard key={video._id} video={video} />
              ))}
            </div>
          ) : (
            <EmptyState
              icon={<Video size={30} color="#E05D38" />}
              title={isOwner ? 'You haven’t uploaded any videos yet' : 'No practice videos yet'}
              description={
                isOwner
                  ? 'Start building speaking confidence today! Upload a short 1–2 minute speaking drill.'
                  : `@${profileData.username} has not shared any public speaking videos yet.`
              }
              actionLabel={isOwner ? 'Upload Your First Video' : null}
              onAction={isOwner ? () => navigate('/upload') : null}
            />
          )}
        </div>
      </div>

      {/* Edit Profile Modal */}
      <Modal
        isOpen={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        title="Edit Profile"
        subtitle="Update your display name, bio, or avatar image."
      >
        <form onSubmit={handleUpdateProfile}>
          <div className="form-group">
            <label className="form-label">Full Name</label>
            <input
              type="text"
              className="form-input"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              required
              maxLength={60}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Username (@handle)</label>
            <input
              type="text"
              className="form-input"
              value={editUsername}
              onChange={(e) => setEditUsername(e.target.value.toLowerCase().replace(/\s+/g, ''))}
              required
              minLength={3}
              maxLength={30}
              placeholder="e.g. mahendra"
            />
            <span className="form-hint">3–30 characters, letters, numbers, and underscores only.</span>
          </div>

          <div className="form-group">
            <label className="form-label">Bio (Speaking Focus & Goals)</label>
            <textarea
              className="form-textarea"
              rows={3}
              value={editBio}
              onChange={(e) => setEditBio(e.target.value)}
              placeholder="e.g. Practicing conversational pacing, reducing hesitation, and preparing for tech interviews."
              maxLength={240}
            />
            <span className="form-hint">{editBio.length}/240 characters</span>
          </div>

          {/* Avatar File Picker */}
          <div className="form-group">
            <label className="form-label">Profile Photo</label>
            <div style={styles.avatarEditContainer}>
              <div style={styles.avatarPreviewWrapper}>
                {avatarPreview ? (
                  <img
                    src={avatarPreview}
                    alt="Avatar preview"
                    referrerPolicy="no-referrer"
                    style={styles.avatarPreviewImg}
                  />
                ) : (
                  <div style={styles.avatarPreviewFallback}>
                    {editName?.charAt(0).toUpperCase() || 'U'}
                  </div>
                )}
              </div>

              <div style={styles.avatarUploadActions}>
                <input
                  type="file"
                  ref={avatarInputRef}
                  onChange={handleAvatarFileSelect}
                  accept="image/png, image/jpeg, image/jpg, image/webp"
                  style={{ display: 'none' }}
                />
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => avatarInputRef.current?.click()}
                  icon={<Camera size={15} />}
                >
                  Choose Photo from Device
                </Button>
                <span className="form-hint" style={{ marginTop: '2px' }}>
                  Supports PNG, JPG, or WEBP (Max 5MB)
                </span>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '24px' }}>
            <Button
              variant="outline"
              type="button"
              onClick={() => setEditModalOpen(false)}
            >
              Cancel
            </Button>
            <Button variant="primary" type="submit" loading={savingProfile}>
              Save Profile
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Account Confirmation Modal */}
      <Modal
        isOpen={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        title="Delete Account?"
        subtitle="This action is permanent and cannot be undone."
      >
        <p style={{ color: '#57534E', fontSize: '0.94rem', lineHeight: '1.6', marginBottom: '20px' }}>
          Deleting this account will permanently remove all your uploaded speaking videos, comments, feedback records, and account profile from the platform.
        </p>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
          <Button
            variant="outline"
            onClick={() => setDeleteModalOpen(false)}
          >
            Cancel
          </Button>
          <Button
            variant="danger"
            onClick={handleDeleteAccount}
            loading={deletingAccount}
          >
            Yes, Permanently Delete Account
          </Button>
        </div>
      </Modal>

      {/* Change Password Modal */}
      <Modal
        isOpen={passwordModalOpen}
        onClose={() => {
          setPasswordModalOpen(false);
          setCurrentPassword('');
          setNewPassword('');
          setConfirmPassword('');
        }}
        title="Change Password"
        subtitle="Ensure your account stays secure with a strong password."
      >
        <form onSubmit={handleChangePassword}>
          {profileData.authProvider === 'google' && (
            <div
              style={{
                backgroundColor: '#FAF7F2',
                border: '1px solid #EADBCE',
                borderRadius: '8px',
                padding: '12px 14px',
                marginBottom: '16px',
                fontSize: '0.86rem',
                color: '#5C554E',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
              }}
            >
              <Mail size={16} color="#E05D38" style={{ flexShrink: 0 }} />
              <div>
                <span>You registered via Google. Don't have a current password? </span>
                <button
                  type="button"
                  onClick={() => {
                    setPasswordModalOpen(false);
                    setForgotModalOpen(true);
                    setForgotSuccess(false);
                  }}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#E05D38',
                    fontWeight: '600',
                    cursor: 'pointer',
                    padding: 0,
                    textDecoration: 'underline',
                  }}
                >
                  Set a password via email recovery
                </button>
              </div>
            </div>
          )}

          <div className="form-group">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <label className="form-label" style={{ margin: 0 }}>Current Password</label>
              <button
                type="button"
                onClick={() => {
                  setPasswordModalOpen(false);
                  setForgotModalOpen(true);
                  setForgotSuccess(false);
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#E05D38',
                  fontSize: '0.82rem',
                  fontWeight: '600',
                  cursor: 'pointer',
                  padding: 0,
                  textDecoration: 'underline',
                }}
              >
                Forgot Password?
              </button>
            </div>
            <div style={{ position: 'relative' }}>
              <input
                type={showPasswords ? 'text' : 'password'}
                className="form-input"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                required
                placeholder="Enter your current password"
                autoComplete="current-password"
                style={{ paddingRight: '40px' }}
              />
              <button
                type="button"
                onClick={() => setShowPasswords(!showPasswords)}
                style={{
                  position: 'absolute',
                  right: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: '#8C827A',
                  padding: 0,
                  display: 'flex',
                  alignItems: 'center',
                }}
                aria-label={showPasswords ? 'Hide password' : 'Show password'}
              >
                {showPasswords ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">New Password</label>
            <input
              type={showPasswords ? 'text' : 'password'}
              className="form-input"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              minLength={6}
              placeholder="Minimum 6 characters"
              autoComplete="new-password"
            />
            <span className="form-hint">At least 6 characters required.</span>
          </div>

          <div className="form-group">
            <label className="form-label">Confirm New Password</label>
            <input
              type={showPasswords ? 'text' : 'password'}
              className="form-input"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              minLength={6}
              placeholder="Confirm new password"
              autoComplete="new-password"
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '24px' }}>
            <Button
              variant="outline"
              type="button"
              onClick={() => {
                setPasswordModalOpen(false);
                setCurrentPassword('');
                setNewPassword('');
                setConfirmPassword('');
              }}
            >
              Cancel
            </Button>
            <Button variant="primary" type="submit" loading={savingPassword} icon={<KeyRound size={15} />}>
              Update Password
            </Button>
          </div>
        </form>
      </Modal>

      {/* Forgot Password Recovery Modal from Profile */}
      <Modal
        isOpen={forgotModalOpen}
        onClose={() => {
          setForgotModalOpen(false);
          setForgotSuccess(false);
        }}
        title="Reset Password via Email"
        subtitle="Recover your account or set a new password without needing your current password."
      >
        {forgotSuccess ? (
          <div style={{ textAlign: 'center', padding: '12px 0 6px 0' }}>
            <div
              style={{
                width: '52px',
                height: '52px',
                borderRadius: '50%',
                backgroundColor: '#E8F5E9',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '14px',
              }}
            >
              <CheckCircle size={28} color="#2E7D32" />
            </div>
            <h3 style={{ fontSize: '1.15rem', color: '#191716', margin: '0 0 8px 0' }}>
              Check Your Inbox
            </h3>
            <p style={{ color: '#5C554E', fontSize: '0.92rem', lineHeight: '1.6', margin: '0 0 20px 0' }}>
              A secure password recovery link has been sent to{' '}
              <strong>{currentUser?.email || profileData?.email}</strong>.
              The link is valid for 15 minutes and will allow you to choose a new password.
            </p>
            <div style={{ display: 'flex', justifyContent: 'center', gap: '12px' }}>
              <Button
                variant="outline"
                size="sm"
                onClick={handleProfileForgotPassword}
                loading={forgotLoading}
                disabled={forgotCooldown > 0}
                icon={<RefreshCw size={14} />}
              >
                {forgotCooldown > 0 ? `Resend link in ${forgotCooldown}s` : 'Resend Recovery Link'}
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={() => {
                  setForgotModalOpen(false);
                  setForgotSuccess(false);
                  navigate('/reset-password');
                }}
              >
                Enter Recovery Code
              </Button>
            </div>
          </div>
        ) : (
          <div>
            <p style={{ color: '#5C554E', fontSize: '0.93rem', lineHeight: '1.6', marginBottom: '18px' }}>
              We will send a single-use password recovery link to your registered email address:
            </p>
            <div
              style={{
                backgroundColor: '#FAF7F2',
                border: '1px solid #EADBCE',
                borderRadius: '10px',
                padding: '14px 16px',
                marginBottom: '20px',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
              }}
            >
              <Mail size={20} color="#E05D38" />
              <div>
                <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: '#8C827A', fontWeight: '700', letterSpacing: '0.5px' }}>
                  Registered Email
                </div>
                <div style={{ fontSize: '0.96rem', fontWeight: '600', color: '#191716' }}>
                  {currentUser?.email || profileData?.email}
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <Button
                variant="outline"
                type="button"
                onClick={() => setForgotModalOpen(false)}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                type="button"
                loading={forgotLoading}
                onClick={handleProfileForgotPassword}
                icon={<Mail size={15} />}
              >
                Send Recovery Link
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

const styles = {
  page: {
    padding: '48px 0 80px 0',
  },
  container: {
    maxWidth: '1000px',
  },
  profileCard: {
    padding: '36px',
    backgroundColor: '#FFFFFF',
    marginBottom: '40px',
  },
  profileHeaderContent: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '24px',
    marginBottom: '28px',
    flexWrap: 'wrap',
  },
  avatarWrapper: {
    flexShrink: 0,
  },
  avatarImg: {
    width: '96px',
    height: '96px',
    borderRadius: '50%',
    objectFit: 'cover',
    border: '3px solid #EDE7DD',
    boxShadow: '0 4px 14px rgba(25, 23, 22, 0.08)',
  },
  avatarFallback: {
    width: '96px',
    height: '96px',
    borderRadius: '50%',
    backgroundColor: '#FCEDE8',
    color: '#E05D38',
    fontWeight: '800',
    fontSize: '2.2rem',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    border: '3px solid #EDE7DD',
  },
  profileInfo: {
    flexGrow: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  nameRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    flexWrap: 'wrap',
  },
  profileName: {
    fontSize: '1.6rem',
    fontWeight: '800',
    color: '#1C1917',
  },
  username: {
    fontSize: '0.92rem',
    color: '#8C827A',
    fontWeight: '600',
  },
  bio: {
    fontSize: '0.95rem',
    color: '#57534E',
    lineHeight: '1.55',
    marginTop: '6px',
    maxWidth: '600px',
  },
  metaRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
    marginTop: '10px',
  },
  metaItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    fontSize: '0.85rem',
    color: '#8C827A',
  },
  ownerActions: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  statsBar: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingTop: '24px',
    borderTop: '1px solid #F3ECE1',
    flexWrap: 'wrap',
    gap: '16px',
  },
  statBox: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '2px',
  },
  statNumber: {
    fontFamily: 'var(--font-serif)',
    fontSize: '1.8rem',
    fontWeight: '800',
    color: '#1C1917',
  },
  statLabel: {
    fontSize: '0.82rem',
    fontWeight: '600',
    color: '#8C827A',
    textTransform: 'uppercase',
    letterSpacing: '0.04em',
  },
  statDivider: {
    width: '1px',
    height: '36px',
    backgroundColor: '#EDE7DD',
  },
  gallerySection: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
  },
  galleryHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  galleryTitle: {
    fontSize: '1.5rem',
    color: '#1C1917',
  },
  avatarEditContainer: {
    display: 'flex',
    alignItems: 'center',
    gap: '18px',
    padding: '12px 14px',
    backgroundColor: '#FAF7F2',
    border: '1px solid #E2DACD',
    borderRadius: '14px',
  },
  avatarPreviewWrapper: {
    flexShrink: 0,
  },
  avatarPreviewImg: {
    width: '64px',
    height: '64px',
    borderRadius: '50%',
    objectFit: 'cover',
    border: '2px solid #EDE7DD',
    boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
  },
  avatarPreviewFallback: {
    width: '64px',
    height: '64px',
    borderRadius: '50%',
    backgroundColor: '#FCEDE8',
    color: '#E05D38',
    fontWeight: '800',
    fontSize: '1.6rem',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    border: '2px solid #EDE7DD',
  },
  avatarUploadActions: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
    flexGrow: 1,
  },
};
