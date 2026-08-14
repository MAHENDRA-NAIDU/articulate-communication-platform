import React, { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { Search, SlidersHorizontal, PlusCircle, RotateCcw } from 'lucide-react';
import { videoService } from '../services/videoService';
import { VideoCard } from '../components/video/VideoCard';
import { CategoryFilter } from '../components/video/CategoryFilter';
import { VideoGridSkeleton } from '../components/common/LoadingSkeleton';
import { EmptyState } from '../components/common/EmptyState';
import { Button } from '../components/common/Button';
import { useScrollReveal } from '../hooks/useScrollReveal';

export const ExplorePage = () => {
  const [searchParams, setSearchParams] = useSearchParams();

  const categoryFromUrl = searchParams.get('category') || 'All';
  const searchFromUrl = searchParams.get('search') || '';
  const sortFromUrl = searchParams.get('sort') || 'newest';

  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchInput, setSearchInput] = useState(searchFromUrl);
  const [selectedCategory, setSelectedCategory] = useState(categoryFromUrl);
  const [selectedSort, setSelectedSort] = useState(sortFromUrl);
  const [totalCount, setTotalCount] = useState(0);

  // Trigger smooth scroll animation
  useScrollReveal([loading, videos]);

  // Sync state with URL params
  useEffect(() => {
    setSelectedCategory(categoryFromUrl);
    setSearchInput(searchFromUrl);
    setSelectedSort(sortFromUrl);
  }, [categoryFromUrl, searchFromUrl, sortFromUrl]);

  // Fetch videos whenever filters change
  useEffect(() => {
    const fetchVideos = async () => {
      try {
        setLoading(true);
        const data = await videoService.getVideos({
          category: selectedCategory !== 'All' ? selectedCategory : undefined,
          search: searchFromUrl.trim() || undefined,
          sort: selectedSort,
          limit: 24,
        });

        if (data.success) {
          setVideos(data.videos || []);
          setTotalCount(data.total || (data.videos || []).length);
        }
      } catch (err) {
        console.error('Failed to load explore videos:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchVideos();
  }, [selectedCategory, searchFromUrl, selectedSort]);

  const handleCategorySelect = (category) => {
    setSelectedCategory(category);
    const newParams = new URLSearchParams(searchParams);
    if (category === 'All') {
      newParams.delete('category');
    } else {
      newParams.set('category', category);
    }
    setSearchParams(newParams);
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    const newParams = new URLSearchParams(searchParams);
    if (searchInput.trim()) {
      newParams.set('search', searchInput.trim());
    } else {
      newParams.delete('search');
    }
    setSearchParams(newParams);
  };

  const handleSortChange = (e) => {
    const sortVal = e.target.value;
    setSelectedSort(sortVal);
    const newParams = new URLSearchParams(searchParams);
    newParams.set('sort', sortVal);
    setSearchParams(newParams);
  };

  const handleClearFilters = () => {
    setSelectedCategory('All');
    setSearchInput('');
    setSelectedSort('newest');
    setSearchParams({});
  };

  return (
    <div style={styles.page}>
      <div className="container">
        {/* Header Title */}
        <div style={styles.header}>
          <div>
            <span style={styles.pageTag}>Explore Community Practice</span>
            <h1 className="heading-display" style={styles.title}>
              Speaking Drills & Feedback
            </h1>
            <p style={styles.subtitle}>
              Watch practice videos from fellow learners, give constructive advice, and discover inspiring communication techniques.
            </p>
          </div>

          <Link to="/upload">
            <Button variant="primary" size="md" icon={<PlusCircle size={16} />}>
              Upload Practice Video
            </Button>
          </Link>
        </div>

        {/* Search & Sort Bar */}
        <div style={styles.filterControlsRow}>
          <form onSubmit={handleSearchSubmit} style={styles.searchForm}>
            <Search size={18} color="#8C827A" style={styles.searchIcon} />
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search by topic, keyword, or speaker..."
              style={styles.searchInput}
            />
            {searchInput && (
              <button
                type="button"
                onClick={() => {
                  setSearchInput('');
                  const newParams = new URLSearchParams(searchParams);
                  newParams.delete('search');
                  setSearchParams(newParams);
                }}
                style={styles.clearSearchBtn}
              >
                ✕
              </button>
            )}
          </form>

          <div style={styles.sortWrapper}>
            <SlidersHorizontal size={16} color="#6E675F" />
            <select
              value={selectedSort}
              onChange={handleSortChange}
              style={styles.sortSelect}
              aria-label="Sort videos"
            >
              <option value="newest">Newest First</option>
              <option value="most_commented">Most Feedback</option>
              <option value="most_viewed">Most Viewed</option>
              <option value="oldest">Oldest First</option>
            </select>
          </div>
        </div>

        {/* Category Pills Filter */}
        <div style={styles.categoryRow}>
          <CategoryFilter
            activeCategory={selectedCategory}
            onSelectCategory={handleCategorySelect}
          />
        </div>

        {/* Total count & active filter banner */}
        <div style={styles.activeFilterMeta}>
          <span style={styles.countText}>
            Showing <strong>{videos.length}</strong> {videos.length === 1 ? 'video' : 'videos'}
            {selectedCategory !== 'All' && ` in "${selectedCategory}"`}
            {searchFromUrl && ` matching "${searchFromUrl}"`}
          </span>

          {(selectedCategory !== 'All' || searchFromUrl) && (
            <button onClick={handleClearFilters} style={styles.resetBtn}>
              <RotateCcw size={13} /> Reset Filters
            </button>
          )}
        </div>

        {/* Video Grid or Skeletons / Empty State */}
        {loading ? (
          <VideoGridSkeleton count={6} />
        ) : videos.length > 0 ? (
          <div className="grid-responsive" style={{ marginTop: '24px' }}>
            {videos.map((video, idx) => (
              <div key={video._id} className={`reveal-on-scroll stagger-${(idx % 6) + 1}`}>
                <VideoCard video={video} />
              </div>
            ))}
          </div>
        ) : (
          <EmptyState
            title="No speaking videos found"
            description={
              searchFromUrl || selectedCategory !== 'All'
                ? "We couldn't find any videos matching your filter criteria. Try adjusting your search or category."
                : "No one has uploaded speaking practice videos yet. Be the pioneer and upload your first drill!"
            }
            actionLabel={
              searchFromUrl || selectedCategory !== 'All'
                ? 'Clear Filters'
                : 'Upload Your First Video'
            }
            onAction={
              searchFromUrl || selectedCategory !== 'All'
                ? handleClearFilters
                : () => window.location.assign('/upload')
            }
          />
        )}
      </div>
    </div>
  );
};

const styles = {
  page: {
    padding: '48px 0 80px 0',
  },
  header: {
    display: 'flex',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    marginBottom: '32px',
    flexWrap: 'wrap',
    gap: '20px',
  },
  pageTag: {
    fontSize: '0.8rem',
    fontWeight: '700',
    color: '#E05D38',
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
    marginBottom: '6px',
    display: 'inline-block',
  },
  title: {
    fontSize: 'clamp(2rem, 3.5vw, 2.6rem)',
    color: '#1C1917',
    marginBottom: '8px',
  },
  subtitle: {
    fontSize: '1rem',
    color: '#6E675F',
    maxWidth: '600px',
  },
  filterControlsRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
    marginBottom: '20px',
    flexWrap: 'wrap',
  },
  searchForm: {
    position: 'relative',
    flexGrow: 1,
    minWidth: '280px',
    display: 'flex',
    alignItems: 'center',
  },
  searchIcon: {
    position: 'absolute',
    left: '16px',
    pointerEvents: 'none',
  },
  searchInput: {
    width: '100%',
    padding: '12px 40px 12px 46px',
    fontFamily: 'var(--font-sans)',
    fontSize: '0.94rem',
    color: '#1C1917',
    backgroundColor: '#FFFFFF',
    border: '1px solid #E2DACD',
    borderRadius: '12px',
    outline: 'none',
    boxShadow: 'var(--shadow-xs)',
    transition: 'border-color 0.15s',
  },
  clearSearchBtn: {
    position: 'absolute',
    right: '14px',
    background: 'none',
    border: 'none',
    color: '#8C827A',
    cursor: 'pointer',
    padding: '4px',
  },
  sortWrapper: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    backgroundColor: '#FFFFFF',
    border: '1px solid #E2DACD',
    borderRadius: '12px',
    padding: '4px 12px',
    boxShadow: 'var(--shadow-xs)',
  },
  sortSelect: {
    border: 'none',
    background: 'transparent',
    fontFamily: 'var(--font-sans)',
    fontSize: '0.9rem',
    fontWeight: '600',
    color: '#1C1917',
    padding: '8px 4px',
    outline: 'none',
    cursor: 'pointer',
  },
  categoryRow: {
    marginBottom: '20px',
  },
  activeFilterMeta: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: '16px',
    borderBottom: '1px solid #EDE7DD',
    flexWrap: 'wrap',
    gap: '10px',
  },
  countText: {
    fontSize: '0.9rem',
    color: '#6E675F',
  },
  resetBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    fontSize: '0.82rem',
    fontWeight: '600',
    color: '#E05D38',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
  },
};
