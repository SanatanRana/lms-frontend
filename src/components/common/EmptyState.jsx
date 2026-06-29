

const EmptyState = ({
  title = 'No records found',
  description = 'There is no data to display at this time.',
  icon = '📂',
  action,
  className = '',
  ...props
}) => {
  return (
    <div
      className={`flex flex-col items-center justify-center text-center p-8 border border-dashed border-border rounded-2xl bg-card/25 max-w-md mx-auto ${className}`}
      {...props}
    >
      <div className="text-4xl mb-4 select-none opacity-80">{icon}</div>
      <h4 className="text-base font-extrabold text-white mb-2">{title}</h4>
      <p className="text-text-muted text-xs leading-relaxed mb-6 max-w-sm">{description}</p>
      {action && <div className="flex justify-center">{action}</div>}
    </div>
  );
};

export default EmptyState;
