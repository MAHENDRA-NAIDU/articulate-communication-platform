import React from 'react';

export const VideoCardSkeleton = () => {
  return (
    <div className="card" style={{ padding: '0', overflow: 'hidden' }}>
      <div className="skeleton" style={{ width: '100%', height: '200px' }} />
      <div style={{ padding: '18px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '14px' }}>
          <div className="skeleton" style={{ width: '38px', height: '38px', borderRadius: '50%' }} />
          <div style={{ flex: 1 }}>
            <div className="skeleton" style={{ width: '60%', height: '14px', marginBottom: '6px' }} />
            <div className="skeleton" style={{ width: '40%', height: '10px' }} />
          </div>
        </div>
        <div className="skeleton" style={{ width: '90%', height: '18px', marginBottom: '8px' }} />
        <div className="skeleton" style={{ width: '70%', height: '14px', marginBottom: '16px' }} />
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div className="skeleton" style={{ width: '80px', height: '22px', borderRadius: '12px' }} />
          <div className="skeleton" style={{ width: '50px', height: '14px' }} />
        </div>
      </div>
    </div>
  );
};

export const VideoGridSkeleton = ({ count = 6 }) => {
  return (
    <div className="grid-responsive">
      {Array.from({ length: count }).map((_, i) => (
        <VideoCardSkeleton key={i} />
      ))}
    </div>
  );
};

export const ProfileSkeleton = () => {
  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '40px 20px' }}>
      <div className="card" style={{ padding: '32px', marginBottom: '32px' }}>
        <div style={{ display: 'flex', gap: '24px', alignItems: 'center' }}>
          <div className="skeleton" style={{ width: '96px', height: '96px', borderRadius: '50%' }} />
          <div style={{ flex: 1 }}>
            <div className="skeleton" style={{ width: '40%', height: '24px', marginBottom: '10px' }} />
            <div className="skeleton" style={{ width: '25%', height: '14px', marginBottom: '14px' }} />
            <div className="skeleton" style={{ width: '80%', height: '14px' }} />
          </div>
        </div>
      </div>
    </div>
  );
};
