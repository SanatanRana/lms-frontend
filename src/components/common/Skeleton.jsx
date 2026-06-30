

const Skeleton = ({
  variant = 'rect',
  width,
  height,
  className = '',
  ...props
}) => {
  const baseStyles = 'skeleton bg-card-light'; // uses the .skeleton animation utility in index.css

  const variants = {
    text: 'h-4 w-full rounded-md',
    avatar: 'rounded-full flex-shrink-0',
    rect: 'rounded-xl'
  };

  const style = {
    width: width || undefined,
    height: height || undefined
  };

  const variantClass = variants[variant] || variants.rect;

  return (
    <div
      className={`${baseStyles} ${variantClass} ${className}`}
      style={style}
      {...props}
    />
  );
};

export default Skeleton;
