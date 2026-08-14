import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Users,
  Video,
  MessageSquare,
  ShieldCheck,
  Trash2,
  CheckCircle,
  XCircle,
  ExternalLink,
  Search,
  RefreshCw,
} from 'lucide-react';
import { adminService } from '../services/adminService';
import { useToast } from '../context/ToastContext';
import { Button } from '../components/common/Button';

export const AdminDashboardPage = () => {
  const { success, error } = useToast();

  const [activeTab, setActiveTab] = useState('overview'); // 'overview' | 'users' | 'videos' | 'comments'
  const [stats, setStats] = useState({ totalUsers: 0, totalVideos: 0, totalComments: 0 });
  const [recentUsers, setRecentUsers] = useState([]);
  const [recentVideos, setRecentVideos] = useState([]);

  // Users tab state
  const [usersList, setUsersList] = useState([]);
  const [userSearch, setUserSearch] = useState('');
  const [usersLoading, setUsersLoading] = useState(false);

  // Videos tab state
  const [videosList, setVideosList] = useState([]);
  const [videoSearch, setVideoSearch] = useState('');
  const [videosLoading, setVideosLoading] = useState(false);

  // Comments tab state
  const [commentsList, setCommentsList] = useState([]);
  const [commentsLoading, setCommentsLoading] = useState(false);

  const [loading, setLoading] = useState(true);

  const fetchOverviewStats = async () => {
    try {
      setLoading(true);
      const data = await adminService.getStats();
      if (data.success) {
        setStats(data.stats);
        setRecentUsers(data.recentUsers || []);
        setRecentVideos(data.recentVideos || []);
      }
    } catch (err) {
      error(err.message || 'Failed to load administrator statistics.');
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      setUsersLoading(true);
      const data = await adminService.getUsers({ search: userSearch });
      if (data.success) {
        setUsersList(data.users || []);
      }
    } catch (err) {
      error('Failed to load users list.');
    } finally {
      setUsersLoading(false);
    }
  };

  const fetchVideos = async () => {
    try {
      setVideosLoading(true);
      const data = await adminService.getVideos({ search: videoSearch });
      if (data.success) {
        setVideosList(data.videos || []);
      }
    } catch (err) {
      error('Failed to load videos list.');
    } finally {
      setVideosLoading(false);
    }
  };

  const fetchComments = async () => {
    try {
      setCommentsLoading(true);
      const data = await adminService.getComments();
      if (data.success) {
        setCommentsList(data.comments || []);
      }
    } catch (err) {
      error('Failed to load comments list.');
    } finally {
      setCommentsLoading(false);
    }
  };

  useEffect(() => {
    fetchOverviewStats();
  }, []);

  useEffect(() => {
    if (activeTab === 'users') fetchUsers();
    if (activeTab === 'videos') fetchVideos();
    if (activeTab === 'comments') fetchComments();
  }, [activeTab]);

  const handleToggleUserStatus = async (userId) => {
    try {
      const data = await adminService.toggleUserStatus(userId);
      if (data.success) {
        setUsersList((prev) =>
          prev.map((u) => (u._id === userId ? { ...u, isActive: data.user.isActive } : u))
        );
        success(data.message);
      }
    } catch (err) {
      error(err.message || 'Failed to update user status.');
    }
  };

  const handleDeleteUser = async (userId, username) => {
    if (window.confirm(`Are you sure you want to permanently delete user @${username} and all their videos/comments?`)) {
      try {
        const data = await adminService.deleteUser(userId);
        if (data.success) {
          setUsersList((prev) => prev.filter((u) => u._id !== userId));
          success(`User @${username} was deleted.`);
          fetchOverviewStats();
        }
      } catch (err) {
        error(err.message || 'Failed to delete user.');
      }
    }
  };

  const handleDeleteVideo = async (videoId, title) => {
    if (window.confirm(`Delete video "${title}"?`)) {
      try {
        const data = await adminService.deleteVideo(videoId);
        if (data.success) {
          setVideosList((prev) => prev.filter((v) => v._id !== videoId));
          success('Video deleted by admin.');
          fetchOverviewStats();
        }
      } catch (err) {
        error(err.message || 'Failed to delete video.');
      }
    }
  };

  const handleDeleteComment = async (commentId) => {
    if (window.confirm('Delete this comment?')) {
      try {
        const data = await adminService.deleteComment(commentId);
        if (data.success) {
          setCommentsList((prev) => prev.filter((c) => c._id !== commentId));
          success('Comment removed by admin.');
          fetchOverviewStats();
        }
      } catch (err) {
        error(err.message || 'Failed to delete comment.');
      }
    }
  };

  return (
    <div style={styles.page}>
      <div className="container" style={styles.container}>
        {/* Header */}
        <div style={styles.header}>
          <div>
            <div style={styles.badgeRow}>
              <span className="badge-role-admin" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                <ShieldCheck size={13} /> Administrator Console
              </span>
            </div>
            <h1 className="heading-display" style={styles.title}>
              Platform Moderation & Metrics
            </h1>
            <p style={styles.subtitle}>
              Monitor platform growth, review uploaded speaking drills, and manage user accounts and feedback.
            </p>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              fetchOverviewStats();
              if (activeTab === 'users') fetchUsers();
              if (activeTab === 'videos') fetchVideos();
              if (activeTab === 'comments') fetchComments();
              success('Dashboard refreshed.');
            }}
            icon={<RefreshCw size={14} />}
          >
            Refresh Data
          </Button>
        </div>

        {/* Metrics Cards */}
        <div style={styles.metricsGrid}>
          <div className="card" style={styles.metricCard}>
            <div style={{ ...styles.metricIconCircle, backgroundColor: '#EBF4FF' }}>
              <Users size={22} color="#1E88E5" />
            </div>
            <div style={styles.metricInfo}>
              <span style={styles.metricLabel}>Total Registered Users</span>
              <span style={styles.metricValue}>{stats.totalUsers}</span>
            </div>
          </div>

          <div className="card" style={styles.metricCard}>
            <div style={{ ...styles.metricIconCircle, backgroundColor: '#FCEDE8' }}>
              <Video size={22} color="#E05D38" />
            </div>
            <div style={styles.metricInfo}>
              <span style={styles.metricLabel}>Practice Videos Uploaded</span>
              <span style={styles.metricValue}>{stats.totalVideos}</span>
            </div>
          </div>

          <div className="card" style={styles.metricCard}>
            <div style={{ ...styles.metricIconCircle, backgroundColor: '#EDF7ED' }}>
              <MessageSquare size={22} color="#2E7D32" />
            </div>
            <div style={styles.metricInfo}>
              <span style={styles.metricLabel}>Feedback Comments Given</span>
              <span style={styles.metricValue}>{stats.totalComments}</span>
            </div>
          </div>
        </div>

        {/* Tabs Bar */}
        <div style={styles.tabsNav}>
          <button
            onClick={() => setActiveTab('overview')}
            style={{
              ...styles.tabBtn,
              ...(activeTab === 'overview' ? styles.tabBtnActive : {}),
            }}
          >
            Overview & Activity
          </button>
          <button
            onClick={() => setActiveTab('users')}
            style={{
              ...styles.tabBtn,
              ...(activeTab === 'users' ? styles.tabBtnActive : {}),
            }}
          >
            User Management ({stats.totalUsers})
          </button>
          <button
            onClick={() => setActiveTab('videos')}
            style={{
              ...styles.tabBtn,
              ...(activeTab === 'videos' ? styles.tabBtnActive : {}),
            }}
          >
            Video Moderation ({stats.totalVideos})
          </button>
          <button
            onClick={() => setActiveTab('comments')}
            style={{
              ...styles.tabBtn,
              ...(activeTab === 'comments' ? styles.tabBtnActive : {}),
            }}
          >
            Comments Moderation ({stats.totalComments})
          </button>
        </div>

        {/* TAB 1: OVERVIEW */}
        {activeTab === 'overview' && (
          <div className="admin-overview-grid" style={styles.overviewGrid}>
            {/* Recent Users */}
            <div className="card" style={styles.overviewCard}>
              <h3 style={styles.overviewCardTitle}>Recently Registered Users</h3>
              <div style={styles.recentList}>
                {recentUsers.map((u) => (
                  <div key={u._id} style={styles.recentItem}>
                    <div style={styles.recentItemInfo}>
                      <span style={styles.recentName}>{u.name}</span>
                      <span style={styles.recentMeta}>@{u.username} • {u.email}</span>
                    </div>
                    <span className={u.role === 'admin' ? 'badge-role-admin' : 'badge-role-user'}>
                      {u.role}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Recent Videos */}
            <div className="card" style={styles.overviewCard}>
              <h3 style={styles.overviewCardTitle}>Recent Video Drills</h3>
              <div style={styles.recentList}>
                {recentVideos.map((v) => (
                  <div key={v._id} style={styles.recentItem}>
                    <div style={styles.recentItemInfo}>
                      <Link to={`/video/${v._id}`} style={styles.recentVideoTitle}>
                        {v.title}
                      </Link>
                      <span style={styles.recentMeta}>
                        by @{v.userId?.username || 'learner'} • {v.category}
                      </span>
                    </div>
                    <Link to={`/video/${v._id}`} target="_blank" style={styles.inspectIcon}>
                      <ExternalLink size={15} />
                    </Link>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: USERS MANAGEMENT */}
        {activeTab === 'users' && (
          <div className="card" style={styles.tableCard}>
            <div style={styles.tableToolbar}>
              <div style={styles.searchBox}>
                <Search size={16} color="#8C827A" />
                <input
                  type="text"
                  placeholder="Search users by name, username, or email..."
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && fetchUsers()}
                  style={styles.tableSearchInput}
                />
              </div>
              <Button variant="secondary" size="sm" onClick={fetchUsers}>
                Search
              </Button>
            </div>

            <div style={styles.tableWrapper}>
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th style={styles.th}>User</th>
                    <th style={styles.th}>Email</th>
                    <th style={styles.th}>Role</th>
                    <th style={styles.th}>Drills</th>
                    <th style={styles.th}>Status</th>
                    <th style={styles.thRight}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {usersList.map((u) => (
                    <tr key={u._id} style={styles.tr}>
                      <td style={styles.td}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <Link to={`/profile/${u._id}`} style={{ fontWeight: '700', color: '#1C1917' }}>
                            {u.name}
                          </Link>
                          <span style={{ fontSize: '0.8rem', color: '#8C827A' }}>@{u.username}</span>
                        </div>
                      </td>
                      <td style={styles.td}>{u.email}</td>
                      <td style={styles.td}>
                        <span className={u.role === 'admin' ? 'badge-role-admin' : 'badge-role-user'}>
                          {u.role}
                        </span>
                      </td>
                      <td style={styles.td}>{u.videoCount || 0}</td>
                      <td style={styles.td}>
                        {u.isActive ? (
                          <span style={styles.statusActive}>
                            <CheckCircle size={13} /> Active
                          </span>
                        ) : (
                          <span style={styles.statusSuspended}>
                            <XCircle size={13} /> Suspended
                          </span>
                        )}
                      </td>
                      <td style={styles.tdRight}>
                        {u.role !== 'admin' && (
                          <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleToggleUserStatus(u._id)}
                            >
                              {u.isActive ? 'Suspend' : 'Activate'}
                            </Button>
                            <Button
                              variant="danger"
                              size="sm"
                              onClick={() => handleDeleteUser(u._id, u.username)}
                              icon={<Trash2 size={13} />}
                            >
                              Delete
                            </Button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 3: VIDEOS MODERATION */}
        {activeTab === 'videos' && (
          <div className="card" style={styles.tableCard}>
            <div style={styles.tableToolbar}>
              <div style={styles.searchBox}>
                <Search size={16} color="#8C827A" />
                <input
                  type="text"
                  placeholder="Search videos by title or topic..."
                  value={videoSearch}
                  onChange={(e) => setVideoSearch(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && fetchVideos()}
                  style={styles.tableSearchInput}
                />
              </div>
              <Button variant="secondary" size="sm" onClick={fetchVideos}>
                Search
              </Button>
            </div>

            <div style={styles.tableWrapper}>
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th style={styles.th}>Video Title</th>
                    <th style={styles.th}>Speaker</th>
                    <th style={styles.th}>Category</th>
                    <th style={styles.th}>Views</th>
                    <th style={styles.th}>Date</th>
                    <th style={styles.thRight}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {videosList.map((v) => (
                    <tr key={v._id} style={styles.tr}>
                      <td style={styles.td}>
                        <Link to={`/video/${v._id}`} style={{ fontWeight: '700', color: '#1C1917' }}>
                          {v.title}
                        </Link>
                      </td>
                      <td style={styles.td}>
                        <Link to={`/profile/${v.userId?._id || ''}`}>
                          @{v.userId?.username || 'learner'}
                        </Link>
                      </td>
                      <td style={styles.td}>
                        <span className="category-badge">{v.category}</span>
                      </td>
                      <td style={styles.td}>{v.views || 0}</td>
                      <td style={styles.td}>
                        {new Date(v.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </td>
                      <td style={styles.tdRight}>
                        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                          <Link to={`/video/${v._id}`} target="_blank">
                            <Button variant="outline" size="sm" icon={<ExternalLink size={13} />}>
                              View
                            </Button>
                          </Link>
                          <Button
                            variant="danger"
                            size="sm"
                            onClick={() => handleDeleteVideo(v._id, v.title)}
                            icon={<Trash2 size={13} />}
                          >
                            Delete
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 4: COMMENTS MODERATION */}
        {activeTab === 'comments' && (
          <div className="card" style={styles.tableCard}>
            <div style={styles.tableWrapper}>
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th style={styles.th}>Author</th>
                    <th style={styles.th}>Feedback Comment Content</th>
                    <th style={styles.th}>Video Drill</th>
                    <th style={styles.th}>Date</th>
                    <th style={styles.thRight}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {commentsList.map((c) => (
                    <tr key={c._id} style={styles.tr}>
                      <td style={styles.td}>
                        <div style={{ fontWeight: '600', color: '#1C1917' }}>
                          {c.userId?.name || 'User'}
                        </div>
                        <div style={{ fontSize: '0.8rem', color: '#8C827A' }}>
                          @{c.userId?.username || 'handle'}
                        </div>
                      </td>
                      <td style={{ ...styles.td, maxWidth: '360px' }}>
                        <p style={{ fontSize: '0.88rem', color: '#44403C', lineHeight: '1.4' }}>
                          {c.content}
                        </p>
                      </td>
                      <td style={styles.td}>
                        <Link to={`/video/${c.videoId?._id || ''}`} style={{ fontSize: '0.85rem', color: '#E05D38', fontWeight: '600' }}>
                          {c.videoId?.title ? (c.videoId.title.length > 25 ? `${c.videoId.title.substring(0, 25)}...` : c.videoId.title) : 'View Video'}
                        </Link>
                      </td>
                      <td style={styles.td}>
                        {new Date(c.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </td>
                      <td style={styles.tdRight}>
                        <Button
                          variant="danger"
                          size="sm"
                          onClick={() => handleDeleteComment(c._id)}
                          icon={<Trash2 size={13} />}
                        >
                          Remove
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const styles = {
  page: {
    padding: '40px 0 80px 0',
  },
  container: {
    display: 'flex',
    flexDirection: 'column',
    gap: '28px',
  },
  header: {
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: '16px',
  },
  badgeRow: {
    marginBottom: '8px',
  },
  title: {
    fontSize: 'clamp(1.8rem, 3vw, 2.4rem)',
    color: '#1C1917',
    marginBottom: '6px',
  },
  subtitle: {
    fontSize: '0.95rem',
    color: '#6E675F',
    maxWidth: '620px',
  },
  metricsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
    gap: '20px',
  },
  metricCard: {
    padding: '22px 24px',
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
    backgroundColor: '#FFFFFF',
  },
  metricIconCircle: {
    width: '48px',
    height: '48px',
    borderRadius: '12px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  metricInfo: {
    display: 'flex',
    flexDirection: 'column',
  },
  metricLabel: {
    fontSize: '0.8rem',
    fontWeight: '700',
    color: '#8C827A',
    textTransform: 'uppercase',
    letterSpacing: '0.04em',
  },
  metricValue: {
    fontFamily: 'var(--font-serif)',
    fontSize: '1.8rem',
    fontWeight: '800',
    color: '#1C1917',
  },
  tabsNav: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    borderBottom: '1px solid #EDE7DD',
    paddingBottom: '2px',
    overflowX: 'auto',
  },
  tabBtn: {
    padding: '10px 18px',
    fontFamily: 'var(--font-sans)',
    fontSize: '0.92rem',
    fontWeight: '600',
    color: '#6E675F',
    background: 'none',
    border: 'none',
    borderBottom: '3px solid transparent',
    cursor: 'pointer',
    whiteSpace: 'nowrap',
    transition: 'all 0.15s',
  },
  tabBtnActive: {
    color: '#E05D38',
    borderBottomColor: '#E05D38',
  },
  overviewGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '24px',
  },
  overviewCard: {
    padding: '24px',
    backgroundColor: '#FFFFFF',
  },
  overviewCardTitle: {
    fontSize: '1.1rem',
    fontWeight: '700',
    color: '#1C1917',
    marginBottom: '16px',
  },
  recentList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  recentItem: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '10px 12px',
    backgroundColor: '#FAF7F2',
    borderRadius: '10px',
    border: '1px solid #E2DACD',
  },
  recentItemInfo: {
    display: 'flex',
    flexDirection: 'column',
  },
  recentName: {
    fontSize: '0.9rem',
    fontWeight: '700',
    color: '#1C1917',
  },
  recentVideoTitle: {
    fontSize: '0.9rem',
    fontWeight: '700',
    color: '#1C1917',
    textDecoration: 'underline',
  },
  recentMeta: {
    fontSize: '0.78rem',
    color: '#8C827A',
  },
  inspectIcon: {
    color: '#6E675F',
    padding: '4px',
  },
  tableCard: {
    padding: '20px',
    backgroundColor: '#FFFFFF',
  },
  tableToolbar: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    marginBottom: '18px',
  },
  searchBox: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
    flexGrow: 1,
    maxWidth: '420px',
  },
  tableSearchInput: {
    width: '100%',
    padding: '8px 12px 8px 34px',
    fontFamily: 'var(--font-sans)',
    fontSize: '0.88rem',
    border: '1px solid #E2DACD',
    borderRadius: '8px',
    outline: 'none',
  },
  tableWrapper: {
    overflowX: 'auto',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    textAlign: 'left',
    fontSize: '0.9rem',
  },
  th: {
    padding: '12px 14px',
    backgroundColor: '#FAF7F2',
    color: '#6E675F',
    fontWeight: '700',
    fontSize: '0.82rem',
    textTransform: 'uppercase',
    letterSpacing: '0.04em',
    borderBottom: '1px solid #EDE7DD',
  },
  thRight: {
    padding: '12px 14px',
    backgroundColor: '#FAF7F2',
    color: '#6E675F',
    fontWeight: '700',
    fontSize: '0.82rem',
    textTransform: 'uppercase',
    letterSpacing: '0.04em',
    borderBottom: '1px solid #EDE7DD',
    textAlign: 'right',
  },
  tr: {
    borderBottom: '1px solid #F3ECE1',
  },
  td: {
    padding: '14px',
    color: '#292524',
    verticalAlign: 'middle',
  },
  tdRight: {
    padding: '14px',
    textAlign: 'right',
    verticalAlign: 'middle',
  },
  statusActive: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '4px',
    fontSize: '0.78rem',
    fontWeight: '600',
    color: '#2E7D32',
    backgroundColor: '#E8F5E9',
    padding: '2px 8px',
    borderRadius: '999px',
  },
  statusSuspended: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '4px',
    fontSize: '0.78rem',
    fontWeight: '600',
    color: '#D32F2F',
    backgroundColor: '#FFEBEE',
    padding: '2px 8px',
    borderRadius: '999px',
  },
};

// Responsive rules for dashboard
if (typeof document !== 'undefined') {
  const styleEl = document.createElement('style');
  styleEl.innerHTML = `
    @media (max-width: 860px) {
      .admin-overview-grid {
        grid-template-columns: 1fr !important;
      }
    }
  `;
  document.head.appendChild(styleEl);
}
