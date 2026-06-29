import { forwardRef, useId } from 'react';

const TextArea = forwardRef(({
  label,
  error,
  helperText,
  rows = 4,
  className = '',
  wrapperClassName = '',
  required = false,
  ...props
}, ref) => {
  const areaId = useId();
  const errorId = useId();
  const helperId = useId();

  return (
    <div className={`w-full flex flex-col ${wrapperClassName}`}>
      {label && (
        <label
          htmlFor={areaId}
          className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2 select-none"
        >
          {label}
          {required && <span className="text-error ml-0.5">*</span>}
        </label>
      )}
      
      <textarea
        ref={ref}
        id={areaId}
        rows={rows}
        className={`block w-full bg-card border text-white placeholder-text-muted rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition duration-150 ${
          error ? 'border-error focus:border-error focus:ring-error' : 'border-border'
        } ${className}`}
        required={required}
        aria-invalid={error ? 'true' : 'false'}
        aria-describedby={`${error ? errorId : ''} ${helperText ? helperId : ''}`.trim() || undefined}
        {...props}
      />

      {error && (
        <span
          id={errorId}
          className="text-error text-[10px] mt-1.5 font-semibold flex items-center space-x-1 animate-scale-in"
          role="alert"
        >
          <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <span>{error}</span>
        </span>
      )}

      {!error && helperText && (
        <span id={helperId} className="text-text-muted text-[10px] mt-1.5 leading-normal">
          {helperText}
        </span>
      )}
    </div>
  );
});

TextArea.displayName = 'TextArea';

export default TextArea;
