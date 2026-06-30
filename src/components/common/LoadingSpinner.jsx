

const LoadingSpinner = ({ size = 'md', text = '' }) => {
  const sizeMap = {
    sm: 'h-5 w-5',
    md: 'h-8 w-8',
    lg: 'h-12 w-12'
  };

  const currentSize = sizeMap[size] || sizeMap.md;

  return (
    <div className="flex flex-col items-center justify-center py-20 animate-fade-in">
      <div className="relative">
        <div className={`${currentSize} rounded-full border-2 border-border border-t-primary animate-spin`}></div>
        <div className={`absolute inset-0 ${currentSize} rounded-full border-2 border-transparent border-b-warning animate-spin`} style={{ animationDirection: 'reverse', animationDuration: '1.5s' }}></div>
      </div>
      {text && (
        <p className="mt-4 text-sm text-text-muted font-medium animate-pulse">{text}</p>
      )}
    </div>
  );
};

export default LoadingSpinner;
