import React, { useRef, useState, useEffect, useCallback } from 'react';
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Volume1,
  Maximize,
  Minimize,
  RotateCcw,
  FastForward,
  Rewind,
  Gauge,
  Sparkles,
} from 'lucide-react';

export const VideoPlayer = ({
  src,
  poster,
  title,
  videoId,
  autoPlay = false,
}) => {
  const videoRef = useRef(null);
  const containerRef = useRef(null);
  const controlsTimeoutRef = useRef(null);
  const rippleTimeoutRef = useRef(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [speedMenuOpen, setSpeedMenuOpen] = useState(false);
  const [rippleIcon, setRippleIcon] = useState(null); // 'play' | 'pause' | null

  // Resume Progress Feature ("Continue where you left off")
  const [resumePromptTime, setResumePromptTime] = useState(null);
  const storageKey = videoId ? `articulate_video_pos_${videoId}` : null;

  // Check saved progress on load
  useEffect(() => {
    if (!storageKey) return;
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const parsedTime = parseFloat(saved);
        if (parsedTime > 3) {
          setResumePromptTime(parsedTime);
        }
      }
    } catch (e) {
      // ignore storage error
    }
  }, [storageKey]);

  // Sync isPlaying state with native video element events
  const handlePlayEvent = () => setIsPlaying(true);
  const handlePauseEvent = () => setIsPlaying(false);
  const handleEndedEvent = () => {
    setIsPlaying(false);
    if (storageKey) {
      localStorage.removeItem(storageKey);
    }
  };

  const togglePlay = useCallback(() => {
    if (!videoRef.current) return;

    if (videoRef.current.paused || videoRef.current.ended) {
      const playPromise = videoRef.current.play();
      if (playPromise !== undefined) {
        playPromise
          .then(() => {
            setIsPlaying(true);
            triggerRipple('play');
          })
          .catch((err) => {
            console.warn('Playback prevented or interrupted:', err);
          });
      }
    } else {
      videoRef.current.pause();
      setIsPlaying(false);
      triggerRipple('pause');
    }
  }, []);

  const triggerRipple = (type) => {
    setRippleIcon(type);
    if (rippleTimeoutRef.current) clearTimeout(rippleTimeoutRef.current);
    rippleTimeoutRef.current = setTimeout(() => {
      setRippleIcon(null);
    }, 600);
  };

  const handleTimeUpdate = () => {
    if (!videoRef.current) return;
    const current = videoRef.current.currentTime;
    setCurrentTime(current);

    // Save progress periodically (if > 3 seconds and not near end)
    if (storageKey && current > 3 && duration && current < duration - 4) {
      localStorage.setItem(storageKey, current.toString());
    }
  };

  const handleLoadedMetadata = () => {
    if (!videoRef.current) return;
    const dur = videoRef.current.duration;
    setDuration(dur);

    // Auto-resume if already requested
    if (resumePromptTime && resumePromptTime < dur - 4) {
      // Keep prompt banner visible
    }
  };

  const handleSeek = (e) => {
    const seekTime = parseFloat(e.target.value);
    setCurrentTime(seekTime);
    if (videoRef.current) {
      videoRef.current.currentTime = seekTime;
    }
  };

  const skipSeconds = (seconds) => {
    if (!videoRef.current) return;
    const newTime = Math.max(0, Math.min(duration, videoRef.current.currentTime + seconds));
    videoRef.current.currentTime = newTime;
    setCurrentTime(newTime);
  };

  const handleVolumeChange = (e) => {
    const val = parseFloat(e.target.value);
    setVolume(val);
    if (videoRef.current) {
      videoRef.current.volume = val;
      videoRef.current.muted = val === 0;
      setIsMuted(val === 0);
    }
  };

  const toggleMute = () => {
    if (!videoRef.current) return;
    const nextMuted = !isMuted;
    setIsMuted(nextMuted);
    videoRef.current.muted = nextMuted;
    if (!nextMuted && volume === 0) {
      setVolume(0.5);
      videoRef.current.volume = 0.5;
    }
  };

  const handleSpeedChange = (speed) => {
    if (videoRef.current) {
      videoRef.current.playbackRate = speed;
      setPlaybackSpeed(speed);
      setSpeedMenuOpen(false);
    }
  };

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen?.();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen?.();
      setIsFullscreen(false);
    }
  };

  // Keyboard Shortcuts Listener
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Don't intercept when typing in inputs/textareas
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName)) return;

      if (e.code === 'Space' || e.key === 'k' || e.key === 'K') {
        e.preventDefault();
        togglePlay();
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        skipSeconds(-5);
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        skipSeconds(5);
      } else if (e.key === 'm' || e.key === 'M') {
        e.preventDefault();
        toggleMute();
      } else if (e.key === 'f' || e.key === 'F') {
        e.preventDefault();
        toggleFullscreen();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [togglePlay, isMuted, duration]);

  // Fullscreen change listener
  useEffect(() => {
    const handleFsChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };
    document.addEventListener('fullscreenchange', handleFsChange);
    return () => document.removeEventListener('fullscreenchange', handleFsChange);
  }, []);

  const handleMouseMove = () => {
    setShowControls(true);
    if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    controlsTimeoutRef.current = setTimeout(() => {
      if (isPlaying) {
        setShowControls(false);
        setSpeedMenuOpen(false);
      }
    }, 2800);
  };

  const handleResumeClick = () => {
    if (videoRef.current && resumePromptTime) {
      videoRef.current.currentTime = resumePromptTime;
      setCurrentTime(resumePromptTime);
      setResumePromptTime(null);
      videoRef.current.play().catch(() => {});
    }
  };

  const handleDismissResume = () => {
    setResumePromptTime(null);
    if (storageKey) {
      localStorage.removeItem(storageKey);
    }
  };

  const formatTime = (timeInSec) => {
    if (isNaN(timeInSec) || timeInSec < 0) return '0:00';
    const mins = Math.floor(timeInSec / 60);
    const secs = Math.floor(timeInSec % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  return (
    <div
      ref={containerRef}
      style={styles.playerContainer}
      onMouseMove={handleMouseMove}
      onMouseLeave={() => isPlaying && setShowControls(false)}
    >
      <video
        ref={videoRef}
        src={src}
        poster={poster}
        style={styles.videoElement}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onPlay={handlePlayEvent}
        onPause={handlePauseEvent}
        onEnded={handleEndedEvent}
        onClick={togglePlay}
        playsInline
        preload="metadata"
      />

      {/* Ripple Feedback Animation on click */}
      {rippleIcon && (
        <div style={styles.rippleOverlay}>
          <div style={styles.rippleCircle}>
            {rippleIcon === 'play' ? (
              <Play size={36} color="#FFFFFF" fill="#FFFFFF" style={{ marginLeft: '4px' }} />
            ) : (
              <Pause size={36} color="#FFFFFF" fill="#FFFFFF" />
            )}
          </div>
        </div>
      )}

      {/* Resume Progress Floating Banner ("Continue where you left off") */}
      {resumePromptTime && !isPlaying && (
        <div className="animate-fade-up" style={styles.resumeBanner}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Sparkles size={16} color="#E05D38" />
            <span style={styles.resumeText}>
              Continue from <strong>{formatTime(resumePromptTime)}</strong>?
            </span>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button onClick={handleResumeClick} style={styles.resumeBtnPrimary}>
              Resume
            </button>
            <button onClick={handleDismissResume} style={styles.resumeBtnDismiss}>
              Start Over
            </button>
          </div>
        </div>
      )}

      {/* Big Center Play Button overlay when paused */}
      {!isPlaying && !resumePromptTime && (
        <div style={styles.centerPlayOverlay} onClick={togglePlay}>
          <div style={styles.bigPlayCircle}>
            <Play size={28} color="#FFFFFF" fill="#FFFFFF" style={{ marginLeft: '4px' }} />
          </div>
        </div>
      )}

      {/* Controls Bar Overlay */}
      <div
        style={{
          ...styles.controlsOverlay,
          opacity: showControls || !isPlaying ? 1 : 0,
          pointerEvents: showControls || !isPlaying ? 'auto' : 'none',
        }}
      >
        {/* Scrubber Timeline */}
        <div style={styles.timelineRow}>
          <input
            type="range"
            min="0"
            max={duration || 100}
            step="0.1"
            value={currentTime}
            onChange={handleSeek}
            style={{
              ...styles.timelineSlider,
              background: `linear-gradient(to right, #E05D38 ${(currentTime / (duration || 1)) * 100}%, rgba(255,255,255,0.25) ${(currentTime / (duration || 1)) * 100}%)`,
            }}
            aria-label="Video timeline scrubber"
          />
        </div>

        {/* Action Controls Row */}
        <div style={styles.buttonsRow}>
          {/* Left Group */}
          <div style={styles.leftGroup}>
            <button
              onClick={togglePlay}
              style={styles.controlBtn}
              title={isPlaying ? 'Pause (Space/K)' : 'Play (Space/K)'}
              aria-label={isPlaying ? 'Pause' : 'Play'}
            >
              {isPlaying ? (
                <Pause size={20} />
              ) : (
                <Play size={20} fill="#FFFFFF" style={{ marginLeft: '2px' }} />
              )}
            </button>

            {/* Quick Rewind / Forward 5s */}
            <button
              onClick={() => skipSeconds(-5)}
              style={styles.controlBtnSecondary}
              title="Rewind 5 seconds (Left Arrow)"
              aria-label="Rewind 5s"
            >
              <Rewind size={16} />
            </button>
            <button
              onClick={() => skipSeconds(5)}
              style={styles.controlBtnSecondary}
              title="Forward 5 seconds (Right Arrow)"
              aria-label="Forward 5s"
            >
              <FastForward size={16} />
            </button>

            {/* Volume Control */}
            <div style={styles.volumeGroup}>
              <button
                onClick={toggleMute}
                style={styles.controlBtn}
                title={isMuted ? 'Unmute (M)' : 'Mute (M)'}
                aria-label={isMuted ? 'Unmute' : 'Mute'}
              >
                {isMuted || volume === 0 ? (
                  <VolumeX size={18} />
                ) : volume < 0.5 ? (
                  <Volume1 size={18} />
                ) : (
                  <Volume2 size={18} />
                )}
              </button>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={isMuted ? 0 : volume}
                onChange={handleVolumeChange}
                style={styles.volumeSlider}
                aria-label="Volume level"
              />
            </div>

            {/* Time Stamp */}
            <span style={styles.timeDisplay}>
              {formatTime(currentTime)} / {formatTime(duration)}
            </span>
          </div>

          {/* Right Group */}
          <div style={styles.rightGroup}>
            {/* Speed Selector */}
            <div style={{ position: 'relative' }}>
              <button
                onClick={() => setSpeedMenuOpen(!speedMenuOpen)}
                style={styles.speedBtn}
                title="Playback Speed"
                aria-label="Playback speed selector"
              >
                <Gauge size={15} />
                <span>{playbackSpeed}x</span>
              </button>

              {speedMenuOpen && (
                <div className="animate-scale-in" style={styles.speedDropdown}>
                  {[0.75, 1, 1.25, 1.5, 2].map((s) => (
                    <button
                      key={s}
                      onClick={() => handleSpeedChange(s)}
                      style={{
                        ...styles.speedOption,
                        backgroundColor: playbackSpeed === s ? '#E05D38' : 'transparent',
                        color: playbackSpeed === s ? '#FFFFFF' : '#1C1917',
                        fontWeight: playbackSpeed === s ? '700' : '500',
                      }}
                    >
                      {s}x {s === 1 && '(Normal)'}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Fullscreen Toggle */}
            <button
              onClick={toggleFullscreen}
              style={styles.controlBtn}
              title={isFullscreen ? 'Exit Fullscreen (F)' : 'Fullscreen (F)'}
              aria-label="Toggle Fullscreen"
            >
              {isFullscreen ? <Minimize size={18} /> : <Maximize size={18} />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const styles = {
  playerContainer: {
    position: 'relative',
    width: '100%',
    aspectRatio: '16 / 9',
    backgroundColor: '#0F0E0E',
    borderRadius: '16px',
    overflow: 'hidden',
    boxShadow: '0 10px 32px rgba(0, 0, 0, 0.2)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    userSelect: 'none',
  },
  videoElement: {
    width: '100%',
    height: '100%',
    objectFit: 'contain',
    cursor: 'pointer',
    backgroundColor: '#000000',
  },
  centerPlayOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    backgroundColor: 'rgba(0, 0, 0, 0.25)',
    transition: 'background-color 0.2s ease',
  },
  bigPlayCircle: {
    width: '68px',
    height: '68px',
    borderRadius: '50%',
    backgroundColor: '#E05D38',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 6px 24px rgba(224, 93, 56, 0.45)',
    transition: 'transform 0.15s ease',
  },
  rippleOverlay: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    pointerEvents: 'none',
    zIndex: 50,
  },
  rippleCircle: {
    width: '80px',
    height: '80px',
    borderRadius: '50%',
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backdropFilter: 'blur(4px)',
    animation: 'scaleIn 0.3s ease-out forwards',
  },
  resumeBanner: {
    position: 'absolute',
    top: '20px',
    left: '20px',
    right: '20px',
    backgroundColor: 'rgba(25, 23, 22, 0.88)',
    backdropFilter: 'blur(10px)',
    border: '1px solid rgba(255, 255, 255, 0.15)',
    borderRadius: '12px',
    padding: '12px 18px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    zIndex: 60,
    flexWrap: 'wrap',
    gap: '12px',
    boxShadow: '0 8px 24px rgba(0, 0, 0, 0.3)',
  },
  resumeText: {
    color: '#FFFFFF',
    fontSize: '0.88rem',
    fontWeight: '500',
  },
  resumeBtnPrimary: {
    backgroundColor: '#E05D38',
    color: '#FFFFFF',
    border: 'none',
    borderRadius: '6px',
    padding: '5px 12px',
    fontSize: '0.82rem',
    fontWeight: '600',
    cursor: 'pointer',
  },
  resumeBtnDismiss: {
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    color: '#E0DACD',
    border: 'none',
    borderRadius: '6px',
    padding: '5px 12px',
    fontSize: '0.82rem',
    fontWeight: '500',
    cursor: 'pointer',
  },
  controlsOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    background: 'linear-gradient(to top, rgba(0,0,0,0.9) 0%, rgba(0,0,0,0.5) 60%, transparent 100%)',
    padding: '24px 18px 12px 18px',
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
    transition: 'opacity 0.25s ease',
    zIndex: 40,
  },
  timelineRow: {
    width: '100%',
    display: 'flex',
    alignItems: 'center',
  },
  timelineSlider: {
    width: '100%',
    height: '6px',
    borderRadius: '3px',
    appearance: 'none',
    cursor: 'pointer',
    outline: 'none',
    transition: 'height 0.15s ease',
  },
  buttonsRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: '8px',
  },
  leftGroup: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  rightGroup: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  controlBtn: {
    background: 'none',
    border: 'none',
    color: '#FFFFFF',
    cursor: 'pointer',
    padding: '6px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: '6px',
    transition: 'transform 0.1s ease, color 0.15s ease',
  },
  controlBtnSecondary: {
    background: 'none',
    border: 'none',
    color: '#CCCCCC',
    cursor: 'pointer',
    padding: '4px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: '4px',
    transition: 'color 0.15s ease',
  },
  volumeGroup: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  },
  volumeSlider: {
    width: '65px',
    height: '4px',
    accentColor: '#FFFFFF',
    cursor: 'pointer',
  },
  timeDisplay: {
    color: '#E0DACD',
    fontSize: '0.82rem',
    fontWeight: '500',
    fontVariantNumeric: 'tabular-nums',
  },
  speedBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '4px',
    background: 'rgba(255, 255, 255, 0.15)',
    border: 'none',
    borderRadius: '6px',
    color: '#FFFFFF',
    padding: '4px 8px',
    fontSize: '0.8rem',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'background-color 0.15s',
  },
  speedDropdown: {
    position: 'absolute',
    bottom: 'calc(100% + 8px)',
    right: 0,
    backgroundColor: '#FFFFFF',
    borderRadius: '8px',
    boxShadow: '0 8px 24px rgba(0, 0, 0, 0.25)',
    overflow: 'hidden',
    zIndex: 100,
    display: 'flex',
    flexDirection: 'column',
    minWidth: '100px',
  },
  speedOption: {
    padding: '6px 12px',
    fontSize: '0.82rem',
    border: 'none',
    textAlign: 'left',
    cursor: 'pointer',
    transition: 'background-color 0.15s',
  },
};
