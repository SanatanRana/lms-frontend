

const Divider = ({
  orientation = 'horizontal',
  text = '',
  className = '',
  ...props
}) => {
  if (orientation === 'vertical') {
    return (
      <div 
        className={`inline-block h-full min-h-[1em] w-[1px] self-stretch bg-border/60 ${className}`} 
        role="separator"
        {...props} 
      />
    );
  }

  if (text) {
    return (
      <div className={`flex items-center my-4 ${className}`} role="separator" {...props}>
        <div className="flex-grow border-t border-border/60"></div>
        <span className="px-3 text-xs font-semibold text-text-muted uppercase tracking-wider">{text}</span>
        <div className="flex-grow border-t border-border/60"></div>
      </div>
    );
  }

  return (
    <hr 
      className={`my-4 border-t border-border/60 ${className}`} 
      role="separator"
      {...props} 
    />
  );
};

export default Divider;
