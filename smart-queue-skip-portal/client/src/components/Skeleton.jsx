const Skeleton = ({ className = "", rounded = false }) => (
  <div
    className={`skeleton-block ${rounded ? "skeleton-rounded" : ""} ${className}`.trim()}
    aria-hidden="true"
  />
);

export default Skeleton;
