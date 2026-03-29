const Loader = ({ label = "Loading..." }) => (
  <div className="loading-card">
    <div className="spinner" />
    <p>{label}</p>
  </div>
);

export default Loader;
