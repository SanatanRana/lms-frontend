import { useEffect } from 'react';

const Drawer = ({
  isOpen,
  onClose,
  placement = 'left',
  title,
  children,
  size = 'md',
  className = ''
}) => {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const placements = {
    left: 'left-0 top-0 bottom-0 h-full border-r animate-slide-in-left',
    right: 'right-0 top-0 bottom-0 h-full border-l animate-slide-in-right',
    top: 'top-0 left-0 right-0 w-full border-b animate-slide-in-top',
    bottom: 'bottom-0 left-0 right-0 w-full border-t animate-slide-in-bottom'
  };

  const sizes = {
    left: {
      sm: 'w-64',
      md: 'w-80',
      lg: 'w-96'
    },
    right: {
      sm: 'w-64',
      md: 'w-80',
      lg: 'w-96'
    },
    top: {
      sm: 'h-64',
      md: 'h-80',
      lg: 'h-96'
    },
    bottom: {
      sm: 'h-64',
      md: 'h-80',
      lg: 'h-96'
    }
  };

  const sizeClass = sizes[placement][size] || sizes[placement].md;
  const placementClass = placements[placement] || placements.left;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden flex">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity" 
        onClick={onClose}
      />

      {/* Drawer Body */}
      <div className={`fixed bg-card border-border flex flex-col shadow-2xl transition duration-300 max-w-[85vw] sm:max-w-none ${placementClass} ${sizeClass} ${className}`}>
        {/* Header */}
        <div className="p-4 border-b border-border flex items-center justify-between bg-background/40">
          <h4 className="font-extrabold text-sm text-white">{title}</h4>
          <button 
            onClick={onClose} 
            className="text-text-muted hover:text-white p-1 rounded-lg hover:bg-white/5 cursor-pointer transition"
            aria-label="Close drawer"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-grow overflow-y-auto p-4 text-sm text-text-muted">
          {children}
        </div>
      </div>
    </div>
  );
};

export default Drawer;
