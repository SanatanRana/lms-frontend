

const Button = ({
  children,
  type = 'button',
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  leftIcon,
  rightIcon,
  className = '',
  onClick,
  ...props
}) => {
  const baseStyles = 'inline-flex items-center justify-center font-semibold rounded-xl transition duration-150 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary/50 focus:ring-offset-2 focus:ring-offset-background disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer';

  const variants = {
    primary: 'bg-gradient-to-r from-primary to-primary-light hover:from-primary-hover hover:to-primary text-white shadow-md shadow-primary/10 hover:shadow-primary/20',
    secondary: 'bg-secondary hover:bg-secondary-hover text-text-main border border-border',
    success: 'bg-success hover:opacity-90 text-white shadow-md shadow-success/10',
    error: 'bg-error hover:opacity-90 text-white shadow-md shadow-error/10',
    warning: 'bg-warning hover:opacity-90 text-white shadow-md shadow-warning/10',
    info: 'bg-info hover:opacity-90 text-white shadow-md shadow-info/10',
    outline: 'bg-transparent border border-border hover:bg-card-light text-text-main hover:text-white',
    ghost: 'bg-transparent hover:bg-card-light text-text-muted hover:text-white'
  };

  const sizes = {
    sm: 'px-3 py-1.5 text-xs rounded-lg gap-1.5',
    md: 'px-4 py-2.5 text-sm rounded-xl gap-2',
    lg: 'px-6 py-3.5 text-base rounded-2xl gap-2.5'
  };

  const currentVariant = variants[variant] || variants.primary;
  const currentSize = sizes[size] || sizes.md;

  return (
    <button
      type={type}
      className={`${baseStyles} ${currentVariant} ${currentSize} ${className}`}
      disabled={disabled || loading}
      onClick={onClick}
      {...props}
    >
      {loading && (
        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-current" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
      )}
      {!loading && leftIcon && <span className="flex-shrink-0">{leftIcon}</span>}
      <span>{children}</span>
      {!loading && rightIcon && <span className="flex-shrink-0">{rightIcon}</span>}
    </button>
  );
};

export default Button;
