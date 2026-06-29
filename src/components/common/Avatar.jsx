

const Avatar = ({
  name = '',
  src = '',
  size = 'md',
  className = '',
  onClick,
  ...props
}) => {
  const getInitials = (fullName) => {
    if (!fullName) return '?';
    const parts = fullName.split(' ');
    const firstInitial = parts[0]?.charAt(0).toUpperCase() || '';
    const secondInitial = parts[1]?.charAt(0).toUpperCase() || '';
    return firstInitial + secondInitial || firstInitial || '?';
  };

  const sizes = {
    xs: 'w-6 h-6 text-[10px]',
    sm: 'w-8 h-8 text-xs',
    md: 'w-10 h-10 text-sm',
    lg: 'w-12 h-12 text-base font-bold',
    xl: 'w-16 h-16 text-xl font-bold'
  };

  const currentSize = sizes[size] || sizes.md;

  // Background color generator based on username characters
  const getBgColor = (text) => {
    if (!text) return 'bg-primary-hover';
    const colors = [
      'bg-teal-600',
      'bg-indigo-600',
      'bg-amber-600',
      'bg-rose-600',
      'bg-emerald-600',
      'bg-blue-600'
    ];
    let sum = 0;
    for (let i = 0; i < text.length; i++) {
      sum += text.charCodeAt(i);
    }
    return colors[sum % colors.length];
  };

  return (
    <div
      onClick={onClick}
      className={`relative inline-flex items-center justify-center rounded-full overflow-hidden flex-shrink-0 text-white font-semibold select-none border border-border/50 ${currentSize} ${src ? 'bg-background' : getBgColor(name)} ${onClick ? 'cursor-pointer hover:opacity-90' : ''} ${className}`}
      {...props}
    >
      {src ? (
        <img
          src={src}
          alt={name || 'User profile'}
          className="w-full h-full object-cover"
          onError={(e) => {
            // Remove src if loading fails to fallback to initials
            e.target.style.display = 'none';
          }}
        />
      ) : (
        <span>{getInitials(name)}</span>
      )}
    </div>
  );
};

export default Avatar;
