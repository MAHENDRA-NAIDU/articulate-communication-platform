import React from 'react';
import { Link } from 'react-router-dom';
import { MessageSquare, Play, Clock, Eye } from 'lucide-react';

const formatDuration = (seconds) => {
  if (!seconds || seconds <= 0) return null;
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
};

const formatTimeAgo = (dateString) => {
  if (!dateString) return '';
  const date = new Date(dateString);
  const now = new Date();
  const diffInSeconds = Math.floor((now - date) / 1000);

  if (diffInSeconds < 60) return 'Just now';
  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) return `${diffInHours}h ago`;
  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 30) return `${diffInDays}d ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

export const VideoCard = ({ video }) => {
  const author = video.userId || {};
  const durationLabel = formatDuration(video.duration);
  const commentsCount = typeof video.commentsCount === 'number' ? video.commentsCount : (video.comments?.length || 0);

  return (
    <div className="card card-interactive" style={styles.card}>
      {/* Thumbnail Area */}
      <Link to={`/video/${video._id}`} style={styles.thumbnailWrapper}>
        {video.thumbnailUrl ? (
          <img
            src={video.thumbnailUrl}
            alt={video.title}
            className="thumbnail-zoom-img"
            style={styles.thumbnailImg}
            loading="lazy"
          />
        ) : (
          <div style={styles.thumbnailPlaceholder}>
            <video
              src={video.videoUrl}
              style={styles.thumbnailVideo}
              muted
              preload="metadata"
            />
          </div>
        )}

        {/* Play Overlay */}
        <div style={styles.playOverlay}>
          <div className="card-play-circle" style={styles.playCircle}>
            <Play size={20} color="#FFFFFF" fill="#FFFFFF" style={{ marginLeft: '2px' }} />
          </div>
        </div>

        {/* Duration Badge */}
        {durationLabel && (
          <div style={styles.durationBadge}>
            <Clock size={11} /> {durationLabel}
          </div>
        )}

        {/* Category Badge overlay on thumbnail */}
        <div style={styles.categoryBadgeOverlay}>
          <span className="category-badge">{video.category || 'General'}</span>
        </div>
      </Link>

      {/* Content Info */}
      <div style={styles.content}>
        {/* Creator Info */}
        <div style={styles.authorRow}>
          <Link to={`/profile/${author._id || author.username}`} style={styles.authorLink}>
            {author.profileImage ? (
              <img
                src={author.profileImage}
                alt={author.name}
                style={styles.authorAvatar}
              />
            ) : (
              <div style={styles.authorAvatarFallback}>
                {author.name?.charAt(0).toUpperCase() || 'U'}
              </div>
            )}
            <div style={styles.authorText}>
              <span style={styles.authorName}>{author.name || 'Anonymous Learner'}</span>
              <span style={styles.authorHandle}>@{author.username || 'learner'}</span>
            </div>
          </Link>
        </div>

        {/* Title */}
        <Link to={`/video/${video._id}`}>
          <h3 style={styles.title}>{video.title}</h3>
        </Link>

        {/* Description Excerpt */}
        {video.description && (
          <p style={styles.description}>
            {video.description.length > 90
              ? `${video.description.substring(0, 90)}...`
              : video.description}
          </p>
        )}

        {/* Footer Meta */}
        <div style={styles.cardFooter}>
          <span style={styles.timestamp}>{formatTimeAgo(video.createdAt)}</span>

          <div style={styles.statsGroup}>
            <span style={styles.statItem} title={`${video.views || 0} views`}>
              <Eye size={14} /> {video.views || 0}
            </span>
            <Link
              to={`/video/${video._id}#comments`}
              style={styles.statItem}
              title={`${commentsCount} feedback comments`}
            >
              <MessageSquare size={14} /> {commentsCount}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

const styles = {
  card: {
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    height: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: '16px',
    border: '1px solid #EDE7DD',
  },
  thumbnailWrapper: {
    position: 'relative',
    width: '100%',
    aspectRatio: '16 / 9',
    backgroundColor: '#1C1917',
    overflow: 'hidden',
    display: 'block',
  },
  thumbnailImg: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
    transition: 'transform 0.3s ease',
  },
  thumbnailPlaceholder: {
    width: '100%',
    height: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#292524',
  },
  thumbnailVideo: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
    opacity: 0.85,
  },
  playOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.15)',
    transition: 'background-color 0.2s ease',
  },
  playCircle: {
    width: '44px',
    height: '44px',
    borderRadius: '50%',
    backgroundColor: 'rgba(224, 93, 56, 0.9)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 4px 14px rgba(0, 0, 0, 0.25)',
    transition: 'transform 0.2s ease',
  },
  durationBadge: {
    position: 'absolute',
    bottom: '10px',
    right: '10px',
    backgroundColor: 'rgba(25, 23, 22, 0.82)',
    color: '#FFFFFF',
    fontSize: '0.75rem',
    fontWeight: '600',
    padding: '2px 8px',
    borderRadius: '6px',
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    backdropFilter: 'blur(4px)',
  },
  categoryBadgeOverlay: {
    position: 'absolute',
    top: '10px',
    left: '10px',
  },
  content: {
    padding: '18px 20px 16px 20px',
    display: 'flex',
    flexDirection: 'column',
    flexGrow: 1,
  },
  authorRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '12px',
  },
  authorLink: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
  authorAvatar: {
    width: '34px',
    height: '34px',
    borderRadius: '50%',
    objectFit: 'cover',
    border: '1px solid #E2DACD',
  },
  authorAvatarFallback: {
    width: '34px',
    height: '34px',
    borderRadius: '50%',
    backgroundColor: '#FCEDE8',
    color: '#E05D38',
    fontWeight: '700',
    fontSize: '0.85rem',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  authorText: {
    display: 'flex',
    flexDirection: 'column',
  },
  authorName: {
    fontSize: '0.88rem',
    fontWeight: '700',
    color: '#1C1917',
    lineHeight: '1.2',
  },
  authorHandle: {
    fontSize: '0.78rem',
    color: '#8C827A',
  },
  title: {
    fontSize: '1.05rem',
    fontWeight: '700',
    color: '#1C1917',
    marginBottom: '8px',
    lineHeight: '1.35',
    transition: 'color 0.15s',
  },
  description: {
    fontSize: '0.88rem',
    color: '#6E675F',
    lineHeight: '1.5',
    marginBottom: '16px',
    flexGrow: 1,
  },
  cardFooter: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: '12px',
    borderTop: '1px solid #F3ECE1',
    marginTop: 'auto',
  },
  timestamp: {
    fontSize: '0.8rem',
    color: '#8C827A',
  },
  statsGroup: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  statItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    fontSize: '0.82rem',
    color: '#8C827A',
    fontWeight: '600',
  },
};
