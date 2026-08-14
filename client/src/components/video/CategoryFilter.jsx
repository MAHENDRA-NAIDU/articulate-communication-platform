import React from 'react';

const CATEGORIES = [
  'All',
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

export const CategoryFilter = ({ activeCategory = 'All', onSelectCategory }) => {
  return (
    <div style={styles.scrollWrapper}>
      <div style={styles.container}>
        {CATEGORIES.map((cat) => {
          const isActive = activeCategory === cat;
          return (
            <button
              key={cat}
              onClick={() => onSelectCategory(cat)}
              style={{
                ...styles.pill,
                ...(isActive ? styles.pillActive : styles.pillInactive),
              }}
            >
              {cat}
            </button>
          );
        })}
      </div>
    </div>
  );
};

const styles = {
  scrollWrapper: {
    overflowX: 'auto',
    paddingBottom: '8px',
    msOverflowStyle: 'none',
    scrollbarWidth: 'none',
  },
  container: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    width: 'max-content',
  },
  pill: {
    padding: '8px 18px',
    fontSize: '0.88rem',
    fontWeight: '600',
    borderRadius: '999px',
    cursor: 'pointer',
    transition: 'all 0.18s cubic-bezier(0.16, 1, 0.3, 1)',
    whiteSpace: 'nowrap',
    border: '1px solid transparent',
  },
  pillActive: {
    backgroundColor: '#191716',
    color: '#FFFFFF',
    borderColor: '#191716',
    boxShadow: '0 4px 12px rgba(25, 23, 22, 0.15)',
  },
  pillInactive: {
    backgroundColor: '#FFFFFF',
    color: '#57534E',
    borderColor: '#E2DACD',
  },
};
