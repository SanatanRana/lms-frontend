import React from 'react';

const LoadingSpinner = ({ size = 'md', text = '' }) => {
  const sizeMap = {
    sm: 'h-5 w-5',
    md: 'h-8 w-8',
    lg: 'h-12 w-12'
  };

  return (
    <div className="flex flex-col items-center justify-center py-20 animate-fade-in">
      <div className="relative">
        <div className={`${sizeMap[size]} rounded-full border-2 border-surface-600 border-t-primary-600 animate-spin`}></div>
        <div className={`absolute inset-0 ${sizeMap[size]} rounded-full border-2 border-transparent border-b-accent-500 animate-spin`} style={{ animationDirection: 'reverse', animationDuration: '1.5s' }}></div>
      </div>
      {text && (
        <p className="mt-4 text-sm text-slate-400 font-medium animate-pulse">{text}</p>
      )}
    </div>
  );
};

export default LoadingSpinner;
