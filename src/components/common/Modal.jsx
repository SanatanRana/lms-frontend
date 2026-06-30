import { useEffect, useRef } from 'react';

const Modal = ({
  isOpen,
  onClose,
  title,
  children,
  footer,
  size = 'md',
  closeOnOverlayClick = true,
  className = ''
}) => {
  const modalRef = useRef(null);

  // Close on Escape key press
  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Lock body scroll when modal is open
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

  const sizes = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-2xl',
    xxl: 'max-w-4xl'
  };

  const currentSize = sizes[size] || sizes.md;

  const handleOverlayClick = (e) => {
    if (closeOnOverlayClick && modalRef.current && !modalRef.current.contains(e.target)) {
      onClose();
    }
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/70 backdrop-blur-sm animate-fade-in"
      onClick={handleOverlayClick}
    >
      <div 
        ref={modalRef}
        className={`bg-card border border-border rounded-t-2xl sm:rounded-2xl w-full ${currentSize} shadow-2xl animate-slide-up sm:animate-scale-in flex flex-col max-h-[90vh] sm:max-h-[85vh] overflow-hidden ${className}`}
      >
        {/* Header */}
        <div className="p-5 border-b border-border flex justify-between items-center bg-background/40">
          {title && <h4 className="text-base font-extrabold text-white">{title}</h4>}
          <button 
            onClick={onClose}
            className="text-text-muted hover:text-white p-1.5 rounded-lg hover:bg-white/5 cursor-pointer transition"
            aria-label="Close modal"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto flex-grow text-sm text-text-muted leading-relaxed">
          {children}
        </div>

        {/* Footer */}
        {footer && (
          <div className="p-4 border-t border-border flex justify-end space-x-2 bg-background/20">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
};

export default Modal;
