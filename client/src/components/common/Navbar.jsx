import React, { useState, useEffect } from 'react';
import { Link, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import {
  Mic,
  Video,
  PlusCircle,
  User,
  ShieldCheck,
  LogOut,
  Compass,
  Home,
  Info,
} from 'lucide-react';
import { Button } from './Button';
import './Navbar.css';

export const Navbar = () => {
  const { user, isAuthenticated, isAdmin, logout } = useAuth();
  const { success } = useToast();
  const navigate = useNavigate();
  const location = useLocation();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);

  // Close mobile menu on page route change
  useEffect(() => {
    setMobileMenuOpen(false);
    setUserDropdownOpen(false);
  }, [location.pathname]);

  const handleLogout = async () => {
    await logout();
    success('Logged out successfully.');
    setUserDropdownOpen(false);
    setMobileMenuOpen(false);
    navigate('/');
  };

  const closeMobile = () => {
    setMobileMenuOpen(false);
  };

  return (
    <header className="header-navbar">
      <div className="container nav-container">
        {/* Brand Logo */}
        <Link to="/" className="nav-brand" onClick={closeMobile}>
          <div className="brand-logo-badge">
            <Mic size={20} color="#FFFFFF" />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span className="brand-title">Articulate</span>
            <span className="brand-sub">Practice & Speak</span>
          </div>
        </Link>

        {/* Desktop Navigation Links */}
        <nav className="desktop-nav-links">
          <NavLink
            to="/"
            end
            className={({ isActive }) => `nav-item-link ${isActive ? 'active' : ''}`}
          >
            <Home size={15} /> Home
          </NavLink>
          <NavLink
            to="/explore"
            className={({ isActive }) => `nav-item-link ${isActive ? 'active' : ''}`}
          >
            <Compass size={15} /> Explore
          </NavLink>
          <NavLink
            to="/upload"
            className={({ isActive }) => `nav-item-link ${isActive ? 'active' : ''}`}
          >
            <PlusCircle size={15} /> Upload Drill
          </NavLink>
          <NavLink
            to="/about"
            className={({ isActive }) => `nav-item-link ${isActive ? 'active' : ''}`}
          >
            <Info size={15} /> About
          </NavLink>
        </nav>

        {/* Desktop User Actions */}
        <div className="desktop-nav-actions">
          {isAuthenticated ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
              <Link to="/upload">
                <Button variant="primary" size="sm" icon={<PlusCircle size={15} />}>
                  Practice Video
                </Button>
              </Link>

              {isAdmin && (
                <Link to="/admin" title="Admin Dashboard">
                  <span className="badge-role-admin" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '5px 10px' }}>
                    <ShieldCheck size={13} /> Admin
                  </span>
                </Link>
              )}

              {/* User Avatar / Dropdown */}
              <div style={{ position: 'relative' }}>
                <button
                  onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                  className="user-menu-btn"
                  aria-label="User account menu"
                >
                  {user?.profileImage ? (
                    <img
                      src={user.profileImage}
                      alt={user.name}
                      className="user-avatar-small"
                    />
                  ) : (
                    <div className="user-avatar-fallback-small">
                      {user?.name?.charAt(0).toUpperCase() || 'U'}
                    </div>
                  )}
                  <span className="user-display-name">{user?.name?.split(' ')[0]}</span>
                </button>

                {userDropdownOpen && (
                  <>
                    <div
                      style={{
                        position: 'fixed',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        zIndex: 90,
                      }}
                      onClick={() => setUserDropdownOpen(false)}
                    />
                    <div
                      className="animate-scale-in"
                      style={{
                        position: 'absolute',
                        top: 'calc(100% + 10px)',
                        right: 0,
                        width: '240px',
                        backgroundColor: '#FFFFFF',
                        borderRadius: '14px',
                        boxShadow: '0 16px 36px rgba(25, 23, 22, 0.14)',
                        border: '1px solid #EDE7DD',
                        zIndex: 100,
                        padding: '10px 0',
                      }}
                    >
                      <div style={{ padding: '10px 16px 12px 16px' }}>
                        <div style={{ fontWeight: '700', fontSize: '0.94rem', color: '#1C1917' }}>
                          {user?.name}
                        </div>
                        <div style={{ fontSize: '0.8rem', color: '#8C827A' }}>
                          @{user?.username}
                        </div>
                      </div>
                      <div style={{ height: '1px', backgroundColor: '#F3ECE1', margin: '4px 0' }} />
                      <Link
                        to={`/profile/${user?._id}`}
                        style={styles.dropdownLink}
                        onClick={() => setUserDropdownOpen(false)}
                      >
                        <User size={16} /> My Profile & Drills
                      </Link>
                      <Link
                        to="/upload"
                        style={styles.dropdownLink}
                        onClick={() => setUserDropdownOpen(false)}
                      >
                        <Video size={16} /> Upload New Practice
                      </Link>
                      {isAdmin && (
                        <Link
                          to="/admin"
                          style={styles.dropdownLink}
                          onClick={() => setUserDropdownOpen(false)}
                        >
                          <ShieldCheck size={16} /> Admin Dashboard
                        </Link>
                      )}
                      <div style={{ height: '1px', backgroundColor: '#F3ECE1', margin: '6px 0' }} />
                      <button
                        onClick={handleLogout}
                        style={{
                          ...styles.dropdownLink,
                          color: '#D32F2F',
                          width: '100%',
                          border: 'none',
                          background: 'none',
                        }}
                      >
                        <LogOut size={16} /> Log Out
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Link to="/login">
                <Button variant="ghost" size="sm">
                  Sign In
                </Button>
              </Link>
              <Link to="/register">
                <Button variant="dark" size="sm">
                  Get Started
                </Button>
              </Link>
            </div>
          )}
        </div>

        {/* Animated Hamburger Button */}
        <button
          className={`hamburger-toggle-btn ${mobileMenuOpen ? 'is-active' : ''}`}
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
          aria-expanded={mobileMenuOpen}
        >
          <span className="hamburger-line line-top" />
          <span className="hamburger-line line-middle" />
          <span className="hamburger-line line-bottom" />
        </button>
      </div>

      {/* Mobile Backdrop Overlay */}
      <div
        className={`mobile-drawer-backdrop ${mobileMenuOpen ? 'is-open animate-fade-in' : ''}`}
        onClick={closeMobile}
      />

      {/* Mobile Drawer Flyout */}
      <div className={`mobile-drawer-menu ${mobileMenuOpen ? 'is-open animate-fade-up' : ''}`}>
        {isAuthenticated ? (
          <Link
            to={`/profile/${user?._id}`}
            onClick={closeMobile}
            style={{ textDecoration: 'none' }}
          >
            <div className="mobile-user-card">
              {user?.profileImage ? (
                <img
                  src={user.profileImage}
                  alt={user.name}
                  className="mobile-user-card-avatar"
                />
              ) : (
                <div className="mobile-user-card-fallback">
                  {user?.name?.charAt(0).toUpperCase() || 'U'}
                </div>
              )}
              <div>
                <div style={{ fontWeight: '700', fontSize: '1.05rem', color: '#1C1917' }}>
                  {user?.name}
                </div>
                <div style={{ fontSize: '0.85rem', color: '#8C827A' }}>
                  @{user?.username}
                </div>
              </div>
            </div>
          </Link>
        ) : null}

        <div className="mobile-nav-list">
          <NavLink
            to="/"
            end
            onClick={closeMobile}
            className={({ isActive }) => `mobile-nav-item ${isActive ? 'active' : ''}`}
          >
            <Home size={18} /> Home
          </NavLink>
          <NavLink
            to="/explore"
            onClick={closeMobile}
            className={({ isActive }) => `mobile-nav-item ${isActive ? 'active' : ''}`}
          >
            <Compass size={18} /> Explore Videos
          </NavLink>
          <NavLink
            to="/upload"
            onClick={closeMobile}
            className={({ isActive }) => `mobile-nav-item ${isActive ? 'active' : ''}`}
          >
            <PlusCircle size={18} /> Upload Practice Video
          </NavLink>
          <NavLink
            to="/about"
            onClick={closeMobile}
            className={({ isActive }) => `mobile-nav-item ${isActive ? 'active' : ''}`}
          >
            <Info size={18} /> About Platform
          </NavLink>

          {isAuthenticated ? (
            <>
              <div style={{ height: '1px', backgroundColor: '#EDE7DD', margin: '8px 0' }} />
              <NavLink
                to={`/profile/${user?._id}`}
                onClick={closeMobile}
                className={({ isActive }) => `mobile-nav-item ${isActive ? 'active' : ''}`}
              >
                <User size={18} /> My Profile
              </NavLink>
              {isAdmin && (
                <NavLink
                  to="/admin"
                  onClick={closeMobile}
                  className={({ isActive }) => `mobile-nav-item ${isActive ? 'active' : ''}`}
                >
                  <ShieldCheck size={18} /> Admin Dashboard
                </NavLink>
              )}
              <button
                onClick={handleLogout}
                className="mobile-nav-item"
                style={{ color: '#D32F2F', background: 'none', border: 'none', width: '100%', textAlign: 'left', cursor: 'pointer' }}
              >
                <LogOut size={18} /> Log Out
              </button>
            </>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '16px' }}>
              <Link to="/login" onClick={closeMobile} style={{ width: '100%' }}>
                <Button variant="outline" style={{ width: '100%' }}>
                  Sign In
                </Button>
              </Link>
              <Link to="/register" onClick={closeMobile} style={{ width: '100%' }}>
                <Button variant="primary" style={{ width: '100%' }}>
                  Create Free Account
                </Button>
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

const styles = {
  dropdownLink: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '9px 16px',
    fontSize: '0.88rem',
    color: '#57534E',
    fontWeight: '500',
    textAlign: 'left',
    textDecoration: 'none',
    cursor: 'pointer',
    transition: 'background-color 0.15s, color 0.15s',
  },
};
