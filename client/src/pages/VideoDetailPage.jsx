import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  Calendar,
  Eye,
  Edit3,
  Trash2,
  Share2,
  ArrowLeft,
  Sparkles,
  Info,
  CheckCircle2,
} from 'lucide-react';
import { videoService } from '../services/videoService';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { VideoPlayer } from '../components/video/VideoPlayer';
import { CommentSection } from '../components/comment/CommentSection';
import { Modal } from '../components/common/Modal';
import { Button } from '../components/common/Button';

const CATEGORIES = [
  'Self Introduction',
  'Interview Practice',
  'Group Discussion',
  'Daily Life',
  'Technology',
  'Debate',
  'Storytelling',
  'College',
  'General',
];

export const VideoDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, isAdmin } = useAuth();
  const { success, error } = useToast();

  const [video, setVideo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editCategory, setEditCategory] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const fetchVideo = async () => {
      try {
        setLoading(true);
        const data = await videoService.getVideoById(id);
        if (data.success && data.video) {
          setVideo(data.video);
          setEditTitle(data.video.title);
          setEditDescription(data.video.description || '');
          setEditCategory(data.video.category || 'General');
        }
      } catch (err) {
        error(err.message || 'Unable to load video.');
        navigate('/explore');
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchVideo();
    }
  }, [id, navigate]);

  const author = video?.userId || {};
  const isOwner = user && (user._id === (author._id || author.id) || isAdmin);

  const handleUpdateVideo = async (e) => {
    e.preventDefault();
    if (!editTitle.trim()) return;

    try {
      setSavingEdit(true);
      const data = await videoService.updateVideo(video._id, {
        title: editTitle.trim(),
        description: editDescription.trim(),
        category: editCategory,
      });

      if (data.success) {
        setVideo((prev) => ({
          ...prev,
          title: editTitle.trim(),
          description: editDescription.trim(),
          category: editCategory,
        }));
        setEditModalOpen(false);
        success('Practice video details updated!');
      }
    } catch (err) {
      error(err.message || 'Failed to update video.');
    } finally {
      setSavingEdit(false);
    }
  };

  const handleDeleteVideo = async () => {
    if (
      window.confirm(
        'Are you sure you want to permanently delete this practice video and all its comments?'
      )
    ) {
      try {
        setDeleting(true);
        const data = await videoService.deleteVideo(video._id);
        if (data.success) {
          success('Practice video deleted successfully.');
          navigate('/explore');
        }
      } catch (err) {
        error(err.message || 'Failed to delete video.');
        setDeleting(false);
      }
    }
  };

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href);
    success('Video link copied to clipboard!');
  };

  if (loading) {
    return (
      <div style={styles.loadingContainer}>
        <div className="animate-spin" style={styles.spinner} />
        <p style={{ color: '#8C827A', marginTop: '12px' }}>Loading practice video...</p>
      </div>
    );
  }

  if (!video) return null;

  return (
    <div style={styles.page}>
      <div className="container" style={styles.container}>
        {/* Back Link */}
        <Link to="/explore" style={styles.backLink}>
          <ArrowLeft size={16} /> Back to Explore Feed
        </Link>

        {/* Video Player */}
        <div style={styles.playerWrapper}>
          <VideoPlayer
            src={video.videoUrl}
            poster={video.thumbnailUrl}
            title={video.title}
            videoId={video._id}
            autoPlay={false}
          />
        </div>

        {/* Video Main Details */}
        <div className="video-details-layout" style={styles.detailsGrid}>
          {/* Left Column: Video Info & Comments */}
          <div style={styles.leftCol}>
            {/* Title & Metadata */}
            <div style={styles.titleSection}>
              <div style={styles.categoryAndDateRow}>
                <span className="category-badge">{video.category || 'General'}</span>
                <div style={styles.dateAndViews}>
                  <span style={styles.metaItem}>
                    <Calendar size={14} />
                    {new Date(video.createdAt).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </span>
                  <span style={styles.metaItem}>
                    <Eye size={14} /> {video.views || 0} views
                  </span>
                </div>
              </div>

              <h1 style={styles.videoTitle}>{video.title}</h1>

              {/* Action Buttons: Share, Edit, Delete */}
              <div style={styles.actionButtonsRow}>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleShare}
                  icon={<Share2 size={15} />}
                >
                  Share Link
                </Button>

                {isOwner && (
                  <>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => setEditModalOpen(true)}
                      icon={<Edit3 size={15} />}
                    >
                      Edit Details
                    </Button>
                    <Button
                      variant="danger"
                      size="sm"
                      onClick={handleDeleteVideo}
                      loading={deleting}
                      icon={<Trash2 size={15} />}
                    >
                      Delete Video
                    </Button>
                  </>
                )}
              </div>
            </div>

            {/* Description / Goal Context */}
            {video.description && (
              <div className="card" style={styles.descriptionCard}>
                <h3 style={styles.descriptionHeading}>Speaker's Practice Context</h3>
                <p style={styles.descriptionText}>{video.description}</p>
              </div>
            )}

            {/* AI Preparation Info Note */}
            <div style={styles.aiNoticeBox}>
              <Sparkles size={16} color="#E05D38" />
              <div>
                <span style={styles.aiNoticeTitle}>AI Analysis Ready Architecture</span>
                <p style={styles.aiNoticeText}>
                  This speaking session is stored with speech-metrics metadata hooks (pace WPM, pause detection, filler-word tracking) ready for automated AI communication reports.
                </p>
              </div>
            </div>

            {/* Comments / Feedback Section */}
            <CommentSection videoId={video._id} videoOwnerId={author._id || author.id} />
          </div>

          {/* Right Column: Speaker Profile Card */}
          <div style={styles.rightCol}>
            <div className="card" style={styles.authorCard}>
              <h3 style={styles.authorCardTitle}>About the Speaker</h3>
              <div style={styles.authorProfileHeader}>
                <Link to={`/profile/${author._id || author.username}`}>
                  {author.profileImage ? (
                    <img
                      src={author.profileImage}
                      alt={author.name}
                      style={styles.authorAvatarLg}
                    />
                  ) : (
                    <div style={styles.authorAvatarFallbackLg}>
                      {author.name?.charAt(0).toUpperCase() || 'U'}
                    </div>
                  )}
                </Link>
                <div>
                  <Link to={`/profile/${author._id || author.username}`} style={styles.authorNameLg}>
                    {author.name || 'Anonymous Learner'}
                  </Link>
                  <div style={styles.authorHandleLg}>@{author.username || 'learner'}</div>
                </div>
              </div>

              {author.bio && <p style={styles.authorBio}>{author.bio}</p>}

              <div style={styles.authorDivider} />

              <div style={styles.authorFooter}>
                <Link to={`/profile/${author._id || author.username}`} style={{ width: '100%' }}>
                  <Button variant="outline" size="sm" style={{ width: '100%' }}>
                    View Speaker's Profile & Drills
                  </Button>
                </Link>
              </div>
            </div>

            {/* Speaking Tips Card */}
            <div className="card" style={styles.tipsCard}>
              <h4 style={styles.tipsTitle}>
                <Info size={16} color="#E05D38" /> Constructive Feedback Tips
              </h4>
              <ul style={styles.tipsList}>
                <li>Be specific about what worked well.</li>
                <li>Comment on pace (too fast or natural?).</li>
                <li>Observe eye contact and head posture.</li>
                <li>Notice any recurring filler words.</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Edit Video Modal */}
      <Modal
        isOpen={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        title="Edit Speaking Video"
        subtitle="Update your practice video title, topic, or practice notes."
      >
        <form onSubmit={handleUpdateVideo}>
          <div className="form-group">
            <label className="form-label">Video Title</label>
            <input
              type="text"
              className="form-input"
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              required
              maxLength={120}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Speaking Category</label>
            <select
              className="form-select"
              value={editCategory}
              onChange={(e) => setEditCategory(e.target.value)}
            >
              {CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Description / Practice Notes</label>
            <textarea
              className="form-textarea"
              rows={4}
              value={editDescription}
              onChange={(e) => setEditDescription(e.target.value)}
              placeholder="What were you focusing on in this drill?"
              maxLength={1000}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
            <Button
              variant="outline"
              type="button"
              onClick={() => setEditModalOpen(false)}
            >
              Cancel
            </Button>
            <Button variant="primary" type="submit" loading={savingEdit}>
              Save Changes
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

const styles = {
  page: {
    padding: '36px 0 80px 0',
  },
  container: {
    display: 'flex',
    flexDirection: 'column',
    gap: '24px',
  },
  backLink: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    fontSize: '0.9rem',
    fontWeight: '600',
    color: '#6E675F',
    width: 'fit-content',
    transition: 'color 0.15s',
  },
  playerWrapper: {
    width: '100%',
    maxWidth: '1000px',
    margin: '0 auto',
  },
  detailsGrid: {
    display: 'grid',
    gridTemplateColumns: '2fr 1fr',
    gap: '32px',
    maxWidth: '1000px',
    margin: '0 auto',
    width: '100%',
  },
  leftCol: {
    display: 'flex',
    flexDirection: 'column',
  },
  titleSection: {
    display: 'flex',
    flexDirection: 'column',
    gap: '14px',
    marginBottom: '24px',
  },
  categoryAndDateRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: '10px',
  },
  dateAndViews: {
    display: 'flex',
    alignItems: 'center',
    gap: '14px',
  },
  metaItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '5px',
    fontSize: '0.84rem',
    color: '#8C827A',
    fontWeight: '500',
  },
  videoTitle: {
    fontSize: 'clamp(1.5rem, 2.5vw, 2rem)',
    fontWeight: '800',
    color: '#1C1917',
    lineHeight: '1.25',
  },
  actionButtonsRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    flexWrap: 'wrap',
  },
  descriptionCard: {
    padding: '20px 24px',
    backgroundColor: '#FFFFFF',
    marginBottom: '24px',
  },
  descriptionHeading: {
    fontSize: '0.95rem',
    fontWeight: '700',
    color: '#1C1917',
    marginBottom: '8px',
  },
  descriptionText: {
    fontSize: '0.92rem',
    color: '#57534E',
    lineHeight: '1.65',
    whiteSpace: 'pre-line',
  },
  aiNoticeBox: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '12px',
    backgroundColor: '#FAF7F2',
    border: '1px solid #E2DACD',
    borderRadius: '14px',
    padding: '16px 18px',
    marginBottom: '10px',
  },
  aiNoticeTitle: {
    fontSize: '0.85rem',
    fontWeight: '700',
    color: '#1C1917',
    display: 'block',
    marginBottom: '2px',
  },
  aiNoticeText: {
    fontSize: '0.8rem',
    color: '#6E675F',
    lineHeight: '1.4',
  },
  rightCol: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
  },
  authorCard: {
    padding: '24px',
    backgroundColor: '#FFFFFF',
  },
  authorCardTitle: {
    fontSize: '0.85rem',
    fontWeight: '700',
    color: '#8C827A',
    textTransform: 'uppercase',
    letterSpacing: '0.04em',
    marginBottom: '16px',
  },
  authorProfileHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '14px',
    marginBottom: '14px',
  },
  authorAvatarLg: {
    width: '52px',
    height: '52px',
    borderRadius: '50%',
    objectFit: 'cover',
    border: '2px solid #EDE7DD',
  },
  authorAvatarFallbackLg: {
    width: '52px',
    height: '52px',
    borderRadius: '50%',
    backgroundColor: '#FCEDE8',
    color: '#E05D38',
    fontWeight: '800',
    fontSize: '1.2rem',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  authorNameLg: {
    fontSize: '1.05rem',
    fontWeight: '700',
    color: '#1C1917',
  },
  authorHandleLg: {
    fontSize: '0.82rem',
    color: '#8C827A',
  },
  authorBio: {
    fontSize: '0.88rem',
    color: '#6E675F',
    lineHeight: '1.5',
    marginBottom: '16px',
  },
  authorDivider: {
    height: '1px',
    backgroundColor: '#F3ECE1',
    margin: '16px 0',
  },
  authorFooter: {
    display: 'flex',
  },
  tipsCard: {
    padding: '20px',
    backgroundColor: '#FFFDF9',
    border: '1px solid #EAE4DA',
  },
  tipsTitle: {
    fontSize: '0.88rem',
    fontWeight: '700',
    color: '#1C1917',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    marginBottom: '12px',
  },
  tipsList: {
    paddingLeft: '18px',
    fontSize: '0.82rem',
    color: '#6E675F',
    lineHeight: '1.6',
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  loadingContainer: {
    minHeight: '60vh',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
  },
  spinner: {
    width: '36px',
    height: '36px',
    border: '3px solid #EDE7DD',
    borderTopColor: '#E05D38',
    borderRadius: '50%',
  },
};

// Add responsive rules in CSS
if (typeof document !== 'undefined') {
  const styleEl = document.createElement('style');
  styleEl.innerHTML = `
    @media (max-width: 860px) {
      .video-details-layout {
        grid-template-columns: 1fr !important;
      }
    }
  `;
  document.head.appendChild(styleEl);
}

