

const Card = ({
  children,
  variant = 'solid',
  hoverEffect = false,
  className = '',
  onClick,
  ...props
}) => {
  const baseStyles = 'rounded-2xl border transition duration-300 overflow-hidden';
  
  const variants = {
    solid: 'bg-card border-border text-text-main',
    glass: 'glass text-text-main', // utilizes .glass utility class defined in index.css
    outline: 'bg-transparent border-border text-text-main'
  };

  const hoverStyles = hoverEffect 
    ? 'card-hover cursor-pointer' // utilizes .card-hover defined in index.css
    : '';

  const currentVariant = variants[variant] || variants.solid;

  return (
    <div
      className={`${baseStyles} ${currentVariant} ${hoverStyles} ${className}`}
      onClick={onClick}
      {...props}
    >
      {children}
    </div>
  );
};

export default Card;
