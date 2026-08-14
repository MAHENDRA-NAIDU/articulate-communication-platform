import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Trash2, ShieldCheck, Sparkles } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

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

export const CommentItem = ({
  comment,
  videoOwnerId,
  onDelete,
}) => {
  const { user, isAdmin } = useAuth();
  const [isDeleting, setIsDeleting] = useState(false);

  const author = comment.userId || {};
  const isCommentAuthor = user && user._id === (author._id || author.id);
  const isVideoOwner = user && user._id === videoOwnerId;
  const canDelete = isCommentAuthor || isVideoOwner || isAdmin;

  const handleDelete = async () => {
    if (window.confirm('Are you sure you want to delete this feedback comment?')) {
      setIsDeleting(true);
      try {
        await onDelete(comment._id);
      } finally {
        setIsDeleting(false);
      }
    }
  };

  return (
    <div className="card" style={styles.container}>
      <div style={styles.header}>
        <div style={styles.authorRow}>
          <Link to={`/profile/${author._id || author.username}`}>
            {author.profileImage ? (
              <img
                src={author.profileImage}
                alt={author.name}
                style={styles.avatar}
              />
            ) : (
              <div style={styles.avatarFallback}>
                {author.name?.charAt(0).toUpperCase() || 'U'}
              </div>
            )}
          </Link>
          <div style={styles.authorMeta}>
            <div style={styles.nameRow}>
              <Link to={`/profile/${author._id || author.username}`} style={styles.name}>
                {author.name || 'Community Member'}
              </Link>
              {author.role === 'admin' && (
                <span className="badge-role-admin" style={{ display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                  <ShieldCheck size={11} /> Admin
                </span>
              )}
              {isVideoOwner && isCommentAuthor && (
                <span style={styles.creatorTag}>
                  <Sparkles size={11} /> Creator
                </span>
              )}
            </div>
            <span style={styles.timestamp}>{formatTimeAgo(comment.createdAt)}</span>
          </div>
        </div>

        {canDelete && (
          <button
            onClick={handleDelete}
            disabled={isDeleting}
            style={styles.deleteBtn}
            title={isVideoOwner && !isCommentAuthor ? 'Moderate comment on your video' : 'Delete comment'}
            aria-label="Delete comment"
          >
            <Trash2 size={15} />
          </button>
        )}
      </div>

      <div style={styles.body}>
        <p style={styles.content}>{comment.content}</p>
      </div>
    </div>
  );
};

const styles = {
  container: {
    padding: '16px 20px',
    backgroundColor: '#FFFFFF',
    borderRadius: '14px',
    border: '1px solid #EDE7DD',
    marginBottom: '12px',
  },
  header: {
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: '10px',
  },
  authorRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
  avatar: {
    width: '36px',
    height: '36px',
    borderRadius: '50%',
    objectFit: 'cover',
    border: '1px solid #E2DACD',
  },
  avatarFallback: {
    width: '36px',
    height: '36px',
    borderRadius: '50%',
    backgroundColor: '#FCEDE8',
    color: '#E05D38',
    fontWeight: '700',
    fontSize: '0.85rem',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  authorMeta: {
    display: 'flex',
    flexDirection: 'column',
  },
  nameRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  name: {
    fontSize: '0.92rem',
    fontWeight: '700',
    color: '#1C1917',
  },
  creatorTag: {
    padding: '1px 7px',
    fontSize: '0.72rem',
    fontWeight: '700',
    borderRadius: '999px',
    backgroundColor: '#FDF1ED',
    color: '#E05D38',
    border: '1px solid #F7D7CE',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '3px',
  },
  timestamp: {
    fontSize: '0.78rem',
    color: '#8C827A',
  },
  deleteBtn: {
    background: 'none',
    border: 'none',
    color: '#A8A29E',
    cursor: 'pointer',
    padding: '6px',
    borderRadius: '6px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'color 0.15s, background-color 0.15s',
  },
  body: {
    paddingLeft: '46px',
  },
  content: {
    fontSize: '0.92rem',
    color: '#44403C',
    lineHeight: '1.6',
    whiteSpace: 'pre-line',
  },
};
