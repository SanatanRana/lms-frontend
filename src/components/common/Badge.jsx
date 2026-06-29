

const Badge = ({
  children,
  variant = 'neutral',
  className = '',
  ...props
}) => {
  const baseStyles = 'inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold tracking-wide uppercase select-none border';

  const variants = {
    primary: 'bg-primary/10 border-primary/20 text-primary-light',
    success: 'bg-success-bg border-success/20 text-success',
    warning: 'bg-warning-bg border-warning/20 text-warning',
    error: 'bg-error-bg border-error/20 text-error',
    info: 'bg-info-bg border-info/20 text-info',
    neutral: 'bg-secondary/15 border-secondary/20 text-text-muted'
  };

  const currentVariant = variants[variant] || variants.neutral;

  return (
    <span
      className={`${baseStyles} ${currentVariant} ${className}`}
      {...props}
    >
      {children}
    </span>
  );
};

export default Badge;
