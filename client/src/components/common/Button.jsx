import React from 'react';

export const Button = ({
  children,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  icon = null,
  onClick,
  type = 'button',
  className = '',
  style = {},
  ...props
}) => {
  const getVariantClass = () => {
    switch (variant) {
      case 'primary':
        return 'btn-primary';
      case 'secondary':
        return 'btn-secondary';
      case 'dark':
        return 'btn-dark';
      case 'outline':
        return 'btn-outline';
      case 'ghost':
        return 'btn-ghost';
      case 'danger':
        return 'btn-danger';
      default:
        return 'btn-primary';
    }
  };

  const getSizeClass = () => {
    switch (size) {
      case 'sm':
        return 'btn-sm';
      case 'lg':
        return 'btn-lg';
      default:
        return '';
    }
  };

  return (
    <button
      type={type}
      className={`btn ${getVariantClass()} ${getSizeClass()} ${className}`}
      disabled={disabled || loading}
      onClick={onClick}
      style={style}
      {...props}
    >
      {loading ? (
        <>
          <span
            className="animate-spin"
            style={{
              width: '16px',
              height: '16px',
              border: '2px solid currentColor',
              borderTopColor: 'transparent',
              borderRadius: '50%',
              display: 'inline-block',
            }}
          />
          <span>Loading...</span>
        </>
      ) : (
        <>
          {icon && <span style={{ display: 'flex', alignItems: 'center' }}>{icon}</span>}
          {children}
        </>
      )}
    </button>
  );
};
