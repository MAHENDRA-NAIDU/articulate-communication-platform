import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  UploadCloud,
  Film,
  Image,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  ArrowRight,
  X,
} from 'lucide-react';
import { videoService } from '../services/videoService';
import { useToast } from '../context/ToastContext';
import { Button } from '../components/common/Button';

const CATEGORIES = [
  { name: 'Self Introduction', desc: 'Personal pitch, background overview, or campus placement intro.' },
  { name: 'Interview Practice', desc: 'Behavioral questions, technical answers using the STAR method.' },
  { name: 'Group Discussion', desc: 'Initiating discussion, balanced arguments, collaborative points.' },
  { name: 'Daily Life', desc: 'Impromptu speaking, morning routines, conversational storytelling.' },
  { name: 'Technology', desc: 'Explaining technical concepts, system design, or engineering ideas.' },
  { name: 'Debate', desc: 'Persuasive argumentation, counter-points, and formal speaking.' },
  { name: 'Storytelling', desc: 'Narrative pacing, anecdotes, vocal variety, and emotion.' },
  { name: 'College', desc: 'Academic presentations, club pitches, and student talks.' },
  { name: 'General', desc: 'Any open practice drill or impromptu speech.' },
];

export const UploadPage = () => {
  const navigate = useNavigate();
  const { success, error } = useToast();
  const videoInputRef = useRef(null);
  const thumbnailInputRef = useRef(null);
  const previewVideoRef = useRef(null);

  const [videoFile, setVideoFile] = useState(null);
  const [videoPreviewUrl, setVideoPreviewUrl] = useState('');
  const [thumbnailFile, setThumbnailFile] = useState(null);
  const [thumbnailPreviewUrl, setThumbnailPreviewUrl] = useState('');
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('Self Introduction');
  const [description, setDescription] = useState('');
  const [duration, setDuration] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStatusText, setUploadStatusText] = useState('');

  const handleVideoSelect = (file) => {
    if (!file) return;

    // Validate size (2GB max to support long high-bitrate / 4K videos)
    const MAX_ALLOWED_BYTES = 2048 * 1024 * 1024;
    if (file.size > MAX_ALLOWED_BYTES) {
      error('Video file is too large. Maximum allowed size is 2GB.');
      return;
    }

    setVideoFile(file);
    const objectUrl = URL.createObjectURL(file);
    setVideoPreviewUrl(objectUrl);

    // Auto-fill title if empty
    if (!title) {
      const cleanFileName = file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');
      setTitle(cleanFileName.charAt(0).toUpperCase() + cleanFileName.slice(1));
    }
  };

  const handleThumbnailSelect = (file) => {
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      error('Thumbnail image is too large. Maximum size is 10MB.');
      return;
    }
    setThumbnailFile(file);
    setThumbnailPreviewUrl(URL.createObjectURL(file));
  };

  const handleCaptureThumbnailFromVideo = () => {
    if (!previewVideoRef.current) return;
    const video = previewVideoRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 360;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    canvas.toBlob((blob) => {
      if (blob) {
        const file = new File([blob], 'snapshot-thumb.jpg', { type: 'image/jpeg' });
        setThumbnailFile(file);
        setThumbnailPreviewUrl(URL.createObjectURL(blob));
        success('Captured thumbnail snapshot from video!');
      }
    }, 'image/jpeg', 0.85);
  };

  const handleMetadataLoaded = () => {
    if (previewVideoRef.current) {
      setDuration(Math.round(previewVideoRef.current.duration));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!videoFile) {
      error('Please select a speaking practice video file.');
      return;
    }

    if (!title.trim()) {
      error('Please provide a title for your video.');
      return;
    }

    try {
      setUploading(true);
      setUploadProgress(0);
      setUploadStatusText('Preparing video upload...');

      const formData = new FormData();
      formData.append('video', videoFile);
      if (thumbnailFile) {
        formData.append('thumbnail', thumbnailFile);
      }
      formData.append('title', title.trim());
      formData.append('category', category);
      formData.append('description', description.trim());
      formData.append('duration', duration.toString());

      const data = await videoService.createVideo(formData, (progress) => {
        const loadedMb = (progress.loaded / (1024 * 1024)).toFixed(1);
        const totalMb = (progress.total / (1024 * 1024)).toFixed(1);
        if (progress.percent >= 100) {
          // Client transmission finished; server is saving & uploading to cloud storage
          setUploadProgress(99);
          setUploadStatusText('Processing and finalizing on server...');
        } else {
          setUploadProgress(progress.percent);
          setUploadStatusText(`Uploading ${progress.percent}% (${loadedMb} MB / ${totalMb} MB)...`);
        }
      });

      setUploadProgress(100);
      setUploadStatusText('Upload complete!');

      if (data.success && data.video) {
        success('Your speaking practice video was published successfully!');
        navigate(`/video/${data.video._id}`);
      }
    } catch (err) {
      error(err.message || 'Failed to upload practice video. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const removeVideo = () => {
    setVideoFile(null);
    setVideoPreviewUrl('');
    setDuration(0);
    if (videoInputRef.current) videoInputRef.current.value = '';
  };

  return (
    <div style={styles.page}>
      <div className="container" style={styles.container}>
        {/* Header */}
        <div style={styles.header}>
          <span style={styles.headerTag}>Share Your Practice</span>
          <h1 className="heading-display" style={styles.title}>
            Upload Speaking Drill
          </h1>
          <p style={styles.subtitle}>
            Publish a short 1–3 minute speaking video to get constructive feedback from fellow learners on pace, eye contact, and vocal clarity.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="upload-form-grid" style={styles.formGrid}>
          {/* Left Column: Video File Dropzone & Preview */}
          <div style={styles.leftCol}>
            <div className="card" style={styles.uploadCard}>
              <h3 style={styles.cardHeading}>Video File</h3>

              {!videoFile ? (
                <div
                  style={styles.dropzone}
                  onClick={() => videoInputRef.current?.click()}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                      handleVideoSelect(e.dataTransfer.files[0]);
                    }
                  }}
                >
                  <div style={styles.dropIconCircle}>
                    <UploadCloud size={32} color="#E05D38" />
                  </div>
                  <h4 style={styles.dropTitle}>Click to upload or drag & drop</h4>
                  <p style={styles.dropHint}>
                    MP4, WebM, MOV, or MKV format (up to 2GB)
                  </p>
                  <Button variant="secondary" size="sm" style={{ marginTop: '12px' }}>
                    Choose Video File
                  </Button>
                  <input
                    ref={videoInputRef}
                    type="file"
                    accept="video/mp4,video/webm,video/quicktime,video/ogg,video/x-matroska,video/*"
                    onChange={(e) => handleVideoSelect(e.target.files?.[0])}
                    style={{ display: 'none' }}
                  />
                </div>
              ) : (
                <div style={styles.previewContainer}>
                  <div style={styles.previewHeader}>
                    <div style={styles.fileInfo}>
                      <Film size={16} color="#E05D38" />
                      <span style={styles.fileName}>{videoFile.name}</span>
                      <span style={styles.fileSize}>
                        ({(videoFile.size / (1024 * 1024)).toFixed(1)} MB)
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={removeVideo}
                      style={styles.removeFileBtn}
                      aria-label="Remove video"
                    >
                      <X size={16} />
                    </button>
                  </div>

                  {/* HTML5 video element for preview & thumbnail generation */}
                  <video
                    ref={previewVideoRef}
                    src={videoPreviewUrl}
                    controls
                    onLoadedMetadata={handleMetadataLoaded}
                    style={styles.previewVideo}
                  />

                  {/* Thumbnail generator helper */}
                  <div style={styles.snapshotRow}>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={handleCaptureThumbnailFromVideo}
                      icon={<Image size={14} />}
                    >
                      Capture Current Frame as Thumbnail
                    </Button>
                  </div>
                </div>
              )}
            </div>

            {/* Optional Custom Thumbnail */}
            <div className="card" style={styles.uploadCard}>
              <div style={styles.cardHeaderWithInfo}>
                <h3 style={styles.cardHeading}>Thumbnail Image (Optional)</h3>
                <span style={styles.optionalTag}>Optional</span>
              </div>
              <p style={styles.optionalDesc}>
                If not provided, a frame snapshot or default preview card will be used.
              </p>

              {thumbnailPreviewUrl ? (
                <div style={styles.thumbPreviewWrapper}>
                  <img
                    src={thumbnailPreviewUrl}
                    alt="Thumbnail preview"
                    style={styles.thumbPreviewImg}
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setThumbnailFile(null);
                      setThumbnailPreviewUrl('');
                    }}
                    style={styles.removeThumbBtn}
                  >
                    <X size={14} /> Remove
                  </button>
                </div>
              ) : (
                <div
                  style={styles.thumbDropzone}
                  onClick={() => thumbnailInputRef.current?.click()}
                >
                  <Image size={20} color="#8C827A" />
                  <span style={styles.thumbDropText}>Upload custom thumbnail image (JPG/PNG)</span>
                  <input
                    ref={thumbnailInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={(e) => handleThumbnailSelect(e.target.files?.[0])}
                    style={{ display: 'none' }}
                  />
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Title, Category, Goals */}
          <div style={styles.rightCol}>
            <div className="card" style={styles.formCard}>
              <h3 style={styles.cardHeading}>Speaking Drill Details</h3>

              {/* Title */}
              <div className="form-group">
                <label className="form-label">
                  Practice Video Title <span style={{ color: '#E05D38' }}>*</span>
                </label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. Self Introduction for Campus Placements"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  maxLength={120}
                  required
                />
                <span className="form-hint">A clear, descriptive title helps peers provide targeted feedback.</span>
              </div>

              {/* Category */}
              <div className="form-group">
                <label className="form-label">
                  Speaking Category / Topic <span style={{ color: '#E05D38' }}>*</span>
                </label>
                <select
                  className="form-select"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                >
                  {CATEGORIES.map((cat) => (
                    <option key={cat.name} value={cat.name}>
                      {cat.name}
                    </option>
                  ))}
                </select>
                <span className="form-hint">
                  {CATEGORIES.find((c) => c.name === category)?.desc}
                </span>
              </div>

              {/* Description / Speaking Goals */}
              <div className="form-group">
                <label className="form-label">What are your practice goals? (Description)</label>
                <textarea
                  className="form-textarea"
                  rows={4}
                  placeholder="e.g. In this 90-second drill, I am working on eliminating 'um' filler words and maintaining natural eye contact with the camera. Please let me know how my pace felt."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  maxLength={1000}
                />
                <span className="form-hint">
                  {description.length}/1000 characters
                </span>
              </div>

              {/* Upload Progress Indicator */}
              {uploading && (
                <div style={styles.progressContainer}>
                  <div style={styles.progressTextRow}>
                    <span style={styles.progressLabel}>{uploadStatusText || 'Publishing Practice Video...'}</span>
                    <span style={styles.progressVal}>{uploadProgress}%</span>
                  </div>
                  <div style={styles.progressBarBg}>
                    <div
                      style={{
                        ...styles.progressBarFill,
                        width: `${uploadProgress}%`,
                      }}
                    />
                  </div>
                </div>
              )}

              {/* Submit Button */}
              <div style={styles.submitRow}>
                <Button
                  type="submit"
                  variant="primary"
                  size="lg"
                  loading={uploading}
                  disabled={!videoFile || !title.trim()}
                  icon={<Sparkles size={18} />}
                  style={{ width: '100%' }}
                >
                  {uploading ? 'Uploading Video...' : 'Publish Practice Video'}
                </Button>
              </div>
            </div>
          </div>
        </form>
      </div>
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
  header: {
    marginBottom: '36px',
    textAlign: 'center',
  },
  headerTag: {
    fontSize: '0.82rem',
    fontWeight: '700',
    color: '#E05D38',
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
    marginBottom: '6px',
    display: 'inline-block',
  },
  title: {
    fontSize: 'clamp(2rem, 3.5vw, 2.7rem)',
    color: '#1C1917',
    marginBottom: '10px',
  },
  subtitle: {
    fontSize: '1rem',
    color: '#6E675F',
    maxWidth: '600px',
    margin: '0 auto',
    lineHeight: '1.6',
  },
  formGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '32px',
  },
  leftCol: {
    display: 'flex',
    flexDirection: 'column',
    gap: '24px',
  },
  rightCol: {
    display: 'flex',
    flexDirection: 'column',
  },
  uploadCard: {
    padding: '24px',
    backgroundColor: '#FFFFFF',
  },
  formCard: {
    padding: '28px',
    backgroundColor: '#FFFFFF',
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
  },
  cardHeading: {
    fontSize: '1.05rem',
    fontWeight: '700',
    color: '#1C1917',
    marginBottom: '16px',
  },
  cardHeaderWithInfo: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '4px',
  },
  optionalTag: {
    fontSize: '0.75rem',
    color: '#8C827A',
    fontWeight: '600',
    backgroundColor: '#FAF7F2',
    padding: '2px 8px',
    borderRadius: '999px',
    border: '1px solid #E2DACD',
  },
  optionalDesc: {
    fontSize: '0.82rem',
    color: '#8C827A',
    marginBottom: '16px',
  },
  dropzone: {
    border: '2px dashed #D0C5B5',
    borderRadius: '16px',
    padding: '40px 20px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    textAlign: 'center',
    cursor: 'pointer',
    backgroundColor: '#FAF7F2',
    transition: 'border-color 0.2s, background-color 0.2s',
  },
  dropIconCircle: {
    width: '60px',
    height: '60px',
    borderRadius: '50%',
    backgroundColor: '#FCEDE8',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: '14px',
  },
  dropTitle: {
    fontSize: '1rem',
    fontWeight: '700',
    color: '#1C1917',
    marginBottom: '6px',
  },
  dropHint: {
    fontSize: '0.84rem',
    color: '#8C827A',
  },
  previewContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  previewHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '10px 14px',
    backgroundColor: '#FAF7F2',
    borderRadius: '10px',
    border: '1px solid #E2DACD',
  },
  fileInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    overflow: 'hidden',
  },
  fileName: {
    fontSize: '0.85rem',
    fontWeight: '600',
    color: '#1C1917',
    whiteSpace: 'nowrap',
    textOverflow: 'ellipsis',
    overflow: 'hidden',
    maxWidth: '220px',
  },
  fileSize: {
    fontSize: '0.78rem',
    color: '#8C827A',
  },
  removeFileBtn: {
    background: 'none',
    border: 'none',
    color: '#A8A29E',
    cursor: 'pointer',
    padding: '4px',
  },
  previewVideo: {
    width: '100%',
    aspectRatio: '16 / 9',
    backgroundColor: '#191716',
    borderRadius: '12px',
    objectFit: 'contain',
  },
  snapshotRow: {
    display: 'flex',
    justifyContent: 'center',
  },
  thumbDropzone: {
    border: '1px dashed #D0C5B5',
    borderRadius: '12px',
    padding: '20px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '10px',
    cursor: 'pointer',
    backgroundColor: '#FAF7F2',
  },
  thumbDropText: {
    fontSize: '0.85rem',
    color: '#6E675F',
    fontWeight: '500',
  },
  thumbPreviewWrapper: {
    position: 'relative',
    borderRadius: '12px',
    overflow: 'hidden',
    aspectRatio: '16 / 9',
  },
  thumbPreviewImg: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
  },
  removeThumbBtn: {
    position: 'absolute',
    top: '10px',
    right: '10px',
    backgroundColor: 'rgba(25, 23, 22, 0.75)',
    color: '#FFFFFF',
    border: 'none',
    borderRadius: '6px',
    padding: '4px 8px',
    fontSize: '0.75rem',
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    cursor: 'pointer',
  },
  progressContainer: {
    marginBottom: '20px',
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  progressTextRow: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '0.85rem',
    fontWeight: '600',
    color: '#1C1917',
  },
  progressBarBg: {
    width: '100%',
    height: '8px',
    backgroundColor: '#EDE7DD',
    borderRadius: '999px',
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#E05D38',
    transition: 'width 0.3s ease',
  },
  submitRow: {
    marginTop: 'auto',
    paddingTop: '20px',
  },
};

// Add responsive rules in CSS
if (typeof document !== 'undefined') {
  const styleEl = document.createElement('style');
  styleEl.innerHTML = `
    @media (max-width: 860px) {
      .upload-form-grid {
        grid-template-columns: 1fr !important;
      }
    }
  `;
  document.head.appendChild(styleEl);
}
