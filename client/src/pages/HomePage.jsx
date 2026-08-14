import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Mic,
  Video,
  MessageSquare,
  Sparkles,
  TrendingUp,
  ArrowRight,
  CheckCircle2,
  Users,
  Award,
  Play,
} from 'lucide-react';
import { videoService } from '../services/videoService';
import { VideoCard } from '../components/video/VideoCard';
import { VideoGridSkeleton } from '../components/common/LoadingSkeleton';
import { Button } from '../components/common/Button';
import { MarqueeTicker } from '../components/common/MarqueeTicker';
import { useScrollReveal } from '../hooks/useScrollReveal';

export const HomePage = () => {
  const [recentVideos, setRecentVideos] = useState([]);
  const [loading, setLoading] = useState(true);

  // Trigger intersection observer scroll reveal animations
  useScrollReveal([loading, recentVideos]);

  useEffect(() => {
    const fetchRecentVideos = async () => {
      try {
        setLoading(true);
        const data = await videoService.getVideos({ limit: 3, sort: 'newest' });
        if (data.success) {
          setRecentVideos(data.videos || []);
        }
      } catch (err) {
        console.error('Failed to load recent videos:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchRecentVideos();
  }, []);

  return (
    <div style={styles.page}>
      {/* HERO SECTION */}
      <section style={styles.heroSection}>
        <div className="container hero-grid" style={styles.heroContainer}>
          <div style={styles.heroContent} className="animate-fade-up">
            {/* Pill Tag */}
            <div style={styles.heroPill}>
              <Mic size={14} color="#E05D38" />
              <span>Community-Driven Speaking Practice</span>
            </div>

            {/* Main Headline */}
            <h1 className="heading-display" style={styles.heroTitle}>
              Speak. Practice. <br />
              <span style={{ color: '#E05D38' }}>Improve.</span>
            </h1>

            {/* Subheading */}
            <p style={styles.heroSubtitle}>
              Master the art of communication. Upload short speaking videos, receive
              kind, constructive feedback from fellow learners, and build confidence
              one drill at a time.
            </p>

            {/* Hero CTAs */}
            <div style={styles.heroCtaGroup}>
              <Link to="/upload">
                <Button variant="primary" size="lg" icon={<Video size={18} />}>
                  Start Practicing
                </Button>
              </Link>
              <Link to="/explore">
                <Button variant="secondary" size="lg" icon={<ArrowRight size={18} />}>
                  Explore Videos
                </Button>
              </Link>
            </div>

            {/* Social Proof Metrics */}
            <div style={styles.heroStatsRow}>
              <div style={styles.heroStatItem}>
                <span style={styles.heroStatNum}>100%</span>
                <span style={styles.heroStatLabel}>Constructive & Safe</span>
              </div>
              <div style={styles.statDivider} />
              <div style={styles.heroStatItem}>
                <span style={styles.heroStatNum}>9+</span>
                <span style={styles.heroStatLabel}>Speaking Categories</span>
              </div>
              <div style={styles.statDivider} />
              <div style={styles.heroStatItem}>
                <span style={styles.heroStatNum}>Daily</span>
                <span style={styles.heroStatLabel}>Practice Feedback</span>
              </div>
            </div>
          </div>

          {/* Hero Visual Video Card (Mahendra Naidu) */}
          <div style={styles.heroVisual} className="animate-fade-in">
            <div style={styles.heroVideoCard}>
              <div style={styles.heroVideoHeader}>
                <div style={styles.heroAuthorSnippet}>
                  <img
                    src="/avatars/mahendra.jpg"
                    alt="Mahendra Naidu"
                    style={styles.heroAvatar}
                  />
                  <div>
                    <div style={styles.heroSpeakerName}>Mahendra Naidu</div>
                    <div style={styles.heroSpeakerHandle}>@mahendra • Placement Prep</div>
                  </div>
                </div>
                <span className="category-badge">Self Introduction</span>
              </div>

              <Link to="/explore" style={{ textDecoration: 'none' }}>
                <div style={styles.heroVideoPreviewBox} className="card-interactive">
                  <img
                    src="https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=800&auto=format&fit=crop&q=80"
                    alt="Speaking Practice"
                    style={styles.heroPreviewImg}
                  />
                  <div style={styles.heroPlayBadge}>
                    <Play size={22} color="#FFFFFF" fill="#FFFFFF" style={{ marginLeft: '2px' }} />
                  </div>
                  <div style={styles.heroDuration}>1:15</div>
                </div>
              </Link>

              <div style={styles.heroFeedbackCard}>
                <div style={styles.heroFeedbackHeader}>
                  <Sparkles size={14} color="#E05D38" />
                  <span style={styles.heroFeedbackLabel}>Community Peer Feedback</span>
                </div>
                <p style={styles.heroFeedbackQuote}>
                  "Your explanation of your software projects was super crisp Mahendra! Pausing for 1 second before key metrics made your message hit even stronger."
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* RUNNING MARQUEE TICKER */}
      <MarqueeTicker />

      {/* WHY THIS PLATFORM */}
      <section style={styles.section} className="reveal-on-scroll">
        <div className="container">
          <div style={styles.sectionHeader}>
            <span style={styles.sectionTag}>Built For Growth</span>
            <h2 className="heading-display" style={styles.sectionTitle}>
              Why Practice On This Platform?
            </h2>
            <p style={styles.sectionSubtitle}>
              Traditional social apps prioritize viral entertainment. Articulate is focused 100% on communication growth, constructive feedback, and speaking confidence.
            </p>
          </div>

          <div style={styles.pillarsGrid}>
            <div className="card card-interactive reveal-on-scroll stagger-1" style={styles.pillarCard}>
              <div style={{ ...styles.pillarIconCircle, backgroundColor: '#FDF1ED' }}>
                <Video size={24} color="#E05D38" />
              </div>
              <h3 style={styles.pillarTitle}>Practice Regularly</h3>
              <p style={styles.pillarDesc}>
                Upload short 1 to 3 minute speaking videos daily. Building a consistent habit is the fastest way to overcome speech hesitation and stage fright.
              </p>
            </div>

            <div className="card card-interactive reveal-on-scroll stagger-2" style={styles.pillarCard}>
              <div style={{ ...styles.pillarIconCircle, backgroundColor: '#EDF7ED' }}>
                <MessageSquare size={24} color="#2E7D32" />
              </div>
              <h3 style={styles.pillarTitle}>Get Honest Feedback</h3>
              <p style={styles.pillarDesc}>
                Receive kind, actionable critique from peers on your eye contact, pacing, vocal clarity, and structured presentation methods.
              </p>
            </div>

            <div className="card card-interactive reveal-on-scroll stagger-3" style={styles.pillarCard}>
              <div style={{ ...styles.pillarIconCircle, backgroundColor: '#EBF4FF' }}>
                <Users size={24} color="#1E88E5" />
              </div>
              <h3 style={styles.pillarTitle}>Learn From Others</h3>
              <p style={styles.pillarDesc}>
                Watch how other students, engineers, and job seekers articulate complex topics, answer behavioral prompts, and handle debate points.
              </p>
            </div>

            <div className="card card-interactive reveal-on-scroll stagger-4" style={styles.pillarCard}>
              <div style={{ ...styles.pillarIconCircle, backgroundColor: '#FFF7ED' }}>
                <TrendingUp size={24} color="#EA580C" />
              </div>
              <h3 style={styles.pillarTitle}>Track Your Journey</h3>
              <p style={styles.pillarDesc}>
                Maintain a personal practice archive of every speaking attempt. Look back and celebrate tangible improvements in your confidence over time.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section style={styles.howItWorksSection} className="reveal-on-scroll">
        <div className="container">
          <div style={styles.sectionHeader}>
            <span style={styles.sectionTag}>Simple 6-Step Workflow</span>
            <h2 className="heading-display" style={styles.sectionTitle}>
              How It Works
            </h2>
            <p style={styles.sectionSubtitle}>
              From recording your first drill to refining your speaking cadence, here is your daily practice cycle.
            </p>
          </div>

          <div style={styles.stepsGrid}>
            {[
              { num: '01', title: 'Create Account', desc: 'Sign up in seconds to join a supportive community of learners.' },
              { num: '02', title: 'Pick a Speaking Topic', desc: 'Choose from Self Introductions, Interview Drills, Debates, or Storytelling.' },
              { num: '03', title: 'Record & Upload Video', desc: 'Record a quick 60–120s clip and upload it directly from your device.' },
              { num: '04', title: 'Publish to Community', desc: 'Your practice video appears on the community feed for peers to view.' },
              { num: '05', title: 'Receive Constructive Feedback', desc: 'Get practical feedback on clarity, filler words, and vocal delivery.' },
              { num: '06', title: 'Practice & Refine', desc: 'Incorporate recommendations in your next video drill and build mastery.' },
            ].map((step, idx) => (
              <div
                key={step.num}
                className={`card card-interactive reveal-on-scroll stagger-${(idx % 4) + 1}`}
                style={styles.stepCard}
              >
                <span style={styles.stepNumber}>{step.num}</span>
                <h4 style={styles.stepTitle}>{step.title}</h4>
                <p style={styles.stepDesc}>{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* LATEST COMMUNITY PRACTICE VIDEOS */}
      <section style={styles.section} className="reveal-on-scroll">
        <div className="container">
          <div style={styles.feedHeaderRow}>
            <div>
              <span style={styles.sectionTag}>Fresh Community Drills</span>
              <h2 className="heading-display" style={styles.sectionTitle}>
                Recent Speaking Practice
              </h2>
            </div>
            <Link to="/explore">
              <Button variant="secondary" size="md" icon={<ArrowRight size={16} />}>
                View All Videos
              </Button>
            </Link>
          </div>

          {loading ? (
            <VideoGridSkeleton count={3} />
          ) : (
            <div className="grid-responsive">
              {recentVideos.map((video, idx) => (
                <div key={video._id} className={`reveal-on-scroll stagger-${idx + 1}`}>
                  <VideoCard video={video} />
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* CALL TO ACTION BANNER */}
      <section style={styles.ctaSection} className="reveal-on-scroll">
        <div className="container" style={styles.ctaContainer}>
          <div style={styles.ctaCard}>
            <span style={styles.ctaBadge}>Join 500+ Active Practice Learners</span>
            <h2 className="heading-display" style={styles.ctaTitle}>
              Ready to build confidence in your speaking?
            </h2>
            <p style={styles.ctaSubtitle}>
              Whether preparing for campus placements, technical interviews, or public presentations, regular video practice will transform how you communicate.
            </p>
            <div style={styles.ctaButtonGroup}>
              <Link to="/register">
                <Button variant="primary" size="lg">
                  Create Your Free Account
                </Button>
              </Link>
              <Link to="/explore">
                <Button variant="dark" size="lg">
                  Watch Community Videos
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

const styles = {
  page: {
    display: 'flex',
    flexDirection: 'column',
  },
  heroSection: {
    padding: '64px 0 80px 0',
    backgroundColor: '#FAF7F2',
    borderBottom: '1px solid #EDE7DD',
  },
  heroContainer: {
    display: 'grid',
    gridTemplateColumns: '1.2fr 1fr',
    gap: '48px',
    alignItems: 'center',
  },
  heroContent: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
  },
  heroPill: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '8px',
    padding: '6px 14px',
    backgroundColor: '#FDF1ED',
    border: '1px solid #F7D7CE',
    borderRadius: '999px',
    color: '#E05D38',
    fontSize: '0.84rem',
    fontWeight: '700',
    width: 'fit-content',
  },
  heroTitle: {
    fontSize: 'clamp(2.5rem, 5vw, 4rem)',
    color: '#1C1917',
    fontWeight: '800',
    lineHeight: '1.1',
  },
  heroSubtitle: {
    fontSize: '1.12rem',
    color: '#57534E',
    lineHeight: '1.65',
    maxWidth: '520px',
  },
  heroCtaGroup: {
    display: 'flex',
    alignItems: 'center',
    gap: '14px',
    marginTop: '8px',
    flexWrap: 'wrap',
  },
  heroStatsRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '24px',
    marginTop: '24px',
    paddingTop: '24px',
    borderTop: '1px solid #E2DACD',
  },
  heroStatItem: {
    display: 'flex',
    flexDirection: 'column',
  },
  heroStatNum: {
    fontSize: '1.2rem',
    fontWeight: '800',
    color: '#1C1917',
  },
  heroStatLabel: {
    fontSize: '0.78rem',
    color: '#8C827A',
    fontWeight: '600',
  },
  statDivider: {
    width: '1px',
    height: '32px',
    backgroundColor: '#DDD5C8',
  },
  heroVisual: {
    display: 'flex',
    justifyContent: 'center',
  },
  heroVideoCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: '24px',
    border: '1px solid #EDE7DD',
    boxShadow: '0 20px 45px rgba(25, 23, 22, 0.08)',
    padding: '24px',
    width: '100%',
    maxWidth: '460px',
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  heroVideoHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  heroAuthorSnippet: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
  heroAvatar: {
    width: '42px',
    height: '42px',
    borderRadius: '50%',
    objectFit: 'cover',
    border: '2px solid #EDE7DD',
  },
  heroSpeakerName: {
    fontSize: '0.94rem',
    fontWeight: '700',
    color: '#1C1917',
  },
  heroSpeakerHandle: {
    fontSize: '0.78rem',
    color: '#8C827A',
  },
  heroVideoPreviewBox: {
    position: 'relative',
    width: '100%',
    aspectRatio: '16 / 10',
    borderRadius: '16px',
    overflow: 'hidden',
    backgroundColor: '#1C1917',
    cursor: 'pointer',
  },
  heroPreviewImg: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
  },
  heroPlayBadge: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    width: '56px',
    height: '56px',
    borderRadius: '50%',
    backgroundColor: 'rgba(224, 93, 56, 0.92)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 4px 16px rgba(0,0,0,0.3)',
  },
  heroDuration: {
    position: 'absolute',
    bottom: '10px',
    right: '10px',
    backgroundColor: 'rgba(0,0,0,0.75)',
    color: '#FFFFFF',
    fontSize: '0.75rem',
    fontWeight: '600',
    padding: '2px 8px',
    borderRadius: '4px',
  },
  heroFeedbackCard: {
    backgroundColor: '#FAF7F2',
    border: '1px solid #E2DACD',
    borderRadius: '14px',
    padding: '14px 16px',
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  heroFeedbackHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  },
  heroFeedbackLabel: {
    fontSize: '0.75rem',
    fontWeight: '700',
    color: '#E05D38',
    textTransform: 'uppercase',
    letterSpacing: '0.04em',
  },
  heroFeedbackQuote: {
    fontSize: '0.85rem',
    color: '#44403C',
    lineHeight: '1.45',
    fontStyle: 'italic',
  },
  section: {
    padding: '80px 0',
  },
  sectionHeader: {
    textAlign: 'center',
    maxWidth: '640px',
    margin: '0 auto 48px auto',
  },
  sectionTag: {
    fontSize: '0.82rem',
    fontWeight: '700',
    color: '#E05D38',
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
    marginBottom: '8px',
    display: 'inline-block',
  },
  sectionTitle: {
    fontSize: 'clamp(2rem, 3.5vw, 2.75rem)',
    color: '#1C1917',
    marginBottom: '14px',
  },
  sectionSubtitle: {
    fontSize: '1rem',
    color: '#6E675F',
    lineHeight: '1.6',
  },
  pillarsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
    gap: '24px',
  },
  pillarCard: {
    padding: '32px 26px',
    display: 'flex',
    flexDirection: 'column',
    gap: '14px',
  },
  pillarIconCircle: {
    width: '52px',
    height: '52px',
    borderRadius: '14px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pillarTitle: {
    fontSize: '1.2rem',
    fontWeight: '700',
    color: '#1C1917',
  },
  pillarDesc: {
    fontSize: '0.92rem',
    color: '#6E675F',
    lineHeight: '1.6',
  },
  howItWorksSection: {
    padding: '80px 0',
    backgroundColor: '#F4EFE6',
    borderTop: '1px solid #EDE7DD',
    borderBottom: '1px solid #EDE7DD',
  },
  stepsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
    gap: '20px',
  },
  stepCard: {
    padding: '24px',
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    position: 'relative',
  },
  stepNumber: {
    fontFamily: 'var(--font-serif)',
    fontSize: '1.8rem',
    fontWeight: '800',
    color: '#E05D38',
    lineHeight: '1',
  },
  stepTitle: {
    fontSize: '1.05rem',
    fontWeight: '700',
    color: '#1C1917',
  },
  stepDesc: {
    fontSize: '0.88rem',
    color: '#6E675F',
    lineHeight: '1.5',
  },
  feedHeaderRow: {
    display: 'flex',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    marginBottom: '36px',
    flexWrap: 'wrap',
    gap: '16px',
  },
  ctaSection: {
    padding: '60px 0 100px 0',
  },
  ctaContainer: {
    display: 'flex',
    justifyContent: 'center',
  },
  ctaCard: {
    backgroundColor: '#191716',
    borderRadius: '28px',
    padding: '56px 40px',
    textAlign: 'center',
    color: '#FFFFFF',
    maxWidth: '860px',
    width: '100%',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '18px',
    boxShadow: '0 20px 50px rgba(0, 0, 0, 0.2)',
  },
  ctaBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    color: '#FFFFFF',
    padding: '6px 16px',
    borderRadius: '999px',
    fontSize: '0.82rem',
    fontWeight: '600',
  },
  ctaTitle: {
    fontSize: 'clamp(1.8rem, 3vw, 2.6rem)',
    color: '#FFFFFF',
    maxWidth: '640px',
  },
  ctaSubtitle: {
    color: '#B5ACA2',
    fontSize: '1rem',
    maxWidth: '560px',
    lineHeight: '1.6',
  },
  ctaButtonGroup: {
    display: 'flex',
    alignItems: 'center',
    gap: '14px',
    marginTop: '12px',
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
};

// Responsive style for hero grid
if (typeof document !== 'undefined') {
  const styleEl = document.createElement('style');
  styleEl.innerHTML = `
    @media (max-width: 900px) {
      .hero-grid {
        grid-template-columns: 1fr !important;
      }
    }
  `;
  document.head.appendChild(styleEl);
}
