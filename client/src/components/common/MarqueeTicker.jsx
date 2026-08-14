import React from 'react';
import {
  Mic,
  Video,
  MessageSquare,
  Sparkles,
  TrendingUp,
  Award,
  Users,
  Target,
  Briefcase,
  Flame,
} from 'lucide-react';
import './MarqueeTicker.css';

const MARQUEE_ITEMS = [
  { icon: <Mic size={15} color="#E05D38" />, label: 'Self Introductions & Elevator Pitches' },
  { icon: <Briefcase size={15} color="#1E88E5" />, label: 'STAR Behavioral Interview Drills' },
  { icon: <Target size={15} color="#2E7D32" />, label: 'Impromptu 2-Minute Speaking Practice' },
  { icon: <Users size={15} color="#EA580C" />, label: 'Group Discussion Initiation & Summaries' },
  { icon: <Flame size={15} color="#9C27B0" />, label: 'Debate Opening & Counter-Arguments' },
  { icon: <Sparkles size={15} color="#E05D38" />, label: 'Pacing, Pause & Vocal Clarity Training' },
  { icon: <MessageSquare size={15} color="#00897B" />, label: '100% Constructive & Actionable Peer Feedback' },
  { icon: <Award size={15} color="#D81B60" />, label: 'Safe & Focused Student Practice Space' },
];

export const MarqueeTicker = () => {
  // Duplicate array for seamless infinite marquee loop
  const displayItems = [...MARQUEE_ITEMS, ...MARQUEE_ITEMS];

  return (
    <div className="marquee-wrapper" aria-label="Speaking practice topics and features ticker">
      <div className="marquee-track">
        {displayItems.map((item, index) => (
          <div key={index} className="marquee-item">
            <span className="marquee-icon-badge">{item.icon}</span>
            <span>{item.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
};
