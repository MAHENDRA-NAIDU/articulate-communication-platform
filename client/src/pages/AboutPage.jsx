import React from 'react';
import { Link } from 'react-router-dom';
import {
  Mic,
  GraduationCap,
  Briefcase,
  Globe2,
  Users,
  MessageSquare,
  Sparkles,
  HeartHandshake,
  CheckCircle,
  ArrowRight,
} from 'lucide-react';
import { Button } from '../components/common/Button';
import { MarqueeTicker } from '../components/common/MarqueeTicker';
import { useScrollReveal } from '../hooks/useScrollReveal';

export const AboutPage = () => {
  useScrollReveal();

  return (
    <div style={styles.page}>
      <div className="container" style={styles.container}>
        {/* Header */}
        <div style={styles.header}>
          <span style={styles.headerTag}>About Articulate</span>
          <h1 className="heading-display" style={styles.title}>
            Mastering Communication Through Practice & Peer Feedback
          </h1>
          <p style={styles.subtitle}>
            A supportive, distraction-free platform designed to help students, job seekers, and learners overcome speaking anxiety and speak with clarity.
          </p>
        </div>

        {/* Section 1: What is this? & Why it exists */}
        <div className="grid-responsive reveal-on-scroll" style={{ marginBottom: '48px' }}>
          <div className="card card-interactive" style={styles.infoCard}>
            <div style={styles.iconCircle}>
              <Mic size={24} color="#E05D38" />
            </div>
            <h2 style={styles.cardTitle}>What is this platform?</h2>
            <p style={styles.cardText}>
              Articulate is a community-driven video practice platform. Instead of practicing in front of a mirror or reading theory in silence, users upload short 1–3 minute speaking videos and receive focused, constructive feedback from other learners.
            </p>
          </div>

          <div className="card card-interactive" style={styles.infoCard}>
            <div style={{ ...styles.iconCircle, backgroundColor: '#EDF7ED' }}>
              <HeartHandshake size={24} color="#2E7D32" />
            </div>
            <h2 style={styles.cardTitle}>Why does it exist?</h2>
            <p style={styles.cardText}>
              Public speaking and conversational confidence cannot be memorized from books—it requires deliberate, repeated practice and actionable critique. Articulate provides a safe, encouraging space focused entirely on communication growth rather than viral entertainment.
            </p>
          </div>
        </div>

        {/* Section 2: How It Works (6 Steps) */}
        <div className="card reveal-on-scroll" style={styles.workflowCard}>
          <div style={styles.workflowHeader}>
            <span style={styles.workflowTag}>Step-by-Step Flow</span>
            <h2 className="heading-display" style={styles.workflowTitle}>
              How The Practice Habit Works
            </h2>
          </div>

          <div style={styles.stepsTimeline}>
            {[
              {
                num: '1',
                title: 'Create Your Free Account',
                desc: 'Join in 30 seconds and set up your speaking profile and goals.',
              },
              {
                num: '2',
                title: 'Select a Speaking Topic',
                desc: 'Pick from Self Introductions, Interview Behavioral Drills, Debate, Storytelling, or Daily Life.',
              },
              {
                num: '3',
                title: 'Record & Upload Video',
                desc: 'Record a concise 60–120s video clip on your phone or laptop camera and upload it.',
              },
              {
                num: '4',
                title: 'Share With Community',
                desc: 'Publish your practice video so community members and peers can watch.',
              },
              {
                num: '5',
                title: 'Receive Constructive Feedback',
                desc: 'Get specific feedback on pace (WPM), filler words, eye contact, and clarity of ideas.',
              },
              {
                num: '6',
                title: 'Practice & Refine',
                desc: 'Apply suggestions in your next drill and watch your speaking confidence soar over time.',
              },
            ].map((st) => (
              <div key={st.num} style={styles.stepItem}>
                <div style={styles.stepBadge}>{st.num}</div>
                <div style={styles.stepContent}>
                  <h3 style={styles.stepHeading}>{st.title}</h3>
                  <p style={styles.stepDetail}>{st.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Section 3: Who is it for? */}
        <div style={styles.audienceSection}>
          <div style={styles.sectionHeader}>
            <span style={styles.sectionTag}>Target Learners</span>
            <h2 className="heading-display" style={styles.sectionTitle}>
              Who is this platform built for?
            </h2>
            <p style={styles.sectionSubtitle}>
              Whether you are preparing for high-stakes interviews or seeking daily fluency, you belong here.
            </p>
          </div>

          <div style={styles.audienceGrid}>
            <div className="card card-interactive reveal-on-scroll stagger-1" style={styles.audienceCard}>
              <GraduationCap size={28} color="#E05D38" />
              <h3 style={styles.audienceTitle}>College Students</h3>
              <p style={styles.audienceText}>
                Preparing for campus placements, seminar presentations, and impromptu classroom discussions.
              </p>
            </div>

            <div className="card card-interactive reveal-on-scroll stagger-2" style={styles.audienceCard}>
              <Briefcase size={28} color="#1E88E5" />
              <h3 style={styles.audienceTitle}>Job Seekers</h3>
              <p style={styles.audienceText}>
                Practicing the STAR framework for behavioral interviews and concise elevator pitches.
              </p>
            </div>

            <div className="card card-interactive reveal-on-scroll stagger-3" style={styles.audienceCard}>
              <Globe2 size={28} color="#2E7D32" />
              <h3 style={styles.audienceTitle}>English Learners</h3>
              <p style={styles.audienceText}>
                Building conversational fluency, natural phrasing, and eliminating self-conscious hesitation.
              </p>
            </div>

            <div className="card card-interactive reveal-on-scroll stagger-4" style={styles.audienceCard}>
              <Users size={28} color="#EA580C" />
              <h3 style={styles.audienceTitle}>Group Discussion Candidates</h3>
              <p style={styles.audienceText}>
                Mastering how to initiate topics, articulate counterpoints calmly, and synthesize group discussions.
              </p>
            </div>
          </div>
        </div>

        {/* Section 4: Community Code of Constructive Feedback */}
        <div className="card reveal-on-scroll" style={styles.ethicsCard}>
          <div style={styles.ethicsHeader}>
            <Sparkles size={22} color="#E05D38" />
            <h2 style={styles.ethicsTitle}>Our Constructive Feedback Code</h2>
          </div>
          <div style={styles.ethicsGrid}>
            <div style={styles.ethicsItem}>
              <CheckCircle size={18} color="#2E7D32" style={{ flexShrink: 0 }} />
              <div>
                <strong>Celebrate the Effort:</strong> Speaking publicly takes courage. Always acknowledge what the speaker did well.
              </div>
            </div>
            <div style={styles.ethicsItem}>
              <CheckCircle size={18} color="#2E7D32" style={{ flexShrink: 0 }} />
              <div>
                <strong>Be Concrete & Specific:</strong> Rather than "good job", say "your transition between point 1 and 2 was smooth".
              </div>
            </div>
            <div style={styles.ethicsItem}>
              <CheckCircle size={18} color="#2E7D32" style={{ flexShrink: 0 }} />
              <div>
                <strong>Offer 1 Actionable Tip:</strong> Focus on one tangible improvement (e.g. pause before key conclusions).
              </div>
            </div>
            <div style={styles.ethicsItem}>
              <CheckCircle size={18} color="#2E7D32" style={{ flexShrink: 0 }} />
              <div>
                <strong>Maintain Kindness:</strong> Everyone is on a growth path. Respect, empathy, and mutual support are non-negotiable.
              </div>
            </div>
          </div>
        </div>

        {/* Running Topics Marquee */}
        <div style={{ margin: '48px 0' }} className="reveal-on-scroll">
          <MarqueeTicker />
        </div>

        {/* Bottom CTA */}
        <div style={styles.bottomCta} className="reveal-on-scroll">
          <h2 className="heading-display" style={{ fontSize: '2rem', marginBottom: '12px' }}>
            Start Your First Speaking Drill Today
          </h2>
          <p style={{ color: '#6E675F', marginBottom: '24px' }}>
            Join our positive community and turn speaking into a confident habit.
          </p>
          <div style={{ display: 'flex', gap: '14px', justifyContent: 'center' }}>
            <Link to="/register">
              <Button variant="primary" size="lg" icon={<ArrowRight size={18} />}>
                Join Now Free
              </Button>
            </Link>
            <Link to="/explore">
              <Button variant="secondary" size="lg">
                Explore Community Videos
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

const styles = {
  page: {
    padding: '48px 0 80px 0',
  },
  container: {
    maxWidth: '960px',
  },
  header: {
    textAlign: 'center',
    marginBottom: '48px',
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
    fontSize: 'clamp(2.2rem, 4vw, 3rem)',
    color: '#1C1917',
    marginBottom: '12px',
  },
  subtitle: {
    fontSize: '1.1rem',
    color: '#6E675F',
    maxWidth: '680px',
    margin: '0 auto',
    lineHeight: '1.6',
  },
  infoCard: {
    padding: '32px',
    backgroundColor: '#FFFFFF',
    display: 'flex',
    flexDirection: 'column',
    gap: '14px',
  },
  iconCircle: {
    width: '48px',
    height: '48px',
    borderRadius: '12px',
    backgroundColor: '#FCEDE8',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitle: {
    fontSize: '1.3rem',
    fontWeight: '700',
    color: '#1C1917',
  },
  cardText: {
    fontSize: '0.94rem',
    color: '#57534E',
    lineHeight: '1.65',
  },
  workflowCard: {
    padding: '40px',
    backgroundColor: '#FFFFFF',
    marginBottom: '64px',
  },
  workflowHeader: {
    textAlign: 'center',
    marginBottom: '36px',
  },
  workflowTag: {
    fontSize: '0.8rem',
    fontWeight: '700',
    color: '#E05D38',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
  },
  workflowTitle: {
    fontSize: '2rem',
    color: '#1C1917',
    marginTop: '4px',
  },
  stepsTimeline: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '24px',
  },
  stepItem: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '16px',
    padding: '16px',
    backgroundColor: '#FAF7F2',
    borderRadius: '14px',
    border: '1px solid #E2DACD',
  },
  stepBadge: {
    fontFamily: 'var(--font-serif)',
    fontSize: '1.2rem',
    fontWeight: '800',
    color: '#E05D38',
    width: '32px',
    height: '32px',
    borderRadius: '8px',
    backgroundColor: '#FFFFFF',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    border: '1px solid #EDE7DD',
  },
  stepContent: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  stepHeading: {
    fontSize: '1rem',
    fontWeight: '700',
    color: '#1C1917',
  },
  stepDetail: {
    fontSize: '0.85rem',
    color: '#6E675F',
    lineHeight: '1.45',
  },
  audienceSection: {
    marginBottom: '64px',
  },
  sectionHeader: {
    textAlign: 'center',
    marginBottom: '36px',
  },
  sectionTag: {
    fontSize: '0.8rem',
    fontWeight: '700',
    color: '#E05D38',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
  },
  sectionTitle: {
    fontSize: '2rem',
    color: '#1C1917',
    marginTop: '4px',
  },
  sectionSubtitle: {
    fontSize: '0.95rem',
    color: '#6E675F',
    marginTop: '4px',
  },
  audienceGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '20px',
  },
  audienceCard: {
    padding: '24px',
    backgroundColor: '#FFFFFF',
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
  },
  audienceTitle: {
    fontSize: '1.1rem',
    fontWeight: '700',
    color: '#1C1917',
  },
  audienceText: {
    fontSize: '0.86rem',
    color: '#6E675F',
    lineHeight: '1.5',
  },
  ethicsCard: {
    padding: '36px',
    backgroundColor: '#FFFDF9',
    border: '1px solid #EAE4DA',
    marginBottom: '64px',
  },
  ethicsHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    marginBottom: '20px',
  },
  ethicsTitle: {
    fontSize: '1.3rem',
    fontWeight: '700',
    color: '#1C1917',
  },
  ethicsGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '18px',
  },
  ethicsItem: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '10px',
    fontSize: '0.9rem',
    color: '#44403C',
    lineHeight: '1.5',
  },
  bottomCta: {
    textAlign: 'center',
    padding: '40px 20px',
  },
};

// Add responsive style for steps
if (typeof document !== 'undefined') {
  const styleEl = document.createElement('style');
  styleEl.innerHTML = `
    @media (max-width: 768px) {
      div[style*="gridTemplateColumns: '1fr 1fr'"] {
        grid-template-columns: 1fr !important;
      }
    }
  `;
  document.head.appendChild(styleEl);
}
