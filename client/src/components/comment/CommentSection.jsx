import React, { useState, useEffect } from 'react';
import { MessageSquare, HeartHandshake } from 'lucide-react';
import { commentService } from '../../services/commentService';
import { useToast } from '../../context/ToastContext';
import { CommentForm } from './CommentForm';
import { CommentItem } from './CommentItem';
import { EmptyState } from '../common/EmptyState';

export const CommentSection = ({ videoId, videoOwnerId }) => {
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const { success, error } = useToast();

  useEffect(() => {
    const fetchComments = async () => {
      try {
        setLoading(true);
        const data = await commentService.getVideoComments(videoId);
        if (data.success) {
          setComments(data.comments || []);
        }
      } catch (err) {
        console.error('Failed to load comments:', err);
      } finally {
        setLoading(false);
      }
    };

    if (videoId) {
      fetchComments();
    }
  }, [videoId]);

  const handleCreateComment = async (content) => {
    try {
      setSubmitting(true);
      const data = await commentService.createComment(videoId, content);
      if (data.success) {
        setComments((prev) => [data.comment, ...prev]);
        success('Constructive feedback posted!');
      }
    } catch (err) {
      error(err.message || 'Failed to post feedback. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteComment = async (commentId) => {
    try {
      const data = await commentService.deleteComment(commentId);
      if (data.success) {
        setComments((prev) => prev.filter((c) => c._id !== commentId));
        success('Feedback comment deleted.');
      }
    } catch (err) {
      error(err.message || 'Failed to delete comment.');
    }
  };

  return (
    <section id="comments" style={styles.section}>
      <div style={styles.headerRow}>
        <div style={styles.titleGroup}>
          <MessageSquare size={22} color="#E05D38" />
          <h2 style={styles.title}>Community Feedback</h2>
          <span style={styles.countBadge}>{comments.length}</span>
        </div>
        <div style={styles.hintTag}>
          <HeartHandshake size={14} color="#E05D38" />
          <span>Keep feedback specific & encouraging</span>
        </div>
      </div>

      {/* Form */}
      <CommentForm onSubmit={handleCreateComment} loading={submitting} />

      {/* Comment List */}
      {loading ? (
        <div style={styles.loadingContainer}>
          <div className="animate-spin" style={styles.spinner} />
          <span>Loading community feedback...</span>
        </div>
      ) : comments.length > 0 ? (
        <div style={styles.commentList}>
          {comments.map((comment) => (
            <CommentItem
              key={comment._id}
              comment={comment}
              videoOwnerId={videoOwnerId}
              onDelete={handleDeleteComment}
            />
          ))}
        </div>
      ) : (
        <EmptyState
          icon={<HeartHandshake size={30} color="#E05D38" />}
          title="No feedback yet."
          description="Be the first to share constructive advice on pacing, eye contact, or clarity to help this speaker improve!"
        />
      )}
    </section>
  );
};

const styles = {
  section: {
    marginTop: '40px',
  },
  headerRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '20px',
    flexWrap: 'wrap',
    gap: '12px',
  },
  titleGroup: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
  title: {
    fontSize: '1.4rem',
    fontWeight: '700',
    color: '#1C1917',
  },
  countBadge: {
    backgroundColor: '#FAF7F2',
    border: '1px solid #E2DACD',
    color: '#1C1917',
    fontSize: '0.85rem',
    fontWeight: '700',
    padding: '2px 10px',
    borderRadius: '999px',
  },
  hintTag: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    fontSize: '0.82rem',
    fontWeight: '600',
    color: '#6E675F',
    backgroundColor: '#FAF7F2',
    padding: '4px 12px',
    borderRadius: '999px',
    border: '1px solid #E2DACD',
  },
  loadingContainer: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '12px',
    padding: '40px',
    color: '#8C827A',
  },
  spinner: {
    width: '24px',
    height: '24px',
    border: '2px solid #EDE7DD',
    borderTopColor: '#E05D38',
    borderRadius: '50%',
  },
  commentList: {
    display: 'flex',
    flexDirection: 'column',
  },
};
