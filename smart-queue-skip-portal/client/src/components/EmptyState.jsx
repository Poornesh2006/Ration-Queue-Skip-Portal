const EmptyState = ({
  title = "No data available",
  description = "There is nothing to show right now.",
  icon = "circle",
  action = null,
  className = "",
}) => (
  <div className={`empty-state-panel ${className}`.trim()}>
    <div className={`empty-state-icon empty-state-icon-${icon}`} aria-hidden="true">
      <span />
      <span />
      <span />
    </div>
    <h3>{title}</h3>
    <p>{description}</p>
    {action}
  </div>
);

export default EmptyState;
